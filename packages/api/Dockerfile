FROM node:20-slim AS builder
WORKDIR /app
COPY package.json ./
RUN npm install
COPY tsconfig.json ./
COPY drizzle.config.ts ./
COPY plutus.json ./
COPY src ./src
RUN npm run build

FROM node:20-slim
RUN groupadd -g 1001 appgroup && useradd -u 1001 -g appgroup -m appuser
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/plutus.json ./
USER appuser
EXPOSE 3000
CMD ["node", "dist/server.js"]
