// Plan Days 51, 53, 54: check a deployed edoc site from the outside.
// What each check means and what to do when one fails: RELEASE.md.
//
//   node scripts/release-check.mjs --url https://<production site> --execution https://<judging service>
//   node scripts/release-check.mjs --url https://edoc-drab.vercel.app --env staging --open
//   node scripts/release-check.mjs --url ... --every 10      (Day 53: re-check every 10 minutes)
//
// --env        the APP_ENV the site should report (default production)
// --open       sign-up is expected to be open (default: invite-only)
// --min-encounters N   how many encounters the index must hold (default 40)
// --execution  also check the judging service and submit py-001's sample answer once
// --bypass T   Vercel "Protection Bypass for Automation" secret, to check a
//              preview deployment that is behind Vercel's login
//              (or set VERCEL_AUTOMATION_BYPASS_SECRET)
// --every N    keep checking every N minutes; prints one line per round and
//              the full table whenever something changes. Ctrl+C to stop.
//
// Exit code: 0 all passed, 1 something failed, 2 warnings only.

import { formatResults, overall, runReleaseCheck } from "../src/lib/server/releaseCheck.mjs";

const args = Object.fromEntries(
  process.argv.slice(2).reduce((pairs, arg, i, all) => {
    if (arg.startsWith("--")) pairs.push([arg.slice(2), all[i + 1] && !all[i + 1].startsWith("--") ? all[i + 1] : true]);
    return pairs;
  }, [])
);

if (!args.url || args.url === true) {
  console.error("Usage: node scripts/release-check.mjs --url <site> [--execution <url>] [--env production] [--open] [--min-encounters 40] [--every N]");
  process.exit(2);
}

const options = {
  baseUrl: args.url,
  executionUrl: typeof args.execution === "string" ? args.execution : undefined,
  bypassToken: typeof args.bypass === "string" ? args.bypass : process.env.VERCEL_AUTOMATION_BYPASS_SECRET,
  expect: {
    env: typeof args.env === "string" ? args.env : "production",
    inviteOnly: !args.open,
    minEncounters: args["min-encounters"] ? Number(args["min-encounters"]) : 40
  }
};

const EXIT = { pass: 0, fail: 1, warn: 2 };

async function once() {
  const results = await runReleaseCheck(options);
  return { results, verdict: overall(results) };
}

if (args.every) {
  const minutes = Number(args.every);
  if (!(minutes >= 1)) {
    console.error("--every needs a number of minutes, 1 or more");
    process.exit(2);
  }
  let last = "";
  for (;;) {
    const { results, verdict } = await once();
    const summary = results.filter((r) => r.status !== "pass").map((r) => `${r.name}: ${r.detail}`).join("; ");
    const slowest = Math.max(...results.map((r) => r.ms));
    console.log(`${new Date().toISOString()}  ${verdict.toUpperCase()}  slowest ${slowest} ms${summary ? `  ${summary}` : ""}`);
    const key = results.map((r) => `${r.name}:${r.status}`).join(",");
    if (key !== last) {
      if (last) console.log(`${verdict === "fail" ? "\u0007" : ""}Something changed:\n${formatResults(results)}`);
      last = key;
    }
    await new Promise((resolve) => setTimeout(resolve, minutes * 60 * 1000));
  }
} else {
  const { results, verdict } = await once();
  console.log(`Release check of ${options.baseUrl} (expecting APP_ENV=${options.expect.env}, sign-up ${options.expect.inviteOnly ? "invite-only" : "open"})\n`);
  console.log(formatResults(results));
  console.log(`\n${verdict.toUpperCase()}: ${results.filter((r) => r.status === "pass").length} passed, ${results.filter((r) => r.status === "warn").length} warnings, ${results.filter((r) => r.status === "fail").length} failed`);
  process.exit(EXIT[verdict]);
}
