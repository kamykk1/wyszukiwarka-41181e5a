# MCP – netszukacz.pl

Serwer MCP (Model Context Protocol) wystawiony przez tę aplikację pozwala
klientom AI (ChatGPT, Claude, Cursor, Codex, …) korzystać z wyszukiwarki ofert
i programu lojalnościowego netszukacz.pl w imieniu zalogowanego użytkownika.

## Adres serwera

```
https://rsfieaipypagioylevbp.supabase.co/functions/v1/mcp
```

Transport: **MCP Streamable HTTP** (spec 2025-06-18).

## Autoryzacja

Wszystkie narzędzia wymagają **OAuth 2.1** – klient MCP przechodzi normalny
flow autoryzacji, użytkownik loguje się do netszukacz.pl i zatwierdza dostęp
na ekranie `/.lovable/oauth/consent`.

- Issuer: `https://rsfieaipypagioylevbp.supabase.co/auth/v1`
- Discovery: `…/.well-known/openid-configuration`
- Dynamic Client Registration: włączone (klient rejestruje się sam)
- Publiczne narzędzia bez logowania: **brak** (wymagane logowanie)

## Podłączanie klientów

### ChatGPT (Custom Connectors)
1. Ustawienia → Connectors → **Add MCP server**.
2. URL: `https://rsfieaipypagioylevbp.supabase.co/functions/v1/mcp`
3. Wybierz **OAuth**; ChatGPT sam znajdzie authorization/token endpoint.
4. Zaloguj się do netszukacz.pl i zatwierdź dostęp.

### Claude (claude.ai / Claude Desktop)
Settings → Connectors → **Add custom connector** → wklej URL powyżej,
zatwierdź logowanie.

### Cursor
`~/.cursor/mcp.json`:
```json
{
  "mcpServers": {
    "netszukacz": {
      "url": "https://rsfieaipypagioylevbp.supabase.co/functions/v1/mcp"
    }
  }
}
```

### Codex CLI / dowolny klient MCP Streamable HTTP
Wskaż powyższy URL i wybierz OAuth 2.1.

---

## Narzędzia

### 1. `search_offers` – wyszukiwarka ofert
Ujednolicona wyszukiwarka ofert produktowych z partnerów (Allegro, AliExpress,
Amazon, Temu) posortowana po cenie efektywnej (cena po odjęciu cashbacku).

**Input JSON schema**
```json
{
  "type": "object",
  "properties": {
    "query":  { "type": "string", "minLength": 2, "maxLength": 100 },
    "limit":  { "type": "integer", "minimum": 1, "maximum": 50 },
    "sort":   { "type": "string", "enum": ["price_effective", "price", "cashback", "rating"] }
  },
  "required": ["query"]
}
```
**Przykład**
```json
{ "name": "search_offers", "arguments": { "query": "iPhone 15", "limit": 10, "sort": "price_effective" } }
```

### 2. `list_rewards` – katalog nagród
Aktywne nagrody dostępne za punkty; filtrowanie, sortowanie i stronicowanie.

| Argument | Typ | Opis |
|---|---|---|
| `search` | string | Fraza po nazwie (ILIKE `%…%`). |
| `in_stock_only` | boolean | Tylko z dostępnym stanem (stock > 0 lub NULL). |
| `min_points` / `max_points` | integer | Zakres kosztu w punktach. |
| `sort` | `points_asc` \| `points_desc` \| `newest` | Domyślnie `points_asc`. |
| `limit` | 1–100 | Rozmiar strony (25). |
| `offset` | ≥0 | Przesunięcie strony (0). |

**Przykład**
```json
{ "name": "list_rewards", "arguments": { "search": "voucher", "in_stock_only": true, "sort": "points_asc", "limit": 20, "offset": 0 } }
```

### 3. `reward_details` – szczegóły nagrody
Zwraca pełne szczegóły nagrody po `reward_id` (opis, koszt punktowy, dostępność,
program, przybliżoną wartość w PLN). Dla zalogowanego użytkownika dołącza saldo
punktów i flagę `can_afford`. Obsługuje błędy `not_found` i `inactive`.

**Input JSON schema**
```json
{ "type": "object", "properties": { "reward_id": { "type": "string", "format": "uuid" } }, "required": ["reward_id"] }
```

### 4. `my_points` – moje punkty *(wymaga OAuth)*
Saldo, suma zdobytych punktów, seria dni aktywności i 10 ostatnich transakcji.
Brak argumentów.

### 5. `my_favorites` – moje ulubione oferty *(wymaga OAuth)*

| Argument | Typ | Opis |
|---|---|---|
| `limit` | 1–100 | Domyślnie 25. |
| `offset` | ≥0 | Domyślnie 0. |
| `sort` | `newest` \| `oldest` | Domyślnie `newest`. |

### 6. `add_favorite` – dodaj do ulubionych *(wymaga OAuth)*
Dodaje ofertę do ulubionych. Zwraca `status: "added" | "already_exists"`
oraz od razu odświeżoną listę (`favorites`, `total`).

| Argument | Typ | Opis |
|---|---|---|
| `product_name` | string (1–500) | Identyfikator/nazwa produktu. **Wymagane**. |

### 7. `remove_favorite` – usuń z ulubionych *(wymaga OAuth)*
Usuwa ofertę po `favorite_id` (UUID rekordu) **lub** `product_name`. Zwraca
`status: "removed" | "not_found"`, liczbę usuniętych wpisów oraz odświeżoną listę.

### 8. `my_redemptions` – moja historia wymian nagród *(wymaga OAuth)*

| Argument | Typ | Opis |
|---|---|---|
| `status` | `pending`/`processing`/`shipped`/`completed`/`cancelled` | Filtr statusu. |
| `limit` | 1–100 | Domyślnie 25. |
| `offset` | ≥0 | Domyślnie 0. |

---

## Przykładowe wywołania cURL

Serwer MCP używa transportu **Streamable HTTP** (JSON-RPC 2.0). Każde żądanie
POST wymaga nagłówków `Accept: application/json, text/event-stream` oraz
`Authorization: Bearer <OAUTH_ACCESS_TOKEN>` (token uzyskany przez OAuth 2.1 od
issuera `https://rsfieaipypagioylevbp.supabase.co/auth/v1`).

```bash
export MCP_URL="https://rsfieaipypagioylevbp.supabase.co/functions/v1/mcp"
export TOKEN="<OAUTH_ACCESS_TOKEN>"
```

### Lista narzędzi
```bash
curl -sS "$MCP_URL" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

### `search_offers`
```bash
curl -sS "$MCP_URL" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call",
       "params":{"name":"search_offers",
                 "arguments":{"query":"iPhone 15","limit":10,"sort":"price_effective"}}}'
```

### `list_rewards`
```bash
curl -sS "$MCP_URL" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":3,"method":"tools/call",
       "params":{"name":"list_rewards",
                 "arguments":{"search":"voucher","in_stock_only":true,"limit":20}}}'
```

### `reward_details`
```bash
curl -sS "$MCP_URL" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":4,"method":"tools/call",
       "params":{"name":"reward_details",
                 "arguments":{"reward_id":"00000000-0000-0000-0000-000000000000"}}}'
```

### `my_points`
```bash
curl -sS "$MCP_URL" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":5,"method":"tools/call",
       "params":{"name":"my_points","arguments":{}}}'
```

### `my_favorites`
```bash
curl -sS "$MCP_URL" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":6,"method":"tools/call",
       "params":{"name":"my_favorites","arguments":{"limit":25,"sort":"newest"}}}'
```

### `add_favorite`
```bash
curl -sS "$MCP_URL" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":7,"method":"tools/call",
       "params":{"name":"add_favorite","arguments":{"product_name":"iPhone 15 128GB"}}}'
```

### `remove_favorite`
```bash
curl -sS "$MCP_URL" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":8,"method":"tools/call",
       "params":{"name":"remove_favorite","arguments":{"product_name":"iPhone 15 128GB"}}}'
```

### `my_redemptions`
```bash
curl -sS "$MCP_URL" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":9,"method":"tools/call",
       "params":{"name":"my_redemptions","arguments":{"status":"completed","limit":10}}}'
```

> **406 Not Acceptable** – brak nagłówka `Accept: application/json, text/event-stream`.
> **401 Unauthorized** – brak/nieważny `Authorization: Bearer …` (issuer musi być
> Supabase Auth projektu).

---

## Bezpieczeństwo

- Każde wywołanie tokenizowane bearerem OAuth zweryfikowanym względem
  Supabase Auth (issuer + JWKS).
- Odczyty i mutacje przez klient Supabase z nagłówkiem
  `Authorization: Bearer <token>` – obowiązują wszystkie polityki RLS
  (`auth.uid()`).
- Serwer nigdy nie zwraca tokenu, nie loguje go i nie zapisuje po żądaniu.
- Testy integracyjne narzędzi (autoryzacja + happy-path) w
  `src/lib/mcp/tools/mcp-tools.test.ts`.

