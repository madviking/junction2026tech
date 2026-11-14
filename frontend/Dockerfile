# syntax=docker/dockerfile:1
FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS dev
COPY . .
EXPOSE 5300
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

FROM deps AS build
COPY . .
RUN npm run build

FROM nginx:1.27-alpine AS production
# Rendered to /etc/nginx/conf.d/default.conf at startup with API_UPSTREAM filled in.
COPY nginx.conf /etc/nginx/templates/default.conf.template
ENV API_UPSTREAM=https://easily-smart-aphid.eur-1.aiven.app
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD wget -qO- http://localhost/ >/dev/null || exit 1
