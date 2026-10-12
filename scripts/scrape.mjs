#!/usr/bin/env node
/**
 * Fetch the Electoral Commission's "donations exceeding $20,000" page.
 *
 * The site sits behind Imperva. curl, fetch and headless Chrome are all served
 * a challenge page instead of the content, so this drives a real headed Chrome
 * over the DevTools Protocol and reads the rendered DOM. Output is a raw HTML
 * snapshot in .local/ — which still contains donor home addresses and is
 * therefore gitignored. Run `node scripts/build-data.mjs` after this to produce
 * the published dataset.
 *
 * Usage: node scripts/scrape.mjs
 */
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { setTimeout as sleep } from "node:timers/promises";

const URL_TARGET =
  "https://elections.nz/democracy-in-nz/political-parties-in-new-zealand/donations-exceeding-20000";
const PORT = 9777;
const CHROME =
  process.env.CHROME_PATH ??
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PROFILE = ".local/chrome-profile";
const OUT = ".local/page-snapshot.html";

/** Minimal CDP client over the raw WebSocket protocol (no deps). */
async function cdp(wsUrl) {
  const ws = new WebSocket(wsUrl);
  const pending = new Map();
  let id = 0;
  await new Promise((res, rej) => {
    ws.addEventListener("open", res, { once: true });
    ws.addEventListener("error", rej, { once: true });
  });
  ws.addEventListener("message", (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg.result);
      pending.delete(msg.id);
    }
  });
  return {
    send(method, params = {}) {
      const i = ++id;
      return new Promise((res) => {
        pending.set(i, res);
        ws.send(JSON.stringify({ id: i, method, params }));
      });
    },
    close: () => ws.close(),
  };
}

mkdirSync(".local", { recursive: true });

const chrome = spawn(
  CHROME,
  [
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${PROFILE}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--window-size=1400,1000",
    "about:blank",
  ],
  { stdio: "ignore", detached: false },
);

try {
  // Wait for the debugging endpoint to answer.
  let version = null;
  for (let i = 0; i < 30 && !version; i++) {
    await sleep(500);
    version = await fetch(`http://127.0.0.1:${PORT}/json/version`)
      .then((r) => r.json())
      .catch(() => null);
  }
  if (!version) throw new Error(`Chrome never opened a debugging port on ${PORT}`);

  const tab = await fetch(
    `http://127.0.0.1:${PORT}/json/new?${URL_TARGET}`,
    { method: "PUT" },
  ).then((r) => r.json());

  const client = await cdp(tab.webSocketDebuggerUrl);
  await client.send("Runtime.enable");

  // Give the challenge script time to run and the page to render.
  let html = "";
  for (let i = 0; i < 20; i++) {
    await sleep(1000);
    const res = await client.send("Runtime.evaluate", {
      expression: "document.documentElement.outerHTML",
      returnByValue: true,
    });
    html = res?.result?.value ?? "";
    if (html.includes("<table") && html.length > 50_000) break;
  }
  client.close();

  if (!html.includes("<table")) {
    throw new Error(
      "No table in the rendered page — the bot challenge probably blocked it. Try again, or open the URL in this Chrome window by hand first.",
    );
  }

  writeFileSync(OUT, html);
  console.log(`Wrote ${OUT} (${(html.length / 1024).toFixed(0)} KB)`);
} finally {
  chrome.kill();
}
