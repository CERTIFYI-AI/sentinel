FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --frozen-lockfile
COPY . .
RUN npm run build

FROM nginx:alpine
RUN adduser -D -H -u 1001 -s /sbin/nologin appuser && \
    chown -R appuser:appuser /var/cache/nginx /var/log/nginx && \
    touch /var/run/nginx.pid && chown appuser:appuser /var/run/nginx.pid
# The port is set once, in nginx.conf (`listen 8080;`), which we copy over the
# stock default.conf below — appuser (uid 1001) cannot bind privileged port 80.
COPY --from=builder --chown=appuser:appuser /app/dist /usr/share/nginx/html
COPY --chown=appuser:appuser nginx.conf /etc/nginx/conf.d/default.conf
USER appuser
EXPOSE 8080
