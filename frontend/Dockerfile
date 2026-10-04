# syntax=docker/dockerfile:1

FROM node:22-alpine AS deps
WORKDIR /app
RUN chown node:node /app
USER node
COPY --chown=node:node package.json package-lock.json ./
RUN npm ci

FROM deps AS dev
COPY --chown=node:node . .
EXPOSE 5173
CMD ["npm", "run", "dev"]

FROM deps AS build
ARG VITE_API_URL=/api
ENV VITE_API_URL=${VITE_API_URL}
COPY --chown=node:node . .
RUN npm run build

FROM nginx:1.29-alpine AS prod
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
