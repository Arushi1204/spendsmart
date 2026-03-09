// ── DATA ──
  let expenses = JSON.parse(localStorage.getItem('ss_expenses') || '[]');
  let budget = parseInt(localStorage.getItem('ss_budget') || '0');
  let notes = JSON.parse(localStorage.getItem('ss_notes') || '[]');
  let _idCounter = Date.now();
  let selectedCat = '🍕 Food';
  let spendType = 'planned';
  let payMethod = 'cash';
  let activeNoteId = null;
  let noteDirty = false;
  let charts = {};

  const CURRENCIES = [
    { code: 'INR', symbol: '₹',    label: '₹ INR',   locale: 'en-IN' },
    { code: 'USD', symbol: '$',    label: '$ USD',   locale: 'en-US' },
    { code: 'EUR', symbol: '€',    label: '€ EUR',   locale: 'de-DE' },
    { code: 'GBP', symbol: '£',    label: '£ GBP',   locale: 'en-GB' },
    { code: 'JPY', symbol: '¥',    label: '¥ JPY',   locale: 'ja-JP' },
    { code: 'AED', symbol: 'د.إ', label: 'د.إ AED',  locale: 'ar-AE' },
    { code: 'SGD', symbol: 'S$',   label: 'S$ SGD',  locale: 'en-SG' },
    { code: 'AUD', symbol: 'A$',   label: 'A$ AUD',  locale: 'en-AU' },
    { code: 'CAD', symbol: 'C$',   label: 'C$ CAD',  locale: 'en-CA' },
    { code: 'BRL', symbol: 'R$',   label: 'R$ BRL',  locale: 'pt-BR' },
  ];
  const CAT_COLORS = {
    '🍕 Food':'#ef4444','🚌 Travel':'#3b82f6','🎉 Fun':'#f59e0b',
    '📚 Study':'#8b5cf6','🛍️ Shopping':'#ec4899','💊 Health':'#10b981','📦 Other':'#6b7280'
  };
  let activeCurrency = CURRENCIES.find(c => c.code === (localStorage.getItem('ss_currency') || 'INR')) || CURRENCIES[0];
  function fmt(n) { return activeCurrency.symbol + n.toLocaleString(activeCurrency.locale); }

  // ── TABS ──
  function switchTab(name) {
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('tab-' + name).classList.add('active');
    event.target.classList.add('active');
    if (name === 'analytics') renderCharts();
    if (name === 'notebook') renderNoteList();
  }

  // ── CURRENCY ──
  function renderCurrencyBar() {
    document.getElementById('currencyScroll').innerHTML = CURRENCIES.map(c =>
      '<button class="cur-pill ' + (c.code === activeCurrency.code ? 'active' : '') + '" onclick="setCurrency(\'' + c.code + '\')">' + c.label + '</button>'
    ).join('');
  }
  function setCurrency(code) {
    activeCurrency = CURRENCIES.find(c => c.code === code);
    localStorage.setItem('ss_currency', code);
    renderCurrencyBar(); updateCurrencySymbols(); updateStats(); renderExpenses();
    if (document.getElementById('tab-analytics').classList.contains('active')) renderCharts();
  }
  function updateCurrencySymbols() {
    document.getElementById('balanceCurrSymbol').textContent = activeCurrency.symbol;
    document.getElementById('inputCurrSymbol').textContent = activeCurrency.symbol;
    document.getElementById('budgetInput').placeholder = activeCurrency.symbol + ' Enter amount';
  }

  // ── EXPENSE LOGIC ──
  document.getElementById('dateBadge').textContent = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  document.querySelectorAll('.cat-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active'); selectedCat = btn.dataset.cat;
    });
  });
  function setSpendType(type) {
    spendType = type;
    document.getElementById('plannedBtn').classList.toggle('active', type === 'planned');
    document.getElementById('impulseBtn').classList.toggle('active', type === 'impulse');
  }
  function setPayMethod(method) {
    payMethod = method;
    ['cash','card','upi'].forEach(m => {
      document.getElementById('payBtn' + m.charAt(0).toUpperCase() + m.slice(1)).classList.toggle('active', m === method);
    });
  }
  function addExpense() {
    const rawVal = document.getElementById('amountInput').value;
    const amount = Math.round(parseFloat(rawVal) * 100) / 100;
    if (!amount || amount <= 0) {
      const inp = document.getElementById('amountInput');
      inp.style.borderColor = 'var(--red)'; inp.focus();
      setTimeout(() => inp.style.borderColor = '', 900); return;
    }
    const note = document.getElementById('noteInput').value.trim();
    expenses.unshift({ id: ++_idCounter, amount, note: note || selectedCat, cat: selectedCat, type: spendType, pay: payMethod, date: new Date().toISOString() });
    saveAndRender();
    document.getElementById('amountInput').value = '';
    document.getElementById('noteInput').value = '';
  }
  function saveAndRender() {
    localStorage.setItem('ss_expenses', JSON.stringify(expenses));
    renderExpenses(); updateStats();
  }
  function deleteExpense(id) { expenses = expenses.filter(e => e.id !== id); saveAndRender(); }
  function clearAll() {
    if (!expenses.length) return;
    document.getElementById('confirmMsg').textContent = 'This will permanently delete all ' + expenses.length + ' expense' + (expenses.length > 1 ? 's' : '') + '. Cannot be undone.';
    document.getElementById('confirmOverlay').classList.add('open');
  }
  function closeConfirm() { document.getElementById('confirmOverlay').classList.remove('open'); }
  function confirmClearAll() { expenses = []; localStorage.setItem('ss_expenses', JSON.stringify(expenses)); renderExpenses(); updateStats(); closeConfirm(); }

  function renderExpenses() {
    const list = document.getElementById('expenseList');
    if (!expenses.length) { list.innerHTML = '<div class="empty-state"><div class="empty-icon">🧾</div><p>No expenses yet.<br>Log your first one above.</p></div>'; return; }
    list.innerHTML = expenses.map(e => {
      const color = CAT_COLORS[e.cat] || '#6b7280';
      const icon = e.cat.split(' ')[0];
      const typeTag = e.type === 'impulse' ? '<span class="tag impulse">⚡ Impulse</span>' : '<span class="tag planned">✓ Planned</span>';
      const payLabels = {'cash':'💵 Cash','card':'💳 Card','upi':'📱 UPI'};
      const payTag = '<span class="tag ' + (e.pay||'cash') + '">' + (payLabels[e.pay] || '💵 Cash') + '</span>';
      const date = new Date(e.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
      return '<div class="exp-item"><div class="exp-left"><div class="exp-icon" style="background:' + color + '15">' + icon + '</div><div><div class="exp-name">' + e.note + '</div><div class="exp-meta">' + typeTag + payTag + '<span class="exp-date">' + date + '</span></div></div></div><div style="display:flex;align-items:center;gap:8px"><div class="exp-amount">' + fmt(e.amount) + '</div><button class="exp-delete" onclick="deleteExpense(' + e.id + ')" title="Delete">✕</button></div></div>';
    }).join('');
  }

  function updateStats() {
    const total = expenses.reduce((s, e) => s + e.amount, 0);
    document.getElementById('totalSpent').textContent = total.toLocaleString(activeCurrency.locale);
    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
    const weekT = expenses.filter(e => new Date(e.date) > weekAgo).reduce((s, e) => s + e.amount, 0);
    document.getElementById('weekTotal').textContent = expenses.length ? fmt(weekT) : '—';
    const impulse = expenses.filter(e => e.type === 'impulse').reduce((s, e) => s + e.amount, 0);
    document.getElementById('impulseCount').textContent = expenses.length ? fmt(impulse) : '—';
    if (budget > 0) {
      const pct = Math.min((total / budget) * 100, 100);
      const bar = document.getElementById('budgetBar');
      bar.style.width = pct + '%';
      bar.className = 'bar-fill' + (pct >= 90 ? ' danger' : pct >= 70 ? ' warning' : '');
      const left = Math.max(0, budget - total);
      document.getElementById('budgetHint').textContent = pct >= 100 ? '⚠ Budget exceeded' : fmt(left) + ' remaining of ' + fmt(budget) + ' · ' + Math.round(pct) + '% used';
      document.getElementById('balanceSub').textContent = pct >= 90 ? 'Almost out of budget — slow down!' : Math.round(100 - pct) + '% of budget still available';
    } else {
      document.getElementById('balanceSub').textContent = expenses.length ? 'Across ' + expenses.length + ' transaction' + (expenses.length > 1 ? 's' : '') : 'Start logging your expenses below';
    }
    const cashT = expenses.filter(e => !e.pay || e.pay === 'cash').reduce((s,e) => s+e.amount, 0);
    const cardT = expenses.filter(e => e.pay === 'card').reduce((s,e) => s+e.amount, 0);
    const upiT  = expenses.filter(e => e.pay === 'upi').reduce((s,e) => s+e.amount, 0);
    document.getElementById('brkCash').textContent = expenses.length ? fmt(cashT) : '—';
    document.getElementById('brkCard').textContent = expenses.length ? fmt(cardT) : '—';
    document.getElementById('brkUpi').textContent  = expenses.length ? fmt(upiT) : '—';
  }

  // ── CHARTS ──
  function renderCharts() {
    const total = expenses.reduce((s,e) => s+e.amount, 0);
    const impulseTotal = expenses.filter(e => e.type==='impulse').reduce((s,e)=>s+e.amount,0);
    const impulsePct = total > 0 ? Math.round((impulseTotal/total)*100) : 0;
    const days = expenses.length > 0 ? Math.max(1, Math.ceil((new Date() - new Date(expenses[expenses.length-1].date)) / 86400000)) : 1;
    document.getElementById('an-total').textContent = expenses.length ? fmt(total) : '—';
    document.getElementById('an-avg').textContent = expenses.length ? fmt(Math.round(total/days)) : '—';
    document.getElementById('an-impulse-pct').textContent = expenses.length ? impulsePct + '%' : '—';
    document.getElementById('an-count').textContent = expenses.length || '—';

    // Last 14 days line chart
    const labels14 = [], data14 = [];
    for (let i=13; i>=0; i--) {
      const d = new Date(); d.setDate(d.getDate()-i); d.setHours(0,0,0,0);
      const next = new Date(d); next.setDate(next.getDate()+1);
      labels14.push(d.toLocaleDateString('en-GB',{day:'numeric',month:'short'}));
      data14.push(expenses.filter(e => { const ed=new Date(e.date); return ed>=d&&ed<next; }).reduce((s,e)=>s+e.amount,0));
    }
    destroyChart('lineChart');
    charts['lineChart'] = new Chart(document.getElementById('lineChart'), {
      type: 'line',
      data: { labels: labels14, datasets: [{ label: 'Spent', data: data14, borderColor: '#2d4fd6', backgroundColor: 'rgba(45,79,214,0.07)', borderWidth: 2.5, pointBackgroundColor: '#2d4fd6', pointRadius: 4, tension: 0.4, fill: true }] },
      options: { plugins: { legend: { display: false } }, scales: { x: { grid: { display: false }, ticks: { font: { family: 'DM Sans', size: 11 }, color: '#a0a8c0' } }, y: { grid: { color: 'rgba(15,21,53,0.05)' }, ticks: { font: { family: 'DM Sans', size: 11 }, color: '#a0a8c0', callback: v => activeCurrency.symbol + v.toLocaleString() } } } }
    });

    // Category donut
    const cats = {}; expenses.forEach(e => { cats[e.cat] = (cats[e.cat]||0)+e.amount; });
    const catKeys = Object.keys(cats);
    const catColors = catKeys.map(k => CAT_COLORS[k] || '#6b7280');
    destroyChart('donutChart');
    if (catKeys.length) {
      charts['donutChart'] = new Chart(document.getElementById('donutChart'), {
        type: 'doughnut',
        data: { labels: catKeys, datasets: [{ data: catKeys.map(k=>cats[k]), backgroundColor: catColors.map(c=>c+'cc'), borderColor: catColors, borderWidth: 2 }] },
        options: { plugins: { legend: { position: 'bottom', labels: { font: { family: 'DM Sans', size: 11 }, padding: 12 } } }, cutout: '65%' }
      });
    } else { document.getElementById('donutChart').parentElement.innerHTML = '<div class="no-data"><div class="no-data-icon">🍩</div>No data yet</div>'; }

    // Payment bar
    const cashT = expenses.filter(e=>!e.pay||e.pay==='cash').reduce((s,e)=>s+e.amount,0);
    const cardT = expenses.filter(e=>e.pay==='card').reduce((s,e)=>s+e.amount,0);
    const upiT  = expenses.filter(e=>e.pay==='upi').reduce((s,e)=>s+e.amount,0);
    destroyChart('payChart');
    charts['payChart'] = new Chart(document.getElementById('payChart'), {
      type: 'bar',
      data: { labels: ['💵 Cash','💳 Card','📱 UPI'], datasets: [{ data: [cashT,cardT,upiT], backgroundColor: ['rgba(22,163,74,0.15)','rgba(8,145,178,0.15)','rgba(124,58,237,0.15)'], borderColor: ['#16a34a','#0891b2','#7c3aed'], borderWidth: 2, borderRadius: 8 }] },
      options: { plugins: { legend: { display: false } }, scales: { x: { grid: { display: false }, ticks: { font: { family: 'DM Sans', size: 12 } } }, y: { grid: { color: 'rgba(15,21,53,0.05)' }, ticks: { font: { family: 'DM Sans', size: 11 }, color: '#a0a8c0', callback: v => activeCurrency.symbol + v.toLocaleString() } } } }
    });

    // Weekly planned vs impulse stacked bar
    const weekLabels = [], plannedData = [], impulseData = [];
    for (let i=6; i>=0; i--) {
      const d = new Date(); d.setDate(d.getDate()-i); d.setHours(0,0,0,0);
      const next = new Date(d); next.setDate(next.getDate()+1);
      weekLabels.push(d.toLocaleDateString('en-GB',{weekday:'short'}));
      const dayExp = expenses.filter(e => { const ed=new Date(e.date); return ed>=d&&ed<next; });
      plannedData.push(dayExp.filter(e=>e.type!=='impulse').reduce((s,e)=>s+e.amount,0));
      impulseData.push(dayExp.filter(e=>e.type==='impulse').reduce((s,e)=>s+e.amount,0));
    }
    destroyChart('barChart');
    charts['barChart'] = new Chart(document.getElementById('barChart'), {
      type: 'bar',
      data: { labels: weekLabels, datasets: [
        { label: 'Planned', data: plannedData, backgroundColor: 'rgba(22,163,74,0.2)', borderColor: '#16a34a', borderWidth: 2, borderRadius: 6 },
        { label: 'Impulse', data: impulseData, backgroundColor: 'rgba(217,119,6,0.2)', borderColor: '#d97706', borderWidth: 2, borderRadius: 6 }
      ]},
      options: { plugins: { legend: { position: 'top', labels: { font: { family: 'DM Sans', size: 12 }, usePointStyle: true } } }, scales: { x: { grid: { display: false }, ticks: { font: { family: 'DM Sans', size: 12 } } }, y: { stacked: false, grid: { color: 'rgba(15,21,53,0.05)' }, ticks: { font: { family: 'DM Sans', size: 11 }, color: '#a0a8c0', callback: v => activeCurrency.symbol + v.toLocaleString() } } } }
    });
  }

  function destroyChart(id) { if (charts[id]) { charts[id].destroy(); delete charts[id]; } }

  // ── NOTEBOOK ──
  function renderNoteList() {
    const list = document.getElementById('nbList');
    if (!notes.length) { list.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-muted);font-size:12px;font-weight:300">No notes yet. Create one!</div>'; return; }
    list.innerHTML = notes.sort((a,b)=>b.updated-a.updated).map(n =>
      '<div class="nb-note-item ' + (n.id===activeNoteId?'active':'') + '" onclick="openNote(' + n.id + ')">' +
      '<div class="nb-note-title">' + (n.title||'Untitled') + '</div>' +
      '<div class="nb-note-preview">' + (n.body||'Empty note').substring(0,50) + '</div>' +
      '<div class="nb-note-date">' + new Date(n.updated).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}) + '</div>' +
      '</div>'
    ).join('');
  }

  function newNote() {
    const id = ++_idCounter;
    const note = { id, title: '', body: '', updated: Date.now() };
    notes.unshift(note);
    localStorage.setItem('ss_notes', JSON.stringify(notes));
    openNote(id);
    renderNoteList();
    document.getElementById('nbTitleInput').focus();
  }

  function openNote(id) {
    activeNoteId = id;
    const note = notes.find(n => n.id === id);
    if (!note) return;
    document.getElementById('nbEmpty').style.display = 'none';
    const editArea = document.getElementById('nbEditArea');
    editArea.style.display = 'flex';
    document.getElementById('nbTitleInput').value = note.title;
    document.getElementById('nbBodyInput').value = note.body;
    updateWordCount();
    noteDirty = false;
    document.getElementById('nbSavedHint').classList.remove('show');
    renderNoteList();
  }

  function saveNote() {
    if (!activeNoteId) return;
    const note = notes.find(n => n.id === activeNoteId);
    if (!note) return;
    note.title = document.getElementById('nbTitleInput').value.trim() || 'Untitled';
    note.body = document.getElementById('nbBodyInput').value;
    note.updated = Date.now();
    localStorage.setItem('ss_notes', JSON.stringify(notes));
    noteDirty = false;
    const hint = document.getElementById('nbSavedHint');
    hint.classList.add('show');
    setTimeout(() => hint.classList.remove('show'), 2000);
    renderNoteList();
  }

  function deleteNote() {
    if (!activeNoteId) return;
    notes = notes.filter(n => n.id !== activeNoteId);
    localStorage.setItem('ss_notes', JSON.stringify(notes));
    activeNoteId = null;
    document.getElementById('nbEmpty').style.display = 'flex';
    document.getElementById('nbEditArea').style.display = 'none';
    renderNoteList();
  }

  function markDirty() { noteDirty = true; }
  function updateWordCount() {
    const words = document.getElementById('nbBodyInput').value.trim().split(/\s+/).filter(w=>w).length;
    document.getElementById('nbWordCount').textContent = words + ' word' + (words!==1?'s':'');
  }

  // Auto-save note every 30s if dirty
  setInterval(() => { if (noteDirty) saveNote(); }, 30000);

  // ── BUDGET MODAL ──
  function openModal() { document.getElementById('modalOverlay').classList.add('open'); document.getElementById('budgetInput').value = budget || ''; setTimeout(() => document.getElementById('budgetInput').focus(), 200); }
  function closeModal() { document.getElementById('modalOverlay').classList.remove('open'); }
  function handleOverlayClick(e) { if (e.target === document.getElementById('modalOverlay')) closeModal(); }
  function saveBudget() { const val = parseInt(document.getElementById('budgetInput').value); if (val > 0) { budget = val; localStorage.setItem('ss_budget', val); updateStats(); closeModal(); } }

  // ── INPUT EVENTS ──
  document.getElementById('amountInput').addEventListener('wheel', function(e) { e.preventDefault(); }, { passive: false });
  document.getElementById('amountInput').addEventListener('keydown', function(e) { if (e.key==='Enter') { e.preventDefault(); document.getElementById('noteInput').focus(); } });
  document.getElementById('noteInput').addEventListener('keydown', function(e) { if (e.key==='Enter') { e.preventDefault(); addExpense(); } });

  // ── INIT ──
  renderCurrencyBar(); updateCurrencySymbols(); renderExpenses(); updateStats();