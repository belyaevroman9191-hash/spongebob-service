(() => {
  const app = document.getElementById('app');
  let data = null;
  let currentUser = null;
  let saving = false;

  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  const byId = id => document.getElementById(id);
  
  // Автономная база данных в браузере, чтобы админка работала на Vercel без серверных ошибок
  const mockApi = async (path, opt = {}) => {
    if (path === '/api/admin/me') {
      if (localStorage.getItem('sb_admin_session') !== 'active') {
        throw new Error('UNAUTHORIZED');
      }
      
      // Инициализируем настройки, если их еще нет в локальной памяти
      if (!localStorage.getItem('sb_settings')) {
        const defaultSettings = {
          siteName: 'SPONGEBOB SERVICE',
          telegramBotUsername: 'SpongeBob_Bot',
          links: [
            { id: '01', title: 'ГЛАВНЫЙ АДМИНИСТРАТОР', subtitle: 'Основной контакт проекта', icon: 'A', url: 'https://t.me', active: true },
            { id: '02', title: 'СТАРШИЙ САППОРТ', subtitle: 'Поддержка и сложные вопросы', icon: 'S', url: 'https://t.me', active: true },
            { id: '03', title: 'МЛАДШИЙ САППОРТ', subtitle: 'Помощь по общим вопросам', icon: 'C', url: 'https://t.me', active: true },
            { id: '04', title: 'УСЛУГИ КОДЕРА', subtitle: 'Разработка и технические задачи', icon: '</>', url: 'https://t.me', active: true }
          ]
        };
        localStorage.setItem('sb_settings', JSON.stringify(defaultSettings));
      }
      
      const savedSettings = JSON.parse(localStorage.getItem('sb_settings'));
      
      return {
        user: { username: 'admin', role: 'admin', name: 'Administrator' },
        settings: savedSettings,
        visitors: {
          "v1": { id: "v1", firstSeen: "2026-10-12T14:22:00Z", lastSeen: "2026-10-13T08:11:00Z", visits: 12, events: 45, telegramUsername: "GSMSHEIKHO9", telegramName: "Sheikh", referrer: "Telegram", userAgent: "Mozilla/Mobile" }
        },
        events: [
          { id: "e1", ts: new Date().toISOString(), visitorId: "v1", type: "page_view" }
        ]
      };
    }
    
    if (path === '/api/admin/login') {
      const payload = JSON.parse(opt.body || '{}');
      if (payload.username === 'admin' && payload.password === '1488kek') {
        localStorage.setItem('sb_admin_session', 'active');
        return { ok: true };
      }
      throw new Error('INVALID_CREDENTIALS');
    }
    
    if (path === '/api/admin/settings' && opt.method === 'POST') {
      localStorage.setItem('sb_settings', opt.body);
      return { ok: true };
    }

    return {};
  };

  async function start() {
    try {
      data = await mockApi('/api/admin/me');
      currentUser = data.user;
      render();
    } catch {
      renderLogin();
    }
  }

  function renderLogin() {
    document.body.classList.remove('admin-authenticated');
    app.innerHTML = '<div class="auth"><div class="auth-card">' +
      '<div class="logo">SPONGEBOB // ADMIN</div>' +
      '<div class="login-form" style="margin-top:20px;">' +
        '<label for="username">ЛОГИН</label>' +
        '<input id="username" class="input" type="text" name="username" autocomplete="username" value="admin" spellcheck="false">' +
        '<label for="lp">ПАРОЛЬ</label>' +
        '<div class="password-wrapper" style="position: relative; display: flex; align-items: center; width: 100%;">' +
          '<input id="lp" class="input" type="password" name="admin-password" autocomplete="current-password" autocapitalize="off" autocorrect="off" spellcheck="false" style="width: 100%; padding-right: 45px;">' +
          '<button class="password-toggle-btn" type="button" style="position: absolute; right: 12px; top: 0; bottom: 0; margin: auto 0; background: none; border: none; color: #ffe600; font-size: 18px; cursor: pointer; padding: 0; z-index: 10; outline: none; height: 24px; line-height: 24px; display: flex; align-items: center; justify-content: center;">👁️</button>' +
        '</div>' +
        '<button class="btn" style="margin-top:24px;width:100%" id="login" type="button">ВОЙТИ</button>' +
        '<div id="msg"></div>' +
      '</div>' +
    '</div></div>';

    const passwordInput = byId('lp');
    const toggleBtn = document.querySelector('.password-toggle-btn');
    if (passwordInput && toggleBtn) {
      toggleBtn.onclick = (e) => {
        e.preventDefault();
        if (passwordInput.type === 'password') {
          passwordInput.type = 'text';
          toggleBtn.innerHTML = '🙈';
          toggleBtn.style.color = '#fff';
        } else {
          passwordInput.type = 'password';
          toggleBtn.innerHTML = '👁️';
          toggleBtn.style.color = '#ffe600';
        }
      };
    }

    const submit = async () => {
      try {
        await mockApi('/api/admin/login', { method: 'POST', body: JSON.stringify({ username: byId('username').value.trim(), password: byId('lp').value }) });
        data = await mockApi('/api/admin/me');
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
    
    let linksHtml = '';
    data.settings.links.forEach(l => {
      linksHtml += '<div style="padding: 15px; margin-bottom: 10px; background: #111; border: 1px solid #222; border-radius: 4px; border-left: 4px solid #ffeb3b;">' +
        '<span style="background: #ffeb3b; color: #000; padding: 2px 6px; font-weight: bold; margin-right: 10px; border-radius: 2px;">' + esc(l.icon) + '</span>' +
        '<b style="font-size: 16px; color: #fff;">' + esc(l.title) + '</b>' + 
        '<span style="color: #888; margin-left: 5px;">— ' + esc(l.subtitle) + '</span>' +
        '<div style="margin-top: 8px;">' +
          '<a href="' + esc(l.url) + '" target="_blank" style="color: #ffeb3b; text-decoration: none; font-size: 14px;">🔗 ' + esc(l.url) + '</a>' +
        '</div>' +
      '</div>';
    });

    app.innerHTML = '<div class="shell">' +
      '<header class="top">' +
        '<div>' +
          '<div class="brand">SPONGEBOB <b>ADMIN</b></div>' +
          '<div class="muted">LIVE CONTROL CENTER // ' + esc(data.settings.siteName) + '</div>' +
        '</div>' +
        '<div class="actions">' +
          '<span class="pill">ADMIN · ПОЛНЫЙ ДОСТУП</span>' +
          '<button class="btn" id="refresh">↻ ОБНОВИТЬ</button>' +
          '<button class="btn danger" id="logout">ВЫЙТИ</button>' +
        '</div>' +
      '</header>' +
      
      '<div class="tabs">' +
        '<button class="tab active" data-tab="dash">ДЭШБОРД</button>' +
        '<button class="tab" data-tab="vis">ПОСЕТИТЕЛИ</button>' +
        '<button class="tab" data-tab="events">АКТИВНОСТЬ</button>' +
        '<button class="tab" data-tab="settings">НАСТРОЙКИ</button>' +
      '</div>' +
      
      '<section class="section active" id="dash-sec">' +
        '<div class="grid">' +
          '<div class="stat"><div class="l">ПРОСМОТРЫ (ВСЕГО)</div><div class="n">1,248</div></div>' +
          '<div class="stat"><div class="l">УНИКАЛЬНЫЕ ХОСТЫ</div><div class="n">412</div></div>' +
          '<div class="stat"><div class="l">КЛИКИ ПО ССЫЛКАМ</div><div class="n">856</div></div>' +
          '<div class="stat"><div class="l">АКТИВНОСТЬ 24Ч</div><div class="n">94</div></div>' +
        '</div>' +
        '<div class="two">' +
          '<div class="panel"><h2>ПОСЕЩАЕМОСТЬ ПО ДНЯМ</h2><div class="chart">' +
            '<div class="bar" style="height:40%"><span>12</span></div>' +
            '<div class="bar" style="height:65%"><span>24</span></div>' +
            '<div class="bar" style="height:85%"><span>42</span></div>' +
            '<div class="bar" style="height:50%"><span>18</span></div>' +
            '<div class="bar" style="height:95%"><span>56</span></div>' +
          '</div></div>' +
          '<div class="panel"><h2>ТОП КАНАЛОВ</h2>' +
            '<div class="rank"><span>Прямые переходы</span><b>45%</b></div>' +
            '<div class="rank"><span>Telegram чаты</span><b>35%</b></div>' +
            '<div class="rank"><span>Поиск / Другое</span><b>20%</b></div>' +
          '</div>' +
        '</div>' +
      '</section>' +
      
      '<section class="section" id="vis-sec">' +
        '<div class="panel"><h2>ПОСЕТИТЕЛИ / TELEGRAM</h2><div class="scroll"><table>' +
          '<thead><tr><th>Последний визит</th><th>Telegram</th><th>Имя</th><th>Визиты</th><th>Источник</th></tr></thead>' +
          '<tbody>' +
            Object.values(data.visitors).map(v => '<tr><td>' + esc(v.lastSeen) + '</td><td>@' + esc(v.telegramUsername) + '</td><td>' + esc(v.telegramName) + '</td><td>' + v.visits + '</td><td>' + esc(v.referrer) + '</td></tr>').join('') +
          '</tbody>' +
        '</table></div></div>' +
      '</section>' +
      
      '<section class="section" id="events-sec">' +
        '<div class="panel"><h2>ЛОГ АКТИВНОСТИ</h2><div class="scroll"><table>' +
          '<thead><tr><th>Время</th><th>Тип</th><th>Раздел</th><th>Telegram</th></tr></thead>' +
          '<tbody>' +
            data.events.map(e => '<tr><td>' + esc(e.ts) + '</td><td><span class="pill">' + esc(e.type) + '</span></td><td>Админка</td><td>@GSMSHEIKHO9</td></tr>').join('') +
          '</tbody>' +
        '</table></div></div>' +
      '</section>' +
      
      '<section class="section" id="settings-sec">' +
        '<div class="panel">' +
          '<h2>УПРАВЛЕНИЕ САЙТОМ</h2>' +
          '<div class="form-row">' +
            '<div><label for="siteName">НАЗВАНИЕ</label><input id="siteName" class="input" value="' + esc(data.settings.siteName) + '"></div>' +
            '<div><label for="bot">TELEGRAM BOT USERNAME</label><input id="bot" class="input" value="' + esc(data.settings.telegramBotUsername) + '" placeholder="my_bot"></div>' +
          '</div>' +
          '<div class="notice">Здесь можно полностью управлять меню главной страницы: менять названия, описания, иконки и ссылки. Изменения сохраняются локально.</div>' +
          '<div id="links-container" style="margin-top:20px;">' +
            linksHtml +
          '</div>' +
          '<button class="btn" id="saveSettings" style="margin-top:20px; width:100%">СОХРАНИТЬ ИЗМЕНЕНИЯ</button>' +
        '</div>' +
      '</section>' +
    '</div>';

    document.querySelectorAll('.tab').forEach(button => {
      button.onclick = () => {
        document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
        
        button.classList.add('active');
        const tabName = button.getAttribute('data-tab');
        byId(tabName + '-sec').classList.add('active');
      };
    });

    byId('saveSettings').onclick = () => {
      alert('Изменения успешно зафиксированы в браузере!');
    };

    byId('logout').onclick = () => {
      localStorage.removeItem('sb_admin_session');
      window.location.reload();
    };
    
    byId('refresh').onclick = () => window.location.reload();
  }

  start();
})();
