exports.handler = async (event, context) => {
  // CORS 헤더 설정
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // OPTIONS 요청 처리 (CORS preflight)
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // POST 요청만 허용
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const formData = JSON.parse(event.body);

    // 디버깅: 환경 변수 확인
    console.log('DATA_SOURCE_ID:', process.env.DATA_SOURCE_ID);
    console.log('NOTION_API_KEY exists:', !!process.env.NOTION_API_KEY);

    // 중복 체크: 강제 저장이 아닌 경우에만 실행
    if (!formData.force) {
      const duplicateCheck = await fetch(`https://api.notion.com/v1/databases/${process.env.DATA_SOURCE_ID}/query`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.NOTION_API_KEY}`,
          'Content-Type': 'application/json',
          'Notion-Version': '2022-06-28'
        },
        body: JSON.stringify({
          filter: {
            and: [
              {
                property: '이름`',
                relation: {
                  contains: formData.memberId
                }
              },
              {
                property: '달린 날짜',
                date: {
                  equals: formData.date
                }
              }
            ]
          }
        })
      });

      const duplicateData = await duplicateCheck.json();

      if (duplicateCheck.ok && duplicateData.results && duplicateData.results.length > 0) {
        return {
          statusCode: 409,
          headers,
          body: JSON.stringify({
            error: '이미 해당 날짜에 기록이 존재합니다.',
            duplicate: true
          })
        };
      }
    }

    // Notion API 호출
    const response = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.NOTION_API_KEY}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28'
      },
      body: JSON.stringify({
        parent: {
          type: 'data_source_id',
          data_source_id: process.env.DATA_SOURCE_ID
        },
        properties: {
          '오늘의 한줄 제목/Story': {
            title: [{ text: { content: formData.title } }]
          },
          '이름`': {
            relation: [{ id: formData.memberId }]
          },
          '달린 날짜': {
            date: { start: formData.date }
          },
          '달린 시간(분)': {
            number: parseInt(formData.duration)
          },
          '달리기 전 생각/느낌': {
            rich_text: [{ text: { content: formData.before } }]
          },
          '달리기 중 생각/느낌': {
            rich_text: [{ text: { content: formData.during } }]
          },
          '달리기 후 생각/느낌': {
            rich_text: [{ text: { content: formData.after } }]
          },
          ...(formData.location ? {
            '달린 장소': {
              rich_text: [{ text: { content: formData.location } }]
            }
          } : {})
        }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({ 
          error: data.message || 'Notion API 오류',
          details: data
        })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true,
        url: data.url 
      })
    };

  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: error.message 
      })
    };
  }
};
