import './style.css'
import { initBashTerminal } from './bashTerminal'

const terminalEl = document.querySelector<HTMLElement>('#terminal')
if (!terminalEl) {
  throw new Error('#terminal not found')
}

await initBashTerminal(terminalEl)

// Vscodepod workers — enable once bash/OS integration is wired up.
// import { Vscodepod } from './vscodepod'
// const vc = new Vscodepod()
// await vc.initialize()
// await vc.createThreadWorker()
