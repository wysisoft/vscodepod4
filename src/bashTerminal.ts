import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { openpty } from 'xterm-pty'
import '@xterm/xterm/css/xterm.css'

import { bashWasmLocateFile, loadBashModule } from './bashModule'

export async function initBashTerminal(container: HTMLElement): Promise<void> {
  const term = new Terminal({
    cursorBlink: true,
    convertEol: true,
    fontFamily: 'ui-monospace, Consolas, monospace',
    fontSize: 14,
    theme: {
      background: '#1f2028',
      foreground: '#f3f4f6',
      cursor: '#c084fc',
    },
  })

  const fitAddon = new FitAddon()
  term.loadAddon(fitAddon)
  term.open(container)
  fitAddon.fit()

  const { master, slave } = openpty()
  term.loadAddon(master)

  const resizeObserver = new ResizeObserver(() => {
    fitAddon.fit()
  })
  resizeObserver.observe(container)

  const createBashModule = await loadBashModule()

  const bash = await createBashModule({
    noInitialRun: true,
    thisProgram: 'bash',
    pty: slave,
    locateFile: bashWasmLocateFile,
    ENV: {
      TERM: 'xterm-256color',
      HOME: '/home/web_user',
      PATH: '/bin:/usr/bin:.',
    },
  })

  bash.callMain(['-i'])
}
