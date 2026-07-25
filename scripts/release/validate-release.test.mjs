import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { validateRelease } from "./validate-release.mjs";

const fixtureRoots = [];

function writeJson(root, relativePath, value) {
  const target = join(root, relativePath);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, `${JSON.stringify(value, null, 2)}\n`);
}

function fixtureRoot() {
  const root = mkdtempSync(join(tmpdir(), "unity-links-codex-release-"));
  fixtureRoots.push(root);
  writeJson(root, "manifest.json", {
    id: "com.kpk.unity-asset-links",
    version: "0.2.0",
    githubRepo: "kpkhxlgy0/unity-links-codex",
    iconUrl: "https://raw.githubusercontent.com/kpkhxlgy0/unity-links-codex/master/icon.png",
  });
  writeJson(root, "package.json", { version: "0.2.0", license: "MIT" });
  writeFileSync(join(root, "icon.png"), "test-icon");
  writeFileSync(join(root, "LICENSE"), "MIT License\n\nCopyright (c) 2026 KPK\n");
  return root;
}

function updateJson(root, relativePath, patch) {
  const target = join(root, relativePath);
  const current = JSON.parse(readFileSync(target, "utf8"));
  writeJson(root, relativePath, { ...current, ...patch });
}

afterEach(() => {
  for (const root of fixtureRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

test("accepts a valid stable Codex tweak release", () => {
  assert.deepEqual(validateRelease(fixtureRoot(), "0.2.0"), {
    version: "0.2.0",
    tag: "v0.2.0",
  });
});

test("rejects non-stable versions", () => {
  for (const version of ["v0.2.0", "0.2", "0.2.0-beta.1", "latest"]) {
    assert.throws(() => validateRelease(fixtureRoot(), version), /stable MAJOR\.MINOR\.PATCH/);
  }
});

test("rejects version mismatches", () => {
  for (const relativePath of ["manifest.json", "package.json"]) {
    const root = fixtureRoot();
    updateJson(root, relativePath, { version: "0.2.1" });
    assert.throws(() => validateRelease(root, "0.2.0"), new RegExp(relativePath));
  }
});

test("rejects wrong identity and repository metadata", () => {
  const wrongId = fixtureRoot();
  updateJson(wrongId, "manifest.json", { id: "example.wrong" });
  assert.throws(() => validateRelease(wrongId, "0.2.0"), /com\.kpk\.unity-asset-links/);

  const wrongRepository = fixtureRoot();
  updateJson(wrongRepository, "manifest.json", { githubRepo: "kpkhxlgy0/unity-links" });
  assert.throws(() => validateRelease(wrongRepository, "0.2.0"), /unity-links-codex/);
});

test("rejects missing or incorrect icon metadata", () => {
  const wrongUrl = fixtureRoot();
  updateJson(wrongUrl, "manifest.json", { iconUrl: "http://example.com/icon.png" });
  assert.throws(() => validateRelease(wrongUrl, "0.2.0"), /iconUrl/);

  const missingIcon = fixtureRoot();
  rmSync(join(missingIcon, "icon.png"));
  assert.throws(() => validateRelease(missingIcon, "0.2.0"), /icon\.png/);
});

test("rejects missing or incorrect MIT metadata", () => {
  const missingLicense = fixtureRoot();
  rmSync(join(missingLicense, "LICENSE"));
  assert.throws(() => validateRelease(missingLicense, "0.2.0"), /LICENSE/);

  const wrongCopyright = fixtureRoot();
  writeFileSync(join(wrongCopyright, "LICENSE"), "MIT License\nCopyright (c) 2026 Someone Else\n");
  assert.throws(() => validateRelease(wrongCopyright, "0.2.0"), /Copyright \(c\) 2026 KPK/);

  const wrongLicense = fixtureRoot();
  updateJson(wrongLicense, "package.json", { license: "Apache-2.0" });
  assert.throws(() => validateRelease(wrongLicense, "0.2.0"), /license must be MIT/);
});
