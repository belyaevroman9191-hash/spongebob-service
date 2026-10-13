const { Pool } = require("pg");
const crypto = require("crypto");
let pool;
function db() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is missing");
  if (!pool) pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }, max: 3 });
  return pool;
}
const hash = s => crypto.createHash("sha256").update(String(s)).digest("hex");
const token = () => crypto.randomBytes(32).toString("hex");
const defaults = {siteName:"SPONGEBOB SERVICE",telegramBotUsername:"",links:[
{id:"01",title:"ГЛАВНЫЙ АДМИНИСТРАТОР",subtitle:"Основной контакт проекта",icon:"A",url:"https://t.me/GSMSHEIKHO9",active:true},
{id:"02",title:"СТАРШИЙ САППОРТ",subtitle:"Поддержка и сложные вопросы",icon:"S",url:"https://t.me/sponge_bo888",active:true},
{id:"03",title:"МЛАДШИЙ САППОРТ",subtitle:"Помощь по общим вопросам",icon:"C",url:"https://t.me/SuportSpongeBob",active:true},
{id:"04",title:"УСЛУГИ КОДЕРА",subtitle:"Разработка и технические задачи",icon:"</>",url:"https://t.me/GSMSHEIKHO9",active:true}]};
async function init(q) {
 await q.query("CREATE TABLE IF NOT EXISTS site_settings(id int primary key check(id=1), data jsonb not null)");
 await q.query("CREATE TABLE IF NOT EXISTS admin_sessions(token_hash text primary key, expires_at timestamptz not null)");
 await q.query("CREATE TABLE IF NOT EXISTS visitors(id text primary key, data jsonb not null)");
 await q.query("CREATE TABLE IF NOT EXISTS events(id text primary key, ts timestamptz not null, data jsonb not null)");
 await q.query("INSERT INTO site_settings(id,data) VALUES(1,$1::jsonb) ON CONFLICT(id) DO NOTHING",[JSON.stringify(defaults)]);
}
function cookie(req,n){const s=(req.headers.cookie||"").split(";").map(x=>x.trim()).find(x=>x.startsWith(n+"="));return s?decodeURIComponent(s.slice(n.length+1)):null}
function out(res,status,obj,headers={}){res.setHeader("Cache-Control","no-store");Object.entries(headers).forEach(([k,v])=>res.setHeader(k,v));res.status(status).json(obj)}
module.exports = async (req,res)=>{
 try {
  const q=db(); await init(q);
  const routeParts=req.query.path;
  const path="/api/"+(Array.isArray(routeParts)?routeParts.join("/"):String(routeParts||"")).replace(/^\/+|\/+$/g,"");
  const b=req.body&&typeof req.body==="object"?req.body:{};
  if(req.method==="GET"&&path==="/api/config"){
   const r=await q.query("SELECT data FROM site_settings WHERE id=1");const s=r.rows[0].data;
   return out(res,200,{siteName:s.siteName,links:s.links,telegramBotUsername:s.telegramBotUsername});
  }
  if(req.method==="GET"&&path==="/api/admin/status")return out(res,200,{setup:true,fixedAccess:true,username:"admin"});
  if(req.method==="POST"&&path==="/api/admin/login"){
   if(!process.env.ADMIN_PASSWORD)return out(res,503,{error:"ADMIN_PASSWORD_NOT_CONFIGURED"});
   if(String(b.username||"").trim()!=="admin"||hash(b.password||"")!==hash(process.env.ADMIN_PASSWORD))return out(res,401,{error:"INVALID_LOGIN"});
   const t=token();await q.query("INSERT INTO admin_sessions(token_hash,expires_at) VALUES($1,now()+interval '12 hours')",[hash(t)]);
   return out(res,200,{ok:true,user:{username:"admin",role:"admin",name:"Administrator"}},{"Set-Cookie":`admin_session=${t}; Max-Age=43200; HttpOnly; Secure; Path=/; SameSite=Strict`});
  }
  if(req.method==="POST"&&path==="/api/admin/logout"){
   const t=cookie(req,"admin_session");if(t)await q.query("DELETE FROM admin_sessions WHERE token_hash=$1",[hash(t)]);
   res.setHeader("Set-Cookie","admin_session=; Max-Age=0; HttpOnly; Secure; Path=/; SameSite=Strict");return out(res,200,{ok:true});
  }
  if(path.startsWith("/api/admin/")){
   const t=cookie(req,"admin_session");const auth=t?await q.query("SELECT 1 FROM admin_sessions WHERE token_hash=$1 AND expires_at>now()",[hash(t)]):{rows:[]};
   if(!auth.rows.length)return out(res,401,{error:"UNAUTHORIZED"});
   const cfg=(await q.query("SELECT data FROM site_settings WHERE id=1")).rows[0].data;
   const ev=(await q.query("SELECT data FROM events ORDER BY ts DESC LIMIT 20000")).rows.map(r=>r.data);
   const vs=(await q.query("SELECT data FROM visitors")).rows.map(r=>r.data);
   const pages=ev.filter(e=>e.type==="page_view"), clicks=ev.filter(e=>e.type==="link_click"), byLink={};
   clicks.forEach(e=>byLink[e.linkId]=(byLink[e.linkId]||0)+1);
   const now=Date.now(), since=n=>ev.filter(e=>Date.parse(e.ts)>=now-n);
   const stats={views:pages.length,unique:vs.length,todayViews:since(86400000).filter(e=>e.type==="page_view").length,weekViews:since(604800000).filter(e=>e.type==="page_view").length,monthViews:since(2592000000).filter(e=>e.type==="page_view").length,unique24h:new Set(since(86400000).filter(e=>e.type==="page_view").map(e=>e.visitorId)).size,unique7d:new Set(since(604800000).filter(e=>e.type==="page_view").map(e=>e.visitorId)).size,unique30d:new Set(since(2592000000).filter(e=>e.type==="page_view").map(e=>e.visitorId)).size,clicks,clicksCount:clicks.length,todayClicks:since(86400000).filter(e=>e.type==="link_click").length,clickRate:pages.length?Number((clicks.length/pages.length*100).toFixed(1)):0,byLink,topLinks:Object.entries(byLink).map(([id,count])=>({id,count,title:cfg.links.find(x=>x.id===id)?.title||id})).sort((a,b)=>b.count-a.count).slice(0,10),telegramVisitors:vs.filter(v=>v.telegramUsername).length,telegramViews:pages.filter(e=>e.telegramUsername).length,days:{},hours24:Array.from({length:24},(_,hour)=>({hour,views:0})),sources:{},devices:{mobile:0,desktop:0,tablet:0,other:0},live:vs.filter(v=>now-Date.parse(v.lastSeen)<120000).length};
   pages.forEach(e=>stats.days[e.ts.slice(0,10)]=(stats.days[e.ts.slice(0,10)]||0)+1);
   vs.forEach(v=>{let s=v.referrer||"direct / Telegram";stats.sources[s]=(stats.sources[s]||0)+1;});
   if(req.method==="GET"&&path==="/api/admin/me")return out(res,200,{ok:true,user:{username:"admin",role:"admin",name:"Administrator"},settings:cfg,stats});
   if(req.method==="GET"&&path==="/api/admin/analytics")return out(res,200,{stats,events:ev.slice(0,500),visitors:vs.sort((a,b)=>Date.parse(b.lastSeen)-Date.parse(a.lastSeen)).slice(0,500)});
   if(req.method==="GET"&&path==="/api/admin/export")return out(res,200,{exportedAt:new Date().toISOString(),settings:cfg,visitors:Object.fromEntries(vs.map(v=>[v.id,v])),events:ev});
   if(req.method==="POST"&&path==="/api/admin/settings"){
    if(b.siteName!==undefined)cfg.siteName=String(b.siteName).slice(0,100);
    if(Array.isArray(b.links))cfg.links=b.links.slice(0,20).map((x,i)=>({id:String(x.id||String(i+1).padStart(2,"0")).slice(0,40),title:String(x.title||"CHANNEL").slice(0,100),subtitle:String(x.subtitle||"").slice(0,150),icon:String(x.icon||">").slice(0,8),url:String(x.url||"#").slice(0,500),active:x.active!==false}));
    if(b.telegramBotUsername!==undefined)cfg.telegramBotUsername=String(b.telegramBotUsername).replace(/^@/,"").slice(0,64);
    await q.query("UPDATE site_settings SET data=$1::jsonb WHERE id=1",[JSON.stringify(cfg)]);return out(res,200,{ok:true});
   }
   if(req.method==="POST"&&path==="/api/admin/reset-stats"){await q.query("TRUNCATE events,visitors");return out(res,200,{ok:true});}
   if(req.method==="POST"&&path==="/api/admin/password")return out(res,403,{error:"FIXED_PASSWORD"});
  }
  if(req.method==="POST"&&path==="/api/event"){
   const vid=cookie(req,"visitor_id")||token(), ts=new Date().toISOString(), type=String(b.type||"event");
   const r=await q.query("SELECT data FROM visitors WHERE id=$1",[vid]);
   const v=r.rows[0]?.data||{id:vid,firstSeen:ts,lastSeen:ts,visits:0,events:0,telegramUsername:null,telegramName:null,referrer:null,userAgent:null,ipHash:null};
   v.lastSeen=ts;v.visits+=type==="page_view"?1:0;v.events++;v.referrer=v.referrer||req.headers.referer||null;v.userAgent=req.headers["user-agent"]||v.userAgent;
   if(b.telegramUsername)v.telegramUsername=String(b.telegramUsername).replace(/^@/,"").slice(0,64);if(b.telegramName)v.telegramName=String(b.telegramName).slice(0,120);
   const e={id:token(),ts,visitorId:vid,...b,type};
   await q.query("INSERT INTO visitors(id,data) VALUES($1,$2::jsonb) ON CONFLICT(id) DO UPDATE SET data=EXCLUDED.data",[vid,JSON.stringify(v)]);
   await q.query("INSERT INTO events(id,ts,data) VALUES($1,$2,$3::jsonb)",[e.id,ts,JSON.stringify(e)]);
   return out(res,200,{ok:true},{"Set-Cookie":`visitor_id=${vid}; Max-Age=31536000; Path=/; SameSite=Lax`});
  }
  return out(res,404,{error:"NOT_FOUND"});
 } catch(e){console.error("SpongeBob API:",e);return out(res,500,{error:"SERVER_ERROR"});}
};
