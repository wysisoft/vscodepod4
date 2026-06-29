import {sendLongMessageThroughSAB} from './messaging'

self.onmessage = (e: MessageEvent<{ osSAB: SharedArrayBuffer }>) => {
  const osSAB = e.data.osSAB
  const message = 'x'.repeat(200_000)
  const response = sendLongMessageThroughSAB(osSAB, message)
  console.log(response.substring(0, 10))
  console.log(response.length)
}

self.postMessage({ type: 'ready' })