## Cel

Zbudować jednolity system wyszukiwania ofert z wielu partnerów. Wszystkie oferty (Allegro, AliExpress, Amazon, Temu przez Tradedoubler) sprowadzone do wspólnego schematu, prezentowane na `/search` posortowane od najniższej ceny końcowej (cena – szacowany cashback).

## Krok 0 — Skan bezpieczeństwa (baseline)

Uruchamiam `security--run_security_scan` zanim dotknę kodu, żeby mieć punkt odniesienia. Wynik raportuję krótko.

## Krok 1 — Znormalizowany schemat oferty

Wspólny typ TS + tabela cache w bazie:

```text
NormalizedOffer {
  id, partner_id, external_id,
  title, image_url, product_url (afiliacyjny),
  price, currency, shipping_price, price_total,
  cashback_rate, cashback_amount, price_effective,
  rating, reviews_count, category, brand,
  fetched_at
}
```

Tabela `offers_cache` (partner_id, external_id UNIQUE) — TTL 30 min, do szybkiego sortowania i deduplikacji między partnerami po tytule + cenie.

## Krok 2 — Adaptery partnerów (Edge Functions)

Jedna funkcja routująca `search-offers` + osobne moduły adapterów. Każdy adapter ma sygnaturę `search(query, opts) => NormalizedOffer[]`.

- **allegro-adapter** — mock (brak kluczy). Struktura zgodna z Allegro REST `/offers/listing`, gotowa do podpięcia `ALLEGRO_CLIENT_ID/SECRET` (OAuth client_credentials).
- **aliexpress-adapter** — mock. Struktura zgodna z AliExpress Affiliate `aliexpress.affiliate.product.query`, gotowa do `ALIEXPRESS_APP_KEY/SECRET/TRACKING_ID`.
- **amazon-adapter** — mock. Struktura zgodna z PA-API 5 `SearchItems`, gotowa do `AMAZON_ACCESS_KEY/SECRET/ASSOCIATE_TAG/REGION`.
- **temu-adapter** — realny, przez istniejącą integrację Tradedoubler (filtrujemy `tradedoubler_programs` po nazwie/kategorii Temu i, jeśli aktywne, używamy `tradedoubler-products` do zapytań produktowych).

Mocki zwracają realistyczne dane oparte na query (2–5 ofert na partnera z sensownymi cenami), żeby UI i sortowanie były testowalne od razu. Podmiana na prawdziwe API = wstawienie kluczy + odkomentowanie fetcha w adapterze.

Wszystkie adaptery: równoległe `Promise.allSettled`, timeout 5 s per partner, błąd jednego nie ubija zapytania. Wyniki zapisywane do `offers_cache`.

## Krok 3 — Endpoint `search-offers`

`POST /functions/v1/search-offers { query, category?, limit? }` → `{ offers: NormalizedOffer[], partners: {id, status, count, latency_ms}[] }`.

- Rate limit 30 req/min per IP (jak w `tradedoubler-products`).
- Walidacja Zod (query 2–100 znaków).
- Wzbogaca każdą ofertę: liczy `cashback_amount` = `price_total * cashback_rate/100`, `price_effective` = `price_total - cashback_amount`, dokleja `epi1=<email>` do `product_url` jeśli user zalogowany.
- Sortowanie domyślne: `price_effective ASC`.

## Krok 4 — UI: `/search`

Zastępuję obecną stronę wyszukiwarki jednolitym widokiem ofert:

- Pasek: query + kategoria + sortowanie (Najniższa cena końcowa / Najniższa cena / Cashback % / Ocena).
- Filtry boczne: partnerzy (checkboxy), zakres ceny, min. ocena.
- Karta oferty: zdjęcie, tytuł, badge partnera, cena, „−X zł cashback → Y zł efektywnie”, przycisk „Przejdź do sklepu” (rejestruje `award_click_points`).
- Status pasek: „Allegro ✓ 12 · AliExpress ✓ 8 · Amazon ⚠ timeout · Temu ✓ 3”.
- Stan pusty, skeletony, obsługa błędów — po polsku.
- Zachowuję istniejące programy partnerskie z `tradedoubler_programs` jako sekcję „Programy partnerskie” pod ofertami (żeby nie stracić obecnej funkcjonalności).

## Krok 5 — Skan bezpieczeństwa (po zmianach)

Po wdrożeniu ponownie `security--run_security_scan`. Naprawiam wszystko co dotyczy nowej tabeli i funkcji (RLS, GRANT, walidacja inputu). Raportuję różnicę względem baseline.

## Szczegóły techniczne

- Migracja: `offers_cache` z RLS `SELECT` dla `authenticated` + `anon` (dane publiczne z API partnerów), zapis tylko przez `service_role` z edge function. GRANT-y zgodnie z regułami projektu.
- Sekrety do podpięcia później (nie proszę teraz): `ALLEGRO_CLIENT_ID`, `ALLEGRO_CLIENT_SECRET`, `ALIEXPRESS_APP_KEY`, `ALIEXPRESS_APP_SECRET`, `ALIEXPRESS_TRACKING_ID`, `AMAZON_ACCESS_KEY`, `AMAZON_SECRET_KEY`, `AMAZON_ASSOCIATE_TAG`, `AMAZON_REGION`.
- Każdy adapter w osobnym pliku w `supabase/functions/search-offers/adapters/` — łatwa podmiana mocka na real.
- Frontend: nowy hook `useOfferSearch(query)` w `src/hooks/`, komponenty `OfferCard`, `OfferFilters`, `PartnerStatusBar` w `src/components/search/`.

## Czego NIE robię

- Nie proszę teraz o klucze API — dostaniesz jasną instrukcję gdzie je wygenerować i który sekret dodać, gdy zechcesz włączyć realne dane.
- Nie zmieniam obecnej integracji Tradedoubler (cashback, callback, programy) — tylko konsumuję ją jako źródło ofert Temu.
- Nie ruszam koła fortuny, streaków, poziomów.
