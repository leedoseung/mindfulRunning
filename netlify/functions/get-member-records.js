// Netlify Function: 특정 멤버의 모든 달리기 기록 가져오기
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
    // 쿼리 파라미터에서 memberId 가져오기
    const memberId = event.queryStringParameters?.memberId;

    if (!memberId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "memberId is required" }),
      };
    }


    console.log(`📡 Searching for pages for member: ${memberId}`);

    const targetDbId = process.env.MULTI_DATA_SOURCE_ID;
    let memberRecords = [];
    let hasMore = true;
    let startCursor = undefined;
    let batchCount = 0;

    while (hasMore) {
      batchCount++;
      // Search API로 페이지 검색 (pagination)
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
            page_size: 100,
            ...(startCursor ? { start_cursor: startCursor } : {}),
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        // rate limit이면 현재까지 찾은 결과 반환
        if (data.status === 429) {
          console.log(`⚠️ Rate limited. Returning ${memberRecords.length} records found so far.`);
          break;
        }
        console.error(`❌ Error:`, data);
        throw new Error(JSON.stringify(data));
      }

      // parent.database_id로 달리기 기록만 필터링
      const runningPages = data.results.filter(p => {
        if (!p || !p.parent) return false;
        const pageDbId = p.parent.database_id?.replace(/-/g, '');
        return pageDbId === targetDbId;
      });

      // Search API 결과에서 직접 필터링 (개별 페이지 조회 없이!)
      const matched = runningPages.filter(page => {
        const memberRelation = page.properties?.["이름`"]?.relation?.[0]?.id;
        const hasDate = !!page.properties?.["달린 날짜"]?.date?.start;
        return memberRelation === memberId && hasDate;
      });

      memberRecords = memberRecords.concat(matched);
      console.log(`📊 배치${batchCount}: ${data.results.length}개 중 달리기=${runningPages.length}, 매칭=${matched.length} (누적: ${memberRecords.length})`);

      hasMore = data.has_more;
      startCursor = data.next_cursor;

      if (!hasMore) break;
    }

    // 날짜순 정렬 (최신순)
    const validRecords = memberRecords.sort((a, b) => {
      const dateA = new Date(a.properties?.["달린 날짜"]?.date?.start || 0);
      const dateB = new Date(b.properties?.["달린 날짜"]?.date?.start || 0);
      return dateB - dateA;
    });

    console.log(`🎯 Filtered records for member ${memberId}: ${validRecords.length}`);

    const formattedRecords = validRecords.map(page => {
      const props = page.properties;
      return {
        id: page.id,
        title: props["오늘의 한줄 제목/Story"]?.title?.[0]?.text?.content || "",
        date: props["달린 날짜"]?.date?.start || "",
        duration: props["달린 시간(분)"]?.number || 0,
        location: props["달린 장소"]?.rich_text?.[0]?.text?.content || "",
        before: props["달리기 전 생각/느낌"]?.rich_text?.[0]?.text?.content || "",
        during: props["달리기 중 생각/느낌"]?.rich_text?.[0]?.text?.content || "",
        after: props["달리기 후 생각/느낌"]?.rich_text?.[0]?.text?.content || "",
      };
    });

    console.log(`✅ Formatted ${formattedRecords.length} records`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        records: formattedRecords,
        total: formattedRecords.length,
      }),
    };
  } catch (error) {
    console.error("Error fetching member records:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: error.message,
        details: "Failed to load member records",
      }),
    };
  }
};
