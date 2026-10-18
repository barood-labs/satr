# Static Satr site for Cloud Run (scale-to-zero; ~5 MB image). Build context must contain public/ (scripts/build-pages.sh).
FROM nginxinc/nginx-unprivileged:1.27-alpine
COPY public/ /usr/share/nginx/html/
EXPOSE 8080
