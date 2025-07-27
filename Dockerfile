# Use Node.js with system dependencies
FROM node:20-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && \
    apt-get install -y ffmpeg python3 python3-pip curl gnupg ca-certificates && \
    pip3 install --no-cache-dir yt-dlp && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Copy Node.js dependencies
COPY package*.json ./
RUN npm install

# Copy entire app
COPY . .

# Build the Next.js app
RUN npm run build

# Expose the Next.js server port
EXPOSE 3000

# Start the app
CMD ["npm", "start"]
