import { Vscodepod } from "./vscodepod"

const vc = new Vscodepod()
await vc.initialize()
await vc.createThreadWorker()