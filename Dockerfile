# Base image with Node.js and Python (for yt-dlp)
FROM node:20-slim

# Set working directory
WORKDIR /app

# Install dependencies (ffmpeg + Python + yt-dlp)
RUN apt-get update && \
    apt-get install -y ffmpeg python3 python3-pip curl && \
    pip3 install yt-dlp && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Copy package files and install Node.js dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the application
COPY . .

# Build the Next.js app
RUN npm run build

# Expose the app port
EXPOSE 3000

# Start the Next.js server
CMD ["npm", "start"]
