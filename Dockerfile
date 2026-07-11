FROM node:20-bookworm-slim

# Set working directory
WORKDIR /app

# Install ffmpeg, python3 (Bookworm provides Python 3.11, which yt-dlp requires), and curl
RUN apt-get update && \
    apt-get install -y ffmpeg python3 curl && \
    rm -rf /var/lib/apt/lists/*

# Install latest yt-dlp globally (Linux binary)
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp && \
    chmod a+rx /usr/local/bin/yt-dlp

# Verify installations
RUN yt-dlp --version && ffmpeg -version | head -n1 && node --version

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Build the Next.js app
RUN npm run build

# Copy standalone output and public/static assets so the server runs correctly
RUN cp -r .next/static .next/standalone/.next/static && \
    cp -r public .next/standalone/public

# Expose port
EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Start using the standalone server
CMD ["node", ".next/standalone/server.js"]
