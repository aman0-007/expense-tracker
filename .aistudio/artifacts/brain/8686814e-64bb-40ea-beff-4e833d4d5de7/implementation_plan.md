# Payment App Notification Listener & Smart SMS Deduplication

Enable automatic transaction capture from Samsung Pay and UPI app notifications alongside bank SMS, with an intelligent 15-minute sliding window deduplication engine that prevents double-counting when both alerts arrive for the same payment.

### User Review & Critical Decisions

> [!IMPORTANT]
> The deduplication rules and payment app scope have been tailored based on your answers:
> - **Monitored App**: Samsung Pay / Samsung Wallet (with support for major UPI companion alerts).
> - **Deduplication Rule**: Identical amount and transaction type within a 15-minute sliding window.
> - **Source Priority**: Bank SMS takes primary priority for official balance and account details; instant app notifications act as an immediate fallback when SMS is not received or delayed.

- **Confirmed Decision 1 (Monitored App)**: Support Samsung Pay notifications as the primary app notification target, alongside standard UPI notifications.
- **Confirmed Decision 2 (Deduplication Window)**: 15-minute time window for matching transactions with the same amount and transaction type (`expense` or `income`).
- **Confirmed Decision 3 (Conflict Resolution)**: When both arrive, SMS takes precedence. If the app notification arrived first, it is seamlessly enriched or superseded by the bank SMS to avoid duplicates.

---

### 1. Overview & Core Concept

- **What It Does**:
  - Listens for Android push notifications from Samsung Pay (and companion UPI apps).
  - Immediately parses transaction details (Amount, Merchant / Payee, Date & Time).
  - Checks if a corresponding SMS or notification transaction was already recorded within the last 15 minutes.
  - If no duplicate exists, it creates a new transaction immediately.
  - If an SMS arrives later for the same payment, it links and updates the existing notification record with official bank account data without creating a duplicate.
  - If an SMS arrives first, any subsequent notification for that transaction is ignored.
- **Target Audience / Persona**: Users in India who frequently pay using Samsung Pay (NFC card swipe or UPI) where bank SMS alerts are occasionally delayed, omitted, or redundant with push notifications.
- **Key Value**: 100% transaction coverage without duplicate entries or manual reconciliation.

---

### 2. User Experience & Visual Design

- **Key User Flows**:
  1. **Notification Access Enablement**: In the Settings screen under "Automatic Tracking", a new toggle appears: **"Samsung Pay & App Notifications"**. Tapping it checks Android `NotificationListenerService` permission and prompts the user with a clean native explanation modal leading to Android's Notification Access settings.
  2. **Instant Capture Flow**: User completes a payment on Samsung Pay -> Phone receives Samsung Pay notification -> Expense tracker instantly logs ₹Amount and Merchant -> Shows subtle confirmation toast: *"Recorded ₹X via Samsung Pay"*.
  3. **Dual Alert Flow (SMS + Notification)**:
     - Scenario A (Notification first, then SMS 2 minutes later): Notification logs transaction with badge `Samsung Pay`. When bank SMS arrives, transaction is upgraded to verified bank status with account info (`SBI X3407`), keeping single unified entry.
     - Scenario B (SMS arrives first): SMS logs transaction. When notification arrives moments later, the deduplication engine recognises the matching amount and timestamp within 15 minutes and silently suppresses the duplicate.
  4. **Browser Preview Simulator**: On the web preview, a "Simulate Notification" button in test tools lets you fire sample Samsung Pay notifications to test parsing and deduplication in real time.
- **Visual Identity & Theme**:
  - Follows the existing clean, dark-mode/light-mode UI with no clutter or pills.
  - Transaction item displays the origin icon / label (e.g., bank logo if verified via SMS, or Samsung Pay indicator if purely from notification).
- **Interactive Feedback & Motion**:
  - Smooth toast confirmation upon notification parsing.
  - Clear permission status indicator in Settings showing whether Notification Access is active or requires permission.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Android NotificationListenerService vs Accessibility Service**:
  - *Chosen Approach*: Android `NotificationListenerService`.
  - *Why*: It is the official, battery-efficient, secure Android API specifically designed for reading status bar notifications. It does not require invasive Accessibility privileges and operates reliably in the background.
  - *Trade-Off*: Requires the user to grant "Notification Access" once in Android system settings.
- **Decision 2: 15-Minute Sliding Deduplication Matching Key**:
  - *Chosen Approach*: Match by `(amount, type)` within a `|timestamp_A - timestamp_B| <= 15 minutes` window, plus fuzzy merchant similarity when available.
  - *Why*: Bank SMS and push notifications often format merchant names differently (e.g., Samsung Pay says *"Paid to Reliance Retail"*, while SMS says *"trf to Reliance Retail Refno..."*). Matching by amount and 15-minute timeframe avoids edge cases where merchant strings differ slightly.
- **Decision 3: In-Memory / IndexedDB Deduplication Registry**:
  - *Chosen Approach*: Store a sliding lookup window of recent incoming transaction signatures (`last_recorded_events`) in IndexedDB and runtime state.
  - *Why*: Ensures deduplication persists even if the app process restarts between the notification and the SMS.

---

### 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────┐
│                   Android Native Layer                 │
│                                                        │
│  ┌─────────────────────────┐  ┌─────────────────────┐ │
│  │   SmsReceiver (SMS)     │  │ NotificationListener│ │
│  │ (TELEPHONY_SMS_RECEIVED)│  │ (Samsung Pay Alert) │ │
│  └────────────┬────────────┘  └──────────┬──────────┘ │
│               │                          │            │
│               └───────────┬──────────────┘            │
│                           ▼                           │
│              MainActivity (Android Bridge)             │
│            dispatchIncomingNotification(...)          │
└───────────────────────────┬────────────────────────────┘
                            │ evaluateJavascript
                            ▼
┌────────────────────────────────────────────────────────┐
│                    Web & UI Layer                      │
│                                                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │     Notification & SMS Deduplication Engine      │  │
│  │   - 15-min Sliding Window Buffer                 │  │
│  │   - SMS Precedence & Merge Logic                 │  │
│  │   - Regex Parsers for Samsung Pay & UPI Alerts   │  │
│  └────────────────────────┬─────────────────────────┘  │
│                           ▼                            │
│  ┌──────────────────────────────────────────────────┐  │
│  │            IndexedDB Transaction Store           │  │
│  │             Unified Single Transaction           │  │
│  └──────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────┘
```

- **Notification Regex Patterns Supported**:
  - Samsung Pay / Samsung Wallet:
    - `Paid ₹189.00 to Reliance Retail`
    - `Transaction of ₹330.00 successful at Geeta Chaurasiya`
    - `₹226.00 debited for Nimai Das Agency via Samsung Wallet`
    - `Card ending with XXXX charged ₹490.00`
  - Companion UPI push formats (GPay, PhonePe, Paytm).
- **Deduplication Logic Flow**:
  1. Receive event `E` with `{ amount, type, timestamp, merchant, source: 'sms' | 'notification' }`.
  2. Search existing transactions in last 15 minutes (`Math.abs(t.timestamp - E.timestamp) <= 15 * 60 * 1000`) where `t.amount === E.amount` and `t.type === E.type`.
  3. If match found:
     - If `E.source === 'sms'` and `existing.source === 'notification'`: Upgrade `existing` transaction with SMS bank details, keep merchant if cleaner, set `source = 'sms_verified'`, no new row added.
     - If `E.source === 'notification'` and `existing.source === 'sms'`: Silently skip, duplicate detected.
  4. If no match found:
     - Insert `E` as a new transaction and add to recent signatures buffer.
