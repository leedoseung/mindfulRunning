# Archive Hub Page Design

## Summary
Static hub page (`archive.html`) linking to monthly running insight dashboards.

## File Structure
```
archive.html       ← hub (new)
2026-02.html       ← Feb dashboard (rename from mindful-runners-dashboard.html)
2026-03.html       ← Mar (future)
2026-04.html       ← Apr (future)
2026-12.html       ← Dec (future)
```

## UI Design
- Style: purple gradient (#667eea → #764ba2), consistent with leaderboard.html
- Layout: responsive 2-column card grid
- Header: "🏃 마인드풀러닝 아카이브" with subtitle
- Cards per month:
  - Year/month label
  - Key stats: 참여 러너, 총 기록, 총 시간
  - "대시보드 보기" link button (active) or "준비 중" badge (inactive)

## February Card Data (from 2026-02.html)
- 참여 러너: 63명
- 총 달리기 기록: 648회
- 총 달리기 시간: 581시간

## Navigation
- Back link to leaderboard.html or index.html
- Each card links to respective monthly HTML file
