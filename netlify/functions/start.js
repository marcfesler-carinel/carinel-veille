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

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const body = JSON.parse(event.body);
    const { system, messages } = body;

    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const store = getStore("veille-jobs");
    await store.setJSON(jobId, {
      status: 'pending',
      system,
      messages,
      createdAt: new Date().toISOString()
    });

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
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
