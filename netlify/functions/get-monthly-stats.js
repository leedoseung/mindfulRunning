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
    // 이번달 날짜 범위 계산 (1일 ~ 오늘)
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // 0-indexed
    const monthStart = `${year}-${String(month + 1).padStart(2, "0")}-01`;
    const today = now.toISOString().slice(0, 10); // YYYY-MM-DD

    // 조기 종료 기준: last_edited_time이 monthStart보다 하루 전이면 중단
    // (한국 KST = UTC+9 시차 보정 포함)
    const stopBeforeDate = new Date(monthStart + "T00:00:00.000Z");
    stopBeforeDate.setDate(stopBeforeDate.getDate() - 1); // 1일 여유

    const targetDbId = process.env.MULTI_DATA_SOURCE_ID;
    const stats = {}; // memberId -> { monthlyCount, monthlyMinutes }

    let hasMore = true;
    let startCursor = undefined;
    let batchCount = 0;
    const MAX_BATCHES = 30; // 안전 상한선 (3000개)

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

      // 이번달 기록 집계 (1일 ~ 오늘)
      runningPages.forEach((page) => {
        const date = page.properties?.["달린 날짜"]?.date?.start;
        if (!date) return;
        if (date < monthStart || date > today) return;

        const memberId = page.properties?.["이름`"]?.relation?.[0]?.id;
        if (!memberId) return;

        const duration = page.properties?.["달린 시간(분)"]?.number || 0;

        if (!stats[memberId]) {
          stats[memberId] = { monthlyCount: 0, monthlyMinutes: 0, monthlyMax: 0 };
        }
        stats[memberId].monthlyCount++;
        stats[memberId].monthlyMinutes += duration;
        if (duration > stats[memberId].monthlyMax) {
          stats[memberId].monthlyMax = duration;
        }
      });

      hasMore = data.has_more;
      startCursor = data.next_cursor;

      // 이번 배치 마지막 페이지의 last_edited_time이 이달 시작 이전이면 중단
      if (data.results.length > 0) {
        const oldestInBatch = data.results[data.results.length - 1];
        const oldestEditTime = new Date(oldestInBatch.last_edited_time);
        if (oldestEditTime < stopBeforeDate) {
          break;
        }
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        stats,
        month: monthStart,
        batchCount, // 디버깅용
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
