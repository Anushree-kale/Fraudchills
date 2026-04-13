# Stage 1: Build stage
FROM node:20-alpine AS builder
WORKDIR /app

# Accept DATABASE_URL as a build argument
ARG DATABASE_URL
ENV DATABASE_URL=$DATABASE_URL

# Install dependencies first (better caching)
COPY package*.json ./
RUN npm install

# Copy source and build
COPY . .
RUN npm run build

# Stage 2: Production runner stage
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copy necessary files from builder
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

EXPOSE 3000

# Start Next.js
CMD ["npm", "start"]
