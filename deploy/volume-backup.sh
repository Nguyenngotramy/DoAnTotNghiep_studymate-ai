#!/bin/sh
set -eu

mkdir -p /backups

while true; do
  timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
  output="/backups/files-${timestamp}.tar.gz"

  tar -czf "${output}" \
    -C /data \
    uploads \
    ai-agent-data \
    ai-agent-db

  find /backups -type f -name 'files-*.tar.gz' \
    -mtime "+${BACKUP_RETENTION_DAYS}" -delete

  sleep "${BACKUP_INTERVAL_SECONDS}"
done
