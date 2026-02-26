# NetSzukacz — Wtyczka Chrome

## Instalacja (tryb deweloperski)

1. Otwórz Chrome i przejdź do `chrome://extensions/`
2. Włącz **Tryb dewelopera** (przełącznik w prawym górnym rogu)
3. Kliknij **Załaduj rozpakowane** i wskaż folder `chrome-extension/`
4. Wtyczka pojawi się na pasku narzędzi

## Struktura plików

```
chrome-extension/
├── manifest.json      # Manifest V3 — uprawnienia, konfiguracja
├── background.js      # Service Worker — komunikacja z API NetSzukacz
├── content.js         # Content Script — wykrywanie produktów na stronach sklepów
├── content.css        # Style banera z tańszą ofertą
├── popup.html         # Interfejs popup po kliknięciu ikony
├── popup.js           # Logika popup — wyszukiwarka i wyniki
├── icons/             # Ikony wtyczki (16, 48, 128px)
│   ├── icon-16.png
│   ├── icon-48.png
│   └── icon-128.png
└── README.md          # Ten plik
```

## Obsługiwane sklepy

- Allegro.pl
- Ceneo.pl
- MediaExpert.pl
- Euro.com.pl
- Morele.net
- X-Kom.pl
- MediaMarkt.pl
- Empik.com
- Amazon.pl
- OleOle.pl

## Jak działa

1. **Content Script** automatycznie wykrywa nazwę i cenę produktu na obsługiwanych stronach
2. Wysyła zapytanie do API NetSzukacz (Tradedoubler Products)
3. Jeśli znajdzie tańszą ofertę — wyświetla **baner** w rogu strony
4. Kliknięcie ikony wtyczki otwiera **popup** z pełną listą ofert
5. Linki „Kup z cashback" zawierają parametr afiliacyjny do naliczania punktów

## Dodawanie nowych sklepów

Edytuj obiekt `STORE_SELECTORS` w pliku `content.js`:

```js
"example.pl": {
  name: "h1.product-title",   // selektor CSS nazwy produktu
  price: ".product-price",     // selektor CSS ceny
},
```

## Publikacja w Chrome Web Store

1. Utwórz konto deweloperskie: https://chrome.google.com/webstore/devconsole (jednorazowa opłata $5)
2. Przygotuj ikony 16×16, 48×48, 128×128 px w folderze `icons/`
3. Spakuj folder `chrome-extension/` do pliku ZIP
4. Załaduj ZIP w panelu Chrome Web Store
5. Wypełnij opis, screenshoty i wyślij do weryfikacji (1-3 dni)
