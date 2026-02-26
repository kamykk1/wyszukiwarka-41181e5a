// ============================================================
// NetSzukacz Chrome Extension — Content Script
// Detects product name & price on supported store pages
// ============================================================

(function () {
  "use strict";

  // Store-specific selectors for product name and price
  const STORE_SELECTORS = {
    "allegro.pl": {
      name: "h1[data-testid='product-name'], h1.mgn2_14",
      price: "[data-testid='product-price'] span, .msa3_z4",
    },
    "ceneo.pl": {
      name: "h1.product-name, h1.js_product-h1-link",
      price: ".product-offer__price .price-format .price, .price-format .price",
    },
    "mediaexpert.pl": {
      name: "h1.is-title, h1[data-testid='product-title']",
      price: ".is-price .whole, .main-price .whole",
    },
    "euro.com.pl": {
      name: "h1.product-name, h1.selenium-KP-product-name",
      price: ".product-price .selenium-KP-product-price, .price-normal",
    },
    "morele.net": {
      name: "h1.prod-name",
      price: ".product-price, #product_price_brutto",
    },
    "x-kom.pl": {
      name: "h1.sc-1x6crnh-5",
      price: ".n4n86h-4, .parts__price span",
    },
    "mediamarkt.pl": {
      name: "h1[data-test='product-title']",
      price: "[data-test='product-price'], .price",
    },
    "empik.com": {
      name: "h1.product-title, h1[data-ta='product-title']",
      price: ".productPriceNew, .smartProductPrice",
    },
    "amazon.pl": {
      name: "#productTitle, h1#title span",
      price: ".a-price .a-offscreen, #priceblock_ourprice",
    },
    "oleole.pl": {
      name: "h1.product-name",
      price: ".product-price .price-normal",
    },
  };

  // Detect which store we're on
  function detectStore() {
    const hostname = window.location.hostname.replace("www.", "");
    for (const store of Object.keys(STORE_SELECTORS)) {
      if (hostname.includes(store)) return store;
    }
    return null;
  }

  // Extract text from first matching selector
  function extractText(selectors) {
    for (const selector of selectors.split(",")) {
      const el = document.querySelector(selector.trim());
      if (el) {
        const text = (el.textContent || el.innerText || "").trim();
        if (text) return text;
      }
    }
    return null;
  }

  // Parse price string to number
  function parsePrice(priceText) {
    if (!priceText) return null;
    const cleaned = priceText
      .replace(/[^\d,.\s]/g, "")
      .replace(/\s/g, "")
      .replace(",", ".");
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
  }

  // Create the NetSzukacz banner
  function createBanner(productName, currentPrice, cheaperOffers) {
    // Remove existing banner
    const existing = document.getElementById("netszukacz-banner");
    if (existing) existing.remove();

    if (!cheaperOffers || cheaperOffers.length === 0) return;

    const banner = document.createElement("div");
    banner.id = "netszukacz-banner";

    const cheapest = cheaperOffers[0];
    const savings = currentPrice && cheapest.price
      ? (currentPrice - cheapest.price).toFixed(2)
      : null;

    banner.innerHTML = `
      <div class="netszukacz-banner-inner">
        <div class="netszukacz-banner-logo">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <span class="netszukacz-banner-title">NetSzukacz</span>
        </div>
        <div class="netszukacz-banner-content">
          <span class="netszukacz-banner-text">
            ${savings && parseFloat(savings) > 0
              ? `🎉 Tańsza oferta! Zaoszczędź <strong>${savings} zł</strong> w sklepie <strong>${cheapest.store}</strong>`
              : `Znaleziono ${cheaperOffers.length} ofert w innych sklepach`
            }
          </span>
          <div class="netszukacz-banner-actions">
            <a href="#" class="netszukacz-btn netszukacz-btn-primary" data-url="${cheapest.url || ''}">
              Kup z cashback →
            </a>
            <button class="netszukacz-btn netszukacz-btn-secondary netszukacz-close">
              ✕
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(banner);

    // Handle clicks
    banner.querySelector(".netszukacz-close").addEventListener("click", () => {
      banner.classList.add("netszukacz-banner-hide");
      setTimeout(() => banner.remove(), 300);
    });

    const buyBtn = banner.querySelector("[data-url]");
    if (buyBtn) {
      buyBtn.addEventListener("click", (e) => {
        e.preventDefault();
        const baseUrl = buyBtn.dataset.url;
        if (baseUrl) {
          chrome.runtime.sendMessage(
            { type: "BUILD_AFFILIATE_URL", url: baseUrl },
            (response) => {
              window.open(response.url, "_blank");
            }
          );
        }
      });
    }

    // Animate in
    requestAnimationFrame(() => banner.classList.add("netszukacz-banner-show"));
  }

  // Main logic
  async function init() {
    const store = detectStore();
    if (!store) return;

    const selectors = STORE_SELECTORS[store];
    const productName = extractText(selectors.name);
    const priceText = extractText(selectors.price);
    const currentPrice = parsePrice(priceText);

    if (!productName) {
      console.log("[NetSzukacz] Could not detect product name on", store);
      return;
    }

    console.log(`[NetSzukacz] Detected: "${productName}" @ ${currentPrice ?? "?"} zł on ${store}`);

    // Search for alternatives
    chrome.runtime.sendMessage(
      { type: "SEARCH_PRODUCTS", query: productName },
      (response) => {
        if (!response || !response.success) return;

        const cheaper = response.products
          .filter((p) => {
            if (!p.price) return true;
            if (!currentPrice) return true;
            return p.price < currentPrice;
          })
          .sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));

        if (cheaper.length > 0) {
          createBanner(productName, currentPrice, cheaper);
        }

        // Send data to popup
        chrome.storage.local.set({
          lastProduct: {
            name: productName,
            price: currentPrice,
            store: store,
            alternatives: response.products,
            total: response.total,
            timestamp: Date.now(),
          },
        });
      }
    );
  }

  // Wait for page to settle, then run
  if (document.readyState === "complete") {
    setTimeout(init, 1500);
  } else {
    window.addEventListener("load", () => setTimeout(init, 1500));
  }
})();
