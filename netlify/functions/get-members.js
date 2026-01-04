// Netlify Function: 멤버 목록 가져오기
exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // db-mfrs-member의 data source에서 멤버 목록 조회
    const response = await fetch(
      `https://api.notion.com/v1/databases/${process.env.MEMBER_DATA_SOURCE_ID}/query`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.NOTION_API_KEY}`,
          'Content-Type': 'application/json',
          'Notion-Version': '2022-06-28'
        },
        body: JSON.stringify({
          page_size: 100
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch members');
    }

    // 멤버 목록 추출 (Name과 ID)
    const members = data.results.map(page => ({
      name: page.properties.Name?.title?.[0]?.text?.content || 'Unknown',
      id: page.id,
      url: page.url
    }));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ members })
    };

  } catch (error) {
    console.error('Error fetching members:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
