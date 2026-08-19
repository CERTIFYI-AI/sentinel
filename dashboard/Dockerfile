FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --frozen-lockfile
COPY . .
RUN npm run build

FROM nginx:alpine
RUN adduser -D -H -u 1001 -s /sbin/nologin appuser && \
    chown -R appuser:appuser /var/cache/nginx /var/log/nginx && \
    sed -i 's/listen\s*80;/listen 8080;/' /etc/nginx/conf.d/default.conf && \
    touch /var/run/nginx.pid && chown appuser:appuser /var/run/nginx.pid
COPY --from=builder --chown=appuser:appuser /app/dist /usr/share/nginx/html
COPY --chown=appuser:appuser nginx.conf /etc/nginx/conf.d/default.conf
USER appuser
EXPOSE 8080
