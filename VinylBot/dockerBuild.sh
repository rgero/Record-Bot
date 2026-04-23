#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

echo "🚀 Starting build for roymond/vinyl-bot..."

# Build the image
docker build -t roymond/vinyl-bot:latest .

echo "✅ Build successful! Pushing to Docker Hub..."

# Push the image
docker push roymond/vinyl-bot:latest

echo "🎉 Done! Image is live."