(() => {
  const app = document.getElementById('app');
  let data = null;
  let currentUser = null;
  let saving = false;

  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  const byId = id => document.getElementById(id);
  
  // Эмуляция серверной базы данных в localStorage для Vercel
  const mockApi = async (path, opt = {}) => {
    if (path === '/api/admin/me') {
      if (localStorage.getItem('sb_admin_session') !== 'active') {
        throw new Error('UNAUTHORIZED');
      }
      
      if (!localStorage.getItem('sb_settings')) {
        const defaultSettings = {
          siteName: 'SPONGEBOB SERVICE',
          telegramBotUsername: 'SpongeBot_Robot',
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
        visitors: [
          { lastSeen: "Только что", telegramUsername: "user_phone", telegramName: "Иван (Моб)", visits: 14, referrer: "Telegram", device: "mobile" },
          { lastSeen: "5 мин. назад", telegramUsername: "user_desktop", telegramName: "Алексей (ПК)", visits: 8, referrer: "Прямой", device: "desktop" },
          { lastSeen: "1 час назад", telegramUsername: "user_tablet", telegramName: "Мария (Планшет)", visits: 3, referrer: "Реклама", device: "tablet" }
        ],
        events: [
          { ts: "Только что", type: "click", detail: "Клик по ссылке Саппорта", user: "@user_phone" },
          { ts: "2 мин. назад", type: "page_view", detail: "Вход на главную", user: "@user_desktop" }
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
      
      // Раздел 1: ДЭШБОРД (Аналитика по устройствам ПК / Смартфоны / Таблеты)
      '<section class="section active" id="dash-sec">' +
        '<div class="grid">' +
          '<div class="stat"><div class="l">ОБЩИЕ ПРОСМОТРЫ</div><div class="n">1,488</div></div>' +
          '<div class="stat"><div class="l">КОМПЬЮТЕРЫ (ПК)</div><div class="n" style="color:#55ff91">520</div></div>' +
          '<div class="stat"><div class="l">ТЕЛЕФОНЫ (МОБИЛЬНЫЕ)</div><div class="n" style="color:#ffe600">742</div></div>' +
          '<div class="stat"><div class="l">ПЛАНШЕТЫ</div><div class="n" style="color:#ff5364">22</div></div>' +
        '</div>' +
        '<div class="two" style="margin-top:20px;">' +
          '<div class="panel"><h2>УСТРОЙСТВА ПОЛЬЗОВАТЕЛЕЙ</h2>' +
            '<div class="rank"><span>📱 Смартфоны (iOS / Android)</span><b>62%</b></div>' +
            '<div class="rank"><span>💻 Компьютеры (Windows / macOS)</span><b>35%</b></div>' +
            '<div class="rank"><span>📟 Планшеты (iPad / Tablets)</span><b>3%</b></div>' +
          '</div>' +
          '<div class="panel"><h2>ИСТОЧНИКИ ТРАФИКА</h2>' +
            '<div class="rank"><span>Переходы из Telegram</span><b>78%</b></div>' +
            '<div class="rank"><span>Прямые ссылки</span><b>22%</b></div>' +
          '</div>' +
        '</div>' +
      '</section>' +
      
      // Раздел 2: ПОСЕТИТЕЛИ
      '<section class="section" id="vis-sec">' +
        '<div class="panel"><h2>ПОСЕТИТЕЛИ И ИХ УСТРОЙСТВА</h2><div class="scroll"><table>' +
          '<thead><tr><th>Последний визит</th><th>Telegram</th><th>Имя</th><th>Устройство</th><th>Визиты</th></tr></thead>' +
          '<tbody>' +
            data.visitors.map(v => '<tr><td>' + esc(v.lastSeen) + '</td><td>@' + esc(v.telegramUsername) + '</td><td>' + esc(v.telegramName) + '</td><td><span class="pill">' + esc(v.device) + '</span></td><td>' + v.visits + '</td></tr>').join('') +
          '</tbody>' +
        '</table></div></div>' +
      '</section>' +
      
      // Раздел 3: АКТИВНОСТЬ (Лог кликов)
      '<section class="section" id="events-sec">' +
        '<div class="panel"><h2>ЛОГ АКТИВНОСТИ В РЕАЛЬНОМ ВРЕМЕНИ</h2><div class="scroll"><table>' +
          '<thead><tr><th>Время</th><th>Событие</th><th>Описание действия</th><th>Пользователь</th></tr></thead>' +
          '<tbody>' +
            data.events.map(e => '<tr><td>' + esc(e.ts) + '</td><td><span class="pill">' + esc(e.type) + '</span></td><td>' + esc(e.detail) + '</td><td>' + esc(e.user) + '</td></tr>').join('') +
          '</tbody>' +
        '</table></div></div>' +
      '</section>' +
      
      // Раздел 4: НАСТРОЙКИ (Конструктор с добавлением и удалением кнопок)
      '<section class="section" id="settings-sec">' +
        '<div class="panel">' +
          '<h2>УПРАВЛЕНИЕ КНОПКАМИ ГЛАВНОЙ СТРАНИЦЫ</h2>' +
          '<div class="form-row" style="margin-bottom:20px;">' +
            '<div><label for="siteName">НАЗВАНИЕ ПРОЕКТА</label><input id="siteName" class="input" value="' + esc(data.settings.siteName) + '"></div>' +
            '<div><label for="bot">TELEGRAM BOT USERNAME</label><input id="bot" class="input" value="' + esc(data.settings.telegramBotUsername) + '"></div>' +
          '</div>' +
          '<div class="settings-toolbar">' +
            '<button class="btn" id="addLinkBtn" type="button">＋ ДОБАВИТЬ НОВЫЙ РАЗДЕЛ</button>' +
          '</div>' +
          '<div id="links-container" style="margin-top:15px;">' +
            data.settings.links.map((l, index) => 
              '<div class="link-editor" style="border: 1px solid #25321f; padding: 15px; margin-bottom: 15px; background: #060906;">' +
                '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 10px;">' +
                  '<b>Раздел #' + (index + 1) + '</b>' +
                  '<button class="mini danger-mini delete-btn" type="button" style="height:28px; min-height:28px; padding: 0 10px;">Удалить</button>' +
                '</div>' +
                '<div class="form-row">' +
                  '<div><label>ИКОНКА</label><input class="input link-icon" value="' + esc(l.icon) + '"></div>' +
                  '<div><label>ЗАГОЛОВОК КНОПКИ</label><input class="input link-title" value="' + esc(l.title) + '"></div>' +
                  '<div><label>ПОДЗАГОЛОВОК</label><input class="input link-subtitle" value="' + esc(l.subtitle) + '"></div>' +
                '</div>' +
                '<div style="margin-top:10px;"><label>ССЫЛКА (URL / t.me)</label><input class="input link-url" value="' + esc(l.url) + '"></div>' +
              '</div>'
            ).join('') +
          '</div>' +
          '<button class="btn" id="saveSettings" style="margin-top:25px; width:100%; height:45px;">СОХРАНИТЬ И ОБНОВИТЬ МЕНЮ</button>' +
        '</div>' +
      '</section>' +
    '</div>';

    // Логика табов
    document.querySelectorAll('.tab').forEach(button => {
      button.onclick = () => {
        document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
        
        button.classList.add('active');
        const tabName = button.getAttribute('data-tab');
        byId(tabName + '-sec').classList.add('active');
      };
    });

    // Функция динамического удаления разделов
    const initDeleteButtons = () => {
      document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.onclick = () => {
          btn.closest('.link-editor').remove();
        };
      });
    };
    initDeleteButtons();

    // Динамическое добавление новых разделов на главную
    byId('addLinkBtn').onclick = () => {
      const container = byId('links-container');
      const index = container.querySelectorAll('.link-editor').length;
      const div = document.createElement('div');
      div.className = 'link-editor';
      div.style = 'border: 1px solid #25321f; padding: 15px; margin-bottom: 15px; background: #060906;';
      div.innerHTML = '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 10px;">' +
          '<b>Новый раздел #' + (index + 1) + '</b>' +
          '<button class="mini danger-mini delete-btn" type="button" style="height:28px; min-height:28px; padding: 0 10px;">Удалить</button>' +
        '</div>' +
        '<div class="form-row">' +
          '<div><label>ИКОНКА</label><input class="input link-icon" value="🔗"></div>' +
          '<div><label>ЗАГОЛОВОК КНОПКИ</label><input class="input link-title" value="Новая ссылка"></div>' +
          '<div><label>ПОДЗАГОЛОВОК</label><input class="input link-subtitle" value="Описание"></div>' +
        '</div>' +
        '<div style="margin-top:10px;"><label>ССЫЛКА (URL / t.me)</label><input class="input link-url" value="https://t.me"></div>';
      container.appendChild(div);
      initDeleteButtons();
    };

    // Сохранение структуры меню
    byId('saveSettings').onclick = async () => {
      const updatedLinks = [];
      document.querySelectorAll('.link-editor').forEach((el, idx) => {
        updatedLinks.push({
          id: String(idx + 1).padStart(2, '0'),
          icon: el.querySelector('.link-icon').value,
          title: el.querySelector('.link-title').value,
          subtitle: el.querySelector('.link-subtitle').value,
          url: el.querySelector('.link-url').value,
          active: true
        });
      });

      const updatedSettings = {
        siteName: byId('siteName').value,
        telegramBotUsername: byId('bot').value,
        links: updatedLinks
      };

      await mockApi('/api/admin/settings', { method: 'POST', body: JSON.stringify(updatedSettings) });
      alert('Конфигурация меню успешно сохранена!');
      window.location.reload();
    };

    byId('logout').onclick = () => {
      localStorage.removeItem('sb_admin_session');
      window.location.reload();
    };
    
    byId('refresh').onclick = () => window.location.reload();
  }

  start();
})();
