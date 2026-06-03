# Notes

## Part 1: WebAssembly

**`initWasm()`** — awaits the global `createMandelbrotModule()` factory, stores the resolved
module in `wasmModule`, then calls `render()` for the initial draw.

**`render()`** — per frame: `_create_buffer(w, h)` allocates an RGBA buffer in WASM
linear memory and returns a pointer. `_compute_mandelbrot(...)`
fills it. We then build a `Uint8ClampedArray` view over `wasmModule.HEAPU8.buffer`
at that offset, wrap it in `ImageData`, and `putImageData` to the canvas. Finally
`_free_buffer()` releases the buffer and `updateStatus()` refreshes the coordinate
readout.

### Deviations from the skeleton

- **Makefile: exported `HEAPU8`.** The skeleton's `EXPORTED_RUNTIME_METHODS` was
  `["ccall","cwrap"]`. With Emscripten 5.x,
  HEAP views are no longer exported by default, so `wasmModule.HEAPU8` was
  undefined and `render()` couldn't read the pixel buffer. Added `HEAPU8` to
  `EXPORTED_RUNTIME_METHODS` and rebuilt. No change to `mandelbrot.c`.
- **Fresh `HEAPU8.buffer` view each render.** Because the module is built with
  `ALLOW_MEMORY_GROWTH=1`, allocating the buffer can grow the
  underlying `ArrayBuffer`. So the typed-array view is created after allocation,
  every frame, rather than cached once.
- **Added `updateStatus()` inside `render()`** so the center/zoom readout stays in
  sync after click-zoom and reset. The skeleton never called it.

## Part 2: Containerization

**Confirmed:** `docker build -t mandelbrot .` succeeds, and running the container
(`docker run -p 3000:3000 mandelbrot`) serves the app as `GET /` returns HTTP 200,
`mandelbrot.wasm` is served (HTTP 200), and `GET /health` returns JSON:
`{"status":"ok","hostname":"<container-id>"}`.

### Build choices

- **Base image: `node:20-alpine`.** Pinned to a specific major for
  reproducible builds. The Alpine variant keeps the final image small.
- **`npm ci --omit=dev`** instead of `npm install`: installs exactly from the lockfile
  and skips devDependencies, keeping the image lean and the install deterministic.
- **Added `.dockerignore`** excluding `node_modules`, `emsdk`, `.git`, `.claude`,
  `wasm/` source, and `*.md` — shrinks build context and image.

## Part 3: Kubernetes / GKE

- **Artifact Registry image URL:**
  `us-west1-docker.pkg.dev/secret-imprint-498300-b3/mandelbrot-repo/mandelbrot:v1`
- **Load balancing confirmed:** repeated `curl http://<EXTERNAL-IP>/health` requests
  returned changing hostname values across the 3 pods, so the LoadBalancer is
  distributing traffic as expected.

### Part 3F: Load test (k6)

20 VUs / 30 s → **64,768 total requests, avg 9.1 ms response time, 0% error rate.**

## Notes for grading

- **Resource requests were lowered to fit e2-small nodes.** `deployment.yaml` uses
  `cpu: 100m` / `memory: 128Mi` (down from the skeleton's `250m` / `256Mi`). With the
  original values, 2 of 3 replicas stayed `Pending` ("Insufficient cpu") because GKE's
  system DaemonSets consume most of the e2-small CPU. At `100m` all 3 schedule across
  the 2 nodes.
- **`k8s/deployment.yaml` is set for GKE** (Artifact Registry image +
  `imagePullPolicy: Always`). For local minikube testing it was `image: mandelbrot` +
  `imagePullPolicy: Never`.
- **`k8s/loadtest.js` has a hard-coded `BASE_URL`** (`http://8.231.200.227`) — the
  external IP of the LoadBalancer at test time. That IP no longer exists after cleanup.
