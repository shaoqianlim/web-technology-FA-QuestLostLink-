/**
 * public/js/ui.js — Shared UI Helpers
 * Rendering, toasts, modals, cards, detail modal.
 * Uses createElement + addEventListener throughout — no onclick strings in innerHTML.
 */
'use strict';

function $(id) { return document.getElementById(id); }

/* XSS-safe text content setter */
function escHtml(str) {
  const d = document.createElement('div');
  d.appendChild(document.createTextNode(String(str ?? '')));
  return d.innerHTML;
}

function fmtDate(iso) {
  if (!iso) return '—';
  const p = iso.split('T')[0].split('-');
  const m = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${parseInt(p[2])} ${m[parseInt(p[1])-1]} ${p[0]}`;
}

/* ── Toast notifications ─────────────────────────────────────── */
function toast(msg, type = 'ok') {
  const tc = $('tc');
  if (!tc) return;
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  const icons  = { ok:'✓', er:'✕', if:'ℹ' };
  const colors = { ok:'var(--found)', er:'var(--lost)', if:'var(--accent)' };
  const icon = document.createElement('span');
  icon.style.cssText = `font-weight:800;color:${colors[type]}`;
  icon.textContent = icons[type];
  el.appendChild(icon);
  el.appendChild(document.createTextNode(' ' + msg));
  tc.appendChild(el);
  setTimeout(() => el.remove(), 3600);
}

/* ── Modal helpers ───────────────────────────────────────────── */
function openOv(id) {
  const el = $(id);
  if (!el) return;
  el.classList.add('open');
  document.body.style.overflow = 'hidden';
  setTimeout(() => el.querySelector('input,select,button')?.focus(), 60);
}
function closeOv(id) {
  const el = $(id);
  if (!el) return;
  el.classList.remove('open');
  document.body.style.overflow = '';
}
function backdropClose(e, id) {
  if (e.target.id === id) closeOv(id);
}

/* Close modal on Escape key */
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeOv('detOv');
});

/* Wire backdrop + close button via addEventListener */
document.addEventListener('DOMContentLoaded', () => {
  const ov = $('detOv');
  if (ov) {
    ov.addEventListener('click', e => {
      if (e.target === ov) closeOv('detOv');
    });
  }
  const closeBtn = $('detClose');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => closeOv('detOv'));
  }
});

/* ── Build card DOM element (not HTML string) ────────────────── */
function buildCard(item) {
  const tb = item.type === 'lost' ? 'bl' : 'bf';
  const sb = item.status === 'active' ? 'ba' : item.status === 'claimed' ? 'bc' : 'br';

  const article = document.createElement('article');
  article.className = `card ${item.type}`;
  article.setAttribute('role', 'listitem');
  article.setAttribute('data-id', item.id);
  article.setAttribute('tabindex', '0');
  article.setAttribute('aria-label', item.title);

  // Top row
  const ctop = document.createElement('div');
  ctop.className = 'ctop';
  const ctitle = document.createElement('h3');
  ctitle.className = 'ctitle';
  ctitle.textContent = item.title;
  const typeBadge = document.createElement('span');
  typeBadge.className = `badge ${tb}`;
  typeBadge.textContent = item.type;
  ctop.appendChild(ctitle);
  ctop.appendChild(typeBadge);

  // Description
  const cdesc = document.createElement('p');
  cdesc.className = 'cdesc';
  cdesc.textContent = item.description;

  // Meta chips
  const cmeta = document.createElement('div');
  cmeta.className = 'cmeta';

  function makeChip(text, svgPath) {
    const chip = document.createElement('span');
    chip.className = 'chip';
    if (svgPath) {
      const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
      svg.setAttribute('width','10'); svg.setAttribute('height','10');
      svg.setAttribute('fill','none'); svg.setAttribute('stroke','currentColor');
      svg.setAttribute('stroke-width','2.5'); svg.setAttribute('viewBox','0 0 24 24');
      svg.innerHTML = svgPath;
      chip.appendChild(svg);
    }
    chip.appendChild(document.createTextNode(' ' + text));
    return chip;
  }
  cmeta.appendChild(makeChip(item.location, '<path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>'));
  cmeta.appendChild(makeChip(fmtDate(item.date_reported), '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>'));
  cmeta.appendChild(makeChip(item.category, null));

  // Footer buttons
  const cfoot = document.createElement('div');
  cfoot.className = 'cfoot';
  // Stop card click from firing when footer buttons are clicked
  cfoot.addEventListener('click', e => e.stopPropagation());

  const statusBadge = document.createElement('span');
  statusBadge.className = `badge ${sb}`;
  statusBadge.textContent = item.status;

  const sp = document.createElement('span');
  sp.className = 'sp';

  const detailBtn = document.createElement('button');
  detailBtn.className = 'btn btn-s btn-sm';
  detailBtn.textContent = 'Details';
  detailBtn.addEventListener('click', () => openDetail(item.id));

  const delBtn = document.createElement('button');
  delBtn.className = 'btn btn-d btn-sm';
  delBtn.textContent = 'Delete';
  delBtn.addEventListener('click', () => confirmDel(item.id, false));

  cfoot.appendChild(statusBadge);
  cfoot.appendChild(sp);
  cfoot.appendChild(detailBtn);

  if (item.status === 'active') {
    const claimBtn = document.createElement('button');
    claimBtn.className = 'btn btn-g btn-sm';
    claimBtn.textContent = 'Claim';
    claimBtn.addEventListener('click', () => quickClaim(item.id));
    cfoot.appendChild(claimBtn);
  }

  cfoot.appendChild(delBtn);

  article.appendChild(ctop);
  article.appendChild(cdesc);
  article.appendChild(cmeta);
  article.appendChild(cfoot);

  // Clicking the card body opens detail
  article.addEventListener('click', () => openDetail(item.id));
  article.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') openDetail(item.id);
  });

  return article;
}

/* ── Render cards grid ───────────────────────────────────────── */
function renderCards(list) {
  const grd = $('grd');
  if (!grd) return;
  if ($('cnt')) $('cnt').textContent = list.length;

  grd.innerHTML = '';

  if (!list.length) {
    const empty = document.createElement('div');
    empty.className = 'empty';
    empty.innerHTML = `<div class="ei">🔍</div><p>No items found. <a class="btn btn-p btn-sm" href="report.html">Report an item</a></p>`;
    grd.appendChild(empty);
    return;
  }

  list.forEach(item => grd.appendChild(buildCard(item)));
}

/* ── Open detail modal ───────────────────────────────────────── */
async function openDetail(id) {
  try {
    const item = await apiGetItem(id);
    const tb   = item.type === 'lost' ? 'bl' : 'bf';

    // Title
    const titleEl = $('detTitle');
    titleEl.textContent = '';
    titleEl.appendChild(document.createTextNode(item.title + ' '));
    const badge = document.createElement('span');
    badge.className = `badge ${tb}`;
    badge.textContent = item.type;
    titleEl.appendChild(badge);

    // Body
    const body = $('detBody');
    body.innerHTML = '';

    // Description
    const ddesc = document.createElement('div');
    ddesc.className = 'ddesc';
    const ddescH = document.createElement('h4');
    ddescH.textContent = 'Description';
    const ddescP = document.createElement('p');
    ddescP.textContent = item.description;
    ddesc.appendChild(ddescH);
    ddesc.appendChild(ddescP);
    body.appendChild(ddesc);

    // Key-value grid
    const dkv = document.createElement('div');
    dkv.className = 'dkv';

    function makeKV(label, value) {
      const kv = document.createElement('div');
      kv.className = 'kv';
      const h = document.createElement('h4');
      h.textContent = label;
      const p = document.createElement('p');
      p.textContent = value;
      kv.appendChild(h); kv.appendChild(p);
      return kv;
    }

    dkv.appendChild(makeKV('Category', item.category));
    dkv.appendChild(makeKV('Date', fmtDate(item.date_reported)));
    dkv.appendChild(makeKV('Location', item.location));

    // Status row with select + save button
    const statusKV = document.createElement('div');
    statusKV.className = 'kv';
    const statusH = document.createElement('h4');
    statusH.textContent = 'Status';
    const strow = document.createElement('div');
    strow.className = 'strow';

    const sel = document.createElement('select');
    sel.id = 'detSt';
    sel.setAttribute('aria-label', 'Change status');
    ['active','claimed','resolved'].forEach(s => {
      const opt = document.createElement('option');
      opt.value = s;
      opt.textContent = s.charAt(0).toUpperCase() + s.slice(1);
      if (item.status === s) opt.selected = true;
      sel.appendChild(opt);
    });

    const saveBtn = document.createElement('button');
    saveBtn.className = 'btn btn-s btn-sm';
    saveBtn.textContent = 'Save';
    saveBtn.addEventListener('click', () => saveStatus(item.id)); // addEventListener!

    strow.appendChild(sel);
    strow.appendChild(saveBtn);
    statusKV.appendChild(statusH);
    statusKV.appendChild(strow);
    dkv.appendChild(statusKV);

    dkv.appendChild(makeKV('Contact Name', item.contact_name));
    dkv.appendChild(makeKV('Contact Email', item.contact_email));
    body.appendChild(dkv);

    // Action buttons
    const factions = document.createElement('div');
    factions.className = 'factions';

    const delBtn = document.createElement('button');
    delBtn.className = 'btn btn-d';
    delBtn.innerHTML = `<svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg> Delete Report`;
    delBtn.addEventListener('click', () => confirmDel(item.id, true)); // addEventListener!

    const closeBtn = document.createElement('button');
    closeBtn.className = 'btn btn-s';
    closeBtn.textContent = 'Close';
    closeBtn.addEventListener('click', () => closeOv('detOv')); // addEventListener!

    factions.appendChild(delBtn);
    factions.appendChild(closeBtn);
    body.appendChild(factions);

    openOv('detOv');
  } catch (err) {
    toast('Could not load item details.', 'er');
  }
}

/* ── Save status from detail modal ──────────────────────────── */
async function saveStatus(id) {
  const sel = $('detSt');
  if (!sel) return;
  try {
    await apiUpdateStatus(id, sel.value);
    closeOv('detOv');
    toast(`Status updated to "${sel.value}".`, 'if');
    if (typeof loadItems === 'function') loadItems();
  } catch (err) {
    toast('Failed to update status.', 'er');
  }
}

/* ── Quick-claim from card ───────────────────────────────────── */
async function quickClaim(id) {
  try {
    await apiUpdateStatus(id, 'claimed');
    toast('Item marked as Claimed!');
    if (typeof loadItems === 'function') loadItems();
  } catch (err) {
    toast('Failed to update status.', 'er');
  }
}

/* ── Delete item ─────────────────────────────────────────────── */
async function confirmDel(id, fromDetail = false) {
  if (!confirm('Delete this report? This cannot be undone.')) return;
  try {
    await apiDeleteItem(id);
    if (fromDetail) closeOv('detOv');
    toast('Report deleted.', 'er');
    if (typeof loadItems === 'function') loadItems();
  } catch (err) {
    toast('Failed to delete item.', 'er');
  }
}

/* Expose to window for any legacy inline references */
window.openOv        = openOv;
window.closeOv       = closeOv;
window.backdropClose = backdropClose;
window.openDetail    = openDetail;
window.saveStatus    = saveStatus;
window.quickClaim    = quickClaim;
window.confirmDel    = confirmDel;
