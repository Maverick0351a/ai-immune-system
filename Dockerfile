FROM node:20-slim
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json* pnpm-lock.yaml* .npmrc* ./
RUN npm i --omit=dev || true
COPY tsconfig.json .
COPY src ./src
COPY .env.example .
RUN npm run build && mkdir -p dist/db && cp src/db/schema.sql dist/db/schema.sql || true
EXPOSE 8088
CMD ["node", "dist/server.js"]
