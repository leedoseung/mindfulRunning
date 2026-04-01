# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

마인드풀러닝 (Mindful Running) - A Korean-language PWA for logging daily mindful running experiences. Users record their thoughts/feelings before, during, and after runs, which are stored in Notion.

## Architecture

**Frontend**: Static HTML/CSS/JS served via Netlify (PWA-enabled with Service Worker)
- `index.html` - Main form for logging running records (name, date, duration, title, before/during/after thoughts)
- `leaderboard.html` - Leaderboard displaying all members ranked by cumulative run count/time

**Backend**: Netlify Functions (serverless)
- `netlify/functions/save-to-notion.js` - POST handler to save running logs to Notion database
- `netlify/functions/get-members.js` - GET handler to fetch member list from Notion
- `netlify/functions/get-leaderboard.js` - GET handler to fetch leaderboard data with run counts
- `netlify/functions/get-member-records.js` - GET handler to fetch all running records for a specific member
- `netlify/functions/get-today-records.js` - GET handler to fetch recent running records for random display

**Data**: Notion databases
- Member database (db-mfrs-member) - Contains member profiles with rollup fields for cumulative stats (`누적 달린 횟수`, `누적 달린 시간`)
- Running log database - Stores individual running entries with relation to members

## Development

This is a static site with serverless functions. No build step required.

**Local testing:**
```bash
netlify dev
```

**Deploy:** Push to the connected Git repository for automatic Netlify deployment.

## Environment Variables (Netlify)

- `NOTION_API_KEY` - Notion integration token
- `DATA_SOURCE_ID` - Running log database ID (with hyphens)
- `MULTI_DATA_SOURCE_ID` - Running log database ID (without hyphens, for filtering)
- `MEMBER_DATA_SOURCE_ID` - Member database ID

## Notion API Notes

- Uses Notion API version `2022-06-28`
- Member relation uses `data_source_id` parent type (not standard `database_id`)
- Property names include Korean characters and special formatting (e.g., `이름\`` with backtick)
- Running log properties: `오늘의 한줄 제목/Story`, `달린 날짜`, `달린 시간(분)`, `달리기 전/중/후 생각/느낌`
- Member properties: `Name`, `그룹`, `주활동`, `기수`, `@인스타ID`

## 구현 참고사항

- iOS Safari: 셀렉트박스에 `display:none` 대신 `visibility/height/opacity` 조합 사용
- 중복 제출 방지: localStorage(1차) + Notion DB 조회(2차), `force:true`로 강제 저장 가능
- 멤버별 기록 조회: Search API로 최근 100개만 조회 (Database Query API는 multi-data-source 미지원)
- Notion relation 필드: Data Sources Query API는 relation 비워둠 → Search API + 개별 페이지 조회 필요
- 멤버 기록 캐시: localStorage 1시간 캐시 적용
