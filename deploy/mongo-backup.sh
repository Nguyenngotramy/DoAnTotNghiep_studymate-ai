#!/bin/sh
set -eu

mkdir -p /backups

while true; do
  timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
  output="/backups/studymate-${timestamp}.archive.gz"

  mongodump \
    --host mongodb \
    --port 27017 \
    --username "${MONGO_ROOT_USERNAME}" \
    --password "${MONGO_ROOT_PASSWORD}" \
    --authenticationDatabase admin \
    --db studymate \
    --archive="${output}" \
    --gzip

  find /backups -type f -name 'studymate-*.archive.gz' \
    -mtime "+${BACKUP_RETENTION_DAYS}" -delete

  sleep "${BACKUP_INTERVAL_SECONDS}"
done
