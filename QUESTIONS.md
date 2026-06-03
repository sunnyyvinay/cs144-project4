# Project 4 Questions

Answer each question in the space provided.

---

### Question 1: WebAssembly vs. JavaScript

Write a JavaScript function called `mandelbrotJS(cx, cy, maxIter)` that performs the same computation as your C `mandelbrot_iterate` function. Then write a short script (or add a button to your app) that times how long it takes to compute the full fractal using your JS function vs. the WASM module at the default zoom level.

Report both times below and explain why one is faster than the other. What does the browser do differently when executing WebAssembly compared to JavaScript?

**Your JS function:**

```js
function mandelbrotJS(cx, cy, maxIter) {
    let zx = 0, zy = 0, iter = 0;
    while (zx * zx + zy * zy <= 4.0 && iter < maxIter) {
        const nzx = zx * zx - zy * zy + cx;
        zy = 2.0 * zx * zy + cy;
        zx = nzx;
        iter++;
    }
    return iter;
}
```

**JS render time:** ~110 ms (800×600, MAX_ITER=1000)

**WASM render time:** ~110 ms (same viewport)

**Explanation:** For this default viewport the two are nearly equal once warm. WASM is
validated and ahead-of-time compiled from a statically-typed bytecode straight to
machine code, so it runs at predictable near-native speed with no warmup. JS must be
parsed, interpreted, then JIT-compiled at runtime after the engine profiles it (and
can deoptimize if types shift). Because this loop is just tight `f64` arithmetic with
no objects or GC, a modern JIT (V8) optimizes it almost as well as WASM, so steady-state
times converge. WASM's edge shows up elsewhere: no JIT warmup (faster first/cold render),
consistent timing, and larger gaps in weaker engines or on code that defeats the JIT.

---

### Question 2: WebAssembly Memory

When you call `wasmModule._create_buffer(width, height)`, it returns a number (e.g. `5243024`). What does this number represent? Why can't you use it directly as a JavaScript array — what additional step do you need to take to read the pixel data, and why?

**Answer:** It's a pointer — a byte offset into the WASM module's linear memory (a single
`ArrayBuffer`), not a JS object reference. You can't index it directly because JS has no
handle to that raw memory through the number alone. To read the pixels you create a typed-
array *view* over the module's memory at that offset — e.g.
`new Uint8ClampedArray(wasmModule.HEAPU8.buffer, ptr, width * height * 4)` — which lets JS
read the bytes WASM wrote without copying them.

---

### Question 3: Docker Layer Caching

In your Dockerfile, you copied `package.json` and ran `npm install` before copying the rest of your source code. Suppose you reversed this and copied all files first, then ran `npm install`. What would happen to your build times as you iterate on your code? Why?

**Answer:**

---

### Question 4: Kubernetes Pods and Scheduling

Run `kubectl get pods -o wide` and paste the output below. Which nodes are your pods running on? Why might Kubernetes schedule pods across different nodes rather than placing them all on the same node?

**Output:**

```
```

**Answer:**

---

### Question 5: Load Balancing

Run `curl http://<YOUR-EXTERNAL-IP>/health` at least five times and paste the responses below. What do you notice about the `hostname` field? What do these hostnames correspond to, and what does this tell you about how the LoadBalancer distributes traffic?

**Responses:**

```
```

**Answer:**

---

### Question 6: Self-Healing

While your application is running, delete one of your pods:

```
kubectl delete pod <pod-name>
```

Immediately run `kubectl get pods` and paste the output. Then wait 30 seconds and run it again. What happened? Explain the role of the Deployment controller in what you observed.

**Output (immediately after delete):**

```
```

**Output (30 seconds later):**

```
```

**Answer:**

---

### Question 7: Load Testing

Run your k6 load test (`k6 run k8s/loadtest.js`) and paste the summary output below. Then answer: what is the average response time and total number of requests completed? If you increased the number of replicas from 3 to 6 (using `kubectl scale deployment mandelbrot-deployment --replicas=6`), would you expect the average response time to decrease? Why or why not?

**k6 output:**

```
```

**Answer:**
