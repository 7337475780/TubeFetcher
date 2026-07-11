FROM node:20-bookworm-slim

# Set working directory
WORKDIR /app

# Install ffmpeg and python3 (Debian Bookworm provides Python 3.11, which yt-dlp requires)
RUN apt-get update && \
    apt-get install -y ffmpeg python3 curl && \
    rm -rf /var/lib/apt/lists/*

# Install yt-dlp globally
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp && \
    chmod a+rx /usr/local/bin/yt-dlp

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Build the Next.js app
RUN npm run build

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
