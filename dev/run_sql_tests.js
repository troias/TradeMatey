// Cross-platform Node runner for the SQL test harness
// Usage: set DATABASE_URL or PGHOST/PGUSER/PGPASSWORD/PGDATABASE in env, then run:
//   node dev/run_sql_tests.js
// Options:
//   --ci    Fail fast (non-zero exit) if no DATABASE_URL/PGHOST is present (useful in CI)

const fsP = import("fs").then((m) => m.promises);
const pgP = import("pg");
const path = await import("path");

function getEnv(key) {
  return process.env[key];
}

function buildClientFromEnv(ClientClass) {
  if (getEnv("DATABASE_URL"))
    return new ClientClass({ connectionString: getEnv("DATABASE_URL") });
  const host = getEnv("PGHOST");
  if (!host) return null;
  return new ClientClass({
    host,
    port: getEnv("PGPORT") ? parseInt(getEnv("PGPORT")) : 6543,
    user: getEnv("PGUSER"),
    password: getEnv("PGPASSWORD"),
    database: getEnv("PGDATABASE") || "postgres",
    ssl: { rejectUnauthorized: false },
  });
}

(async function main() {
  const { Client } = (await pgP).default || (await pgP);
  const fs = await fsP;
  const client = buildClientFromEnv(Client);
  const isCI = process.argv.includes("--ci");
  if (!client) {
    const msg = "No DATABASE_URL or PGHOST found in env. Aborting.";
    console.error(msg);
    // In CI we want a fast, explicit non-zero exit so pipelines fail quickly.
    if (isCI) process.exit(2);
    process.exit(1);
  }

  console.log(
    "Connecting to",
    client.connectionParameters
      ? client.connectionParameters.host
      : "DATABASE_URL"
  );
  await client.connect();

  try {
    const schemaSql = await fs.readFile(
      path.join(__dirname, "sql-tests", "01_create_schema.sql"),
      "utf8"
    );
    console.log("Running schema init...");
    await client.query(schemaSql);

    const testsSql = await fs.readFile(
      path.join(__dirname, "sql-tests", "02_run_tests.sql"),
      "utf8"
    );
    console.log("Running tests...");
    await client.query(testsSql);

    console.log("Done");
  } catch (err) {
    console.error("Error running SQL tests:", err);
    process.exitCode = 2;
  } finally {
    await client.end();
  }
})();
