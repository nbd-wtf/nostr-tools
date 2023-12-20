export async function yieldThread() {
  return new Promise(resolve => {
    const ch = new MessageChannel()
    // @ts-ignore (typescript thinks this property should be called `addListener`, but in fact it's `addEventListener`)
    ch.port1.addEventListener('message', resolve)
    ch.port2.postMessage(0)
    ch.port1.start()
  })
}
