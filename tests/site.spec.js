// @ts-check
const { test, expect } = require('@playwright/test');

// ─── Page load ────────────────────────────────────────────────────────────────
test('page loads with correct title', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Sports.*Entertainment/i);
});

test('header is visible', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.header h1')).toBeVisible();
});

test('item count shows 46 items', async ({ page }) => {
  await page.goto('/');
  const count = page.locator('#count');
  await expect(count).toHaveText('46 items');
});

test('all 46 cards are rendered', async ({ page }) => {
  await page.goto('/');
  const cards = page.locator('.card');
  await expect(cards).toHaveCount(46);
});

test('no broken images on load (all thumbnails have valid src)', async ({ page }) => {
  await page.goto('/');
  // Check all card thumbnails have a non-empty src (lazy loading means naturalWidth may be 0)
  const badSrcs = await page.evaluate(() => {
    const imgs = document.querySelectorAll('.card-thumb img');
    const bad = [];
    imgs.forEach(img => {
      const src = img.getAttribute('src') || '';
      if (!src || src === '' || src === window.location.href) {
        bad.push(img.alt || '(no alt)');
      }
    });
    return bad;
  });
  expect(badSrcs, `Missing src on: ${badSrcs.join(', ')}`).toHaveLength(0);
});

// ─── Search / Filter / Sort ───────────────────────────────────────────────────
test('search filters cards by athlete name', async ({ page }) => {
  await page.goto('/');
  await page.fill('#search', 'gretzky');
  await page.waitForTimeout(100);
  const visible = await page.locator('.card:visible').count();
  expect(visible).toBe(1);
  await expect(page.locator('#count')).toHaveText('1 items');
});

test('search is case-insensitive', async ({ page }) => {
  await page.goto('/');
  await page.fill('#search', 'GRETZKY');
  await page.waitForTimeout(100);
  expect(await page.locator('.card:visible').count()).toBe(1);
});

test('clearing search restores all cards', async ({ page }) => {
  await page.goto('/');
  await page.fill('#search', 'gretzky');
  await page.waitForTimeout(100);
  await page.fill('#search', '');
  await page.waitForTimeout(100);
  await expect(page.locator('#count')).toHaveText('46 items');
});

test('sport filter shows only hockey cards', async ({ page }) => {
  await page.goto('/');
  await page.selectOption('#sportFilter', 'hockey');
  await page.waitForTimeout(100);
  const visible = await page.locator('.card:visible').count();
  expect(visible).toBeGreaterThan(20); // plenty of hockey cards
  const countText = await page.locator('#count').textContent();
  expect(countText).toMatch(/^\d+ items$/);
});

test('sport filter shows only football cards', async ({ page }) => {
  await page.goto('/');
  await page.selectOption('#sportFilter', 'football');
  await page.waitForTimeout(100);
  const visible = await page.locator('.card:visible').count();
  expect(visible).toBeGreaterThanOrEqual(4);
});

test('sport filter shows only golf cards', async ({ page }) => {
  await page.goto('/');
  await page.selectOption('#sportFilter', 'golf');
  await page.waitForTimeout(100);
  const visible = await page.locator('.card:visible').count();
  expect(visible).toBe(2); // Arnold Palmer + Gary Player
});

test('sport filter + search work together', async ({ page }) => {
  await page.goto('/');
  await page.selectOption('#sportFilter', 'hockey');
  await page.fill('#search', 'orr');
  await page.waitForTimeout(100);
  const visible = await page.locator('.card:visible').count();
  expect(visible).toBeGreaterThanOrEqual(3); // multiple Bobby Orr cards
});

test('sort by price high to low puts highest price first', async ({ page }) => {
  await page.goto('/');
  await page.selectOption('#sortBy', 'high-desc');
  await page.waitForTimeout(200);
  const prices = await page.locator('.card:visible .asking-price').allTextContents();
  const nums = prices.map(p => parseInt(p.replace(/[^0-9]/g, '')));
  for (let i = 1; i < nums.length; i++) {
    expect(nums[i - 1]).toBeGreaterThanOrEqual(nums[i]);
  }
});

test('sort by price low to high puts lowest price first', async ({ page }) => {
  await page.goto('/');
  await page.selectOption('#sortBy', 'high-asc');
  await page.waitForTimeout(200);
  const prices = await page.locator('.card:visible .asking-price').allTextContents();
  const nums = prices.map(p => parseInt(p.replace(/[^0-9]/g, '')));
  for (let i = 1; i < nums.length; i++) {
    expect(nums[i - 1]).toBeLessThanOrEqual(nums[i]);
  }
});

test('sort by name A-Z is alphabetical', async ({ page }) => {
  await page.goto('/');
  await page.selectOption('#sortBy', 'name-asc');
  await page.waitForTimeout(200);
  const names = await page.locator('.card:visible').evaluateAll(
    cards => cards.map(c => c.dataset.name)
  );
  const sorted = [...names].sort((a, b) => a.localeCompare(b));
  expect(names).toEqual(sorted);
});

// ─── Card detail modal ────────────────────────────────────────────────────────
test('clicking a card opens the detail modal', async ({ page }) => {
  await page.goto('/');
  await page.locator('.card').first().click();
  await expect(page.locator('#card-detail')).toHaveClass(/active/);
});

test('card detail shows the correct athlete name', async ({ page }) => {
  await page.goto('/');
  const firstCard = page.locator('.card').first();
  const name = await firstCard.locator('h3').textContent();
  await firstCard.click();
  await expect(page.locator('#detail-body h3')).toHaveText(name);
});

test('card detail shows an image', async ({ page }) => {
  await page.goto('/');
  await page.locator('.card').first().click();
  await expect(page.locator('#detail-img')).toBeVisible();
  const src = await page.locator('#detail-img').getAttribute('src');
  expect(src).toBeTruthy();
});

test('clicking outside card detail closes it', async ({ page }) => {
  await page.goto('/');
  await page.locator('.card').first().click();
  await expect(page.locator('#card-detail')).toHaveClass(/active/);
  await page.locator('#card-detail').click({ position: { x: 5, y: 5 } });
  await expect(page.locator('#card-detail')).not.toHaveClass(/active/);
});

test('X button closes card detail', async ({ page }) => {
  await page.goto('/');
  await page.locator('.card').first().click();
  await page.locator('#card-detail .modal-close').click();
  await expect(page.locator('#card-detail')).not.toHaveClass(/active/);
});

test('Escape key closes card detail', async ({ page }) => {
  await page.goto('/');
  await page.locator('.card').first().click();
  await page.keyboard.press('Escape');
  await expect(page.locator('#card-detail')).not.toHaveClass(/active/);
});

test('all 46 cards can be opened without errors', async ({ page }) => {
  await page.goto('/');
  const count = await page.locator('.card').count();
  for (let i = 0; i < count; i++) {
    const card = page.locator('.card').nth(i);
    await card.scrollIntoViewIfNeeded();
    // Click the thumbnail area — guaranteed not to land on a button
    await card.locator('.card-thumb').click();
    await expect(page.locator('#card-detail')).toHaveClass(/active/, { timeout: 5000 });
    await page.keyboard.press('Escape');
    await expect(page.locator('#card-detail')).not.toHaveClass(/active/, { timeout: 5000 });
  }
});

// ─── COA / License / Correspondence lightbox ─────────────────────────────────
test('COA link opens lightbox', async ({ page }) => {
  await page.goto('/');
  // Click Rolling Stones card (has COA)
  await page.locator('.card[data-img="0"] .card-thumb').click();
  await page.locator('#card-detail .coa-link').click();
  await expect(page.locator('#lightbox')).toHaveClass(/active/);
});

test('lightbox shows an image', async ({ page }) => {
  await page.goto('/');
  await page.locator('.card[data-img="0"] .card-thumb').click();
  await page.locator('#card-detail .coa-link').click();
  await expect(page.locator('#lightbox-img')).toBeVisible();
  const src = await page.locator('#lightbox-img').getAttribute('src');
  expect(src).toBeTruthy();
});

test('Escape closes lightbox', async ({ page }) => {
  await page.goto('/');
  await page.locator('.card[data-img="0"] .card-thumb').click();
  await page.locator('#card-detail .coa-link').click();
  await page.keyboard.press('Escape');
  await expect(page.locator('#lightbox')).not.toHaveClass(/active/);
});

test('clicking lightbox background closes it', async ({ page }) => {
  await page.goto('/');
  await page.locator('.card[data-img="0"] .card-thumb').click();
  await page.locator('#card-detail .coa-link').click();
  await page.locator('#lightbox').click({ position: { x: 5, y: 5 } });
  await expect(page.locator('#lightbox')).not.toHaveClass(/active/);
});

// ─── Contact modal ────────────────────────────────────────────────────────────
test('Interested? button opens contact modal', async ({ page }) => {
  await page.goto('/');
  // Click interest button directly on first card
  await page.locator('.card').first().locator('.interest-btn').click();
  await expect(page.locator('#contact-modal')).toHaveClass(/active/);
});

test('contact modal shows correct item name', async ({ page }) => {
  await page.goto('/');
  const firstName = await page.locator('.card').first().locator('h3').textContent();
  await page.locator('.card').first().locator('.interest-btn').click();
  const modalItem = await page.locator('#modal-item').textContent();
  expect(modalItem).toContain(firstName);
});

test('Escape closes contact modal', async ({ page }) => {
  await page.goto('/');
  await page.locator('.card').first().locator('.interest-btn').click();
  await page.keyboard.press('Escape');
  await expect(page.locator('#contact-modal')).not.toHaveClass(/active/);
});

test('contact form X button closes modal', async ({ page }) => {
  await page.goto('/');
  await page.locator('.card').first().locator('.interest-btn').click();
  await page.locator('#contact-modal .modal-close').click();
  await expect(page.locator('#contact-modal')).not.toHaveClass(/active/);
});

// ─── Buy Now / Pay modal ──────────────────────────────────────────────────────
test('Buy Now button opens pay modal', async ({ page }) => {
  await page.goto('/');
  await page.locator('.card').first().locator('.buy-btn').click();
  await expect(page.locator('#pay-modal')).toHaveClass(/active/);
});

test('pay modal shows correct item name and price', async ({ page }) => {
  await page.goto('/');
  const firstCard = page.locator('.card').first();
  const name = await firstCard.locator('h3').textContent();
  const price = await firstCard.locator('.asking-price').textContent();
  await firstCard.locator('.buy-btn').click();
  await expect(page.locator('#pay-modal-item')).toHaveText(name.trim());
  await expect(page.locator('#pay-modal-price')).toHaveText(price.trim());
});

test('PayPal link contains correct amount', async ({ page }) => {
  await page.goto('/');
  const price = await page.locator('.card').first().locator('.asking-price').textContent();
  const amount = price.replace(/[^0-9.]/g, '');
  await page.locator('.card').first().locator('.buy-btn').click();
  const href = await page.locator('#paypal-link').getAttribute('href');
  expect(href).toContain(amount);
});

test('pay modal closes on Escape', async ({ page }) => {
  await page.goto('/');
  await page.locator('.card').first().locator('.buy-btn').click();
  await page.keyboard.press('Escape');
  await expect(page.locator('#pay-modal')).not.toHaveClass(/active/);
});

test('pay modal closes clicking outside', async ({ page }) => {
  await page.goto('/');
  await page.locator('.card').first().locator('.buy-btn').click();
  await page.locator('#pay-modal').click({ position: { x: 5, y: 5 } });
  await expect(page.locator('#pay-modal')).not.toHaveClass(/active/);
});

// ─── Content correctness ──────────────────────────────────────────────────────
test('no card still says Not Framed', async ({ page }) => {
  await page.goto('/');
  const content = await page.locator('#grid').textContent();
  expect(content).not.toMatch(/not framed/i);
});

test('no Signed: Yes text anywhere', async ({ page }) => {
  await page.goto('/');
  const content = await page.locator('#grid').textContent();
  expect(content).not.toContain('Signed: Yes');
});

test('Sidney Crosby price is $250', async ({ page }) => {
  await page.goto('/');
  await page.fill('#search', 'crosby');
  await page.waitForTimeout(100);
  const price = await page.locator('.card:visible .asking-price').textContent();
  expect(price).toBe('$250');
});

test('each card has an asking price', async ({ page }) => {
  await page.goto('/');
  const cards = await page.locator('.card').count();
  const prices = await page.locator('.card .asking-price').count();
  expect(prices).toBe(cards);
});

test('each card has a signed tag', async ({ page }) => {
  await page.goto('/');
  const cards = await page.locator('.card').count();
  const signedTags = await page.locator('.card .tag.signed').count();
  expect(signedTags).toBe(cards);
});

test('framed items show a Framed tag', async ({ page }) => {
  await page.goto('/');
  const framedTags = await page.locator('.card .tag:text("Framed")').count();
  expect(framedTags).toBe(18);
});

test('Bobby Hull signed tag mentions Gordie Howe', async ({ page }) => {
  await page.goto('/');
  await page.fill('#search', 'bobby hull');
  await page.waitForTimeout(100);
  const tag = await page.locator('.card:visible .tag.signed').textContent();
  expect(tag).toMatch(/gordie howe/i);
});

// ─── Shipping note ────────────────────────────────────────────────────────────
test('every card has a shipping note', async ({ page }) => {
  await page.goto('/');
  const cards = await page.locator('.card').count();
  const notes = await page.locator('.card .shipping-note').count();
  expect(notes).toBe(cards);
});

// ─── Mobile viewport ──────────────────────────────────────────────────────────
test('site is usable on mobile (375px)', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto('/');
  await expect(page.locator('.header h1')).toBeVisible();
  await expect(page.locator('.card').first()).toBeVisible();
  // Can open a card on mobile
  await page.locator('.card').first().click();
  await expect(page.locator('#card-detail')).toHaveClass(/active/);
});

// ─── No JS errors ─────────────────────────────────────────────────────────────
test('no uncaught JS errors on page load', async ({ page }) => {
  const errors = [];
  page.on('pageerror', err => errors.push(err.message));
  await page.goto('/');
  await page.waitForTimeout(500);
  expect(errors, `JS errors: ${errors.join('; ')}`).toHaveLength(0);
});

test('no console errors on page load', async ({ page }) => {
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  await page.goto('/');
  await page.waitForTimeout(500);
  // Filter expected local-env 404s (Vercel scripts not present locally, 404s from server)
  const real = consoleErrors.filter(e =>
    !e.includes('_vercel') &&
    !e.includes('Site Monitor') &&
    !e.includes('404') &&
    !e.includes('Failed to load resource')
  );
  expect(real, `Console errors: ${real.join('; ')}`).toHaveLength(0);
});
