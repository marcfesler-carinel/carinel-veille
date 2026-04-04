const { getStore } = require("@netlify/blobs");

exports.handler = async (event, context) => {
  try {
    const { jobId } = JSON.parse(event.body || '{}');
    
    if (!jobId) {
      console.error('No jobId provided');
      return { statusCode: 400 };
    }

    const store = getStore("veille-jobs");
    const job = await store.get(jobId, { type: 'json' });

    if (!job) {
      console.error('Job not found:', jobId);
      return { statusCode: 404 };
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      await store.setJSON(jobId, { ...job, status: 'error', error: 'API key not configured' });
      return { statusCode: 500 };
    }

    // Mettre à jour le statut
    await store.setJSON(jobId, { ...job, status: 'processing' });

    // Appel API Anthropic avec web search
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
        system: job.params.system,
        messages: job.params.messages,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }]
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      await store.setJSON(jobId, { 
        ...job, 
        status: 'error', 
        error: errorData.error?.message || 'API error' 
      });
      return { statusCode: response.status };
    }

    const data = await response.json();
    
    // Extraire le texte
    let resultText = '';
    if (data.content && Array.isArray(data.content)) {
      for (const block of data.content) {
        if (block.type === 'text') {
          resultText += block.text;
        }
      }
    }

    // Sauvegarder le résultat
    await store.setJSON(jobId, {
      ...job,
      status: 'completed',
      content: resultText,
      completedAt: new Date().toISOString()
    });

    return { statusCode: 200 };

  } catch (error) {
    console.error('Background error:', error);
    return { statusCode: 500 };
  }
};
