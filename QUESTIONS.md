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

**Answer:** Build times would get much worse on every iteration. Docker caches each
instruction as a layer and reuses it only if that step's inputs are unchanged; once a
layer is invalidated, every layer after it is rebuilt too. By copying only `package.json`
(and the lockfile) first and installing before the `COPY . .` of the source, the
expensive `npm ci` layer's input is just the manifest — so editing application code
leaves it untouched and Docker reuses the cached `node_modules` layer, making rebuilds
nearly instant. If you reversed the order and copied all files before installing, any
source change would invalidate the `COPY` layer and force `npm ci` to re-download and
reinstall every dependency from scratch on each build — slow and wasteful.

---

### Question 4: Kubernetes Pods and Scheduling

Run `kubectl get pods -o wide` and paste the output below. Which nodes are your pods running on? Why might Kubernetes schedule pods across different nodes rather than placing them all on the same node?

**Output:**

```
NAME                                   READY   STATUS    RESTARTS   AGE     IP          NODE                                                NOMINATED NODE   READINESS GATES
mandelbrot-deployment-ddd455b4-2xs74   1/1     Running   0          5m51s   10.8.0.6    gke-mandelbrot-cluster-default-pool-40bfc990-0s4h   <none>           <none>
mandelbrot-deployment-ddd455b4-rszms   1/1     Running   0          5m48s   10.8.0.7    gke-mandelbrot-cluster-default-pool-40bfc990-0s4h   <none>           <none>
mandelbrot-deployment-ddd455b4-xj9lj   1/1     Running   0          5m59s   10.8.1.13   gke-mandelbrot-cluster-default-pool-40bfc990-mnp7   <none>           <none>
```

**Answer:** The 3 pods are spread across both nodes in the cluster: `...2xs74` and
`...rszms` run on node `...40bfc990-0s4h`, and `...xj9lj` runs on node `...40bfc990-mnp7`.
Kubernetes spreads replicas across nodes rather than stacking them on one for **resilience
and balance**. If all 3 pods sat on a single node and that node failed (or was drained,
rebooted, or ran out of resources), the entire app would go down at once; spreading them
means a single node failure takes out at most part of the deployment while the Service keeps
routing to the survivors on the other node. It also balances CPU/memory load across nodes so
no single machine is overloaded. The scheduler does this by scoring candidate nodes — it
factors in each node's available resources (our pods' CPU/memory `requests`) and a
spreading preference that favors placing replicas of the same Deployment on different nodes.
(They aren't perfectly 1-1-1 here only because there are 3 pods and 2 nodes, so one node
necessarily holds two.)

---

### Question 5: Load Balancing

Run `curl http://<YOUR-EXTERNAL-IP>/health` at least five times and paste the responses below. What do you notice about the `hostname` field? What do these hostnames correspond to, and what does this tell you about how the LoadBalancer distributes traffic?

**Responses:**

```
{"status":"ok","hostname":"mandelbrot-deployment-6bf95694c4-2qz2t"}
{"status":"ok","hostname":"mandelbrot-deployment-ddd455b4-2xs74"}
{"status":"ok","hostname":"mandelbrot-deployment-ddd455b4-xj9lj"}
{"status":"ok","hostname":"mandelbrot-deployment-ddd455b4-xj9lj"}
{"status":"ok","hostname":"mandelbrot-deployment-ddd455b4-2xs74"}
```

**Answer:** The `hostname` field changes between requests — across these five curls it
came back as three different values (`...2qz2t`, `...2xs74`, `...xj9lj`). Each hostname is
the name of the pod that served that request: the server calls `os.hostname()`, and inside
a container that resolves to the pod name. Since the same external IP returns different pod
names, the LoadBalancer Service is spreading incoming requests across all the backing pods
(matched by the `app: mandelbrot` selector) rather than pinning traffic to one. It does not
strictly rotate 1-2-3-1-2-3 — distribution is effectively random/per-connection (kube-proxy
load-balances across the Service's healthy endpoints), so you see repeats like `xj9lj` twice,
but over many requests traffic lands on every replica.

---

### Question 6: Self-Healing

While your application is running, delete one of your pods:

```
kubectl delete pod <pod-name>
```

Immediately run `kubectl get pods` and paste the output. Then wait 30 seconds and run it again. What happened? Explain the role of the Deployment controller in what you observed.

**Output (immediately after delete):**

```
NAME                                     READY   STATUS              RESTARTS   AGE
mandelbrot-deployment-6bf95694c4-zkvcv   0/1     Pending             0          32s
mandelbrot-deployment-ddd455b4-2xs74     1/1     Running             0          2m27s
mandelbrot-deployment-ddd455b4-rszms     0/1     ContainerCreating   0          2m24s
mandelbrot-deployment-ddd455b4-xj9lj     1/1     Running             0          2m35s
```

**Output (30 seconds later):**

```
NAME                                   READY   STATUS    RESTARTS   AGE
mandelbrot-deployment-ddd455b4-2xs74   1/1     Running   0          2m57s
mandelbrot-deployment-ddd455b4-rszms   1/1     Running   0          2m54s
mandelbrot-deployment-ddd455b4-xj9lj   1/1     Running   0          3m5s
```

**Answer:** Deleting a pod dropped the number of running replicas below the desired count
of 3, and Kubernetes immediately created a replacement (visible right after the delete as a
brand-new pod coming up `Pending` / `ContainerCreating`). Within ~30 seconds the deployment
was back to 3/3 `Running`. This is the Deployment controller's reconciliation loop at work:
the Deployment declares a desired state (`replicas: 3`) and, through its ReplicaSet, the
controller continuously compares desired vs. actual and acts to close any gap. When a pod
disappears, actual (2) < desired (3), so it schedules a new pod to restore the count — no
manual intervention needed. You manage the declared state, not individual pods, and the
controller self-heals the deployment back to it.

---

### Question 7: Load Testing

Run your k6 load test (`k6 run k8s/loadtest.js`) and paste the summary output below. Then answer: what is the average response time and total number of requests completed? If you increased the number of replicas from 3 to 6 (using `kubectl scale deployment mandelbrot-deployment --replicas=6`), would you expect the average response time to decrease? Why or why not?

**k6 output:**

```
```

**Answer:**
