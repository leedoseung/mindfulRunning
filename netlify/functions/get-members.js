/**
 * Netlify Function: get-members
 * Notion의 멤버 데이터베이스에서 멤버 목록을 조회합니다.
 */

exports.handler = async (event, context) => {
  // CORS 헤더 설정
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
  };

  // OPTIONS 요청 처리 (CORS preflight)
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  // GET 요청만 허용
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  try {
    // Notion API 호출
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
          page_size: 100,
          sorts: [
            {
              property: 'Name',
              direction: 'ascending'
            }
          ]
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch members');
    }

    // 멤버 데이터 가공
    const members = data.results.map(page => {
      const props = page.properties;
      
      return {
        id: page.id,
        name: props.Name?.title?.[0]?.text?.content || '이름 없음',
        group: props['그룹']?.select?.name || '',
        location: props['주활동']?.select?.name || ''
      };
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        members,
        count: members.length
      })
    };

  } catch (error) {
    console.error('Error fetching members:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to fetch members',
        message: error.message
      })
    };
  }
};
