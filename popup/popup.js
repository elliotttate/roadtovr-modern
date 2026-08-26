const DEFAULTS = {
  enabled: true,
  theme: "system",
  fontScale: 1,
  readingWidth: 720,
};

const elements = {
  enabled: document.querySelector("#enabled"),
  theme: document.querySelector("#theme"),
  fontScale: document.querySelector("#fontScale"),
  readingWidth: document.querySelector("#readingWidth"),
  fontOutput: document.querySelector("#fontOutput"),
  widthOutput: document.querySelector("#widthOutput"),
  savedCount: document.querySelector("#savedCount"),
  clearSaved: document.querySelector("#clearSaved"),
};

function updateOutputs() {
  elements.fontOutput.value = `${Math.round(Number(elements.fontScale.value) * 100)}%`;
  elements.widthOutput.value = `${elements.readingWidth.value}px`;
}

async function initialize() {
  const settings = await chrome.storage.sync.get(DEFAULTS);
  elements.enabled.checked = settings.enabled;
  elements.theme.value = settings.theme;
  elements.fontScale.value = settings.fontScale;
  elements.readingWidth.value = settings.readingWidth;
  updateOutputs();

  const { savedStories = [] } = await chrome.storage.local.get({ savedStories: [] });
  elements.savedCount.textContent = savedStories.length;
}

for (const key of ["enabled", "theme", "fontScale", "readingWidth"]) {
  elements[key].addEventListener("input", async () => {
    const value = key === "enabled"
      ? elements[key].checked
      : key === "fontScale" || key === "readingWidth"
        ? Number(elements[key].value)
        : elements[key].value;

    await chrome.storage.sync.set({ [key]: value });
    updateOutputs();
  });
}

elements.clearSaved.addEventListener("click", async () => {
  await chrome.storage.local.set({ savedStories: [] });
  elements.savedCount.textContent = "0";
});

initialize();
