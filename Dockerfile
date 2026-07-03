# Image multi-étages de Globe Actu.
# Deux cibles finales (voir docker-compose.yml) :
#   - "worker" : dépendances complètes + sources TS, pour `prisma migrate deploy` et `npm run ingest`.
#   - "runner" : sortie standalone de Next.js, image minimale qui sert l'application web.
# Base Debian slim (et non Alpine) : les moteurs Prisma détectent nativement debian-openssl-3.0.x.

FROM node:22-slim AS deps
RUN apt-get update -y \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
# Le schéma doit être présent avant `npm ci` : le postinstall de @prisma/client lance `prisma generate`.
COPY prisma ./prisma
RUN npm ci

FROM deps AS worker
COPY . .
CMD ["npm", "run", "ingest"]

FROM worker AS builder
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:22-slim AS runner
RUN apt-get update -y \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
EXPOSE 3000
CMD ["node", "server.js"]
