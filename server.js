const express = require('express');
const crypto = require('node:crypto');
const path = require('path');
const aaBridge = require('./aa-bridge');

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ============================================================================
// TEST USERS — Realistic multi-asset financial profiles
// ============================================================================

const TEST_USERS = [
  {
    id: 'user-001',
    name: 'Rajesh Kumar',
    dob: '1990-05-15',
    phone: '9876543210',
    email: 'rajesh.kumar@email.com',
    pan: 'ABCPK1234F',
    address: '42, MG Road, Bengaluru, Karnataka 560001',
    accounts: [
      {
        fiType: 'DEPOSIT', subType: 'SAVINGS',
        label: 'HDFC Savings Account', maskedAccNumber: 'XXXX1234',
        fipId: 'HDFC-FIP', fipName: 'HDFC Bank',
        summary: { currentBalance: 245680.75, type: 'SAVINGS', currency: 'INR', ifscCode: 'HDFC0001234', branch: 'MG Road Branch', status: 'ACTIVE', openingDate: '2018-03-20' },
        transactions: [
          { date: '2024-06-01', type: 'CREDIT', mode: 'UPI', amount: 85000, narration: 'UPI/SALARY/JUNE2024/ACME-CORP', balance: 198500.25 },
          { date: '2024-06-02', type: 'DEBIT', mode: 'UPI', amount: 1200, narration: 'UPI/SWIGGY/ORDER-98765', balance: 197300.25 },
          { date: '2024-06-03', type: 'DEBIT', mode: 'UPI', amount: 2500, narration: 'UPI/ZOMATO/ORDER-456789', balance: 194800.25 },
          { date: '2024-06-04', type: 'DEBIT', mode: 'UPI', amount: 850, narration: 'UPI/UBER/RIDE-BLR-1234', balance: 193950.25 },
          { date: '2024-06-05', type: 'DEBIT', mode: 'NEFT', amount: 22000, narration: 'NEFT/RENT/JUNE2024/LANDLORD', balance: 171950.25 },
          { date: '2024-06-06', type: 'DEBIT', mode: 'UPI', amount: 3200, narration: 'UPI/AMAZON/ORDER-AMZ456', balance: 168750.25 },
          { date: '2024-06-07', type: 'CREDIT', mode: 'IMPS', amount: 25000, narration: 'IMPS/FREELANCE/PROJECT-ATLAS', balance: 193750.25 },
          { date: '2024-06-08', type: 'DEBIT', mode: 'UPI', amount: 1500, narration: 'UPI/ELECTRICITY/BESCOM-JUN', balance: 192250.25 },
          { date: '2024-06-09', type: 'DEBIT', mode: 'UPI', amount: 450, narration: 'UPI/RECHARGE/JIO-PREPAID', balance: 191800.25 },
          { date: '2024-06-10', type: 'DEBIT', mode: 'UPI', amount: 4319.50, narration: 'UPI/FLIPKART/ORDER-FK789', balance: 187480.75 },
          { date: '2024-06-11', type: 'DEBIT', mode: 'NACH', amount: 12500, narration: 'NACH/SIP/AXIS-BLUECHIP-DIRECT', balance: 174980.75 },
          { date: '2024-06-12', type: 'DEBIT', mode: 'ATM', amount: 10000, narration: 'ATM/CASH-WDL/HDFC-ATM-MGROAD', balance: 164980.75 },
          { date: '2024-06-13', type: 'DEBIT', mode: 'UPI', amount: 2800, narration: 'UPI/DMART/GROCERIES-JUN', balance: 162180.75 },
          { date: '2024-06-14', type: 'DEBIT', mode: 'UPI', amount: 5500, narration: 'UPI/MYNTRA/ORDER-MN234', balance: 156680.75 },
          { date: '2024-06-15', type: 'CREDIT', mode: 'NEFT', amount: 54000, narration: 'NEFT/DIVIDEND/MF-AXIS-BLUECHIP', balance: 210680.75 },
          { date: '2024-06-18', type: 'DEBIT', mode: 'UPI', amount: 1800, narration: 'UPI/FUEL/HPCL-STATION', balance: 208880.75 },
          { date: '2024-06-20', type: 'DEBIT', mode: 'UPI', amount: 3200, narration: 'UPI/RESTAURANT/BARBEQUE-NATION', balance: 205680.75 },
          { date: '2024-06-25', type: 'CREDIT', mode: 'UPI', amount: 40000, narration: 'UPI/BONUS/ACME-CORP-Q2', balance: 245680.75 },
        ],
      },
      {
        fiType: 'TERM_DEPOSIT', subType: 'FD',
        label: 'SBI Fixed Deposit', maskedAccNumber: 'XXXX5678',
        fipId: 'SBI-FIP', fipName: 'State Bank of India',
        summary: { currentBalance: 530000, principalAmount: 500000, interestRate: 7.1, maturityDate: '2025-12-15', maturityAmount: 571550, type: 'FD', currency: 'INR', status: 'ACTIVE', openingDate: '2023-12-15' },
        transactions: [
          { date: '2023-12-15', type: 'CREDIT', mode: 'NEFT', amount: 500000, narration: 'FD/OPENING/PRINCIPAL', balance: 500000 },
          { date: '2024-06-15', type: 'CREDIT', mode: 'INTERNAL', amount: 30000, narration: 'FD/INTEREST/HALFYEARLY', balance: 530000 },
        ],
      },
      {
        fiType: 'MUTUAL_FUNDS', subType: 'EQUITY',
        label: 'Axis Bluechip Fund - Direct Growth', maskedAccNumber: 'FOLIO-1234',
        fipId: 'CAMS-FIP', fipName: 'CAMS',
        summary: { currentValue: 534210.80, investedValue: 450000, units: 1250.345, nav: 427.24, navDate: '2024-06-14', schemeName: 'Axis Bluechip Fund - Direct Growth', amc: 'Axis Mutual Fund', isin: 'INF846K01EW2', schemeCategory: 'Large Cap', type: 'EQUITY', currency: 'INR' },
        transactions: [
          { date: '2024-01-15', type: 'PURCHASE', amount: 25000, nav: 415.30, units: 60.204, narration: 'SIP/JAN2024' },
          { date: '2024-02-15', type: 'PURCHASE', amount: 25000, nav: 418.75, units: 59.701, narration: 'SIP/FEB2024' },
          { date: '2024-03-15', type: 'PURCHASE', amount: 25000, nav: 410.00, units: 60.976, narration: 'SIP/MAR2024' },
          { date: '2024-04-15', type: 'PURCHASE', amount: 25000, nav: 420.50, units: 59.453, narration: 'SIP/APR2024' },
          { date: '2024-05-15', type: 'PURCHASE', amount: 25000, nav: 422.10, units: 59.228, narration: 'SIP/MAY2024' },
          { date: '2024-06-14', type: 'PURCHASE', amount: 25000, nav: 427.24, units: 58.528, narration: 'SIP/JUN2024' },
        ],
      },
      {
        fiType: 'MUTUAL_FUNDS', subType: 'DEBT',
        label: 'ICICI Pru Short Term Fund - Direct', maskedAccNumber: 'FOLIO-5678',
        fipId: 'KARVY-FIP', fipName: 'KFintech',
        summary: { currentValue: 325400, investedValue: 300000, units: 5420.15, nav: 60.04, navDate: '2024-06-14', schemeName: 'ICICI Pru Short Term Fund - Direct Growth', amc: 'ICICI Prudential', isin: 'INF109K01VQ1', schemeCategory: 'Short Duration', type: 'DEBT', currency: 'INR' },
        transactions: [
          { date: '2024-01-10', type: 'PURCHASE', amount: 100000, nav: 58.20, units: 1718.21, narration: 'LUMPSUM/JAN2024' },
          { date: '2024-03-10', type: 'PURCHASE', amount: 100000, nav: 58.90, units: 1698.02, narration: 'LUMPSUM/MAR2024' },
          { date: '2024-05-10', type: 'PURCHASE', amount: 100000, nav: 59.50, units: 1680.67, narration: 'LUMPSUM/MAY2024' },
        ],
      },
      {
        fiType: 'PPF', subType: 'PPF',
        label: 'SBI PPF Account', maskedAccNumber: 'XXXX9012',
        fipId: 'SBI-FIP', fipName: 'State Bank of India',
        summary: { currentBalance: 850000, totalDeposited: 750000, interestEarned: 100000, interestRate: 7.1, maturityDate: '2033-04-01', type: 'PPF', currency: 'INR', status: 'ACTIVE', openingDate: '2018-04-01' },
        transactions: [
          { date: '2024-04-05', type: 'CREDIT', mode: 'NEFT', amount: 150000, narration: 'PPF/ANNUAL-DEPOSIT/FY2024-25', balance: 850000 },
        ],
      },
      {
        fiType: 'LOAN', subType: 'HOME_LOAN',
        label: 'HDFC Home Loan', maskedAccNumber: 'HL-XXXX4567',
        fipId: 'HDFC-FIP', fipName: 'HDFC Bank',
        summary: { type: 'HOME_LOAN', description: 'Home Loan - 2BHK Flat Whitefield', originalLoanAmount: 4500000, outstandingBalance: 3820000, totalPaid: 2016000, interestRate: 8.5, emiAmount: 42000, tenureMonths: 240, remainingTenureMonths: 192, disbursementDate: '2020-06-15', maturityDate: '2040-06-15', lender: 'HDFC Ltd', currency: 'INR', status: 'ACTIVE' },
        transactions: [],
      },
    ],
    yearlyFinancials: [
      { year: 2018, income: 720000, expenses: 540000 },
      { year: 2019, income: 840000, expenses: 620000 },
      { year: 2020, income: 960000, expenses: 750000 },
      { year: 2021, income: 1080000, expenses: 840000 },
      { year: 2022, income: 1260000, expenses: 960000 },
      { year: 2023, income: 1440000, expenses: 1080000 },
      { year: 2024, income: 1680000, expenses: 1140000 },
    ],
  },
  {
    id: 'user-002',
    name: 'Priya Sharma',
    dob: '1997-11-22',
    phone: '8765432109',
    email: 'priya.sharma@email.com',
    pan: 'BXYPS5678G',
    address: '15, Residency Road, Mumbai, Maharashtra 400001',
    accounts: [
      {
        fiType: 'DEPOSIT', subType: 'SAVINGS',
        label: 'ICICI Savings Account', maskedAccNumber: 'XXXX4321',
        fipId: 'ICICI-FIP', fipName: 'ICICI Bank',
        summary: { currentBalance: 85320.50, type: 'SAVINGS', currency: 'INR', ifscCode: 'ICIC0001234', branch: 'Bandra West Branch', status: 'ACTIVE', openingDate: '2020-01-15' },
        transactions: [
          { date: '2024-06-01', type: 'CREDIT', mode: 'NEFT', amount: 65000, narration: 'NEFT/SALARY/JUNE2024/INFOSYS', balance: 98320.50 },
          { date: '2024-06-03', type: 'DEBIT', mode: 'UPI', amount: 780, narration: 'UPI/SWIGGY/ORDER-SWG123', balance: 97540.50 },
          { date: '2024-06-05', type: 'DEBIT', mode: 'UPI', amount: 18000, narration: 'UPI/RENT/JUNE2024/FLATOWNER', balance: 79540.50 },
          { date: '2024-06-07', type: 'DEBIT', mode: 'UPI', amount: 2200, narration: 'UPI/MYNTRA/ORDER-MYN567', balance: 77340.50 },
          { date: '2024-06-08', type: 'DEBIT', mode: 'NACH', amount: 10000, narration: 'NACH/SIP/MIRAE-ELSS-DIRECT', balance: 67340.50 },
          { date: '2024-06-10', type: 'DEBIT', mode: 'UPI', amount: 650, narration: 'UPI/UBER/RIDE-MUM-5678', balance: 66690.50 },
          { date: '2024-06-12', type: 'DEBIT', mode: 'UPI', amount: 1200, narration: 'UPI/NETFLIX/SUBSCRIPTION', balance: 65490.50 },
          { date: '2024-06-14', type: 'DEBIT', mode: 'UPI', amount: 3500, narration: 'UPI/AMAZON/ORDER-AMZ789', balance: 61990.50 },
          { date: '2024-06-15', type: 'CREDIT', mode: 'UPI', amount: 15000, narration: 'UPI/FREELANCE/DESIGN-PROJECT', balance: 76990.50 },
          { date: '2024-06-18', type: 'DEBIT', mode: 'UPI', amount: 950, narration: 'UPI/RECHARGE/AIRTEL-POSTPAID', balance: 76040.50 },
          { date: '2024-06-22', type: 'CREDIT', mode: 'UPI', amount: 12000, narration: 'UPI/REFUND/FLIPKART-RETURN', balance: 88040.50 },
          { date: '2024-06-28', type: 'DEBIT', mode: 'UPI', amount: 2720, narration: 'UPI/GROCERY/BIGBASKET-JUN', balance: 85320.50 },
        ],
      },
      {
        fiType: 'DEPOSIT', subType: 'SAVINGS',
        label: 'Kotak Savings Account', maskedAccNumber: 'XXXX8765',
        fipId: 'KOTAK-FIP', fipName: 'Kotak Mahindra Bank',
        summary: { currentBalance: 152400, type: 'SAVINGS', currency: 'INR', ifscCode: 'KKBK0000123', branch: 'Andheri Branch', status: 'ACTIVE', openingDate: '2021-06-10' },
        transactions: [
          { date: '2024-06-01', type: 'CREDIT', mode: 'NEFT', amount: 50000, narration: 'NEFT/TRANSFER/ICICI-TO-KOTAK', balance: 142400 },
          { date: '2024-06-15', type: 'CREDIT', mode: 'INTERNAL', amount: 10000, narration: 'INT/SWEEP/AUTO-SWEEP-INTEREST', balance: 152400 },
        ],
      },
      {
        fiType: 'MUTUAL_FUNDS', subType: 'EQUITY',
        label: 'Mirae Asset ELSS Tax Saver - Direct', maskedAccNumber: 'FOLIO-9876',
        fipId: 'CAMS-FIP', fipName: 'CAMS',
        summary: { currentValue: 215000, investedValue: 180000, units: 4850.22, nav: 44.33, navDate: '2024-06-14', schemeName: 'Mirae Asset ELSS Tax Saver - Direct Growth', amc: 'Mirae Asset', isin: 'INF769K01AX2', schemeCategory: 'ELSS', type: 'EQUITY', currency: 'INR' },
        transactions: [
          { date: '2024-01-08', type: 'PURCHASE', amount: 10000, nav: 40.50, units: 246.91, narration: 'SIP/JAN2024' },
          { date: '2024-02-08', type: 'PURCHASE', amount: 10000, nav: 41.20, units: 242.72, narration: 'SIP/FEB2024' },
          { date: '2024-03-08', type: 'PURCHASE', amount: 10000, nav: 42.00, units: 238.10, narration: 'SIP/MAR2024' },
          { date: '2024-04-08', type: 'PURCHASE', amount: 10000, nav: 42.80, units: 233.64, narration: 'SIP/APR2024' },
          { date: '2024-05-08', type: 'PURCHASE', amount: 10000, nav: 43.50, units: 229.89, narration: 'SIP/MAY2024' },
          { date: '2024-06-08', type: 'PURCHASE', amount: 10000, nav: 44.33, units: 225.58, narration: 'SIP/JUN2024' },
        ],
      },
      {
        fiType: 'MUTUAL_FUNDS', subType: 'HYBRID',
        label: 'HDFC Balanced Advantage - Direct', maskedAccNumber: 'FOLIO-6543',
        fipId: 'KARVY-FIP', fipName: 'KFintech',
        summary: { currentValue: 180000, investedValue: 150000, units: 420.35, nav: 428.20, navDate: '2024-06-14', schemeName: 'HDFC Balanced Advantage Fund - Direct Growth', amc: 'HDFC AMC', isin: 'INF179K01XQ8', schemeCategory: 'Balanced Advantage', type: 'HYBRID', currency: 'INR' },
        transactions: [
          { date: '2024-01-05', type: 'PURCHASE', amount: 50000, nav: 410.00, units: 121.95, narration: 'LUMPSUM/JAN2024' },
          { date: '2024-04-05', type: 'PURCHASE', amount: 50000, nav: 420.50, units: 118.91, narration: 'LUMPSUM/APR2024' },
          { date: '2024-06-05', type: 'PURCHASE', amount: 50000, nav: 428.20, units: 116.78, narration: 'LUMPSUM/JUN2024' },
        ],
      },
      {
        fiType: 'LOAN', subType: 'EDUCATION_LOAN',
        label: 'SBI Education Loan', maskedAccNumber: 'EL-XXXX8901',
        fipId: 'SBI-FIP', fipName: 'State Bank of India',
        summary: { type: 'EDUCATION_LOAN', description: 'Education Loan - MBA IIM Ahmedabad', originalLoanAmount: 800000, outstandingBalance: 350000, totalPaid: 576000, interestRate: 9.0, emiAmount: 12000, tenureMonths: 84, remainingTenureMonths: 30, disbursementDate: '2019-07-01', maturityDate: '2026-07-01', lender: 'SBI', currency: 'INR', status: 'ACTIVE' },
        transactions: [],
      },
    ],
    yearlyFinancials: [
      { year: 2020, income: 480000, expenses: 360000 },
      { year: 2021, income: 540000, expenses: 420000 },
      { year: 2022, income: 660000, expenses: 510000 },
      { year: 2023, income: 780000, expenses: 576000 },
      { year: 2024, income: 960000, expenses: 648000 },
    ],
  },
  {
    id: 'user-003',
    name: 'Amit Patel',
    dob: '1979-08-10',
    phone: '7654321098',
    email: 'amit.patel@email.com',
    pan: 'CDEPP9876H',
    address: '88, Ring Road, Ahmedabad, Gujarat 380001',
    accounts: [
      {
        fiType: 'DEPOSIT', subType: 'SAVINGS',
        label: 'Axis Savings Account', maskedAccNumber: 'XXXX3456',
        fipId: 'AXIS-FIP', fipName: 'Axis Bank',
        summary: { currentBalance: 1245000, type: 'SAVINGS', currency: 'INR', ifscCode: 'UTIB0001234', branch: 'CG Road Branch', status: 'ACTIVE', openingDate: '2012-01-10' },
        transactions: [
          { date: '2024-06-01', type: 'CREDIT', mode: 'NEFT', amount: 350000, narration: 'NEFT/SALARY/JUNE2024/TCS-LTD', balance: 1095000 },
          { date: '2024-06-03', type: 'DEBIT', mode: 'NEFT', amount: 45000, narration: 'NEFT/RENT/JUNE2024/PREMIUM-APT', balance: 1050000 },
          { date: '2024-06-05', type: 'DEBIT', mode: 'NACH', amount: 52000, narration: 'NACH/EMI/HOME-LOAN/HDFC-LTD', balance: 998000 },
          { date: '2024-06-07', type: 'DEBIT', mode: 'UPI', amount: 8500, narration: 'UPI/AMAZON/ORDER-AMZ-PRE-001', balance: 989500 },
          { date: '2024-06-08', type: 'DEBIT', mode: 'UPI', amount: 12000, narration: 'UPI/CLUB-MEMBERSHIP/ANNUAL', balance: 977500 },
          { date: '2024-06-10', type: 'DEBIT', mode: 'NACH', amount: 50000, narration: 'NACH/SIP/HDFC-FLEXICAP-DIRECT', balance: 927500 },
          { date: '2024-06-12', type: 'DEBIT', mode: 'UPI', amount: 15000, narration: 'UPI/FUEL/IOCL-PETROL-JUN', balance: 912500 },
          { date: '2024-06-14', type: 'DEBIT', mode: 'NEFT', amount: 25000, narration: 'NEFT/SCHOOL-FEES/DPS-Q2', balance: 887500 },
          { date: '2024-06-15', type: 'CREDIT', mode: 'NEFT', amount: 125000, narration: 'NEFT/RENTAL-INCOME/PROP-2', balance: 1012500 },
          { date: '2024-06-18', type: 'DEBIT', mode: 'UPI', amount: 4500, narration: 'UPI/ELECTRICITY/TORRENT-POWER', balance: 1008000 },
          { date: '2024-06-20', type: 'DEBIT', mode: 'ATM', amount: 50000, narration: 'ATM/CASH-WDL/AXIS-ATM-CGROAD', balance: 958000 },
          { date: '2024-06-25', type: 'CREDIT', mode: 'NEFT', amount: 250000, narration: 'NEFT/BONUS/TCS-ANNUAL-2024', balance: 1208000 },
          { date: '2024-06-28', type: 'DEBIT', mode: 'UPI', amount: 6500, narration: 'UPI/RESTAURANT/TAJ-VIVANTA', balance: 1201500 },
          { date: '2024-06-30', type: 'CREDIT', mode: 'INTERNAL', amount: 43500, narration: 'INT/SWEEP/SAVINGS-INTEREST-Q2', balance: 1245000 },
        ],
      },
      {
        fiType: 'DEPOSIT', subType: 'CURRENT',
        label: 'HDFC Current Account', maskedAccNumber: 'XXXX7890',
        fipId: 'HDFC-FIP', fipName: 'HDFC Bank',
        summary: { currentBalance: 850000, type: 'CURRENT', currency: 'INR', ifscCode: 'HDFC0005678', branch: 'SG Highway Branch', status: 'ACTIVE', openingDate: '2015-06-01' },
        transactions: [
          { date: '2024-06-05', type: 'CREDIT', mode: 'NEFT', amount: 450000, narration: 'NEFT/CONSULTANCY/CLIENT-ABC', balance: 750000 },
          { date: '2024-06-20', type: 'CREDIT', mode: 'NEFT', amount: 350000, narration: 'NEFT/CONSULTANCY/CLIENT-XYZ', balance: 1100000 },
          { date: '2024-06-25', type: 'DEBIT', mode: 'NEFT', amount: 250000, narration: 'NEFT/TRANSFER/TO-SAVINGS', balance: 850000 },
        ],
      },
      {
        fiType: 'TERM_DEPOSIT', subType: 'FD',
        label: 'SBI Fixed Deposit', maskedAccNumber: 'XXXX2345',
        fipId: 'SBI-FIP', fipName: 'State Bank of India',
        summary: { currentBalance: 2625000, principalAmount: 2500000, interestRate: 7.25, maturityDate: '2026-03-15', maturityAmount: 2862500, type: 'FD', currency: 'INR', status: 'ACTIVE', openingDate: '2024-03-15' },
        transactions: [
          { date: '2024-03-15', type: 'CREDIT', mode: 'NEFT', amount: 2500000, narration: 'FD/OPENING/PRINCIPAL', balance: 2500000 },
          { date: '2024-06-15', type: 'CREDIT', mode: 'INTERNAL', amount: 125000, narration: 'FD/INTEREST/QUARTERLY', balance: 2625000 },
        ],
      },
      {
        fiType: 'MUTUAL_FUNDS', subType: 'EQUITY',
        label: 'HDFC Flexi Cap Fund - Direct Growth', maskedAccNumber: 'FOLIO-3456',
        fipId: 'CAMS-FIP', fipName: 'CAMS',
        summary: { currentValue: 1850000, investedValue: 1500000, units: 8520.40, nav: 217.12, navDate: '2024-06-14', schemeName: 'HDFC Flexi Cap Fund - Direct Growth', amc: 'HDFC AMC', isin: 'INF179K01BB8', schemeCategory: 'Flexi Cap', type: 'EQUITY', currency: 'INR' },
        transactions: [
          { date: '2024-01-10', type: 'PURCHASE', amount: 50000, nav: 205.00, units: 243.90, narration: 'SIP/JAN2024' },
          { date: '2024-02-10', type: 'PURCHASE', amount: 50000, nav: 208.50, units: 239.81, narration: 'SIP/FEB2024' },
          { date: '2024-03-10', type: 'PURCHASE', amount: 50000, nav: 210.00, units: 238.10, narration: 'SIP/MAR2024' },
          { date: '2024-04-10', type: 'PURCHASE', amount: 50000, nav: 212.40, units: 235.40, narration: 'SIP/APR2024' },
          { date: '2024-05-10', type: 'PURCHASE', amount: 50000, nav: 215.00, units: 232.56, narration: 'SIP/MAY2024' },
          { date: '2024-06-10', type: 'PURCHASE', amount: 50000, nav: 217.12, units: 230.30, narration: 'SIP/JUN2024' },
        ],
      },
      {
        fiType: 'MUTUAL_FUNDS', subType: 'EQUITY',
        label: 'Parag Parikh Flexi Cap - Direct', maskedAccNumber: 'FOLIO-7654',
        fipId: 'KARVY-FIP', fipName: 'KFintech',
        summary: { currentValue: 980000, investedValue: 800000, units: 12500.50, nav: 78.40, navDate: '2024-06-14', schemeName: 'Parag Parikh Flexi Cap Fund - Direct Growth', amc: 'PPFAS AMC', isin: 'INF879O01019', schemeCategory: 'Flexi Cap', type: 'EQUITY', currency: 'INR' },
        transactions: [
          { date: '2024-01-05', type: 'PURCHASE', amount: 200000, nav: 72.00, units: 2777.78, narration: 'LUMPSUM/JAN2024' },
          { date: '2024-06-05', type: 'PURCHASE', amount: 200000, nav: 78.40, units: 2551.02, narration: 'LUMPSUM/JUN2024' },
        ],
      },
      {
        fiType: 'INSURANCE', subType: 'TERM',
        label: 'HDFC Life Term Plan', maskedAccNumber: 'POL-12345',
        fipId: 'HDFC-LIFE-FIP', fipName: 'HDFC Life Insurance',
        summary: { sumAssured: 15000000, premiumAmount: 18500, premiumFrequency: 'ANNUAL', policyStartDate: '2020-01-15', policyEndDate: '2050-01-15', coverAmount: 15000000, type: 'TERM', status: 'ACTIVE', currency: 'INR' },
        transactions: [{ date: '2024-01-15', type: 'DEBIT', mode: 'NACH', amount: 18500, narration: 'PREMIUM/ANNUAL/FY2024-25', balance: 0 }],
      },
      {
        fiType: 'NPS', subType: 'NPS',
        label: 'NPS Tier 1 Account', maskedAccNumber: 'PRAN-XXXX5432',
        fipId: 'NSDL-FIP', fipName: 'NSDL e-Gov',
        summary: { currentBalance: 1200000, totalContribution: 1050000, employerContribution: 420000, employeeContribution: 630000, totalReturns: 150000, type: 'NPS', currency: 'INR', status: 'ACTIVE' },
        transactions: [
          { date: '2024-04-01', type: 'CREDIT', mode: 'NEFT', amount: 50000, narration: 'NPS/EMPLOYER/APR2024', balance: 1150000 },
          { date: '2024-05-01', type: 'CREDIT', mode: 'NEFT', amount: 50000, narration: 'NPS/EMPLOYER/MAY2024', balance: 1200000 },
        ],
      },
      {
        fiType: 'LOAN', subType: 'HOME_LOAN',
        label: 'HDFC Home Loan', maskedAccNumber: 'HL-XXXX6789',
        fipId: 'HDFC-FIP', fipName: 'HDFC Bank',
        summary: { type: 'HOME_LOAN', description: 'Home Loan - 4BHK Villa SG Highway', originalLoanAmount: 8000000, outstandingBalance: 5200000, totalPaid: 5184000, interestRate: 8.2, emiAmount: 72000, tenureMonths: 240, remainingTenureMonths: 168, disbursementDate: '2018-01-10', maturityDate: '2038-01-10', lender: 'HDFC Ltd', currency: 'INR', status: 'ACTIVE' },
        transactions: [],
      },
      {
        fiType: 'LOAN', subType: 'CAR_LOAN',
        label: 'Axis Car Loan', maskedAccNumber: 'CL-XXXX2345',
        fipId: 'AXIS-FIP', fipName: 'Axis Bank',
        summary: { type: 'CAR_LOAN', description: 'Car Loan - Toyota Fortuner 2023', originalLoanAmount: 1200000, outstandingBalance: 900000, totalPaid: 396000, interestRate: 8.8, emiAmount: 22000, tenureMonths: 60, remainingTenureMonths: 42, disbursementDate: '2023-03-15', maturityDate: '2028-03-15', lender: 'Axis Bank', currency: 'INR', status: 'ACTIVE' },
        transactions: [],
      },
    ],
    yearlyFinancials: [
      { year: 2018, income: 2800000, expenses: 1800000 },
      { year: 2019, income: 3200000, expenses: 2000000 },
      { year: 2020, income: 3000000, expenses: 2200000 },
      { year: 2021, income: 3600000, expenses: 2400000 },
      { year: 2022, income: 4200000, expenses: 2800000 },
      { year: 2023, income: 4800000, expenses: 3200000 },
      { year: 2024, income: 5400000, expenses: 3600000 },
    ],
  },
];

// ============================================================================
// Spending Categorization
// ============================================================================

const SPENDING_CATEGORIES = [
  { key: 'housing', label: '🏠 Housing', icon: '🏠', color: '#6366f1', keywords: ['RENT', 'EMI', 'HOME-LOAN', 'HOUSING', 'MAINTENANCE'] },
  { key: 'food', label: '🍔 Food & Dining', icon: '🍔', color: '#f43f5e', keywords: ['SWIGGY', 'ZOMATO', 'RESTAURANT', 'BARBEQUE', 'FOOD', 'GROCERY', 'BIGBASKET', 'DMART', 'GROCERIES'] },
  { key: 'shopping', label: '🛒 Shopping', icon: '🛒', color: '#8b5cf6', keywords: ['AMAZON', 'FLIPKART', 'MYNTRA', 'SHOPPING', 'CLUB-MEMBERSHIP'] },
  { key: 'transport', label: '🚗 Transport', icon: '🚗', color: '#f59e0b', keywords: ['UBER', 'OLA', 'METRO', 'FUEL', 'PETROL', 'IOCL', 'HPCL', 'BPCL'] },
  { key: 'utilities', label: '⚡ Utilities', icon: '⚡', color: '#06b6d4', keywords: ['ELECTRICITY', 'WATER', 'GAS', 'RECHARGE', 'BESCOM', 'TORRENT', 'NETFLIX', 'SUBSCRIPTION', 'AIRTEL', 'JIO', 'POSTPAID', 'PREPAID'] },
  { key: 'investments', label: '📈 Investments', icon: '📈', color: '#10b981', keywords: ['SIP', 'MF', 'NACH/SIP', 'MUTUAL', 'NPS'] },
  { key: 'education', label: '🎓 Education', icon: '🎓', color: '#3b82f6', keywords: ['SCHOOL', 'COLLEGE', 'TUITION', 'FEES', 'COURSE'] },
  { key: 'cash', label: '💵 Cash', icon: '💵', color: '#64748b', keywords: ['ATM', 'CASH'] },
  { key: 'other', label: '📋 Other', icon: '📋', color: '#94a3b8', keywords: [] },
];

function categorizeTransaction(narration) {
  const upper = (narration || '').toUpperCase();
  for (const cat of SPENDING_CATEGORIES) {
    if (cat.key === 'other') continue;
    if (cat.keywords.some((kw) => upper.includes(kw))) return cat.key;
  }
  return 'other';
}

function getBucketLabel(fiType, subType) {
  if (fiType === 'LOAN') {
    const loanMap = { HOME_LOAN: 'Home Loan', CAR_LOAN: 'Car Loan', PERSONAL_LOAN: 'Personal Loan', EDUCATION_LOAN: 'Education Loan' };
    return loanMap[subType] || 'Loan';
  }
  const map = { DEPOSIT: subType === 'CURRENT' ? 'Current Account' : 'Savings', TERM_DEPOSIT: 'Fixed Deposits', RECURRING_DEPOSIT: 'Recurring Deposits', MUTUAL_FUNDS: 'Mutual Funds', SIP: 'SIP', PPF: 'PPF', NPS: 'NPS', INSURANCE: 'Insurance', EQUITIES: 'Equities' };
  return map[fiType] || fiType;
}

function buildDashboard(user) {
  let totalAssets = 0, totalLiabilities = 0;
  const allocation = {};
  const liabilities = [];
  let totalIncome = 0, totalExpenses = 0;
  const spendingMap = {};
  const allTransactions = [];
  const accountSummaries = [];

  for (const acc of user.accounts) {
    const isLoan = acc.fiType === 'LOAN';
    const isInsurance = acc.fiType === 'INSURANCE';

    if (isLoan) {
      const outstanding = acc.summary.outstandingBalance || 0;
      totalLiabilities += outstanding;
      const bucket = getBucketLabel(acc.fiType, acc.subType);
      liabilities.push({
        fiType: acc.fiType, subType: acc.subType, label: acc.label,
        maskedAccNumber: acc.maskedAccNumber, fipName: acc.fipName,
        outstanding, summary: acc.summary,
      });
      accountSummaries.push({
        fiType: acc.fiType, subType: acc.subType, label: acc.label,
        maskedAccNumber: acc.maskedAccNumber, fipName: acc.fipName,
        value: -outstanding, displayValue: outstanding,
        isInsurance: false, isLoan: true, summary: acc.summary,
      });
    } else {
      let value = acc.summary.currentValue !== undefined ? acc.summary.currentValue : (acc.summary.currentBalance !== undefined ? acc.summary.currentBalance : 0);
      const liquidValue = isInsurance ? 0 : value;
      totalAssets += liquidValue;

      const bucket = getBucketLabel(acc.fiType, acc.subType);
      allocation[bucket] = (allocation[bucket] || 0) + liquidValue;

      accountSummaries.push({
        fiType: acc.fiType, subType: acc.subType, label: acc.label,
        maskedAccNumber: acc.maskedAccNumber, fipName: acc.fipName,
        value: liquidValue, displayValue: isInsurance ? acc.summary.sumAssured : value,
        isInsurance, isLoan: false, summary: acc.summary,
      });

      if (acc.fiType === 'DEPOSIT' && acc.transactions) {
        for (const txn of acc.transactions) {
          allTransactions.push({ ...txn, accountLabel: acc.label });
          if (txn.type === 'CREDIT') totalIncome += txn.amount;
          else if (txn.type === 'DEBIT') {
            totalExpenses += txn.amount;
            const cat = categorizeTransaction(txn.narration);
            spendingMap[cat] = (spendingMap[cat] || 0) + txn.amount;
          }
        }
      }
    }
  }

  const netWorth = totalAssets - totalLiabilities;

  const allocationArr = Object.entries(allocation).map(([category, value]) => ({ category, value, percent: totalAssets > 0 ? (value / totalAssets) * 100 : 0 })).sort((a, b) => b.value - a.value);
  const spendingArr = Object.entries(spendingMap).map(([key, amount]) => {
    const cat = SPENDING_CATEGORIES.find((c) => c.key === key) || SPENDING_CATEGORIES[SPENDING_CATEGORIES.length - 1];
    return { key, label: cat.label, icon: cat.icon, color: cat.color, amount, percent: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0 };
  }).sort((a, b) => b.amount - a.amount);

  allTransactions.sort((a, b) => b.date.localeCompare(a.date));

  // Yearly financials
  const yearlyFinancials = (user.yearlyFinancials || []).map((y) => ({
    ...y, savings: y.income - y.expenses,
    savingsRate: y.income > 0 ? ((y.income - y.expenses) / y.income * 100) : 0,
  }));
  const lifetimeIncome = yearlyFinancials.reduce((s, y) => s + y.income, 0);
  const lifetimeExpenses = yearlyFinancials.reduce((s, y) => s + y.expenses, 0);

  return {
    user: { id: user.id, name: user.name, phone: user.phone, email: user.email, pan: user.pan },
    netWorth, totalAssets, totalLiabilities,
    totalIncome, totalExpenses,
    savingsRate: totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0,
    accountCount: user.accounts.length,
    assetAllocation: allocationArr, spending: spendingArr,
    liabilities,
    accounts: accountSummaries, recentTransactions: allTransactions.slice(0, 25),
    yearlyFinancials, lifetimeIncome, lifetimeExpenses,
    lifetimeSavings: lifetimeIncome - lifetimeExpenses,
  };
}

// ============================================================================
// API Endpoints
// ============================================================================

app.get('/api/users', (req, res) => {
  res.json(TEST_USERS.map((u) => ({
    id: u.id, name: u.name, phone: u.phone, email: u.email,
    initials: u.name.split(' ').map((w) => w[0]).join('').toUpperCase(),
    accountCount: u.accounts.length,
    fiTypes: [...new Set(u.accounts.map((a) => a.fiType))],
  })));
});

/**
 * GET /api/users/:id/fetch
 *
 * Full AA pipeline: JS objects → ReBIT XML → ECDH Encrypt → AA Response →
 *                   ECDH Decrypt → ReBIT XML → Parse → Dashboard
 *
 * This proves the round-trip is lossless. When connecting to a real AA,
 * you feed the real AA response into the same decrypt→parse pipeline.
 */
app.get('/api/users/:id/fetch', (req, res) => {
  const user = TEST_USERS.find((u) => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  try {
    // Step 1: Simulate AA fetch (generates encrypted AA response)
    const { aaResponse, fiuPrivateKey, fiuNonce, rawXmlByAccount } = aaBridge.simulateAAFetch(user);

    // Step 2: Decrypt and parse (same code that works with real AA data)
    const { parsedAccounts, decryptedXmls } = aaBridge.decryptAndParseAAResponse(
      aaResponse, fiuPrivateKey, fiuNonce
    );

    // Step 3: Rebuild account objects for dashboard (merge parsed data with FIP names)
    const enrichedAccounts = parsedAccounts.map((parsed) => {
      // Find the original account to get the label and fipName
      const original = user.accounts.find((a) => a.maskedAccNumber === parsed.maskedAccNumber);
      return {
        ...parsed,
        label: original?.label || parsed.summary?.schemeName || parsed.maskedAccNumber,
        fipName: original?.fipName || parsed.fipId || '',
      };
    });

    // Step 4: Build dashboard from parsed (not original!) data
    const dashUser = {
      ...user,
      accounts: enrichedAccounts.map((ea) => ({
        fiType: ea.fiType,
        subType: ea.subType,
        label: ea.label,
        maskedAccNumber: ea.maskedAccNumber,
        fipId: ea.fipId,
        fipName: ea.fipName,
        summary: ea.summary,
        transactions: ea.transactions || [],
      })),
    };
    const dashboard = buildDashboard(dashUser);

    // Include AA pipeline metadata so the frontend can show the raw data
    dashboard.aaPipeline = {
      encryptedAccountCount: aaResponse.FI.reduce((n, fi) => n + fi.data.length, 0),
      fipCount: aaResponse.FI.length,
      decryptedXmls: decryptedXmls.slice(0, 3), // First 3 for display
      aaResponsePreview: {
        ver: aaResponse.ver,
        txnid: aaResponse.txnid,
        fiCount: aaResponse.FI.length,
        fipIds: aaResponse.FI.map((fi) => fi.fipID),
      },
    };

    res.json(dashboard);
  } catch (err) {
    console.error('AA pipeline error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/users/:id/aa-response
 * Returns the raw AA response JSON (encrypted) for inspection.
 * This is exactly what a real Finvu/Onemoney AA would return.
 */
app.get('/api/users/:id/aa-response', (req, res) => {
  const user = TEST_USERS.find((u) => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  try {
    const { aaResponse, fiuKeyMaterial, rawXmlByAccount } = aaBridge.simulateAAFetch(user);
    res.json({ aaResponse, fiuKeyMaterial, rawXmlByAccount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/schema-info', (req, res) => {
  res.json({
    supportedFITypes: [
      { code: 'DEPOSIT', label: 'Deposit (Savings/Current)', schemaVersion: '2.0.0' },
      { code: 'TERM_DEPOSIT', label: 'Term Deposit (FD/RD)', schemaVersion: '2.0.0' },
      { code: 'MUTUAL_FUNDS', label: 'Mutual Funds', schemaVersion: '2.0.0' },
      { code: 'INSURANCE', label: 'Insurance Policies', schemaVersion: '2.0.0' },
      { code: 'NPS', label: 'National Pension System', schemaVersion: '1.0.0' },
      { code: 'PPF', label: 'Public Provident Fund', schemaVersion: '1.0.0' },
      { code: 'LOAN', label: 'Loans (Home/Car/Personal/Education)', schemaVersion: '2.0.0' },
    ],
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n╔══════════════════════════════════════════════════════════════╗`);
  console.log(`║     V Y N K  —  Financial Intelligence Dashboard            ║`);
  console.log(`║     Server running at http://localhost:${PORT}                   ║`);
  console.log(`║     Pipeline: XML → ECDH Encrypt → Decrypt → Parse → Render║`);
  console.log(`╚══════════════════════════════════════════════════════════════╝\n`);
});
