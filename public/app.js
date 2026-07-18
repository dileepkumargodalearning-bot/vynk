(function () {
  'use strict';

  const $ = (sel) => document.querySelector(sel);
  let dashData = null;

  const ALLOC_COLORS = {
    'Savings': '#10b981', 'Current Account': '#f43f5e', 'Fixed Deposits': '#6366f1',
    'Mutual Funds': '#8b5cf6', 'PPF': '#06b6d4', 'NPS': '#3b82f6',
    'Insurance': '#f59e0b', 'SIP': '#ec4899', 'Equities': '#14b8a6',
    'Recurring Deposits': '#a855f7',
  };

  const FI_CLASS = {
    DEPOSIT: { SAVINGS: 'fi-savings', CURRENT: 'fi-current' },
    TERM_DEPOSIT: { FD: 'fi-fd' },
    MUTUAL_FUNDS: { EQUITY: 'fi-mf', DEBT: 'fi-mf', HYBRID: 'fi-mf' },
    PPF: { PPF: 'fi-ppf' },
    NPS: { NPS: 'fi-nps' },
    INSURANCE: { TERM: 'fi-insurance' },
    LOAN: { HOME_LOAN: 'fi-loan', CAR_LOAN: 'fi-loan', PERSONAL_LOAN: 'fi-loan', EDUCATION_LOAN: 'fi-loan' },
  };

  function fmt(n) { return '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 0 }); }
  function fmtD(n) { return '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function fmtDate(d) { return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }); }

  // ---- Load Users ----
  async function loadUsers() {
    const res = await fetch('/api/users');
    const users = await res.json();
    const sel = $('#userSelect');
    users.forEach((u) => {
      const opt = document.createElement('option');
      opt.value = u.id;
      opt.textContent = u.name + ' (' + u.accountCount + ' accounts)';
      sel.appendChild(opt);
    });
    // Render user cards in empty state
    const cardsEl = $('#userCards');
    cardsEl.innerHTML = users.map((u) => `
      <div class="user-card" data-uid="${u.id}">
        <div class="user-card-header">
          <div class="user-avatar">${u.initials}</div>
          <div><h4>${u.name}</h4><p>${u.email}</p></div>
        </div>
        <div class="user-card-tags">
          ${u.fiTypes.map((ft) => `<span class="fi-tag">${ft}</span>`).join('')}
        </div>
      </div>
    `).join('');
    cardsEl.querySelectorAll('.user-card').forEach((card) => {
      card.addEventListener('click', () => {
        sel.value = card.dataset.uid;
        sel.dispatchEvent(new Event('change'));
        fetchData();
      });
    });
  }

  // ---- Events ----
  $('#userSelect').addEventListener('change', function () {
    $('#btnFetch').disabled = !this.value;
  });
  $('#btnFetch').addEventListener('click', fetchData);

  // Receipt Upload Form
  $('#receiptForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const uid = $('#userSelect').value;
    if (!uid) return;
    
    const fileInput = $('#receiptFile');
    if (!fileInput.files.length) return;
    
    const statusEl = $('#uploadStatus');
    statusEl.textContent = 'Uploading & verifying...';
    statusEl.style.color = 'var(--text-secondary)';
    
    // Demo payload for reconciliation based on user
    let dummyBody = { merchant: 'TANISHQ', amount: 285000, date: '2024-01-10', phone: '9876543210' };
    if (uid === 'user-003') dummyBody = { merchant: 'ETHOS', amount: 485000, date: '2022-11-05', phone: '7654321098' };
    if (uid === 'user-002') dummyBody = { merchant: 'APPLE', amount: 145000, date: '2024-03-08', phone: '8765432109' };

    try {
      const res = await fetch('/api/assets/' + uid + '/upload-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dummyBody)
      });
      if (res.ok) {
        statusEl.textContent = 'Receipt matched! Asset verified & tokenized.';
        statusEl.style.color = 'var(--accent-emerald)';
        fetchData();
      } else {
        const data = await res.json();
        statusEl.textContent = 'Verification failed: ' + (data.error || 'Unknown error');
        statusEl.style.color = 'var(--accent-rose)';
      }
    } catch (err) {
      statusEl.textContent = 'Error: ' + err.message;
      statusEl.style.color = 'var(--accent-rose)';
    }
  });

  async function fetchData() {
    const uid = $('#userSelect').value;
    if (!uid) return;
    $('#emptyState').style.display = 'none';
    $('#dashboard').style.display = 'none';
    $('#loader').classList.add('active');
    if ($('#uploadStatus')) $('#uploadStatus').textContent = '';

    try {
      const res = await fetch('/api/users/' + uid + '/fetch');
      dashData = await res.json();

      try {
        const assetRes = await fetch('/api/assets/' + uid);
        if (assetRes.ok) {
          dashData.assets = await assetRes.json();
        }
      } catch(e) { console.warn('Assets fetch failed:', e); }

      renderDashboard(dashData);
      $('#dashboard').style.display = 'block';
    } catch (e) {
      alert('Failed: ' + e.message);
      $('#emptyState').style.display = 'block';
    } finally {
      $('#loader').classList.remove('active');
    }
  }

  // ---- Render Dashboard ----
  function renderDashboard(d) {
    // Profile bar
    const initials = d.user.name.split(' ').map((w) => w[0]).join('');
    $('#profileBar').innerHTML = `
      <div class="user-avatar">${initials}</div>
      <div class="profile-info">
        <h3>${d.user.name}</h3>
        <div class="profile-meta">
          <span>📱 ${d.user.phone}</span>
          <span>📧 ${d.user.email}</span>
          <span>🪪 ${d.user.pan}</span>
          <span>🏦 ${d.accountCount} accounts</span>
        </div>
      </div>
    `;

    // Hero card — now shows Assets, Liabilities, Net Worth
    const savings = d.totalIncome - d.totalExpenses;
    const totalAssets = d.totalAssets || d.netWorth;
    const totalLiabilities = d.totalLiabilities || 0;
    $('#heroCard').innerHTML = `
      <div class="hero-label">Total Net Worth (Assets − Liabilities)</div>
      <div class="hero-value">${fmt(d.netWorth)}</div>
      <div class="hero-sub">Across ${d.accountCount} financial accounts</div>
      <div class="hero-badges">
        <div class="hero-badge"><span class="hb-label">Total Assets</span><span class="hb-value hb-value--green">${fmt(totalAssets)}</span></div>
        <div class="hero-badge"><span class="hb-label">Total Liabilities</span><span class="hb-value hb-value--red">${fmt(totalLiabilities)}</span></div>
        <div class="hero-badge"><span class="hb-label">Lifetime Income</span><span class="hb-value hb-value--green">${fmt(d.lifetimeIncome || 0)}</span></div>
        <div class="hero-badge"><span class="hb-label">Lifetime Expenses</span><span class="hb-value hb-value--red">${fmt(d.lifetimeExpenses || 0)}</span></div>
        <div class="hero-badge"><span class="hb-label">Lifetime Savings</span><span class="hb-value ${(d.lifetimeSavings || 0) >= 0 ? 'hb-value--green' : 'hb-value--red'}">${fmt(d.lifetimeSavings || 0)}</span></div>
      </div>
    `;

    // Stats row
    const topBucket = d.assetAllocation[0] || { category: 'N/A', value: 0 };
    $('#statsRow').innerHTML = `
      <div class="stat-card"><div class="sc-icon">🏦</div><div class="sc-label">Accounts</div><div class="sc-value">${d.accountCount}</div></div>
      <div class="stat-card"><div class="sc-icon">📊</div><div class="sc-label">Asset Buckets</div><div class="sc-value">${d.assetAllocation.length}</div></div>
      <div class="stat-card"><div class="sc-icon">🏆</div><div class="sc-label">Largest Bucket</div><div class="sc-value" style="font-size:0.95rem">${topBucket.category}</div></div>
      <div class="stat-card"><div class="sc-icon">💰</div><div class="sc-label">Its Value</div><div class="sc-value" style="color:var(--accent-emerald)">${fmt(topBucket.value)}</div></div>
    `;

    // Pipeline Inspector
    if (d.aaPipeline) {
      const p = d.aaPipeline;
      $('#pipelineSummary').innerHTML = `
        <div class="ps-chip"><span class="ps-icon">🔐</span><div><div class="ps-label">Crypto</div><div class="ps-value">X25519 + AES-256-GCM</div></div></div>
        <div class="ps-chip"><span class="ps-icon">📦</span><div><div class="ps-label">Encrypted Accounts</div><div class="ps-value">${p.encryptedAccountCount}</div></div></div>
        <div class="ps-chip"><span class="ps-icon">🏦</span><div><div class="ps-label">FIP Sources</div><div class="ps-value">${p.fipCount} (${p.aaResponsePreview.fipIds.join(', ')})</div></div></div>
        <div class="ps-chip"><span class="ps-icon">✅</span><div><div class="ps-label">Status</div><div class="ps-value" style="color:var(--accent-emerald)">Decrypted & Parsed</div></div></div>
        <div class="ps-chip"><span class="ps-icon">🔗</span><div><div class="ps-label">AA Txn ID</div><div class="ps-value" style="font-family:var(--font-mono);font-size:0.68rem">${p.aaResponsePreview.txnid.substring(0,18)}…</div></div></div>
      `;
      // XML preview
      if (p.decryptedXmls && p.decryptedXmls.length > 0) {
        $('#xmlPreview').textContent = p.decryptedXmls[0].xml;
      }
      // Toggle button
      const btn = $('#btnTogglePipeline');
      btn.onclick = () => {
        const det = $('#pipelineDetails');
        const showing = det.style.display !== 'none';
        det.style.display = showing ? 'none' : 'block';
        btn.textContent = showing ? 'Show Details' : 'Hide Details';
      };
    }

    // Asset Allocation
    const maxAlloc = d.assetAllocation.length > 0 ? d.assetAllocation[0].value : 1;
    $('#allocationChart').innerHTML = d.assetAllocation.map((a) => {
      const color = ALLOC_COLORS[a.category] || '#6366f1';
      const pct = Math.max((a.value / maxAlloc) * 100, 3);
      return `
        <div class="alloc-item">
          <div class="alloc-label">${a.category}</div>
          <div class="alloc-bar-wrap">
            <div class="alloc-bar" style="width:${pct}%;background:${color}">${a.percent.toFixed(1)}%</div>
          </div>
          <div class="alloc-value">${fmt(a.value)}</div>
        </div>`;
    }).join('');

    // Spending
    const maxSpend = d.spending.length > 0 ? d.spending[0].amount : 1;
    if (d.spending.length === 0) {
      $('#spendingChart').innerHTML = '<p style="color:var(--text-muted);font-size:0.82rem">No spending data available.</p>';
    } else {
      $('#spendingChart').innerHTML = d.spending.map((s) => {
        const pct = Math.max((s.amount / maxSpend) * 100, 3);
        return `
          <div class="spend-item">
            <div class="spend-icon">${s.icon}</div>
            <div class="spend-label">${s.label.replace(/^.\s*/, '')}</div>
            <div class="spend-bar-wrap">
              <div class="spend-bar" style="width:${pct}%;background:${s.color}"></div>
            </div>
            <div class="spend-value">${fmt(s.amount)}</div>
            <div class="spend-pct">${s.percent.toFixed(0)}%</div>
          </div>`;
      }).join('');
    }

    // Liabilities (Loans)
    if (d.liabilities && d.liabilities.length > 0) {
      $('#liabilitiesSection').innerHTML = `
        <div class="loan-cards">
          ${d.liabilities.map((l) => {
            const s = l.summary;
            const paidPct = s.originalLoanAmount > 0 ? ((s.totalPaid / (s.originalLoanAmount + (s.originalLoanAmount * s.interestRate / 100 * s.tenureMonths / 12))) * 100) : 0;
            const repayPct = s.originalLoanAmount > 0 ? (((s.originalLoanAmount - s.outstandingBalance) / s.originalLoanAmount) * 100) : 0;
            return `
              <div class="loan-card">
                <div class="loan-card-header">
                  <div>
                    <h4>${l.label}</h4>
                    <div class="loan-lender">${s.lender} · ${s.description}</div>
                  </div>
                  <span class="loan-type-badge">${s.type.replace(/_/g, ' ')}</span>
                </div>
                <div class="loan-outstanding">−${fmt(s.outstandingBalance)}</div>
                <div class="loan-progress">
                  <div class="loan-progress-bar">
                    <div class="loan-progress-fill" style="width:${repayPct.toFixed(0)}%"></div>
                  </div>
                  <div class="loan-progress-labels">
                    <span>${repayPct.toFixed(0)}% repaid</span>
                    <span>Original: ${fmt(s.originalLoanAmount)}</span>
                  </div>
                </div>
                <div class="loan-details">
                  <span>EMI: ${fmt(s.emiAmount)}/mo</span>
                  <span>Rate: ${s.interestRate}%</span>
                  <span>Remaining: ${s.remainingTenureMonths} months</span>
                  <span>Total Paid: ${fmt(s.totalPaid)}</span>
                </div>
              </div>`;
          }).join('')}
        </div>`;
    } else {
      $('#liabilitiesSection').innerHTML = '<p style="color:var(--text-muted);font-size:0.82rem">No outstanding loans.</p>';
    }

    // Asset Intelligence
    if (d.assets && d.assets.length > 0) {
      const grid = $('#assetIntelGrid');
      let totalValue = 0;
      let totalCagr = 0;
      
      grid.innerHTML = d.assets.map((a) => {
        totalValue += (a.currentValue || 0);
        totalCagr += (a.cagr || 0);
        const isVerified = a.status === 'VERIFIED';
        const cagrClass = a.cagr >= 0 ? 'cagr-positive' : 'cagr-negative';
        const cagrText = (a.cagr > 0 ? '+' : '') + a.cagr + '% CAGR';
        const tokenDisplay = a.tokenId ? a.tokenId : 'VNK-TKN-PENDING';
        
        return `
          <div class="asset-card">
            <div class="asset-icon-title"><span>${a.icon || '📦'}</span> <span>${a.name || a.category}</span></div>
            <div class="asset-value">${fmt(a.currentValue || 0)}</div>
            <div class="asset-cagr ${cagrClass}">${cagrText}</div>
            <div class="asset-badges">
              <div class="asset-badge ${isVerified ? 'badge-verified' : 'badge-detected'}">
                ${isVerified ? '✅ Verified' : '⏳ Detected'}
              </div>
              <div class="asset-badge token-badge">${tokenDisplay}</div>
            </div>
          </div>
        `;
      }).join('');
      
      const avgCagr = d.assets.length > 0 ? (totalCagr / d.assets.length).toFixed(1) : 0;
      $('#assetIntelSummary').innerHTML = `
        <span>Total Asset Portfolio: ${fmt(totalValue)}</span>
        <span>|</span>
        <span>Avg CAGR: ${(avgCagr > 0 ? '+' : '')}${avgCagr}%</span>
      `;
    } else {
      $('#assetIntelGrid').innerHTML = '<p style="color:var(--text-muted);font-size:0.82rem;grid-column:1/-1;text-align:center;">No assets detected.</p>';
      $('#assetIntelSummary').innerHTML = '';
    }

    // Year-wise Earnings & Expenses
    const yf = d.yearlyFinancials || [];
    if (yf.length > 0) {
      const maxYearIncome = Math.max(...yf.map((y) => y.income));
      $('#yearlySummary').innerHTML = `
        <div class="ys-chip"><div class="ys-label">Lifetime Income</div><div class="ys-value ys-value--green">${fmt(d.lifetimeIncome)}</div></div>
        <div class="ys-chip"><div class="ys-label">Lifetime Expenses</div><div class="ys-value ys-value--red">${fmt(d.lifetimeExpenses)}</div></div>
        <div class="ys-chip"><div class="ys-label">Lifetime Savings</div><div class="ys-value ys-value--blue">${fmt(d.lifetimeSavings)}</div></div>
        <div class="ys-chip"><div class="ys-label">Years Tracked</div><div class="ys-value">${yf.length}</div></div>
      `;
      $('#yearlyTableBody').innerHTML = yf.map((y, i) => {
        const incW = maxYearIncome > 0 ? (y.income / maxYearIncome * 100) : 0;
        const expW = maxYearIncome > 0 ? (y.expenses / maxYearIncome * 100) : 0;
        const prevSavings = i > 0 ? yf[i - 1].savings : y.savings;
        const trend = y.savings > prevSavings ? '↑' : y.savings < prevSavings ? '↓' : '→';
        const trendClass = y.savings > prevSavings ? 'trend-up' : y.savings < prevSavings ? 'trend-down' : '';
        return `
          <tr>
            <td style="font-weight:600">${y.year}</td>
            <td class="amount-credit">${fmt(y.income)}</td>
            <td class="amount-debit">${fmt(y.expenses)}</td>
            <td style="font-weight:600;color:${y.savings >= 0 ? 'var(--accent-emerald)' : 'var(--accent-rose)'}">${fmt(y.savings)}</td>
            <td>${y.savingsRate.toFixed(1)}%</td>
            <td class="year-bar-cell">
              <div class="year-bar-wrap">
                <div class="year-bar-income" style="width:${incW}%" title="Income: ${fmt(y.income)}"></div>
                <div class="year-bar-expense" style="width:${expW}%" title="Expenses: ${fmt(y.expenses)}"></div>
              </div>
            </td>
          </tr>`;
      }).join('');
      const lifetimeRate = d.lifetimeIncome > 0 ? ((d.lifetimeSavings / d.lifetimeIncome) * 100).toFixed(1) : '0.0';
      $('#yearlyTableFoot').innerHTML = `
        <tr>
          <td>TOTAL</td>
          <td class="amount-credit">${fmt(d.lifetimeIncome)}</td>
          <td class="amount-debit">${fmt(d.lifetimeExpenses)}</td>
          <td style="color:var(--accent-emerald)">${fmt(d.lifetimeSavings)}</td>
          <td>${lifetimeRate}%</td>
          <td></td>
        </tr>`;
    }

    // Account Cards (assets only — loans shown separately above)
    const assetAccounts = d.accounts.filter((a) => !a.isLoan);
    $('#accountsGrid').innerHTML = assetAccounts.map((a) => {
      const cls = (FI_CLASS[a.fiType] && FI_CLASS[a.fiType][a.subType]) || 'fi-savings';
      const typeLabel = a.isInsurance ? 'INSURANCE' : (a.subType || a.fiType);
      const valColor = a.fiType === 'MUTUAL_FUNDS' ? 'var(--accent-violet)' : 'var(--accent-emerald)';
      let detailHtml = '';
      if (a.summary.ifscCode) detailHtml += `<span>IFSC: ${a.summary.ifscCode}</span>`;
      if (a.summary.interestRate) detailHtml += `<span>Rate: ${a.summary.interestRate}%</span>`;
      if (a.summary.schemeCategory) detailHtml += `<span>${a.summary.schemeCategory}</span>`;
      if (a.summary.nav) detailHtml += `<span>NAV: ₹${a.summary.nav}</span>`;
      if (a.summary.units) detailHtml += `<span>Units: ${a.summary.units}</span>`;
      if (a.isInsurance) {
        detailHtml = `<span>Cover: ${fmt(a.summary.sumAssured)}</span><span>Premium: ${fmt(a.summary.premiumAmount)}/yr</span>`;
      }

      return `
        <div class="acc-card">
          <div class="acc-card-top">
            <div>
              <h4>${a.label}</h4>
              <div class="acc-fip">${a.fipName}</div>
            </div>
            <span class="acc-card-type ${cls}">${typeLabel}</span>
          </div>
          <div class="acc-value" style="color:${valColor}">${a.isInsurance ? fmt(a.summary.sumAssured) + ' cover' : fmt(a.displayValue)}</div>
          <div class="acc-masked">${a.maskedAccNumber}</div>
          <div class="acc-detail">${detailHtml}</div>
        </div>`;
    }).join('');

    // Recent Transactions
    const SPEND_LABELS = {
      housing: '🏠 Housing', food: '🍔 Food', shopping: '🛒 Shopping',
      transport: '🚗 Transport', utilities: '⚡ Utilities', investments: '📈 Invest',
      education: '🎓 Education', cash: '💵 Cash', other: '📋 Other',
    };
    function guessCat(narration) {
      const u = (narration || '').toUpperCase();
      const cats = [
        { key: 'housing', kw: ['RENT','EMI','HOME-LOAN','HOUSING'] },
        { key: 'food', kw: ['SWIGGY','ZOMATO','RESTAURANT','BARBEQUE','GROCERY','BIGBASKET','DMART'] },
        { key: 'shopping', kw: ['AMAZON','FLIPKART','MYNTRA','CLUB-MEMBERSHIP'] },
        { key: 'transport', kw: ['UBER','OLA','METRO','FUEL','PETROL','IOCL','HPCL'] },
        { key: 'utilities', kw: ['ELECTRICITY','WATER','GAS','RECHARGE','BESCOM','TORRENT','NETFLIX','SUBSCRIPTION','AIRTEL','JIO'] },
        { key: 'investments', kw: ['SIP','MF','NACH/SIP','NPS'] },
        { key: 'education', kw: ['SCHOOL','COLLEGE','FEES'] },
        { key: 'cash', kw: ['ATM','CASH'] },
      ];
      for (const c of cats) { if (c.kw.some((k) => u.includes(k))) return c.key; }
      return 'other';
    }

    $('#txnTableBody').innerHTML = d.recentTransactions.map((t) => {
      const isCredit = t.type === 'CREDIT';
      const cat = isCredit ? '—' : (SPEND_LABELS[guessCat(t.narration)] || '📋 Other');
      return `
        <tr>
          <td>${fmtDate(t.date)}</td>
          <td class="text-sm" style="max-width:140px;color:var(--text-muted)">${t.accountLabel || ''}</td>
          <td><span class="txn-badge ${isCredit ? 'txn-badge--credit' : 'txn-badge--debit'}">${t.type}</span></td>
          <td>${t.mode || ''}</td>
          <td class="${isCredit ? 'amount-credit' : 'amount-debit'}">${isCredit ? '+' : '-'}${fmtD(t.amount)}</td>
          <td><span class="cat-badge">${cat}</span></td>
          <td class="text-sm" style="max-width:200px">${t.narration || ''}</td>
        </tr>`;
    }).join('');
  }

  // ---- Init ----
  loadUsers();
})();
