import request from 'supertest';
import app from '../src/server';
import prisma from '../src/utils/prisma';
import fs from 'fs';
import path from 'path';

const MINIMAL_PDF_BASE64 = 'JVBERi0xLjQKMSAwIG9iaiA8PC9UeXBlIC9DYXRhbG9nIC9QYWdlcyAyIDAgUj4+IGVuZG9iaiAyIDAgb2JqIDw8L1R5cGUgL1BhZ2VzIC9LaWRzIFszIDAgUl0gL0NvdW50IDE+PiBlbmRvYmogMyAwIG9iaiA8PC9UeXBlIC9QYWdlIC9QYXJlbnQgMiAwIFIgL01lZGlhQm94IFswIDAgMTAwIDEwMF0+PiBlbmRvYmogeHJlZiAwIDQgMDAwMDAwMDAwMCA2NTUzNSBmIA0KMDAwMDAwMDAwOSAwMDAwMCBuIA0KMDAwMDAwMDU2IDAwMDAwIG4gDQowMDAwMDAwMTExIDAwMDAwIG4gDQp0cmFpbGVyIDw8L1NpemUgNCAvUm9vdCAxIDAgUj4+IHN0YXJ0eHJlZiAxODkgJSVFT0Y=';

async function runManualTests() {
  console.log("Starting manual tests...");
  let userToken = '';
  let documentId = '';
  const testPdfPath = path.join(__dirname, 'fixtures', 'valid.pdf');

  try {

    const bcrypt = require('bcrypt');
    const passwordHash = await bcrypt.hash('password123', 10);
    
    // Cleanup first
    await prisma.aIUsage.deleteMany();
    await prisma.document.deleteMany();
    await prisma.user.deleteMany();

    await prisma.user.create({ data: { name: 'Test User', email: 'test@example.com', passwordHash } });
    
    const res1 = await request(app).post('/api/auth/login').send({ email: 'test@example.com', password: 'password123' });
    userToken = res1.body.token;

    const uploadRes = await request(app)
      .post('/api/documents')
      .set('Authorization', `Bearer ${userToken}`)
      .attach('file', testPdfPath);
    
    documentId = uploadRes.body.data.id;
    console.log("Document uploaded:", documentId);
    
    // Wait for READY state
    let ready = false;
    for(let i=0; i<60; i++) {
       const docRes = await request(app).get(`/api/documents/${documentId}`).set('Authorization', `Bearer ${userToken}`);
       if (docRes.body.data.status === 'READY') {
           ready = true;
           break;
       }
       await new Promise(r => setTimeout(r, 1000));
    }

    if (!ready) {
        console.error("Document never reached READY state");
        return;
    }

    console.log("\n--- TEST 1: 'what is FastAPI?' ---");
    const res1_chat = await request(app).post('/api/ai/agent').set('Authorization', `Bearer ${userToken}`).send({ documentId, message: 'what is FastAPI?' });
    console.log(JSON.stringify(res1_chat.body, null, 2));

    console.log("\n--- TEST 2: 'generate a 2 question quiz' ---");
    const res2_chat = await request(app).post('/api/ai/agent').set('Authorization', `Bearer ${userToken}`).send({ documentId, message: 'generate a 2 question quiz' });
    console.log(JSON.stringify(res2_chat.body, null, 2));

    console.log("\n--- TEST 3: 'what is FastAPI and generate a 2 question quiz' ---");
    const res3_chat = await request(app).post('/api/ai/agent').set('Authorization', `Bearer ${userToken}`).send({ documentId, message: 'what is FastAPI and generate a 2 question quiz' });
    console.log(JSON.stringify(res3_chat.body, null, 2));

  } catch (err) {
    console.error("Test failed", err);
  } finally {
    process.exit(0);
  }
}

runManualTests();
