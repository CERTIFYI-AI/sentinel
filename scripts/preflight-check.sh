#!/bin/bash
# Sentinel AI GRC - Pre-flight environment validation.
# Run before docker-compose up. Exits non-zero on any failure.
set -e

ERRORS=0

check() {
  NAME="$1"; RESULT="$2"; MSG="$3"
  if [ "$RESULT" != "0" ]; then
    echo "[FAIL] $NAME: $MSG"
    ERRORS=$((ERRORS + 1))
  else
    echo "[PASS] $NAME"
  fi
}

# Verify .env exists
if [ ! -f .env ]; then
  echo '[FAIL] .env file not found. Copy .env.example to .env and populate all values.'
  exit 1
fi

. ./.env

# Required vars
for VAR in POSTGRES_PASSWORD REDIS_PASSWORD GRAFANA_PASSWORD JWT_SECRET_KEY; do
  VAL="${!VAR}"
  if [ -z "$VAL" ]; then
    check "$VAR set" "1" "$VAR is not set"
  else
    check "$VAR set" "0" ""
  fi
done

# Banned weak passwords
for VAR in POSTGRES_PASSWORD REDIS_PASSWORD GRAFANA_PASSWORD; do
  VAL="${!VAR}"
  for WEAK in sentinel admin password changeme changeme 123456; do
    if [ "$VAL" = "$WEAK" ]; then
      check "$VAR not weak" "1" "$VAR must not be a well-known default value"
    fi
  done
done

# Minimum length checks
for VAR in POSTGRES_PASSWORD REDIS_PASSWORD GRAFANA_PASSWORD; do
  VAL="${!VAR}"
  LEN=$(printf '%s' "$VAL" | wc -c)
  if [ "$LEN" -lt 12 ]; then
    check "$VAR length" "1" "$VAR must be at least 12 characters (got $LEN)"
  else
    check "$VAR length" "0" ""
  fi
done

# JWT secret minimum length
JWT_LEN=$(printf '%s' "${JWT_SECRET_KEY:-}" | wc -c)
if [ "$JWT_LEN" -lt 32 ]; then
  check "JWT_SECRET_KEY length" "1" "JWT_SECRET_KEY must be at least 32 characters (got $JWT_LEN)"
else
  check "JWT_SECRET_KEY length" "0" ""
fi

# CORS must be an explicit allowlist — reject both the literal wildcard AND an
# empty value, which the app treats as a (non-credentialed) wildcard default.
if [ "${CORS_ORIGINS:-}" = "*" ] || [ -z "${CORS_ORIGINS:-}" ]; then
  check "CORS_ORIGINS is an explicit allowlist" "1" "CORS_ORIGINS must be an explicit origin list in production (not '*' or empty)"
else
  check "CORS_ORIGINS is an explicit allowlist" "0" ""
fi

if [ "$ERRORS" -gt 0 ]; then
  echo ""
  echo "Pre-flight failed with $ERRORS error(s). Resolve all issues before starting services."
  exit 1
fi

echo ""
echo "All pre-flight checks passed. Safe to start services."
