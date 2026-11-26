FROM node:22-alpine AS frontend-builder

WORKDIR /frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

FROM node:22-alpine AS backend-runtime

RUN apk upgrade --no-cache

WORKDIR /app

COPY backend/package*.json ./
RUN npm ci --omit=dev \
    && npm uninstall -g npm \
    && rm -f /usr/local/bin/npm /usr/local/bin/npx

COPY backend/ ./
COPY database/ ./database
COPY --from=frontend-builder /frontend/dist ./public

RUN mkdir -p /app/debug-emails \
    && chown node:node /app /app/debug-emails

USER node

EXPOSE 3000

CMD ["node", "src/app.js"]
