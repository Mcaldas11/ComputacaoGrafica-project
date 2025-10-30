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
