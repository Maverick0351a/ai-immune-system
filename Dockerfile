FROM node:20-slim AS builder
WORKDIR /app
COPY package.json package-lock.json* pnpm-lock.yaml* .npmrc* ./
RUN npm ci
COPY tsconfig.json ./
COPY tsup.config.ts ./
COPY src ./src
RUN npm run build

FROM node:20-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json* pnpm-lock.yaml* .npmrc* ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
# Optional schema file (embedded already) for reference
COPY src/db/schema.sql ./dist/db/schema.sql
EXPOSE 8088
HEALTHCHECK --interval=30s --timeout=3s --retries=3 CMD node -e "fetch('http://127.0.0.1:8088/healthz').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["node", "dist/server.js"]
