# Stage 1: Build the frontend React app
FROM node:18-alpine AS frontend-builder
WORKDIR /app/frontend

# Copy frontend packages and install dependencies
COPY frontend/package*.json ./
RUN npm ci

# Copy frontend source code and build it
COPY frontend/ ./
RUN npm run build

# Stage 2: Setup the backend app
FROM node:18-alpine
WORKDIR /app

# Copy backend packages and install production-only dependencies
COPY backend/package*.json ./backend/
RUN cd backend && npm ci --only=production

# Copy backend source code
COPY backend/ ./backend/

# Copy the built frontend static files from Stage 1
COPY --from=frontend-builder /app/frontend/build ./frontend/build

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8000

# Expose backend API / Web Socket port
EXPOSE 8000

# Run database setup script, then start the server
WORKDIR /app/backend
CMD ["sh", "-c", "node src/scripts/setup.js && npm start"]
