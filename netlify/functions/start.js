const { getStore } = require("@netlify/blobs");

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  try {
    const body = JSON.parse(event.body);
    const jobId = `job_${Date.now()}`;

    const store = getStore("veille-jobs");
    await store.setJSON(jobId, {
      status: 'pending',
      params: body,
      createdAt: new Date().toISOString()
    });

    // Déclencher la fonction background
    const siteUrl = process.env.URL || 'https://veille.carinel.com';
    fetch(`${siteUrl}/.netlify/functions/generate-background`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId })
    }).catch(() => {});

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ jobId, status: 'pending' })
    };

  } catch (error) {
    console.error('Start error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
