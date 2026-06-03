# Notes

## Part 1: WebAssembly

**`initWasm()`** — `await`s the global `createMandelbrotModule()` factory (exposed by
`mandelbrot.js`, loaded via the `<script>` tag before `app.js`), stores the resolved
module in `wasmModule`, then calls `render()` for the initial draw.

**`render()`** — per frame: `_create_buffer(w, h)` allocates an RGBA buffer in WASM
linear memory and returns a pointer (an integer offset). `_compute_mandelbrot(...)`
fills it. We then build a `Uint8ClampedArray` view over `wasmModule.HEAPU8.buffer`
at that offset, wrap it in `ImageData`, and `putImageData` to the canvas. Finally
`_free_buffer()` releases the buffer and `updateStatus()` refreshes the coordinate
readout.

### Deviations from the skeleton

- **Makefile: exported `HEAPU8`.** The skeleton's `EXPORTED_RUNTIME_METHODS` was
  `["ccall","cwrap"]`. With Emscripten 5.x (what `emsdk install latest` gives),
  HEAP views are no longer exported by default, so `wasmModule.HEAPU8` was
  `undefined` and `render()` couldn't read the pixel buffer. Added `HEAPU8` to
  `EXPORTED_RUNTIME_METHODS` and rebuilt. No change to `mandelbrot.c`.
- **Fresh `HEAPU8.buffer` view each render.** Because the module is built with
  `ALLOW_MEMORY_GROWTH=1`, allocating the buffer can grow (and replace/detach) the
  underlying `ArrayBuffer`. So the typed-array view is created *after* allocation,
  every frame, rather than cached once.
- **Added `updateStatus()` inside `render()`** so the center/zoom readout stays in
  sync after click-zoom and reset (the skeleton never called it).
