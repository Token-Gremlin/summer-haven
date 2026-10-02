import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { writeFile, mkdir } from 'node:fs/promises';
let server;
const url = 'http://127.0.0.1:5173/';
try {
  await fetch(url);
} catch {
  server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1'], {
    stdio: 'ignore',
  });
  for (let i = 0; i < 50; i++) {
    try {
      await fetch(url);
      break;
    } catch {
      await new Promise((r) => setTimeout(r, 200));
    }
  }
}
let browser;
try {
  browser = await chromium.launch({
    headless: true,
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto(url + '?qa=1');
  await page.waitForFunction(() => window.__haven?.ready, {}, { timeout: 120000 });
  // A real gesture is required before the Web Audio activation assertion.
  await page.getByRole('button', { name: /Make yourself at home|Welcome home/ }).click();
  const report = await page.evaluate(() => import('/tests/browser-smoke.js').then((m) => m.runSmoke()));
  await mkdir('test-results', { recursive: true });
  await writeFile('test-results/browser.json', JSON.stringify(report, null, 2));
  console.log(`${report.passed}/${report.checks.length} browser checks passed`);
  if (report.failed.length) {
    console.error(report.failed);
    process.exitCode = 1;
  }
} finally {
  await browser?.close();
  server?.kill();
}
