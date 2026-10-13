const { neon } = require('@neondatabase/serverless');

const FIXED_PASSWORD = Object.freeze({
  salt: '012914fae7069b4cba5c416d86eecd6c',
  hash: 'c1382848bc271fe908fa12bc35312ef3de83f7859832ee995fee8170a9c2f49faa459aa7895e02de448c6bf8b1da48f1e8e0fec2157adef79b1bd40c213efafc'
});

function defaultState() {
  return {
    auth: { version: 2, password: FIXED_PASSWORD },
    sessions: {},
    settings: {
      siteName: 'SPONGEBOB SERVICE', telegramBotUsername: '',
      links: [
        { id: '01', title: 'ГЛАВНЫЙ АДМИНИСТРАТОР', subtitle: 'Основной контакт проекта', icon: 'A', url: 'https://t.me/GSMSHEIKHO9', active: true },
        { id: '02', title: 'СТАРШИЙ САППОРТ', subtitle: 'Поддержка и сложные вопросы', icon: 'S', url: 'https://t.me/sponge_bo888', active: true },
        { id: '03', title: 'МЛАДШИЙ САППОРТ', subtitle: 'Помощь по общим вопросам', icon: 'C', url: 'https://t.me/SuportSpongeBob', active: true },
        { id: '04', title: 'УСЛУГИ КОДЕРА', subtitle: 'Разработка и технические задачи', icon: '</>', url: 'https://t.me/GSMSHEIKHO9', active: true }
      ]
    }, visitors: {}, events: []
  };
}

let sqlClient;
function sql() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not configured. Connect a Neon PostgreSQL database in Vercel and set DATABASE_URL.');
  if (!sqlClient) sqlClient = neon(process.env.DATABASE_URL);
  return sqlClient;
}

async function initStore() {
  const q = sql();
  await q`CREATE TABLE IF NOT EXISTS spongebob_app_state (id INTEGER PRIMARY KEY, state JSONB NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
  const rows = await q`SELECT id FROM spongebob_app_state WHERE id = 1 LIMIT 1`;
  if (!rows.length) {
    await q`INSERT INTO spongebob_app_state (id, state) VALUES (1, ${JSON.stringify(defaultState())}::jsonb) ON CONFLICT (id) DO NOTHING`;
  }
}

async function readState() {
  await initStore();
  const rows = await sql()`SELECT state FROM spongebob_app_state WHERE id = 1 LIMIT 1`;
  const state = rows[0]?.state || defaultState();
  state.sessions ||= {}; state.visitors ||= {}; state.events ||= [];
  state.settings ||= defaultState().settings;
  return state;
}

async function writeState(state) {
  await sql()`UPDATE spongebob_app_state SET state = ${JSON.stringify(state)}::jsonb, updated_at = NOW() WHERE id = 1`;
}

module.exports = { readState, writeState, FIXED_PASSWORD };
