# Base image
FROM node:18

# Set working directory
WORKDIR /app

# Copy files
COPY . .

# Install ffmpeg and yt-dlp (Linux)
RUN apt update && apt install -y ffmpeg curl && \
    curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp && \
    chmod +x /usr/local/bin/yt-dlp

# Install dependencies
RUN npm install

# Build app
RUN npm run build

# Start server
CMD ["npm", "start"]
