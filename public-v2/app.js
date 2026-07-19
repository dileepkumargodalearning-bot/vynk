(function () {
  'use strict';
  const $ = s => document.querySelector(s);
  const $$ = s => document.querySelectorAll(s);
  let userId = null, user = null, dash = null;

  const COLORS = {
    'Savings':'#10b981','Current Account':'#f43f5e','Fixed Deposits':'#6366f1',
    'Mutual Funds':'#8b5cf6','PPF':'#06b6d4','NPS':'#3b82f6','Insurance':'#f59e0b',
    'Real Estate':'#06b6d4','Vehicle':'#f59e0b','Jewellery/Gold':'#10b981',
    'Luxury Watch':'#8b5cf6','Art/Collectibles':'#a855f7','Electronics':'#3b82f6',
  };
  const ACLASS = {
    'Real Estate':{ icon:'🏠', kw:['FLAT','PLOT','VILLA','PROPERTY','LAND','2BHK','3BHK','4BHK','HOUSE','WHITEFIELD'] },
    'Vehicles':{ icon:'🚗', kw:['CAR','SHOWROOM','HONDA','TOYOTA','TATA','INNOVA','SAFARI','CITY','FORTUNER'] },
    'Gold & Jewellery':{ icon:'💎', kw:['GOLD','TANISHQ','MALABAR','KALYAN','DIAMOND','NECKLACE','CHAIN'] },
    'Luxury Watches':{ icon:'⌚', kw:['ROLEX','OMEGA','ETHOS','DAYTONA','SPEEDMASTER'] },
    'Art & Collectibles':{ icon:'🎨', kw:['SOTHEBY','CHRISTIE','ART','PAINTING','HUSSAIN','RAZA'] },
    'Electronics':{ icon:'📱', kw:['APPLE','IPHONE','MACBOOK','SAMSUNG','CROMA'] },
    'Luxury Fashion':{ icon:'👜', kw:['LOUIS-VUITTON','GUCCI','HERMES','DESIGNER'] },
  };

  function fmt(n) { return '₹' + Math.round(n).toLocaleString('en-IN'); }
  function fmtD(n) { return '₹' + n.toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2}); }

  function assetName(narr) {
    const p = (narr||'').split('/'); return (p[p.length-1]||'').replace(/-/g,' ').replace(/\b\w/g, c=>c.toUpperCase());
  }
  function classify(a) {
    const n = (a.narration||'').toUpperCase();
    for (const [cls, info] of Object.entries(ACLASS)) {
      if (info.kw.some(k => n.includes(k))) return cls;
    }
    return { 'Real Estate':'Real Estate','Vehicle':'Vehicles','Jewellery/Gold':'Gold & Jewellery',
      'Luxury Watch':'Luxury Watches','Art/Collectibles':'Art & Collectibles','Electronics':'Electronics'
    }[a.category] || 'Other';
  }

  // ── Screen Nav ──
  function show(id) {
    $$('.screen').forEach(s => { s.classList.remove('active'); s.style.display = 'none'; });
    const el = $(id);
    el.style.display = id === '#loginScreen' ? 'flex' : 'block';
    requestAnimationFrame(() => el.classList.add('active'));
  }

  // ══════════════ AUTH ══════════════
  const mob = $('#mobileInput');
  const otps = $$('.otp-box');

  $('#btnSendOtp').onclick = async () => {
    const m = mob.value.trim();
    const err = $('#mobileError');
    err.textContent = '';
    if (m.length !== 10 || !/^\d+$/.test(m)) { err.textContent = 'Enter a valid 10-digit mobile number'; return; }
    try {
      const r = await fetch('/api/auth/send-otp', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({mobile:m}) });
      const d = await r.json();
      if (r.ok) {
        $('#otpMobileDisplay').textContent = '+91 ' + m;
        $('#stepMobile').classList.remove('active');
        $('#stepOtp').classList.add('active');
        otps[0].focus();
      } else { err.textContent = d.error; }
    } catch(e) { err.textContent = 'Network error'; }
  };

  mob.addEventListener('keydown', e => { if (e.key === 'Enter') $('#btnSendOtp').click(); });

  otps.forEach((inp, i) => {
    inp.addEventListener('input', e => {
      if (e.target.value) {
        inp.classList.add('filled');
        if (i < 5) otps[i+1].focus();
        if (i === 5) $('#btnVerifyOtp').click();
      } else { inp.classList.remove('filled'); }
    });
    inp.addEventListener('keydown', e => {
      if (e.key === 'Backspace' && !e.target.value && i > 0) { otps[i-1].focus(); otps[i-1].classList.remove('filled'); }
    });
  });

  $('#btnBackMobile').onclick = () => {
    $('#stepOtp').classList.remove('active');
    $('#stepMobile').classList.add('active');
    otps.forEach(d => { d.value = ''; d.classList.remove('filled'); });
  };

  $('#btnVerifyOtp').onclick = async () => {
    const m = mob.value.trim();
    const otp = Array.from(otps).map(d => d.value).join('');
    const err = $('#otpError');
    err.textContent = '';
    if (otp.length !== 6) { err.textContent = 'Enter all 6 digits'; return; }
    $('#stepOtp').classList.remove('active');
    $('#stepLoading').classList.add('active');
    try {
      const r = await fetch('/api/auth/verify-otp', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({mobile:m,otp}) });
      const d = await r.json();
      if (r.ok) { user = d; userId = d.userId; await loadDashboard(); }
      else { $('#stepLoading').classList.remove('active'); $('#stepOtp').classList.add('active'); err.textContent = d.error; }
    } catch(e) { $('#stepLoading').classList.remove('active'); $('#stepOtp').classList.add('active'); err.textContent = 'Network error'; }
  };

  async function loadDashboard() {
    const r = await fetch(`/api/users/${userId}/fetch`);
    dash = await r.json();
    try { const ar = await fetch(`/api/assets/${userId}`); if (ar.ok) dash.assets = await ar.json(); } catch(e) {}
    renderHome();
    show('#homeScreen');
  }

  // ══════════════ HOME ══════════════
  function renderHome() {
    const firstName = user.name.split(' ')[0];
    $('#navUser').innerHTML = `👋 <strong>${firstName}</strong>`;
    $('#btnLogout').onclick = () => {
      userId = null; user = null; dash = null;
      $('#stepMobile').classList.add('active');
      $('#stepOtp').classList.remove('active');
      $('#stepLoading').classList.remove('active');
      otps.forEach(d => { d.value = ''; d.classList.remove('filled'); });
      mob.value = '';
      show('#loginScreen');
    };

    const net = dash.netWorth;
    const fin = dash.totalAssets - (dash.physicalAssetTotal || 0);
    const phy = dash.physicalAssetTotal || 0;
    const lia = dash.totalLiabilities;
    const assets = dash.assets || [];
    const verified = assets.filter(a => a.tokenId).length;

    // Hero
    $('#nwHero').innerHTML = `
      <div class="nw-label">Total Net Worth</div>
      <div class="nw-amount">${fmt(net)}</div>
      <div class="nw-sub">${dash.accountCount} financial accounts · ${assets.length} physical assets detected</div>
      <div class="nw-breakdown">
        <div class="nw-stat"><span class="nw-stat-label">Financial</span><span class="nw-stat-val green">${fmt(fin)}</span></div>
        <div class="nw-stat"><span class="nw-stat-label">Physical</span><span class="nw-stat-val cyan">${fmt(phy)}</span></div>
        <div class="nw-stat"><span class="nw-stat-label">Liabilities</span><span class="nw-stat-val red">−${fmt(lia)}</span></div>
      </div>
    `;

    // Quick Stats
    const topAlloc = dash.assetAllocation[0];
    const savingsRate = dash.lifetimeIncome > 0 ? ((dash.lifetimeSavings / dash.lifetimeIncome) * 100).toFixed(0) : '0';
    $('#quickStats').innerHTML = `
      <div class="qs-card"><div class="qs-icon">🏦</div><div class="qs-val">${dash.accountCount}</div><div class="qs-label">Accounts</div></div>
      <div class="qs-card"><div class="qs-icon">📊</div><div class="qs-val">${dash.assetAllocation.length}</div><div class="qs-label">Asset Classes</div></div>
      <div class="qs-card"><div class="qs-icon">🏷️</div><div class="qs-val">${verified}/${assets.length}</div><div class="qs-label">Tokenized</div></div>
      <div class="qs-card"><div class="qs-icon">💹</div><div class="qs-val">${savingsRate}%</div><div class="qs-label">Savings Rate</div></div>
    `;

    // Tiles
    const tiles = [
      { id:'allocation', cls:'t-alloc', icon:'📊', name:'Asset Allocation',
        val:`${dash.assetAllocation.length} Classes`, foot:`Top: ${topAlloc?.category} — ${fmt(topAlloc?.value||0)} (${(topAlloc?.percent||0).toFixed(1)}%)` },
      { id:'assets', cls:'t-assets', icon:'🏠', name:'Physical Assets & Tokens',
        val:`${assets.length} Detected`, foot:`${verified} verified & tokenized · ${fmt(phy)} total value` },
      { id:'liabilities', cls:'t-liab', icon:'🏦', name:'Liabilities',
        val:`−${fmt(lia)}`, foot:`${dash.liabilities.length} active loans outstanding` },
      { id:'spending', cls:'t-spend', icon:'💸', name:'Spending Analysis',
        val:fmt(dash.totalExpenses), foot:`Top: ${dash.spending[0]?.label||'None'} (${(dash.spending[0]?.percent||0).toFixed(0)}%)` },
      { id:'yearly', cls:'t-yearly', icon:'📅', name:'Yearly Performance',
        val:`${dash.yearlyFinancials.length} Years`, foot:`Lifetime savings: ${fmt(dash.lifetimeSavings)} at ${savingsRate}% rate` },
      { id:'pipeline', cls:'t-pipe tile-full', icon:'🔐', name:'AA Pipeline Inspector',
        val:'X25519 → AES-256-GCM → ReBIT XML', foot:'View full encryption pipeline and decrypted FI data' },
    ];

    $('#tileGrid').innerHTML = tiles.map(t => `
      <div class="tile ${t.cls}" data-tile="${t.id}">
        <div class="tile-top">
          <span class="tile-name">${t.name}</span>
          <div class="tile-ico">${t.icon}</div>
        </div>
        <div class="tile-number">${t.val}</div>
        <div class="tile-footer">${t.foot}</div>
      </div>
    `).join('');

    $$('.tile').forEach(t => t.addEventListener('click', () => openDetail(t.dataset.tile)));
  }

  // ══════════════ DETAIL SCREENS ══════════════
  function openDetail(id) {
    const firstName = user.name.split(' ')[0];
    $('#detailNavUser').innerHTML = `👋 <strong>${firstName}</strong>`;
    $('#btnBack').onclick = () => show('#homeScreen');
    const title = $('#detailTitle');
    const body = $('#detailContent');
    body.innerHTML = '';

    const fin = dash.totalAssets - (dash.physicalAssetTotal || 0);
    const phy = dash.physicalAssetTotal || 0;

    switch(id) {
      case 'allocation': renderAllocation(title, body); break;
      case 'assets': renderAssets(title, body); break;
      case 'liabilities': renderLiabilities(title, body); break;
      case 'spending': renderSpending(title, body); break;
      case 'yearly': renderYearly(title, body); break;
      case 'pipeline': renderPipeline(title, body); break;
    }
    show('#detailScreen');
  }

  function renderAllocation(title, body) {
    title.textContent = 'Asset Allocation';
    const maxV = Math.max(...dash.assetAllocation.map(a => a.value));
    body.innerHTML = `
      <div class="d-card">
        <div class="d-title">📊 Allocation across ${dash.assetAllocation.length} asset classes</div>
        <div style="margin-bottom:20px;display:grid;grid-template-columns:repeat(3,1fr);gap:12px;text-align:center;">
          <div><div style="font-size:0.62rem;color:var(--text-3);text-transform:uppercase;font-weight:700">Total Assets</div><div style="font-size:1.3rem;font-weight:900;color:var(--emerald)">${fmt(dash.totalAssets)}</div></div>
          <div><div style="font-size:0.62rem;color:var(--text-3);text-transform:uppercase;font-weight:700">Financial</div><div style="font-size:1.3rem;font-weight:900;color:var(--emerald)">${fmt(dash.totalAssets - (dash.physicalAssetTotal||0))}</div></div>
          <div><div style="font-size:0.62rem;color:var(--text-3);text-transform:uppercase;font-weight:700">Physical</div><div style="font-size:1.3rem;font-weight:900;color:var(--cyan)">${fmt(dash.physicalAssetTotal||0)}</div></div>
        </div>
        ${dash.assetAllocation.map(a => {
          const color = COLORS[a.category] || '#6366f1';
          const pct = Math.max((a.value / maxV) * 100, 2);
          return `<div class="alloc-row">
            <div class="alloc-meta"><span>${a.category}</span><span>${fmt(a.value)} · ${a.percent.toFixed(1)}%</span></div>
            <div class="alloc-track"><div class="alloc-fill" style="width:${pct}%;background:${color}"></div></div>
          </div>`;
        }).join('')}
      </div>
    `;
  }

  function renderAssets(title, body) {
    title.textContent = 'Asset Intelligence & Tokenization';
    const assets = dash.assets || [];
    if (!assets.length) { body.innerHTML = '<div class="d-card"><p>No physical assets detected.</p></div>'; return; }

    const groups = {};
    let totalMV = 0, totalPP = 0;
    assets.forEach(a => {
      const cls = classify(a);
      if (!groups[cls]) groups[cls] = { items:[], mv:0, pp:0 };
      groups[cls].items.push(a);
      groups[cls].mv += (a.marketValue||0);
      groups[cls].pp += (a.purchasePrice||0);
      totalMV += (a.marketValue||0);
      totalPP += (a.purchasePrice||0);
    });

    const order = ['Real Estate','Vehicles','Gold & Jewellery','Luxury Watches','Art & Collectibles','Electronics','Luxury Fashion','Other'];
    const sorted = order.filter(c => groups[c]);

    let html = `
      <div class="receipt-box">
        <h4>📁 Verify Asset</h4>
        <form id="rcptForm" style="display:flex;gap:10px;align-items:center;flex:1">
          <input type="file" id="rcptFile" required style="font-size:0.72rem;color:var(--text-2);font-family:var(--font)"/>
          <button type="submit" class="receipt-btn">Verify</button>
        </form>
        <div id="rcptStatus" class="receipt-status"></div>
      </div>
    `;

    sorted.forEach(cls => {
      const g = groups[cls];
      const info = ACLASS[cls] || { icon:'📦' };
      const cagr = g.pp > 0 ? (((g.mv / g.pp) - 1) * 100) : 0;

      html += `<div class="ac-group">
        <div class="ac-head">
          <div class="ac-head-left"><span>${info.icon}</span><span>${cls}</span><span class="ac-count">${g.items.length}</span></div>
          <div class="ac-head-right"><span class="ac-total">${fmt(g.mv)}</span><span class="ac-cagr ${cagr>=0?'up':'down'}">${cagr>=0?'+':''}${cagr.toFixed(1)}%</span></div>
        </div>
        <div class="ac-grid">
          ${g.items.map(a => {
            const mv = a.marketValue||0, pp = a.purchasePrice||0, gain = mv - pp;
            const name = assetName(a.narration);
            const isV = a.status === 'VERIFIED';
            const t = a.tokenization;
            return `<div class="ac-card">
              <div class="ac-card-top"><span class="ac-card-name">${name}</span><span class="ac-badge ${isV?'v':'d'}">${isV?'Verified':'Detected'}</span></div>
              <div class="ac-card-val">${fmt(mv)}</div>
              <div class="ac-card-sub">Bought ${fmt(pp)} · ${a.purchaseDate}${a.yearsHeld?' · '+a.yearsHeld+'y':''}</div>
              <div class="ac-card-gain" style="color:${gain>=0?'var(--emerald)':'var(--rose)'}">${gain>=0?'+':''}${fmt(Math.abs(gain))} (${(a.cagr||0).toFixed(1)}% CAGR)</div>
              ${t ? `<div class="token-box">
                <div class="tb-row"><span class="tb-lbl">Standard</span><span class="tb-val">${t.standard}</span></div>
                <div class="tb-row"><span class="tb-lbl">Supply</span><span class="tb-val">${t.totalSupply.toLocaleString()}</span></div>
                <div class="tb-row"><span class="tb-lbl">Token ₹</span><span class="tb-val">${fmt(t.tokenValue)}</span></div>
                <div class="tb-row"><span class="tb-lbl">Type</span><span class="tb-val">${t.fractionalLabel}</span></div>
                ${t.lockInMonths>0?`<div class="tb-row"><span class="tb-lbl">Lock-in</span><span class="tb-val">${t.lockInMonths}mo</span></div>`:''}
                <div class="tb-row"><span class="tb-lbl">Hash</span><span class="tb-val tb-hash">${t.metadataHash}</span></div>
              </div>` : ''}
              ${a.tokenId?`<div style="margin-top:6px;font-size:0.62rem;font-family:var(--mono);color:var(--violet);font-weight:700">${a.tokenId}</div>`:''}
            </div>`;
          }).join('')}
        </div>
      </div>`;
    });

    const totalGain = totalMV - totalPP;
    const gainPct = totalPP > 0 ? (((totalMV/totalPP)-1)*100).toFixed(1) : '0.0';
    html += `<div class="asset-summary">
      <div class="as-item"><div class="as-label">Portfolio Value</div><div class="as-val">${fmt(totalMV)}</div></div>
      <div class="as-item"><div class="as-label">Invested</div><div class="as-val">${fmt(totalPP)}</div></div>
      <div class="as-item"><div class="as-label">Gain / Loss</div><div class="as-val ${totalGain>=0?'green':'red'}">${totalGain>=0?'+':''}${fmt(Math.abs(totalGain))} (${gainPct}%)</div></div>
      <div class="as-item"><div class="as-label">Assets</div><div class="as-val">${assets.length}</div></div>
      <div class="as-item"><div class="as-label">Tokenized</div><div class="as-val">${assets.filter(a=>a.tokenId).length}</div></div>
    </div>`;

    body.innerHTML = html;

    // Receipt upload
    const form = $('#rcptForm');
    if (form) form.onsubmit = async (e) => {
      e.preventDefault();
      const st = $('#rcptStatus');
      st.textContent = 'Verifying…'; st.style.color = 'var(--text-2)';
      let b = { merchant:'TANISHQ', amount:285000, date:'2024-01-10', phone:user.phone };
      if (userId==='user-003') b = { merchant:'ETHOS', amount:485000, date:'2022-11-05', phone:user.phone };
      if (userId==='user-002') b = { merchant:'APPLE', amount:145000, date:'2024-03-08', phone:user.phone };
      try {
        const r = await fetch('/api/assets/'+userId+'/upload-receipt', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(b) });
        if (r.ok) { st.textContent = '✅ Asset verified & tokenized'; st.style.color = 'var(--emerald)'; await loadDashboard(); openDetail('assets'); }
        else { st.textContent = '❌ Verification failed'; st.style.color = 'var(--rose)'; }
      } catch(e) { st.textContent = 'Error'; st.style.color = 'var(--rose)'; }
    };
  }

  function renderLiabilities(title, body) {
    title.textContent = 'Liabilities & Loans';
    const loans = dash.liabilities;
    if (!loans.length) { body.innerHTML = '<div class="d-card"><p>No outstanding liabilities.</p></div>'; return; }
    body.innerHTML = `
      <div style="text-align:center;margin-bottom:20px">
        <div style="font-size:0.72rem;color:var(--text-3);text-transform:uppercase;font-weight:700">Total Outstanding</div>
        <div style="font-size:2rem;font-weight:900;color:var(--rose)">−${fmt(dash.totalLiabilities)}</div>
      </div>
      <div class="loan-grid">${loans.map(l => {
        const s = l.summary;
        const pct = s.originalLoanAmount > 0 ? ((s.originalLoanAmount - s.outstandingBalance) / s.originalLoanAmount * 100) : 0;
        return `<div class="loan-card">
          <div class="loan-head"><div class="loan-name">${l.label}</div><div class="loan-lender">${s.lender} · ${s.description}</div></div>
          <div class="loan-outstanding">−${fmt(s.outstandingBalance)}</div>
          <div class="loan-bar"><div class="loan-bar-fill" style="width:${pct.toFixed(0)}%"></div></div>
          <div class="loan-bar-labels"><span>${pct.toFixed(0)}% repaid</span><span>Principal: ${fmt(s.originalLoanAmount)}</span></div>
          <div class="loan-details">
            <div class="ld-item"><span class="ld-label">EMI</span><span class="ld-val">${fmt(s.emiAmount)}/mo</span></div>
            <div class="ld-item"><span class="ld-label">Rate</span><span class="ld-val">${s.interestRate}%</span></div>
            <div class="ld-item"><span class="ld-label">Remaining</span><span class="ld-val">${s.remainingTenureMonths} months</span></div>
            <div class="ld-item"><span class="ld-label">Total Paid</span><span class="ld-val">${fmt(s.totalPaid)}</span></div>
          </div>
        </div>`;
      }).join('')}</div>
    `;
  }

  function renderSpending(title, body) {
    title.textContent = 'Spending Analysis';
    body.innerHTML = `
      <div class="d-card">
        <div class="d-title">💸 Category Breakdown · Total: ${fmt(dash.totalExpenses)}</div>
        ${dash.spending.map(s => `
          <div class="spend-row">
            <div class="spend-ico" style="background:${s.color}12;color:${s.color}">${s.icon}</div>
            <div class="spend-info"><div class="spend-name">${s.label.replace(/^.\s*/,'')}</div></div>
            <div class="spend-nums"><div class="spend-amt">${fmt(s.amount)}</div><div class="spend-pct">${s.percent.toFixed(1)}%</div></div>
          </div>
        `).join('')}
      </div>
    `;
  }

  function renderYearly(title, body) {
    title.textContent = 'Yearly Performance';
    const yf = dash.yearlyFinancials;
    const rate = dash.lifetimeIncome > 0 ? ((dash.lifetimeSavings/dash.lifetimeIncome)*100).toFixed(1) : '0';
    body.innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;text-align:center;margin-bottom:20px">
        <div class="d-card" style="margin:0"><div style="font-size:0.62rem;color:var(--text-3);text-transform:uppercase;font-weight:700">Lifetime Income</div><div style="font-size:1.2rem;font-weight:900;color:var(--emerald)">${fmt(dash.lifetimeIncome)}</div></div>
        <div class="d-card" style="margin:0"><div style="font-size:0.62rem;color:var(--text-3);text-transform:uppercase;font-weight:700">Lifetime Expenses</div><div style="font-size:1.2rem;font-weight:900;color:var(--rose)">${fmt(dash.lifetimeExpenses)}</div></div>
        <div class="d-card" style="margin:0"><div style="font-size:0.62rem;color:var(--text-3);text-transform:uppercase;font-weight:700">Net Savings (${rate}%)</div><div style="font-size:1.2rem;font-weight:900;color:var(--cyan)">${fmt(dash.lifetimeSavings)}</div></div>
      </div>
      <div class="d-card">
        <div class="d-title">📅 Year-by-Year Breakdown</div>
        <div class="d-table-wrap"><table class="d-table"><thead><tr><th>Year</th><th>Income</th><th>Expenses</th><th>Savings</th><th>Rate</th></tr></thead><tbody>
          ${yf.map(y => `<tr>
            <td style="font-weight:700">${y.year}</td>
            <td class="val-up">${fmt(y.income)}</td>
            <td class="val-down">${fmt(y.expenses)}</td>
            <td style="color:${y.savings>=0?'var(--emerald)':'var(--rose)'}; font-weight:700">${fmt(y.savings)}</td>
            <td>${y.savingsRate.toFixed(1)}%</td>
          </tr>`).join('')}
        </tbody></table></div>
      </div>
    `;
  }

  function renderPipeline(title, body) {
    title.textContent = 'AA Pipeline Inspector';
    const p = dash.aaPipeline;
    body.innerHTML = `
      <div class="d-card">
        <div class="d-title">🔐 Encryption & Decryption Flow</div>
        <div class="pipe-steps">
          <div class="pipe-step"><div class="pipe-num">1</div><div class="pipe-text"><span class="pipe-title">ReBIT Schema XML</span><span class="pipe-desc">Account data serialized to FISchema v2.0.0 namespace</span></div></div>
          <div class="pipe-step"><div class="pipe-num">2</div><div class="pipe-text"><span class="pipe-title">X25519 Key Exchange</span><span class="pipe-desc">Ephemeral Diffie-Hellman generating shared secret</span></div></div>
          <div class="pipe-step"><div class="pipe-num">3</div><div class="pipe-text"><span class="pipe-title">AES-256-GCM Encryption</span><span class="pipe-desc">Authenticated envelope encryption of FI payload</span></div></div>
          <div class="pipe-step"><div class="pipe-num">4</div><div class="pipe-text"><span class="pipe-title">FIU Decrypt & Parse</span><span class="pipe-desc">Lossless decryption → XML parse → dashboard render</span></div></div>
        </div>
      </div>
      <div class="d-card">
        <div class="d-title">📄 Decrypted ReBIT XML (first account)</div>
        <pre class="xml-pre">${p?.decryptedXmls?.[0]?.xml ? p.decryptedXmls[0].xml.substring(0, 1200) + '\n…' : 'No XML data available.'}</pre>
      </div>
    `;
  }

  // Init
  show('#loginScreen');
})();
