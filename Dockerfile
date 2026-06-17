# ============================================================
# Stage 1: Build Frontend
# ============================================================
FROM node:20-slim AS frontend-builder

WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ============================================================
# Stage 2: Python Runtime
# ============================================================
FROM python:3.12-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Install PyTorch CPU (smaller than full CUDA version)
RUN pip install --no-cache-dir \
    torch torchvision --index-url https://download.pytorch.org/whl/cpu

# Install other Python dependencies
COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy backend source code
COPY backend/ ./backend/

# Copy built frontend from stage 1
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Pre-download ResNet50 weights during build (cached in image)
RUN python -c "import torchvision; torchvision.models.resnet50(weights=torchvision.models.ResNet50_Weights.IMAGENET1K_V2)"

# Create data directories
RUN mkdir -p /app/backend/data /app/backend/uploads/library

# Expose port
EXPOSE 8000

# Set working directory to backend
WORKDIR /app/backend

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/api/stats')" || exit 1

# Start the server
CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
