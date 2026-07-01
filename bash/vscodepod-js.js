// Emscripten JS library for vscodepod bash extensions.
// Link with: --js-library=/path/to/vscodepod-js.js

mergeInto(LibraryManager.library, {
  js_checkpoint__deps: ['$wasmMemory'],
  js_checkpoint: function (_op) {
    // Reserved for future checkpoint save/load via asyncify.
    return 0;
  },

  vscodepod_save_memory__deps: ['$wasmMemory'],
  vscodepod_save_memory: function (mode) {
    mode = mode | 0;
    var buffer = wasmMemory.buffer;
    var bytes = new Uint8Array(buffer);
    var len = bytes.length;
    var sum = 0;
    var i;

    for (i = 0; i < len; i += 4096) {
      sum = (sum + bytes[i]) | 0;
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
});
