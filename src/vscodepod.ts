import { FS_BUFFER_SIZE } from './messaging'

export class Vscodepod {
  readonly enableLogging: boolean
  readonly osSAB: SharedArrayBuffer

  private osWorker: Worker | null = null
  private threadWorkers: Worker[] = []

  constructor() {
    this.enableLogging = true
    this.osSAB = new SharedArrayBuffer(FS_BUFFER_SIZE)
  }

  async initialize() {
    return new Promise<void>((resolve) => {
      this.osWorker = new Worker(new URL('./osWorker.ts?worker', import.meta.url), { type: 'module' })
      const eventListener = (e: MessageEvent) => {
        if (e.data.type === 'ready') {
          this.osWorker!.postMessage({ osSAB: this.osSAB })
        } else if (e.data.type === 'done') {
          this.osWorker!.removeEventListener('message', eventListener)
          resolve()
        }
      }
      this.osWorker.addEventListener('message', eventListener)
    })
  }

  async createThreadWorker() {
    return new Promise<void>((resolve) => {
      const worker = new Worker(new URL('./threadWorker.ts?worker', import.meta.url), { type: 'module' })
      const eventListener = (e: MessageEvent) => {
        if (e.data.type === 'ready') {
          this.threadWorkers.push(worker)
          worker.postMessage({ osSAB: this.osSAB })
          worker.removeEventListener('message', eventListener)
          resolve()
        }
      }
      worker.addEventListener('message', eventListener)
    })
  }
}

