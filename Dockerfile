# Use the official Node.js 22 LTS image as a parent image
FROM node:22-alpine

# Set the working directory in the Docker container
WORKDIR /usr/src/app

# Install Python and build-essential (for C++ bindings)
RUN apk add --no-cache python3 py3-pip make g++

# Copy the package.json and package-lock.json for npm install
COPY package*.json ./

# Install any global dependencies
RUN npm install -g @subsquid/cli

# Install project dependencies
RUN npm ci

# Copy the rest of the application
COPY . .

# Build the project using the Squid CLI
RUN sqd build

# Drop root for the runtime: application code execution should not also grant
# root inside the container. `node` (uid 1000) ships with the base image and
# owns /home/node, so npm-style caches still have a writable home. Ownership of
# the workdir is handed over after the build, since `sqd run` writes there.
RUN chown -R node:node /usr/src/app
USER node

# Expose the port the app runs on
EXPOSE 4350

# Command to run the application
CMD ["sqd", "run", "."]
