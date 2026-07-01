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
FROM node:18-bullseye-slim
WORKDIR /app

# Install Python3, pip, and ML dependencies for .h5 model predictions
# Kami menambahkan parameter khusus agar pip tidak memunculkan peringatan
RUN apt-get update && apt-get install -y python3 python3-pip \
    && pip3 install --no-cache-dir tensorflow numpy pandas h5py scikit-learn \
    && rm -rf /var/lib/apt/lists/*

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