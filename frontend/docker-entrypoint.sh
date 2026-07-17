#!/bin/sh
set -e

# Generate self-signed SSL certs if missing
if [ ! -f /etc/nginx/certs/cert.pem ] || [ ! -f /etc/nginx/certs/key.pem ]; then
  mkdir -p /etc/nginx/certs
  openssl req -x509 -newkey rsa:4096 -keyout /etc/nginx/certs/key.pem \
    -out /etc/nginx/certs/cert.pem -days 730 -nodes \
    -subj "/CN=192.168.55.155" \
    -addext "subjectAltName=DNS:localhost,IP:192.168.55.155,IP:127.0.0.1" 2>/dev/null
  echo "Self-signed SSL certs generated in /etc/nginx/certs/"
fi

exec "$@"
