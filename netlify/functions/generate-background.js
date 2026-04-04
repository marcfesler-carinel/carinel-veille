const { getStore } = require("@netlify/blobs");

exports.handler = async (event, context) => {
  console.log('Background function started');
  
  try {
    const body = JSON.parse(event.body);
    const { jobId } = body;

    if (!jobId) {
      console.error('No jobId');
      return { statusCode: 400 };
    }

    const store = getStore("veille-jobs");
    const job = await store.get(jobId, { type: 'json' });
    
    if (!job) {
      console.error('Job not found:', jobId);
      return { statusCode: 404 };
    }

    await store.setJSON(jobId, { ...job, status: 'processing' });

    let apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      await store.setJSON(jobId, { ...job, status: 'error', error: 'API key not configured' });
      return { statusCode: 500 };
    }
    apiKey = apiKey.trim().replace(/['"]/g, '').replace(/\s/g, '');

    console.log('Calling Anthropic API...');

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        system: job.system || '',
        messages: job.messages,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error:', errorText);
      await store.setJSON(jobId, { 
        ...job, 
        status: 'error', 
        error: `API error: ${response.status}`,
        completedAt: new Date().toISOString()
      });
      return { statusCode: 200 };
    }

    const data = await response.json();
    console.log('API response received');

    await store.setJSON(jobId, {
      ...job,
      status: 'completed',
      result: data,
      completedAt: new Date().toISOString()
    });

    console.log('Job completed:', jobId);
    return { statusCode: 200 };

  } catch (error) {
    console.error('Error:', error);
    return { statusCode: 200 };
  }
};

exports.config = {
  type: "background"
};
