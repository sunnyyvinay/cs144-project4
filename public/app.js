const canvas = document.getElementById("fractal-canvas");
const ctx = canvas.getContext("2d");

let centerX = -0.5;
let centerY = 0;
let zoom = 1;
const MAX_ITER = 1000;

let wasmModule = null;

// TODO: Load the WebAssembly module and render the initial fractal.
//
// The compiled mandelbrot.js file (loaded via a <script> tag) defines a global
// factory function called createMandelbrotModule. Calling it returns a Promise
// that resolves to the initialized module object. Store the result in the
// wasmModule variable declared above, then draw the fractal.
async function initWasm() {
    wasmModule = await createMandelbrotModule();
    render();
}

// TODO: Render the Mandelbrot set to the canvas using the WASM module.
//
// Use the WASM module's exported functions to compute the fractal and
// display it. The C code works with a pixel buffer in WASM's linear memory,
// so the general flow is:
//
//   1. Allocate a pixel buffer in WASM memory (see create_buffer in mandelbrot.c).
//      This returns a pointer — an integer offset into WASM's linear memory.
//      Emscripten exports C functions with a "_" prefix, so create_buffer
//      becomes wasmModule._create_buffer() in JavaScript.
//   2. Run the Mandelbrot computation to fill the buffer with RGBA pixel data
//      (see compute_mandelbrot in mandelbrot.c).
//   3. JavaScript can't use a WASM pointer directly. To read the pixel data,
//      create a Uint8ClampedArray view into the module's HEAPU8 buffer at the
//      pointer offset. Look up Emscripten's HEAPU8 to understand how JS can
//      access WASM linear memory.
//   4. Draw the pixel data to the canvas using the Canvas API's ImageData and
//      putImageData.
//   5. Free the WASM buffer and update the status display.
function render() {
    if (!wasmModule) return;

    const width = canvas.width;
    const height = canvas.height;

    const start = performance.now();

    // 1. Allocate an RGBA pixel buffer in WASM linear memory. The returned
    //    pointer is an integer offset into that memory.
    const bufferPtr = wasmModule._create_buffer(width, height);

    // 2. Fill the buffer with the Mandelbrot computation.
    wasmModule._compute_mandelbrot(width, height, centerX, centerY, zoom, MAX_ITER);

    // 3. Create a JS view of the pixel data living in WASM memory. We read the
    //    HEAPU8.buffer fresh here because ALLOW_MEMORY_GROWTH can replace the
    //    underlying ArrayBuffer when the buffer is allocated above.
    const pixels = new Uint8ClampedArray(
        wasmModule.HEAPU8.buffer, bufferPtr, width * height * 4
    );

    // 4. Draw the pixels to the canvas.
    const imageData = new ImageData(pixels, width, height);
    ctx.putImageData(imageData, 0, 0);

    // 5. Free the WASM buffer and refresh the coordinate readout.
    wasmModule._free_buffer();
    updateStatus();

    const elapsed = performance.now() - start;
    document.getElementById("render-time").textContent =
        `Rendered in ${elapsed.toFixed(1)} ms`;
}

function updateStatus() {
    document.getElementById("coordinates").textContent =
        `Center: (${centerX.toFixed(4)}, ${centerY.toFixed(4)}) | Zoom: ${zoom}x`;
}

canvas.addEventListener("click", (event) => {
    const rect = canvas.getBoundingClientRect();
    const px = event.clientX - rect.left;
    const py = event.clientY - rect.top;

    const scale = 4.0 / (canvas.width * zoom);
    centerX += (px - canvas.width / 2) * scale;
    centerY += (py - canvas.height / 2) * scale;
    zoom *= 2;

    render();
});

canvas.addEventListener("contextmenu", (event) => {
    event.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const px = event.clientX - rect.left;
    const py = event.clientY - rect.top;

    const scale = 4.0 / (canvas.width * zoom);
    centerX += (px - canvas.width / 2) * scale;
    centerY += (py - canvas.height / 2) * scale;
    zoom = Math.max(1, zoom / 2);

    render();
});

document.getElementById("reset-btn").addEventListener("click", () => {
    centerX = -0.5;
    centerY = 0;
    zoom = 1;
    render();
});

function resizeCanvas() {
    const container = document.getElementById("canvas-container");
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    if (wasmModule) render();
}

window.addEventListener("resize", resizeCanvas);
resizeCanvas();

initWasm();
