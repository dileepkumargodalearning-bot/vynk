# Vynk v2 — Modern Redesign + Login + Multi-Screen Navigation

Vynk v2 introduces a state-of-the-art, minimalist user interface with secure OTP logins, simplified tile-based summaries on the home screen, and comprehensive drill-down detail views. The old v1 interface remains fully accessible.

---

## 🌐 URLs & Access

- **Vynk v2 (New Redesign)**:
  - Local: `http://localhost:3000/`
  - Live: `https://vynk-xi.vercel.app/`
  - Public Tunnel: [vynk.loca.lt](https://vynk.loca.lt/)

- **Vynk v1 (Classic Dashboard)**:
  - Local: `http://localhost:3000/v1/`
  - Live: `https://vynk-xi.vercel.app/v1/`
  - Public Tunnel: [vynk.loca.lt/v1/](https://vynk.loca.lt/v1/)

---

## 🔑 Demo Login Credentials

The platform validates mobile numbers and OTP codes statically against the three test users:

| User | Mobile Number (User ID) | Static OTP |
|------|------------------------|------------|
| **Rajesh Kumar** | `9876543210` | `123456` |
| **Priya Sharma** | `8765432109` | `234567` |
| **Amit Patel** | `7654321098` | `345678` |

---

## 🎨 Design System & Layout Highlights

- **Frosted Glassmorphism**: Cards and overlay screens utilize deep blurred backdrops (`backdrop-filter: blur(20px)`) over a deep space background gradient.
- **Home Summary Screen**: Displays the user's Total Net Worth (with interactive breakdown of Financial vs. Physical Assets and Outstanding Loans) and a grid of **7 minimalist summary tiles**.
- **Drill-down Navigation**: Clicking any card smoothly slides into a dedicated fullscreen panel with detailed charts, data tables, and token parameters. A **Back button** returns the user to the home screen.
- **Header Actions**: Includes a greeting bar and a custom **Logout** toggle.

---

## 🔗 Global Tokenization Rules Applied

Every verified asset is tokenized under global standards with complete parameter details visible on their respective cards:
1. **Real Estate** (`ERC-3643` Security Token): Total supply of 10,000 fractional tokens representing "sq.ft equivalents". Mandates KYC validation and falls under RERA/SEBI jurisdiction with a 12-month lock-in.
2. **Gold & Jewellery** (`ERC-20` Fungible Utility): Total supply of 1,000 fractional tokens representing "grams equivalents". Exempt from lock-in periods under BIS/Hallmark jurisdiction.
3. **Luxury Watches** (`ERC-1155` Semi-fungible): Total supply of 100 fractional share tokens. Requires KYC under BIS/Hallmark jurisdiction with a 6-month lock-in.
4. **Vehicles** (`ERC-721` Non-Fungible Token): Non-divisible single NFT. Requires KYC under RTO/MoRTH jurisdiction.
5. **Art & Collectibles** (`ERC-3643` Security Token): Total supply of 500 fractional ownership shares. Requires KYC under SEBI/RBI jurisdiction with a 24-month lock-in.
6. **Electronics** (`ERC-721` Non-Fungible Token): Non-divisible single consumer NFT.

---

## 🛠️ Verification & Test Scenarios

1. **OTP Login Flow**:
   - Navigate to [Vynk UAT](https://vynk.loca.lt/)
   - Enter `9876543210` and click "Send OTP"
   - Type in the digits `1`, `2`, `3`, `4`, `5`, `6` to login.
2. **Examine Summaries**:
   - Check that Net Worth matches `Total Assets - Liabilities`.
3. **Drill Down to Details**:
   - Click the "Asset Intelligence" tile to view categorized real estate, gold, watches, and paintings. Note the token valuation breakdown (e.g., standard, divisibility, lock-in months, metadata hash).
4. **Verify Receipt**:
   - In the Asset Intelligence detail page, upload a sample receipt to watch items instantly get verified and assigned standard Token IDs.
