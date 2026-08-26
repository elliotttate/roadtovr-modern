import { spawn } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const artifactDirectory = path.join(projectDirectory, "artifacts");
const userDataDirectory = mkdtempSync(path.join(os.tmpdir(), "rtvr-horizon-"));
const devToolsFile = path.join(userDataDirectory, "DevToolsActivePort");

function findChrome() {
  const candidates = [process.env.RTVR_CHROME].filter(Boolean);

  const projectChromeCache = path.join(os.homedir(), "Library/Caches/roadtovr-horizon");
  if (existsSync(projectChromeCache)) {
    const matches = readdirSync(projectChromeCache, { recursive: true, encoding: "utf8" })
      .filter((entry) => entry.endsWith("Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing"))
      .sort()
      .reverse();
    candidates.push(...matches.map((entry) => path.join(projectChromeCache, entry)));
  }

  candidates.push("/Applications/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing");

  const playwrightCache = path.join(os.homedir(), "Library/Caches/ms-playwright");
  if (existsSync(playwrightCache)) {
    const matches = readdirSync(playwrightCache, { recursive: true, encoding: "utf8" })
      .filter((entry) => entry.endsWith("Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing"))
      .sort()
      .reverse();
    candidates.push(...matches.map((entry) => path.join(playwrightCache, entry)));
  }

  candidates.push(
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
  );

  return candidates.find((candidate) => existsSync(candidate));
}

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function waitFor(predicate, { timeout = 25000, interval = 200, label = "condition" } = {}) {
  const deadline = Date.now() + timeout;
  let lastError;
  let lastValue;
  while (Date.now() < deadline) {
    try {
      const value = await predicate();
      lastValue = value;
      if (value) return value;
    } catch (error) {
      lastError = error;
    }
    await wait(interval);
  }
  const detail = lastError?.message || (lastValue ? JSON.stringify(lastValue) : "");
  throw new Error(`Timed out waiting for ${label}${detail ? `: ${detail}` : ""}`);
}

class CdpConnection {
  constructor(url) {
    this.socket = new WebSocket(url);
    this.nextId = 1;
    this.pending = new Map();
    this.events = [];
    this.socket.addEventListener("message", (event) => {
      this.handleMessage(JSON.parse(event.data));
    });
  }

  handleMessage(message) {
    if (message.id) {
      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);
      if (message.error) pending.reject(new Error(message.error.message));
      else pending.resolve(message.result);
    } else {
      this.events.push(message);
    }
  }

  async open() {
    if (this.socket.readyState === WebSocket.OPEN) return;
    await new Promise((resolve, reject) => {
      this.socket.addEventListener("open", resolve, { once: true });
      this.socket.addEventListener("error", reject, { once: true });
    });
  }

  send(method, params = {}) {
    const id = this.nextId++;
    const promise = new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }));
    this.socket.send(JSON.stringify({ id, method, params }));
    return promise;
  }

  close() {
    this.socket.close();
  }
}

async function evaluate(cdp, expression) {
  const result = await cdp.send("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || "Page evaluation failed");
  return result.result.value;
}

async function capture(cdp, name) {
  const result = await cdp.send("Page.captureScreenshot", {
    format: "png",
    fromSurface: true,
    captureBeyondViewport: false,
  });
  writeFileSync(path.join(artifactDirectory, name), Buffer.from(result.data, "base64"));
}

const chrome = findChrome();
if (!chrome) {
  throw new Error("Chrome for Testing was not found. Set RTVR_CHROME to a Chrome or Chromium executable.");
}

mkdirSync(artifactDirectory, { recursive: true });
let chromeLog = "";
const chromeProcess = spawn(chrome, [
  "--headless=new",
  `--user-data-dir=${userDataDirectory}`,
  "--remote-debugging-port=0",
  `--disable-extensions-except=${projectDirectory}`,
  `--load-extension=${projectDirectory}`,
  "--no-first-run",
  "--no-default-browser-check",
  "--disable-background-networking",
  "--window-size=1440,1100",
  "about:blank",
], { stdio: ["ignore", "pipe", "pipe"] });

chromeProcess.stdout.on("data", (chunk) => { chromeLog += chunk.toString(); });
chromeProcess.stderr.on("data", (chunk) => { chromeLog += chunk.toString(); });

let cdp;
try {
  const portData = await waitFor(() => existsSync(devToolsFile) && readFileSync(devToolsFile, "utf8"), {
    timeout: 15000,
    label: "Chrome DevTools endpoint",
  });
  const [port] = portData.trim().split("\n");
  const targets = await waitFor(async () => {
    const response = await fetch(`http://127.0.0.1:${port}/json/list`);
    const list = await response.json();
    return list.find((target) => target.type === "page") ? list : null;
  }, { label: "browser page target" });
  const target = targets.find((item) => item.type === "page");

  cdp = new CdpConnection(target.webSocketDebuggerUrl);
  await cdp.open();
  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");
  await cdp.send("Page.addScriptToEvaluateOnNewDocument", {
    source: `(() => {
      const audit = { oldSiteVisible: false, bootLayerSeen: false, samples: 0 };
      Object.defineProperty(window, "__rtvrFlashAudit", { value: audit });

      const classObserver = new MutationObserver((records) => {
        if (document.documentElement?.classList.contains("rtvrx-booting") || records.some((record) => record.oldValue?.includes("rtvrx-booting"))) {
          audit.bootLayerSeen = true;
        }
        if (document.documentElement?.classList.contains("rtvrx-active")) classObserver.disconnect();
      });
      classObserver.observe(document, {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: ["class"],
        attributeOldValue: true,
      });

      const isVisible = (element) => {
        if (!element) return false;
        if (typeof element.checkVisibility === "function") {
          return element.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true });
        }
        let current = element;
        while (current) {
          const style = getComputedStyle(current);
          if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) return false;
          current = current.parentElement;
        }
        const rect = element.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      };

      const sample = () => {
        audit.samples += 1;
        const root = document.documentElement;
        audit.bootLayerSeen ||= root.classList.contains("rtvrx-booting");
        const legacy = document.querySelector(".td-module-container, .tdb_single_content, .td-post-content");
        if (legacy && !root.classList.contains("rtvrx-active") && isVisible(legacy)) {
          audit.oldSiteVisible = true;
        }
        if (!root.classList.contains("rtvrx-active") && performance.now() < 30000) {
          requestAnimationFrame(sample);
        }
      };
      requestAnimationFrame(sample);
    })();`,
  });
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 1100,
    deviceScaleFactor: 1,
    mobile: false,
  });

  await cdp.send("Page.navigate", { url: "https://www.roadtovr.com/" });
  const home = await waitFor(async () => {
    const state = await evaluate(cdp, `(() => ({
      url: location.href,
      readyState: document.readyState,
      bodyClass: document.body?.className || "",
      active: document.documentElement.classList.contains("rtvrx-active"),
      app: Boolean(document.querySelector("#rtvrx-app")),
      sourceModules: document.querySelectorAll(".td-module-container").length,
      cards: document.querySelectorAll(".rtvrx-card").length,
      title: document.querySelector(".rtvrx-home-intro h1")?.textContent || "",
      firstArticle: document.querySelector(".rtvrx-card h2 a")?.href || "",
      logoLoaded: Boolean(document.querySelector(".rtvrx-brand-image")?.complete && document.querySelector(".rtvrx-brand-image")?.naturalWidth),
      flashAudit: window.__rtvrFlashAudit || null
    }))()`);
    if (state.active && state.app && state.cards >= 5 && state.firstArticle && state.logoLoaded) {
      if (state.flashAudit?.oldSiteVisible) throw new Error(`Legacy site became visible: ${JSON.stringify(state.flashAudit)}`);
      if (!state.flashAudit?.bootLayerSeen) throw new Error(`Preload layer was not observed: ${JSON.stringify(state.flashAudit)}`);
      return state;
    }
    throw new Error(JSON.stringify(state));
  }, { timeout: 35000, label: "modern home page" });

  await wait(900);
  await capture(cdp, "home.png");
  await cdp.send("Page.navigate", { url: home.firstArticle });
  const article = await waitFor(async () => {
    const state = await evaluate(cdp, `(() => ({
      url: location.href,
      active: document.documentElement.classList.contains("rtvrx-active"),
      title: document.querySelector(".rtvrx-article-hero h1")?.textContent || "",
      paragraphs: document.querySelectorAll(".rtvrx-article-content p").length,
      progress: Boolean(document.querySelector(".rtvrx-progress i")),
      originalHidden: getComputedStyle(document.querySelector("body > :not(#rtvrx-app)"))?.display === "none",
      logoLoaded: Boolean(document.querySelector(".rtvrx-brand-image")?.complete && document.querySelector(".rtvrx-brand-image")?.naturalWidth),
      flashAudit: window.__rtvrFlashAudit || null
    }))()`);
    if (state.active && state.title && state.paragraphs >= 2 && state.progress && state.logoLoaded) {
      if (state.flashAudit?.oldSiteVisible) throw new Error(`Legacy article became visible: ${JSON.stringify(state.flashAudit)}`);
      if (!state.flashAudit?.bootLayerSeen) throw new Error(`Article preload layer was not observed: ${JSON.stringify(state.flashAudit)}`);
      return state;
    }
    return null;
  }, { timeout: 35000, label: "modern article page" });

  await wait(900);
  await capture(cdp, "article.png");
  await evaluate(cdp, `(() => { const content = document.querySelector(".rtvrx-article-content"); window.scrollTo(0, Math.max(0, (content ? content.getBoundingClientRect().top + window.scrollY : 1400) - 130)); })()`);
  await wait(500);
  await capture(cdp, "article-reading.png");

  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    mobile: true,
  });
  await cdp.send("Page.navigate", { url: "https://www.roadtovr.com/" });
  const mobile = await waitFor(async () => {
    const state = await evaluate(cdp, `(() => ({
      active: document.documentElement.classList.contains("rtvrx-active"),
      cards: document.querySelectorAll(".rtvrx-card").length,
      subnavVisible: getComputedStyle(document.querySelector(".rtvrx-subnav")).display !== "none",
      horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 2,
      logoLoaded: Boolean(document.querySelector(".rtvrx-brand-image")?.complete && document.querySelector(".rtvrx-brand-image")?.naturalWidth),
      flashAudit: window.__rtvrFlashAudit || null
    }))()`);
    if (state.active && state.cards >= 5 && state.subnavVisible && !state.horizontalOverflow && state.logoLoaded) {
      if (state.flashAudit?.oldSiteVisible) throw new Error(`Legacy mobile site became visible: ${JSON.stringify(state.flashAudit)}`);
      if (!state.flashAudit?.bootLayerSeen) throw new Error(`Mobile preload layer was not observed: ${JSON.stringify(state.flashAudit)}`);
      return state;
    }
    throw new Error(JSON.stringify(state));
  }, { timeout: 35000, label: "responsive mobile home page" });
  await wait(900);
  await capture(cdp, "mobile-home.png");

  const logoUrl = await evaluate(cdp, `document.querySelector(".rtvrx-brand-image").src`);
  const extensionBase = logoUrl.slice(0, logoUrl.indexOf("/assets/"));
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 600,
    deviceScaleFactor: 2,
    mobile: false,
  });
  await cdp.send("Page.navigate", { url: `${extensionBase}/popup/popup.html` });
  const popup = await waitFor(async () => {
    const state = await evaluate(cdp, `(() => ({
      title: document.title,
      logoLoaded: Boolean(document.querySelector(".brand img")?.complete && document.querySelector(".brand img")?.naturalWidth),
      controls: document.querySelectorAll("input, select, button").length,
      enabled: document.querySelector("#enabled")?.checked
    }))()`);
    return state.title && state.logoLoaded && state.controls >= 5 ? state : null;
  }, { timeout: 15000, label: "extension popup with new brand" });
  await wait(400);
  await capture(cdp, "popup.png");

  const report = {
    chrome,
    extension: "Road to VR — Horizon",
    testedAt: new Date().toISOString(),
    home,
    article,
    mobile,
    popup,
  };
  writeFileSync(path.join(artifactDirectory, "live-test.json"), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  const tail = chromeLog.trim().split("\n").slice(-20).join("\n");
  throw new Error(`${error.message}${tail ? `\nChrome log:\n${tail}` : ""}`);
} finally {
  cdp?.close();
  chromeProcess.kill("SIGTERM");
  await wait(250);
  rmSync(userDataDirectory, { recursive: true, force: true });
}
