// Netlify Function: 리더보드 데이터 가져오기
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
    // db-mfrs-member에서 멤버 목록 조회
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

    // 멤버 데이터 파싱 및 누적 달린 횟수로 정렬
    const members = data.results.map(page => {
      const props = page.properties;
      
      return {
        name: props.Name?.title?.[0]?.text?.content || 'Unknown',
        count: props['누적 달린 횟수']?.rollup?.number || 0,
        totalTime: props['누적 달린 시간']?.rollup?.number || 0,
        group: props['그룹']?.select?.name || '',
        location: props['주활동']?.select?.name || '',
        generation: props['기수']?.select?.name || '',
        id: page.id
      };
    });

    // 누적 달린 횟수로 내림차순 정렬
    const leaderboard = members
      .filter(m => m.count > 0) // 0회인 멤버 제외
      .sort((a, b) => b.count - a.count);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        leaderboard,
        totalMembers: leaderboard.length,
        updatedAt: new Date().toISOString()
      })
    };

  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: error.message,
        details: 'Failed to load leaderboard data'
      })
    };
  }
};
