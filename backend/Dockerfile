FROM node:18-alpine AS frontend-builder

WORKDIR /frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

FROM node:18-alpine AS backend-runtime

WORKDIR /app

COPY backend/package*.json ./
RUN npm ci --omit=dev

COPY backend/ ./
COPY database/ ./database
COPY --from=frontend-builder /frontend/dist ./public

EXPOSE 3000

CMD ["node", "src/app.js"]
