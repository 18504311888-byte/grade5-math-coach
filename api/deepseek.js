export default async function handler(request, response) {
  const origin = request.headers.origin || '*';
  response.setHeader('Access-Control-Allow-Origin', origin);
  response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  response.setHeader('Vary', 'Origin');

  if (request.method === 'OPTIONS') {
    return response.status(204).end();
  }

  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST, OPTIONS');
    return response.status(405).json({ error: 'Only POST is allowed' });
  }

  const { question, context } = request.body || {};
  if (!question || typeof question !== 'string') {
    return response.status(400).json({ error: 'question is required' });
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return response.status(500).json({ error: 'DeepSeek API key is not configured' });
  }

  const prompt = `你是一位适合中国五年级学生的数学学习教练。不要直接给最终答案，先用简短提示引导学生思考。语言要简单、鼓励、适合小学生。优先追问：单位1是谁？题目要求什么？第一步应该做什么？如果学生已经说出思路，再指出下一步。\n\n当前学习上下文：${context || '五年级下册数学'}\n\n学生问题：${question}`;

  try {
    const upstream = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: '你是耐心的五年级数学学习教练。' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.4,
        max_tokens: 500,
      }),
    });

    const data = await upstream.json();
    if (!upstream.ok) {
      return response.status(upstream.status).json({ error: data.error?.message || 'DeepSeek request failed' });
    }

    return response.status(200).json({ answer: data.choices?.[0]?.message?.content || '我还没想好，请再问一次。' });
  } catch (error) {
    return response.status(500).json({ error: 'Unable to contact DeepSeek' });
  }
}
