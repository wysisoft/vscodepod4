const FS_BUFFER_SIZE = 65536

export class OperatingSystem {
  readonly osSAB: SharedArrayBuffer

  constructor() {
    this.osSAB = new SharedArrayBuffer(FS_BUFFER_SIZE)
  }


}
