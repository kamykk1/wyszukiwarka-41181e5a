# 📦 Instrukcja instalacji SmartPrice na serwerze VPS

Kompletna instrukcja wdrożenia aplikacji SmartPrice (frontend + baza danych + Edge Functions) na własnym serwerze VPS.

---

## Spis treści

1. [Wymagania systemowe](#1-wymagania-systemowe)
2. [Przygotowanie serwera VPS](#2-przygotowanie-serwera-vps)
3. [Instalacja Supabase (self-hosted)](#3-instalacja-supabase-self-hosted)
4. [Konfiguracja bazy danych — migracje](#4-konfiguracja-bazy-danych--migracje)
5. [Wdrożenie Edge Functions](#5-wdrożenie-edge-functions)
6. [Konfiguracja sekretów](#6-konfiguracja-sekretów)
7. [Budowanie i wdrożenie frontendu](#7-budowanie-i-wdrożenie-frontendu)
8. [Konfiguracja Nginx (reverse proxy + SPA)](#8-konfiguracja-nginx-reverse-proxy--spa)
9. [Certyfikat SSL (Let's Encrypt)](#9-certyfikat-ssl-lets-encrypt)
10. [Weryfikacja wdrożenia](#10-weryfikacja-wdrożenia)
11. [Aktualizacje i utrzymanie](#11-aktualizacje-i-utrzymanie)

---

## 1. Wymagania systemowe

| Komponent     | Minimum            | Zalecane           |
|---------------|--------------------|--------------------|
| **CPU**       | 2 vCPU             | 4 vCPU             |
| **RAM**       | 4 GB               | 8 GB               |
| **Dysk**      | 40 GB SSD          | 80 GB SSD          |
| **System**    | Ubuntu 22.04 LTS   | Ubuntu 24.04 LTS   |
| **Domena**    | Wymagana           | Z DNS skonfigurowanym |

### Oprogramowanie wymagane na serwerze:
- Docker ≥ 24.0 + Docker Compose ≥ 2.20
- Node.js ≥ 18 (zalecane 20+)
- npm lub bun
- Git
- Nginx
- Certbot (dla SSL)

---

## 2. Przygotowanie serwera VPS

```bash
# Aktualizacja systemu
sudo apt update && sudo apt upgrade -y

# Zainstaluj Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
newgrp docker

# Zainstaluj Docker Compose (jeśli nie jest w zestawie)
sudo apt install docker-compose-plugin -y

# Zainstaluj Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Zainstaluj Nginx i Certbot
sudo apt install -y nginx certbot python3-certbot-nginx

# Zainstaluj Git
sudo apt install -y git

# Zainstaluj Supabase CLI
npm install -g supabase
```

---

## 3. Instalacja Supabase (self-hosted)

Supabase self-hosted uruchamia PostgreSQL, GoTrue (Auth), PostgREST, Storage i inne usługi w kontenerach Docker.

```bash
# Sklonuj oficjalne repozytorium Supabase
cd /opt
sudo git clone --depth 1 https://github.com/supabase/supabase.git
cd supabase/docker

# Skopiuj konfigurację
cp .env.example .env
```

### Edytuj plik `/opt/supabase/docker/.env`:

```bash
nano .env
```

**Krytyczne zmienne do ustawienia:**

```env
############
# Secrets — ZMIEŃ WSZYSTKIE PONIŻSZE NA UNIKALNE WARTOŚCI!
############

# Klucz JWT — wygeneruj losowy ciąg min. 32 znaki
JWT_SECRET=twoj-super-tajny-jwt-secret-minimum-32-znaki

# Hasło do bazy PostgreSQL
POSTGRES_PASSWORD=twoje-silne-haslo-do-bazy

# URL Twojej domeny
SITE_URL=https://twoja-domena.pl
API_EXTERNAL_URL=https://api.twoja-domena.pl

# Dashboard
DASHBOARD_USERNAME=admin
DASHBOARD_PASSWORD=twoje-haslo-do-panelu

# SMTP (do wysyłki emaili weryfikacyjnych)
SMTP_HOST=smtp.twoj-dostawca.pl
SMTP_PORT=587
SMTP_USER=twoj@email.pl
SMTP_PASS=haslo-smtp
SMTP_SENDER_NAME=SmartPrice
SMTP_ADMIN_EMAIL=admin@twoja-domena.pl
```

### Wygeneruj klucze `anon` i `service_role`:

```bash
# Zainstaluj narzędzie do generowania kluczy JWT
npm install -g jsonwebtoken

# Lub użyj strony: https://supabase.com/docs/guides/self-hosting/docker#generate-api-keys
# Wygeneruj anon key i service_role key na podstawie Twojego JWT_SECRET
```

Alternatywnie użyj narzędzia online: https://supabase.com/docs/guides/self-hosting/docker#api-keys

### Uruchom Supabase:

```bash
cd /opt/supabase/docker
docker compose up -d

# Sprawdź status
docker compose ps
```

Supabase Studio będzie dostępne pod `http://TWOJ_IP:8000`.

---

## 4. Konfiguracja bazy danych — migracje

### Opcja A: Przez Supabase CLI (zalecane)

```bash
# Sklonuj repozytorium aplikacji
cd /home/$USER
git clone <URL_REPOZYTORIUM_SMARTPRICE> smartprice
cd smartprice

# Połącz z lokalną instancją Supabase
# Edytuj supabase/config.toml jeśli potrzebne

# Uruchom migracje
supabase db push --db-url postgresql://postgres:TWOJE_HASLO@localhost:5432/postgres
```

### Opcja B: Ręcznie przez psql

```bash
# Połącz się z bazą
docker exec -it supabase-db psql -U postgres

# Lub z zewnątrz:
psql postgresql://postgres:TWOJE_HASLO@localhost:5432/postgres
```

Wykonaj migracje **PO KOLEI** z katalogu `supabase/migrations/`:

```bash
# Lista plików migracji (w kolejności chronologicznej):
ls -1 supabase/migrations/

# Wykonaj każdy plik:
for f in supabase/migrations/*.sql; do
  echo "Executing $f..."
  psql postgresql://postgres:TWOJE_HASLO@localhost:5432/postgres -f "$f"
done
```

### Lista migracji do wykonania (60 plików):

Pliki w katalogu `supabase/migrations/` tworzą:
- Tabele: `profiles`, `user_roles`, `user_points`, `points_transactions`, `click_points_log`, `favorites`, `price_alerts`, `stores`, `rewards`, `reward_redemptions`, `reward_settings`, `referral_codes`, `referrals`, `mailing_campaigns`, `mailing_clicks`, `notification_log`, `page_settings`, `wheel_prizes`, `wheel_spins`, `partner_integrations`, `partner_tasks`, `financial_products`, `email_templates`, `user_streaks`, `tradedoubler_programs`
- Widoki: `leaderboard`, `stores_public`, `partner_integrations_public`
- Funkcje RPC: `award_click_points`, `award_purchase_points`, `redeem_reward`, `spin_wheel`, `check_daily_streak`, `admin_add_points`, `process_referral`, `get_or_create_referral_code`, `award_partner_task_points`, `award_mailing_click_points`, `has_role`, `handle_new_user`, itp.
- Polityki RLS (Row Level Security) na wszystkich tabelach
- Triggery: `handle_new_user` (tworzenie profilu po rejestracji)

### Weryfikacja:

```bash
# Sprawdź czy tabele zostały utworzone
psql postgresql://postgres:TWOJE_HASLO@localhost:5432/postgres -c "\dt public.*"

# Sprawdź funkcje
psql postgresql://postgres:TWOJE_HASLO@localhost:5432/postgres -c "\df public.*"
```

---

## 5. Wdrożenie Edge Functions

Edge Functions działają na Deno Runtime. Na self-hosted Supabase musisz je wdrożyć ręcznie.

### Lista Edge Functions do wdrożenia:

| Funkcja                   | Opis                                      |
|---------------------------|-------------------------------------------|
| `admin-partners`          | Zarządzanie partnerami (admin)            |
| `admin-stores`            | Zarządzanie sklepami (admin)              |
| `admin-users`             | Zarządzanie użytkownikami (admin)          |
| `confirm-purchase`        | API potwierdzenia zakupu (webhook)        |
| `partner-callback`        | Callback od partnerów                     |
| `send-mailing`            | Wysyłka kampanii mailingowych             |
| `send-notifications`      | Wysyłka powiadomień email                 |
| `send-test-email`         | Wysyłka testowego emaila                  |
| `tradedoubler-callback`   | Callback z Tradedoubler                   |
| `tradedoubler-products`   | Pobieranie produktów z Tradedoubler       |
| `tradedoubler-sync`       | Synchronizacja programów Tradedoubler     |

### Wdrożenie przez Supabase CLI:

```bash
cd /home/$USER/smartprice

# Wdróż wszystkie funkcje
supabase functions deploy admin-partners --project-ref <TWOJ_PROJECT_REF>
supabase functions deploy admin-stores --project-ref <TWOJ_PROJECT_REF>
supabase functions deploy admin-users --project-ref <TWOJ_PROJECT_REF>
supabase functions deploy confirm-purchase --project-ref <TWOJ_PROJECT_REF>
supabase functions deploy partner-callback --project-ref <TWOJ_PROJECT_REF>
supabase functions deploy send-mailing --project-ref <TWOJ_PROJECT_REF>
supabase functions deploy send-notifications --project-ref <TWOJ_PROJECT_REF>
supabase functions deploy send-test-email --project-ref <TWOJ_PROJECT_REF>
supabase functions deploy tradedoubler-callback --project-ref <TWOJ_PROJECT_REF>
supabase functions deploy tradedoubler-products --project-ref <TWOJ_PROJECT_REF>
supabase functions deploy tradedoubler-sync --project-ref <TWOJ_PROJECT_REF>
```

### Alternatywa: Deno Deploy lub własny Deno server

Jeśli nie chcesz używać Supabase Edge Functions, możesz uruchomić funkcje jako standalone Deno server:

```bash
# Zainstaluj Deno
curl -fsSL https://deno.land/install.sh | sh

# Uruchom funkcję lokalnie (np. do testów)
cd supabase/functions/confirm-purchase
deno run --allow-net --allow-env index.ts
```

---

## 6. Konfiguracja sekretów

### Wymagane sekrety (zmienne środowiskowe dla Edge Functions):

```bash
# Ustaw sekrety w Supabase
supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxx
supabase secrets set TRADEDOUBLER_TOKEN=twoj-token
supabase secrets set TRADEDOUBLER_WEBHOOK_SECRET=twoj-webhook-secret
supabase secrets set TRADEDOUBLER_CLIENT_ID=twoj-client-id
supabase secrets set TRADEDOUBLER_CLIENT_SECRET=twoj-client-secret
supabase secrets set TRADEDOUBLER_USERNAME=twoj-username
supabase secrets set TRADEDOUBLER_PASSWORD=twoj-password
```

### Gdzie uzyskać klucze:

| Sekret                        | Gdzie uzyskać                                         |
|-------------------------------|-------------------------------------------------------|
| `RESEND_API_KEY`              | [resend.com](https://resend.com) → API Keys           |
| `TRADEDOUBLER_TOKEN`          | Panel Tradedoubler → API Settings                     |
| `TRADEDOUBLER_WEBHOOK_SECRET` | Panel Tradedoubler → Webhooks                         |
| `TRADEDOUBLER_CLIENT_ID`      | Panel Tradedoubler → OAuth                            |
| `TRADEDOUBLER_CLIENT_SECRET`  | Panel Tradedoubler → OAuth                            |
| `TRADEDOUBLER_USERNAME`       | Twój login do Tradedoubler                            |
| `TRADEDOUBLER_PASSWORD`       | Twoje hasło do Tradedoubler                           |

---

## 7. Budowanie i wdrożenie frontendu

```bash
cd /home/$USER/smartprice

# Zainstaluj zależności
npm install

# Utwórz plik .env z URL do Twojego self-hosted Supabase
cat > .env << 'EOF'
VITE_SUPABASE_URL=https://api.twoja-domena.pl
VITE_SUPABASE_PUBLISHABLE_KEY=twoj-anon-key-wygenerowany-wczesniej
VITE_SUPABASE_PROJECT_ID=twoj-project-id
EOF

# Zbuduj aplikację produkcyjną
npm run build

# Skopiuj pliki do katalogu Nginx
sudo mkdir -p /var/www/smartprice
sudo cp -r dist/* /var/www/smartprice/
sudo chown -R www-data:www-data /var/www/smartprice
```

---

## 8. Konfiguracja Nginx (reverse proxy + SPA)

### Frontend (aplikacja SPA):

```bash
sudo nano /etc/nginx/sites-available/smartprice
```

```nginx
server {
    listen 80;
    server_name twoja-domena.pl www.twoja-domena.pl;

    root /var/www/smartprice;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript image/svg+xml;

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # SPA fallback — KLUCZOWE dla React Router
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
}
```

### Reverse proxy dla Supabase API:

```bash
sudo nano /etc/nginx/sites-available/supabase-api
```

```nginx
server {
    listen 80;
    server_name api.twoja-domena.pl;

    # Kong API Gateway (Supabase)
    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket support (realtime)
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

### Aktywuj konfiguracje:

```bash
sudo ln -s /etc/nginx/sites-available/smartprice /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/supabase-api /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default

# Testuj konfigurację
sudo nginx -t

# Uruchom ponownie Nginx
sudo systemctl reload nginx
```

---

## 9. Certyfikat SSL (Let's Encrypt)

```bash
# Uzyskaj certyfikaty SSL
sudo certbot --nginx -d twoja-domena.pl -d www.twoja-domena.pl -d api.twoja-domena.pl

# Certbot automatycznie zaktualizuje konfigurację Nginx
# Automatyczne odnawianie:
sudo certbot renew --dry-run
```

---

## 10. Weryfikacja wdrożenia

### Checklist:

```bash
# 1. Sprawdź czy Supabase działa
curl http://localhost:8000/rest/v1/ -H "apikey: TWOJ_ANON_KEY"

# 2. Sprawdź czy frontend jest dostępny
curl -I https://twoja-domena.pl

# 3. Sprawdź czy API jest dostępne
curl https://api.twoja-domena.pl/rest/v1/stores_public -H "apikey: TWOJ_ANON_KEY"

# 4. Sprawdź kontenerey Docker
cd /opt/supabase/docker && docker compose ps

# 5. Sprawdź logi
docker compose logs -f --tail=100
```

### Testowanie:
1. Otwórz `https://twoja-domena.pl` w przeglądarce
2. Zarejestruj nowe konto (sprawdź czy email weryfikacyjny dochodzi)
3. Zaloguj się i sprawdź czy punkty się naliczają
4. Sprawdź panel admin (`/admin`)
5. Sprawdź porównywarkę produktów
6. Sprawdź koło fortuny
7. Sprawdź cashback

---

## 11. Aktualizacje i utrzymanie

### Aktualizacja frontendu:

```bash
cd /home/$USER/smartprice
git pull origin main
npm install
npm run build
sudo cp -r dist/* /var/www/smartprice/
```

### Aktualizacja Supabase:

```bash
cd /opt/supabase/docker
git pull
docker compose pull
docker compose up -d
```

### Nowe migracje bazy danych:

```bash
cd /home/$USER/smartprice
# Wykonaj nowe pliki migracji
psql postgresql://postgres:TWOJE_HASLO@localhost:5432/postgres -f supabase/migrations/NOWA_MIGRACJA.sql
```

### Backup bazy danych:

```bash
# Automatyczny backup (dodaj do crontab)
docker exec supabase-db pg_dump -U postgres postgres > /backup/smartprice_$(date +%Y%m%d_%H%M%S).sql

# Crontab (codzienny backup o 3:00)
# crontab -e
# 0 3 * * * docker exec supabase-db pg_dump -U postgres postgres > /backup/smartprice_$(date +\%Y\%m\%d).sql
```

### Monitorowanie:

```bash
# Sprawdź zużycie zasobów
docker stats

# Logi PostgreSQL
docker logs supabase-db --tail 50

# Logi Auth (GoTrue)
docker logs supabase-auth --tail 50
```

---

## 🔒 Bezpieczeństwo — ważne!

1. **Firewall**: Ogranicz dostęp do portów Docker (5432, 8000) tylko z localhost
   ```bash
   sudo ufw allow 22    # SSH
   sudo ufw allow 80    # HTTP
   sudo ufw allow 443   # HTTPS
   sudo ufw deny 5432   # PostgreSQL — nie udostępniaj publicznie!
   sudo ufw deny 8000   # Supabase — dostęp tylko przez reverse proxy
   sudo ufw enable
   ```

2. **JWT_SECRET**: Użyj minimum 32-znakowego losowego ciągu
3. **Hasło PostgreSQL**: Minimum 20 znaków, mieszane
4. **Regularnie aktualizuj** system i kontenery
5. **Backup**: Skonfiguruj automatyczne backupy bazy danych
6. **Fail2Ban**: Zainstaluj dla ochrony SSH
   ```bash
   sudo apt install fail2ban
   ```

---

## 📋 Konfiguracja DNS

W panelu Twojego dostawcy domeny dodaj rekordy:

| Typ   | Nazwa              | Wartość           | TTL  |
|-------|--------------------|-------------------|------|
| A     | twoja-domena.pl    | IP_TWOJEGO_VPS    | 3600 |
| A     | www                | IP_TWOJEGO_VPS    | 3600 |
| A     | api                | IP_TWOJEGO_VPS    | 3600 |

---

## ❓ Rozwiązywanie problemów

| Problem                           | Rozwiązanie                                                      |
|-----------------------------------|------------------------------------------------------------------|
| Biała strona                      | Sprawdź `try_files` w Nginx (SPA routing)                        |
| 502 Bad Gateway                   | Sprawdź czy kontenery Supabase działają (`docker compose ps`)    |
| Email nie dochodzą                | Sprawdź konfigurację SMTP w `.env` Supabase                     |
| Błąd CORS                         | Dodaj swoją domenę do `ADDITIONAL_REDIRECT_URLS` w `.env`       |
| RLS blokuje zapytania             | Sprawdź klucz `anon` w `.env` frontendu                         |
| Edge Functions nie działają       | Sprawdź logi: `docker compose logs supabase-functions`           |
| Brak tabel po migracji            | Wykonaj migracje ręcznie przez psql                              |

---

*Dokument zaktualizowany: 2026-02-26*
