const fs = require('fs');

let serverFile = fs.readFileSync('server.js', 'utf-8');

const newAssets = [
  { date: '2019-05-12', type: 'DEBIT', mode: 'NEFT', amount: 12500000, narration: 'NEFT/PROPERTY/REGISTRATION/FLAT-MUMBAI', balance: 100000 },
  { date: '2020-08-22', type: 'DEBIT', mode: 'NEFT', amount: 8500000, narration: 'NEFT/PROPERTY/REGISTRATION/FLAT-BLR', balance: 100000 },
  { date: '2021-11-05', type: 'DEBIT', mode: 'NEFT', amount: 4500000, narration: 'NEFT/PROPERTY/REGISTRATION/PLOT-HYD', balance: 100000 },
  { date: '2023-09-15', type: 'DEBIT', mode: 'UPI', amount: 140000, narration: 'UPI/APPLE/IPHONE-15-PRO', balance: 100000 },
  { date: '2022-04-10', type: 'DEBIT', mode: 'NEFT', amount: 1850000, narration: 'NEFT/SHOWROOM/HONDA-CITY-HYBRID', balance: 100000 },
  { date: '2023-12-01', type: 'DEBIT', mode: 'NEFT', amount: 2450000, narration: 'NEFT/SHOWROOM/TATA-SAFARI', balance: 100000 },
  { date: '2023-01-20', type: 'DEBIT', mode: 'NEFT', amount: 1750000, narration: 'NEFT/TANISHQ/GOLD-BAR-250G', balance: 100000 },
  { date: '2022-06-18', type: 'DEBIT', mode: 'NEFT', amount: 1250000, narration: 'NEFT/ETHOS/ROLEX-DAYTONA', balance: 100000 },
  { date: '2023-11-10', type: 'DEBIT', mode: 'NEFT', amount: 850000, narration: 'NEFT/ETHOS/OMEGA-SPEEDMASTER', balance: 100000 },
  { date: '2021-02-14', type: 'DEBIT', mode: 'NEFT', amount: 3500000, narration: 'NEFT/SOTHEBY/PAINTING-HUSSAIN', balance: 100000 },
  { date: '2022-08-30', type: 'DEBIT', mode: 'NEFT', amount: 2800000, narration: 'NEFT/CHRISTIE/ART-PIECE-RAZA', balance: 100000 },
  { date: '2024-02-14', type: 'DEBIT', mode: 'UPI', amount: 250000, narration: 'UPI/LOUIS-VUITTON/DESIGNER-BAG', balance: 100000 },
  { date: '2023-10-25', type: 'DEBIT', mode: 'NEFT', amount: 1550000, narration: 'NEFT/MALABAR-GOLD/DIAMOND-NECKLACE', balance: 100000 }
];

const receipts = [];
const userIds = ['user-001', 'user-002', 'user-003'];

userIds.forEach(uid => {
  newAssets.forEach(a => {
    let merchant = '';
    if (a.narration.includes('PROPERTY')) merchant = 'PROPERTY';
    if (a.narration.includes('APPLE')) merchant = 'APPLE';
    if (a.narration.includes('SHOWROOM')) merchant = 'SHOWROOM';
    if (a.narration.includes('TANISHQ')) merchant = 'TANISHQ';
    if (a.narration.includes('ETHOS')) merchant = 'ETHOS';
    if (a.narration.includes('SOTHEBY')) merchant = 'SOTHEBY';
    if (a.narration.includes('CHRISTIE')) merchant = 'CHRISTIE';
    if (a.narration.includes('LOUIS-VUITTON')) merchant = 'LOUIS-VUITTON';
    if (a.narration.includes('MALABAR-GOLD')) merchant = 'MALABAR-GOLD';
    
    receipts.push({
      userId: uid,
      amount: a.amount,
      date: a.date,
      merchant: merchant
    });
  });
});

// We'll just replace the VERIFIED_RECEIPTS empty array with our prefilled one.
serverFile = serverFile.replace('const VERIFIED_RECEIPTS = [];', 'const VERIFIED_RECEIPTS = ' + JSON.stringify(receipts, null, 2) + ';');

// Now let's inject the transactions into each user's savings account.
// This regex finds the transactions array for the first SAVINGS account of each user.
// It's a bit tricky to parse JS with regex, so let's do a more manual approach.
// We'll evaluate TEST_USERS, modify it, and write it back. Wait, server.js has functions at the bottom.
// Let's just find `mode: 'UPI', amount: 85000, narration: 'UPI/SALARY/JUNE2024/ACME-CORP'` for user-001
// User-002: `amount: 65000, narration: 'NEFT/SALARY/JUNE2024/INFOSYS'`
// User-003: `amount: 350000, narration: 'NEFT/SALARY/JUNE2024/TCS-LTD'`

const injection1 = JSON.stringify(newAssets, null, 2).replace(/^\[\n/, '').replace(/\n\]$/, ',') + '\n';
serverFile = serverFile.replace(
  /({ date: '2024-06-01', type: 'CREDIT', mode: 'UPI', amount: 85000, narration: 'UPI\/SALARY\/JUNE2024\/ACME-CORP', balance: 198500.25 },)/,
  injection1 + '          $1'
);

serverFile = serverFile.replace(
  /({ date: '2024-06-01', type: 'CREDIT', mode: 'NEFT', amount: 65000, narration: 'NEFT\/SALARY\/JUNE2024\/INFOSYS', balance: 98320.50 },)/,
  injection1 + '          $1'
);

serverFile = serverFile.replace(
  /({ date: '2024-06-01', type: 'CREDIT', mode: 'NEFT', amount: 350000, narration: 'NEFT\/SALARY\/JUNE2024\/TCS-LTD', balance: 1095000 },)/,
  injection1 + '          $1'
);

fs.writeFileSync('server.js', serverFile);
console.log('Done!');
