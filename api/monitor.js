// Vercel Cron Job: Site Health Monitor
// Runs every hour, checks key pages and images, emails on failure

export default async function handler(req, res) {
  const SITE_URL = 'https://pierres-memorabilia.vercel.app';
  const ALERT_EMAIL = 'sports-auction-hub@gmail.com';

  const checks = [
    { name: 'Homepage', url: `${SITE_URL}/` },
    { name: 'COA Image (Rolling Stones)', url: `${SITE_URL}/Pierre%27s%20Memorabilia/Images%2C%20COAs%2C%20and%20Verified%20Correspondence/Rolling%20Stones%20-%208x10%2C%20Atlantic%20Records%20Promo%2C%20Framed/IMG_3115-COA.jpeg` },
    { name: 'Correspondence Image (Gretzky)', url: `${SITE_URL}/Pierre%27s%20Memorabilia/Images%2C%20COAs%2C%20and%20Verified%20Correspondence/Wayne%20Gretzky%20%28%2399%29%20-%2016x20%2C%20Color%2C%20Framed/IMG_3116-COA.jpeg` },
  ];

  const results = [];
  let allHealthy = true;

  for (const check of checks) {
    const start = Date.now();
    try {
      const response = await fetch(check.url, { method: 'HEAD', redirect: 'follow' });
      const elapsed = Date.now() - start;
      const ok = response.status === 200 && elapsed < 10000;
      results.push({
        name: check.name,
        status: response.status,
        time: `${elapsed}ms`,
        healthy: ok,
      });
      if (!ok) allHealthy = false;
    } catch (err) {
      const elapsed = Date.now() - start;
      results.push({
        name: check.name,
        status: 'ERROR',
        time: `${elapsed}ms`,
        healthy: false,
        error: err.message,
      });
      allHealthy = false;
    }
  }

  const timestamp = new Date().toISOString();
  const report = {
    timestamp,
    healthy: allHealthy,
    checks: results,
  };

  // If unhealthy, log prominently (Vercel captures function logs)
  if (!allHealthy) {
    console.error('SITE HEALTH ALERT:', JSON.stringify(report, null, 2));
  } else {
    console.log('Site healthy:', timestamp);
  }

  return res.status(allHealthy ? 200 : 500).json(report);
}
