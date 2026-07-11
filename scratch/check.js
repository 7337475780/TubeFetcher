const fs = require('fs');
const path = require('path');

// Manually load .env.local
try {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8');
    content.split('\n').forEach(line => {
      const parts = line.split('=');
      if (parts.length >= 2) {
        const key = parts[0].trim();
        let val = parts.slice(1).join('=').trim();
        // Strip quotes
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (key && !key.startsWith('#')) {
          process.env[key] = val;
        }
      }
    });
  }
} catch (e) {
  console.error("Failed to load .env.local", e);
}

// Import CookieManager
const { CookieManager } = require('../lib/downloader/CookieManager');
console.log(CookieManager.getDiagnostics());
