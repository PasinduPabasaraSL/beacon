# syntax=docker/dockerfile:1

FROM node:22-alpine AS base
RUN apk add --no-cache openssl
WORKDIR /app
RUN chown node:node /app
USER node

FROM base AS deps
COPY --chown=node:node package.json package-lock.json prisma.config.ts ./
COPY --chown=node:node prisma ./prisma
RUN npm ci

FROM deps AS dev
ENV NODE_ENV=development
COPY --chown=node:node . .
EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy && npm run start:dev"]

FROM deps AS build
COPY --chown=node:node . .
RUN npx prisma generate && npm run build && npm prune --omit=dev

FROM base AS prod
ENV NODE_ENV=production
COPY --from=build /app/package.json /app/prisma.config.ts ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/dist ./dist
EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
