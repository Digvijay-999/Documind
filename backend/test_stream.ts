import jwt from 'jsonwebtoken';

const token = jwt.sign(
  { id: '0759d5a2-06f8-4c41-8326-eeb5d26e7f00', role: 'USER' },
  'super_secret_jwt_key_for_development',
  { expiresIn: '1d' }
);

async function testStream() {
  const res = await fetch('http://localhost:5000/api/ai/chat/stream', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      documentId: '4de1b374-06cb-44e3-b637-16f4f19cf838',
      question: 'what is this repo about'
    })
  });

  console.log('Status:', res.status);
  console.log('Headers:', res.headers);
  const text = await res.text();
  console.log('Body:', text);
}

testStream().catch(console.error);
