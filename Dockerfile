# Mandelbrot Explorer — Dockerfile
#
# This file defines how to package the application into a container image.
# Fill in each section below. The comments explain what each step should
# accomplish and why.

# TODO: Specify a base image for a Node.js application.
# Browse the official options at https://hub.docker.com/_/node/tags
# Pick a specific version tag (not "latest") so builds are reproducible,
# and choose a small image variant to keep the final image lean.
FROM node:20-alpine

# TODO: Set the working directory inside the container.
# All subsequent COPY and RUN commands will operate relative to this path.
WORKDIR /app

# TODO: Copy the dependency manifest into the container and install
# production dependencies.
#
# Think about the order in which you copy files. Docker caches each step
# (called a "layer") and only re-runs a step when its inputs change.
# Structure your COPY and RUN commands so that a source-code change does
# not force dependencies to be reinstalled.
#
# The container only needs production packages — skip devDependencies.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# TODO: Copy the rest of the application source code into the container.
# At this point the node_modules directory already exists from the previous
# step, so npm does not need to run again.
#
# Make sure the compiled WebAssembly files (mandelbrot.js and mandelbrot.wasm
# in public/) are present before you build the image — Docker copies files
# from your local machine, so you must compile the WASM first.
COPY . .

# TODO: Tell Docker which port the server listens on.
# This does not actually publish the port — it documents the port for
# orchestration tools and other developers.
EXPOSE 3000

# TODO: Define the command that starts the server when the container runs.
# Use the JSON array syntax (called "exec form") rather than the shell form.
# Exec form runs the process directly as PID 1, so it receives OS signals
# (like SIGTERM) properly — important for graceful shutdown in Kubernetes.
CMD ["node", "server.js"]
