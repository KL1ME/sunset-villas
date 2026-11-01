// Prepare a build for your own Cloudflare account without editing tracked source.
import { readFileSync, writeFileSync } from "node:fs";
const [databaseId, workerName = "sunset-villas"] = process.argv.slice(2);
if (
  !databaseId ||
  !/^[a-f0-9-]{36}$/i.test(databaseId) ||
  databaseId === "00000000-0000-4000-8000-000000000000"
)
  throw new Error(
    "Pass your real D1 database UUID, then an optional Worker name.",
  );
if (!/^[a-z][a-z0-9-]{2,50}$/.test(workerName))
  throw new Error("Worker name must be a lowercase slug.");
const path = "dist/server/wrangler.json",
  config = JSON.parse(readFileSync(path, "utf8"));
config.name = workerName;
config.d1_databases = [
  {
    binding: "DB",
    database_name: workerName,
    database_id: databaseId,
    migrations_dir: "../../drizzle",
  },
];
writeFileSync(
  "dist/server/wrangler.production.json",
  JSON.stringify(config, null, 2) + "\n",
);
console.log(
  "Prepared dist/server/wrangler.production.json. No deployment performed.",
);
