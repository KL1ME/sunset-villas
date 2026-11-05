// Local, isolated state for connecting owner calendars. Never deploy this config.
import { existsSync, readFileSync, writeFileSync, chmodSync } from "node:fs";
import { randomBytes } from "node:crypto";
const buildConfig = "dist/server/wrangler.json";
if (!existsSync(buildConfig))
  throw new Error(
    "Run npm run build before preparing the local calendar preview.",
  );
const config = JSON.parse(readFileSync(buildConfig, "utf8"));
config.name = "sunset-villas-calendar-preview";
config.d1_databases = [
  {
    binding: "DB",
    database_name: "sunset-villas-private-calendars",
    database_id: "00000000-0000-4000-8000-000000000002",
    migrations_dir: "../../drizzle",
  },
];
const privateEnv = ".dev.vars.calendar-preview";
if (!existsSync(privateEnv))
  writeFileSync(
    privateEnv,
    `ADMIN_TOKEN="${randomBytes(32).toString("hex")}"\nSITE_ORIGIN="http://127.0.0.1:5195"\n`,
    { mode: 0o600 },
  );
const envText = readFileSync(privateEnv, "utf8");
if (!/^ADMIN_TOKEN="[a-f0-9]{64}"$/m.test(envText))
  throw new Error(
    "The private preview requires its own generated local ADMIN_TOKEN. Existing environment file was preserved.",
  );
chmodSync(privateEnv, 0o600);
writeFileSync("dist/server/.dev.vars", envText, { mode: 0o600 });
writeFileSync(
  "dist/server/wrangler.calendar-preview.json",
  JSON.stringify(config, null, 2) + "\n",
);
console.log(
  "Prepared a local-only calendar preview. Private credentials and database state are excluded from Git.",
);
