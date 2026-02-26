// ============================================================
// NetSzukacz Chrome Extension — Background Service Worker
// ============================================================

const API_BASE = "https://rsfieaipypagioylevbp.supabase.co/functions/v1";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJzZmllYWlweXBhZ2lveWxldmJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2NjY4NzMsImV4cCI6MjA4NjI0Mjg3M30.jSWFy1LoKw1hSBnsNQaLx_ud-rYyV0Frc1R3mCV--OA";

// Search for products via the tradedoubler-products edge function
async function searchProducts(query) {
  try {
    const res = await fetch(
      `${API_BASE}/tradedoubler-products?q=${encodeURIComponent(query)}&pageSize=10`,
      { headers: { apikey: ANON_KEY } }
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return { success: true, products: data.products || [], total: data.total || 0 };
  } catch (err) {
    console.error("[NetSzukacz] Search error:", err);
    return { success: false, products: [], total: 0, error: err.message };
  }
}

// Build affiliate URL with user tracking
function buildAffiliateUrl(baseUrl, email) {
  if (!baseUrl) return baseUrl;
  try {
    const url = new URL(baseUrl);
    if (email) url.searchParams.set("epi1", email);
    return url.toString();
  } catch {
    return email
      ? `${baseUrl}${baseUrl.includes("?") ? "&" : "?"}epi1=${encodeURIComponent(email)}`
      : baseUrl;
  }
}

// Listen for messages from content script and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "SEARCH_PRODUCTS") {
    searchProducts(message.query).then(sendResponse);
    return true; // keep channel open for async response
  }

  if (message.type === "BUILD_AFFILIATE_URL") {
    chrome.storage.sync.get(["userEmail"], (result) => {
      const url = buildAffiliateUrl(message.url, result.userEmail);
      sendResponse({ url });
    });
    return true;
  }

  if (message.type === "GET_USER") {
    chrome.storage.sync.get(["userEmail", "userName"], sendResponse);
    return true;
  }

  if (message.type === "SET_USER") {
    chrome.storage.sync.set(
      { userEmail: message.email, userName: message.name },
      () => sendResponse({ success: true })
    );
    return true;
  }

  if (message.type === "LOGOUT") {
    chrome.storage.sync.remove(["userEmail", "userName"], () =>
      sendResponse({ success: true })
    );
    return true;
  }
});

console.log("[NetSzukacz] Background service worker loaded");
