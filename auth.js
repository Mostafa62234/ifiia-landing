/* ══════════════════════════════════════════════════════════════
   I.F.I.A — auth module (ES module, loaded lazily).
   index.html only imports this file when the visitor clicks
   Sign in / Register, or when the URL carries an OAuth
   ?code= / ?error=. The landing page critical path never
   touches Supabase, so PageSpeed stays unaffected.
   ══════════════════════════════════════════════════════════════ */

const SB_URL = 'https://nogkagjuubrupybnoqib.supabase.co';
const SB_KEY = 'sb_publishable_qc2Ob642yIlOKiWVApWvkw_CzquviZl';
const SB_STORAGE = 'sb-nogkagjuubrupybnoqib-auth-token';

const MSG = {
  ar: {
    welcome: 'مرحباً بك في I.F.I.A',
    signedOut: 'تم تسجيل الخروج',
    checkEmail: 'تم إرسال رابط التأكيد إلى بريدك الإلكتروني. تحقق من صندوق الوارد، وإن لم يصل فتحقق من مجلد الرسائل غير المرغوب فيها.',
    resetSent: 'تم إرسال رابط استعادة كلمة المرور إلى بريدك الإلكتروني.',
    resendDone: 'تم إعادة إرسال رابط التأكيد'
  },
  en: {
    welcome: 'Welcome to I.F.I.A',
    signedOut: 'Signed out',
    checkEmail: 'A confirmation link was sent to your inbox. Check spam if you do not see it.',
    resetSent: 'A password reset link was sent to your inbox.',
    resendDone: 'Confirmation link re-sent'
  }
};

const ERR = {
  ar: {
    invalid: 'البريد الإلكتروني أو كلمة المرور غير صحيحة',
    notConfirmed: 'لم يتم تأكيد بريدك الإلكتروني بعد — تحقق من بريدك',
    exists: 'هذا البريد الإلكتروني مسجل بالفعل',
    weak: 'كلمة المرور يجب ألا تقل عن ٨ أحرف',
    rate: 'تم تجاوز الحد المسموح — حاول بعد قليل (حد البريد ساعتان/٢ رسالة)',
    network: 'تعذّر الوصول إلى الخادم — تحقق من اتصالك بالإنترنت',
    provider: 'تسجيل الدخول عبر هذا المزود غير مفعّل بعد',
    generic: 'حدث خطأ — حاول مرة أخرى'
  },
  en: {
    invalid: 'Invalid email or password',
    notConfirmed: 'Email not confirmed yet — check your inbox',
    exists: 'This email is already registered',
    weak: 'Password must be at least 8 characters',
    rate: 'Rate limit reached — try again shortly (limit: 2 emails/hour)',
    network: 'Could not reach the server — check your connection',
    provider: 'This sign-in provider is not enabled yet',
    generic: 'Something went wrong — please try again'
  }
};

/* Which controls are visible in each mode. */
const VIS = {
  'auth-name-wrap':     ['signup'],
  'auth-password':      ['signup', 'signin'],
  'auth-forgot':        ['signin'],
  'auth-submit-signup': ['signup'],
  'auth-submit-signin': ['signin'],
  'auth-submit-forgot': ['forgot'],
  'auth-hint-to-signin':['signup'],
  'auth-hint-to-signup':['signin'],
  'auth-hint-back':     ['forgot', 'verify'],
  'auth-social':        ['signup', 'signin'],
  'auth-resend':        ['verify'],
  'auth-form':          ['signup', 'signin', 'forgot']
};

const TAB_BASE = 'auth-tab px-4 py-2.5 text-xs font-extrabold tracking-wider uppercase transition';
const MSG_BASE = 'mt-4 border px-4 py-3 text-xs font-bold leading-relaxed';
const MSG_OFF = 'hidden ' + MSG_BASE;

let sb = null;
let umdPromise = null;
let mode = 'signin';
let pending = false;

const $ = (id) => document.getElementById(id);
const lang = () => (document.documentElement.getAttribute('lang') === 'en' ? 'en' : 'ar');
const t = (k) => (MSG[lang()] || MSG.ar)[k] || k;
const e = (k) => (ERR[lang()] || ERR.ar)[k] || k;
const toast = (m) => { if (window.ifiiaToast) window.ifiiaToast(m); };
const renderNav = () => { if (window.ifiiaRenderAuthNav) window.ifiiaRenderAuthNav(); };

/* ── lazy-load the self-hosted Supabase UMD bundle (218 KB) ── */
function loadUmd() {
  if (window.supabase && window.supabase.createClient) return Promise.resolve();
  if (!umdPromise) {
    umdPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = '/vendor/supabase.umd.js';
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => { umdPromise = null; reject(new Error('supabase bundle failed to load')); };
      document.head.appendChild(s);
    });
  }
  return umdPromise;
}

async function client() {
  if (sb) return sb;
  await loadUmd();
  sb = window.supabase.createClient(SB_URL, SB_KEY, {
    auth: {
      flowType: 'pkce',
      detectSessionInUrl: true,
      persistSession: true,
      storageKey: SB_STORAGE
    }
  });
  sb.auth.onAuthStateChange((event) => {
    renderNav();
    if (event === 'SIGNED_IN') { closeAll(); toast(t('welcome')); }
    else if (event === 'SIGNED_OUT') { toast(t('signedOut')); }
  });
  return sb;
}

/* ── UI helpers ── */
function showMsg(ok, text) {
  const el = $('auth-msg');
  if (!el) return;
  if (!text) { el.className = MSG_OFF; el.textContent = ''; return; }
  el.className = MSG_BASE + (ok
    ? ' border-gold/40 bg-gold-tint text-gold-dark'
    : ' border-red-300 bg-red-50 text-red-700');
  el.textContent = text;
}

function busy(on) {
  pending = on;
  ['auth-form', 'auth-social', 'auth-resend'].forEach((id) => {
    const box = $(id);
    if (!box) return;
    box.classList.toggle('opacity-60', on);
    box.querySelectorAll('button, input').forEach((el) => { el.disabled = on; });
  });
  if (!on) applyMode(mode);
}

function setTabs(m) {
  const anchor = m === 'forgot' ? 'signin' : m === 'verify' ? 'signup' : m;
  const on = TAB_BASE + ' bg-navy-700 text-white';
  const off = TAB_BASE + ' bg-transparent text-navy/70';
  $('tab-signin').className = anchor === 'signin' ? on : off;
  $('tab-signup').className = anchor === 'signup' ? on : off;
}

function applyMode(m) {
  Object.keys(VIS).forEach((id) => {
    const el = $(id);
    if (el) el.classList.toggle('hidden', VIS[id].indexOf(m) === -1);
  });

  const name = $('auth-name');
  const pass = $('auth-password');
  const mail = $('auth-email');
  if (name) { name.disabled = m !== 'signup'; name.required = m === 'signup'; }
  if (pass) {
    pass.disabled = (m === 'forgot' || m === 'verify');
    pass.required = !pass.disabled;
    pass.autocomplete = m === 'signup' ? 'new-password' : 'current-password';
  }
  if (mail) { mail.disabled = m === 'verify'; mail.required = !mail.disabled; }

  setTabs(m);
}

function setMode(m) {
  mode = m;
  applyMode(m);
  showMsg(false, '');
}

function closeAll() {
  ['auth-modal', 'account-modal'].forEach((id) => {
    const d = $(id);
    if (d && d.open) d.close();
  });
}

function openAuth(initial) {
  const dlg = $('auth-modal');
  if (!dlg) return;
  setMode(initial === 'signup' || initial === 'forgot' ? initial : 'signin');
  if (!dlg.open) dlg.showModal();
  setTimeout(() => { const f = $('auth-email'); if (f && !f.disabled) f.focus(); }, 60);
}

function openAccount() {
  const dlg = $('account-modal');
  if (!dlg) return;
  client().then((c) => c.auth.getUser()).then(({ data }) => {
    const u = data && data.user;
    if (!u) return;
    const m = u.user_metadata || {};
    const nm = m.full_name || m.name || m.preferred_username || u.email || '';
    $('account-name').textContent = nm;
    $('account-email').textContent = u.email || '';
    $('account-avatar').textContent = (nm || (u.email || '?')).trim().charAt(0).toUpperCase();
    if (!dlg.open) dlg.showModal();
  }).catch(() => { if (!dlg.open) dlg.showModal(); });
}

/* ── error translation ── */
function errText(err) {
  const m = (err && err.message) || '';
  console.error('[auth]', err);
  if (/Invalid login credentials/i.test(m)) return e('invalid');
  if (/Email not confirmed/i.test(m)) return e('notConfirmed');
  if (/already (registered|exists)|user_already_exists|identity_already_exists/i.test(m)) return e('exists');
  if (/Password should be at least/i.test(m)) return e('weak');
  if (/rate limit|over_email_send_rate_limit|too many|429/i.test(m)) return e('rate');
  if (/provider not enabled|3032|unsupported|not enabled/i.test(m)) return e('provider');
  if (/Failed to fetch|NetworkError|Load failed|ECONN/i.test(m)) return e('network');
  return e('generic');
}

/* ── wire up ── */
function init() {
  /* modal close buttons */
  $('auth-x').addEventListener('click', () => $('auth-modal').close());
  $('account-x').addEventListener('click', () => $('account-modal').close());
  $('account-close').addEventListener('click', () => $('account-modal').close());

  /* tabs */
  $('tab-signup').addEventListener('click', () => setMode('signup'));
  $('tab-signin').addEventListener('click', () => setMode('signin'));

  /* mode hints */
  $('go-signin').addEventListener('click', () => setMode('signin'));
  $('go-signup').addEventListener('click', () => setMode('signup'));
  $('go-back').addEventListener('click', () => setMode('signin'));
  $('auth-forgot').addEventListener('click', () => setMode('forgot'));

  /* submit */
  $('auth-form').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    if (pending) return;
    const form = ev.currentTarget;
    if (!form.checkValidity()) { form.reportValidity(); return; }

    const email = $('auth-email').value.trim();
    const pass = $('auth-password').value;
    const name = $('auth-name').value.trim();

    busy(true);
    try {
      const c = await client();
      if (mode === 'signup') {
        const { data, error } = await c.auth.signUp({
          email, password: pass,
          options: { data: { full_name: name }, emailRedirectTo: window.location.origin }
        });
        if (error) throw error;
        if (data && data.session) { closeAll(); }
        else { setMode('verify'); showMsg(true, t('checkEmail')); }
      } else if (mode === 'signin') {
        const { error } = await c.auth.signInWithPassword({ email, password: pass });
        if (error) throw error;
        closeAll();
      } else {
        const { error } = await c.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin
        });
        if (error) throw error;
        showMsg(true, t('resetSent'));
      }
    } catch (err) {
      showMsg(false, errText(err));
    }
    busy(false);
  });

  /* resend confirmation email */
  $('auth-resend').addEventListener('click', async () => {
    if (pending) return;
    busy(true);
    try {
      const c = await client();
      const { error } = await c.auth.resend({ type: 'signup', email: $('auth-email').value.trim() });
      if (error) throw error;
      showMsg(true, t('resendDone'));
    } catch (err) {
      showMsg(false, errText(err));
    }
    busy(false);
  });

  /* OAuth */
  const oauth = (provider) => async () => {
    if (pending) return;
    busy(true);
    try {
      const c = await client();
      const { error } = await c.auth.signInWithOAuth({
        provider,
        options: { redirectTo: window.location.origin }
      });
      if (error) throw error;
      /* browser is navigating away */
    } catch (err) {
      showMsg(false, errText(err));
      busy(false);
    }
  };
  $('btn-google').addEventListener('click', oauth('google'));
  $('btn-microsoft').addEventListener('click', oauth('azure'));

  /* sign out */
  $('btn-signout').addEventListener('click', async () => {
    try { const c = await client(); await c.auth.signOut(); } catch (err) { console.error(err); }
    closeAll();
  });

  /* OAuth return / error on the URL */
  const q = new URLSearchParams(window.location.search);
  if (q.has('code')) {
    client().catch((err) => console.error(err));
  } else if (q.has('error')) {
    const desc = q.get('error_description') || q.get('error') || '';
    openAuth('signin');
    showMsg(false, desc || e('generic'));
    q.delete('error'); q.delete('error_description'); q.delete('error_code');
    const rest = q.toString();
    window.history.replaceState(null, '', window.location.pathname + (rest ? '?' + rest : '') + window.location.hash);
  }

  renderNav();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
  init();
}

export { openAuth, openAccount };
