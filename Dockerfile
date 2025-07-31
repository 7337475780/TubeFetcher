# -------- Stage 1: Base with Python, ffmpeg, yt-dlp -------- #
FROM python:3.11-slim AS yt-base

RUN apt-get update && \
    apt-get install -y --no-install-recommends ffmpeg curl ca-certificates && \
    pip install --no-cache-dir yt-dlp && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# -------- Stage 2: Final image with Node.js and yt-dlp -------- #
FROM node:20-slim

# Copy yt-dlp and ffmpeg from the previous stage
COPY --from=yt-base /usr/local /usr/local
COPY --from=yt-base /usr/lib /usr/lib
COPY --from=yt-base /bin/ffmpeg /usr/bin/ffmpeg
COPY --from=yt-base /usr/local/bin/yt-dlp /usr/bin/yt-dlp

WORKDIR /app

# Install OS tools
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./
RUN npm install

# Copy app files
COPY . .

# Build Next.js app
RUN npm run build

# Set Railway port and expose it
ENV PORT=8080
EXPOSE 8080

# Start app with standalone output
CMD ["node", ".next/standalone/server.js"]
