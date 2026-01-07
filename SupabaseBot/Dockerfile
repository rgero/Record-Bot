# STEP 1: The "Build" Environment
FROM node:20-alpine AS builder
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
COPY . .
# Use the memory fix here just in case your local project is huge
RUN NODE_OPTIONS="--max-old-space-size=2048" npm run build [cite: 2]

# STEP 2: The "Run" Environment
FROM node:20-alpine
WORKDIR /usr/src/app
COPY package*.json ./
# Only install production tools (ignores tsc)
RUN npm install --omit=dev
# Grab only the built files from the step above
COPY --from=builder /usr/src/app/dist ./dist
# Copy specific JSON files your bot needs to read
COPY discordMapping.json ./

CMD ["npm", "start"] [cite: 2]