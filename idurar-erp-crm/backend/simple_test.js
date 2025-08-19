const https = require('https');

console.log('Testing network connection to MongoDB Atlas...');

const options = {
  hostname: 'cluster0.nky9l.mongodb.net',
  port: 443,
  path: '/',
  method: 'GET'
};

const req = https.request(options, (res) => {
  console.log(`✅ Network connection successful! Status: ${res.statusCode}`);
  process.exit(0);
});

req.on('error', (e) => {
  console.error(`❌ Network connection failed: ${e.message}`);
  process.exit(1);
});

req.setTimeout(10000, () => {
  console.error('❌ Network connection timeout');
  req.destroy();
  process.exit(1);
});

req.end();

