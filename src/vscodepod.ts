// globals.d.ts
declare global {
  interface Window {
    vscodepod: Vscodepod;
  }

  interface Self {
    vscodepod: Vscodepod;
  }

  // for Workers
  interface WorkerGlobalScope {
    vscodepod: Vscodepod;
  }
}

export { };



export class Vscodepod {
  readonly enableLogging: boolean
  readonly osSAB: SharedArrayBuffer

  constructor() {
    this.enableLogging = true
    this.osSAB = new SharedArrayBuffer(FS_BUFFER_SIZE)
  }

  async initialize() {
    return new Promise<void>((resolve) => {
      const worker = new Worker(new URL('./osWorker.ts?worker', import.meta.url), { type: 'module' })
      const eventListener = (e: MessageEvent) => {
        if (e.data.type === 'ready') {
          worker.postMessage({ osSAB: this.osSAB })
          worker.removeEventListener('message', eventListener)
          resolve()
        }
      }
      worker.addEventListener('message', eventListener)

      const threadWorker = new Worker(new URL('./threadWorker.ts?worker', import.meta.url), { type: 'module' })
      const threadEventListener = (e: MessageEvent) => {
        if (e.data.type === 'ready') {
          threadWorker.postMessage({ osSAB: this.osSAB })
          threadWorker.removeEventListener('message', threadEventListener)
          resolve()
        }
      }
      threadWorker.addEventListener('message', threadEventListener)
    })
  }

}

// This file is intended to run inside a worker thread where Atomics.wait is allowed.
let vc: Vscodepod

/**
 * Send a long message to the osWorker through the SAB and block until the full
 * reply is received. Must be called after bootstrap has finished.
 */
export function sendLongMessage(message: string): string {
  if (!vc) throw new Error('vscodepod not initialized yet')
  return vc.sendLongMessageThroughSAB(message)
}

async function bootstrap() {
  vc = new Vscodepod()
  self.vscodepod = vc
  await vc.initialize()

  // Example: call the SAB-based messaging directly from the worker's global code.
  const message = 'x'.repeat(200_000)
  const response = sendLongMessage(message)
  self.postMessage({ type: 'sendLongMessageResponse', sent: message.length, received: response.length })
}

bootstrap().catch((err) => {
  console.error('vscodepod worker bootstrap failed', err)
  self.postMessage({ type: 'error', error: String(err) })
})
