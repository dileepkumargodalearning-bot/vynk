(function () {
  'use strict';

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  let currentUserId = null;
  let userData = null;
  let dashboardData = null;

  const ALLOC_COLORS = {
    'Savings': '#10b981', 'Current Account': '#f43f5e', 'Fixed Deposits': '#6366f1',
    'Mutual Funds': '#8b5cf6', 'PPF': '#06b6d4', 'NPS': '#3b82f6',
    'Insurance': '#f59e0b', 'SIP': '#ec4899', 'Equities': '#14b8a6',
    'Recurring Deposits': '#a855f7',
    'Real Estate': '#06b6d4', 'Vehicles': '#f59e0b', 'Gold & Jewellery': '#10b981',
    'Luxury Watches': '#8b5cf6', 'Art & Collectibles': '#a855f7',
    'Electronics': '#3b82f6', 'Luxury & Fashion': '#ec4899', 'Other': '#64748b'
  };

  const ASSET_CLASSES = {
    'Real Estate': { icon: '🏠', label: 'Real Estate', items: ['FLAT', 'PLOT', 'VILLA', 'PROPERTY', 'LAND', '2BHK', '3BHK', '4BHK', 'HOUSE'] },
    'Vehicles': { icon: '🚗', label: 'Vehicles & Yachts', items: ['CAR', 'SHOWROOM', 'HONDA', 'TOYOTA', 'TATA', 'MARUTI', 'HYUNDAI', 'INNOVA', 'FORTUNER', 'SAFARI', 'YACHT', 'CITY'] },
    'Gold & Jewellery': { icon: '💎', label: 'Gold & Jewellery', items: ['GOLD', 'TANISHQ', 'MALABAR', 'KALYAN', 'JEWEL', 'DIAMOND', 'NECKLACE', 'CHAIN'] },
    'Luxury Watches': { icon: '⌚', label: 'Luxury Watches', items: ['ROLEX', 'OMEGA', 'ETHOS', 'WATCH', 'DAYTONA', 'SPEEDMASTER', 'SUBMARINER'] },
    'Art & Collectibles': { icon: '🎨', label: 'Art & Collectibles', items: ['SOTHEBY', 'CHRISTIE', 'ART', 'PAINTING', 'HUSSAIN', 'RAZA'] },
    'Electronics': { icon: '📱', label: 'Electronics & Gadgets', items: ['APPLE', 'IPHONE', 'MACBOOK', 'SAMSUNG', 'CROMA'] },
    'Luxury & Fashion': { icon: '👜', label: 'Luxury & Fashion', items: ['LOUIS-VUITTON', 'GUCCI', 'HERMES', 'DESIGNER'] },
  };

  function fmt(n) { return '₹' + Math.round(n).toLocaleString('en-IN'); }
  function fmtD(n) { return '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function fmtDate(d) { return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }

  // Screen Management
  function showScreen(screenId) {
    $$('.screen').forEach(s => {
      s.classList.remove('active');
      s.style.display = 'none';
    });
    const activeScreen = $('#' + screenId);
    activeScreen.style.display = screenId === 'loginScreen' ? 'flex' : 'block';
    // Small timeout to trigger transition
    setTimeout(() => {
      activeScreen.classList.add('active');
    }, 20);
  }

  // --- Auth logic ---
  const mobileInput = $('#mobileInput');
  const btnSendOtp = $('#btnSendOtp');
  const btnVerifyOtp = $('#btnVerifyOtp');
  const otpDigits = $$('.otp-digit');
  
  btnSendOtp.addEventListener('click', async () => {
    const mobile = mobileInput.value.trim();
    const errorEl = $('#mobileError');
    errorEl.textContent = '';
    
    if (mobile.length !== 10 || !/^\d+$/.test(mobile)) {
      errorEl.textContent = 'Please enter a valid 10-digit mobile number';
      return;
    }
    
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile })
      });
      const data = await res.json();
      if (res.ok) {
        $('#otpMobileDisplay').textContent = '+91 ' + mobile;
        $('#stepMobile').classList.remove('active');
        $('#stepOtp').classList.add('active');
        otpDigits[0].focus();
      } else {
        errorEl.textContent = data.error || 'Failed to send OTP';
      }
    } catch(err) {
      errorEl.textContent = 'Network error. Try again.';
    }
  });

  // OTP inputs auto-tabbing
  otpDigits.forEach((inp, idx) => {
    inp.addEventListener('input', (e) => {
      const val = e.target.value;
      if (val.length === 1 && idx < 5) {
        otpDigits[idx + 1].focus();
      }
    });
    inp.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !e.target.value && idx > 0) {
        otpDigits[idx - 1].focus();
      }
    });
  });

  $('#btnBackMobile').addEventListener('click', () => {
    $('#stepOtp').classList.remove('active');
    $('#stepMobile').classList.add('active');
    // Clear digits
    otpDigits.forEach(d => d.value = '');
  });

  btnVerifyOtp.addEventListener('click', async () => {
    const mobile = mobileInput.value.trim();
    const otp = Array.from(otpDigits).map(d => d.value).join('');
    const errorEl = $('#otpError');
    errorEl.textContent = '';
    
    if (otp.length !== 6) {
      errorEl.textContent = 'Please enter all 6 digits';
      return;
    }

    try {
      $('#stepOtp').classList.remove('active');
      $('#stepLoading').classList.add('active');
      
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile, otp })
      });
      const data = await res.json();
      
      if (res.ok) {
        userData = data;
        currentUserId = data.userId;
        await fetchUserData();
      } else {
        $('#stepLoading').classList.remove('active');
        $('#stepOtp').classList.add('active');
        errorEl.textContent = data.error || 'Verification failed';
      }
    } catch(err) {
      $('#stepLoading').classList.remove('active');
      $('#stepOtp').classList.add('active');
      errorEl.textContent = 'Network error';
    }
  });

  // Fetch Dashboard Data
  async function fetchUserData() {
    try {
      const res = await fetch(`/api/users/${currentUserId}/fetch`);
      dashboardData = await res.json();
      
      // Attempt to load live assets
      try {
        const assetRes = await fetch(`/api/assets/${currentUserId}`);
        if (assetRes.ok) dashboardData.assets = await assetRes.json();
      } catch(e) { console.warn(e); }
      
      renderDashboard();
      showScreen('homeScreen');
    } catch(e) {
      alert('Failed to load dashboard data: ' + e.message);
      showScreen('loginScreen');
    }
  }

  // --- Rendering Dashboard ---
  function renderDashboard() {
    const initials = userData.name.split(' ').map(w => w[0]).join('').toUpperCase();
    $('#userGreeting').innerHTML = `Hi, <strong>${userData.name}</strong>`;
    $('#btnLogout').onclick = () => {
      // Clear session
      currentUserId = null;
      userData = null;
      dashboardData = null;
      // Reset screens
      $('#stepMobile').classList.add('active');
      $('#stepOtp').classList.remove('active');
      $('#stepLoading').classList.remove('active');
      otpDigits.forEach(d => d.value = '');
      mobileInput.value = '';
      showScreen('loginScreen');
    };

    // Hero stat calculations
    const net = dashboardData.netWorth;
    const assetsTotal = dashboardData.totalAssets;
    const liabilitiesTotal = dashboardData.totalLiabilities;
    const savings = dashboardData.lifetimeSavings || (dashboardData.lifetimeIncome - dashboardData.lifetimeExpenses);

    $('#networthHero').innerHTML = `
      <div class="hero-label">Total Net Worth</div>
      <div class="hero-value">${fmt(net)}</div>
      <div class="hero-grid">
        <div class="hero-stat">
          <span class="hero-stat-label">Financial Assets</span>
          <span class="hero-stat-val up">${fmt(assetsTotal - (dashboardData.physicalAssetTotal || 0))}</span>
        </div>
        <div class="hero-stat">
          <span class="hero-stat-label">Physical Assets</span>
          <span class="hero-stat-val cyan">${fmt(dashboardData.physicalAssetTotal || 0)}</span>
        </div>
        <div class="hero-stat">
          <span class="hero-stat-label">Outstanding Loans</span>
          <span class="hero-stat-val down">−${fmt(liabilitiesTotal)}</span>
        </div>
      </div>
    `;

    // Render 7 interactive tiles
    const tiles = [
      {
        id: 'networth',
        title: 'Net Worth Detail',
        icon: '💰',
        val: fmt(net),
        desc: `Financial: ${fmt(assetsTotal - (dashboardData.physicalAssetTotal || 0))} · Physical: ${fmt(dashboardData.physicalAssetTotal || 0)}`,
        class: 'tile-networth'
      },
      {
        id: 'allocation',
        title: 'Asset Allocation',
        icon: '📊',
        val: `${dashboardData.assetAllocation.length} Classes`,
        desc: `Largest: ${dashboardData.assetAllocation[0]?.category || 'None'} (${fmt(dashboardData.assetAllocation[0]?.value || 0)})`,
        class: 'tile-alloc'
      },
      {
        id: 'assets',
        title: 'Asset Intelligence',
        icon: '🏠',
        val: `${(dashboardData.assets || []).length} Detected`,
        desc: `${(dashboardData.assets || []).filter(a => a.tokenId).length} verified & tokenized items`,
        class: 'tile-assets'
      },
      {
        id: 'liabilities',
        title: 'Liabilities & Loans',
        icon: '🏦',
        val: `−${fmt(liabilitiesTotal)}`,
        desc: `${(dashboardData.liabilities || []).length} active loan accounts outstanding`,
        class: 'tile-liabilities'
      },
      {
        id: 'spending',
        title: 'Spending Breakdown',
        icon: '💸',
        val: fmt(dashboardData.totalExpenses),
        desc: `Top category: ${dashboardData.spending[0]?.label || 'None'}`,
        class: 'tile-spending'
      },
      {
        id: 'yearly',
        title: 'Yearly Financials',
        icon: '📅',
        val: fmt(savings),
        desc: `Savings rate: ${((savings / dashboardData.lifetimeIncome) * 100).toFixed(1)}% over ${dashboardData.yearlyFinancials.length} years`,
        class: 'tile-yearly'
      },
      {
        id: 'pipeline',
        title: 'AA Pipeline Inspector',
        icon: '🔐',
        val: 'XML Roundtrip',
        desc: 'Inspect parsed ECDH decrypted AA responses',
        class: 'tile-pipeline'
      }
    ];

    $('#tilesGrid').innerHTML = tiles.map(t => `
      <div class="tile ${t.class}" data-tile="${t.id}">
        <div class="tile-header">
          <span class="tile-title">${t.title}</span>
          <div class="tile-icon">${t.icon}</div>
        </div>
        <div class="tile-val">${t.val}</div>
        <div class="tile-desc">${t.desc}</div>
      </div>
    `).join('');

    $$('.tile').forEach(t => {
      t.addEventListener('click', () => {
        openDetail(t.dataset.tile);
      });
    });
  }

  // --- Drill Down Detail Screens ---
  function openDetail(id) {
    $('#detailUserGreeting').innerHTML = `Hi, <strong>${userData.name}</strong>`;
    const backBtn = $('#btnBack');
    backBtn.onclick = () => showScreen('homeScreen');

    const titleEl = $('#detailTitle');
    const contentEl = $('#detailContent');
    contentEl.innerHTML = '';

    if (id === 'networth') {
      titleEl.textContent = 'Net Worth Breakdown';
      const assets = dashboardData.accounts.filter(a => !a.isLoan);
      const loans = dashboardData.liabilities;
      const physicalAssets = dashboardData.physicalAssetTotal || 0;
      
      contentEl.innerHTML = `
        <div class="detail-card">
          <div class="detail-card-title">💰 Asset vs Liability Balance</div>
          <div class="hero-grid" style="max-width:100%">
            <div class="hero-stat"><span class="hero-stat-label">Net Worth</span><span class="hero-stat-val" style="font-size:1.6rem">${fmt(dashboardData.netWorth)}</span></div>
            <div class="hero-stat"><span class="hero-stat-label">Total Assets</span><span class="hero-stat-val up" style="font-size:1.6rem">${fmt(dashboardData.totalAssets)}</span></div>
            <div class="hero-stat"><span class="hero-stat-label">Total Liabilities</span><span class="hero-stat-val down" style="font-size:1.6rem">−${fmt(dashboardData.totalLiabilities)}</span></div>
          </div>
          
          <h4 class="mt-6Section-title" style="margin-top:24px;margin-bottom:12px;font-size:0.95rem;font-weight:700">Financial Accounts Balance</h4>
          <div class="table-wrap">
            <table class="v2-table">
              <thead>
                <tr>
                  <th>Account Type</th>
                  <th>Institution</th>
                  <th>Account Number</th>
                  <th>Balance</th>
                </tr>
              </thead>
              <tbody>
                ${assets.map(a => `
                  <tr>
                    <td>${a.label}</td>
                    <td>${a.fipName}</td>
                    <td style="font-family:var(--font-mono)">${a.maskedAccNumber}</td>
                    <td class="credit">${fmt(a.displayValue)}</td>
                  </tr>
                `).join('')}
                ${loans.map(l => `
                  <tr>
                    <td>${l.label} (Loan)</td>
                    <td>${l.fipName}</td>
                    <td style="font-family:var(--font-mono)">${l.maskedAccNumber}</td>
                    <td class="debit">−${fmt(l.outstanding)}</td>
                  </tr>
                `).join('')}
                <tr>
                  <td style="font-weight:700">Physical Assets Portfolio</td>
                  <td>Vynk Vault</td>
                  <td>—</td>
                  <td class="credit" style="font-weight:700">${fmt(physicalAssets)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      `;
    } 
    
    else if (id === 'allocation') {
      titleEl.textContent = 'Asset Allocation';
      const maxAlloc = Math.max(...dashboardData.assetAllocation.map(a => a.value));
      
      contentEl.innerHTML = `
        <div class="detail-card">
          <div class="detail-card-title">📊 Asset Allocation across Buckets</div>
          <div style="display:flex;flex-direction:column;gap:16px;margin-top:16px;">
            ${dashboardData.assetAllocation.map(a => {
              const color = ALLOC_COLORS[a.category] || '#6366f1';
              const pct = Math.max((a.value / maxAlloc) * 100, 3);
              return `
                <div class="alloc-item-v2">
                  <div class="alloc-meta">
                    <span>${a.category}</span>
                    <span style="color:var(--text-secondary)">${fmt(a.value)} (${a.percent.toFixed(1)}%)</span>
                  </div>
                  <div class="alloc-bar-container">
                    <div class="alloc-bar-fill" style="width:${pct}%;background:${color}"></div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    } 
    
    else if (id === 'assets') {
      titleEl.textContent = 'Asset Intelligence & Tokenization';
      renderGroupedAssets(contentEl);
    } 
    
    else if (id === 'liabilities') {
      titleEl.textContent = 'Liabilities & Active Loans';
      const loans = dashboardData.liabilities;
      if (loans.length === 0) {
        contentEl.innerHTML = `<div class="detail-card"><p>No outstanding liabilities detected.</p></div>`;
      } else {
        contentEl.innerHTML = `
          <div class="loan-grid">
            ${loans.map(l => {
              const s = l.summary;
              const repayPct = s.originalLoanAmount > 0 ? (((s.originalLoanAmount - s.outstandingBalance) / s.originalLoanAmount) * 100) : 0;
              return `
                <div class="loan-card-v2">
                  <div class="lc-header">
                    <div>
                      <div class="lc-title">${l.label}</div>
                      <div class="lc-lender">${s.lender} · ${s.description}</div>
                    </div>
                  </div>
                  <div class="lc-amount">−${fmt(s.outstandingBalance)}</div>
                  <div class="lc-bar-container">
                    <div class="lc-bar">
                      <div class="lc-bar-fill" style="width:${repayPct.toFixed(0)}%"></div>
                    </div>
                    <div class="lc-bar-lbl">
                      <span>${repayPct.toFixed(0)}% Repaid</span>
                      <span>Principal: ${fmt(s.originalLoanAmount)}</span>
                    </div>
                  </div>
                  <div class="lc-details">
                    <div class="lcd-item"><span class="lcd-lbl">EMI</span><span class="lcd-val">${fmt(s.emiAmount)}/mo</span></div>
                    <div class="lcd-item"><span class="lcd-lbl">Rate</span><span class="lcd-val">${s.interestRate}%</span></div>
                    <div class="lcd-item"><span class="lcd-lbl">Tenure</span><span class="lcd-val">${s.tenureMonths} mo</span></div>
                    <div class="lcd-item"><span class="lcd-lbl">Paid</span><span class="lcd-val">${fmt(s.totalPaid)}</span></div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `;
      }
    } 
    
    else if (id === 'spending') {
      titleEl.textContent = 'Spending Breakdown';
      const maxSpend = Math.max(...dashboardData.spending.map(s => s.amount));
      
      contentEl.innerHTML = `
        <div class="detail-card">
          <div class="detail-card-title">💸 Spend Categories</div>
          <div style="display:flex;flex-direction:column;gap:12px;margin-top:16px;">
            ${dashboardData.spending.map(s => {
              return `
                <div class="spend-item-v2">
                  <div class="spend-icon-box" style="background:${s.color}15;color:${s.color}">${s.icon}</div>
                  <div class="spend-info">
                    <div class="spend-lbl">${s.label.replace(/^.\s*/, '')}</div>
                  </div>
                  <div class="spend-val-pct">
                    <div class="spend-val">${fmt(s.amount)}</div>
                    <div class="spend-pct">${s.percent.toFixed(0)}%</div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    } 
    
    else if (id === 'yearly') {
      titleEl.textContent = 'Year-wise Performance';
      const yf = dashboardData.yearlyFinancials;
      
      contentEl.innerHTML = `
        <div class="detail-card">
          <div class="detail-card-title">📅 Annual Earnings & Savings Trends</div>
          <div class="table-wrap">
            <table class="v2-table">
              <thead>
                <tr>
                  <th>Year</th>
                  <th>Income</th>
                  <th>Expenses</th>
                  <th>Net Savings</th>
                  <th>Savings Rate</th>
                </tr>
              </thead>
              <tbody>
                ${yf.map(y => `
                  <tr>
                    <td style="font-weight:700">${y.year}</td>
                    <td class="credit">${fmt(y.income)}</td>
                    <td class="debit">${fmt(y.expenses)}</td>
                    <td class="credit" style="color:${y.savings >= 0 ? 'var(--accent-emerald)' : 'var(--accent-rose)'}">${fmt(y.savings)}</td>
                    <td>${y.savingsRate.toFixed(1)}%</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;
    } 
    
    else if (id === 'pipeline') {
      titleEl.textContent = 'Account Aggregator Pipeline';
      const p = dashboardData.aaPipeline;
      
      contentEl.innerHTML = `
        <div class="detail-card" style="margin-bottom:20px;">
          <div class="detail-card-title">🔐 Decryption Pipeline Flow</div>
          <div class="flow-step">
            <div class="flow-num">1</div>
            <div class="flow-text">
              <span class="flow-title">ReBIT Schema Compliant XML</span>
              <span class="flow-desc">Serialized database tables mapped to ReBIT namespaces.</span>
            </div>
          </div>
          <div class="flow-step">
            <div class="flow-num">2</div>
            <div class="flow-text">
              <span class="flow-title">X25519 Ephemeral Key Agreement</span>
              <span class="flow-desc">Diffie-Hellman dynamic exchange generating shared salt-key secret.</span>
            </div>
          </div>
          <div class="flow-step">
            <div class="flow-num">3</div>
            <div class="flow-text">
              <span class="flow-title">AES-256-GCM Envelope Encryption</span>
              <span class="flow-desc">Sealed payload protecting complete transaction narrations during flight.</span>
            </div>
          </div>
        </div>
        
        <div class="detail-card">
          <div class="detail-card-title">📄 Sample Decrypted ReBIT XML Header</div>
          <pre class="xml-container">${p?.decryptedXmls[0]?.xml ? p.decryptedXmls[0].xml.substring(0, 1000) + '\n\n... (Payload Truncated)' : 'No XML payload found.'}</pre>
        </div>
      `;
    }

    showScreen('detailScreen');
  }

  // --- Redesigned Grouped Assets Intelligence ---
  function getAssetName(narration) {
    const parts = (narration || '').split('/');
    const last = parts[parts.length - 1] || '';
    return last.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  function getAssetIcon(category) {
    const icons = { 'Real Estate': '🏠', 'Vehicle': '🚗', 'Jewellery/Gold': '💎', 'Luxury Watch': '⌚', 'Art/Collectibles': '🎨', 'Electronics': '📱' };
    return icons[category] || '📦';
  }

  function classifyAsset(a) {
    const narr = (a.narration || '').toUpperCase();
    for (const [className, cls] of Object.entries(ASSET_CLASSES)) {
      if (cls.items.some(kw => narr.includes(kw))) return className;
    }
    const catMap = { 'Real Estate': 'Real Estate', 'Vehicle': 'Vehicles', 'Jewellery/Gold': 'Gold & Jewellery', 'Luxury Watch': 'Luxury Watches', 'Art/Collectibles': 'Art & Collectibles', 'Electronics': 'Electronics' };
    return catMap[a.category] || 'Other';
  }

  function renderGroupedAssets(contentEl) {
    const assets = dashboardData.assets || [];
    if (assets.length === 0) {
      contentEl.innerHTML = `<div class="detail-card"><p>No assets detected from transactions.</p></div>`;
      return;
    }

    // Group assets
    const groups = {};
    assets.forEach(a => {
      const cls = classifyAsset(a);
      if (!groups[cls]) groups[cls] = { assets: [], totalValue: 0, totalPurchase: 0 };
      groups[cls].assets.push(a);
      groups[cls].totalValue += (a.marketValue || 0);
      groups[cls].totalPurchase += (a.purchasePrice || 0);
    });

    const classOrder = ['Real Estate', 'Vehicles', 'Gold & Jewellery', 'Luxury Watches', 'Art & Collectibles', 'Electronics', 'Luxury & Fashion', 'Other'];
    const sortedClasses = classOrder.filter(c => groups[c]);

    let html = `
      <div class="receipt-upload-v2">
        <h4 style="font-weight:700;font-size:0.85rem;margin-bottom:8px;">📁 Verify Asset Ownership via Receipt</h4>
        <form id="receiptFormV2" style="display:flex;gap:12px;align-items:center;">
          <input type="file" id="receiptFileV2" class="file-input" required />
          <button type="submit" class="btn-primary" style="width:auto;padding:8px 16px;font-size:0.8rem;">Upload & Verify</button>
        </form>
        <div id="uploadStatusV2" style="font-size:0.75rem;margin-top:8px;font-weight:500;"></div>
      </div>
    `;

    sortedClasses.forEach(className => {
      const g = groups[className];
      const classInfo = ASSET_CLASSES[className] || { icon: '📦', label: className };
      const classCagr = g.totalPurchase > 0 ? (((g.totalValue / g.totalPurchase) - 1) * 100) : 0;
      
      html += `
        <div class="asset-class-sec">
          <div class="asset-class-head">
            <div class="asset-class-title-info">
              <span>${classInfo.icon}</span>
              <span>${classInfo.label}</span>
              <span class="asset-class-count">${g.assets.length} items</span>
            </div>
            <div class="asset-class-total">
              ${fmt(g.totalValue)}
              <span style="font-size:0.72rem;color:${classCagr >= 0 ? 'var(--accent-emerald)' : 'var(--accent-rose)'};margin-left:6px;">
                ${classCagr >= 0 ? '+' : ''}${classCagr.toFixed(1)}% CAGR
              </span>
            </div>
          </div>
          
          <div class="assets-grid-v2">
            ${g.assets.map(a => {
              const mv = a.marketValue || 0;
              const pp = a.purchasePrice || 0;
              const gain = mv - pp;
              const isVerified = a.status === 'VERIFIED';
              const name = getAssetName(a.narration);
              
              return `
                <div class="asset-card-v2">
                  <div class="ac-header">
                    <span class="ac-title">${name}</span>
                    <span class="ac-badge ${isVerified ? 'verified' : 'detected'}">${isVerified ? 'Verified' : 'Detected'}</span>
                  </div>
                  <div class="ac-val">${fmt(mv)}</div>
                  <div style="font-size:0.68rem;color:var(--text-muted)">
                    Bought: ${fmt(pp)} · ${a.purchaseDate}
                  </div>
                  <div style="font-size:0.72rem;font-weight:600;color:${gain >= 0 ? 'var(--accent-emerald)' : 'var(--accent-rose)'}">
                    ${gain >= 0 ? '+' : ''}${fmt(gain)} (${(a.cagr || 0).toFixed(1)}% CAGR)
                  </div>
                  
                  ${a.tokenization ? `
                    <div class="token-info-box">
                      <div class="ti-row"><span class="ti-lbl">Standard</span><span class="ti-val">${a.tokenization.standard}</span></div>
                      <div class="ti-row"><span class="ti-lbl">Supply</span><span class="ti-val">${a.tokenization.totalSupply.toLocaleString()}</span></div>
                      <div class="ti-row"><span class="ti-lbl">Token Price</span><span class="ti-val">${fmt(a.tokenization.tokenValue)}</span></div>
                      <div class="ti-row"><span class="ti-lbl">Divisibility</span><span class="ti-val">${a.tokenization.fractionalLabel}</span></div>
                      <div class="ti-row"><span class="ti-lbl">KYC</span><span class="ti-val">${a.tokenization.kycRequired ? 'Required' : 'None'}</span></div>
                      <div class="ti-row"><span class="ti-lbl">Token Hash</span><span class="ti-val ti-hash">${a.tokenization.metadataHash}</span></div>
                    </div>
                  ` : ''}
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    });

    contentEl.innerHTML = html;

    // Attach V2 upload event
    const form = $('#receiptFormV2');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const statusEl = $('#uploadStatusV2');
      statusEl.textContent = 'Verifying receipt credentials against ledger...';
      statusEl.style.color = 'var(--text-secondary)';

      let dummyBody = { merchant: 'TANISHQ', amount: 285000, date: '2024-01-10', phone: userData.phone };
      if (currentUserId === 'user-003') dummyBody = { merchant: 'ETHOS', amount: 485000, date: '2022-11-05', phone: userData.phone };
      if (currentUserId === 'user-002') dummyBody = { merchant: 'APPLE', amount: 145000, date: '2024-03-08', phone: userData.phone };

      try {
        const res = await fetch('/api/assets/' + currentUserId + '/upload-receipt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dummyBody)
        });
        if (res.ok) {
          statusEl.textContent = 'Verification successful. Assets updated.';
          statusEl.style.color = 'var(--accent-emerald)';
          await fetchUserData(); // Reload
          openDetail('assets');  // Redraw
        } else {
          statusEl.textContent = 'Verification failed.';
          statusEl.style.color = 'var(--accent-rose)';
        }
      } catch(err) {
        statusEl.textContent = 'Error during verification.';
        statusEl.style.color = 'var(--accent-rose)';
      }
    });
  }

  // --- Initial checks ---
  showScreen('loginScreen');

})();
