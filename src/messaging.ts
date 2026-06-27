const FS_BUFFER_SIZE = 65536

const State = {
    IDLE: 0,
    REQ_CHUNK: 1,
    REQ_NEXT: 2,
    RESP_CHUNK: 3,
    RESP_NEXT: 4,
} as const
type State = typeof State[keyof typeof State]

const HEADER_INTS = {
    lock: 0,
    state: 1,
    length: 2,
    flags: 3,
}

const HEADER_SIZE = 16
const MAX_CHUNK = FS_BUFFER_SIZE - HEADER_SIZE
const FLAG_LAST = 1

const encoder = new TextEncoder()
const decoder = new TextDecoder()

function waitForState(ints: Int32Array, expected: State) {
    while (true) {
        const current = Atomics.load(ints, HEADER_INTS.state)
        if (current === expected) return
        Atomics.wait(ints, HEADER_INTS.state, current)
    }
}

function acquireLock(ints: Int32Array) {
    while (true) {
        if (Atomics.compareExchange(ints, HEADER_INTS.lock, 0, 1) === 0) return
        Atomics.wait(ints, HEADER_INTS.lock, 1)
    }
}

function releaseLock(ints: Int32Array) {
    Atomics.store(ints, HEADER_INTS.lock, 0)
    Atomics.notify(ints, HEADER_INTS.lock)
}

function concatChunks(chunks: Uint8Array[]): Uint8Array {
    const total = chunks.reduce((sum, c) => sum + c.length, 0)
    const result = new Uint8Array(total)
    let pos = 0
    for (const c of chunks) {
        result.set(c, pos)
        pos += c.length
    }
    return result
}


/**
 * Sends a message that may be larger than the SAB buffer and blocks until the
 * full reply (which may also be larger than the buffer) is received.
 *
 * This method uses an exclusive lock on the SAB, so multiple workers sharing
 * the same SAB cannot interleave chunks: one worker completes its entire
 * request/response exchange before another can start.
 *
 * Must be called from a worker thread that is allowed to block (Atomics.wait).
 */
export function sendLongMessageThroughSAB(message: string): string {
    const sab = this.osSAB
    const ints = new Int32Array(sab)
    const payload = new Uint8Array(sab, HEADER_SIZE)

    acquireLock(ints)

    try {
        const messageBytes = encoder.encode(message)

        // Stream the request to osWorker in chunks.
        for (let offset = 0; offset < messageBytes.length; offset += MAX_CHUNK) {
            const chunk = messageBytes.subarray(offset, offset + MAX_CHUNK)
            payload.set(chunk)
            Atomics.store(ints, HEADER_INTS.length, chunk.length)
            const isLast = offset + chunk.length >= messageBytes.length
            Atomics.store(ints, HEADER_INTS.flags, isLast ? FLAG_LAST : 0)
            Atomics.store(ints, HEADER_INTS.state, State.REQ_CHUNK)
            Atomics.notify(ints, HEADER_INTS.state)

            if (!isLast) {
                waitForState(ints, State.REQ_NEXT)
            }
        }

        // Stream the response back from osWorker in chunks.
        const responseChunks: Uint8Array[] = []
        while (true) {
            waitForState(ints, State.RESP_CHUNK)
            const length = Atomics.load(ints, HEADER_INTS.length)
            const flags = Atomics.load(ints, HEADER_INTS.flags)
            responseChunks.push(payload.slice(0, length))

            if ((flags & FLAG_LAST) !== 0) break

            Atomics.store(ints, HEADER_INTS.state, State.RESP_NEXT)
            Atomics.notify(ints, HEADER_INTS.state)
        }

        // Let the receiver know we have drained the final chunk.
        Atomics.store(ints, HEADER_INTS.state, State.IDLE)
        Atomics.notify(ints, HEADER_INTS.state)

        const responseBytes = concatChunks(responseChunks)
        return decoder.decode(responseBytes)
    } finally {
        releaseLock(ints)
    }
}