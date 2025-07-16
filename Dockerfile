# Use Node.js base image
FROM node:18

# Install yt-dlp and ffmpeg
RUN apt-get update && \
    apt-get install -y ffmpeg python3 python3-pip && \
    pip3 install yt-dlp

# Create app directory
WORKDIR /app

# Copy files
COPY . .

# Install dependencies
RUN npm install

# Build Next.js app
RUN npm run build

# Expose port
EXPOSE 3000

# Start the server
CMD ["npm", "start"]
