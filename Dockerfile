FROM node:20-slim

# Set working directory
WORKDIR /app

# Install dependencies for yt-dlp and ffmpeg
RUN apt-get update && \
    apt-get install -y ffmpeg python3 python3-pip curl gnupg ca-certificates && \
    pip3 install --no-cache-dir yt-dlp && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Copy package files and install Node.js dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the application
COPY . .

# Build the Next.js app
RUN npm run build

# Expose app port
EXPOSE 3000

# Start the server
CMD ["npm", "start"]
