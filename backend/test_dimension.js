async function checkDimension() {
  const apiKey = process.env.OPENROUTER_API_KEY || '';
  if (!apiKey) {
    console.error('OPENROUTER_API_KEY is not set in environment.');
    return;
  }
  const url = 'https://openrouter.ai/api/v1/embeddings';

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'nvidia/nemotron-3-embed-1b:free',
        input: 'Test string to determine embedding dimension.'
      })
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('API Error:', response.status, err);
      return;
    }

    const data = await response.json();
    if (data.data && data.data.length > 0 && data.data[0].embedding) {
      const dimension = data.data[0].embedding.length;
      console.log('Successfully retrieved embedding!');
      console.log('Embedding Dimension:', dimension);
    } else {
      console.error('Unexpected response format:', JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.error('Fetch error:', error);
  }
}

checkDimension();
