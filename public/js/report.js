/**
 * public/js/report.js — Report Form Logic
 * Validates inputs then POSTs to /api/items
 */
'use strict';

const EMAIL_RE   = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const VALID_CATS = ['Electronics','Clothing','Books & Stationery','ID / Cards','Keys','Bags & Wallets','Jewellery','Other'];

function $(id) { return document.getElementById(id); }

function setErr(fId, eId, msg) {
  $(fId)?.classList.add('inv');
  const e = $(eId);
  if (e) { e.textContent = msg; e.classList.add('v'); }
}

function clrAll() {
  document.querySelectorAll('.ferr').forEach(e => e.classList.remove('v'));
  document.querySelectorAll('.inv').forEach(e => e.classList.remove('inv'));
}

function sanitize(str, max) {
  return str.replace(/<[^>]*>/g, '').substring(0, max);
}

function validate() {
  clrAll();
  let ok = true;
  const v = id => ($(id)?.value || '').trim();

  if (!VALID_CATS.includes(v('fCat')))                   { setErr('fCat',   'eCat',   'Please select a category.');                      ok = false; }
  if (!v('fTitle') || v('fTitle').length > 120)          { setErr('fTitle', 'eTitle', 'Title required (max 120 chars).');                ok = false; }
  if (!v('fDesc')  || v('fDesc').length  > 1000)         { setErr('fDesc',  'eDesc',  'Description required (max 1000 chars).');         ok = false; }
  if (!v('fLoc')   || v('fLoc').length   > 150)          { setErr('fLoc',   'eLoc',   'Location required (max 150 chars).');             ok = false; }
  if (!v('fDate')  || new Date(v('fDate')) > new Date()) { setErr('fDate',  'eDate',  'Valid date required — cannot be in the future.'); ok = false; }
  if (!v('fName')  || v('fName').length  > 100)          { setErr('fName',  'eName',  'Your name required (max 100 chars).');            ok = false; }
  if (!EMAIL_RE.test(v('fEmail')))                       { setErr('fEmail', 'eEmail', 'A valid email address is required.');             ok = false; }

  if (!ok) document.querySelector('.ferr.v')?.closest('.fg')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  return ok;
}

// setType — switches the form between Lost and Found mode
function setType(type) {
  const fType      = $('fType');
  const toggleLost  = $('toggleLost');
  const toggleFound = $('toggleFound');
  const heading    = $('pageHeading');

  if (fType)      fType.value = type;
  if (toggleLost)  toggleLost.classList.toggle('on',  type === 'lost');
  if (toggleFound) toggleFound.classList.toggle('on', type === 'found');
  if (heading)    heading.textContent = type === 'found' ? 'Report a Found Item' : 'Report a Lost Item';
}
window.setType = setType; // keep for safety

document.addEventListener('DOMContentLoaded', () => {
  const today = new Date().toISOString().split('T')[0];
  if ($('fDate')) {
    $('fDate').max   = today;
    $('fDate').value = today;
  }

  // ── Wire toggle buttons with addEventListener (not onclick) ──
  const toggleLost  = $('toggleLost');
  const toggleFound = $('toggleFound');

  if (toggleLost) {
    toggleLost.addEventListener('click', () => setType('lost'));
  }
  if (toggleFound) {
    toggleFound.addEventListener('click', () => setType('found'));
  }

  // Pre-select type from URL query param e.g. report.html?type=found
  const params  = new URLSearchParams(window.location.search);
  const preType = params.get('type');
  if (preType === 'lost' || preType === 'found') setType(preType);

  // ── Form submission ──────────────────────────────────────────
  const form = $('repForm');
  if (!form) return;

  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (!validate()) return;

    $('subBtn').disabled    = true;
    $('subBtn').textContent = 'Submitting…';

    const v = id => ($(id)?.value || '').trim();

    try {
      await apiCreateItem({
        type:          v('fType'),
        category:      v('fCat'),
        title:         sanitize(v('fTitle'), 120),
        description:   sanitize(v('fDesc'),  1000),
        location:      sanitize(v('fLoc'),   150),
        date_reported: v('fDate'),
        contact_name:  sanitize(v('fName'),  100),
        contact_email: v('fEmail').substring(0, 180),
      });

      form.reset();
      clrAll();
      if ($('fDate')) { $('fDate').max = today; $('fDate').value = today; }
      // Restore type toggle to lost after reset
      setType('lost');
      const msg = $('successMsg');
      if (msg) msg.classList.add('show');
      $('subBtn').textContent = 'Submit Another';
    } catch (err) {
      const msg = err?.message || 'Submission failed. Is the server running?';
      alert('Error: ' + msg);
    } finally {
      $('subBtn').disabled = false;
    }
  });
});
