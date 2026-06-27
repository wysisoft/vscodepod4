const worker = new Worker(new URL('./vscodepod.ts?worker', import.meta.url), { type: 'module' })

worker.onmessage = (e: MessageEvent) => {
  if (e.data.type === 'sendLongMessageResponse') {
    console.log('sent', e.data.sent, 'received', e.data.received)
  } else if (e.data.type === 'error') {
    console.error('vscodepod worker error:', e.data.error)
  }
}
