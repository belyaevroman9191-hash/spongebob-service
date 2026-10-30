const http = require('https');

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { username, action, details } = req.body;

    const BOT_TOKEN = '9289893713:AAHzlH0F4zUNmaLth3Sj-5c56wji25ink54';
    const CHAT_ID = '8908951710';

    const safeUsername = String(username || 'Неизвестно').replace(/_/g, '\\_');
    const message = 
      `🔔 *Новое действие в SpongeBob Service*\n\n` +
      `👤 *Пользователь:* @${safeUsername}\n` +
      `📝 *Действие:* ${action || 'Открытие сайта'}\n` +
      `📍 *Детали:* ${details || 'Нет дополнительных данных'}\n` +
      `🕒 *Время:* ${new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })} МСК`;

    const tgUrl = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage?chat_id=${MY_CHAT_ID}&text=${tgText}&parse_mode=Markdown`;

    http.get(tgUrl, (tgRes) => {
      let data = '';
      tgRes.on('data', (chunk) => { data += chunk; });
      tgRes.on('end', () => {
        return res.status(200).json({ ok: true, telegramResponse: 'Sent' });
      });
    }).on('error', (err) => {
      console.error('Ошибка Telegram API:', err.message);
      return res.status(500).json({ error: 'Telegram API Error', details: err.message });
    });

  } catch (error) {
    console.error('Системная ошибка:', error);
    return res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
}
