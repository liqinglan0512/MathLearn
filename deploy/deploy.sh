#!/usr/bin/env bash
#
# MathForge deployment — Ubuntu 22.04 + nginx, static single-page app.
#
# Run this ON the server, as root:
#
#     bash deploy.sh
#
# It is idempotent: running it again redeploys the current main branch.
# It installs Node.js 22 (Vite 7 requires ^20.19.0 or >=22.12.0) and nginx,
# builds from source, and publishes the build to /var/www/mathforge.
#
# It does NOT configure TLS. See docs/DEPLOYMENT.md for the certbot step.

set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/liqinglan0512/MathLearn.git}"
BRANCH="${BRANCH:-main}"
SRC_DIR="${SRC_DIR:-/opt/mathforge}"
WEB_ROOT="${WEB_ROOT:-/var/www/mathforge}"
SITE_NAME="mathforge"

log() { printf '\n\033[1;34m==>\033[0m %s\n' "$*"; }
die() { printf '\n\033[1;31mERROR:\033[0m %s\n' "$*" >&2; exit 1; }

[ "$(id -u)" -eq 0 ] || die "run as root (sudo bash deploy.sh)"

# --- 1. System packages -----------------------------------------------------
log "Installing system packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq curl git nginx ca-certificates

# --- 2. Node.js 22 ----------------------------------------------------------
need_node=1
if command -v node >/dev/null 2>&1; then
    major="$(node -p 'process.versions.node.split(".")[0]')"
    minor="$(node -p 'process.versions.node.split(".")[1]')"
    if [ "$major" -gt 22 ] || { [ "$major" -eq 22 ] && [ "$minor" -ge 12 ]; }; then
        need_node=0
    elif [ "$major" -eq 20 ] && [ "$minor" -ge 19 ]; then
        need_node=0
    fi
fi

if [ "$need_node" -eq 1 ]; then
    log "Installing Node.js 22"
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
    apt-get install -y -qq nodejs
else
    log "Node.js $(node -v) already satisfies Vite 7"
fi

command -v npm >/dev/null 2>&1 || die "npm not found after Node install"

# --- 3. Source --------------------------------------------------------------
if [ -d "$SRC_DIR/.git" ]; then
    log "Updating existing checkout at $SRC_DIR"
    git -C "$SRC_DIR" remote set-url origin "$REPO_URL"
    git -C "$SRC_DIR" fetch --depth 1 origin "$BRANCH"
    git -C "$SRC_DIR" checkout -B "$BRANCH" "origin/$BRANCH"
else
    log "Cloning $REPO_URL ($BRANCH) into $SRC_DIR"
    rm -rf "$SRC_DIR"
    git clone --depth 1 --branch "$BRANCH" "$REPO_URL" "$SRC_DIR"
fi

DEPLOYED_COMMIT="$(git -C "$SRC_DIR" rev-parse HEAD)"

# --- 4. Build ---------------------------------------------------------------
log "Installing dependencies (npm ci)"
cd "$SRC_DIR"
npm ci --no-audit --no-fund

log "Building production bundle"
npm run build

[ -f "$SRC_DIR/dist/index.html" ] || die "build produced no dist/index.html"

# --- 5. Publish -------------------------------------------------------------
# Build into a staging path, then swap, so a failed build never leaves the
# site half-written.
log "Publishing to $WEB_ROOT"
rm -rf "${WEB_ROOT}.new"
mkdir -p "${WEB_ROOT}.new"
cp -a "$SRC_DIR/dist/." "${WEB_ROOT}.new/"

rm -rf "${WEB_ROOT}.old"
[ -d "$WEB_ROOT" ] && mv "$WEB_ROOT" "${WEB_ROOT}.old"
mv "${WEB_ROOT}.new" "$WEB_ROOT"
rm -rf "${WEB_ROOT}.old"

chown -R www-data:www-data "$WEB_ROOT"
find "$WEB_ROOT" -type d -exec chmod 755 {} +
find "$WEB_ROOT" -type f -exec chmod 644 {} +

# --- 6. nginx ---------------------------------------------------------------
log "Configuring nginx"
cp "$SRC_DIR/deploy/nginx-mathforge.conf" "/etc/nginx/sites-available/$SITE_NAME"
ln -sf "/etc/nginx/sites-available/$SITE_NAME" "/etc/nginx/sites-enabled/$SITE_NAME"
rm -f /etc/nginx/sites-enabled/default

nginx -t || die "nginx config test failed; site NOT reloaded"
systemctl enable nginx >/dev/null 2>&1 || true
systemctl reload nginx || systemctl restart nginx

# --- 7. Verify --------------------------------------------------------------
log "Verifying"
sleep 1
code="$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1/)"
[ "$code" = "200" ] || die "homepage returned HTTP $code"

deep="$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1/principles)"
[ "$deep" = "200" ] || die "SPA fallback broken: /principles returned HTTP $deep"

curl -s http://127.0.0.1/ | grep -q '<div id="root">' || die "index.html missing app root"

printf '\n\033[1;32mMathForge deployed.\033[0m\n'
printf '  commit    : %s\n' "$DEPLOYED_COMMIT"
printf '  web root  : %s\n' "$WEB_ROOT"
printf '  homepage  : HTTP %s\n' "$code"
printf '  deep link : HTTP %s\n' "$deep"
printf '\nNext: point DNS at this host, then enable TLS (see docs/DEPLOYMENT.md).\n'
