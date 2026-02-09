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

## Change Log (2026-02-02)

### PWA 아이콘 개선
- `favicon.ico`(32x32)를 PNG로 변환하여 `icon-192.png`, `icon-512.png` 생성
- `manifest.json`에 PNG 아이콘 참조 및 `scope` 추가
- `index.html`, `leaderboard.html`의 `apple-touch-icon`을 PNG로 변경
- 안드로이드 홈화면 아이콘 미표시 문제 해결

### Service Worker 추가
- `sw.js` 생성 (네트워크 우선, 실패 시 캐시 전략)
- `index.html`, `leaderboard.html`에 Service Worker 등록 코드 추가
- 안드로이드 PWA 설치 후 홈화면에 추가되지 않는 문제 해결

### iOS Safari 셀렉트박스 호환성
- 모바일에서 이름 검색 시 셀렉트박스가 자동으로 표시되도록 수정
- `display: none` 대신 `visibility/height/opacity` 조합으로 iOS Safari 호환
- 입력, 포커스, 선택, 화면 밖 클릭 시 명시적 인라인 스타일 설정

### 중복 제출 방지
- 프론트엔드: `localStorage`에 `사용자ID + 날짜` 저장하여 1차 차단
- 백엔드: `save-to-notion.js`에서 Notion DB 조회로 2차 검증 (같은 사용자 + 같은 날짜)
- 중복 시 confirm 팝업으로 사용자 선택 가능 (`force: true`로 강제 저장)

### 리더보드 보기 버튼 확인
- 리더보드 이동 전 `confirm('현재의 달리기 기록을 기록 및 복사하셨습니까?')` 추가

### 리더보드 디자인 개선
- 좌우 여백 제거, 전체 폭 활용 레이아웃
- 테이블 헤더를 밝은 회색 배경으로 변경, sticky 헤더 적용
- 글자 크기 증가 (모바일 13~14px, 데스크탑 16px)
- 그룹/주활동 셀 배경색 제거, 행 높이 증가
- `max-height` 제거하여 전체 데이터 표시

## Change Log (2026-02-07)

### 멤버별 러닝 일기장 기능 추가
- **리더보드에서 멤버 이름 클릭 시 해당 멤버의 모든 달리기 기록을 일기장 형식으로 표시**
- `netlify/functions/get-member-records.js` 생성
  - Search API로 최근 100개 페이지만 조회 (성능 최적화)
  - 각 페이지를 개별 조회하여 relation 데이터 확보
  - database_id 필터링 및 member ID 매칭
  - 날짜순 정렬 (최신순)
- `leaderboard.html` 수정
  - 멤버 이름 셀에 클릭 이벤트 추가 (hover 효과 포함)
  - 일기장 스타일 모달 팝업 추가
  - 로딩 애니메이션 (bouncing emoji + spinner)
  - 1시간 캐시 적용 (두 번째 클릭부터 빠른 로딩)
  - 개별 기록 복사 및 전체 기록 복사 기능
  - 일기 형식: 날짜, 시간, 장소, 제목, 달리기 전/중/후 생각

### 성능 최적화 및 제약사항
- Search API 사용으로 최근 100개 페이지만 조회 (Database Query API는 multi-data-source에서 작동하지 않음)
- Data Sources Query API는 relation 필드를 populate하지 않아 사용 불가
- 첫 로딩은 느릴 수 있으나 localStorage 캐시(1시간)로 재방문 시 빠른 응답
- 100개 이상의 기록이 있는 경우 오래된 기록은 표시되지 않을 수 있음

### 기술적 이슈 해결
- Notion API relation 필드 접근 방법: Data Sources Query API는 relation을 비워둠 → Search API + 개별 페이지 조회 필요
- Property 이름 처리: `이름\`` (백틱 포함) 등 특수 문자 포함된 한글 속성명 처리
