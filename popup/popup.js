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
const settingKeys = ["enabled", "theme", "fontScale", "readingWidth"];

settingKeys.forEach((key) => { elements[key].disabled = true; });

function updateOutputs() {
  elements.fontOutput.value = `${Math.round(Number(elements.fontScale.value) * 100)}%`;
  elements.widthOutput.value = `${elements.readingWidth.value}px`;
}

function settingValue(key) {
  return key === "enabled"
    ? elements[key].checked
    : key === "fontScale" || key === "readingWidth"
      ? Number(elements[key].value)
      : elements[key].value;
}

function bindSettingControls() {
  for (const key of settingKeys) {
    const eventName = key === "fontScale" || key === "readingWidth" ? "input" : "change";
    elements[key].addEventListener(eventName, async () => {
      await chrome.storage.sync.set({ [key]: settingValue(key) });
      updateOutputs();
    });
    elements[key].disabled = false;
  }
}

async function initialize() {
  const settings = { ...DEFAULTS, ...await chrome.storage.sync.get(DEFAULTS) };
  elements.enabled.checked = settings.enabled;
  elements.theme.value = settings.theme;
  elements.fontScale.value = settings.fontScale;
  elements.readingWidth.value = settings.readingWidth;
  updateOutputs();
  bindSettingControls();
  document.documentElement.dataset.ready = "true";

  const { savedStories = [] } = await chrome.storage.local.get({ savedStories: [] });
  elements.savedCount.textContent = savedStories.length;
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "sync") return;
  for (const key of settingKeys) {
    if (!changes[key]) continue;
    if (key === "enabled") elements[key].checked = changes[key].newValue;
    else elements[key].value = changes[key].newValue;
  }
  updateOutputs();
});

elements.clearSaved.addEventListener("click", async () => {
  await chrome.storage.local.set({ savedStories: [] });
  elements.savedCount.textContent = "0";
});

initialize();
