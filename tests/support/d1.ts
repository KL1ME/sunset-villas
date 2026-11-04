import { DatabaseSync } from "node:sqlite";
import { readFileSync, readdirSync } from "node:fs";
// Executes production SQL against SQLite; no sync behavior is reimplemented.
class Statement {
  private database: DatabaseSync;
  readonly sql: string;
  readonly values: unknown[];
  constructor(database: DatabaseSync, sql: string, values: unknown[] = []) {
    this.database = database;
    this.sql = sql;
    this.values = values;
  }
  bind(...values: unknown[]) {
    return new Statement(this.database, this.sql, values);
  }
  async first(column?: string) {
    const row = this.database
      .prepare(this.sql)
      .get(...(this.values as (string | number | null)[]));
    return row ? (column ? row[column] : { ...row }) : null;
  }
  async all() {
    const results = this.database
      .prepare(this.sql)
      .all(...(this.values as (string | number | null)[]))
      .map((row) => ({ ...row }));
    return {
      results,
      success: true,
      meta: {
        changes: Number(
          this.database.prepare("SELECT changes() AS n").get()!.n,
        ),
      },
    };
  }
  async run() {
    const value = this.database
      .prepare(this.sql)
      .run(...(this.values as (string | number | null)[]));
    return {
      success: true,
      results: [],
      meta: { changes: Number(value.changes) },
    };
  }
}
export function testDatabase() {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec("PRAGMA foreign_keys=ON");
  for (const file of readdirSync(new URL("../../drizzle/", import.meta.url))
    .filter((f) => f.endsWith(".sql"))
    .sort())
    sqlite.exec(
      readFileSync(new URL("../../drizzle/" + file, import.meta.url), "utf8"),
    );
  const adapter = {
    prepare: (sql: string) => new Statement(sqlite, sql),
    batch: async (statements: Statement[]) => {
      sqlite.exec("BEGIN");
      try {
        const values = [];
        for (const statement of statements) values.push(await statement.all());
        sqlite.exec("COMMIT");
        return values;
      } catch (error) {
        sqlite.exec("ROLLBACK");
        throw error;
      }
    },
  };
  return {
    db: adapter as unknown as D1Database,
    sqlite,
    close: () => sqlite.close(),
  };
}
export function seedProperty(sqlite: DatabaseSync, id = "villa") {
  sqlite
    .prepare(
      "INSERT INTO properties (id,slug,name,location,description,max_guests,bedrooms,export_token,created_at) VALUES (?,?,?,?,?,?,?,?,?)",
    )
    .run(
      id,
      id,
      "Test villa",
      "Test only",
      "Fixture",
      6,
      2,
      "test-token-" + id,
      "2026-11-01",
    );
}
