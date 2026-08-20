import dns from 'node:dns';

// [DNS WORKAROUND]
// Apply this override immediately upon module load before any other imports
// so that the MongoDB driver or c-ares initializes with the correct DNS servers.
const currentServers = dns.getServers();
if (currentServers.length === 1 && currentServers[0] === '127.0.0.1') {
  console.log('Detected Node.js local DNS fallback (127.0.0.1). Applying DNS override globally for MongoDB Atlas SRV resolution...');
  dns.setServers(['8.8.8.8', '1.1.1.1']);
}
