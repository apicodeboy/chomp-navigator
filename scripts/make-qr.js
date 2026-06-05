/**
 * Generates a QR code PNG for a URL.
 *
 *   node scripts/make-qr.js [url] [outfile]
 *
 * Defaults to the local GL-JS demo on this machine's LAN IP. Re-run with your own
 * hosted URL (GitHub Pages / Netlify / your laptop on the same WiFi) to make a QR
 * your phone can actually open:
 *
 *   node scripts/make-qr.js https://your-host/chomp-demo assets/demo-qr.png
 */
const QRCode = require('qrcode');
const path = require('path');
const os = require('os');

function lanIp() {
  const ifs = os.networkInterfaces();
  for (const name of Object.keys(ifs)) {
    for (const i of ifs[name] || []) {
      if (i.family === 'IPv4' && !i.internal) return i.address;
    }
  }
  return 'localhost';
}

const url = process.argv[2] || `http://${lanIp()}:8421`;
const out = process.argv[3] || path.join(__dirname, '..', 'assets', 'demo-qr.png');

QRCode.toFile(out, url, { width: 512, margin: 2, color: { dark: '#141414', light: '#ffffff' } })
  .then(() => {
    console.log('Wrote', out);
    console.log('Encodes:', url);
    // also print a scannable QR right in the terminal
    return QRCode.toString(url, { type: 'terminal', small: true });
  })
  .then((ascii) => console.log(ascii))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
