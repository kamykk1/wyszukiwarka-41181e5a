// ============================================================
// NetSzukacz Chrome Extension — Popup Script
// ============================================================

const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");
const resultsContainer = document.getElementById("resultsContainer");
const currentProductEl = document.getElementById("currentProduct");
const currentNameEl = document.getElementById("currentName");
const currentPriceEl = document.getElementById("currentPrice");
const userBadge = document.getElementById("userBadge");

let currentProductData = null;

// ── Init ───────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
  // Load user
  chrome.runtime.sendMessage({ type: "GET_USER" }, (res) => {
    if (res && res.userEmail) {
      userBadge.textContent = res.userName || res.userEmail.split("@")[0];
      userBadge.title = "Kliknij, aby się wylogować";
      userBadge.onclick = handleLogout;
    } else {
      userBadge.textContent = "Zaloguj się";
      userBadge.onclick = handleLogin;
    }
  });

  // Load last detected product from content script
  chrome.storage.local.get(["lastProduct"], (result) => {
    const data = result.lastProduct;
    if (data && Date.now() - data.timestamp < 5 * 60 * 1000) {
      currentProductData = data;
      showCurrentProduct(data);
      if (data.alternatives && data.alternatives.length > 0) {
        renderResults(data.alternatives, data.price);
      }
      searchInput.value = data.name;
    }
  });
});

// ── Search ─────────────────────────────────────────────────
searchBtn.addEventListener("click", doSearch);
searchInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") doSearch();
});

async function doSearch() {
  const query = searchInput.value.trim();
  if (!query) return;

  searchBtn.disabled = true;
  searchBtn.textContent = "Szukam...";
  resultsContainer.innerHTML = `
    <div class="loading">
      <div class="spinner"></div>
      Szukam najlepszych ofert...
    </div>
  `;

  chrome.runtime.sendMessage({ type: "SEARCH_PRODUCTS", query }, (response) => {
    searchBtn.disabled = false;
    searchBtn.textContent = "Szukaj ofert";

    if (!response || !response.success) {
      resultsContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">⚠️</div>
          <div class="empty-state-text">Błąd wyszukiwania. Spróbuj ponownie.</div>
        </div>
      `;
      return;
    }

    if (response.products.length === 0) {
      resultsContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📦</div>
          <div class="empty-state-text">Brak ofert dla tego produktu</div>
        </div>
      `;
      return;
    }

    const currentPrice = currentProductData?.price || null;
    renderResults(response.products, currentPrice);
  });
}

// ── Render ──────────────────────────────────────────────────
function showCurrentProduct(data) {
  currentProductEl.style.display = "block";
  currentNameEl.textContent = data.name;
  currentPriceEl.textContent = data.price != null ? `${data.price.toFixed(2)} zł` : "Cena nieznana";
}

function renderResults(products, referencePrice) {
  const sorted = [...products].sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));

  let html = `<div class="results"><div class="results-title">Znalezione oferty (${sorted.length})</div>`;

  for (const p of sorted) {
    const savings =
      referencePrice && p.price && p.price < referencePrice
        ? (referencePrice - p.price).toFixed(2)
        : null;

    html += `
      <div class="product-card">
        ${p.image
          ? `<img src="${p.image}" alt="" />`
          : `<div style="width:48px;height:48px;border-radius:8px;background:#f1f5f9;display:flex;align-items:center;justify-content:center;font-size:20px">🛒</div>`
        }
        <div class="product-info">
          <div class="product-name">${escapeHtml(p.name)}</div>
          <div class="product-store">${escapeHtml(p.store || "")}</div>
          <div class="product-bottom">
            <div>
              ${p.price != null
                ? `<span class="product-price">${p.price.toFixed(2)} zł</span>`
                : `<span class="product-store">Sprawdź cenę</span>`
              }
              ${savings ? `<span class="product-savings">−${savings} zł</span>` : ""}
            </div>
            ${p.url
              ? `<a href="#" class="buy-btn" data-url="${escapeHtml(p.url)}">Kup z cashback</a>`
              : ""
            }
          </div>
        </div>
      </div>
    `;
  }

  html += `</div>`;
  resultsContainer.innerHTML = html;

  // Bind buy buttons
  resultsContainer.querySelectorAll(".buy-btn[data-url]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      chrome.runtime.sendMessage(
        { type: "BUILD_AFFILIATE_URL", url: btn.dataset.url },
        (response) => {
          if (response && response.url) {
            chrome.tabs.create({ url: response.url });
          }
        }
      );
    });
  });
}

// ── Auth ────────────────────────────────────────────────────
function handleLogin() {
  const email = prompt("Podaj swój e-mail z NetSzukacz.pl:");
  if (!email) return;
  chrome.runtime.sendMessage(
    { type: "SET_USER", email, name: email.split("@")[0] },
    () => {
      userBadge.textContent = email.split("@")[0];
      userBadge.onclick = handleLogout;
    }
  );
}

function handleLogout() {
  if (!confirm("Czy na pewno chcesz się wylogować?")) return;
  chrome.runtime.sendMessage({ type: "LOGOUT" }, () => {
    userBadge.textContent = "Zaloguj się";
    userBadge.onclick = handleLogin;
  });
}

// ── Utils ───────────────────────────────────────────────────
function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
