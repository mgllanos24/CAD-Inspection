import test from 'node:test';
import assert from 'node:assert/strict';
import { createHandleFileSelect } from '../../static/handleFileSelect.js';

class MockFileReader {
  constructor() {
    this.onload = null;
    this.onerror = null;
  }
  readAsArrayBuffer() {
    if (this.onload) {
      const buffer = new ArrayBuffer(8);
      this.onload({ target: { result: buffer } });
    }
  }
}

global.FileReader = MockFileReader;

function createMockElement() {
  const classes = new Set();
  return {
    classList: {
      add: (...cls) => cls.forEach(c => classes.add(c)),
      remove: (...cls) => cls.forEach(c => classes.delete(c)),
      contains: c => classes.has(c),
    },
    value: '',
    innerHTML: '',
  };
}

function createDeps() {
  const loaderElement = createMockElement();
  loaderElement.classList.add('hidden');
  const conversionLoaderElement = createMockElement();
  conversionLoaderElement.classList.add('hidden');
  const fileInput = createMockElement();
  const convertBtn = createMockElement();
  convertBtn.classList.add('hidden');

  return {
    resetUI: () => {},
    showThreeJsViewer: () => {},
    showRevViewer: () => {},
    loadStepModel: () => {},
    loadSldprtModel: () => {},
    loaderElement,
    conversionLoaderElement,
    fileInput,
    convertBtn,
    alertFn: () => {},
    setCurrentFileName: () => {},
  };
}

test('accepts .stp and .step files', () => {
  for (const ext of ['stp', 'step']) {
    const deps = createDeps();
    let showCalled = false;
    let loadArgs;
    deps.showThreeJsViewer = () => { showCalled = true; };
    deps.loadStepModel = (name, content) => { loadArgs = [name, content]; };
    const handler = createHandleFileSelect(deps);
    const file = { name: `model.${ext}`, size: 1 };
    handler({ target: { files: [file] } });
    assert.equal(showCalled, true);
    assert.equal(loadArgs[0], `model.${ext}`);
    assert.ok(loadArgs[1] instanceof ArrayBuffer);
  }
});

test('accepts .sldprt files', () => {
  const deps = createDeps();
  let revCalled = false;
  let loadArg;
  deps.showRevViewer = () => { revCalled = true; };
  deps.loadSldprtModel = (file) => { loadArg = file; };
  const handler = createHandleFileSelect(deps);
  const file = { name: 'part.sldprt', size: 1 };
  handler({ target: { files: [file] } });
  assert.equal(revCalled, true);
  assert.equal(loadArg, file);
  assert.equal(deps.convertBtn.classList.contains('hidden'), false);
});

test('handles files without extension', () => {
  const deps = createDeps();
  let alertMsg;
  deps.alertFn = (msg) => { alertMsg = msg; };
  const handler = createHandleFileSelect(deps);
  const file = { name: 'file', size: 1 };
  handler({ target: { files: [file] } });
  assert.equal(alertMsg, 'Unsupported file format.');
  assert.ok(deps.loaderElement.classList.contains('hidden'));
  assert.ok(deps.conversionLoaderElement.classList.contains('hidden'));
  assert.equal(deps.fileInput.value, '');
});

test('handles oversized files', () => {
  const deps = createDeps();
  let alertMsg;
  let showCalled = false;
  let revCalled = false;
  deps.alertFn = (msg) => { alertMsg = msg; };
  deps.showThreeJsViewer = () => { showCalled = true; };
  deps.showRevViewer = () => { revCalled = true; };
  const handler = createHandleFileSelect(deps);
  const bigFile = { name: 'big.stp', size: 50 * 1024 * 1024 + 1 };
  handler({ target: { files: [bigFile] } });
  assert.equal(alertMsg, 'File is too large. Maximum allowed size is 50 MB.');
  assert.equal(showCalled, false);
  assert.equal(revCalled, false);
});
