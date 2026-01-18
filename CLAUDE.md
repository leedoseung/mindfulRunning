# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

마인드풀러닝 (Mindful Running) - A Korean-language web application for logging daily mindful running experiences. Users record their thoughts/feelings before, during, and after runs, which are stored in Notion.

## Architecture

**Frontend**: Static HTML/CSS/JS served via Netlify
- `index.html` - Main form for logging running records (name, date, duration, title, before/during/after thoughts)
- `leaderboard.html` - Top 5 leaderboard displaying members ranked by cumulative run count

**Backend**: Netlify Functions (serverless)
- `netlify/functions/save-to-notion.js` - POST handler to save running logs to Notion database
- `netlify/functions/get-members.js` - GET handler to fetch member list from Notion
- `netlify/functions/get-leaderboard.js` - GET handler to fetch leaderboard data with run counts

**Data**: Notion databases
- Member database (db-mfrs-member) - Contains member profiles with rollup fields for cumulative stats
- Running log database - Stores individual running entries with relation to members

## Environment Variables (Netlify)

- `NOTION_API_KEY` - Notion integration token
- `DATA_SOURCE_ID` - Running log database ID
- `MEMBER_DATA_SOURCE_ID` - Member database ID

## Development

This is a static site with serverless functions. No build step required.

**Local testing with Netlify CLI:**
```bash
netlify dev
```

**Deploy:**
Push to the connected Git repository for automatic Netlify deployment.

## Notion API Notes

- Uses Notion API version `2022-06-28`
- Member relation uses `data_source_id` parent type (not standard `database_id`)
- Property names include Korean characters and special formatting (e.g., `'이름\``' with backtick)
