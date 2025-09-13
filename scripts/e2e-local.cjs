const { spawn } = require("child_process");
const fetch = require("node-fetch");

function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitFor(url, timeout = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch (e) {
      // ignore
    }
    // small delay
    await wait(500);
  }
  throw new Error("Timeout waiting for " + url);
}

(async function main() {
  console.log("Installing playwright browsers...");
  await new Promise((res, rej) => {
    const p = spawn("npx", ["playwright", "install", "--with-deps"], {
      stdio: "inherit",
      shell: true,
    });
    p.on("close", (c) =>
      c === 0 ? res() : rej(new Error("playwright install failed"))
    );
  });

  console.log("Starting dev server...");
  const dev = spawn("npm", ["run", "dev"], { stdio: "inherit", shell: true });

  process.on("exit", () => dev.kill());

  console.log("Waiting for http://localhost:3000");
  await waitFor("http://localhost:3000");

  console.log("Seeding test data");
  const token = process.env.TEST_SEED_TOKEN;
  if (!token) {
    console.error("TEST_SEED_TOKEN not set");
    process.exit(2);
  }
  const r = await fetch("http://localhost:3000/api/test-seed", {
    method: "POST",
    headers: { "x-test-seed-token": token, "content-type": "application/json" },
  });
  if (!r.ok) {
    const t = await r.text();
    console.error("Seed failed: " + t);
    process.exit(3);
  }

  console.log("Running Playwright tests");
  const t = spawn("npx", ["playwright", "test"], {
    stdio: "inherit",
    shell: true,
  });
  t.on("close", (code) => process.exit(code));
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
