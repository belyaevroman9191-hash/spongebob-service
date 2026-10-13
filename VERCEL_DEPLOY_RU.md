# SPONGEBOB SERVICE — Vercel + Neon

## Vercel environment variables
In Project → Settings → Environment Variables, set:
- `DATABASE_URL`: Neon PostgreSQL connection string.
- `ADMIN_PASSWORD`: a new, unique admin password.

Apply to Production. After code upload, redeploy the latest commit.

## Deploy
This project uses Vercel Node functions from `api/[...path].js`. PostgreSQL tables are created on the first API request. The JSON file under `data/` is retained as a local backup and is not persistent storage on Vercel.

## Test
- `/` — main page
- `/api/config` — site config JSON
- `/admin` — admin login
Login: `admin`; password: value set in `ADMIN_PASSWORD`.

If `/api/config` returns `SERVER_ERROR`, inspect Vercel → Deployments → latest deployment → Functions / Runtime Logs. Never share `DATABASE_URL` publicly.
