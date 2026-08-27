import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const projectDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relativePath) => readFileSync(path.join(projectDirectory, relativePath), "utf8");
const manifest = JSON.parse(read("manifest.json"));

test("uses a narrowly scoped Manifest V3 configuration", () => {
  assert.equal(manifest.manifest_version, 3);
  assert.deepEqual(manifest.permissions, ["storage"]);
  assert.ok(manifest.host_permissions.every((pattern) => pattern.includes("roadtovr.com")));
  assert.ok(manifest.content_scripts[0].matches.every((pattern) => pattern.includes("roadtovr.com")));
  assert.equal(manifest.background, undefined);
  assert.equal(manifest.content_security_policy, undefined);
  assert.equal(manifest.content_scripts[0].run_at, "document_start");
  assert.equal(manifest.content_scripts[0].css[0], "src/preload.css");
  assert.equal(manifest.content_scripts[0].js[0], "src/bootstrap.js");
});

test("every manifest resource exists", () => {
  const referenced = [
    ...manifest.content_scripts.flatMap((script) => [...script.css, ...script.js]),
    manifest.action.default_popup,
    ...Object.values(manifest.action.default_icon),
    ...Object.values(manifest.icons),
    ...manifest.web_accessible_resources.flatMap((entry) => entry.resources),
  ];

  for (const relativePath of new Set(referenced)) {
    assert.ok(existsSync(path.join(projectDirectory, relativePath)), `Missing ${relativePath}`);
  }
});

test("content implementation has safe fallback and accessibility hooks", () => {
  const source = read("src/content.js");
  assert.match(source, /if \(isArticle && !data\)/);
  assert.match(source, /if \(!isArticle && posts\.length === 0\)/);
  assert.match(source, /function revealOriginal\(\)/);
  assert.match(source, /async function waitForSourceMarkup\(\)/);
  assert.match(source, /document\.readyState !== "loading"/);
  assert.match(source, /await waitForSourceMarkup\(\)/);
  assert.match(source, /makeLink\("rtvrx-brand", "\/"/);
  assert.match(source, /\.tdb_single_author \.tdb-author-photo img/);
  assert.match(source, /className: "rtvrx-author-photo"/);
  assert.match(source, /function preserveDiscussion\(\)/);
  assert.match(source, /#disqus_thread/);
  assert.match(source, /function restoreDiscussion\(\)/);
  assert.match(source, /async function hydrateMissingImages\(posts\)/);
  assert.match(source, /jetpack_featured_media_url/);
  assert.match(source, /IMAGE_CACHE_KEY/);
  assert.match(source, /data.*imageState|imageState/);
  assert.match(source, /function makeBackToTop\(\)/);
  assert.match(source, /className: "rtvrx-back-to-top"/);
  assert.match(source, /backToTop\.tabIndex = isVisible \? 0 : -1/);
  assert.match(source, /prefers-reduced-motion: reduce/);
  assert.match(source, /classList\.remove\(BOOTING_CLASS, DISABLED_CLASS, PASSTHROUGH_CLASS\)/);
  assert.match(source, /prefers-reduced-motion|IntersectionObserver/);
  assert.match(source, /aria-label/);
  assert.doesNotMatch(source, /\beval\s*\(/);
  assert.doesNotMatch(source, /https?:\/\/[^"']+\.js/);
});

test("header navigation exposes the complete Road to VR section taxonomy", () => {
  const source = read("src/content.js");
  const sectionPaths = [
    "/sections/xr-headset-review-accessories/",
    "/sections/xr-game-review-preview-software/",
    "/sections/meta-quest-3-news-reviews/",
    "/sections/pc-vr-news-reviews/",
    "/sections/playstation-vr-psvr-2-news-reviews/",
    "/sections/apple-vision-pro-news-reviews/",
    "/sections/android-xr-galaxy-xr-news-reviews/",
    "/sections/ar-mr-xr-vr-industry-news/",
    "/sections/ar-vr-mr-xr-design-development/",
    "/sections/guest-article/",
    "/sections/xr-vr-ar-sale-deal/",
  ];

  for (const sectionPath of sectionPaths) {
    assert.ok(source.includes(sectionPath), `Missing navigation destination ${sectionPath}`);
  }
  assert.match(source, /id: "rtvrx-explore-menu"/);
  assert.match(source, /"aria-controls": "rtvrx-explore-menu"/);
  assert.match(source, /"aria-expanded": "false"/);
  assert.match(source, /function handleAppKeydown\(event\)/);
  assert.match(source, /event\.key !== "Escape"/);
});

test("preload layer prevents the legacy page from painting", () => {
  const preload = read("src/preload.css");
  const bootstrap = read("src/bootstrap.js");
  assert.match(preload, /html\.rtvrx-booting body > \*/);
  assert.match(preload, /visibility: hidden !important/);
  assert.match(preload, /assets\/brand\/road-to-vr-logo\.png/);
  assert.match(bootstrap, /classList\.add\("rtvrx-booting"\)/);
  assert.match(bootstrap, /chrome\.storage\.sync\.get/);
});

test("new Road to VR identity is wired into every extension surface", () => {
  const content = read("src/content.js");
  const popup = read("popup/popup.html");
  assert.match(content, /chrome\.runtime\.getURL\("assets\/brand\/road-to-vr-logo\.png"\)/);
  assert.match(content, /className: "rtvrx-brand-image"/);
  assert.match(popup, /assets\/brand\/road-to-vr-logo\.png/);
  assert.ok(manifest.web_accessible_resources[0].resources.includes("assets/brand/road-to-vr-logo.png"));
});

test("styles cover responsive, theme, and reduced-motion modes", () => {
  const styles = read("src/styles.css");
  assert.match(styles, /data-theme="dark"/);
  assert.match(styles, /prefers-color-scheme: dark/);
  assert.match(styles, /prefers-reduced-motion: reduce/);
  assert.match(styles, /@media \(max-width: 800px\)/);
  assert.match(styles, /--rtvrx-reading-width/);
  assert.match(styles, /clamp\(21px, 1\.55vw, 24px\)/);
  assert.match(styles, /"Iowan Old Style"/);
  assert.match(styles, /text-rendering: optimizeLegibility/);
  assert.match(styles, /font-family: inherit !important/);
  assert.match(styles, /font-size: 1em !important/);
  assert.match(styles, /\.rtvrx-back-to-top\.is-visible/);
  assert.match(styles, /env\(safe-area-inset-bottom\)/);
});
