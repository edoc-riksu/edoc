import { describe, it, expect } from "vitest";
import { checkProductionConfig, parseEnvFile } from "./productionConfig.mjs";

// Plan Day 50: production environment checked before deploying.

const ready = {
  APP_ENV: "production",
  DATABASE_URL: "postgresql://edoc:s3cr3t@ep-quiet-prod-123456-pooler.ap-southeast-1.aws.neon.tech/edoc?sslmode=require&connect_timeout=30",
  AUTH_SECRET: "q8Vt2LkP9xZr4MwB7nYc3HsD6fGj1aQe5uRo0iTb",
  EXECUTION_API_URL: "https://api.edoc.example",
  NEXT_PUBLIC_EXECUTION_API_URL: "https://api.edoc.example",
  INVITE_ONLY: "true",
  METRICS_TOKEN: "m3tr1cs-T0ken-long-enough-xyz"
};

const names = (findings, level) => findings.filter((f) => !level || f.level === level).map((f) => f.name);

describe("checkProductionConfig", () => {
  it("passes a complete production setup", () => {
    expect(checkProductionConfig(ready)).toEqual([]);
  });

  it("blocks on anything missing", () => {
    const errors = names(checkProductionConfig({}), "error");
    for (const name of ["APP_ENV", "DATABASE_URL", "AUTH_SECRET", "EXECUTION_API_URL", "NEXT_PUBLIC_EXECUTION_API_URL"]) {
      expect(errors).toContain(name);
    }
  });

  it("blocks a staging APP_ENV", () => {
    expect(names(checkProductionConfig({ ...ready, APP_ENV: "staging" }), "error")).toEqual(["APP_ENV"]);
  });

  it("blocks a local, placeholder or password-less database", () => {
    for (const url of [
      "postgres://placeholder:placeholder@localhost:5432/placeholder",
      "postgres://u:p@127.0.0.1/x?connect_timeout=30",
      "postgres://edoc@db.example.com/edoc?connect_timeout=30",
      "mysql://u:p@db.example.com/x"
    ]) {
      expect(names(checkProductionConfig({ ...ready, DATABASE_URL: url }), "error")).toContain("DATABASE_URL");
    }
  });

  it("warns about Neon without sslmode and a missing connect_timeout", () => {
    const f = checkProductionConfig({ ...ready, DATABASE_URL: "postgresql://e:p@ep-x.neon.tech/edoc" });
    expect(f.filter((x) => x.name === "DATABASE_URL").map((x) => x.level)).toEqual(["warn", "warn"]);
  });

  it("blocks production sharing staging's database or secret", () => {
    const sameDb = checkProductionConfig({
      ...ready,
      STAGING_DATABASE_URL: ready.DATABASE_URL.replace("-pooler", "")
    });
    expect(names(sameDb, "error")).toEqual(["DATABASE_URL"]);
    const sameSecret = checkProductionConfig({ ...ready, STAGING_AUTH_SECRET: ready.AUTH_SECRET });
    expect(names(sameSecret, "error")).toEqual(["AUTH_SECRET"]);
  });

  it("blocks a short or hand-typed AUTH_SECRET", () => {
    expect(names(checkProductionConfig({ ...ready, AUTH_SECRET: "short" }), "error")).toEqual(["AUTH_SECRET"]);
    expect(names(checkProductionConfig({ ...ready, AUTH_SECRET: "changemechangemechangemechangeme" }), "error")).toEqual(["AUTH_SECRET"]);
  });

  it("blocks a judging service over http or on localhost", () => {
    expect(names(checkProductionConfig({ ...ready, EXECUTION_API_URL: "http://api.edoc.example" }), "error")).toContain("EXECUTION_API_URL");
    expect(names(checkProductionConfig({ ...ready, NEXT_PUBLIC_EXECUTION_API_URL: "https://localhost:8001" }), "error")).toContain("NEXT_PUBLIC_EXECUTION_API_URL");
  });

  it("warns when Run and Submit would use different services", () => {
    const f = checkProductionConfig({ ...ready, NEXT_PUBLIC_EXECUTION_API_URL: "https://other.example" });
    expect(names(f, "warn")).toContain("EXECUTION_API_URL");
  });

  it("warns, but doesn't block, an open sign-up or a missing metrics token", () => {
    const f = checkProductionConfig({ ...ready, INVITE_ONLY: "false", METRICS_TOKEN: "" });
    expect(names(f, "error")).toEqual([]);
    expect(names(f, "warn").sort()).toEqual(["INVITE_ONLY", "METRICS_TOKEN"]);
  });

  it("is fine with INVITE_ONLY unset (production defaults to invite-only)", () => {
    const { INVITE_ONLY, ...rest } = ready;
    expect(checkProductionConfig(rest)).toEqual([]);
  });

  it("never puts a secret's value in a finding", () => {
    const text = JSON.stringify(checkProductionConfig({ ...ready, APP_ENV: "x", AUTH_SECRET: "tooShortSecretValue" }));
    expect(text).not.toContain("tooShortSecretValue");
    expect(text).not.toContain("s3cr3t");
  });
});

describe("parseEnvFile", () => {
  it("reads vercel env pull output", () => {
    const text = '# Created by Vercel CLI\nAPP_ENV="production"\nAUTH_SECRET="a=b=c"\n\nexport EMPTY=\nPLAIN=value\n';
    expect(parseEnvFile(text)).toEqual({ APP_ENV: "production", AUTH_SECRET: "a=b=c", EMPTY: "", PLAIN: "value" });
  });

  it("handles Windows line endings", () => {
    expect(parseEnvFile('A="1"\r\nB=2\r\n')).toEqual({ A: "1", B: "2" });
  });
});
