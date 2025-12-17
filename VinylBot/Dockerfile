# Use official Node.js LTS image
FROM node:20-alpine

# Set working directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the src folder
COPY src ./src

# Copy service account separately
COPY service-account.json ./service-account.json
COPY discordMapping.json ./discordMapping.json

# Run the bot from src/index.js
CMD ["node", "src/index.js"]
