#!/bin/sh
set -eu

fail() {
  echo "ERROR: $1" >&2
  exit 1
}

env_value() {
  file="$1"
  key="$2"
  sed -n "s/^${key}=//p" "$file" | tail -n 1
}

require_env() {
  file="$1"
  key="$2"
  value="$(env_value "$file" "$key")"
  [ -n "$value" ] || fail "$key is missing or empty in $file."
}

command -v docker >/dev/null 2>&1 || fail "Docker is not installed."
docker compose version >/dev/null 2>&1 || fail "Docker Compose plugin is not installed."

for file in .env backend/.env ai_agent/.env; do
  [ -f "$file" ] || fail "Missing $file. Copy it from the matching .env.example file."
done

if grep -R -E '(^|=)(replace-me|replace-with-|your-email|your-app-password)' \
  .env backend/.env ai_agent/.env >/dev/null 2>&1; then
  fail "One or more environment files still contain placeholder values."
fi

site_address="$(sed -n 's/^SITE_ADDRESS=//p' .env | tail -n 1)"
frontend_url="$(sed -n 's/^FRONTEND_URL=//p' .env | tail -n 1)"
public_api="$(sed -n 's/^APP_PUBLIC_BASE_URL=//p' .env | tail -n 1)"
mongo_user="$(sed -n 's/^MONGO_ROOT_USERNAME=//p' .env | tail -n 1)"
mongo_password="$(sed -n 's/^MONGO_ROOT_PASSWORD=//p' .env | tail -n 1)"

[ -n "$site_address" ] || fail "SITE_ADDRESS is missing from .env."
[ -n "$frontend_url" ] || fail "FRONTEND_URL is missing from .env."
[ -n "$public_api" ] || fail "APP_PUBLIC_BASE_URL is missing from .env."
[ -n "$mongo_user" ] || fail "MONGO_ROOT_USERNAME is missing from .env."
[ -n "$mongo_password" ] || fail "MONGO_ROOT_PASSWORD is missing from .env."
[ "${#mongo_password}" -ge 24 ] || fail "MONGO_ROOT_PASSWORD must be at least 24 characters."

case "$mongo_user$mongo_password" in
  *[!A-Za-z0-9_.~-]*)
    fail "Mongo credentials must only contain URL-safe characters: A-Z, a-z, 0-9, _, ., ~ and -."
    ;;
esac

case "$site_address" in
  http://localhost|localhost) ;;
  http://*) fail "Production SITE_ADDRESS must use automatic HTTPS: set it to your domain without http://." ;;
esac

for key in \
  JWT_SECRET MAIL_USERNAME MAIL_PASSWORD GOOGLE_CLIENT_ID GOOGLE_CLIENT_SECRET \
  OPENAI_API_KEY CLOUDINARY_CLOUD_NAME CLOUDINARY_API_KEY CLOUDINARY_API_SECRET \
  ADMIN_EMAIL ADMIN_PASSWORD
do
  require_env backend/.env "$key"
done

require_env ai_agent/.env OPENAI_API_KEY

jwt_secret="$(env_value backend/.env JWT_SECRET)"
admin_password="$(env_value backend/.env ADMIN_PASSWORD)"
[ "${#jwt_secret}" -ge 32 ] || fail "JWT_SECRET must be at least 32 characters."
[ "${#admin_password}" -ge 12 ] || fail "ADMIN_PASSWORD must be at least 12 characters."

docker compose config --quiet
docker compose up -d --build --wait --wait-timeout 600
docker compose ps

echo
echo "Deployment started successfully."
echo "Follow startup logs with: docker compose logs -f"
