/* ===== Supabase 云同步（邮箱+密码；游客本地模式保留） =====
 * 设计：不登录时，所有数据只存浏览器 localStorage（与现版一致，纯本地）。
 *      登录后，每次写入触发防抖上传；打开页面时自动从云端拉取，实现手机↔电脑同步。
 *      每张用户数据经 Supabase RLS 隔离，互不影响。
 */
(function(){
  var SUPABASE_URL='https://bnayxdeiwwtyecxaiigj.supabase.co';
  /* 若同步失败，请到 Supabase 控制台 Settings → API 核对 anon public key 并替换下面的值（anon key 可公开，安全） */
  var SUPABASE_ANON='sb_publishable_OI8hG_6LpsrAxoxFO3VYmg_nNBOIlbz';
  var sb=null;
  try{ if(typeof supabase!=='undefined') sb=supabase.createClient(SUPABASE_URL,SUPABASE_ANON); }catch(e){ console.warn('[sync] Supabase 初始化失败（可能离线）',e); }

  var VIOLA_KEYS=['viola_schedule_v1','viola_maps_v1','viola_profile_v1','viola_brand_v1','viola_daily_v1','viola_goals_v1','viola_insp_v1','viola_assist_v1'];
  var currentUser=null, _syncTimer=null, _syncing=false;

  /* 拦截 localStorage 写入：游客模式只落本地；登录后每次写入触发防抖上传 */
  var _origSetItem=Storage.prototype.setItem;
  Storage.prototype.setItem=function(k,v){
    _origSetItem.call(this,k,v);
    if(typeof k==='string' && k.indexOf('viola_')===0) scheduleSync();
  };
  function scheduleSync(){ if(!sb||!currentUser) return; if(_syncTimer) clearTimeout(_syncTimer); _syncTimer=setTimeout(pushToCloud,1200); }
  function pushToCloud(){
    if(!sb||!currentUser||_syncing) return; _syncing=true;
    var blob={};
    VIOLA_KEYS.forEach(function(k){ var raw=localStorage.getItem(k); if(raw==null) return; try{ blob[k]=JSON.parse(raw); }catch(e){} });
    sb.from('app_data').upsert({user_id:currentUser.id,data:blob,updated_at:new Date().toISOString()}).then(function(r){ if(r.error) console.error('[sync] push error',r.error); _syncing=false; }).catch(function(e){ console.error('[sync] push failed',e); _syncing=false; });
  }
  function pullFromCloud(){
    if(!sb||!currentUser) return;
    sb.from('app_data').select('data').eq('user_id',currentUser.id).maybeSingle().then(function(r){
      if(r.error){ console.error('[sync] pull error',r.error); return; }
      if(r.data&&r.data.data){ var blob=r.data.data; VIOLA_KEYS.forEach(function(k){ if(blob[k]!==undefined){ try{ localStorage.setItem(k,JSON.stringify(blob[k])); }catch(e){} } }); }
    }).catch(function(e){ console.error('[sync] pull failed',e); });
  }
  function escHtml(s){ return String(s).replace(/[&<>"']/g,function(c){ if(c==='&')return '&amp;'; if(c==='<')return '&lt;'; if(c==='>')return '&gt;'; if(c==='"')return '&quot;'; return '&#39;'; }); }
  function renderAccount(){
    var el=document.getElementById('account-area'); if(!el) return;
    if(currentUser){
      el.innerHTML='<div class="acc-row"><span class="acc-mail">'+escHtml(currentUser.email||'')+'</span><span class="acc-state">☁ 已同步</span></div><button class="acc-btn" id="acc-signout">退出登录</button>';
      var so=document.getElementById('acc-signout'); if(so) so.onclick=doSignOut;
    }else{
      el.innerHTML='<button class="acc-btn acc-login" id="acc-login">☁ 登录 / 同步</button><div class="acc-tip">登录后手机电脑数据自动同步</div>';
      var lb=document.getElementById('acc-login'); if(lb) lb.onclick=openAuth;
    }
  }
  function openAuth(){ var m=document.getElementById('authModal'); if(m){ m.style.display='flex'; var e=document.getElementById('auth-email'); if(e) e.focus(); } }
  function closeAuth(){ var m=document.getElementById('authModal'); if(m) m.style.display='none'; }
  var ALLOWED_EMAIL='violaliu54@gmail.com';
  function doSignIn(){
    var msg=document.getElementById('auth-msg'); if(!sb){ msg.textContent='同步服务不可用（可能离线）'; return; }
    var email=document.getElementById('auth-email').value.trim();
    var pwd=document.getElementById('auth-pwd').value;
    if(email!==ALLOWED_EMAIL){ msg.textContent='同步功能仅对作者开放，请使用游客模式体验'; return; }
    msg.textContent='登录中…';
    sb.auth.signInWithPassword({email:email,password:pwd}).then(function(r){ if(r.error){ msg.textContent='登录失败：'+r.error.message; return; } msg.textContent=''; }).catch(function(e){ msg.textContent='登录失败：'+((e&&e.message)||e); });
  }
  function doSignUp(){
    var msg=document.getElementById('auth-msg'); if(!sb){ msg.textContent='同步服务不可用（可能离线）'; return; }
    var email=document.getElementById('auth-email').value.trim();
    var pwd=document.getElementById('auth-pwd').value;
    if(email!==ALLOWED_EMAIL){ msg.textContent='同步功能仅对作者开放，请使用游客模式体验'; return; }
    if(pwd.length<6){ msg.textContent='密码至少 6 位'; return; }
    msg.textContent='注册中…';
    sb.auth.signUp({email:email,password:pwd}).then(function(r){ if(r.error){ msg.textContent='注册失败：'+r.error.message; return; } msg.textContent='注册成功！若开启邮箱确认，请先查收邮件激活后再登录。'; }).catch(function(e){ msg.textContent='注册失败：'+((e&&e.message)||e); });
  }
  function doSignOut(){ if(!sb) return; sb.auth.signOut(); }
  function initAuth(){
    /* 关闭按钮 + 点击遮罩关闭：无论 Supabase 是否可用都绑定，保证弹窗总能关掉 */
    var ca=document.getElementById('auth-cancel'); if(ca) ca.onclick=closeAuth;
    var am=document.getElementById('authModal'); if(am) am.addEventListener('click',function(e){ if(e.target.id==='authModal') closeAuth(); });
    if(!sb){ renderAccount(); return; }
    sb.auth.getSession().then(function(r){
      if(r.data&&r.data.session) currentUser=r.data.session.user;
      renderAccount();
      var si=document.getElementById('auth-signin'); if(si) si.onclick=doSignIn;
      var su=document.getElementById('auth-signup'); if(su) su.onclick=doSignUp;
      if(currentUser){
        var flag='synced_'+currentUser.id;
        if(!sessionStorage.getItem(flag)){ pullFromCloud(); sessionStorage.setItem(flag,'1'); location.reload(); return; }
      }
      sb.auth.onAuthStateChange(function(event,session){
        if(event==='SIGNED_IN'){ currentUser=session.user; sessionStorage.removeItem('synced_'+currentUser.id); location.reload(); }
        else if(event==='SIGNED_OUT'){ currentUser=null; location.reload(); }
      });
    }).catch(function(e){ renderAccount(); });
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',initAuth); else initAuth();
})();
