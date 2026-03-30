// Netlify Function: 이달의 달리기 통계 (멤버별 이번달 횟수/시간)
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
    // 이번달 날짜 범위 계산
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // 0-indexed
    const monthStart = `${year}-${String(month + 1).padStart(2, "0")}-01`;
    const nextMonthYear = month === 11 ? year + 1 : year;
    const nextMonthNum = month === 11 ? 1 : month + 2;
    const monthEnd = `${nextMonthYear}-${String(nextMonthNum).padStart(2, "0")}-01`;

    const targetDbId = process.env.MULTI_DATA_SOURCE_ID;
    const stats = {}; // memberId -> { monthlyCount, monthlyMinutes }

    let hasMore = true;
    let startCursor = undefined;
    let batchCount = 0;
    const MAX_BATCHES = 5; // 최대 500개 조회

    while (hasMore && batchCount < MAX_BATCHES) {
      batchCount++;

      const response = await fetch("https://api.notion.com/v1/search", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.NOTION_API_KEY}`,
          "Content-Type": "application/json",
          "Notion-Version": "2022-06-28",
        },
        body: JSON.stringify({
          filter: { value: "page", property: "object" },
          sort: { direction: "descending", timestamp: "last_edited_time" },
          page_size: 100,
          ...(startCursor ? { start_cursor: startCursor } : {}),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.status === 429) break; // rate limit
        throw new Error(JSON.stringify(data));
      }

      // 달리기 기록 DB만 필터링
      const runningPages = data.results.filter((p) => {
        if (!p || !p.parent) return false;
        const pageDbId = p.parent.database_id?.replace(/-/g, "");
        return pageDbId === targetDbId;
      });

      // 이번달 기록만 집계
      runningPages.forEach((page) => {
        const date = page.properties?.["달린 날짜"]?.date?.start;
        if (!date) return;
        if (date < monthStart || date >= monthEnd) return;

        const memberId = page.properties?.["이름`"]?.relation?.[0]?.id;
        if (!memberId) return;

        const duration = page.properties?.["달린 시간(분)"]?.number || 0;

        if (!stats[memberId]) {
          stats[memberId] = { monthlyCount: 0, monthlyMinutes: 0 };
        }
        stats[memberId].monthlyCount++;
        stats[memberId].monthlyMinutes += duration;
      });

      hasMore = data.has_more;
      startCursor = data.next_cursor;
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        stats,
        month: monthStart,
      }),
    };
  } catch (error) {
    console.error("Error fetching monthly stats:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: error.message,
        details: "Failed to load monthly stats",
      }),
    };
  }
};
