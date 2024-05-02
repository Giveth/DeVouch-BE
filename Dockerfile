# Use the official Node.js 20 image as a parent image
FROM node:20-alpine

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

# Expose the port the app runs on
EXPOSE 4350

# Command to run the application
CMD ["sqd", "run", "."]
