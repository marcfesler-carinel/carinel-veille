const { getStore } = require("@netlify/blobs");

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  try {
    const jobId = event.queryStringParameters?.jobId;
    
    if (!jobId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'jobId required' })
      };
    }

    const store = getStore("veille-jobs");
    const job = await store.get(jobId, { type: 'json' });

    if (!job) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Job not found', status: 'not_found' })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(job)
    };

  } catch (error) {
    console.error('Status error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
