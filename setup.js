/**
 * setup.js — validates that all required env vars are set and credentials work
 *
 * Usage: npm run setup
 */

import "dotenv/config";

const REQUIRED = [
  "ANTHROPIC_API_KEY",
  "TRELLO_KEY",
  "TRELLO_TOKEN",
  "TRELLO_IDEAS_LIST_ID",
  "TRELLO_DONE_LIST_ID",
  "GITHUB_TOKEN",
  "GITHUB_USERNAME",
  "IDEA_MVPS_REPO",
];

let ok = true;

function pass(msg) { console.log(`  ✅ ${msg}`); }
function fail(msg) { console.error(`  ❌ ${msg}`); ok = false; }
function section(msg) { console.log(`\n── ${msg}`); }

// ─── 1. Env vars ─────────────────────────────────────────────────────────────

section("Checking environment variables");

const missing = REQUIRED.filter((k) => !process.env[k]);
if (missing.length > 0) {
  fail(`Missing env vars: ${missing.join(", ")}`);
  console.error("\n  Copy .env.example to .env and fill in the missing values.");
  process.exit(1);
} else {
  pass("All required env vars are set");
}

// ─── 2. Trello credentials ───────────────────────────────────────────────────

section("Checking Trello credentials");

const { TRELLO_KEY, TRELLO_TOKEN, TRELLO_IDEAS_LIST_ID, TRELLO_DONE_LIST_ID } = process.env;

try {
  const res = await fetch(
    `https://api.trello.com/1/members/me?key=${TRELLO_KEY}&token=${TRELLO_TOKEN}`
  );
  if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
  const me = await res.json();
  pass(`Trello authenticated as: ${me.fullName} (@${me.username})`);
} catch (err) {
  fail(`Trello auth failed: ${err.message}`);
}

try {
  const res = await fetch(
    `https://api.trello.com/1/lists/${TRELLO_IDEAS_LIST_ID}?fields=name&key=${TRELLO_KEY}&token=${TRELLO_TOKEN}`
  );
  if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
  const list = await res.json();
  pass(`TRELLO_IDEAS_LIST_ID points to list: "${list.name}"`);
} catch (err) {
  fail(`TRELLO_IDEAS_LIST_ID invalid: ${err.message}`);
}

try {
  const res = await fetch(
    `https://api.trello.com/1/lists/${TRELLO_DONE_LIST_ID}?fields=name&key=${TRELLO_KEY}&token=${TRELLO_TOKEN}`
  );
  if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
  const list = await res.json();
  pass(`TRELLO_DONE_LIST_ID points to list: "${list.name}"`);
} catch (err) {
  fail(`TRELLO_DONE_LIST_ID invalid: ${err.message}`);
}

// ─── 3. GitHub credentials ───────────────────────────────────────────────────

section("Checking GitHub credentials");

const { GITHUB_TOKEN, GITHUB_USERNAME, IDEA_MVPS_REPO } = process.env;

try {
  const res = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "idea-mvp-pipeline",
    },
  });
  if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
  const user = await res.json();
  pass(`GitHub authenticated as: ${user.login}`);
  if (user.login !== GITHUB_USERNAME) {
    fail(`GITHUB_USERNAME is "${GITHUB_USERNAME}" but token belongs to "${user.login}" — update GITHUB_USERNAME`);
  }
} catch (err) {
  fail(`GitHub auth failed: ${err.message}`);
}

try {
  const res = await fetch(
    `https://api.github.com/repos/${GITHUB_USERNAME}/${IDEA_MVPS_REPO}`,
    {
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "idea-mvp-pipeline",
      },
    }
  );
  if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
  const repo = await res.json();
  pass(`IDEA_MVPS_REPO found: ${repo.full_name}`);
  if (!repo.has_pages) {
    fail(`GitHub Pages is not enabled on ${repo.full_name} — enable it in repo Settings → Pages`);
  } else {
    pass(`GitHub Pages is enabled on ${repo.full_name}`);
  }
} catch (err) {
  fail(`IDEA_MVPS_REPO check failed: ${err.message}`);
}

// ─── 4. Claude Code CLI ──────────────────────────────────────────────────────

section("Checking Claude Code CLI");

import { execSync } from "child_process";
try {
  const version = execSync("claude --version", { encoding: "utf8", shell: true }).trim();
  pass(`Claude Code CLI found: ${version}`);
} catch {
  fail('Claude Code CLI not found — install it with: npm install -g @anthropic-ai/claude-code');
}

// ─── Result ──────────────────────────────────────────────────────────────────

console.log();
if (ok) {
  console.log("✅  All checks passed — you're ready to run: npm start");
} else {
  console.error("❌  Some checks failed — fix the issues above then run npm run setup again");
  process.exit(1);
}
