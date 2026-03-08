/**
 * nav.js — Navigation + Auth Guard
 * Runs on every page BEFORE content renders (no defer).
 * - Unauthenticated users → redirected to login.html
 * - Builds nav dynamically with proper event listeners (no onclick strings)
 */
'use strict';

const PUBLIC_PAGES = ['login.html', 'signup.html'];

function getUser() {
  try {
    const raw = sessionStorage.getItem('ql_user') || localStorage.getItem('ql_user');
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function getToken() {
  return sessionStorage.getItem('ql_token') || localStorage.getItem('ql_token') || null;
}

function logout() {
  sessionStorage.removeItem('ql_token');
  sessionStorage.removeItem('ql_user');
  localStorage.removeItem('ql_token');
  localStorage.removeItem('ql_user');
  window.location.href = 'login.html';
}
window.logout = logout; // keep for any inline references

function currentPage() {
  const parts = window.location.pathname.split('/');
  return parts[parts.length - 1] || 'index.html';
}

function isPublicPage() {
  const page = currentPage();
  return PUBLIC_PAGES.some(p => page === p || page === p.replace('.html', ''));
}

function escNavName(str) {
  const d = document.createElement('span');
  d.textContent = String(str ?? '');
  return d.innerHTML;
}

// ── Auth Guard (runs immediately, before DOM ready) ───────────
(function authGuard() {
  if (isPublicPage()) return;
  if (!getUser() || !getToken()) {
    window.location.href = 'login.html';
  }
})();

// ── Build nav after DOM is ready ──────────────────────────────
document.addEventListener('DOMContentLoaded', () => {

  // Mobile hamburger toggle
  const hmbg   = document.getElementById('hmbg');
  const mobNav = document.getElementById('mobNav');
  if (hmbg && mobNav) {
    hmbg.addEventListener('click', () => {
      const isOpen = mobNav.classList.toggle('open');
      hmbg.setAttribute('aria-expanded', String(isOpen));
    });
    document.addEventListener('click', e => {
      if (!hmbg.contains(e.target) && !mobNav.contains(e.target)) {
        mobNav.classList.remove('open');
        hmbg.setAttribute('aria-expanded', 'false');
      }
    });
  }

  const user = getUser();

  // ── Public pages: show Sign In / Sign Up only ───────────────
  if (isPublicPage()) {
    const hdrNav = document.querySelector('.hdr-nav');
    if (hdrNav) {
      hdrNav.innerHTML = '';
      const signIn = document.createElement('a');
      signIn.className = 'navbtn';
      signIn.href = 'login.html';
      signIn.textContent = 'Sign In';

      const signUp = document.createElement('a');
      signUp.className = 'navbtn cta';
      signUp.href = 'signup.html';
      signUp.textContent = 'Sign Up';

      hdrNav.appendChild(signIn);
      hdrNav.appendChild(signUp);
    }

    if (mobNav) {
      mobNav.innerHTML = '';
      const mSignIn = document.createElement('a');
      mSignIn.className = 'navbtn';
      mSignIn.href = 'login.html';
      mSignIn.textContent = '🔑 Sign In';

      const mSignUp = document.createElement('a');
      mSignUp.className = 'navbtn cta-mob';
      mSignUp.href = 'signup.html';
      mSignUp.textContent = '✨ Sign Up';

      mobNav.appendChild(mSignIn);
      mobNav.appendChild(mSignUp);
    }
    return;
  }

  // ── Protected pages: show user name + logout ─────────────────
  if (!user) return;

  const hdrNav = document.querySelector('.hdr-nav');
  if (hdrNav) {
    // Greeting span
    const greeting = document.createElement('div');
    greeting.className = 'nav-user';

    const name = document.createElement('span');
    name.className = 'nav-greeting';
    name.textContent = '👤 ' + (user.first_name || user.email);

    // Logout button — addEventListener, NOT onclick string
    const logoutBtn = document.createElement('button');
    logoutBtn.className = 'navbtn nav-logout';
    logoutBtn.type = 'button';
    logoutBtn.textContent = 'Logout';
    logoutBtn.addEventListener('click', logout);

    greeting.appendChild(name);
    greeting.appendChild(logoutBtn);
    hdrNav.appendChild(greeting);
  }

  // Mobile nav logout
  if (mobNav) {
    const sep = document.createElement('div');
    sep.style.cssText = 'border-top:1px solid var(--border);margin:.4rem 0;padding-top:.4rem';

    const who = document.createElement('div');
    who.style.cssText = 'padding:.4rem 1rem;font-size:.78rem;color:var(--muted)';
    who.textContent = 'Signed in as ';
    const bold = document.createElement('strong');
    bold.textContent = user.first_name || user.email;
    who.appendChild(bold);

    const mobLogout = document.createElement('button');
    mobLogout.className = 'navbtn';
    mobLogout.type = 'button';
    mobLogout.style.cssText = 'color:var(--lost);text-align:left;width:100%';
    mobLogout.textContent = '🚪 Logout';
    mobLogout.addEventListener('click', logout); // addEventListener, NOT onclick

    sep.appendChild(who);
    sep.appendChild(mobLogout);
    mobNav.appendChild(sep);
  }
});
