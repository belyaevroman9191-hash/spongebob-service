const crypto = require('crypto');
const { readState, writeState, FIXED_PASSWORD } = require('../lib/store');

const SESSION_TTL = 1000 * 60 * 60 * 12;
const secureCookie = process.env.VERCEL ? '; Secure' : '';
const ADMIN_ACCOUNT = Object.freeze({ username: 'admin', role: 'admin', name: 'Administrator' });
const now = () => new Date().toISOString();
const random = () => crypto.randomBytes(32).toString('hex');
const hash = value => crypto.createHash('sha256').update(String(value)).digest('hex');
const json = (res, status, data, headers = {}) => { res.status(status).setHeader('Cache-Control', 'no-store'); for (const [k,v] of Object.entries(headers)) res.setHeader(k,v); return res.json(data); };
function cookies(req) {
  const out = {};
  String(req.headers.cookie || '').split(';').forEach(part => { const i = part.indexOf('='); if (i > 0) { const k = part.slice(0,i).trim(); try { out[k] = decodeURIComponent(part.slice(i+1).trim()); } catch {} } });
  return out;
}
function passwordOk(password, stored = FIXED_PASSWORD) {
  const got = crypto.pbkdf2Sync(String(password), stored.salt, 120000, 64, 'sha512').toString('hex');
  const a = Buffer.from(got, 'hex'), b = Buffer.from(stored.hash, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a,b);
}
function getSession(req, state) {
  const sid = cookies(req).admin_session, session = sid && state.sessions[sid];
  if (!session) return null;
  if (Date.now() > session.expiresAt) { delete state.sessions[sid]; return null; }
  return session;
}
function stats(state) {
  const ev = Array.isArray(state.events) ? state.events : [], visitors = state.visitors || {};
  const ms = Date.now(), cut24 = ms-86400000, cut7=ms-7*86400000, cut30=ms-30*86400000;
  const pages=ev.filter(e=>e.type==='page_view'), clicks=ev.filter(e=>e.type==='link_click');
  const inWindow=(e,cut)=>{const t=Date.parse(e.ts);return Number.isFinite(t)&&t>=cut;};
  const uniqueIds=list=>new Set(list.map(e=>e.visitorId).filter(Boolean)).size;
  const byLink={}; clicks.forEach(e=>byLink[e.linkId]=(byLink[e.linkId]||0)+1);
  const sources={}; Object.values(visitors).forEach(v=>{const s=v.referrer||'direct / Telegram';sources[s]=(sources[s]||0)+1;});
  const devices={mobile:0,desktop:0,tablet:0,other:0};
  Object.values(visitors).forEach(v=>{const ua=String(v.userAgent||'').toLowerCase();if(/ipad|tablet|android(?!.*mobile)/.test(ua))devices.tablet++;else if(/mobi|iphone|ipod|android/.test(ua))devices.mobile++;else if(/windows|macintosh|linux|cros/.test(ua))devices.desktop++;else devices.other++;});
  const days={}; pages.forEach(e=>{const d=String(e.ts||'').slice(0,10);days[d]=(days[d]||0)+1;});
  const hours24=Array.from({length:24},(_,hour)=>({hour,views:0}));
  pages.filter(e=>inWindow(e,cut24)).forEach(e=>{const h=new Date(e.ts).getHours();if(Number.isFinite(h))hours24[h].views++;});
  const topLinks=Object.entries(byLink).sort((a,b)=>b[1]-a[1]).slice(0,10).map(([id,count])=>({id,title:state.settings.links.find(x=>x.id===id)?.title||id,count}));
  const tg=Object.values(visitors).filter(v=>v.telegramUsername), today=pages.filter(e=>inWindow(e,cut24));
  return {views:pages.length,unique:Object.keys(visitors).length,todayViews:today.length,weekViews:pages.filter(e=>inWindow(e,cut7)).length,monthViews:pages.filter(e=>inWindow(e,cut30)).length,unique24h:uniqueIds(today),unique7d:uniqueIds(pages.filter(e=>inWindow(e,cut7))),unique30d:uniqueIds(pages.filter(e=>inWindow(e,cut30))),clicks,clicksCount:clicks.length,todayClicks:clicks.filter(e=>inWindow(e,cut24)).length,clickRate:pages.length?Number((clicks.length/pages.length*100).toFixed(1)):0,byLink,topLinks,telegramVisitors:tg.length,telegramViews:pages.filter(e=>e.telegramUsername).length,days,hours24,sources,devices,live:Object.values(visitors).filter(v=>ms-new Date(v.lastSeen).getTime()<120000).length};
}
function eventTrack(req, state, payload) {
  const c=cookies(req); let vid=c.visitor_id || random();
  const ip=String(req.headers['x-forwarded-for']||'').split(',')[0].trim();
  const visitor=state.visitors[vid] ||= {id:vid,firstSeen:now(),lastSeen:now(),visits:0,events:0,telegramUsername:null,telegramName:null,referrer:null,userAgent:null,ipHash:null};
  visitor.lastSeen=now(); visitor.visits+=payload.type==='page_view'?1:0; visitor.events+=1;
  visitor.referrer=visitor.referrer||req.headers.referer||null; visitor.userAgent=req.headers['user-agent']||visitor.userAgent; visitor.ipHash=hash(ip);
  if(payload.telegramUsername)visitor.telegramUsername=String(payload.telegramUsername).replace(/^@/,'').slice(0,64);
  if(payload.telegramName)visitor.telegramName=String(payload.telegramName).slice(0,120);
  const safe={}; for(const [k,v] of Object.entries(payload||{})) if(!['id','ts','visitorId'].includes(k) && typeof v!=='object') safe[k]=v;
  state.events.push({id:random(),ts:now(),visitorId:vid,...safe}); if(state.events.length>20000)state.events.splice(0,state.events.length-20000);
  return {vid};
}

module.exports = async function handler(req,res) {
  if (req.method === 'OPTIONS') { res.setHeader('Allow','GET, POST, OPTIONS'); return res.status(204).end(); }
  const path = '/' + (Array.isArray(req.query.path) ? req.query.path.join('/') : String(req.query.path || ''));
  try {
    const state=await readState();
    if(req.method==='POST' && path==='/event') {
      const {vid}=eventTrack(req,state,req.body && typeof req.body==='object'?req.body:{}); await writeState(state);
      return json(res,200,{ok:true},{'Set-Cookie':`visitor_id=${encodeURIComponent(vid)}; Max-Age=31536000; Path=/; SameSite=Lax${secureCookie}`});
    }
    if(req.method==='GET' && path==='/config') return json(res,200,{siteName:state.settings.siteName,links:state.settings.links,telegramBotUsername:state.settings.telegramBotUsername});
    if(req.method==='GET' && path==='/admin/status') return json(res,200,{setup:true,fixedAccess:true,username:ADMIN_ACCOUNT.username});
    if(req.method==='POST' && path==='/admin/setup') return json(res,403,{error:'FIXED_ACCESS_ONLY'});
    if(req.method==='POST' && path==='/admin/login') {
      const b=req.body||{}; if(String(b.username||'').trim()!==ADMIN_ACCOUNT.username||!passwordOk(b.password))return json(res,401,{error:'INVALID_LOGIN'});
      const sid=random();state.sessions[sid]={createdAt:Date.now(),expiresAt:Date.now()+SESSION_TTL,username:ADMIN_ACCOUNT.username,role:ADMIN_ACCOUNT.role,name:ADMIN_ACCOUNT.name};await writeState(state);
      return json(res,200,{ok:true,user:ADMIN_ACCOUNT},{'Set-Cookie':`admin_session=${sid}; Max-Age=${SESSION_TTL/1000}; HttpOnly; Path=/; SameSite=Strict${secureCookie}`});
    }
    if(req.method==='POST' && path==='/admin/logout') {const c=cookies(req);if(c.admin_session)delete state.sessions[c.admin_session];await writeState(state);return json(res,200,{ok:true},{'Set-Cookie':`admin_session=; Max-Age=0; HttpOnly; Path=/; SameSite=Strict${secureCookie}`});}
    if(path.startsWith('/admin/')) {
      const s=getSession(req,state);if(!s){await writeState(state);return json(res,401,{error:'UNAUTHORIZED'});}
      if(req.method==='GET'&&path==='/admin/me')return json(res,200,{ok:true,user:{username:s.username,role:s.role,name:s.name},settings:state.settings,stats:stats(state)});
      if(req.method==='GET'&&path==='/admin/analytics')return json(res,200,{stats:stats(state),events:state.events.slice(-500).reverse(),visitors:Object.values(state.visitors).sort((a,b)=>new Date(b.lastSeen)-new Date(a.lastSeen)).slice(0,500)});
      if(req.method==='GET'&&path==='/admin/export'){res.setHeader('Content-Disposition','attachment; filename="spongebob-analytics.json"');res.setHeader('Content-Type','application/json; charset=utf-8');return res.status(200).send(JSON.stringify({exportedAt:now(),settings:state.settings,visitors:state.visitors,events:state.events},null,2));}
      if(s.role!=='admin')return json(res,403,{error:'ADMIN_ONLY'});
      if(req.method==='POST'&&path==='/admin/settings'){
        const b=req.body||{};if(b.siteName!==undefined)state.settings.siteName=String(b.siteName).slice(0,100);
        if(Array.isArray(b.links)){const used=new Set();state.settings.links=b.links.slice(0,20).map((x,i)=>{let id=String(x.id||'').trim()||String(i+1).padStart(2,'0');if(used.has(id)){let n=i+1;do{id=String(n++).padStart(2,'0');}while(used.has(id));}used.add(id);return{id:id.slice(0,40),title:String(x.title||'CHANNEL').slice(0,100),subtitle:String(x.subtitle||'').slice(0,150),icon:String(x.icon||'>').slice(0,8),url:String(x.url||'#').slice(0,500),active:x.active!==false};});}
        if(b.telegramBotUsername!==undefined)state.settings.telegramBotUsername=String(b.telegramBotUsername).replace(/^@/,'').slice(0,64);await writeState(state);return json(res,200,{ok:true});
      }
      if(req.method==='POST'&&path==='/admin/password')return json(res,403,{error:'FIXED_PASSWORD'});
      if(req.method==='POST'&&path==='/admin/reset-stats'){state.visitors={};state.events=[];await writeState(state);return json(res,200,{ok:true});}
    }
    return json(res,404,{error:'NOT_FOUND'});
  } catch(error) { console.error('API error:',error); return json(res,500,{error:'SERVER_ERROR',message:process.env.NODE_ENV==='development'?error.message:undefined}); }
};
