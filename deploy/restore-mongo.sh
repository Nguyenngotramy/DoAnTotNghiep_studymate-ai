#!/bin/sh
set -eu

[ "$#" -eq 1 ] || {
  echo "Usage: $0 backups/studymate-YYYYMMDDTHHMMSSZ.archive.gz" >&2
  exit 1
}

backup_file="$1"
[ -f "$backup_file" ] || {
  echo "Backup not found: $backup_file" >&2
  exit 1
}

docker compose exec -T mongodb sh -c '
  mongorestore \
    --username "$MONGO_INITDB_ROOT_USERNAME" \
    --password "$MONGO_INITDB_ROOT_PASSWORD" \
    --authenticationDatabase admin \
    --db studymate \
    --archive \
    --gzip
' < "$backup_file"
