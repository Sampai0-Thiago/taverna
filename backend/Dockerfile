# ---- API Ordem do Chaos ----
FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev || npm install --omit=dev

FROM node:22-alpine
ENV NODE_ENV=production TZ=America/Sao_Paulo
RUN apk add --no-cache tzdata
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY src ./src
RUN mkdir -p uploads && chown -R node:node /app
USER node
EXPOSE 3333
HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://localhost:3333/api/health || exit 1
CMD ["node", "src/server.js"]
