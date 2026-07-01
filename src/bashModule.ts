import bashWasmUrl from '../bash/build/bash.wasm?url'

export interface BashModule {
  callMain(args?: string[]): number
  noExitRuntime?: boolean
  FS?: unknown
  pty?: unknown
}

export type CreateBashModule = (
  moduleArg?: Record<string, unknown>,
) => Promise<BashModule>

const bashModuleUrl = new URL('../bash/build/bash.mjs', import.meta.url).href

export async function loadBashModule(): Promise<CreateBashModule> {
  const mod = (await import(/* @vite-ignore */ bashModuleUrl)) as {
    default: CreateBashModule
  }
  return mod.default
}

export function bashWasmLocateFile(_path: string): string {
  return bashWasmUrl
}
