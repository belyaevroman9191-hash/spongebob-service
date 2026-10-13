(() => {
  const app = document.getElementById('app');
  let data = null;
  let currentUser = null;
  let saving = false;

  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  const byId = id => document.getElementById(id);
  const api = async (path, opt = {}) => {
    const headers = { ...(opt.body ? { 'Content-Type': 'application/json' } : {}), ...(opt.headers || {}) };
    const r = await fetch(path, { ...opt, headers, cache: 'no-store' });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || 'ERROR');
    return j;
  };

  async function start() {
    try {
      data = await api('/api/admin/me');
      currentUser = data.user;
      render();
    } catch {
      renderLogin();
    }
  }


  function showModal({ title = 'Подтвердите действие', message = '', confirmText = 'ПОДТВЕРДИТЬ', cancelText = 'ОТМЕНА', danger = false }) {
    return new Promise(resolve => {
      const old = document.getElementById('appModal');
      if (old) old.remove();
      const modal = document.createElement('div');
      modal.id = 'appModal';
      modal.className = 'modal-backdrop';
      modal.innerHTML = `<div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="modalTitle">
        <div class="modal-mark">SPONGEBOB // SYSTEM</div>
        <div class="modal-title" id="modalTitle">${esc(title)}</div>
        <div class="modal-message">${esc(message)}</div>
        <div class="modal-actions">
          <button type="button" class="modal-btn modal-cancel" data-modal="cancel">${esc(cancelText)}</button>
          <button type="button" class="modal-btn ${danger ? 'modal-danger' : 'modal-confirm'}" data-modal="confirm">${esc(confirmText)}</button>
        </div>
      </div>`;
      document.body.appendChild(modal);
      const close = value => { modal.remove(); resolve(value); };
      modal.querySelector('[data-modal="cancel"]').onclick = () => close(false);
      modal.querySelector('[data-modal="confirm"]').onclick = () => close(true);
      modal.addEventListener('click', e => { if (e.target === modal) close(false); });
      const onKey = e => {
        if (!document.getElementById('appModal')) { document.removeEventListener('keydown', onKey); return; }
        if (e.key === 'Escape') close(false);
        if (e.key === 'Enter') close(true);
      };
      document.addEventListener('keydown', onKey);
      requestAnimationFrame(() => modal.querySelector('[data-modal="cancel"]').focus());
    });
  }

  function showToast(message, type = 'ok') {
    let host = document.getElementById('toastHost');
    if (!host) {
      host = document.createElement('div');
      host.id = 'toastHost';
      host.className = 'toast-host';
      document.body.appendChild(host);
    }
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    host.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 220); }, 2800);
  }

  function renderLogin() {
    document.body.classList.remove('admin-authenticated');
    app.innerHTML = `<div class="auth"><div class="auth-card">
      <div class="logo">SPONGEBOB // ADMIN</div>
      <div class="login-form">
        <label for="username">ЛОГИН</label>
        <input id="username" class="input" type="text" name="username" autocomplete="username" value="admin" spellcheck="false">
        <label for="lp">ПАРОЛЬ</label>
        <input id="lp" class="input" type="password" name="admin-password" autocomplete="current-password" autocapitalize="off" autocorrect="off" spellcheck="false">
        <button class="btn" style="margin-top:18px;width:100%" id="login" type="button">ВОЙТИ</button>
        <div id="msg"></div>
      </div>
    </div></div>`;

    const submit = async () => {
      try {
        await api('/api/admin/login', { method: 'POST', body: JSON.stringify({ username: byId('username').value.trim(), password: byId('lp').value }) });
        data = await api('/api/admin/me');
        currentUser = data.user;
        render();
      } catch {
        msg('Неверный логин или пароль', 'err');
      }
    };
    byId('login').onclick = submit;
    byId('lp').onkeydown = e => { if (e.key === 'Enter') submit(); };
    byId('username').onkeydown = e => { if (e.key === 'Enter') byId('lp').focus(); };
  }

  function msg(t, c) {
    const m = byId('msg');
    if (m) { m.textContent = t; m.className = c; }
  }

  function render() {
    document.body.classList.toggle('admin-authenticated', true);
    app.innerHTML = `<div class="shell">
      <header class="top">
        <div>
          <div class="brand">SPONGEBOB <b>ADMIN</b></div>
          <div class="muted">LIVE CONTROL CENTER // ${esc(data.settings.siteName)}</div>
        </div>
        <div class="actions">
          <span class="pill">ADMIN · ПОЛНЫЙ ДОСТУП</span>
          <button class="btn" id="refresh">↻ ОБНОВИТЬ</button>
          <button class="btn" id="analyticsBtn">📊 АНАЛИТИКА</button>
          <button class="btn danger" id="logout">ВЫЙТИ</button>
        </div>
      </header>
      <div class="grid" id="stats"></div>
      <div class="panel analytics-overview">
        <div class="analytics-head"><div><h2>📊 АНАЛИТИКА</h2><div class="muted">Автоматический отчёт по реальным событиям сайта</div></div><span class="pill" id="analyticsUpdated">ОБНОВЛЕНИЕ...</span></div>
        <div class="analytics-cards" id="analyticsCards"></div>
        <div class="analytics-columns">
          <div><h3>ТОП РАЗДЕЛОВ</h3><div id="topLinks"></div></div>
          <div><h3>УСТРОЙСТВА</h3><div id="devices"></div></div>
          <div><h3>ИСТОЧНИКИ</h3><div id="sources"></div></div>
        </div>
      </div>
      <div class="tabs">
        <button class="tab active" data-tab="dash">ДЭШБОРД</button>
        <button class="tab" data-tab="vis">ПОСЕТИТЕЛИ</button>
        <button class="tab" data-tab="events">АКТИВНОСТЬ</button>
        <button class="tab" data-tab="settings">НАСТРОЙКИ</button>
      </div>
      <section class="section active" id="dash">
        <div class="two">
          <div class="panel"><h2>ПОСЕЩАЕМОСТЬ ПО ДНЯМ</h2><div class="chart" id="chart"></div></div>
          <div class="panel"><h2>КАНАЛЫ // КЛИКИ</h2><div id="channels"></div></div>
        </div>
        <div class="panel" style="margin-top:12px"><h2>ПОСЛЕДНИЕ ВИЗИТЫ</h2><div class="scroll"><table><thead><tr><th>Время</th><th>Telegram</th><th>Визит</th><th>Источник</th><th>Устройство</th></tr></thead><tbody id="recent"></tbody></table></div></div>
      </section>
      <section class="section" id="vis"><div class="panel"><h2>ПОСЕТИТЕЛИ / TELEGRAM</h2><div class="scroll"><table><thead><tr><th>Последний визит</th><th>Telegram</th><th>Имя</th><th>Устройство</th><th>Визиты</th><th>Источник</th></tr></thead><tbody id="visitors"></tbody></table></div></div></section>
      <section class="section" id="events"><div class="panel"><h2>ЛОГ АКТИВНОСТИ</h2><div class="scroll"><table><thead><tr><th>Время</th><th>Тип</th><th>Раздел</th><th>Telegram</th><th>Посетитель</th></tr></thead><tbody id="events"></tbody></table></div></div></section>
      <section class="section" id="settings">
        <div class="panel">
          <h2>УПРАВЛЕНИЕ САЙТОМ</h2>
          <div class="form-row">
            <div><label for="siteName">НАЗВАНИЕ</label><input id="siteName" class="input"></div>
            <div><label for="bot">TELEGRAM BOT USERNAME (для WebApp)</label><input id="bot" class="input" placeholder="my_bot"></div>
          </div>
          <div class="notice">Здесь можно полностью управлять меню главной страницы: добавлять, удалять, скрывать, менять порядок, названия, описания, иконки и ссылки. Изменения сохраняются в базе и сразу используются главной страницей.</div>
          <div class="settings-toolbar"><button class="btn" id="addLink">＋ ДОБАВИТЬ РАЗДЕЛ</button><span class="muted" id="linkCount"></span></div>
          <div id="links"></div>
          <button class="btn" id="saveSettings">СОХРАНИТЬ ВСЁ</button>
          <div id="saveMsg"></div>
        </div>
        <div class="panel" style="margin-top:12px"><h2>СИСТЕМА</h2><button class="btn danger" style="margin-top:12px" id="reset">ОЧИСТИТЬ АНАЛИТИКУ</button><div id="secMsg"></div></div>
      </section>
    </div>`;

    wire();
    loadAnalytics();
  }

  function switchTab(id) {
    document.querySelectorAll('.tab').forEach(x => x.classList.toggle('active', x.dataset.tab === id));
    document.querySelectorAll('.section').forEach(x => x.classList.toggle('active', x.id === id));
  }

  function wire() {
    document.querySelectorAll('.tab').forEach(b => b.onclick = () => {
      document.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
      document.querySelectorAll('.section').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      byId(b.dataset.tab)?.classList.add('active');
    });
    byId('refresh').onclick = loadAnalytics;
    byId('logout').onclick = async () => { await api('/api/admin/logout', { method: 'POST' }); renderLogin(); };
    byId('analyticsBtn').onclick = () => { switchTab('dash'); loadAnalytics(); window.scrollTo({ top: 0, behavior: 'smooth' }); };
    byId('saveSettings').onclick = saveSettings;
    byId('addLink').onclick = addLink;
    byId('reset').onclick = resetStats;
  }

  async function loadAnalytics() {
    try {
      const j = await api('/api/admin/analytics');
      data.stats = j.stats;
      data.events = j.events;
      data.visitors = j.visitors;
      const s = j.stats;
      byId('stats').innerHTML = [
        ['СЕЙЧАС ОНЛАЙН', s.live], ['ВСЕГО ПОСЕЩЕНИЙ', s.views], ['УНИКАЛЬНЫЕ', s.unique],
        ['КЛИКИ ПО КАНАЛАМ', s.clicksCount], ['TELEGRAM ПОЛЬЗОВАТЕЛИ', s.telegramVisitors]
      ].map(x => `<div class="stat"><div class="l">${x[0]}</div><div class="n">${x[1]}</div></div>`).join('');

      byId('analyticsCards').innerHTML = [
        ['ЗА 24 ЧАСА', s.todayViews], ['ЗА 7 ДНЕЙ', s.weekViews], ['ЗА 30 ДНЕЙ', s.monthViews],
        ['УНИКАЛЬНЫЕ / 7 ДНЕЙ', s.unique7d], ['КЛИКИ / 24 ЧАСА', s.todayClicks], ['КОНВЕРСИЯ В КЛИК', `${s.clickRate}%`]
      ].map(x => `<div class="metric"><div class="l">${x[0]}</div><div class="n">${x[1]}</div></div>`).join('');
      byId('analyticsUpdated').textContent = `ОБНОВЛЕНО ${new Date().toLocaleTimeString('ru-RU', {hour:'2-digit', minute:'2-digit', second:'2-digit'})}`;
      byId('topLinks').innerHTML = (s.topLinks || []).length ? s.topLinks.map(x => `<div class="rank"><span>${esc(x.title)}</span><b>${x.count}</b></div>`).join('') : '<div class="muted">Пока нет кликов</div>';
      byId('devices').innerHTML = Object.entries(s.devices || {}).map(([k,v]) => `<div class="rank"><span>${({mobile:'📱 Мобильные',desktop:'🖥️ ПК',tablet:'📟 Планшеты',other:'❔ Другие'})[k] || k}</span><b>${v}</b></div>`).join('');
      const sourceEntries = Object.entries(s.sources || {}).sort((a,b)=>b[1]-a[1]).slice(0,6);
      byId('sources').innerHTML = sourceEntries.length ? sourceEntries.map(([k,v]) => `<div class="rank"><span>${esc(k).slice(0,42)}</span><b>${v}</b></div>`).join('') : '<div class="muted">Пока нет данных</div>';

      const days = Object.entries(s.days).slice(-14);
      const max = Math.max(1, ...days.map(x => x[1]));
      byId('chart').innerHTML = days.length ? days.map(([d, n]) => `<div class="bar" style="height:${Math.max(4, n / max * 190)}px"><span>${n}</span></div>`).join('') : '<div class="muted">Пока нет посещений</div>';
      byId('channels').innerHTML = data.settings.links.length ? data.settings.links.map(l => `<div style="padding:11px 0;border-bottom:1px solid #172017"><b>${esc(l.title)}</b><div class="muted">${s.byLink[l.id] || 0} кликов</div></div>`).join('') : '<div class="muted">Разделов пока нет</div>';
      byId('recent').innerHTML = j.events.filter(e => e.type === 'page_view').slice(0, 60).map(e => rowVisit(e, j.visitors)).join('');
      byId('visitors').innerHTML = j.visitors.map(v => `<tr><td>${fmt(v.lastSeen)}</td><td>${v.telegramUsername ? '@' + esc(v.telegramUsername) : '<span class="muted">не определён</span>'}</td><td>${esc(v.telegramName || '—')}</td><td>${({mobile:'📱 Телефон',desktop:'🖥️ ПК',tablet:'📟 Планшет',other:'❔ Другое'})[v.device || 'other']}</td><td>${v.visits}</td><td>${esc(v.source || v.referrer || 'Прямой переход / источник не передан')}</td></tr>`).join('');
      byId('events').innerHTML = j.events.slice(0, 200).map(e => `<tr><td>${fmt(e.ts)}</td><td><span class="pill">${esc(e.type)}</span></td><td>${esc(e.title || e.path || e.linkId || '—')}</td><td>${e.telegramUsername ? '@' + esc(e.telegramUsername) : '—'}</td><td>${String(e.visitorId || '').slice(0, 10)}…</td></tr>`).join('');
      renderSettings();
    } catch (e) { console.error(e); }
  }

  function rowVisit(e, vs) {
    const v = vs.find?.(x => x.id === e.visitorId) || Object.values(vs).find?.(x => x.id === e.visitorId);
    return `<tr><td>${fmt(e.ts)}</td><td>${e.telegramUsername ? '@' + esc(e.telegramUsername) : '—'}</td><td>${esc(e.title || 'SPONGEBOB')}</td><td>${esc(v?.referrer || 'direct')}</td><td>${esc((v?.userAgent || '').slice(0, 70))}</td></tr>`;
  }

  function fmt(x) { return new Date(x).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }); }

  function nextId() {
    const used = new Set(data.settings.links.map(x => String(x.id)));
    let n = 1;
    while (used.has(String(n).padStart(2, '0'))) n++;
    return String(n).padStart(2, '0');
  }

  function renderSettings() {
    if (!byId('siteName')) return;
    byId('siteName').value = data.settings.siteName || '';
    byId('bot').value = data.settings.telegramBotUsername || '';
    byId('linkCount').textContent = `${data.settings.links.length} / 20 разделов`;
    byId('links').innerHTML = data.settings.links.length ? data.settings.links.map((l, index) => `
      <div class="link-editor" data-index="${index}">
        <div class="link-editor-head">
          <strong>РАЗДЕЛ ${String(index + 1).padStart(2, '0')}</strong>
          <div class="link-actions">
            <button type="button" class="mini" data-action="up" ${index === 0 ? 'disabled' : ''}>↑</button>
            <button type="button" class="mini" data-action="down" ${index === data.settings.links.length - 1 ? 'disabled' : ''}>↓</button>
            <button type="button" class="mini danger-mini" data-action="delete">УДАЛИТЬ</button>
          </div>
        </div>
        <div class="form-row"><div><label>ID</label><input class="input lid" value="${esc(l.id)}"></div><div><label>НАЗВАНИЕ</label><input class="input ltitle" value="${esc(l.title)}"></div></div>
        <div class="form-row" style="margin-top:8px"><div><label>ССЫЛКА</label><input class="input lurl" value="${esc(l.url)}"></div><div><label>ОПИСАНИЕ</label><input class="input lsub" value="${esc(l.subtitle)}"></div></div>
        <div class="form-row" style="margin-top:8px"><div><label>ИКОНКА</label><input class="input lic" value="${esc(l.icon)}"></div><div><label class="switch"><input class="lactive" type="checkbox" ${l.active !== false ? 'checked' : ''}> ПОКАЗЫВАТЬ НА САЙТЕ</label></div></div>
      </div>`).join('') : '<div class="notice">Нет разделов. Нажми «＋ ДОБАВИТЬ РАЗДЕЛ».</div>';

    document.querySelectorAll('.link-editor [data-action]').forEach(btn => btn.onclick = () => {
      const card = btn.closest('.link-editor');
      const index = Number(card.dataset.index);
      const action = btn.dataset.action;
      if (action === 'delete') {
        const title = card.querySelector('.ltitle')?.value || `раздел ${index + 1}`;
        showModal({ title: 'УДАЛЕНИЕ РАЗДЕЛА', message: `Удалить «${title}»? Это действие изменит меню после сохранения.`, confirmText: 'УДАЛИТЬ', cancelText: 'ОТМЕНА', danger: true }).then(ok => {
          if (!ok) return;
          data.settings.links.splice(index, 1);
          renderSettings();
          showToast('Раздел удалён. Нажми «СОХРАНИТЬ ВСЁ», чтобы применить изменения.', 'ok');
        });
        return;
      } else if (action === 'up' && index > 0) {
        [data.settings.links[index - 1], data.settings.links[index]] = [data.settings.links[index], data.settings.links[index - 1]];
      } else if (action === 'down' && index < data.settings.links.length - 1) {
        [data.settings.links[index + 1], data.settings.links[index]] = [data.settings.links[index], data.settings.links[index + 1]];
      }
      renderSettings();
    });
  }

  function readLinksFromEditor() {
    return [...document.querySelectorAll('.link-editor')].map((x, i) => ({
      id: x.querySelector('.lid').value.trim() || String(i + 1).padStart(2, '0'),
      title: x.querySelector('.ltitle').value.trim() || 'CHANNEL',
      url: x.querySelector('.lurl').value.trim() || '#',
      subtitle: x.querySelector('.lsub').value.trim(),
      icon: x.querySelector('.lic').value.trim() || '>',
      active: x.querySelector('.lactive').checked
    }));
  }

  function addLink() {
    if (data.settings.links.length >= 20) return setSaveMessage('Максимум 20 разделов.', 'err');
    data.settings.links.push({ id: nextId(), title: 'НОВЫЙ РАЗДЕЛ', subtitle: 'Описание раздела', icon: '+', url: 'https://t.me/', active: true });
    renderSettings();
    const cards = document.querySelectorAll('.link-editor');
    cards[cards.length - 1]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    cards[cards.length - 1]?.querySelector('.ltitle')?.focus();
  }

  function setSaveMessage(text, cls) {
    const el = byId('saveMsg');
    if (el) { el.textContent = text; el.className = cls || ''; }
  }

  async function saveSettings() {
    if (saving) return;
    saving = true;
    const button = byId('saveSettings');
    if (button) { button.disabled = true; button.textContent = 'СОХРАНЕНИЕ...'; }
    try {
      const links = readLinksFromEditor();
      const response = await api('/api/admin/settings', { method: 'POST', body: JSON.stringify({ siteName: byId('siteName').value, telegramBotUsername: byId('bot').value, links }) });
      if (!response.ok) throw new Error('Не удалось сохранить');
      data = await api('/api/admin/me');
      renderSettings();
      setSaveMessage('✓ Сохранено. Главная страница уже использует новые настройки.', 'ok');
      showToast('Настройки сохранены', 'ok');
    } catch (e) {
      setSaveMessage(`Ошибка сохранения: ${e.message}`, 'err');
    } finally {
      saving = false;
      if (button) { button.disabled = false; button.textContent = 'СОХРАНИТЬ ВСЁ'; }
    }
  }

  async function resetStats() {
    const ok = await showModal({ title: 'ОЧИСТКА АНАЛИТИКИ', message: 'Удалить всю собранную статистику, посещения и события? Это действие нельзя отменить.', confirmText: 'ОЧИСТИТЬ', cancelText: 'ОТМЕНА', danger: true });
    if (!ok) return;
    await api('/api/admin/reset-stats', { method: 'POST' });
    await loadAnalytics();
    const m = byId('secMsg');
    if (m) { m.textContent = 'Аналитика очищена.'; m.className = 'ok'; }
  }

  start();
})();
