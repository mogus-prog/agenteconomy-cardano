FROM node:20-slim
WORKDIR /app
COPY package.json ./
RUN npm install --production=false
COPY tsconfig.json ./
COPY drizzle.config.ts ./
COPY plutus.json ./
COPY src ./src
RUN npm run build
RUN groupadd -g 1001 appgroup && useradd -u 1001 -g appgroup -m appuser
USER appuser
EXPOSE 3000
CMD ["node", "dist/server.js"]
