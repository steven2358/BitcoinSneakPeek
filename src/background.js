// Background service worker for Bitcoin Sneak Peek
// Handles API calls to avoid CORS issues in content scripts

importScripts('providers.js');

// Simple rate limiter: max 1 request per address per 3 seconds
const rateLimitCache = new Map();
const RATE_LIMIT_MS = 3000;

function isRateLimited(address) {
  const lastRequest = rateLimitCache.get(address);
  if (lastRequest && Date.now() - lastRequest < RATE_LIMIT_MS) {
    return true;
  }
  rateLimitCache.set(address, Date.now());
  return false;
}

// Clean up old rate limit entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [address, time] of rateLimitCache.entries()) {
    if (now - time > RATE_LIMIT_MS * 6) {
      rateLimitCache.delete(address);
    }
  }
}, 60000);

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'fetchBalance') {
    const address = request.address;
    const skipCount = request.skipCount || 0;
    console.log('[BitcoinSneakPeek] Received request for:', address, skipCount ? `(skipping ${skipCount} providers)` : '');

    if (isRateLimited(address)) {
      console.log('[BitcoinSneakPeek] Rate limited:', address);
      sendResponse({
        success: false,
        error: 'Rate limited. Please wait a few seconds.'
      });
      return true;
    }

    fetchBalanceWithFallback(address, skipCount)
      .then(sendResponse)
      .catch(error => {
        console.error('[BitcoinSneakPeek] Unexpected error:', error);
        sendResponse({ success: false, error: error.message });
      });

    return true; // Required for async sendResponse
  }
});
