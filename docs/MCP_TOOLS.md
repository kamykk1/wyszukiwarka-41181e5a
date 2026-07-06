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

### 3. `my_points` – moje punkty *(wymaga OAuth)*
Saldo, suma zdobytych punktów, seria dni aktywności i 10 ostatnich transakcji.
Brak argumentów.

### 4. `my_favorites` – moje ulubione oferty *(wymaga OAuth)*

| Argument | Typ | Opis |
|---|---|---|
| `limit` | 1–100 | Domyślnie 25. |
| `offset` | ≥0 | Domyślnie 0. |
| `sort` | `newest` \| `oldest` | Domyślnie `newest`. |

### 5. `my_redemptions` – moja historia wymian nagród *(wymaga OAuth)*

| Argument | Typ | Opis |
|---|---|---|
| `status` | `pending`/`processing`/`shipped`/`completed`/`cancelled` | Filtr statusu. |
| `limit` | 1–100 | Domyślnie 25. |
| `offset` | ≥0 | Domyślnie 0. |

Zwraca listę wymian ze złączeniem nagrody (`reward: { id, name, points_cost, image_url }`).

---

## Bezpieczeństwo

- Każde wywołanie tokenizowane bearerem OAuth zweryfikowanym względem
  Supabase Auth (issuer + JWKS).
- Odczyty przez klient Supabase z nagłówkiem `Authorization: Bearer <token>`
  – obowiązują wszystkie polityki RLS (`auth.uid()`).
- Serwer nigdy nie zwraca tokenu, nie loguje go i nie zapisuje po żądaniu.
