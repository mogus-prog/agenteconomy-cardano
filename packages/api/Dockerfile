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
# Fix libsodium ESM issue: the .mjs wrapper references a sibling file
# that isn't published to npm. Patch by copying the CJS version.
RUN if [ -d node_modules/libsodium-wrappers-sumo/dist/modules-sumo-esm ] && \
    [ ! -f node_modules/libsodium-wrappers-sumo/dist/modules-sumo-esm/libsodium-sumo.mjs ]; then \
    cp node_modules/libsodium-sumo/dist/modules-sumo-esm/libsodium-sumo.mjs \
       node_modules/libsodium-wrappers-sumo/dist/modules-sumo-esm/libsodium-sumo.mjs 2>/dev/null || \
    echo "export default {};" > node_modules/libsodium-wrappers-sumo/dist/modules-sumo-esm/libsodium-sumo.mjs; \
    fi
CMD ["node", "dist/server.js"]
