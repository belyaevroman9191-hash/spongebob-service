# SPONGEBOB SERVICE — Vercel edition

Статический сайт сохранён в исходном виде. API, админка и аналитика работают через Vercel Serverless Functions и PostgreSQL (Neon).

## Развёртывание

1. Загрузите содержимое этой папки в корень Git-репозитория и импортируйте репозиторий в Vercel.
2. Подключите Neon PostgreSQL.
3. В Vercel → Settings → Environment Variables добавьте `DATABASE_URL` (connection string с SSL).
4. Выполните Redeploy.
5. Проверьте `/api/config`, затем `/admin`.

Полная инструкция на русском: `VERCEL_DEPLOY_RU.md`.

## Важно

- Без `DATABASE_URL` API не сможет сохранять данные.
- Не добавляйте реальные `.env` и строки подключения в Git.
- Таблица и первоначальные настройки создаются автоматически при первом запросе API.
- `data/db.json` и прежний `server.js` намеренно не входят в Vercel-версию: данные хранятся в PostgreSQL, а старый JSON мог раскрыть сессии и аналитику.
