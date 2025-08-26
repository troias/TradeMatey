#!/usr/bin/env node
// Simple repo secret scanner for common SUPABASE keys and DB URLs.
// Scans the working tree files (text) and recent git history (last 50 commits) for matches.
// This is a lightweight helper — manual review required for any findings.

const { execSync } = await import("child_process");
const fs = await import("fs").then((m) => m.promises);
const path = await import("path");

const { fileURLToPath } = await import("url");
const __filename = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(__filename), "..");
const patterns = [
  /SUPABASE_SERVICE_ROLE_KEY\s*=\s*[A-Za-z0-9\-_.]+/g,
  /SUPABASE_SERVICE_ROLE_KEY\s*:\s*['\"]?[A-Za-z0-9\-_.]+['\"]?/g,
  /supabase\.co\/[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, // supabase project urls
  /postgres:\/\/[^\s'"\)]+/g,
];

async function scanFiles(dir) {
  const hits = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    if (
      e.name === ".git" ||
      e.name === "node_modules" ||
      e.name.startsWith(".next")
    )
      continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      hits.push(...(await scanFiles(full)));
      continue;
    }
    try {
      const txt = await fs.readFile(full, "utf8");
      for (const pat of patterns) {
        const m = txt.match(pat);
        if (m) hits.push({ file: path.relative(repoRoot, full), matches: m });
      }
    } catch {
      // binary file or unreadable; skip
    }
  }
  return hits;
}

function scanGitHistory() {
  try {
    const out = execSync("git log -n 50 -p --pretty=format:%H", {
      cwd: repoRoot,
      encoding: "utf8",
    });
    const hits = [];
    for (const pat of patterns) {
      const m = out.match(pat);
      if (m)
        hits.push({
          source: "git-log",
          pattern: pat.toString(),
          matches: Array.from(new Set(m)),
        });
    }
    return hits;
  } catch (e) {
    return [{ source: "git-log", error: String(e) }];
  }
}

async function main() {
  console.log("Scanning files for SUPABASE or DB-like secrets...");
  const fileHits = await scanFiles(repoRoot);
  if (fileHits.length === 0)
    console.log("No obvious matches found in working tree.");
  else {
    console.log("Matches in working tree:");
    for (const h of fileHits) console.log("-", h.file, h.matches.slice(0, 5));
  }

  console.log("\nScanning recent git history (last 50 commits)...");
  const gitHits = scanGitHistory();
  if (gitHits.length === 0)
    console.log("No obvious matches in recent git history.");
  else console.log("Git history hits:", gitHits.slice(0, 10));

  if (
    fileHits.length ||
    (gitHits.length && !(gitHits.length === 1 && gitHits[0].error))
  ) {
    console.error(
      "\nPotential secrets found. Review carefully. If you need to remove secrets from history, use BFG or git-filter-repo and rotate keys."
    );
    process.exitCode = 3;
  } else console.log("\nNo obvious secrets found by this scan.");
}

main();
