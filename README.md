# Project 4: Mandelbrot Explorer

A fractal visualization app powered by WebAssembly, deployed on Google Kubernetes Engine.

You will compile a C program to WebAssembly, load it in a web application to render interactive Mandelbrot set fractals, package the application in a Docker container, and deploy it to a Kubernetes cluster behind a load balancer.

## Purpose

Deployment is a concept that is typically overlooked both at the undergraduate
and graduate levels. It is a concept that is typically only learned from
internships or full-time engineering work. It is my opinion that students
should focus on developing systems knowledge and Kubernetes is a good
framework to learn for that. This project will take you end-to-end from
development to deployment. In this project you will:

1. Build a WASM module and import it into JavaScript.
2. Build a Docker image from your work.
3. Deploy the image somewhere (Minikube for dev, GAR for final product)
4. Create a container and run on Kubernetes and GKE.
5. Perform a load performance test on a real load balancer in GKE.

While this project involves many different technologies we have tried to
give thorough directions and TODOs to help you quickly complete each part.
Each part can be tested separately so you can iterate on one part at a time.

## Testing

Each part of this project allows you to test your work. **Do not** create a GKE cluster right away. Only create the GKE cluster once you have verified that you can deploy your app onto Minikube successfully, meaning you can access the app from the browser using the IP that Minikube provides.

## Getting Started

### Prerequisites

- Node.js (v20+)
- [Emscripten](https://emscripten.org/) (for compiling C to WebAssembly)
- [Docker](https://www.docker.com/)
- [Google Cloud SDK](https://cloud.google.com/sdk/docs/install) (`gcloud`)
- `kubectl` (installed via `gcloud components install kubectl`)

### Installing Emscripten

If you have Emscripten installed globally, you can skip this step. Otherwise, we recommend installing Emscripten locally:

```
git clone https://github.com/emscripten-core/emsdk.git
cd emsdk
./emsdk install latest
./emsdk activate latest
source ./emsdk_env.sh
```

Then compile the C code to WebAssembly:

```
npm run build:wasm
```

Alternatively, you can compile via the Emscripten Docker image, but be warned — the command is long and easy to get wrong. Local installation (above) is strongly recommended.

```
docker run --rm -v $(pwd)/wasm:/src -v $(pwd)/public:/public \
    emscripten/emsdk \
    emcc -O3 \
    -sEXPORTED_FUNCTIONS='["_create_buffer","_free_buffer","_compute_mandelbrot","_mandelbrot_iterate","_malloc","_free"]' \
    -sEXPORTED_RUNTIME_METHODS='["ccall","cwrap"]' \
    -sMODULARIZE=1 \
    -sEXPORT_NAME='createMandelbrotModule' \
    -sALLOW_MEMORY_GROWTH=1 \
    mandelbrot.c -o /public/mandelbrot.js
```

### Running Locally

```
npm install
npm run build:wasm
npm start
```

Open `http://localhost:3000` in your browser. You should see the Mandelbrot set. Click anywhere to zoom in on that region. Right-click to zoom out.

Answer all questions in [`QUESTIONS.md`](QUESTIONS.md).

---

## Part 1: WebAssembly

### 1A: Compile the C Code

The C code in `wasm/mandelbrot.c` is fully provided. Read through it to understand what it does — it computes the Mandelbrot set for a viewport and writes RGBA pixel data into a shared memory buffer. You do not need to modify this file.

Compile it with `npm run build:wasm` (or the Docker command above). This produces `public/mandelbrot.js` and `public/mandelbrot.wasm`.

### 1B: Load the WASM Module in JavaScript

Open `public/app.js`. Two functions are marked with TODO comments:

**`initWasm()`** — Load the WebAssembly module. The compiled `mandelbrot.js` file (loaded via a `<script>` tag) defines a global factory function called `createMandelbrotModule`. Call it, await the result, store it in `wasmModule`, and call `render()`.

**`render()`** — Use the WASM module to compute and display the fractal. The TODO comment walks through each step: allocate a buffer in WASM memory, run the computation, create a JavaScript typed array view of the result, draw it to the canvas with `putImageData`, and free the buffer.

### Testing

Once both parts are implemented, run `npm start` and open http://localhost:3000. You should see a colorful rendering of the Mandelbrot set. Verify that:

- The fractal renders correctly (the main cardioid and surrounding bulbs are visible)
- Clicking zooms in on the clicked region
- Right-clicking zooms out
- The "Reset View" button returns to the default view
- The render time is displayed in the footer

---

## Part 2: Containerization

Complete the `Dockerfile` by replacing each TODO section with the appropriate Docker instructions. Each TODO includes an explanation of what the step should do and why. After completing it, build and test locally:

```
docker build -t mandelbrot .
docker run -p 3000:3000 mandelbrot
```

Verify the app works at `http://localhost:3000` and that `http://localhost:3000/health` returns a JSON response.

---

## Testing Your Kubernetes Manifests Locally (Strongly Recommended to Reduce Costs)

Before creating a GKE cluster, use [minikube](https://minikube.sigs.k8s.io/docs/start/) to test your Kubernetes manifests locally. This lets you catch mistakes without incurring GKE charges.

### Resize your GCE instance

minikube needs more memory than an `e2-small` provides. Temporarily resize your instance to `e2-medium` (2 vCPU, 4 GB RAM). You must stop the instance first — run these commands from **your local machine** (not the GCE instance), or use the [GCP Console](https://console.cloud.google.com/compute/instances):

```
gcloud compute instances stop YOUR_INSTANCE_NAME --zone=YOUR_ZONE
gcloud compute instances set-machine-type YOUR_INSTANCE_NAME --zone=YOUR_ZONE --machine-type=e2-medium
gcloud compute instances start YOUR_INSTANCE_NAME --zone=YOUR_ZONE
```

Then SSH back in. When you are done with `minikube`, you can resize back to `e2-small` using the same steps.

### Install Minikube

```
curl -LO https://storage.googleapis.com/minikube/releases/latest/minikube-linux-amd64
sudo install minikube-linux-amd64 /usr/local/bin/minikube
rm minikube-linux-amd64
```

### Start a local cluster

```
minikube start
```

### Load your Docker image into `minikube`

`minikube` runs its own Docker daemon, so it cannot see images on your host. Load your image into minikube:

```
minikube image load mandelbrot
```

### Update `deployment.yaml` for local testing

In `k8s/deployment.yaml`, set the image to the local image name (the `-t` name you gave to `docker build`) and set `imagePullPolicy`:

```yaml
image: mandelbrot
imagePullPolicy: Never
```

By default, Kubernetes tries to pull the image from a remote container registry (like Artifact Registry or Docker Hub). Since your image only exists inside minikube's local Docker daemon, setting `imagePullPolicy: Never` tells Kubernetes to use the local image instead of trying to pull it.

### Deploy and test

Apply your manifests and use `minikube tunnel` to get a LoadBalancer IP:

```
kubectl apply -f k8s/
minikube tunnel
```

In a separate terminal, check your service:

```
kubectl get service mandelbrot-service
```

Once an `EXTERNAL-IP` appears, open it in your browser (on port 80) to verify the app works. You can also verify load balancing by curling `/health` several times and observing the `hostname` change:

```
curl http://<EXTERNAL-IP>/health
```

Verify that:

- All 3 pods are running: `kubectl get pods`
- The health endpoint responds with a JSON object containing `status` and `hostname`
- The `hostname` changes across repeated requests (traffic is reaching different pods)

### Clean up minikube

When you are done testing locally:

```
minikube stop
```

### Prepare for GKE

Before moving to Part 3, update your `deployment.yaml` for GKE:

- Set `image` to your Artifact Registry URL (see Part 3B)
- Change `imagePullPolicy` to the appropriate value for pulling from a remote registry

---

## Part 3: Kubernetes Deployment

Deploy your containerized application to Google Kubernetes Engine with 2 nodes and 3 pod replicas behind a load balancer.

### 3A: Create the GKE Cluster

Set your project and zone (make sure it is the same as where your GCE instance is located), then create a cluster with 2 nodes:

```
gcloud config set project YOUR_PROJECT_ID
gcloud config set compute/zone ZONE

gcloud container clusters create mandelbrot-cluster \
    --num-nodes=2 \
    --machine-type=e2-small \
    --disk-size=20
```

Note that this process takes several minutes. **You should only create the cluster once you have verified you can access everything mentioned in the Minikube section. If you cannot, please fix it, or ask for help.**

Get credentials so `kubectl` can talk to your cluster:

```
gcloud container clusters get-credentials mandelbrot-cluster
```

### 3B: Push Your Image to Artifact Registry

Create a Docker repository in Artifact Registry, then tag and push your image:

```
gcloud artifacts repositories create mandelbrot-repo \
    --repository-format=docker \
    --location=REGION

gcloud auth configure-docker us-west1-docker.pkg.dev

docker tag mandelbrot us-west1-docker.pkg.dev/YOUR_PROJECT_ID/mandelbrot-repo/mandelbrot:v1
docker push us-west1-docker.pkg.dev/YOUR_PROJECT_ID/mandelbrot-repo/mandelbrot:v1
```

Note that we are using region above, not zone.

### 3C: Complete the Kubernetes Manifests

Skeleton manifests are provided in the `k8s/` directory. Open each file and replace every `REPLACE_ME` with the correct value.

**`k8s/deployment.yaml`** — A Kubernetes Deployment that runs 3 replicas of your container. Follow the TODOs.

**`k8s/service.yaml`** — A Kubernetes Service that exposes your pods behind a load balancer. Follow the TODOs and also fill in:

- Port mapping: port `80` (external) to `targetPort` `3000` (your container)

### 3D: Deploy

Apply your manifests and wait for the external IP:

```
kubectl apply -f k8s/
kubectl get service mandelbrot-service --watch
```

The `EXTERNAL-IP` column will show `<pending>` for a minute or two, then display the IP address. Open `http://<EXTERNAL-IP>` in your browser to verify your app is running.

### 3E: Verify the Deployment

Run the following commands and observe the results:

```
kubectl get pods -o wide
kubectl get nodes
kubectl get service
```

You should see 3 pods distributed across 2 nodes, and a service with an external IP.

Hit the `/health` endpoint several times:

```
curl http://<EXTERNAL-IP>/health
```

Notice that the `hostname` field changes between requests — the load balancer is routing traffic to different pods.

### 3F: Load Testing with k6

Now that your cluster is running, use [k6](https://grafana.com/docs/k6/latest/) to send real traffic to your load balancer and observe how requests are distributed across pods.

#### Installing k6

```
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update && sudo apt-get install k6
```

#### Writing the Load Test

Open `k8s/loadtest.js`. This is a k6 test script written in JavaScript. Three sections are marked with TODO comments:

1. **`options`** — Configure the test to run 20 virtual users (simulated concurrent clients) for 30 seconds.

2. **`BASE_URL`** — Replace the placeholder with your service's external IP.

3. **`default function`** — Send a GET request to `/health` and verify the response status is 200 and contains a hostname. k6 calls this function in a tight loop for each virtual user for the configured duration.

#### Running the Load Test

After replacing `<YOUR-EXTERNAL-IP>` with your actual external IP:

```
k6 run k8s/loadtest.js
```

k6 will print a summary showing total requests, average response time, and error rate. While the test runs, open a second terminal and watch your pods:

```
kubectl top pods
```

This shows CPU and memory usage for each pod. You should see load distributed across all 3 replicas.

---

## Cleanup

**Delete your GKE cluster when you are done to avoid ongoing charges:**

```
gcloud container clusters delete mandelbrot-cluster --quiet
gcloud artifacts repositories delete mandelbrot-repo --location=us-west1 --quiet
```

Leaving the cluster running will incur charges on your GCP account.

**NOTE:** If you can run the app using Minikube, you should have no problem
running on GKE.

---

## General Debugging Strategy (IMPORTANT!)

- **Part 1:** Test that the Node.js project works correctly. Open `http://localhost:3000` in your browser. You may need an SSH tunnel.
- **Part 2:** Build the Docker image and run it locally with `docker run -p 3000:3000 mandelbrot`. Verify the app works at `http://localhost:3000` and that `/health` returns JSON.
- **Part 3:** Test with minikube before creating a GKE cluster. If something doesn't work on minikube, it won't work on GKE either. Use `kubectl describe pod <pod-name>` and `kubectl logs <pod-name>` to debug pod issues.

## Questions

Answer all questions in [`QUESTIONS.md`](QUESTIONS.md).

## Backup plan

This is the first time we are doing a project like this. We have provided thorough instructions. If there are widespread issues, we will provide extra help or switch to a backup plan, particularly for the GKE portion.
