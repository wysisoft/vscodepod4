// Emscripten JS library for vscodepod bash extensions.
// Link with: --js-library=/path/to/vscodepod-js.js

mergeInto(LibraryManager.library, {
  js_checkpoint__deps: ['$wasmMemory'],
  js_checkpoint: function (_op) {
    return 0;
  },

  vscodepod_memory_checksum__deps: ['$wasmMemory'],
  vscodepod_memory_checksum: function () {
    var bytes = new Uint8Array(wasmMemory.buffer);
    var sum = 0;
    for (var i = 0; i < bytes.length; i += 4096) {
      sum = (sum + bytes[i]) | 0;
    }
    return sum;
  },

  vscodepod_save_memory__deps: ['$wasmMemory', '$FS'],
  vscodepod_save_memory: function (mode, pathPtr) {
    mode = mode | 0;
    var buffer = wasmMemory.buffer;
    var bytes = new Uint8Array(buffer);
    var len = bytes.length;
    var sum = Module['vscodepod_memory_checksum']();
    var i;

    if (mode === 2) {
      var path = UTF8ToString(pathPtr);
      if (!path) {
        return -1;
      }
      FS.writeFile(path, bytes);
      console.log('[savememory] wrote ' + len + ' bytes to ' + path);
      console.log('  sampledChecksum: ' + sum);
      return 0;
    }

    if (mode === 0) {
      var headLen = len < 64 ? len : 64;
      var head = '';
      for (i = 0; i < headLen; i++) {
        head += bytes[i].toString(16).padStart(2, '0');
      }
      console.log('[savememory] linear memory summary');
      console.log('  byteLength: ' + len);
      console.log('  sampledChecksum: ' + sum);
      console.log('  first64Hex: ' + head);
      return 0;
    }

    console.log('[savememory] full linear memory dump (' + len + ' bytes, base64 chunks)');
    var chunkSize = 256 * 1024;
    for (var off = 0; off < len; off += chunkSize) {
      var end = off + chunkSize;
      if (end > len) {
        end = len;
      }
      var slice = bytes.subarray(off, end);
      var bin = '';
      for (i = 0; i < slice.length; i++) {
        bin += String.fromCharCode(slice[i]);
      }
      console.log('[savememory] chunk offset=' + off + ' length=' + slice.length);
      console.log(btoa(bin));
    }
    console.log('[savememory] dump complete');
    return 0;
  },

  vscodepod_load_memory__deps: ['$wasmMemory', '$FS'],
  vscodepod_load_memory: function (pathPtr) {
    var path = UTF8ToString(pathPtr);
    if (!path) {
      return -1;
    }
    var data;
    try {
      data = FS.readFile(path);
    } catch (e) {
      console.error('[loadmemory] failed to read ' + path + ': ' + e);
      return -2;
    }
    if (!(data instanceof Uint8Array)) {
      data = new Uint8Array(data);
    }
    var target = new Uint8Array(wasmMemory.buffer);
    if (data.length !== target.length) {
      console.error(
        '[loadmemory] size mismatch: file=' + data.length + ' memory=' + target.length,
      );
      return -3;
    }
    target.set(data);
    var sum = Module['vscodepod_memory_checksum']();
    console.log('[loadmemory] restored ' + data.length + ' bytes from ' + path);
    console.log('  sampledChecksum: ' + sum);
    return 0;
  },
});
