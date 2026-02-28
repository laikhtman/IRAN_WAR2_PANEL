#!/bin/bash
# ============================================================================
# Iran War Panel — Database Setup Script
#
# Creates the PostgreSQL database and applies the schema.
# Run once on your production/dev server.
#
# Usage:
#   chmod +x db/setup.sh
#   ./db/setup.sh
#
# Prerequisites:
#   - PostgreSQL 15+ installed and running
#   - psql available on PATH
#   - Superuser or createdb privileges
# ============================================================================

set -e

DB_NAME="${DB_NAME:-war_panel}"
DB_USER="${DB_USER:-war_panel_user}"
DB_PASSWORD="${DB_PASSWORD:-$(openssl rand -hex 24)}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"

echo "=== Iran War Panel — Database Setup ==="
echo ""
echo "Database: $DB_NAME"
echo "User:     $DB_USER"
echo "Host:     $DB_HOST:$DB_PORT"
echo ""

# Create user if not exists
echo "[1/3] Creating database user '$DB_USER'..."
psql -h "$DB_HOST" -p "$DB_PORT" -U postgres -tc \
  "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'" | grep -q 1 \
  || psql -h "$DB_HOST" -p "$DB_PORT" -U postgres -c \
  "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';"

# Create database if not exists
echo "[2/3] Creating database '$DB_NAME'..."
psql -h "$DB_HOST" -p "$DB_PORT" -U postgres -tc \
  "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" | grep -q 1 \
  || psql -h "$DB_HOST" -p "$DB_PORT" -U postgres -c \
  "CREATE DATABASE $DB_NAME OWNER $DB_USER;"

# Grant privileges
psql -h "$DB_HOST" -p "$DB_PORT" -U postgres -c \
  "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"

# Apply schema
echo "[3/3] Applying schema..."
PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
  -f "$(dirname "$0")/schema.sql"

echo ""
echo "=== Setup Complete ==="
echo ""
echo "Connection string (add to .env):"
echo "  DATABASE_URL=postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME"
echo ""
echo "Or use Drizzle to push schema instead:"
echo "  DATABASE_URL=postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME npm run db:push"
echo ""
