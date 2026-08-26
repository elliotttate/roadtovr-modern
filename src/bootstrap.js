(() => {
  "use strict";

  const root = document.documentElement;
  root.classList.add("rtvrx-booting");

  chrome.storage.sync.get({ enabled: true })
    .then(({ enabled }) => {
      if (enabled) return;
      root.classList.add("rtvrx-disabled");
      root.classList.remove("rtvrx-booting");
    })
    .catch(() => {
      root.classList.add("rtvrx-passthrough");
      root.classList.remove("rtvrx-booting");
    });
})();
