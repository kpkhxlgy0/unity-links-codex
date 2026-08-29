const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");
const { test } = require("node:test");

const repositoryRoot = resolve(__dirname, "..");
const expectedRepository = "kpkhxlgy0/codex-plusplus";
const expectedCommit = "85d4065f7c025327bb6fb8075ef9225dda5d185f";

function indentation(line) {
  return line.length - line.trimStart().length;
}

function parseScalar(value) {
  const trimmed = value.trim();
  const quoted = trimmed.match(/^(["'])(.*)\1$/);
  return quoted ? quoted[2] : trimmed;
}

function checkoutSteps(workflow) {
  const lines = workflow.split(/\r?\n/);
  const steps = [];
  for (let start = 0; start < lines.length; start += 1) {
    const nameMatch = lines[start].match(/^(\s*)-\s+name:\s*(.+?)\s*$/);
    if (!nameMatch) continue;

    const stepIndent = nameMatch[1].length;
    const step = { name: parseScalar(nameMatch[2]), uses: "", with: {} };
    let withIndent = -1;
    for (let cursor = start + 1; cursor < lines.length; cursor += 1) {
      const line = lines[cursor];
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;

      const currentIndent = indentation(line);
      if (currentIndent <= stepIndent) break;

      const usesMatch = trimmed.match(/^uses:\s*(\S+)$/);
      if (usesMatch) {
        step.uses = parseScalar(usesMatch[1]);
        continue;
      }
      if (trimmed === "with:") {
        withIndent = currentIndent;
        continue;
      }
      if (withIndent >= 0 && currentIndent > withIndent) {
        const fieldMatch = trimmed.match(/^([A-Za-z0-9_-]+):\s*(.*?)\s*$/);
        if (fieldMatch) step.with[fieldMatch[1]] = parseScalar(fieldMatch[2]);
      } else if (currentIndent <= withIndent) {
        withIndent = -1;
      }
    }
    if (step.uses.startsWith("actions/checkout@")) steps.push(step);
  }
  return steps;
}

function assertReviewedCodexCheckout(workflow, label) {
  const matches = checkoutSteps(workflow).filter((step) => step.name === "Check out pinned Codex++");
  assert.equal(matches.length, 1, `${label}: expected one pinned Codex++ checkout step`);
  assert.equal(matches[0].with.repository, expectedRepository, `${label}: wrong checkout repository`);
  assert.equal(matches[0].with.ref, expectedCommit, `${label}: wrong checkout ref`);
}

for (const relativePath of [
  ".github/workflows/ci.yml",
  ".github/workflows/release.yml",
]) {
  test(`${relativePath} uses the reviewed Codex++ checkout`, () => {
    const workflow = readFileSync(resolve(repositoryRoot, relativePath), "utf8");
    assertReviewedCodexCheckout(workflow, relativePath);
  });
}

test("checkout validation ignores canonical repository and ref decoys", () => {
  for (const [repository, ref, expectedError] of [
    ["example/wrong", expectedCommit, /wrong checkout repository/],
    [expectedRepository, "wrong-ref", /wrong checkout ref/],
  ]) {
    const workflow = `
jobs:
  validate:
    steps:
      - name: Check out pinned Codex++
        uses: actions/checkout@v6
        with:
          repository: ${repository}
          ref: ${ref}
      - name: Unrelated decoy
        env:
          repository: ${expectedRepository}
          ref: ${expectedCommit}
        run: echo decoy
# repository: ${expectedRepository}
# ref: ${expectedCommit}
`;
    assert.throws(() => assertReviewedCodexCheckout(workflow, "decoy"), expectedError);
  }
});
