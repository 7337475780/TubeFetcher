# -------- Stage 1: Base with Python, ffmpeg, yt-dlp -------- #
FROM python:3.11-slim AS yt-base

RUN apt-get update && \
    apt-get install -y --no-install-recommends ffmpeg curl ca-certificates && \
    pip install --no-cache-dir yt-dlp && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# -------- Stage 2: Final image with Node.js and yt-dlp -------- #
FROM node:20-slim

# ✅ Install ffmpeg AND ca-certificates in final image
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    ca-certificates \
 && rm -rf /var/lib/apt/lists/*

# ✅ Copy yt-dlp and dependencies
COPY --from=yt-base /usr/local /usr/local
COPY --from=yt-base /usr/lib /usr/lib
COPY --from=yt-base /usr/bin/ffmpeg /usr/bin/ffmpeg
COPY --from=yt-base /usr/local/bin/yt-dlp /usr/bin/yt-dlp

WORKDIR /app

# Copy and install dependencies
COPY package*.json ./
RUN npm install

# Copy rest of the code
COPY . .

# Build Next.js
RUN npm run build

# Expose port for Railway
EXPOSE 3000

# ✅ Use production start command
CMD ["npm", "start"]
