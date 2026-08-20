import dns from 'node:dns';
import { connectMongoDB } from './src/config/mongodb';
import { connectRedis } from './src/config/redis';

Promise.all([connectMongoDB(), connectRedis()]).then(() => { 
  console.log('DONE'); 
  process.exit(0); 
}).catch(console.error);
