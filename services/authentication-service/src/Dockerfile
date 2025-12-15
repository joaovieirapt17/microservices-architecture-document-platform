FROM node:20-alpine

WORKDIR /app

# Copy package files from root directory
COPY package*.json ./

# Install dependencies
RUN npm install --only=production

# Copy source files
COPY src/ ./src/

# Expose port
EXPOSE 3000

# Start application
CMD ["node", "src/index.js"]
