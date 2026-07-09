// ============================================================================
// aa-bridge.js — Full ReBIT-compliant AA Data Bridge
//
// Provides the complete pipeline that matches real AA data flow:
//   JS Objects → ReBIT XML → ECDH Encrypt → AA Response JSON
//   AA Response JSON → ECDH Decrypt → ReBIT XML → JS Objects
//
// When connecting to a real AA (Finvu/Onemoney), you skip the first line
// and feed the real AA response directly into the decrypt→parse pipeline.
// ============================================================================

const crypto = require('node:crypto');

// ============================================================================
// 1. CRYPTO UTILITIES — ReBIT-Compliant E2E Encryption
// ============================================================================

function generateKeyPair() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('x25519');
  return {
    publicKey: publicKey.export({ type: 'spki', format: 'der' }).toString('base64'),
    privateKey: privateKey.export({ type: 'pkcs8', format: 'der' }).toString('base64'),
    publicKeyObj: publicKey,
    privateKeyObj: privateKey,
  };
}

function generateNonce() {
  return crypto.randomBytes(32).toString('base64');
}

function deriveSharedSecret(privKeyObj, peerPubB64) {
  const peerPubObj = crypto.createPublicKey({
    key: Buffer.from(peerPubB64, 'base64'), format: 'der', type: 'spki',
  });
  return crypto.diffieHellman({ privateKey: privKeyObj, publicKey: peerPubObj });
}

function deriveSessionParams(nonceA_b64, nonceB_b64) {
  const a = Buffer.from(nonceA_b64, 'base64');
  const b = Buffer.from(nonceB_b64, 'base64');
  const xored = Buffer.alloc(32);
  for (let i = 0; i < 32; i++) xored[i] = a[i] ^ b[i];
  return { salt: xored.subarray(0, 20), iv: xored.subarray(20, 32), xoredHex: xored.toString('hex') };
}

function deriveAESKey(sharedSecret, salt) {
  return Buffer.from(crypto.hkdfSync('sha256', sharedSecret, salt, Buffer.alloc(0), 32));
}

function encryptAES256GCM(key, iv, plaintext) {
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return Buffer.concat([enc, cipher.getAuthTag()]).toString('base64');
}

function decryptAES256GCM(key, iv, ciphertextB64) {
  const buf = Buffer.from(ciphertextB64, 'base64');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(buf.subarray(buf.length - 16));
  return Buffer.concat([decipher.update(buf.subarray(0, buf.length - 16)), decipher.final()]).toString('utf8');
}

// ============================================================================
// 2. ReBIT XML GENERATORS — Convert JS account objects to spec-compliant XML
// ============================================================================

function generateHolderXml(user) {
  return `  <Profile>
    <Holders type="SINGLE" holdingPattern="SINGLE">
      <Holder name="${user.name}" dob="${user.dob}" mobile="${user.phone}"
              nominee="REGISTERED" address="${escXml(user.address)}"
              email="${user.email}" pan="${user.pan}" ckycCompliance="true"/>
    </Holders>
  </Profile>`;
}

function generateDepositXml(user, acc) {
  const s = acc.summary;
  const txns = (acc.transactions || []).map((t, i) => {
    const ts = t.date + 'T' + (t.type === 'CREDIT' ? '09' : '14') + ':00:00+05:30';
    return `    <Transaction txnId="TXN${t.date.replace(/-/g, '')}${String(i).padStart(3,'0')}" type="${t.type}" mode="${t.mode}"
                 amount="${t.amount.toFixed(2)}" currentBalance="${t.balance.toFixed(2)}"
                 transactionTimestamp="${ts}" valueDate="${t.date}"
                 narration="${escXml(t.narration)}" reference="REF${Date.now()}${i}"/>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<Account xmlns="http://api.rebit.org.in/FISchema/deposit"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://api.rebit.org.in/FISchema/deposit"
         linkedAccRef="${acc.maskedAccNumber}" maskedAccNumber="${acc.maskedAccNumber}"
         version="2.0.0" type="deposit">
${generateHolderXml(user)}
  <Summary currentBalance="${s.currentBalance.toFixed(2)}" currency="${s.currency}"
           exchgeRate="" balanceDateTime="${new Date().toISOString()}"
           type="${s.type}" branch="${escXml(s.branch || '')}" facility="OD"
           ifscCode="${s.ifscCode || ''}" micrCode=""
           openingDate="${s.openingDate || ''}" currentODLimit="0"
           drawingLimit="${s.currentBalance.toFixed(2)}" status="${s.status}"/>
  <Transactions startDate="${(acc.transactions[0] || {}).date || ''}" endDate="${(acc.transactions[acc.transactions.length - 1] || {}).date || ''}">
${txns}
  </Transactions>
</Account>`;
}

function generateTermDepositXml(user, acc) {
  const s = acc.summary;
  return `<?xml version="1.0" encoding="UTF-8"?>
<Account xmlns="http://api.rebit.org.in/FISchema/term_deposit"
         linkedAccRef="${acc.maskedAccNumber}" maskedAccNumber="${acc.maskedAccNumber}"
         version="2.0.0" type="term_deposit">
${generateHolderXml(user)}
  <Summary currentValue="${s.currentBalance.toFixed(2)}" principalAmount="${s.principalAmount.toFixed(2)}"
           tenureMonths="${Math.round((s.tenureDays || 730) / 30)}" tenureDays="${s.tenureDays || 730}"
           interestRate="${s.interestRate}" interestPayout="ON_MATURITY"
           interestComputation="COMPOUND" maturityAmount="${(s.maturityAmount || 0).toFixed(2)}"
           maturityDate="${s.maturityDate || ''}" openingDate="${s.openingDate || ''}"
           currentBalance="${s.currentBalance.toFixed(2)}" currency="${s.currency}" status="${s.status}"/>
</Account>`;
}

function generateMutualFundsXml(user, acc) {
  const s = acc.summary;
  const txns = (acc.transactions || []).map((t, i) => {
    const ts = t.date + 'T10:30:00+05:30';
    return `    <Transaction txnId="MF${t.date.replace(/-/g, '')}${String(i).padStart(3,'0')}" type="${t.type}"
                 amount="${t.amount.toFixed(2)}" nav="${t.nav}" units="${t.units}"
                 transactionTimestamp="${ts}" narration="${escXml(t.narration)}"/>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<Account xmlns="http://api.rebit.org.in/FISchema/mutual_funds"
         linkedAccRef="${acc.maskedAccNumber}" maskedAccNumber="${acc.maskedAccNumber}"
         version="2.0.0" type="mutual_funds">
${generateHolderXml(user)}
  <Summary currentValue="${s.currentValue.toFixed(2)}" investmentValue="${s.investedValue.toFixed(2)}"
           currency="${s.currency}" type="${s.type}">
    <Holdings>
      <Holding amc="${escXml(s.amc || '')}" registrar="CAMS"
               isin="${s.isin || ''}" schemeName="${escXml(s.schemeName || '')}"
               schemeType="${s.type}" schemeCategory="${escXml(s.schemeCategory || '')}"
               units="${s.units}" closingNAV="${s.nav}" closingDate="${s.navDate || ''}"
               lienUnits="0" nav="${s.nav}" navDate="${s.navDate || ''}"/>
    </Holdings>
  </Summary>
  <Transactions startDate="${(acc.transactions[0] || {}).date || ''}" endDate="${(acc.transactions[acc.transactions.length - 1] || {}).date || ''}">
${txns}
  </Transactions>
</Account>`;
}

function generateInsuranceXml(user, acc) {
  const s = acc.summary;
  return `<?xml version="1.0" encoding="UTF-8"?>
<Account xmlns="http://api.rebit.org.in/FISchema/insurance"
         linkedAccRef="${acc.maskedAccNumber}" maskedAccNumber="${acc.maskedAccNumber}"
         version="2.0.0" type="insurance">
${generateHolderXml(user)}
  <Summary policyType="${s.type}" sumAssured="${s.sumAssured}" premiumAmount="${s.premiumAmount}"
           premiumFrequency="${s.premiumFrequency}" policyStartDate="${s.policyStartDate || ''}"
           policyEndDate="${s.policyEndDate || ''}" coverAmount="${s.coverAmount || s.sumAssured}"
           maturityBenefit="0" moneyBack="0" status="${s.status}" currency="${s.currency}"/>
</Account>`;
}

function generateNPSXml(user, acc) {
  const s = acc.summary;
  return `<?xml version="1.0" encoding="UTF-8"?>
<Account xmlns="http://api.rebit.org.in/FISchema/nps"
         linkedAccRef="${acc.maskedAccNumber}" maskedAccNumber="${acc.maskedAccNumber}"
         version="2.0.0" type="nps">
${generateHolderXml(user)}
  <Summary currentBalance="${s.currentBalance.toFixed(2)}" totalContribution="${(s.totalContribution || 0).toFixed(2)}"
           employerContribution="${(s.employerContribution || 0).toFixed(2)}"
           employeeContribution="${(s.employeeContribution || 0).toFixed(2)}"
           totalReturns="${(s.totalReturns || 0).toFixed(2)}" tier="TIER1"
           schemePreference="ACTIVE" currency="${s.currency}" status="${s.status}"/>
</Account>`;
}

function generatePPFXml(user, acc) {
  const s = acc.summary;
  return `<?xml version="1.0" encoding="UTF-8"?>
<Account xmlns="http://api.rebit.org.in/FISchema/ppf"
         linkedAccRef="${acc.maskedAccNumber}" maskedAccNumber="${acc.maskedAccNumber}"
         version="2.0.0" type="ppf">
${generateHolderXml(user)}
  <Summary currentBalance="${s.currentBalance.toFixed(2)}" totalAmountDeposited="${(s.totalDeposited || 0).toFixed(2)}"
           interestEarned="${(s.interestEarned || 0).toFixed(2)}" interestRate="${s.interestRate || 7.1}"
           maturityDate="${s.maturityDate || ''}" currency="${s.currency}" status="${s.status}"/>
</Account>`;
}

function generateLoanXml(user, acc) {
  const s = acc.summary;
  return `<?xml version="1.0" encoding="UTF-8"?>
<Account xmlns="http://api.rebit.org.in/FISchema/loan"
         linkedAccRef="${acc.maskedAccNumber}" maskedAccNumber="${acc.maskedAccNumber}"
         version="2.0.0" type="loan">
${generateHolderXml(user)}
  <Summary type="${escXml(s.type || '')}" description="${escXml(s.description || '')}"
           originalLoanAmount="${(s.originalLoanAmount || 0).toFixed(2)}"
           outstandingBalance="${(s.outstandingBalance || 0).toFixed(2)}"
           totalPaid="${(s.totalPaid || 0).toFixed(2)}"
           interestRate="${s.interestRate || 0}"
           emiAmount="${(s.emiAmount || 0).toFixed(2)}"
           tenureMonths="${s.tenureMonths || 0}"
           remainingTenureMonths="${s.remainingTenureMonths || 0}"
           disbursementDate="${s.disbursementDate || ''}"
           maturityDate="${s.maturityDate || ''}"
           lender="${escXml(s.lender || '')}"
           currency="${s.currency || 'INR'}" status="${s.status || 'ACTIVE'}"/>
</Account>`;
}

function accountToXml(user, acc) {
  switch (acc.fiType) {
    case 'DEPOSIT': return generateDepositXml(user, acc);
    case 'TERM_DEPOSIT': return generateTermDepositXml(user, acc);
    case 'MUTUAL_FUNDS': return generateMutualFundsXml(user, acc);
    case 'INSURANCE': return generateInsuranceXml(user, acc);
    case 'NPS': return generateNPSXml(user, acc);
    case 'PPF': return generatePPFXml(user, acc);
    case 'LOAN': return generateLoanXml(user, acc);
    default: return generateDepositXml(user, acc);
  }
}

function escXml(s) { return (s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

// ============================================================================
// 3. ReBIT XML PARSER — Convert decrypted XML back to JS objects
// ============================================================================

function parseXmlAttrs(xml, elementName) {
  // Matches both self-closing <Element .../> and opening <Element ...>
  const re = new RegExp(`<${elementName}[\\s\\n]+([^>]*?)\\s*/?>`, 's');
  const m = xml.match(re);
  if (!m) return null;
  const attrs = {};
  const attrRe = /([\w:-]+)\s*=\s*"([^"]*)"/g;
  let am;
  while ((am = attrRe.exec(m[1])) !== null) {
    if (!am[1].includes(':')) attrs[am[1]] = am[2];
  }
  return attrs;
}

function parseAllXmlElements(xml, elementName) {
  const results = [];
  const re = new RegExp(`<${elementName}[\\s\\n]+([^>]*?)\\s*/?>`, 'gs');
  let m;
  while ((m = re.exec(xml)) !== null) {
    const attrs = {};
    const attrRe = /([\w:-]+)\s*=\s*"([^"]*)"/g;
    let am;
    while ((am = attrRe.exec(m[1])) !== null) {
      if (!am[1].includes(':')) attrs[am[1]] = am[2];
    }
    results.push(attrs);
  }
  return results;
}

function parseFIXml(xml) {
  const accountAttrs = parseXmlAttrs(xml, 'Account');
  if (!accountAttrs) return null;
  const fiType = detectFIType(accountAttrs, xml);
  const holder = parseXmlAttrs(xml, 'Holder');

  switch (fiType) {
    case 'DEPOSIT': return parseDepositXml(xml, accountAttrs, holder);
    case 'TERM_DEPOSIT': return parseTermDepositXml(xml, accountAttrs, holder);
    case 'MUTUAL_FUNDS': return parseMutualFundsXml(xml, accountAttrs, holder);
    case 'INSURANCE': return parseInsuranceXml(xml, accountAttrs, holder);
    case 'NPS': return parseNPSXml(xml, accountAttrs, holder);
    case 'PPF': return parsePPFXml(xml, accountAttrs, holder);
    case 'LOAN': return parseLoanXml(xml, accountAttrs, holder);
    default: return parseDepositXml(xml, accountAttrs, holder);
  }
}

function detectFIType(attrs, xml) {
  const type = (attrs.type || '').toLowerCase();
  if (xml.includes('FISchema/loan')) return 'LOAN';
  if (xml.includes('FISchema/deposit')) return 'DEPOSIT';
  if (xml.includes('FISchema/term_deposit')) return 'TERM_DEPOSIT';
  if (xml.includes('FISchema/mutual_funds')) return 'MUTUAL_FUNDS';
  if (xml.includes('FISchema/insurance')) return 'INSURANCE';
  if (xml.includes('FISchema/nps')) return 'NPS';
  if (xml.includes('FISchema/ppf')) return 'PPF';
  if (type === 'loan') return 'LOAN';
  if (type === 'deposit') return 'DEPOSIT';
  if (type === 'term_deposit') return 'TERM_DEPOSIT';
  if (type === 'mutual_funds') return 'MUTUAL_FUNDS';
  return 'DEPOSIT';
}

function parseDepositXml(xml, accountAttrs, holder) {
  const summary = parseXmlAttrs(xml, 'Summary');
  const txns = parseAllXmlElements(xml, 'Transaction').map((t) => ({
    date: (t.transactionTimestamp || t.valueDate || '').substring(0, 10),
    type: t.type, mode: t.mode || '', amount: parseFloat(t.amount) || 0,
    narration: t.narration || '', balance: parseFloat(t.currentBalance) || 0,
  }));
  return {
    fiType: 'DEPOSIT', subType: summary?.type || 'SAVINGS',
    maskedAccNumber: accountAttrs.maskedAccNumber || '',
    holder: holder || {},
    summary: {
      currentBalance: parseFloat(summary?.currentBalance) || 0,
      type: summary?.type || 'SAVINGS', currency: summary?.currency || 'INR',
      ifscCode: summary?.ifscCode || '', branch: summary?.branch || '',
      status: summary?.status || 'ACTIVE', openingDate: summary?.openingDate || '',
    },
    transactions: txns,
  };
}

function parseTermDepositXml(xml, accountAttrs, holder) {
  const summary = parseXmlAttrs(xml, 'Summary');
  return {
    fiType: 'TERM_DEPOSIT', subType: 'FD',
    maskedAccNumber: accountAttrs.maskedAccNumber || '',
    holder: holder || {},
    summary: {
      currentBalance: parseFloat(summary?.currentBalance || summary?.currentValue) || 0,
      principalAmount: parseFloat(summary?.principalAmount) || 0,
      interestRate: parseFloat(summary?.interestRate) || 0,
      maturityDate: summary?.maturityDate || '', maturityAmount: parseFloat(summary?.maturityAmount) || 0,
      type: 'FD', currency: summary?.currency || 'INR', status: summary?.status || 'ACTIVE',
      openingDate: summary?.openingDate || '',
    },
    transactions: [],
  };
}

function parseMutualFundsXml(xml, accountAttrs, holder) {
  const summary = parseXmlAttrs(xml, 'Summary');
  const holding = parseXmlAttrs(xml, 'Holding');
  const txns = parseAllXmlElements(xml, 'Transaction').map((t) => ({
    date: (t.transactionTimestamp || '').substring(0, 10),
    type: t.type, amount: parseFloat(t.amount) || 0,
    nav: parseFloat(t.nav) || 0, units: parseFloat(t.units) || 0,
    narration: t.narration || '',
  }));
  return {
    fiType: 'MUTUAL_FUNDS', subType: summary?.type || holding?.schemeType || 'EQUITY',
    maskedAccNumber: accountAttrs.maskedAccNumber || '',
    holder: holder || {},
    summary: {
      currentValue: parseFloat(summary?.currentValue) || 0,
      investedValue: parseFloat(summary?.investmentValue) || 0,
      units: parseFloat(holding?.units) || 0, nav: parseFloat(holding?.nav || holding?.closingNAV) || 0,
      navDate: holding?.navDate || holding?.closingDate || '',
      schemeName: holding?.schemeName || '', amc: holding?.amc || '', isin: holding?.isin || '',
      schemeCategory: holding?.schemeCategory || '', type: summary?.type || 'EQUITY', currency: summary?.currency || 'INR',
    },
    transactions: txns,
  };
}

function parseInsuranceXml(xml, accountAttrs, holder) {
  const summary = parseXmlAttrs(xml, 'Summary');
  return {
    fiType: 'INSURANCE', subType: summary?.policyType || 'TERM',
    maskedAccNumber: accountAttrs.maskedAccNumber || '',
    holder: holder || {},
    summary: {
      sumAssured: parseFloat(summary?.sumAssured) || 0,
      premiumAmount: parseFloat(summary?.premiumAmount) || 0,
      premiumFrequency: summary?.premiumFrequency || 'ANNUAL',
      policyStartDate: summary?.policyStartDate || '', policyEndDate: summary?.policyEndDate || '',
      coverAmount: parseFloat(summary?.coverAmount || summary?.sumAssured) || 0,
      type: summary?.policyType || 'TERM', status: summary?.status || 'ACTIVE', currency: summary?.currency || 'INR',
    },
    transactions: [],
  };
}

function parseNPSXml(xml, accountAttrs, holder) {
  const summary = parseXmlAttrs(xml, 'Summary');
  return {
    fiType: 'NPS', subType: 'NPS',
    maskedAccNumber: accountAttrs.maskedAccNumber || '',
    holder: holder || {},
    summary: {
      currentBalance: parseFloat(summary?.currentBalance) || 0,
      totalContribution: parseFloat(summary?.totalContribution) || 0,
      employerContribution: parseFloat(summary?.employerContribution) || 0,
      employeeContribution: parseFloat(summary?.employeeContribution) || 0,
      totalReturns: parseFloat(summary?.totalReturns) || 0,
      type: 'NPS', currency: summary?.currency || 'INR', status: summary?.status || 'ACTIVE',
    },
    transactions: [],
  };
}

function parsePPFXml(xml, accountAttrs, holder) {
  const summary = parseXmlAttrs(xml, 'Summary');
  return {
    fiType: 'PPF', subType: 'PPF',
    maskedAccNumber: accountAttrs.maskedAccNumber || '',
    holder: holder || {},
    summary: {
      currentBalance: parseFloat(summary?.currentBalance) || 0,
      totalDeposited: parseFloat(summary?.totalAmountDeposited) || 0,
      interestEarned: parseFloat(summary?.interestEarned) || 0,
      interestRate: parseFloat(summary?.interestRate) || 7.1,
      maturityDate: summary?.maturityDate || '',
      type: 'PPF', currency: summary?.currency || 'INR', status: summary?.status || 'ACTIVE',
    },
    transactions: [],
  };
}

function parseLoanXml(xml, accountAttrs, holder) {
  const summary = parseXmlAttrs(xml, 'Summary');
  return {
    fiType: 'LOAN', subType: summary?.type || 'HOME_LOAN',
    maskedAccNumber: accountAttrs.maskedAccNumber || '',
    holder: holder || {},
    summary: {
      type: summary?.type || 'HOME_LOAN', description: summary?.description || '',
      originalLoanAmount: parseFloat(summary?.originalLoanAmount) || 0,
      outstandingBalance: parseFloat(summary?.outstandingBalance) || 0,
      totalPaid: parseFloat(summary?.totalPaid) || 0,
      interestRate: parseFloat(summary?.interestRate) || 0,
      emiAmount: parseFloat(summary?.emiAmount) || 0,
      tenureMonths: parseInt(summary?.tenureMonths) || 0,
      remainingTenureMonths: parseInt(summary?.remainingTenureMonths) || 0,
      disbursementDate: summary?.disbursementDate || '', maturityDate: summary?.maturityDate || '',
      lender: summary?.lender || '', currency: summary?.currency || 'INR', status: summary?.status || 'ACTIVE',
    },
    transactions: [],
  };
}

// ============================================================================
// 4. AA RESPONSE SIMULATOR — Mimics real Finvu/Onemoney AA response format
// ============================================================================

/**
 * Simulates the full AA data fetch pipeline for a user:
 *  1. FIU generates ephemeral key pair + nonce
 *  2. For each FIP, generates FIP key pair + nonce
 *  3. Encrypts each account's ReBIT XML
 *  4. Builds the exact JSON format a real AA returns
 *
 * Returns: { aaResponse, fiuPrivateKey, fiuNonce, rawXmlByAccount }
 */
function simulateAAFetch(user) {
  // Step 1: FIU generates ephemeral keys
  const fiuKeys = generateKeyPair();
  const fiuNonce = generateNonce();

  // Group accounts by FIP (each FIP has its own KeyMaterial)
  const fipGroups = {};
  for (const acc of user.accounts) {
    if (!fipGroups[acc.fipId]) fipGroups[acc.fipId] = { fipId: acc.fipId, fipName: acc.fipName, accounts: [] };
    fipGroups[acc.fipId].accounts.push(acc);
  }

  const fiArray = [];
  const rawXmlByAccount = {};

  for (const fipGroup of Object.values(fipGroups)) {
    // Each FIP generates its own key pair + nonce
    const fipKeys = generateKeyPair();
    const fipNonce = generateNonce();

    // Derive shared secret + AES key (FIP side)
    const sharedSecret = deriveSharedSecret(fipKeys.privateKeyObj, fiuKeys.publicKey);
    const { salt, iv } = deriveSessionParams(fiuNonce, fipNonce);
    const aesKey = deriveAESKey(sharedSecret, salt);

    // Encrypt each account's XML
    const dataEntries = [];
    for (const acc of fipGroup.accounts) {
      const xml = accountToXml(user, acc);
      rawXmlByAccount[acc.maskedAccNumber] = xml;
      const encryptedFI = encryptAES256GCM(aesKey, iv, xml);
      dataEntries.push({
        linkRefNumber: acc.maskedAccNumber,
        maskedAccNumber: acc.maskedAccNumber,
        encryptedFI,
      });
    }

    fiArray.push({
      fipID: fipGroup.fipId,
      data: dataEntries,
      KeyMaterial: {
        cryptoAlg: 'ECDH',
        curve: 'Curve25519',
        params: 'AES/GCM/NoPadding',
        DHPublicKey: {
          expiry: new Date(Date.now() + 86400000).toISOString(),
          Parameters: 'Curve25519/32byte random key',
          KeyValue: fipKeys.publicKey,
        },
        Nonce: fipNonce,
      },
    });
  }

  return {
    aaResponse: {
      ver: '2.0.0',
      timestamp: new Date().toISOString(),
      txnid: crypto.randomUUID(),
      FI: fiArray,
    },
    fiuKeyMaterial: {
      cryptoAlg: 'ECDH', curve: 'Curve25519', params: 'AES/GCM/NoPadding',
      DHPublicKey: { KeyValue: fiuKeys.publicKey },
      Nonce: fiuNonce,
    },
    fiuPrivateKey: fiuKeys.privateKey,
    fiuNonce,
    rawXmlByAccount,
  };
}

// ============================================================================
// 5. DECRYPT + PARSE PIPELINE — Process real (or simulated) AA responses
// ============================================================================

/**
 * Decrypts and parses an AA response using the FIU's private key and nonce.
 * This is the SAME code that works with real Finvu/Onemoney responses.
 *
 * @param {Object} aaResponse - The AA response JSON (with FI array)
 * @param {string} fiuPrivateKeyB64 - FIU private key (PKCS8 DER, base64)
 * @param {string} fiuNonce - FIU nonce (base64)
 * @returns {Array} Array of parsed account objects
 */
function decryptAndParseAAResponse(aaResponse, fiuPrivateKeyB64, fiuNonce) {
  const fiuPrivKeyObj = crypto.createPrivateKey({
    key: Buffer.from(fiuPrivateKeyB64, 'base64'), format: 'der', type: 'pkcs8',
  });

  const parsedAccounts = [];
  const decryptedXmls = [];

  for (const fi of aaResponse.FI) {
    const fipPubKey = fi.KeyMaterial.DHPublicKey.KeyValue;
    const fipNonce = fi.KeyMaterial.Nonce;

    // Derive shared secret
    const sharedSecret = deriveSharedSecret(fiuPrivKeyObj, fipPubKey);
    const { salt, iv } = deriveSessionParams(fiuNonce, fipNonce);
    const aesKey = deriveAESKey(sharedSecret, salt);

    // Decrypt each account
    for (const entry of fi.data) {
      const xml = decryptAES256GCM(aesKey, iv, entry.encryptedFI);
      decryptedXmls.push({ maskedAccNumber: entry.maskedAccNumber, xml });

      const parsed = parseFIXml(xml);
      if (parsed) {
        parsed.fipId = fi.fipID;
        parsedAccounts.push(parsed);
      }
    }
  }

  return { parsedAccounts, decryptedXmls };
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  simulateAAFetch,
  decryptAndParseAAResponse,
  parseFIXml,
  accountToXml,
  // Crypto exports for direct use
  generateKeyPair, generateNonce, deriveSharedSecret, deriveSessionParams,
  deriveAESKey, encryptAES256GCM, decryptAES256GCM,
};
