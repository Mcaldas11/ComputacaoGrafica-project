// redirect.js — moved from index.html to keep scripts in JS files
// Redirect to menu.html only when there is no hash (so index.html#start still works)
(function () {
  try {
    if (!window.location.hash || window.location.hash === "") {
      // Use replace so the menu becomes the first page (back won't return to index)
      window.location.replace('menu.html');
    }
  } catch (e) {
    // If any error occurs, log but don't block the page.
    console.error('Redirect check failed', e);
  }
})();
