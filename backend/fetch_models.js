const fs = require('fs');
require('dotenv').config();

fetch('https://api.groq.com/openai/v1/models', {
  headers: {
    'Authorization': 'Bearer ' + process.env.GROQ_API_KEY
  }
}).then(r => r.json()).then(data => {
  console.log(data.data.map(m => m.id));
}).catch(console.error);
