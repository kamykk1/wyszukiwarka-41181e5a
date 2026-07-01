#!/usr/bin/env bash
# ==============================================================================
# SmartPrice / netszukacz.pl — automatyczny installer VPS (kroki 1–7)
# ==============================================================================
# Automatyzuje:
#   1. Wymagania systemowe (weryfikacja OS)
#   2. Instalacja Docker, Node.js, Nginx, Certbot, Git, Supabase CLI
#   3. Instalacja Supabase self-hosted (docker compose)
#   4. Migracje bazy danych (wszystkie pliki z supabase/migrations/)
#   5. Wdrożenie Edge Functions (przez supabase CLI)
#   6. Konfiguracja sekretów (interaktywnie)
#   7. Budowa i wdrożenie frontendu do /var/www/smartprice
#
# Użycie:
#   sudo bash install.sh                  # instalacja pełna, interaktywna
#   sudo bash install.sh --non-interactive # użyj wartości z .env.install
#   sudo bash install.sh --skip-supabase   # pomiń kroki 3–5 (masz już Supabase)
#   sudo bash install.sh --only-frontend   # tylko krok 7
#
# UWAGA: krok 8 (Nginx), 9 (SSL) i 10 (weryfikacja) NIE są w tym skrypcie —
# zobacz VPS_INSTALLATION_GUIDE.md. Można je odpalić przez configure_nginx().
# ==============================================================================

set -Eeuo pipefail

# ---------- Kolory ------------------------------------------------------------
readonly C_RED=$'\033[0;31m'
readonly C_GREEN=$'\033[0;32m'
readonly C_YELLOW=$'\033[1;33m'
readonly C_BLUE=$'\033[0;34m'
readonly C_NC=$'\033[0m'

log()      { echo -e "${C_BLUE}[$(date +%H:%M:%S)]${C_NC} $*"; }
success()  { echo -e "${C_GREEN}[✓]${C_NC} $*"; }
warn()     { echo -e "${C_YELLOW}[!]${C_NC} $*"; }
error()    { echo -e "${C_RED}[✗]${C_NC} $*" >&2; }
die()      { error "$*"; exit 1; }

# ---------- Konfiguracja ------------------------------------------------------
readonly REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly SUPABASE_DIR="/opt/supabase"
readonly FRONTEND_DIR="/var/www/smartprice"
readonly ENV_FILE="${REPO_ROOT}/.env.install"

INTERACTIVE=1
SKIP_SUPABASE=0
ONLY_FRONTEND=0
SKIP_APT=0

for arg in "$@"; do
  case "$arg" in
    --non-interactive)  INTERACTIVE=0 ;;
    --skip-supabase)    SKIP_SUPABASE=1 ;;
    --only-frontend)    ONLY_FRONTEND=1 ;;
    --skip-apt)         SKIP_APT=1 ;;
    -h|--help)
      grep -E '^#( |$)' "$0" | sed 's/^# \{0,1\}//'
      exit 0 ;;
    *) die "Nieznany argument: $arg" ;;
  esac
done

# ---------- Sprawdzenie roota -------------------------------------------------
[[ $EUID -eq 0 ]] || die "Uruchom jako root:  sudo bash install.sh"

# ---------- Wczytanie / stworzenie .env.install -------------------------------
prompt_var() {
  local var="$1" desc="$2" default="${3:-}"
  local current="${!var:-}"
  if [[ -n "$current" ]]; then return; fi
  if [[ $INTERACTIVE -eq 0 ]]; then
    [[ -n "$default" ]] || die "Brak $var w .env.install (tryb --non-interactive)"
    printf -v "$var" '%s' "$default"
    return
  fi
  local input
  if [[ -n "$default" ]]; then
    read -r -p "$desc [$default]: " input
    input="${input:-$default}"
  else
    read -r -p "$desc: " input
    [[ -n "$input" ]] || die "$var jest wymagane"
  fi
  printf -v "$var" '%s' "$input"
}

if [[ -f "$ENV_FILE" ]]; then
  log "Wczytuję konfigurację z $ENV_FILE"
  # shellcheck disable=SC1090
  source "$ENV_FILE"
fi

collect_config() {
  log "=== KONFIGURACJA ==="
  prompt_var DOMAIN               "Domena główna (np. netszukacz.pl)"
  prompt_var API_DOMAIN           "Domena API (np. api.netszukacz.pl)"          "api.${DOMAIN}"
  prompt_var ADMIN_EMAIL          "Email admina (dla SSL i SMTP)"
  prompt_var POSTGRES_PASSWORD    "Hasło PostgreSQL (min. 20 znaków)"           "$(openssl rand -base64 24 | tr -d '=+/')"
  prompt_var JWT_SECRET           "JWT_SECRET (min. 32 znaki)"                  "$(openssl rand -base64 48 | tr -d '=+/' | head -c 48)"
  prompt_var DASHBOARD_USERNAME   "Login do Supabase Studio"                    "admin"
  prompt_var DASHBOARD_PASSWORD   "Hasło do Supabase Studio"                    "$(openssl rand -base64 18 | tr -d '=+/')"
  prompt_var SMTP_HOST            "SMTP host (Enter = pomiń emaile)"            "smtp.resend.com"
  prompt_var SMTP_PORT            "SMTP port"                                   "587"
  prompt_var SMTP_USER            "SMTP user"                                   "resend"
  prompt_var SMTP_PASS            "SMTP pass (klucz Resend)"                    ""
  prompt_var SUPABASE_PROJECT_REF "Ref projektu Supabase (dla deploy functions)" "self-hosted"

  # Zapis do .env.install
  cat > "$ENV_FILE" <<EOF
DOMAIN="$DOMAIN"
API_DOMAIN="$API_DOMAIN"
ADMIN_EMAIL="$ADMIN_EMAIL"
POSTGRES_PASSWORD="$POSTGRES_PASSWORD"
JWT_SECRET="$JWT_SECRET"
DASHBOARD_USERNAME="$DASHBOARD_USERNAME"
DASHBOARD_PASSWORD="$DASHBOARD_PASSWORD"
SMTP_HOST="$SMTP_HOST"
SMTP_PORT="$SMTP_PORT"
SMTP_USER="$SMTP_USER"
SMTP_PASS="$SMTP_PASS"
SUPABASE_PROJECT_REF="$SUPABASE_PROJECT_REF"
EOF
  chmod 600 "$ENV_FILE"
  success "Konfiguracja zapisana w $ENV_FILE (uprawnienia 600)"
}

# ==============================================================================
# KROK 1: Weryfikacja systemu
# ==============================================================================
step_1_check_system() {
  log "=== KROK 1/7: Weryfikacja systemu ==="
  [[ -f /etc/os-release ]] || die "Nie wykryto /etc/os-release"
  # shellcheck disable=SC1091
  source /etc/os-release
  [[ "$ID" =~ ^(ubuntu|debian)$ ]] || warn "Testowane na Ubuntu/Debian, wykryto: $ID"

  local ram_gb
  ram_gb=$(awk '/MemTotal/ {printf "%.0f", $2/1024/1024}' /proc/meminfo)
  (( ram_gb >= 4 )) || warn "RAM: ${ram_gb} GB (zalecane min. 4 GB)"

  local disk_gb
  disk_gb=$(df -BG / | awk 'NR==2 {gsub("G",""); print $4}')
  (( disk_gb >= 20 )) || warn "Wolne miejsce: ${disk_gb} GB (zalecane min. 40 GB)"

  success "System OK (${PRETTY_NAME:-unknown}, ${ram_gb} GB RAM, ${disk_gb} GB free)"
}

# ==============================================================================
# KROK 2: Instalacja zależności
# ==============================================================================
step_2_install_deps() {
  log "=== KROK 2/7: Instalacja zależności ==="

  if [[ $SKIP_APT -eq 0 ]]; then
    export DEBIAN_FRONTEND=noninteractive
    apt-get update -qq
    apt-get install -y -qq \
      curl ca-certificates gnupg lsb-release git nginx certbot \
      python3-certbot-nginx ufw jq openssl postgresql-client
  fi

  # Docker
  if ! command -v docker &>/dev/null; then
    log "Instaluję Docker..."
    curl -fsSL https://get.docker.com | sh
    systemctl enable --now docker
  else
    success "Docker już zainstalowany: $(docker --version)"
  fi

  # Docker Compose plugin
  if ! docker compose version &>/dev/null; then
    apt-get install -y -qq docker-compose-plugin
  fi

  # Node.js 20
  if ! command -v node &>/dev/null || [[ "$(node -v | cut -d. -f1 | tr -d v)" -lt 20 ]]; then
    log "Instaluję Node.js 20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y -qq nodejs
  else
    success "Node.js już zainstalowany: $(node -v)"
  fi

  # Supabase CLI
  if ! command -v supabase &>/dev/null; then
    log "Instaluję Supabase CLI..."
    npm install -g supabase --silent
  else
    success "Supabase CLI już zainstalowany: $(supabase --version 2>&1 | head -1)"
  fi

  success "Wszystkie zależności zainstalowane"
}

# ==============================================================================
# KROK 3: Instalacja Supabase self-hosted
# ==============================================================================
step_3_install_supabase() {
  log "=== KROK 3/7: Instalacja Supabase self-hosted ==="

  if [[ ! -d "$SUPABASE_DIR" ]]; then
    log "Klonuję repozytorium Supabase do $SUPABASE_DIR..."
    git clone --depth 1 https://github.com/supabase/supabase.git "$SUPABASE_DIR"
  else
    success "Repozytorium Supabase już istnieje w $SUPABASE_DIR"
  fi

  cd "$SUPABASE_DIR/docker"
  [[ -f .env ]] || cp .env.example .env

  # Generuj klucze anon i service_role z JWT_SECRET
  log "Generuję klucze API (anon + service_role) na podstawie JWT_SECRET..."
  local anon_key service_key
  anon_key=$(node -e "
    const jwt=require('jsonwebtoken');
    console.log(jwt.sign({role:'anon',iss:'supabase',iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+60*60*24*365*10},'$JWT_SECRET'));
  " 2>/dev/null || echo "")
  service_key=$(node -e "
    const jwt=require('jsonwebtoken');
    console.log(jwt.sign({role:'service_role',iss:'supabase',iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+60*60*24*365*10},'$JWT_SECRET'));
  " 2>/dev/null || echo "")

  if [[ -z "$anon_key" ]]; then
    log "Instaluję jsonwebtoken lokalnie..."
    npm install -g jsonwebtoken --silent
    anon_key=$(node -e "const jwt=require('jsonwebtoken'); console.log(jwt.sign({role:'anon',iss:'supabase',iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+60*60*24*365*10},'$JWT_SECRET'));")
    service_key=$(node -e "const jwt=require('jsonwebtoken'); console.log(jwt.sign({role:'service_role',iss:'supabase',iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+60*60*24*365*10},'$JWT_SECRET'));")
  fi

  # Zaktualizuj .env Supabase
  sed -i "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=$POSTGRES_PASSWORD|" .env
  sed -i "s|^JWT_SECRET=.*|JWT_SECRET=$JWT_SECRET|" .env
  sed -i "s|^ANON_KEY=.*|ANON_KEY=$anon_key|" .env
  sed -i "s|^SERVICE_ROLE_KEY=.*|SERVICE_ROLE_KEY=$service_key|" .env
  sed -i "s|^DASHBOARD_USERNAME=.*|DASHBOARD_USERNAME=$DASHBOARD_USERNAME|" .env
  sed -i "s|^DASHBOARD_PASSWORD=.*|DASHBOARD_PASSWORD=$DASHBOARD_PASSWORD|" .env
  sed -i "s|^SITE_URL=.*|SITE_URL=https://$DOMAIN|" .env
  sed -i "s|^API_EXTERNAL_URL=.*|API_EXTERNAL_URL=https://$API_DOMAIN|" .env
  sed -i "s|^SUPABASE_PUBLIC_URL=.*|SUPABASE_PUBLIC_URL=https://$API_DOMAIN|" .env
  if [[ -n "${SMTP_PASS:-}" ]]; then
    sed -i "s|^SMTP_HOST=.*|SMTP_HOST=$SMTP_HOST|" .env
    sed -i "s|^SMTP_PORT=.*|SMTP_PORT=$SMTP_PORT|" .env
    sed -i "s|^SMTP_USER=.*|SMTP_USER=$SMTP_USER|" .env
    sed -i "s|^SMTP_PASS=.*|SMTP_PASS=$SMTP_PASS|" .env
    sed -i "s|^SMTP_ADMIN_EMAIL=.*|SMTP_ADMIN_EMAIL=$ADMIN_EMAIL|" .env
    sed -i "s|^SMTP_SENDER_NAME=.*|SMTP_SENDER_NAME=SmartPrice|" .env
  fi

  # Zapisz klucze do .env.install (potrzebne dla frontendu)
  {
    echo "SUPABASE_ANON_KEY=\"$anon_key\""
    echo "SUPABASE_SERVICE_ROLE_KEY=\"$service_key\""
    echo "SUPABASE_URL=\"https://$API_DOMAIN\""
  } >> "$ENV_FILE"

  log "Uruchamiam kontenery Supabase..."
  docker compose pull -q
  docker compose up -d

  log "Czekam aż PostgreSQL będzie gotowy..."
  for i in {1..60}; do
    if docker compose exec -T db pg_isready -U postgres &>/dev/null; then
      success "PostgreSQL gotowy"
      break
    fi
    sleep 2
    [[ $i -eq 60 ]] && die "PostgreSQL nie wystartował w 120s"
  done

  cd "$REPO_ROOT"
  success "Supabase uruchomiony (Studio: http://$(hostname -I | awk '{print $1}'):8000)"
}

# ==============================================================================
# KROK 4: Migracje bazy danych
# ==============================================================================
step_4_run_migrations() {
  log "=== KROK 4/7: Migracje bazy danych ==="

  local db_url="postgresql://postgres:${POSTGRES_PASSWORD}@localhost:5432/postgres"
  local migrations_dir="${REPO_ROOT}/supabase/migrations"

  [[ -d "$migrations_dir" ]] || die "Brak katalogu $migrations_dir"

  local count=0 failed=0
  for f in "$migrations_dir"/*.sql; do
    [[ -f "$f" ]] || continue
    local name; name=$(basename "$f")
    log "Wykonuję migrację: $name"
    if PGPASSWORD="$POSTGRES_PASSWORD" psql "$db_url" -v ON_ERROR_STOP=1 -q -f "$f" &>/tmp/migration.log; then
      ((count++))
    else
      ((failed++))
      warn "Migracja $name nie powiodła się:"
      tail -20 /tmp/migration.log
    fi
  done

  success "Wykonano $count migracji ($failed błędów)"
  [[ $failed -eq 0 ]] || warn "Sprawdź /tmp/migration.log dla szczegółów błędów"
}

# ==============================================================================
# KROK 5: Wdrożenie Edge Functions
# ==============================================================================
step_5_deploy_functions() {
  log "=== KROK 5/7: Wdrożenie Edge Functions ==="

  local functions_dir="${REPO_ROOT}/supabase/functions"
  [[ -d "$functions_dir" ]] || { warn "Brak katalogu functions/, pomijam"; return; }

  cd "$REPO_ROOT"
  local deployed=0
  for dir in "$functions_dir"/*/; do
    [[ -d "$dir" ]] || continue
    local name; name=$(basename "$dir")
    log "Deploy: $name"
    if supabase functions deploy "$name" --project-ref "$SUPABASE_PROJECT_REF" --no-verify-jwt &>/tmp/deploy.log; then
      ((deployed++))
    else
      warn "Deploy $name nie powiódł się (może być OK jeśli używasz Docker functions runtime)"
    fi
  done
  success "Wdrożono $deployed Edge Functions"
}

# ==============================================================================
# KROK 6: Konfiguracja sekretów
# ==============================================================================
step_6_configure_secrets() {
  log "=== KROK 6/7: Konfiguracja sekretów ==="

  cat <<EOF

${C_YELLOW}Ustaw ręcznie następujące sekrety w Supabase Dashboard lub przez CLI:${C_NC}

  supabase secrets set RESEND_API_KEY=re_xxx --project-ref $SUPABASE_PROJECT_REF
  supabase secrets set TRADEDOUBLER_TOKEN=xxx --project-ref $SUPABASE_PROJECT_REF
  supabase secrets set TRADEDOUBLER_WEBHOOK_SECRET=xxx --project-ref $SUPABASE_PROJECT_REF
  supabase secrets set TRADEDOUBLER_CLIENT_ID=xxx --project-ref $SUPABASE_PROJECT_REF
  supabase secrets set TRADEDOUBLER_CLIENT_SECRET=xxx --project-ref $SUPABASE_PROJECT_REF
  supabase secrets set TRADEDOUBLER_USERNAME=xxx --project-ref $SUPABASE_PROJECT_REF
  supabase secrets set TRADEDOUBLER_PASSWORD=xxx --project-ref $SUPABASE_PROJECT_REF
  supabase secrets set CRON_SECRET=\$(openssl rand -hex 32) --project-ref $SUPABASE_PROJECT_REF

${C_YELLOW}Opcjonalne (jeśli używasz partnerów zewnętrznych):${C_NC}
  ALLEGRO_CLIENT_ID, ALLEGRO_CLIENT_SECRET
  ALIEXPRESS_APP_KEY, ALIEXPRESS_APP_SECRET, ALIEXPRESS_TRACKING_ID
  AMAZON_ACCESS_KEY, AMAZON_SECRET_KEY, AMAZON_ASSOCIATE_TAG

EOF
  success "Instrukcje wyświetlone (pomiń jeśli już masz)"
}

# ==============================================================================
# KROK 7: Frontend
# ==============================================================================
step_7_build_frontend() {
  log "=== KROK 7/7: Budowa i wdrożenie frontendu ==="

  cd "$REPO_ROOT"

  # .env dla Vite
  cat > .env <<EOF
VITE_SUPABASE_URL=https://${API_DOMAIN}
VITE_SUPABASE_PUBLISHABLE_KEY=${SUPABASE_ANON_KEY:-<UZUPEŁNIJ>}
VITE_SUPABASE_PROJECT_ID=${SUPABASE_PROJECT_REF}
EOF
  chmod 600 .env

  log "Instaluję zależności npm..."
  npm ci --silent || npm install --silent

  log "Buduję aplikację produkcyjną..."
  npm run build

  log "Kopiuję pliki do $FRONTEND_DIR..."
  mkdir -p "$FRONTEND_DIR"
  rm -rf "${FRONTEND_DIR:?}"/*
  cp -r dist/* "$FRONTEND_DIR/"
  chown -R www-data:www-data "$FRONTEND_DIR"

  success "Frontend wdrożony w $FRONTEND_DIR"
}

# ==============================================================================
# BONUS: Nginx (nie w krokach 1-7, ale przydatne)
# ==============================================================================
configure_nginx() {
  log "=== BONUS: Konfiguracja Nginx ==="

  cat > /etc/nginx/sites-available/smartprice <<EOF
server {
    listen 80;
    server_name ${DOMAIN} www.${DOMAIN};
    root ${FRONTEND_DIR};
    index index.html;

    gzip on;
    gzip_types text/plain text/css application/json application/javascript image/svg+xml;

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
}
EOF

  cat > /etc/nginx/sites-available/supabase-api <<EOF
server {
    listen 80;
    server_name ${API_DOMAIN};

    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
EOF

  ln -sf /etc/nginx/sites-available/smartprice /etc/nginx/sites-enabled/
  ln -sf /etc/nginx/sites-available/supabase-api /etc/nginx/sites-enabled/
  rm -f /etc/nginx/sites-enabled/default

  nginx -t && systemctl reload nginx
  success "Nginx skonfigurowany (uruchom certbot ręcznie dla SSL)"
}

# ==============================================================================
# MAIN
# ==============================================================================
main() {
  echo ""
  echo "╔══════════════════════════════════════════════════════════════╗"
  echo "║   SmartPrice / netszukacz.pl — VPS Installer (kroki 1-7)     ║"
  echo "╚══════════════════════════════════════════════════════════════╝"
  echo ""

  collect_config

  if [[ $ONLY_FRONTEND -eq 1 ]]; then
    step_7_build_frontend
    exit 0
  fi

  step_1_check_system
  step_2_install_deps

  if [[ $SKIP_SUPABASE -eq 0 ]]; then
    step_3_install_supabase
    step_4_run_migrations
    step_5_deploy_functions
  fi

  step_6_configure_secrets
  step_7_build_frontend

  # Nginx opcjonalnie
  if [[ $INTERACTIVE -eq 1 ]]; then
    read -r -p "Skonfigurować teraz Nginx (kroki 8-9)? [t/N]: " ans
    [[ "$ans" =~ ^[tTyY] ]] && configure_nginx
  fi

  echo ""
  success "═══ INSTALACJA ZAKOŃCZONA ═══"
  echo ""
  cat <<EOF
${C_GREEN}Co dalej:${C_NC}
  1. Skonfiguruj DNS: A ${DOMAIN} → $(hostname -I | awk '{print $1}')
                       A ${API_DOMAIN} → $(hostname -I | awk '{print $1}')
  2. Uruchom Certbot dla SSL:
       certbot --nginx -d ${DOMAIN} -d www.${DOMAIN} -d ${API_DOMAIN} -m ${ADMIN_EMAIL} --agree-tos -n
  3. Ustaw sekrety Edge Functions (patrz krok 6 powyżej)
  4. Otwórz https://${DOMAIN} w przeglądarce
  5. Supabase Studio: http://$(hostname -I | awk '{print $1}'):8000
     login: ${DASHBOARD_USERNAME} / hasło: (patrz .env.install)

${C_YELLOW}Backup .env.install w bezpiecznym miejscu — zawiera hasła i klucze!${C_NC}
EOF
}

main "$@"
