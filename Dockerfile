# =============================================================================
# Stage 1: Build the Expo web export
# =============================================================================
FROM node:22-alpine AS web-build

WORKDIR /app

# Install frontend dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy frontend source (app/, src/, assets/, etc.)
COPY app.json tsconfig.json ./
COPY app/ ./app/
COPY src/ ./src/
COPY assets/ ./assets/
COPY constants/ ./constants/

# Copy production env file — Expo auto-loads .env.production when NODE_ENV=production
# (the default for `expo export`). All values are empty → frontend uses relative URLs
# (same-origin pattern), so the same image works on any Cloud Run service.
COPY .env.production ./

# Build the static web bundle (output → dist/)
RUN npx expo export --platform web \
    && sed -i 's/<script src="\/_expo/<script type="module" src="\/_expo/g' dist/index.html

# =============================================================================
# Stage 2: Install backend dependencies
# =============================================================================
FROM node:22-alpine AS backend-deps

WORKDIR /app
COPY backend/package.json backend/package-lock.json ./
RUN npm ci

# =============================================================================
# Stage 3: Production image
# =============================================================================
FROM node:22-alpine

WORKDIR /app

# Backend dependencies + source
COPY --from=backend-deps /app/node_modules ./node_modules
COPY backend/package.json ./
COPY backend/src/ ./src/

# Expo web export → /app/public (served by Hono static middleware)
COPY --from=web-build /app/dist ./public

# Cloud Run injects PORT (default 8080)
ENV PORT=8080
EXPOSE 8080

# Run migrations then start the server
CMD ["sh", "-c", "npx tsx src/scripts/migrate.ts && npx tsx src/server.ts"]
