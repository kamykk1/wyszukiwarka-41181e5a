# SmartPrice — Porównywarka cen z systemem lojalnościowym

## Opis projektu

SmartPrice to aplikacja webowa do porównywania cen produktów z różnych sklepów internetowych, wzbogacona o system punktów lojalnościowych, nagrody, mailing oraz panel administracyjny.

## Wymagania

- **Node.js** 18+ (zalecane 20+)
- **npm** lub **bun**
- **Konto Supabase** (lub Lovable Cloud)

## Instalacja lokalna

```bash
# 1. Sklonuj repozytorium
git clone <URL_REPOZYTORIUM>
cd smartprice

# 2. Zainstaluj zależności
npm install

# 3. Skonfiguruj zmienne środowiskowe
#    Utwórz plik .env w katalogu głównym:
cp .env.example .env

# 4. Uzupełnij .env:
#    VITE_SUPABASE_URL=https://<twoj-projekt>.supabase.co
#    VITE_SUPABASE_PUBLISHABLE_KEY=<twoj-anon-key>

# 5. Uruchom serwer deweloperski
npm run dev
```

Aplikacja będzie dostępna pod adresem `http://localhost:5173`.

## Konfiguracja Supabase

### 1. Utwórz projekt Supabase
Zarejestruj się na [supabase.com](https://supabase.com) i utwórz nowy projekt.

### 2. Uruchom migracje
Wszystkie migracje SQL znajdują się w katalogu `supabase/migrations/`. Wykonaj je po kolei w edytorze SQL w panelu Supabase.

### 3. Skonfiguruj sekrety Edge Functions
W ustawieniach projektu Supabase dodaj następujące sekrety:
- `RESEND_API_KEY` — klucz API z [resend.com](https://resend.com) (do wysyłki emaili)

### 4. Wdróż Edge Functions
```bash
# Zainstaluj Supabase CLI
npm install -g supabase

# Zaloguj się
supabase login

# Połącz z projektem
supabase link --project-ref <twoj-project-id>

# Wdróż funkcje
supabase functions deploy send-mailing
supabase functions deploy send-notifications
supabase functions deploy admin-users
supabase functions deploy confirm-purchase
```

## Struktura projektu

```
src/
├── components/          # Komponenty React
│   ├── admin/           # Panel administracyjny
│   │   ├── AdminUsers.tsx
│   │   ├── AdminStores.tsx
│   │   ├── AdminRewards.tsx
│   │   ├── AdminRedemptions.tsx
│   │   └── AdminMailing.tsx
│   ├── ui/              # Komponenty shadcn/ui
│   └── ...
├── contexts/            # Context API (AuthContext)
├── hooks/               # Custom hooks
├── pages/               # Strony aplikacji
├── integrations/        # Konfiguracja Supabase
└── data/                # Dane mockowe

supabase/
├── functions/           # Edge Functions
│   ├── admin-users/     # Zarządzanie użytkownikami
│   ├── confirm-purchase/# API potwierdzenia zakupu
│   ├── send-mailing/    # Wysyłka mailingu
│   └── send-notifications/ # Powiadomienia
├── migrations/          # Migracje SQL
└── config.toml          # Konfiguracja
```

## Funkcjonalności

### Dla użytkowników
- 🔍 Porównywanie cen produktów
- ❤️ Ulubione produkty
- 🔔 Alerty cenowe
- 🎁 System punktów lojalnościowych
- 🏆 Ranking użytkowników
- 📬 Powiadomienia email

### Panel administracyjny (`/admin`)
- 👥 Zarządzanie użytkownikami (edycja danych, korekta punktów)
- 🏪 Konfiguracja sklepów i kluczy API
- 🎁 Zarządzanie nagrodami
- 📦 Obsługa zamówień (statusy: oczekuje, opłacone, zaakceptowane, odrzucone)
- ✉️ System mailingowy HTML z podglądem i statystykami

### API dla sklepów
Sklepy mogą automatycznie przyznawać punkty za zakupy:

```bash
curl -X POST https://<supabase-url>/functions/v1/confirm-purchase \
  -H "Content-Type: application/json" \
  -H "x-api-key: <klucz-api-sklepu>" \
  -d '{
    "user_email": "user@example.com",
    "product_name": "Nazwa produktu",
    "store_name": "Nazwa sklepu"
  }'
```

## Technologie

- **Frontend**: React 18, TypeScript, Vite
- **UI**: Tailwind CSS, shadcn/ui
- **Backend**: Supabase (PostgreSQL, Auth, Edge Functions)
- **Email**: Resend API
- **State**: TanStack Query, React Context

## Build produkcyjny

```bash
npm run build
```

Pliki wyjściowe znajdą się w katalogu `dist/`.

## Licencja

Projekt prywatny. Wszelkie prawa zastrzeżone.
