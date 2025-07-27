# Use official Node.js base image
FROM node:20-slim

# Set working directory
WORKDIR /app

# Install dependencies: Python, ffmpeg, pip, curl
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    ffmpeg \
    python3 \
    python3-pip \
    curl \
    ca-certificates \
    gnupg \
    && pip3 install --no-cache-dir yt-dlp \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Copy only package.json and lockfile first (for caching)
COPY package*.json ./

# Install Node.js dependencies
RUN npm install

# Copy full application
COPY . .

# Next.js standalone build
RUN npm run build

# Expose port
EXPOSE 3000

# Start app
CMD ["npm", "start"]
