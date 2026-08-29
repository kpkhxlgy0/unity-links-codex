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

function structuralLines(workflow) {
  const lines = [];
  let blockScalarIndent = -1;
  for (const rawLine of workflow.split(/\r?\n/)) {
    const trimmed = rawLine.trim();
    const currentIndent = indentation(rawLine);
    if (blockScalarIndent >= 0) {
      if (!trimmed || currentIndent > blockScalarIndent) continue;
      blockScalarIndent = -1;
    }
    if (!trimmed || trimmed.startsWith("#")) continue;

    lines.push({ indent: currentIndent, trimmed });
    if (/:\s*[|>](?:[+-][1-9]?|[1-9][+-]?)?\s*(?:#.*)?$/.test(trimmed)) {
      blockScalarIndent = currentIndent;
    }
  }
  return lines;
}

function checkoutSteps(workflow) {
  const lines = structuralLines(workflow);
  const steps = [];
  const mappingPath = [];
  for (let start = 0; start < lines.length; start += 1) {
    const line = lines[start];
    while (mappingPath.length && mappingPath.at(-1).indent >= line.indent) mappingPath.pop();

    const nameMatch = line.trimmed.match(/^-\s+name:\s*(.+?)\s*$/);
    const path = mappingPath.map((entry) => entry.key);
    const isJobStep = path.length === 3 && path[0] === "jobs" && path[2] === "steps";
    if (nameMatch && isJobStep) {
      const stepIndent = line.indent;
      const stepLines = [];
      for (let cursor = start + 1; cursor < lines.length; cursor += 1) {
        if (lines[cursor].indent <= stepIndent) break;
        stepLines.push(lines[cursor]);
      }

      const directIndent = stepLines.reduce(
        (minimum, child) => Math.min(minimum, child.indent),
        Number.POSITIVE_INFINITY,
      );
      const step = { name: parseScalar(nameMatch[1]), uses: "", with: {} };
      const withIndex = stepLines.findIndex(
        (child) => child.indent === directIndent && child.trimmed === "with:",
      );
      const usesLine = stepLines.find(
        (child) => child.indent === directIndent && /^uses:\s*(\S+)$/.test(child.trimmed),
      );
      if (usesLine) step.uses = parseScalar(usesLine.trimmed.match(/^uses:\s*(\S+)$/)[1]);

      if (withIndex >= 0) {
        const withLines = [];
        for (let cursor = withIndex + 1; cursor < stepLines.length; cursor += 1) {
          if (stepLines[cursor].indent <= directIndent) break;
          withLines.push(stepLines[cursor]);
        }
        const withChildIndent = withLines.reduce(
          (minimum, child) => Math.min(minimum, child.indent),
          Number.POSITIVE_INFINITY,
        );
        for (const child of withLines) {
          if (child.indent !== withChildIndent) continue;
          const fieldMatch = child.trimmed.match(/^([A-Za-z0-9_-]+):\s*(.*?)\s*$/);
          if (fieldMatch) step.with[fieldMatch[1]] = parseScalar(fieldMatch[2]);
        }
      }
      if (step.uses.startsWith("actions/checkout@")) steps.push(step);
    }

    const mappingMatch = line.trimmed.match(/^([^:#][^:]*):\s*$/);
    if (mappingMatch) mappingPath.push({ indent: line.indent, key: parseScalar(mappingMatch[1]) });
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

test("checkout validation ignores sparse-checkout block scalar decoys", () => {
  for (const indicator of ["|", ">-", "|2+"]) {
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
          sparse-checkout: ${indicator}
            repository: ${expectedRepository}
            ref: ${expectedCommit}
`;
      assert.throws(() => assertReviewedCodexCheckout(workflow, "block decoy"), expectedError);
    }
  }
});

test("checkout validation ignores fake steps inside run block scalars", () => {
  const workflow = `
jobs:
  validate:
    steps:
      - name: Unrelated script
        shell: pwsh
        run: |
          Write-Output decoy
          - name: Check out pinned Codex++
            uses: actions/checkout@v6
            with:
              repository: ${expectedRepository}
              ref: ${expectedCommit}
`;
  assert.throws(
    () => assertReviewedCodexCheckout(workflow, "run block decoy"),
    /expected one pinned Codex\+\+ checkout step/,
  );
});
