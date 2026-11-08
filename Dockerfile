# Base Node image
FROM node:20-alpine AS builder

WORKDIR /app

# Install system dependencies (including ffmpeg for video processing)
RUN apk add --no-cache ffmpeg python3 make g++

# Copy dependencies
COPY package.json ./

# Install npm packages
RUN npm install

# Copy source files
COPY . .

# Build frontend production bundle
RUN npm run build

# Production image
FROM node:20-alpine AS runner

WORKDIR /app

# Install ffmpeg in runner
RUN apk add --no-cache ffmpeg

ENV NODE_ENV=production
ENV PORT=3000

# Copy node_modules and built dist
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server
COPY --from=builder /app/server.ts ./server.ts
COPY --from=builder /app/data ./data
COPY --from=builder /app/public ./public
COPY --from=builder /app/.env.example ./.env.example

EXPOSE 3000

CMD ["npm", "start"]
