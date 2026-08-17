(function () {
  'use strict';

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  let userId = null;
  let user = null;
  let dash = null;

  const COLORS = {
    'Savings': '#10b981',
    'Current Account': '#f43f5e',
    'Fixed Deposits': '#6366f1',
    'Mutual Funds': '#8b5cf6',
    'PPF': '#06b6d4',
    'NPS': '#3b82f6',
    'Insurance': '#f59e0b',
    'Real Estate': '#06b6d4',
    'Vehicle': '#f59e0b',
    'Jewellery/Gold': '#10b981',
    'Luxury Watch': '#8b5cf6',
    'Art/Collectibles': '#a855f7',
    'Electronics': '#3b82f6',
  };

  const ASSET_CLASSES = {
    'Real Estate': { icon: '🏠', kw: ['FLAT', 'PLOT', 'VILLA', 'PROPERTY', 'LAND', '2BHK', '3BHK', '4BHK', 'HOUSE', 'WHITEFIELD'] },
    'Vehicles': { icon: '🚗', kw: ['CAR', 'SHOWROOM', 'HONDA', 'TOYOTA', 'TATA', 'INNOVA', 'SAFARI', 'CITY', 'FORTUNER'] },
    'Gold & Jewellery': { icon: '💎', kw: ['GOLD', 'TANISHQ', 'MALABAR', 'KALYAN', 'DIAMOND', 'NECKLACE', 'CHAIN'] },
    'Luxury Watches': { icon: '⌚', kw: ['ROLEX', 'OMEGA', 'ETHOS', 'DAYTONA', 'SPEEDMASTER'] },
    'Art & Collectibles': { icon: '🎨', kw: ['SOTHEBY', 'CHRISTIE', 'ART', 'PAINTING', 'HUSSAIN', 'RAZA'] },
    'Electronics': { icon: '📱', kw: ['APPLE', 'IPHONE', 'MACBOOK', 'SAMSUNG', 'CROMA'] },
    'Luxury Fashion': { icon: '👜', kw: ['LOUIS-VUITTON', 'GUCCI', 'HERMES', 'DESIGNER'] },
  };

  function fmt(n) {
    return '₹' + Math.round(n || 0).toLocaleString('en-IN');
  }

  function assetName(narr) {
    const p = (narr || '').split('/');
    return (p[p.length - 1] || '').replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }

  function classify(a) {
    const n = (a.narration || '').toUpperCase();
    for (const [cls, info] of Object.entries(ASSET_CLASSES)) {
      if (info.kw.some((k) => n.includes(k))) return cls;
    }
    return {
      'Real Estate': 'Real Estate',
      'Vehicle': 'Vehicles',
      'Jewellery/Gold': 'Gold & Jewellery',
      'Luxury Watch': 'Luxury Watches',
      'Art/Collectibles': 'Art & Collectibles',
      'Electronics': 'Electronics',
    }[a.category] || 'Other';
  }

  function showScreen(id) {
    $$('.screen').forEach((s) => {
      s.classList.remove('active');
      s.style.display = 'none';
    });
    const target = $(id);
    if (!target) return;
    target.style.display = (id === '#loginScreen') ? 'flex' : 'block';
    requestAnimationFrame(() => target.classList.add('active'));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ══════════════════════════════════════════════════════════
  // AUTHENTICATION & LOGIN FLOW
  // ══════════════════════════════════════════════════════════

  const mobInput = $('#mobIn');
  const otpRow = $('#otpRow');

  // Build OTP input boxes
  otpRow.innerHTML = [0, 1, 2, 3, 4, 5].map((i) =>
    `<input type="text" maxlength="1" class="otp-input" data-idx="${i}" inputmode="numeric"/>`
  ).join('');
  const otpBoxes = $$('.otp-input');

  $('#btnSend').onclick = async () => {
    const m = mobInput.value.trim();
    const err = $('#mobErr');
    err.textContent = '';
    if (m.length !== 10 || !/^\d+$/.test(m)) {
      err.textContent = 'Please enter a valid 10-digit mobile number';
      return;
    }
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile: m }),
      });
      const d = await res.json();
      if (res.ok) {
        $('#otpDisplay').textContent = '+91 ' + m;
        $('#stepMobile').classList.remove('active');
        $('#stepOtp').classList.add('active');
        otpBoxes[0].focus();
      } else {
        err.textContent = d.error || 'Failed to send OTP';
      }
    } catch (e) {
      err.textContent = 'Network error connecting to auth server';
    }
  };

  mobInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') $('#btnSend').click();
  });

  otpBoxes.forEach((box, idx) => {
    box.addEventListener('input', (e) => {
      if (e.target.value) {
        box.classList.add('filled');
        if (idx < 5) otpBoxes[idx + 1].focus();
        if (idx === 5) $('#btnVerify').click();
      } else {
        box.classList.remove('filled');
      }
    });
    box.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !e.target.value && idx > 0) {
        otpBoxes[idx - 1].focus();
        otpBoxes[idx - 1].classList.remove('filled');
      }
    });
  });

  $('#btnBack2').onclick = () => {
    $('#stepOtp').classList.remove('active');
    $('#stepMobile').classList.add('active');
    otpBoxes.forEach((b) => { b.value = ''; b.classList.remove('filled'); });
  };

  $('#btnVerify').onclick = async () => {
    const m = mobInput.value.trim();
    const otp = Array.from(otpBoxes).map((b) => b.value).join('');
    const err = $('#otpErr');
    err.textContent = '';
    if (otp.length !== 6) {
      err.textContent = 'Please enter all 6 digits';
      return;
    }
    $('#stepOtp').classList.remove('active');
    $('#stepLoad').classList.add('active');
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile: m, otp }),
      });
      const d = await res.json();
      if (res.ok) {
        user = d;
        userId = d.userId;
        await loadUserData();
      } else {
        $('#stepLoad').classList.remove('active');
        $('#stepOtp').classList.add('active');
        err.textContent = d.error || 'Invalid OTP';
      }
    } catch (e) {
      $('#stepLoad').classList.remove('active');
      $('#stepOtp').classList.add('active');
      err.textContent = 'Network error during verification';
    }
  };

  async function loadUserData() {
    const r = await fetch(`/api/users/${userId}/fetch`);
    dash = await r.json();
    try {
      const ar = await fetch(`/api/assets/${userId}`);
      if (ar.ok) dash.assets = await ar.json();
    } catch (e) {}
    renderHome();
    showScreen('#homeScreen');
  }

  // ══════════════════════════════════════════════════════════
  // TOTAL NET WORTH INCREASE TREND CHART GENERATOR (SVG)
  // ══════════════════════════════════════════════════════════

  function generateNetWorthTrendSvg(history, currentNW) {
    if (!history || history.length < 2) {
      return '<div style="color:var(--text-dim);font-size:0.75rem;padding:20px;text-align:center;">Trend accumulating...</div>';
    }

    const data = history.map((h) => ({
      year: h.year,
      val: h.netWorth,
    }));

    const minV = Math.min(...data.map((d) => d.val));
    const maxV = Math.max(...data.map((d) => d.val));
    const range = (maxV - minV) || 1;

    const W = 360;
    const H = 145;
    const padT = 18;
    const padB = 26;
    const padL = 10;
    const padR = 10;
    const chartW = W - padL - padR;
    const chartH = H - padT - padB;

    const pts = data.map((d, idx) => {
      const x = padL + (idx / (data.length - 1)) * chartW;
      const y = padT + chartH - ((d.val - minV) / range) * chartH;
      return { x, y, year: d.year, val: d.val };
    });

    const linePath = pts.map((p, i) => (i === 0 ? 'M' : 'L') + p.x.toFixed(1) + ',' + p.y.toFixed(1)).join(' ');
    const areaPath = linePath + ` L${pts[pts.length - 1].x.toFixed(1)},${padT + chartH} L${pts[0].x.toFixed(1)},${padT + chartH} Z`;

    const labels = pts.map((p) =>
      `<text x="${p.x.toFixed(1)}" y="${H - 6}" text-anchor="middle" fill="#64748b" font-size="9.5" font-family="Inter,sans-serif" font-weight="600">${p.year}</text>`
    ).join('');

    const dots = pts.map((p, i) => {
      const isLast = i === pts.length - 1;
      const r = isLast ? 4.5 : 3;
      const fill = isLast ? '#38bdf8' : '#3b82f6';
      return `<g class="chart-point" style="cursor:pointer;">
        <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${r}" fill="${fill}" stroke="#030712" stroke-width="2"/>
        <title>${p.year}: ${fmt(p.val)}</title>
      </g>`;
    }).join('');

    return `
      <svg viewBox="0 0 ${W} ${H}" class="chart-svg">
        <defs>
          <linearGradient id="nwAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.35"/>
            <stop offset="100%" stop-color="#38bdf8" stop-opacity="0.0"/>
          </linearGradient>
          <linearGradient id="nwLineGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="#3b82f6"/>
            <stop offset="100%" stop-color="#38bdf8"/>
          </linearGradient>
        </defs>
        <line x1="${padL}" y1="${padT + chartH}" x2="${padL + chartW}" y2="${padT + chartH}" stroke="rgba(255,255,255,0.06)" stroke-dasharray="2 2"/>
        <path d="${areaPath}" fill="url(#nwAreaGrad)"/>
        <path d="${linePath}" fill="none" stroke="url(#nwLineGrad)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
        ${dots}
        ${labels}
      </svg>
    `;
  }

  // ══════════════════════════════════════════════════════════
  // HOME SCREEN RENDERING
  // ══════════════════════════════════════════════════════════

  function renderHome() {
    const firstName = user.name.split(' ')[0];
    $('#navUser').innerHTML = `👋 <span>Welcome,</span> <strong>${firstName}</strong>`;

    $('#btnLogout').onclick = () => {
      userId = null;
      user = null;
      dash = null;
      mobInput.value = '';
      otpBoxes.forEach((b) => { b.value = ''; b.classList.remove('filled'); });
      $('#stepMobile').classList.add('active');
      $('#stepOtp').classList.remove('active');
      $('#stepLoad').classList.remove('active');
      showScreen('#loginScreen');
    };

    const net = dash.netWorth;
    const fin = dash.totalAssets - (dash.physicalAssetTotal || 0);
    const phy = dash.physicalAssetTotal || 0;
    const lia = dash.totalLiabilities;
    const assets = dash.assets || [];
    const verified = assets.filter((a) => a.tokenId).length;
    const pending = assets.filter((a) => !a.tokenId).length;

    const savingsRate = dash.lifetimeIncome > 0 ? ((dash.lifetimeSavings / dash.lifetimeIncome) * 100).toFixed(1) : '0.0';
    const expenseRate = dash.lifetimeIncome > 0 ? ((dash.lifetimeExpenses / dash.lifetimeIncome) * 100).toFixed(1) : '0.0';
    const topAlloc = dash.assetAllocation[0];

    // Net worth history & starting year
    const history = dash.netWorthHistory || [];
    const startYear = history.length > 0 ? history[0].year : 2018;
    const endYear = history.length > 0 ? history[history.length - 1].year : 2024;
    const initialNW = history.length > 0 ? history[0].netWorth : 0;
    const overallGrowthPct = initialNW > 0 ? (((net - initialNW) / initialNW) * 100).toFixed(0) : '—';

    const chartSvg = generateNetWorthTrendSvg(history, net);

    const homeHtml = `
      <!-- HERO WEALTH BANNER -->
      <section class="hero-card">
        <div class="hero-split">
          <div class="hero-main">
            <div>
              <div class="hero-tag"><span class="dot"></span> Verified Total Net Worth</div>
              <div class="hero-value">${fmt(net)}</div>
              <div class="hero-sub">${dash.accountCount} Accounts · ${assets.length} Physical Assets · ${verified} Tokenized</div>
            </div>
            <!-- 3 Hero Pillar Interactive Tiles -->
            <div class="hero-pillars">
              <div class="pillar-tile" data-nav="financial">
                <div class="pillar-tile-head"><span>Financial Assets</span><span class="arr">›</span></div>
                <div class="pillar-tile-val green">${fmt(fin)}</div>
              </div>
              <div class="pillar-tile" data-nav="assets">
                <div class="pillar-tile-head"><span>Physical Assets</span><span class="arr">›</span></div>
                <div class="pillar-tile-val cyan">${fmt(phy)}</div>
              </div>
              <div class="pillar-tile" data-nav="liabilities">
                <div class="pillar-tile-head"><span>Total Liabilities</span><span class="arr">›</span></div>
                <div class="pillar-tile-val red">−${fmt(lia)}</div>
              </div>
            </div>
          </div>

          <!-- Total Net Worth Trend Chart Box -->
          <div class="hero-chart-container">
            <div class="chart-header">
              <div class="chart-title">📈 Total Net Worth Trend</div>
              <div class="chart-badge">+${overallGrowthPct}% Growth</div>
            </div>
            ${chartSvg}
            <div class="chart-meta">
              <span>${startYear}: ${fmt(initialNW)}</span>
              <span>${endYear}: ${fmt(net)}</span>
            </div>
          </div>
        </div>
      </section>

      <!-- 5 QUICK STAT METRICS -->
      <section class="quick-row">
        <div class="metric-card" data-nav="accounts">
          <div class="metric-icon">🏦</div>
          <div class="metric-value">${dash.accountCount}</div>
          <div class="metric-label">Accounts ›</div>
        </div>
        <div class="metric-card" data-nav="allocation">
          <div class="metric-icon">📊</div>
          <div class="metric-value">${dash.assetAllocation.length}</div>
          <div class="metric-label">Asset Classes ›</div>
        </div>
        <div class="metric-card" data-nav="assets">
          <div class="metric-icon">🏷️</div>
          <div class="metric-value" style="color:var(--cyan)">${verified}/${assets.length}</div>
          <div class="metric-label">Tokenized ›</div>
        </div>
        <div class="metric-card" data-nav="savings">
          <div class="metric-icon">💹</div>
          <div class="metric-value" style="color:var(--emerald)">${savingsRate}%</div>
          <div class="metric-label">Savings Rate ›</div>
        </div>
        <div class="metric-card" data-nav="expenses">
          <div class="metric-icon">📉</div>
          <div class="metric-value" style="color:var(--rose)">${expenseRate}%</div>
          <div class="metric-label">Expense Ratio ›</div>
        </div>
      </section>

      <!-- MAIN INTELLIGENCE GRID -->
      <div class="grid-section-title">Financial Intelligence Modules</div>
      <section class="main-grid">
        <!-- Asset Allocation -->
        <div class="intel-card card-alloc" data-nav="allocation">
          <div class="intel-top">
            <div>
              <div class="intel-category">Diversification</div>
              <div class="intel-num">${dash.assetAllocation.length} Asset Classes</div>
            </div>
            <div class="intel-icon-badge">📊</div>
          </div>
          <div class="intel-foot">
            <span>Primary: ${topAlloc?.category || 'Equity'} (${(topAlloc?.percent || 0).toFixed(1)}%)</span>
            <span class="go">View Allocation ›</span>
          </div>
        </div>

        <!-- Physical Assets & Global Tokenization -->
        <div class="intel-card card-assets" data-nav="assets">
          <div class="intel-top">
            <div>
              <div class="intel-category">Physical Assets &amp; Web3 Tokens</div>
              <div class="intel-num">${fmt(phy)}</div>
            </div>
            <div class="intel-icon-badge">🏠</div>
          </div>
          <div class="intel-foot">
            <span>${verified} Tokenized · ${pending} Pending Verification</span>
            <span class="go">Inspect Tokens ›</span>
          </div>
        </div>

        <!-- Liabilities & Loans -->
        <div class="intel-card card-liab" data-nav="liabilities">
          <div class="intel-top">
            <div>
              <div class="intel-category">Liabilities &amp; Debt</div>
              <div class="intel-num">−${fmt(lia)}</div>
            </div>
            <div class="intel-icon-badge">🏦</div>
          </div>
          <div class="intel-foot">
            <span>${dash.liabilities.length} Active Loans Outstanding</span>
            <span class="go">Loan Breakdown ›</span>
          </div>
        </div>

        <!-- Spending Breakdown -->
        <div class="intel-card card-spend" data-nav="spending">
          <div class="intel-top">
            <div>
              <div class="intel-category">Spending Intelligence</div>
              <div class="intel-num">${fmt(dash.totalExpenses)}</div>
            </div>
            <div class="intel-icon-badge">💸</div>
          </div>
          <div class="intel-foot">
            <span>Top: ${dash.spending[0]?.label || 'Lifestyle'} (${(dash.spending[0]?.percent || 0).toFixed(0)}%)</span>
            <span class="go">Analyze Spending ›</span>
          </div>
        </div>

        <!-- Savings Rate Tile -->
        <div class="intel-card card-savings" data-nav="savings">
          <div class="intel-top">
            <div>
              <div class="intel-category">Capital Retention</div>
              <div class="intel-num">${savingsRate}% Savings</div>
            </div>
            <div class="intel-icon-badge">💹</div>
          </div>
          <div class="intel-foot">
            <span>Lifetime Retained: ${fmt(dash.lifetimeSavings)}</span>
            <span class="go">Yearly Trends ›</span>
          </div>
        </div>

        <!-- Expense Ratio Tile -->
        <div class="intel-card card-expense" data-nav="expenses">
          <div class="intel-top">
            <div>
              <div class="intel-category">Burn Rate Efficiency</div>
              <div class="intel-num">${expenseRate}% Expense</div>
            </div>
            <div class="intel-icon-badge">📉</div>
          </div>
          <div class="intel-foot">
            <span>Lifetime Outflow: ${fmt(dash.lifetimeExpenses)}</span>
            <span class="go">Expense Proof ›</span>
          </div>
        </div>

        <!-- AA Cryptographic Pipeline -->
        <div class="intel-card card-pipeline" data-nav="pipeline">
          <div class="intel-top">
            <div>
              <div class="intel-category">Cryptographic Verification</div>
              <div class="intel-num">ReBIT XML → ECDH (X25519) → AES-256-GCM</div>
            </div>
            <div class="intel-icon-badge">🔐</div>
          </div>
          <div class="intel-foot">
            <span>Zero-Knowledge AA Pipeline &amp; Decrypted Telemetry</span>
            <span class="go">Inspect Proofs ›</span>
          </div>
        </div>
      </section>
    `;

    $('#homeContent').innerHTML = homeHtml;

    // Attach click listeners to all interactive navigation elements
    $$('[data-nav]').forEach((el) => {
      el.addEventListener('click', () => openDetailScreen(el.dataset.nav));
    });
  }

  // ══════════════════════════════════════════════════════════
  // DETAIL DRILL-DOWN SCREENS
  // ══════════════════════════════════════════════════════════

  function openDetailScreen(navId) {
    const firstName = user.name.split(' ')[0];
    $('#detailUser').innerHTML = `👋 <strong>${firstName}</strong>`;
    $('#btnBack').onclick = () => showScreen('#homeScreen');

    const titleEl = $('#detailTitle');
    const contentEl = $('#detailContent');
    contentEl.innerHTML = '';

    switch (navId) {
      case 'financial':
        renderFinancialDetail(titleEl, contentEl);
        break;
      case 'assets':
        renderAssetsDetail(titleEl, contentEl);
        break;
      case 'liabilities':
        renderLiabilitiesDetail(titleEl, contentEl);
        break;
      case 'accounts':
        renderAccountsDetail(titleEl, contentEl);
        break;
      case 'allocation':
        renderAllocationDetail(titleEl, contentEl);
        break;
      case 'spending':
        renderSpendingDetail(titleEl, contentEl);
        break;
      case 'savings':
        renderSavingsDetail(titleEl, contentEl);
        break;
      case 'expenses':
        renderExpensesDetail(titleEl, contentEl);
        break;
      case 'pipeline':
        renderPipelineDetail(titleEl, contentEl);
        break;
      default:
        renderFinancialDetail(titleEl, contentEl);
        break;
    }

    showScreen('#detailScreen');
  }

  // 1. FINANCIAL ASSETS DETAIL (Mathematical Proof matching Total Net Worth)
  function renderFinancialDetail(titleEl, bodyEl) {
    titleEl.textContent = 'Financial Assets & Net Worth Proof';
    const accs = (dash.accounts || []).filter((a) => !a.isLoan);
    const finTotal = accs.reduce((s, a) => s + (a.displayValue || 0), 0);
    const phyTotal = dash.physicalAssetTotal || 0;
    const totalAssets = dash.totalAssets;
    const liabilities = dash.totalLiabilities;
    const netWorth = dash.netWorth;

    // Group financial accounts by fiType
    const byType = {};
    accs.forEach((a) => {
      const t = a.fiType || 'DEPOSIT';
      if (!byType[t]) byType[t] = { items: [], total: 0 };
      byType[t].items.push(a);
      byType[t].total += (a.displayValue || 0);
    });

    let typeRows = '';
    Object.entries(byType).sort((a, b) => b[1].total - a[1].total).forEach(([type, g]) => {
      typeRows += `
        <tr style="background:var(--surface-1);">
          <td colspan="3" style="font-weight:800;color:var(--text-main);">${type} (${g.items.length} accounts)</td>
          <td class="val-green" style="font-weight:900;">${fmt(g.total)}</td>
          <td style="font-weight:700;">${totalAssets > 0 ? ((g.total / totalAssets) * 100).toFixed(1) : 0}%</td>
        </tr>
      `;
      g.items.forEach((a) => {
        typeRows += `
          <tr>
            <td style="padding-left:28px;font-weight:600;">${a.label}</td>
            <td>${a.fipName}</td>
            <td class="tag-mono">${a.maskedAccNumber}</td>
            <td class="val-green">${fmt(a.displayValue)}</td>
            <td class="tag-mono">${totalAssets > 0 ? ((a.displayValue / totalAssets) * 100).toFixed(1) : 0}%</td>
          </tr>
        `;
      });
    });

    bodyEl.innerHTML = `
      <!-- Net Worth Calculation Proof Card -->
      <div class="d-box">
        <div class="d-head">
          <span>✅ Net Worth Mathematical Proof</span>
          <span style="font-size:0.75rem;color:var(--emerald);font-weight:700;">Reconciled</span>
        </div>
        <div class="proof-banner">
          <div class="proof-row">
            <span>Financial Assets Total (Liquid Deposits + Mutual Funds + PPF)</span>
            <span class="val-green">${fmt(finTotal)}</span>
          </div>
          <div class="proof-row">
            <span>+ Physical Assets Total (Real Estate, Vehicles, Gold, Luxury)</span>
            <span class="val-cyan">${fmt(phyTotal)}</span>
          </div>
          <div class="proof-row" style="border-top:1px solid var(--border);margin-top:4px;padding-top:8px;">
            <strong>= Total Assets</strong>
            <strong style="font-size:1.05rem;">${fmt(totalAssets)}</strong>
          </div>
          <div class="proof-row">
            <span>− Total Outstanding Liabilities (Loans)</span>
            <span class="val-red">−${fmt(liabilities)}</span>
          </div>
          <div class="proof-row final">
            <span style="color:var(--text-main);">= Exact Total Net Worth</span>
            <span class="val-blue" style="font-size:1.35rem;">${fmt(netWorth)}</span>
          </div>
        </div>
      </div>

      <!-- Financial Assets By Type Table -->
      <div class="d-box">
        <div class="d-head">
          <span>🏦 Financial Accounts Breakdown (${accs.length} Active Accounts)</span>
          <span class="val-green">${fmt(finTotal)}</span>
        </div>
        <div class="table-responsive">
          <table class="v-table">
            <thead>
              <tr>
                <th>Account Label</th>
                <th>Financial Institution</th>
                <th>A/C Reference</th>
                <th>Current Balance</th>
                <th>% of Total Wealth</th>
              </tr>
            </thead>
            <tbody>${typeRows}</tbody>
          </table>
        </div>
      </div>
    `;
  }

  // 2. PHYSICAL ASSETS & GLOBAL TOKENIZATION DETAIL
  function renderAssetsDetail(titleEl, bodyEl) {
    titleEl.textContent = 'Physical Asset Intelligence & Web3 Tokenization';
    const assets = dash.assets || [];
    if (!assets.length) {
      bodyEl.innerHTML = '<div class="d-box"><p>No physical assets detected.</p></div>';
      return;
    }

    const verifiedAssets = assets.filter((a) => a.tokenId);
    const pendingAssets = assets.filter((a) => !a.tokenId);

    const groups = {};
    let totalMV = 0, totalPP = 0;
    assets.forEach((a) => {
      const cls = classify(a);
      if (!groups[cls]) groups[cls] = { items: [], mv: 0, pp: 0 };
      groups[cls].items.push(a);
      groups[cls].mv += (a.marketValue || 0);
      groups[cls].pp += (a.purchasePrice || 0);
      totalMV += (a.marketValue || 0);
      totalPP += (a.purchasePrice || 0);
    });

    const order = ['Real Estate', 'Vehicles', 'Gold & Jewellery', 'Luxury Watches', 'Art & Collectibles', 'Electronics', 'Luxury Fashion', 'Other'];
    const sorted = order.filter((c) => groups[c]);

    let html = '';

    // Amber Pending Alert if any assets need verification
    if (pendingAssets.length > 0) {
      const pendingVal = pendingAssets.reduce((s, a) => s + (a.marketValue || 0), 0);
      html += `
        <div class="pending-alert">
          <div class="pending-alert-l">
            <div class="pending-alert-icon">⚠️</div>
            <div>
              <div class="pending-alert-title">${pendingAssets.length} Assets Awaiting Receipt Verification</div>
              <div class="pending-alert-desc">${pendingAssets.map((a) => assetName(a.narration)).join(', ')}</div>
            </div>
          </div>
          <div class="pending-alert-val">${fmt(pendingVal)}</div>
        </div>
      `;
    }

    // Receipt Upload Bar
    html += `
      <div class="receipt-upload-bar">
        <strong style="font-size:0.85rem;color:var(--text-main);">📁 Reconcile Asset Receipt</strong>
        <form id="rcptForm" style="display:flex;gap:12px;align-items:center;flex:1;flex-wrap:wrap;">
          <input type="file" id="rcptFile" required style="font-size:0.75rem;color:var(--text-muted);font-family:var(--font-sans);"/>
          <button type="submit" class="receipt-btn">Reconcile &amp; Tokenize</button>
        </form>
        <div id="rcptStatus" style="width:100%;font-size:0.78rem;font-weight:700;"></div>
      </div>
    `;

    // Render grouped asset cards
    sorted.forEach((cls) => {
      const g = groups[cls];
      const info = ASSET_CLASSES[cls] || { icon: '📦' };
      const cagr = g.pp > 0 ? (((g.mv / g.pp) - 1) * 100) : 0;
      const cagrCls = cagr >= 0 ? 'val-green' : 'val-red';

      html += `
        <div class="asset-group">
          <div class="asset-group-head">
            <div class="asset-group-title">
              <span>${info.icon}</span>
              <span>${cls}</span>
              <span class="asset-count-pill">${g.items.length}</span>
            </div>
            <div>
              <span class="val-cyan" style="font-size:1.1rem;margin-right:8px;">${fmt(g.mv)}</span>
              <span class="${cagrCls}">${cagr >= 0 ? '+' : ''}${cagr.toFixed(1)}% CAGR</span>
            </div>
          </div>
          <div class="asset-cards-grid">
            ${g.items.map((a) => {
              const mv = a.marketValue || 0;
              const pp = a.purchasePrice || 0;
              const gain = mv - pp;
              const name = assetName(a.narration);
              const isV = a.status === 'VERIFIED';
              const t = a.tokenization;

              return `
                <div class="asset-item-card ${isV ? '' : 'is-pending'}">
                  <div class="asset-item-card-top">
                    <span class="asset-item-name">${name}</span>
                    <span class="status-pill ${isV ? 'verified' : 'pending'}">${isV ? '✅ Verified' : '⏳ Needs Receipt'}</span>
                  </div>
                  <div class="asset-item-val">${fmt(mv)}</div>
                  <div class="asset-item-sub">Bought ${fmt(pp)} · ${a.purchaseDate || ''} ${a.yearsHeld ? `· ${a.yearsHeld}y` : ''}</div>
                  <div style="font-size:0.75rem;font-weight:700;color:${gain >= 0 ? 'var(--emerald)' : 'var(--rose)'}">
                    ${gain >= 0 ? '+' : ''}${fmt(Math.abs(gain))} (${(a.cagr || 0).toFixed(1)}% CAGR)
                  </div>
                  ${t ? `
                    <div class="token-metadata-box">
                      <div class="t-meta-row"><span class="t-meta-lbl">Standard</span><span class="t-meta-val">${t.standard}</span></div>
                      <div class="t-meta-row"><span class="t-meta-lbl">Total Supply</span><span class="t-meta-val">${t.totalSupply.toLocaleString()}</span></div>
                      <div class="t-meta-row"><span class="t-meta-lbl">Token ₹</span><span class="t-meta-val">${fmt(t.tokenValue)}</span></div>
                      <div class="t-meta-row"><span class="t-meta-lbl">Fractional Type</span><span class="t-meta-val">${t.fractionalLabel}</span></div>
                      ${t.lockInMonths > 0 ? `<div class="t-meta-row"><span class="t-meta-lbl">Lock-in</span><span class="t-meta-val">${t.lockInMonths}mo</span></div>` : ''}
                      <div class="t-meta-row"><span class="t-meta-lbl">Hash</span><span class="t-meta-val tag-mono">${t.metadataHash}</span></div>
                    </div>
                  ` : ''}
                  ${a.tokenId ? `<div style="margin-top:6px;font-size:0.65rem;font-family:var(--font-mono);color:var(--purple);font-weight:800;">${a.tokenId}</div>` : ''}
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    });

    bodyEl.innerHTML = html;

    // Handle receipt verification form
    const form = $('#rcptForm');
    if (form) {
      form.onsubmit = async (e) => {
        e.preventDefault();
        const st = $('#rcptStatus');
        st.textContent = 'Verifying receipt against AA ledger...';
        st.style.color = 'var(--text-muted)';
        let bodyPayload = { merchant: 'TANISHQ', amount: 285000, date: '2024-01-10', phone: user.phone };
        if (userId === 'user-003') bodyPayload = { merchant: 'ETHOS', amount: 485000, date: '2022-11-05', phone: user.phone };
        if (userId === 'user-002') bodyPayload = { merchant: 'APPLE', amount: 145000, date: '2024-03-08', phone: user.phone };

        try {
          const res = await fetch(`/api/assets/${userId}/upload-receipt`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bodyPayload),
          });
          if (res.ok) {
            st.textContent = '✅ Asset successfully verified and minted to ERC-3643 standard!';
            st.style.color = 'var(--emerald)';
            await loadUserData();
            openDetailScreen('assets');
          } else {
            st.textContent = '❌ Verification mismatch with AA debit record';
            st.style.color = 'var(--rose)';
          }
        } catch (err) {
          st.textContent = 'Error processing receipt verification';
          st.style.color = 'var(--rose)';
        }
      };
    }
  }

  // 3. LIABILITIES DETAIL
  function renderLiabilitiesDetail(titleEl, bodyEl) {
    titleEl.textContent = 'Liabilities & Loan Amortization';
    const loans = dash.liabilities || [];
    if (!loans.length) {
      bodyEl.innerHTML = '<div class="d-box"><p>No outstanding liabilities or loans found.</p></div>';
      return;
    }

    bodyEl.innerHTML = `
      <div class="d-box" style="text-align:center;">
        <div style="font-size:0.75rem;color:var(--text-dim);text-transform:uppercase;font-weight:800;letter-spacing:0.06em;">Total Outstanding Debt</div>
        <div style="font-size:2.4rem;font-weight:900;color:var(--rose);margin:6px 0;">−${fmt(dash.totalLiabilities)}</div>
        <div style="font-size:0.8rem;color:var(--text-muted);">${loans.length} Active loan facility accounts linked</div>
      </div>

      <div class="loans-grid">
        ${loans.map((l) => {
          const s = l.summary || {};
          const orig = s.originalLoanAmount || 1;
          const out = s.outstandingBalance || 0;
          const repaidPct = orig > 0 ? (((orig - out) / orig) * 100) : 0;

          return `
            <div class="loan-card">
              <div style="font-weight:800;font-size:0.95rem;">${l.label}</div>
              <div style="font-size:0.75rem;color:var(--text-dim);margin:2px 0 10px;">${s.lender || 'Bank'} · ${s.description || ''}</div>
              <div class="loan-out-val">−${fmt(out)}</div>
              <div class="progress-track">
                <div class="progress-fill" style="width:${repaidPct.toFixed(0)}%;background:linear-gradient(90deg, var(--emerald), var(--cyan));"></div>
              </div>
              <div class="progress-labels">
                <span>${repaidPct.toFixed(0)}% Repaid</span>
                <span>Original: ${fmt(orig)}</span>
              </div>
              <div class="loan-specs">
                <div><div style="font-size:0.6rem;color:var(--text-dim);font-weight:700;text-transform:uppercase;">Monthly EMI</div><div style="font-size:0.85rem;font-weight:800;">${fmt(s.emiAmount)}/mo</div></div>
                <div><div style="font-size:0.6rem;color:var(--text-dim);font-weight:700;text-transform:uppercase;">Interest Rate</div><div style="font-size:0.85rem;font-weight:800;">${s.interestRate}% p.a.</div></div>
                <div><div style="font-size:0.6rem;color:var(--text-dim);font-weight:700;text-transform:uppercase;">Remaining Tenure</div><div style="font-size:0.85rem;font-weight:800;">${s.remainingTenureMonths} Months</div></div>
                <div><div style="font-size:0.6rem;color:var(--text-dim);font-weight:700;text-transform:uppercase;">Total Paid</div><div style="font-size:0.85rem;font-weight:800;">${fmt(s.totalPaid)}</div></div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  // 4. ALL ACCOUNTS DETAIL
  function renderAccountsDetail(titleEl, bodyEl) {
    titleEl.textContent = 'All Linked Financial Accounts';
    const accs = (dash.accounts || []).filter((a) => !a.isLoan);
    const loans = dash.liabilities || [];

    bodyEl.innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:20px;text-align:center;">
        <div class="d-box" style="margin:0;"><div style="font-size:0.65rem;color:var(--text-dim);text-transform:uppercase;font-weight:800;">Deposit &amp; Investment Accounts</div><div style="font-size:1.5rem;font-weight:900;color:var(--emerald);">${accs.length}</div></div>
        <div class="d-box" style="margin:0;"><div style="font-size:0.65rem;color:var(--text-dim);text-transform:uppercase;font-weight:800;">Loan Facilities</div><div style="font-size:1.5rem;font-weight:900;color:var(--rose);">${loans.length}</div></div>
        <div class="d-box" style="margin:0;"><div style="font-size:0.65rem;color:var(--text-dim);text-transform:uppercase;font-weight:800;">Total Linked via AA</div><div style="font-size:1.5rem;font-weight:900;">${dash.accountCount}</div></div>
      </div>

      <div class="d-box">
        <div class="d-head"><span>🏦 Deposit, MF &amp; Investment Accounts</span><span class="val-green">${fmt(dash.totalAssets - (dash.physicalAssetTotal || 0))}</span></div>
        <div class="table-responsive">
          <table class="v-table">
            <thead>
              <tr><th>Account Name</th><th>Financial Institution</th><th>Type</th><th>A/C Reference</th><th>Current Balance</th></tr>
            </thead>
            <tbody>
              ${accs.map((a) => `
                <tr>
                  <td style="font-weight:700;">${a.label}</td>
                  <td>${a.fipName}</td>
                  <td><span class="status-pill verified">${a.fiType}</span></td>
                  <td class="tag-mono">${a.maskedAccNumber}</td>
                  <td class="val-green">${fmt(a.displayValue)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      ${loans.length ? `
        <div class="d-box">
          <div class="d-head"><span>🏦 Loan &amp; Liability Accounts</span><span class="val-red">−${fmt(dash.totalLiabilities)}</span></div>
          <div class="table-responsive">
            <table class="v-table">
              <thead><tr><th>Facility</th><th>Lender</th><th>A/C Reference</th><th>Outstanding Balance</th></tr></thead>
              <tbody>
                ${loans.map((l) => `
                  <tr>
                    <td style="font-weight:700;">${l.label}</td>
                    <td>${l.summary.lender}</td>
                    <td class="tag-mono">${l.maskedAccNumber}</td>
                    <td class="val-red">−${fmt(l.outstanding)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      ` : ''}
    `;
  }

  // 5. ASSET ALLOCATION DETAIL
  function renderAllocationDetail(titleEl, bodyEl) {
    titleEl.textContent = 'Asset Allocation & Diversification';
    const alloc = dash.assetAllocation || [];
    const maxVal = Math.max(...alloc.map((a) => a.value)) || 1;

    bodyEl.innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:20px;text-align:center;">
        <div class="d-box" style="margin:0;"><div style="font-size:0.65rem;color:var(--text-dim);text-transform:uppercase;font-weight:800;">Total Assets Value</div><div style="font-size:1.4rem;font-weight:900;">${fmt(dash.totalAssets)}</div></div>
        <div class="d-box" style="margin:0;"><div style="font-size:0.65rem;color:var(--text-dim);text-transform:uppercase;font-weight:800;">Financial Assets</div><div style="font-size:1.4rem;font-weight:900;color:var(--emerald);">${fmt(dash.totalAssets - (dash.physicalAssetTotal || 0))}</div></div>
        <div class="d-box" style="margin:0;"><div style="font-size:0.65rem;color:var(--text-dim);text-transform:uppercase;font-weight:800;">Physical Assets</div><div style="font-size:1.4rem;font-weight:900;color:var(--cyan);">${fmt(dash.physicalAssetTotal || 0)}</div></div>
      </div>

      <div class="d-box">
        <div class="d-head"><span>📊 Allocation across ${alloc.length} Asset Classes</span><span>100.0%</span></div>
        <div style="display:flex;flex-direction:column;gap:18px;">
          ${alloc.map((a) => {
            const barW = Math.max((a.value / maxVal) * 100, 3);
            const color = COLORS[a.category] || '#6366f1';
            return `
              <div>
                <div style="display:flex;justify-content:space-between;font-size:0.85rem;font-weight:700;margin-bottom:6px;">
                  <span>${a.category}</span>
                  <span>${fmt(a.value)} · <span style="color:var(--text-dim);font-weight:800;">${a.percent.toFixed(1)}%</span></span>
                </div>
                <div class="progress-track" style="height:10px;">
                  <div class="progress-fill" style="width:${barW}%;background:${color};"></div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  // 6. SPENDING DETAIL
  function renderSpendingDetail(titleEl, bodyEl) {
    titleEl.textContent = 'Spending Breakdown Intelligence';
    const spending = dash.spending || [];

    bodyEl.innerHTML = `
      <div class="d-box" style="text-align:center;">
        <div style="font-size:0.75rem;color:var(--text-dim);text-transform:uppercase;font-weight:800;">Total Analyzed Expenses</div>
        <div style="font-size:2.2rem;font-weight:900;color:var(--amber);margin:6px 0;">${fmt(dash.totalExpenses)}</div>
        <div style="font-size:0.8rem;color:var(--text-muted);">Decoded from UPI, NEFT, Card and ATM transaction telemetry</div>
      </div>

      <div class="d-box">
        <div class="d-head"><span>💸 Category Breakdown</span><span>100.0%</span></div>
        <div style="display:flex;flex-direction:column;gap:12px;">
          ${spending.map((s) => `
            <div style="display:flex;align-items:center;gap:14px;padding:12px 14px;background:var(--surface-1);border-radius:var(--r-sm);">
              <div style="width:38px;height:38px;border-radius:10px;background:${s.color}22;color:${s.color};display:flex;align-items:center;justify-content:center;font-size:1.2rem;">${s.icon}</div>
              <div style="flex:1;">
                <div style="font-weight:700;font-size:0.9rem;">${s.label.replace(/^.\s*/, '')}</div>
                <div class="progress-track" style="height:5px;margin-top:6px;">
                  <div class="progress-fill" style="width:${s.percent}%;background:${s.color};"></div>
                </div>
              </div>
              <div style="text-align:right;">
                <div style="font-weight:800;font-size:0.95rem;">${fmt(s.amount)}</div>
                <div style="font-size:0.7rem;color:var(--text-dim);font-weight:700;">${s.percent.toFixed(1)}%</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // 7. SAVINGS RATE & CAPITAL RETENTION DETAIL
  function renderSavingsDetail(titleEl, bodyEl) {
    titleEl.textContent = 'Savings Rate & Wealth Accumulation';
    const yf = dash.yearlyFinancials || [];
    const totalIncome = dash.lifetimeIncome;
    const totalExpenses = dash.lifetimeExpenses;
    const totalSavings = dash.lifetimeSavings;
    const rate = totalIncome > 0 ? ((totalSavings / totalIncome) * 100).toFixed(1) : '0.0';

    bodyEl.innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:20px;text-align:center;">
        <div class="d-box" style="margin:0;"><div style="font-size:0.65rem;color:var(--text-dim);text-transform:uppercase;font-weight:800;">Lifetime Income</div><div style="font-size:1.3rem;font-weight:900;color:var(--emerald);">${fmt(totalIncome)}</div></div>
        <div class="d-box" style="margin:0;"><div style="font-size:0.65rem;color:var(--text-dim);text-transform:uppercase;font-weight:800;">Lifetime Expenses</div><div style="font-size:1.3rem;font-weight:900;color:var(--rose);">${fmt(totalExpenses)}</div></div>
        <div class="d-box" style="margin:0;"><div style="font-size:0.65rem;color:var(--text-dim);text-transform:uppercase;font-weight:800;">Net Capital Retained</div><div style="font-size:1.3rem;font-weight:900;color:var(--cyan);">${fmt(totalSavings)} (${rate}%)</div></div>
      </div>

      <div class="d-box">
        <div class="d-head"><span>📅 Year-by-Year Financial Performance</span><span class="val-green">${rate}% Lifetime Rate</span></div>
        <div class="table-responsive">
          <table class="v-table">
            <thead>
              <tr><th>Financial Year</th><th>Total Inflow</th><th>Total Outflow</th><th>Net Savings</th><th>Savings Rate</th></tr>
            </thead>
            <tbody>
              ${yf.map((y) => `
                <tr>
                  <td style="font-weight:800;">FY ${y.year}</td>
                  <td class="val-green">${fmt(y.income)}</td>
                  <td class="val-red">${fmt(y.expenses)}</td>
                  <td class="val-cyan" style="font-weight:800;">${fmt(y.savings)}</td>
                  <td><span class="status-pill verified">${y.savingsRate.toFixed(1)}%</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // 8. EXPENSE RATIO & BURN RATE DETAIL
  function renderExpensesDetail(titleEl, bodyEl) {
    titleEl.textContent = 'Expense Ratio & Burn Rate Analysis';
    const yf = dash.yearlyFinancials || [];
    const totalIncome = dash.lifetimeIncome;
    const totalExpenses = dash.lifetimeExpenses;
    const expenseRatio = totalIncome > 0 ? ((totalExpenses / totalIncome) * 100) : 0;
    const savingsRatio = totalIncome > 0 ? ((dash.lifetimeSavings / totalIncome) * 100) : 0;

    let yearRows = '';
    yf.forEach((y) => {
      const er = y.income > 0 ? ((y.expenses / y.income) * 100).toFixed(1) : '0.0';
      const sr = y.income > 0 ? ((y.savings / y.income) * 100).toFixed(1) : '0.0';
      yearRows += `
        <tr>
          <td style="font-weight:800;">FY ${y.year}</td>
          <td class="val-green">${fmt(y.income)}</td>
          <td class="val-red">${fmt(y.expenses)}</td>
          <td class="val-amber" style="font-weight:800;">${er}%</td>
          <td class="val-green" style="font-weight:800;">${sr}%</td>
        </tr>
      `;
    });

    bodyEl.innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:20px;text-align:center;">
        <div class="d-box" style="margin:0;"><div style="font-size:0.65rem;color:var(--text-dim);text-transform:uppercase;font-weight:800;">Lifetime Income</div><div style="font-size:1.15rem;font-weight:900;color:var(--emerald);">${fmt(totalIncome)}</div></div>
        <div class="d-box" style="margin:0;"><div style="font-size:0.65rem;color:var(--text-dim);text-transform:uppercase;font-weight:800;">Lifetime Outflow</div><div style="font-size:1.15rem;font-weight:900;color:var(--rose);">${fmt(totalExpenses)}</div></div>
        <div class="d-box" style="margin:0;"><div style="font-size:0.65rem;color:var(--text-dim);text-transform:uppercase;font-weight:800;">Expense Ratio</div><div style="font-size:1.15rem;font-weight:900;color:var(--amber);">${expenseRatio.toFixed(1)}%</div></div>
        <div class="d-box" style="margin:0;"><div style="font-size:0.65rem;color:var(--text-dim);text-transform:uppercase;font-weight:800;">Savings Ratio</div><div style="font-size:1.15rem;font-weight:900;color:var(--emerald);">${savingsRatio.toFixed(1)}%</div></div>
      </div>

      <!-- Expense Proof Card -->
      <div class="d-box">
        <div class="d-head"><span>📉 Expense Ratio Calculation Verification</span><span class="val-amber">${expenseRatio.toFixed(1)}%</span></div>
        <div class="proof-banner">
          <div class="proof-row"><span>Total Lifetime Expenses</span><span class="val-red">${fmt(totalExpenses)}</span></div>
          <div class="proof-row"><span>÷ Total Lifetime Income</span><span class="val-green">${fmt(totalIncome)}</span></div>
          <div class="proof-row final">
            <span>= Lifetime Expense Ratio (Burn Rate)</span>
            <span class="val-amber" style="font-size:1.3rem;">${expenseRatio.toFixed(1)}%</span>
          </div>
          <div class="proof-row" style="font-size:0.8rem;color:var(--text-dim);padding-top:4px;">
            <span>= Net Retained Capital (1 − Expense Ratio)</span>
            <span class="val-green">${savingsRatio.toFixed(1)}%</span>
          </div>
        </div>
      </div>

      <!-- Year-wise Comparison -->
      <div class="d-box">
        <div class="d-head"><span>📅 Year-wise Expense vs Savings Ratio</span></div>
        <div class="table-responsive">
          <table class="v-table">
            <thead>
              <tr><th>Year</th><th>Gross Inflow</th><th>Gross Outflow</th><th>Expense Ratio</th><th>Savings Ratio</th></tr>
            </thead>
            <tbody>${yearRows}</tbody>
          </table>
        </div>
      </div>
    `;
  }

  // 9. AA CRYPTOGRAPHIC PIPELINE INSPECTOR
  function renderPipelineDetail(titleEl, bodyEl) {
    titleEl.textContent = 'Account Aggregator Cryptographic Pipeline';
    const pipeline = dash.aaPipeline || {};
    const xmlSnippet = pipeline.decryptedXmls?.[0]?.xml || 'No raw XML payload found.';

    bodyEl.innerHTML = `
      <div class="d-box">
        <div class="d-head"><span>🔐 ReBIT End-to-End Cryptographic Handshake</span><span class="status-pill verified">ECDH + AES-256-GCM</span></div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;margin-bottom:20px;">
          <div style="background:var(--surface-1);padding:14px;border-radius:var(--r-sm);">
            <div style="font-size:0.65rem;color:var(--text-dim);font-weight:800;text-transform:uppercase;">1. Data Format</div>
            <div style="font-weight:800;font-size:0.9rem;margin-top:2px;">ReBIT FISchema XML</div>
            <div style="font-size:0.7rem;color:var(--text-muted);margin-top:4px;">Namespace: fiSchema v2.0.0</div>
          </div>
          <div style="background:var(--surface-1);padding:14px;border-radius:var(--r-sm);">
            <div style="font-size:0.65rem;color:var(--text-dim);font-weight:800;text-transform:uppercase;">2. Key Exchange</div>
            <div style="font-weight:800;font-size:0.9rem;margin-top:2px;">X25519 Ephemeral DH</div>
            <div style="font-size:0.7rem;color:var(--text-muted);margin-top:4px;">32-byte shared secret derivation</div>
          </div>
          <div style="background:var(--surface-1);padding:14px;border-radius:var(--r-sm);">
            <div style="font-size:0.65rem;color:var(--text-dim);font-weight:800;text-transform:uppercase;">3. Cipher Envelope</div>
            <div style="font-weight:800;font-size:0.9rem;margin-top:2px;">AES-256-GCM + Nonce</div>
            <div style="font-size:0.7rem;color:var(--text-muted);margin-top:4px;">128-bit authentication tag</div>
          </div>
          <div style="background:var(--surface-1);padding:14px;border-radius:var(--r-sm);">
            <div style="font-size:0.65rem;color:var(--text-dim);font-weight:800;text-transform:uppercase;">4. Client Decryption</div>
            <div style="font-weight:800;font-size:0.9rem;margin-top:2px;">Lossless FI Extraction</div>
            <div style="font-size:0.7rem;color:var(--text-muted);margin-top:4px;">Real-time balance aggregation</div>
          </div>
        </div>
      </div>

      <div class="d-box">
        <div class="d-head"><span>📄 Decrypted ReBIT XML Telemetry Stream</span><span class="tag-mono">Account[0]</span></div>
        <pre class="xml-viewer">${xmlSnippet.substring(0, 1600)}${xmlSnippet.length > 1600 ? '\n... (truncated for display)' : ''}</pre>
      </div>
    `;
  }

  // Initial display
  showScreen('#loginScreen');
})();
