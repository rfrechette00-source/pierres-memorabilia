// @ts-check
const { test, expect } = require('@playwright/test');

// Verify every card's expanded image loads at full resolution, not a blurry
// downscaled version. A Retina (2x DPR) display needs ~2200px of actual pixel
// data for an 1100px-wide modal, and 3x needs ~3300px. Every card's detail
// image should be at least 2000px on its longest side.

test.describe.configure({ mode: 'serial' });

test.setTimeout(240000);

test('every card opens a detail image with full-res natural dimensions', async ({ page }) => {
  await page.goto('/');

  const cards = page.locator('.card');
  const count = await cards.count();
  expect(count).toBeGreaterThanOrEqual(44);

  const results = [];
  const failures = [];

  for (let i = 0; i < count; i++) {
    const card = cards.nth(i);
    const title = (await card.locator('h3').textContent() || '').trim();
    const imgId = await card.getAttribute('data-img');

    try {
      await card.scrollIntoViewIfNeeded();
      await card.locator('.card-thumb').click();
      await expect(page.locator('#card-detail')).toHaveClass(/active/, { timeout: 3000 });

      const info = await page.waitForFunction(() => {
        const img = /** @type {HTMLImageElement} */ (document.getElementById('detail-img'));
        if (!img) return null;
        if (!img.complete) return null;
        if (!img.naturalWidth || !img.naturalHeight) return null;
        return {
          src: img.currentSrc || img.src,
          natW: img.naturalWidth,
          natH: img.naturalHeight,
          dispW: img.getBoundingClientRect().width,
          dispH: img.getBoundingClientRect().height,
        };
      }, null, { timeout: 20000 }).then(h => h.jsonValue());

      const maxDim = Math.max(info.natW, info.natH);
      const row = {
        i, imgId, title,
        src: info.src.replace(/^https?:\/\/[^/]+/, ''),
        natural: `${info.natW}x${info.natH}`,
        display: `${Math.round(info.dispW)}x${Math.round(info.dispH)}`,
        maxDim,
      };
      results.push(row);

      const flag = maxDim < 2000 ? '  LOW-RES' : maxDim < 3000 ? '  medium' : '  OK';
      console.log(`${flag} i=${i} [${imgId}] ${title}: natural ${row.natural}  display ${row.display}  src ${row.src}`);
    } catch (e) {
      const errMsg = (e && e.message) ? e.message.split('\n')[0] : String(e);
      console.log(`  FAIL    i=${i} [${imgId}] ${title}: ${errMsg}`);
      failures.push({ i, imgId, title, error: errMsg });
    }

    // Always try to close the modal between iterations
    await page.keyboard.press('Escape').catch(() => {});
    await page.waitForTimeout(150);
  }

  const lowRes = results.filter(r => r.maxDim < 2000);
  console.log(`\n=== SUMMARY: ${results.length} ok, ${lowRes.length} low-res, ${failures.length} failed ===`);

  expect(
    failures,
    `Failures:\n${failures.map(f => `  i=${f.i} [${f.imgId}] ${f.title}: ${f.error}`).join('\n')}`,
  ).toHaveLength(0);

  expect(
    lowRes,
    `Low-res detail images (max dim < 2000px):\n${lowRes.map(r => `  [${r.imgId}] ${r.title}: ${r.natural} — ${r.src}`).join('\n')}`,
  ).toHaveLength(0);
});

test('no detail image returns a 404 or non-200 response', async ({ page }) => {
  /** @type {string[]} */
  const bad = [];
  page.on('response', resp => {
    const url = resp.url();
    if (url.includes('/images/card-') && resp.status() !== 200 && resp.status() !== 304) {
      bad.push(`${resp.status()} ${url}`);
    }
  });

  await page.goto('/');
  const cards = page.locator('.card');
  const count = await cards.count();

  for (let i = 0; i < count; i++) {
    const card = cards.nth(i);
    await card.scrollIntoViewIfNeeded();
    await card.locator('.card-thumb').click();
    await expect(page.locator('#card-detail')).toHaveClass(/active/, { timeout: 3000 });
    await page.waitForFunction(() => {
      const img = /** @type {HTMLImageElement} */ (document.getElementById('detail-img'));
      return img && img.complete && img.naturalWidth > 0;
    }, null, { timeout: 20000 }).catch(() => {});
    await page.keyboard.press('Escape').catch(() => {});
    await page.waitForTimeout(150);
  }

  expect(bad, `Bad image responses:\n${bad.join('\n')}`).toHaveLength(0);
});
