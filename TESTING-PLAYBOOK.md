# Site QA Playbook

How to fully test a static single-page memorabilia/catalog site.
Adapt the GitHub Pages URL where noted.

---

## Step 1 — HTML Static Analysis (htmlhint)

```bash
npm install -g htmlhint          # one-time
htmlhint index.html
```

Expects: **"Scanned 1 files, no errors found."**

If errors appear, fix the reported line/column before proceeding.

---

## Step 2 — Verify All File Paths

Run the path-checker script (adjust ROOT path constant if repo layout changes):

```bash
python3 .claude/hooks/check-paths.py
```

Expects: **"OK: all N referenced files exist on disk."**

Any `✗` line means an image or document is referenced in the HTML but the file
is missing from the repo. Fix the path or add the file before deploying.

---

## Step 3 — Manual JS Code Review Checklist

Read `index.html` bottom script block and verify:

| Feature | What to check |
|---|---|
| `filterCards()` | searches `data-athlete`, `data-sport`, `data-desc`; updates `#count` |
| `sortCards()` | reads `.asking-price` text, not stale `data-high`; handles commas in prices |
| Sport filter | dropdown values match `data-sport` prefixes (`hockey`, `football`, etc.) |
| `openCardDetail()` | clones `.card-info`; attaches fresh event listeners to cloned COA/buy/interest links |
| `closeCardDetail()` | uses `removeAttribute('src')` (NOT `src = ''`) to avoid 404 requests |
| `closeLightbox()` | uses `removeAttribute('src')` same reason |
| `openPayModal()` | strips non-numeric chars from price for PayPal link |
| Shipping note backfill | JS loop adds note to any card missing `.shipping-note` class |
| Escape key | closes all four modals (lightbox, contact, detail, pay) |
| Backdrop click | each modal closes when clicking outside the content box |

**Known non-issues:**
- BrokenPipeError in Python HTTP server logs = normal, browser closes connections early
- Vercel analytics scripts return 404 locally = expected, not present in local env

---

## Step 4 — Playwright Automated Tests

### One-time setup

```bash
# From the repo root:
node --version    # need v16+
npm install       # installs @playwright/test

# Find a Chromium binary — check common locations:
ls /opt/pw-browsers/chromium*/chrome-linux/chrome 2>/dev/null
which chromium chromium-browser google-chrome 2>/dev/null
```

Edit `playwright.config.js` and set `executablePath` to the path you found above.

For **GitHub Pages**, update `baseURL`:

```js
// playwright.config.js
use: {
  baseURL: 'http://localhost:8765',   // local testing
  // OR for live site testing:
  // baseURL: 'https://yourusername.github.io/repo-name',
  ...
}
```

Remove the `webServer` block entirely when testing the live GitHub Pages URL
(no local server needed).

### Run tests

```bash
# Local (spins up python3 HTTP server automatically):
npx playwright test

# Against live GitHub Pages URL (after updating baseURL above):
npx playwright test
```

### What the 46 tests cover

| Category | Tests |
|---|---|
| Page load | title, header, item count, card count |
| Images | all card thumbnails have valid src |
| Search | by name, case-insensitive, clear restores all |
| Filters | hockey, football, golf, combined |
| Sort | price high→low, price low→high, name A-Z |
| Card detail modal | open, correct name/image, close via X / Escape / backdrop |
| All cards | every one of 45 cards opens and closes |
| COA lightbox | opens, shows image, closes via Escape and backdrop |
| Contact modal | opens, correct item name, closes |
| Buy/Pay modal | opens, item + price correct, PayPal amount, closes |
| Content checks | no "Not Framed", no "Signed: Yes", specific prices, all cards have price/tag/shipping |
| Mobile | usable at 375px viewport |
| Errors | no uncaught JS errors, no unexpected console errors |

### Adapting for GitHub Pages

1. Change `baseURL` in `playwright.config.js` to your Pages URL
2. Remove the `webServer` block (no local server needed)
3. The Vercel analytics filter in the console-error test can be removed (not relevant)
4. If the site uses a subdirectory (`/repo-name/`), update any absolute paths in tests

---

## What these tests will NOT catch

- Whether images look correct visually
- CSS layout issues on specific devices
- Whether PayPal/Zelle payments complete end-to-end
- Whether the contact form email actually opens the mail app
- Touch gestures on real iOS/Android hardware

For those, do a 5-minute manual walkthrough on your phone after each deploy.
