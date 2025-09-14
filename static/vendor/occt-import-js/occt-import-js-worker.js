// Load the compiled OCCT importer inside a web worker.
// The main thread will communicate with the library through this worker.
// The actual library logic lives in the bundled `occt-import-js.js` script,
// which in turn loads the accompanying WebAssembly module.

importScripts('./dist/occt-import-js.js');

// Further message handling is managed by the library once it initializes.
