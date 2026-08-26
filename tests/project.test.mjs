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
});

test("every manifest resource exists", () => {
  const referenced = [
    ...manifest.content_scripts.flatMap((script) => [...script.css, ...script.js]),
    manifest.action.default_popup,
    ...Object.values(manifest.action.default_icon),
    ...Object.values(manifest.icons),
  ];

  for (const relativePath of new Set(referenced)) {
    assert.ok(existsSync(path.join(projectDirectory, relativePath)), `Missing ${relativePath}`);
  }
});

test("content implementation has safe fallback and accessibility hooks", () => {
  const source = read("src/content.js");
  assert.match(source, /if \(isArticle && !data\) return/);
  assert.match(source, /if \(!isArticle && posts\.length === 0\) return/);
  assert.match(source, /prefers-reduced-motion|IntersectionObserver/);
  assert.match(source, /aria-label/);
  assert.doesNotMatch(source, /\beval\s*\(/);
  assert.doesNotMatch(source, /https?:\/\/[^"']+\.js/);
});

test("styles cover responsive, theme, and reduced-motion modes", () => {
  const styles = read("src/styles.css");
  assert.match(styles, /data-theme="dark"/);
  assert.match(styles, /prefers-color-scheme: dark/);
  assert.match(styles, /prefers-reduced-motion: reduce/);
  assert.match(styles, /@media \(max-width: 800px\)/);
  assert.match(styles, /--rtvrx-reading-width/);
});
