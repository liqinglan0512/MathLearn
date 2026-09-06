#!/usr/bin/env bash
#
# MathForge deployment — Ubuntu, nginx, static single-page app.
#
# Run this ON the server, as root:
#
#     bash deploy.sh
#
# Idempotent: running it again redeploys the current main branch.
#
# ---------------------------------------------------------------------------
# THIS HOST IS SHARED. Read before changing anything.
#
# Ports 80 and 443 serve a DIFFERENT application (Leo Tree) via the system
# nginx. MathForge runs on its own port, MATHFORGE_PORT, default 8090.
#
# This script therefore:
#   - never writes a server block on port 80 or 443
#   - never uses `default_server`
#   - never removes or edits an nginx site it did not create
#     (in particular it does NOT delete sites-enabled/default)
#   - aborts if the target port is already served by something it does not
#     recognise as an existing MathForge deployment
#
# Overriding that last protection requires an explicit ALLOW_PORT_TAKEOVER=1.
# ---------------------------------------------------------------------------

set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/liqinglan0512/MathLearn.git}"
BRANCH="${BRANCH:-main}"
SRC_DIR="${SRC_DIR:-/opt/mathforge}"
WEB_ROOT="${WEB_ROOT:-/var/www/mathforge}"
MATHFORGE_PORT="${MATHFORGE_PORT:-8090}"
SITE_NAME="mathforge"
ALLOW_PORT_TAKEOVER="${ALLOW_PORT_TAKEOVER:-0}"

log()  { printf '\n==> %s\n' "$*"; }
warn() { printf 'WARN: %s\n' "$*"; }
die()  { printf '\nERROR: %s\n' "$*" >&2; exit 1; }

[ "$(id -u)" -eq 0 ] || die "run as root (sudo bash deploy.sh)"

case "$MATHFORGE_PORT" in
    80|443) die "refusing to deploy on port $MATHFORGE_PORT: it belongs to another application on this host" ;;
esac

# --- 0. Pre-flight: what is already running here? ---------------------------
log "Pre-flight check on port $MATHFORGE_PORT"

apt-get update -qq
apt-get install -y -qq curl git ca-certificates

existing_code="$(curl -s -m 5 -o /tmp/mf-preflight.html -w '%{http_code}' "http://127.0.0.1:${MATHFORGE_PORT}/" 2>/dev/null || echo '000')"
existing_body=""
[ -f /tmp/mf-preflight.html ] && existing_body="$(cat /tmp/mf-preflight.html)"

if [ "$existing_code" != "000" ]; then
    printf '    port %s currently answers HTTP %s\n' "$MATHFORGE_PORT" "$existing_code"
    if printf '%s' "$existing_body" | grep -q 'MathForge'; then
        printf '    it is serving MathForge already — this is an in-place upgrade\n'
    else
        printf '    it is NOT serving MathForge. Title found:\n'
        printf '%s' "$existing_body" | grep -o '<title>[^<]*</title>' | head -1 | sed 's/^/      /'
        if [ "$ALLOW_PORT_TAKEOVER" != "1" ]; then
            die "port $MATHFORGE_PORT is used by another application.
       Aborting so this deploy cannot silently take it over.
       Use a free port:  MATHFORGE_PORT=8091 bash deploy.sh
       Or if you are certain it should be replaced:
                         ALLOW_PORT_TAKEOVER=1 bash deploy.sh"
        fi
        warn "ALLOW_PORT_TAKEOVER=1 set; replacing whatever serves port $MATHFORGE_PORT"
    fi
else
    printf '    port %s is free\n' "$MATHFORGE_PORT"
fi

# Report neighbours we must not disturb.
if command -v docker >/dev/null 2>&1; then
    if docker ps --format '{{.Names}} {{.Ports}}' 2>/dev/null | grep -q ":${MATHFORGE_PORT}->"; then
        warn "a Docker container publishes port ${MATHFORGE_PORT}:"
        docker ps --format '    {{.Names}}  {{.Image}}  {{.Ports}}' 2>/dev/null | grep ":${MATHFORGE_PORT}->" || true
        warn "this script configures the SYSTEM nginx. If that container owns the port,"
        warn "the system nginx cannot bind it and this deploy will abort at nginx -t."
    fi
fi

# --- 1. nginx ---------------------------------------------------------------
if ! command -v nginx >/dev/null 2>&1; then
    log "Installing nginx"
    apt-get install -y -qq nginx
else
    log "nginx present: $(nginx -v 2>&1)"
fi

# Snapshot other enabled sites so we can prove we left them alone.
sites_before="$(ls -1 /etc/nginx/sites-enabled/ 2>/dev/null | grep -v "^${SITE_NAME}$" | sort || true)"
if [ -n "$sites_before" ]; then
    log "Other nginx sites on this host (left untouched)"
    printf '%s\n' "$sites_before" | sed 's/^/    /'
fi

# --- 2. Node.js -------------------------------------------------------------
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
    log "Installing Node.js 22 (Vite 7 needs ^20.19.0 or >=22.12.0)"
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
# Stage then swap, so a failed build never leaves the site half-written.
log "Publishing to $WEB_ROOT"
rm -rf "${WEB_ROOT}.new"
mkdir -p "${WEB_ROOT}.new"
cp -a "$SRC_DIR/dist/." "${WEB_ROOT}.new/"

rm -rf "${WEB_ROOT}.old"
[ -d "$WEB_ROOT" ] && mv "$WEB_ROOT" "${WEB_ROOT}.old"
mv "${WEB_ROOT}.new" "$WEB_ROOT"

chown -R www-data:www-data "$WEB_ROOT"
find "$WEB_ROOT" -type d -exec chmod 755 {} +
find "$WEB_ROOT" -type f -exec chmod 644 {} +

# --- 6. nginx site ----------------------------------------------------------
log "Configuring nginx site '$SITE_NAME' on port $MATHFORGE_PORT"
sed -e "s|__MATHFORGE_PORT__|${MATHFORGE_PORT}|g" \
    -e "s|__MATHFORGE_ROOT__|${WEB_ROOT}|g" \
    "$SRC_DIR/deploy/nginx-mathforge.conf" > "/etc/nginx/sites-available/$SITE_NAME"

if grep -qE '^[[:space:]]*listen[[:space:]]+(\[::\]:)?(80|443)([[:space:]]|;)' "/etc/nginx/sites-available/$SITE_NAME"; then
    die "generated config would bind port 80/443, which belongs to another app. Aborting."
fi

ln -sf "/etc/nginx/sites-available/$SITE_NAME" "/etc/nginx/sites-enabled/$SITE_NAME"

# Deliberately NOT removing sites-enabled/default or any other site.

if ! nginx -t 2>/tmp/mf-nginx-test.log; then
    cat /tmp/mf-nginx-test.log >&2
    rm -f "/etc/nginx/sites-enabled/$SITE_NAME"
    die "nginx config test failed. The MathForge site link was removed and nginx was NOT reloaded, so other sites on this host are unaffected."
fi

systemctl reload nginx || systemctl restart nginx

# --- 7. Verify --------------------------------------------------------------
log "Verifying"
sleep 1

code="$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:${MATHFORGE_PORT}/")"
[ "$code" = "200" ] || die "homepage returned HTTP $code"

deep="$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:${MATHFORGE_PORT}/principles")"
[ "$deep" = "200" ] || die "SPA fallback broken: /principles returned HTTP $deep"

curl -s "http://127.0.0.1:${MATHFORGE_PORT}/" | grep -q '<div id="root">' || die "index.html missing app root"
curl -s "http://127.0.0.1:${MATHFORGE_PORT}/" | grep -q 'MathForge' || die "served page is not MathForge"

# Confirm the neighbouring sites are still there.
sites_after="$(ls -1 /etc/nginx/sites-enabled/ 2>/dev/null | grep -v "^${SITE_NAME}$" | sort || true)"
if [ "$sites_before" != "$sites_after" ]; then
    warn "the set of other enabled nginx sites changed during this deploy:"
    printf '  before: %s\n  after : %s\n' "$sites_before" "$sites_after"
else
    printf '    other nginx sites unchanged\n'
fi

printf '\nMathForge deployed.\n'
printf '  commit    : %s\n' "$DEPLOYED_COMMIT"
printf '  port      : %s\n' "$MATHFORGE_PORT"
printf '  web root  : %s\n' "$WEB_ROOT"
printf '  homepage  : HTTP %s\n' "$code"
printf '  deep link : HTTP %s\n' "$deep"
printf '\nPorts 80/443 were not touched.\n'
