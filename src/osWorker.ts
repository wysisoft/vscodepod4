import { 
  HEADER_SIZE, 
  HEADER_INTS, 
  State, 
  waitForState, 
  FLAG_LAST,
  concatChunks,
  decoder,
  encoder,
  MAX_CHUNK
} from './messaging'

function handleRequest(message: string): string {
  // Echo the request back with a prefix so the reply is larger than the request.
  return 'osWorker-reply:' + message
}

self.onmessage = (e: MessageEvent<{ osSAB: SharedArrayBuffer }>) => {
  const sab = e.data.osSAB
  const ints = new Int32Array(sab)
  const payload = new Uint8Array(sab, HEADER_SIZE)

  self.postMessage({ type: 'done' })

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

    console.log('request', message.substring(0, 10))

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
