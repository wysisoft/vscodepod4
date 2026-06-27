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

function handleRequest(message: string): string {
  // Echo the request back with a prefix so the reply is larger than the request.
  return 'osWorker-reply:' + message
}

self.onmessage = (e: MessageEvent<{ osSAB: SharedArrayBuffer }>) => {
  const sab = e.data.osSAB
  const ints = new Int32Array(sab)
  const payload = new Uint8Array(sab, HEADER_SIZE)

  // Single osWorker instance keeps reading chunked requests forever.
  while (true) {
    waitForState(ints, State.REQ_CHUNK)

    // Reassemble the full request from one or more chunks.
    const requestChunks: Uint8Array[] = []
    while (true) {
      const length = Atomics.load(ints, HEADER_INTS.length)
      const flags = Atomics.load(ints, HEADER_INTS.flags)
      requestChunks.push(payload.slice(0, length))

      if ((flags & FLAG_LAST) !== 0) break

      Atomics.store(ints, HEADER_INTS.state, State.REQ_NEXT)
      Atomics.notify(ints, HEADER_INTS.state)
      waitForState(ints, State.REQ_CHUNK)
    }

    const requestBytes = concatChunks(requestChunks)
    const message = decoder.decode(requestBytes)
    const response = handleRequest(message)
    const responseBytes = encoder.encode(response)

    // Stream the response back in chunks.
    for (let offset = 0; offset < responseBytes.length; offset += MAX_CHUNK) {
      const chunk = responseBytes.subarray(offset, offset + MAX_CHUNK)
      payload.set(chunk)
      Atomics.store(ints, HEADER_INTS.length, chunk.length)
      const isLast = offset + chunk.length >= responseBytes.length
      Atomics.store(ints, HEADER_INTS.flags, isLast ? FLAG_LAST : 0)
      Atomics.store(ints, HEADER_INTS.state, State.RESP_CHUNK)
      Atomics.notify(ints, HEADER_INTS.state)

      if (!isLast) {
        waitForState(ints, State.RESP_NEXT)
      }
    }

    // Wait until the caller has drained the final response chunk and releases the lock.
    waitForState(ints, State.IDLE)
  }
}

self.postMessage({ type: 'ready' })
