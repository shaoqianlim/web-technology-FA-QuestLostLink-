/**
 * public/js/items.js — Items Page Logic
 * Used by items.html, lost.html, found.html
 * PAGE_TYPE is optionally set by each page: 'lost' | 'found' | ''
 */
'use strict';

if (typeof PAGE_TYPE === 'undefined') var PAGE_TYPE = '';

async function loadItems() {
  const grd = document.getElementById('grd');
  grd.innerHTML = '<div class="loading">Loading items…</div>';

  try {
    const items = await apiGetItems({
      type:     PAGE_TYPE,
      status:   document.getElementById('statusF')?.value  || '',
      category: document.getElementById('catF')?.value     || '',
      search:   document.getElementById('srch')?.value     || '',
    });

    // Client-side sort
    const sort = document.getElementById('sortF')?.value || 'newest';
    if (sort === 'oldest') items.sort((a,b) => new Date(a.created_at) - new Date(b.created_at));
    else if (sort === 'az') items.sort((a,b) => a.title.localeCompare(b.title));

    renderCards(items);
  } catch (err) {
    grd.innerHTML = `<div class="empty"><div class="ei">⚠️</div><p>Failed to load items. Is the server running?</p></div>`;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  let searchTimer;
  document.getElementById('srch')?.addEventListener('input',    () => { clearTimeout(searchTimer); searchTimer = setTimeout(loadItems, 300); });
  document.getElementById('statusF')?.addEventListener('change', loadItems);
  document.getElementById('catF')?.addEventListener('change',    loadItems);
  document.getElementById('sortF')?.addEventListener('change',   loadItems);
  loadItems();
});
