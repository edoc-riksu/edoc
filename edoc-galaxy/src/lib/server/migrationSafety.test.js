import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "fs";
import { join } from "path";
import { checkMigrationSql, checkMigrations } from "./migrationSafety.mjs";

const rules = (sql) => checkMigrationSql(sql).findings.map((f) => f.rule);

describe("checkMigrationSql", () => {
  it("passes additive changes", () => {
    expect(rules('CREATE TABLE "x" ("id" TEXT NOT NULL, CONSTRAINT "x_pkey" PRIMARY KEY ("id"));')).toEqual([]);
    expect(rules('ALTER TABLE "attempts" ADD COLUMN "elapsedMs" INTEGER NOT NULL DEFAULT 0;')).toEqual([]);
    expect(rules('ALTER TABLE "attempts" ADD COLUMN "note" TEXT;')).toEqual([]);
    expect(rules('CREATE INDEX "i" ON "attempts"("userId");')).toEqual([]);
  });

  it("does not mistake ON DELETE CASCADE for a delete", () => {
    expect(
      rules('ALTER TABLE "progress" ADD CONSTRAINT "f" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;')
    ).toEqual([]);
  });

  it.each([
    ['DROP TABLE "attempts";', "drop-table"],
    ['ALTER TABLE "attempts" DROP COLUMN "runtimeMs";', "drop-column"],
    ['TRUNCATE "progress";', "truncate"],
    ['DELETE FROM "attempts" WHERE 1=1;', "delete"],
    ['UPDATE "progress" SET "level" = 0;', "update"],
    ['ALTER TABLE "users" RENAME COLUMN "email" TO "mail";', "rename"],
    ['ALTER TABLE "attempts" ALTER COLUMN "runtimeMs" SET DATA TYPE SMALLINT;', "column-type"],
    ['ALTER TABLE "attempts" ALTER COLUMN "runtimeMs" TYPE BIGINT;', "column-type"],
    ['ALTER TABLE "users" ALTER COLUMN "avatar" SET NOT NULL;', "set-not-null"],
    ['ALTER TABLE "attempts" ADD COLUMN "rating" INTEGER NOT NULL;', "not-null-without-default"]
  ])("flags %s", (sql, rule) => {
    expect(rules(sql)).toContain(rule);
  });

  it("ignores SQL inside comments and reports the starting line", () => {
    const sql = '-- DROP TABLE "attempts";\nCREATE TABLE "a" ("id" TEXT);\n\nALTER TABLE "a"\n  DROP COLUMN "id";';
    const { findings } = checkMigrationSql(sql);
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ rule: "drop-column", line: 4 });
  });
});

describe("checkMigrations", () => {
  const unsafe = 'ALTER TABLE "attempts" DROP COLUMN "runtimeMs";';

  it("fails on an unreviewed unsafe migration", () => {
    expect(checkMigrations([{ name: "m", sql: unsafe }]).ok).toBe(false);
  });

  it("accepts it once marked reviewed with a reason", () => {
    const sql = `-- migration-safety: reviewed column unused since #40, backup branch pre-drop-runtime\n${unsafe}`;
    const result = checkMigrations([{ name: "m", sql }]);
    expect(result.ok).toBe(true);
    expect(result.results[0].reviewNote).toMatch(/backup branch/);
  });

  it("does not accept a bare marker with no reason", () => {
    expect(checkMigrations([{ name: "m", sql: `-- migration-safety: reviewed\n${unsafe}` }]).ok).toBe(false);
  });

  it("passes every migration already in the repo", () => {
    const dir = join(__dirname, "..", "..", "..", "prisma", "migrations");
    const migrations = readdirSync(dir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => ({ name: d.name, sql: readFileSync(join(dir, d.name, "migration.sql"), "utf8") }));
    expect(migrations.length).toBeGreaterThan(0);
    expect(checkMigrations(migrations).ok).toBe(true);
  });
});
