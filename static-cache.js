// PassVault Static Assets Caching
// Service Worker Registration Only

// Register Service Worker for static assets caching
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
      navigator.serviceWorker.register('./sw.js')
        .then(function(registration) {
          console.log('Static Assets ServiceWorker registration successful with scope: ', registration.scope);
        })
        .catch(function(err) {
          console.log('Static Assets ServiceWorker registration failed: ', err);
        });
    });
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  // Register service worker for static assets only
  registerServiceWorker();
});