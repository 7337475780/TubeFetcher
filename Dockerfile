# Base image
FROM node:18-slim

# Install dependencies: ffmpeg, python3, pip
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    ffmpeg \
    python3 \
    python3-pip && \
    rm -rf /var/lib/apt/lists/*

# Install yt-dlp with Debian override flag
RUN pip3 install yt-dlp --break-system-packages

# Create working directory
WORKDIR /app

# Copy package files and install deps first (for better caching)
COPY package*.json ./
RUN npm install

# Copy rest of the app
COPY . .

# Build app
RUN npm run build

# Expose port
EXPOSE 3000

# Start server
CMD ["npm", "start"]
