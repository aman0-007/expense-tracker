# Expense Tracker

A modern, privacy-first personal finance and budget management application designed for Web and Android. Features automatic financial SMS transaction detection, intelligent category categorization, monthly budget analytics, and high-performance offline persistence.

---

## Highlights & Features

- **Automatic Financial SMS Detection (Android & Web)**
  - Real-time background and inbox synchronization for Indian banking and financial SMS messages.
  - Supports major banks (SBI, HDFC, ICICI, Axis Bank, Kotak Mahindra, PNB, Bank of Baroda, etc.) and UPI services (Google Pay, PhonePe, Paytm).
  - Dedicated **Investments** recognition for platforms like Angel One, Zerodha, Groww, Upstox, and mutual fund AMC SIP debits and stock dividends.
  - Intelligent filtering ignores OTPs, promotional alerts, login codes, reminders, and pending mandates—capturing only confirmed, executed debits and credits.

- **Strict Zero-Data-Leakage Privacy Architecture**
  - **No Raw SMS Storage**: Raw SMS message text is processed in-memory on your device and immediately discarded.
  - Only extracted financial metadata (amount, merchant, date, account, and category) is stored.
  - Complete offline autonomy: no financial or personal data is uploaded to remote servers.

- **Smart Budget & Spending Analytics**
  - Monthly budget tracking with progress indicators and dynamic remaining balance calculations.
  - Interactive visual category breakdowns and historical spending charts.
  - Quick-filter views by month, category, and payment account (Cash, Bank Account, Credit Card, UPI, Demat).

- **Performance-Optimized for Large Inboxes**
  - Native Android database-level indexed querying (`date > ?`) limits initial syncing to recent active transactions, eliminating freezes.
  - Time-sliced asynchronous batch processing preserves smooth 60–120 FPS animations even when scanning thousands of messages.
  - Single-pass atomic database batch writes via IndexedDB for immediate page loads.

- **Refined Design & Micro-Interactions**
  - Built with a warm, high-contrast palette: Terracotta (`#E07A5F`) interactive accents, Sage Green (`#3E8E68`) income indicators, and clean typography.
  - Complete Dark and Light theme support with seamless transition animations.
  - Native bottom-sheet transaction modal with tactile press feedback and keyboard-safe inputs.

---

## Project Structure

```
├── index.html                  # Single-page application entry point & semantic markup
├── manifest.json               # Progressive Web App (PWA) manifest
├── metadata.json               # Application metadata and runtime permissions
├── css/
│   ├── base.css                # Typography, global CSS variables & color tokens
│   ├── components.css          # Cards, buttons, inputs, pills, toasts & modal sheets
│   ├── navigation.css          # Bottom navigation bar & tab controllers
│   ├── pages.css               # Overview, Analytics, Transactions & Settings views
│   └── responsive.css          # Mobile-first and desktop media queries
├── js/
│   ├── app.js                  # Application state coordination & event lifecycle
│   ├── db.js                   # IndexedDB storage layer with batched write support
│   ├── transactions.js         # Transaction CRUD, sorting, and balance calculations
│   ├── categories.js           # Default & custom category definitions and budgets
│   ├── sms.js                  # SMS parsing engine, regex filters & native bridge
│   ├── ui.js                   # DOM rendering, modal controllers & navigation transitions
│   ├── charts.js               # Visual spending charts & category analytics
│   ├── utils.js                # Currency formatting (INR), date helpers & sanitizers
│   └── dummy-data.js           # Sample initial data for first-time preview exploration
├── assets/
│   ├── icon.svg                # Master clean vector app icon (Terracotta & Sage)
│   ├── icon-512.png            # High-resolution app icon (512x512)
│   ├── icon-192.png            # PWA standard icon (192x192)
│   └── apple-touch-icon.png    # iOS web clip icon (180x180)
├── scripts/
│   └── generate-icons.js       # Sharp-based icon generation script for Web & Android
└── android/                    # Native Android wrapper project with SMS bridge
    └── app/src/main/
        ├── AndroidManifest.xml # SMS permissions and intent filters
        ├── java/.../MainActivity.java # Native WebView bridge & SMS query service
        └── assets/public/      # Bundled web assets for offline native execution
```

---

## Getting Started

### Prerequisites
- Node.js (version 18 or newer)
- npm or bun

### Local Web Development
1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the local development server:
   ```bash
   npm run dev
   ```
3. Open your browser at `http://localhost:3000`.

### Production Build & Android Sync
- Build production web assets into the `dist/` directory:
  ```bash
  npm run build
  ```
- Sync the latest web assets into the Android native project:
  ```bash
  npm run sync:android
  ```
- Regenerate icons across all Android mipmap resolutions and Web assets:
  ```bash
  node scripts/generate-icons.js
  ```

---

## Technology Stack

- **Frontend**: Vanilla JavaScript (ES6+ Modules), HTML5, CSS3 Variables
- **Local Storage**: IndexedDB with Promise-based wrapper and transactional batching
- **Mobile Engine**: Android WebView Bridge with `RECEIVE_SMS` and `READ_SMS` runtime handlers
- **Icon Rendering**: Vector SVG with Sharp PNG rasterization for all Android mipmap buckets

---

## License

This project is private and licensed under the MIT License.
