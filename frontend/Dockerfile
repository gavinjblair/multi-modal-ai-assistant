# Build stage
FROM node:20-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Runtime stage: serve static files on Railway's $PORT
FROM node:20-slim
WORKDIR /app
RUN npm i -g serve
COPY --from=build /app/dist ./dist
CMD ["sh", "-c", "serve -s dist -l $PORT"]
