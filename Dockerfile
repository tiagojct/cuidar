FROM node:22-alpine

WORKDIR /app

# Install deps first (cache layer)
COPY package*.json ./
RUN npm ci --omit=dev

# Copy app source
COPY src/ ./src/
COPY seeds/ ./seeds/
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

# Data directory (override with volume in production)
RUN mkdir -p /data

ENV NODE_ENV=production
ENV DB_PATH=/data/cuidar.db
ENV PORT=3000

EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
