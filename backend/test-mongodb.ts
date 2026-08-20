
import dns from 'node:dns';
import { MongoClient } from 'mongoose/node_modules/mongodb';
import mongoose from 'mongoose';

async function test() {
  console.log('Before override:', dns.getServers());
  
  const currentServers = dns.getServers();
  if (currentServers.length === 1 && currentServers[0] === '127.0.0.1') {
    dns.setServers(['8.8.8.8', '1.1.1.1']);
    console.log('After override:', dns.getServers());
  }

  try {
    const srv = await dns.promises.resolveSrv('_mongodb._tcp.cluster0.yeqh0ko.mongodb.net');
    console.log('resolveSrv SUCCESS:', srv.length, 'records');
  } catch(e) {
    console.error('resolveSrv FAIL:', e);
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('No URI');

  try {
    const client = new MongoClient(uri);
    await client.connect();
    console.log('MongoClient SUCCESS');
    await client.close();
  } catch(e) {
    console.error('MongoClient FAIL:', e.message);
  }

  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    console.log('Mongoose SUCCESS');
    await mongoose.disconnect();
  } catch(e) {
    console.error('Mongoose FAIL:', e.message);
  }
}

test().catch(console.error);
