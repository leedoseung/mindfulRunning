// Netlify Function: 최근 달린 기록 가져오기
exports.handler = async (event, context) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    // Search API로 최근 페이지 검색 (최소화)
    const response = await fetch(
      `https://api.notion.com/v1/search`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.NOTION_API_KEY}`,
          "Content-Type": "application/json",
          "Notion-Version": "2022-06-28",
        },
        body: JSON.stringify({
          filter: {
            value: "page",
            property: "object"
          },
          sort: {
            direction: "descending",
            timestamp: "last_edited_time"
          },
          page_size: 10,  // 10개만 조회 (빠른 응답)
        }),
      },
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(JSON.stringify(data));
    }

    // 병렬로 페이지 상세 정보 가져오기 (한 번에 처리)
    const pagePromises = data.results.map(async (page) => {
      try {
        const pageResponse = await fetch(
          `https://api.notion.com/v1/pages/${page.id}`,
          {
            headers: {
              Authorization: `Bearer ${process.env.NOTION_API_KEY}`,
              "Notion-Version": "2022-06-28",
            },
          }
        );
        return await pageResponse.json();
      } catch (err) {
        return null;
      }
    });

    const pages = await Promise.all(pagePromises);

    // database_id로 필터링 + 날짜 있는 것만
    const validRecords = pages
      .filter(p => {
        if (!p || !p.parent) return false;
        const pageDbId = p.parent.database_id?.replace(/-/g, '');
        return pageDbId === process.env.MULTI_DATA_SOURCE_ID;
      })
      .filter(page => {
        // 달린 날짜가 있는 것만
        return page.properties?.["달린 날짜"]?.date?.start;
      })
      .map(page => {
        const props = page.properties;
        return {
          id: page.id,
          title: props["오늘의 한줄 제목/Story"]?.title?.[0]?.text?.content || "",
          name: props["이름`"]?.relation?.[0]?.id || "",
          date: props["달린 날짜"]?.date?.start || "",
          duration: props["달린 시간(분)"]?.number || 0,
          location: props["달린 장소"]?.rich_text?.[0]?.text?.content || "",
          before: props["달리기 전 생각/느낌"]?.rich_text?.[0]?.text?.content || "",
          during: props["달리기 중 생각/느낌"]?.rich_text?.[0]?.text?.content || "",
          after: props["달리기 후 생각/느낌"]?.rich_text?.[0]?.text?.content || "",
        };
      });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        records: validRecords,
        total: validRecords.length,
      }),
    };
  } catch (error) {
    console.error("Error fetching records:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: error.message,
        details: "Failed to load records",
      }),
    };
  }
};
