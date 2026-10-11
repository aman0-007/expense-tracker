// Test suite for payment notification parsing & 15-minute sliding deduplication engine
const assert = require("assert");
const fs = require("fs");
const vm = require("vm");

// Provide simulated browser environment for executing the exact js scripts
global.window = global;
global.document = {
    getElementById: () => ({ checked: true, textContent: "", classList: { add: () => {}, remove: () => {} }, addEventListener: () => {} }),
    addEventListener: () => {}
};
global.localStorage = {
    _data: {},
    getItem(k) { return this._data[k] || null; },
    setItem(k, v) { this._data[k] = String(v); }
};

// Evaluate the actual production js files
vm.runInThisContext(fs.readFileSync("./js/utils.js", "utf8"));
vm.runInThisContext(fs.readFileSync("./js/notifications.js", "utf8"));
vm.runInThisContext(fs.readFileSync("./js/sms.js", "utf8"));

console.log("--- STARTING NOTIFICATION & DEDUPLICATION TESTS ---");

// Test 1: Samsung Pay & Wallet Notification Parsing
const samsungSample1 = {
    packageName: "com.samsung.android.spay",
    title: "Samsung Pay",
    text: "Paid ₹189.00 to Reliance Retail via UPI",
    date: Date.parse("2026-09-12T14:28:00Z")
};
const parsed1 = parsePaymentNotification(samsungSample1);
assert(parsed1 !== null, "Samsung Pay Sample 1 must parse successfully");
assert.strictEqual(parsed1.amount, 189);
assert.strictEqual(parsed1.type, "expense");
assert.strictEqual(parsed1.merchant, "Reliance Retail");
assert.strictEqual(parsed1.account, "Samsung Pay");
assert.strictEqual(parsed1.category, "Shopping");
console.log("PASS: Samsung Pay Sample 1 (Reliance Retail) parsed correctly");

const samsungSample2 = {
    packageName: "com.samsung.android.raja.spay",
    title: "Samsung Wallet",
    text: "Transaction of ₹330.00 successful at GEETA CHAURASIYA",
    date: Date.parse("2026-06-28T19:38:00Z")
};
const parsed2 = parsePaymentNotification(samsungSample2);
assert(parsed2 !== null, "Samsung Pay Sample 2 must parse successfully");
assert.strictEqual(parsed2.amount, 330);
assert.strictEqual(parsed2.type, "expense");
assert.strictEqual(parsed2.merchant, "Geeta Chaurasiya");
console.log("PASS: Samsung Pay Sample 2 (Geeta Chaurasiya) parsed correctly");

const samsungSample3 = {
    packageName: "com.samsung.android.spay",
    title: "Card Charged",
    text: "Card ending with 3407 charged ₹490.00 at Indian Railways",
    date: Date.parse("2026-09-06T08:48:00Z")
};
const parsed3 = parsePaymentNotification(samsungSample3);
assert(parsed3 !== null, "Samsung Pay Sample 3 must parse successfully");
assert.strictEqual(parsed3.amount, 490);
assert.strictEqual(parsed3.type, "expense");
assert.strictEqual(parsed3.category, "Transport");
console.log("PASS: Samsung Pay Sample 3 (Indian Railways) parsed correctly");

const samsungIncomeSample = {
    packageName: "com.samsung.android.spay",
    title: "Credit Alert",
    text: "Received ₹37,300.00 from SELECT AI into account",
    date: Date.parse("2026-08-01T10:55:00Z")
};
const parsedIncome = parsePaymentNotification(samsungIncomeSample);
assert(parsedIncome !== null, "Income notification must parse successfully");
assert.strictEqual(parsedIncome.amount, 37300);
assert.strictEqual(parsedIncome.type, "income");
assert.strictEqual(parsedIncome.merchant, "Select Ai");
console.log("PASS: Income notification (SELECT AI) parsed correctly");

// Test 2: Strict rejection of negative / non-payment alerts
const promoNotif = {
    packageName: "com.samsung.android.spay",
    title: "Flat ₹500 Cashback",
    text: "Claim your reward now on your next recharge!",
    date: Date.now()
};
assert.strictEqual(parsePaymentNotification(promoNotif), null, "Promo notification must be rejected");

const otpNotif = {
    packageName: "com.samsung.android.spay",
    title: "OTP Verification",
    text: "Your OTP is 492019 for payment of ₹189. Do not share.",
    date: Date.now()
};
assert.strictEqual(parsePaymentNotification(otpNotif), null, "OTP notification must be rejected");

const billReminderNotif = {
    packageName: "com.phonepe.app",
    title: "Bill Reminder",
    text: "Your electricity bill of ₹1,200 is due in 3 days.",
    date: Date.now()
};
assert.strictEqual(parsePaymentNotification(billReminderNotif), null, "Bill reminder must be rejected");
console.log("PASS: Negative notifications correctly rejected");

// Test 3: Deduplication Matching Function
const txList = [
    {
        id: "tx_1",
        amount: 189,
        type: "expense",
        date: "2026-09-12",
        createdAt: "2026-09-12T14:28:00.000Z",
        source: "notification"
    }
];

// Check within 15 minutes (2 minutes later)
const candidateMatch = {
    id: "tx_2",
    amount: 189,
    type: "expense",
    date: "2026-09-12",
    createdAt: "2026-09-12T14:30:00.000Z",
    source: "sms"
};
const matched = findMatchingRecentTransaction(candidateMatch, txList);
assert(matched !== null, "Must match within 15 minutes with same amount & type");
assert.strictEqual(matched.id, "tx_1");
console.log("PASS: Deduplication match within 15-minute sliding window verified");

// Check outside 15 minutes (37 minutes later)
const candidateOutsideWindow = {
    id: "tx_3",
    amount: 189,
    type: "expense",
    date: "2026-09-12",
    createdAt: "2026-09-12T15:05:00.000Z",
    source: "sms"
};
const notMatched = findMatchingRecentTransaction(candidateOutsideWindow, txList);
assert.strictEqual(notMatched, null, "Must NOT match outside 15 minutes window");
console.log("PASS: Transactions > 15 minutes apart correctly treated as separate");

// Test 4: End-to-End Deduplication Scenarios
global.AppState = { transactions: [] };
global.saveTransaction = async function(t) {
    const idx = global.AppState.transactions.findIndex(item => item.id === t.id);
    if (idx >= 0) {
        global.AppState.transactions[idx] = t;
    } else {
        global.AppState.transactions.push(t);
    }
};

(async () => {
    // 1. Dual alert Scenario A: Notification arrives at T=0, SMS arrives at T=2min
    const notifResult = await handleIncomingNotificationData(samsungSample1);
    assert.strictEqual(notifResult.status, "saved");
    assert.strictEqual(global.AppState.transactions.length, 1);
    assert.strictEqual(global.AppState.transactions[0].source, "notification");
    assert.strictEqual(global.AppState.transactions[0].amount, 189);

    // Bank SMS arrives 2 minutes later for the same payment
    const sbiSms = {
        id: "sms_user_1",
        address: "VK-SBIINB",
        body: "Dear UPI user A/C X3407 debited by 189.00 on date 12Sep26 trf to Reliance Retail Refno 625515721424 If not u? call-1800111109 for other services-18001234-SBI",
        date: Date.parse("2026-09-12T14:30:00Z")
    };
    await handleIncomingSmsData(sbiSms);

    // Verify: Exactly 1 transaction total, updated with official bank details (SMS precedence)!
    assert.strictEqual(global.AppState.transactions.length, 1, "Must remain exactly 1 transaction, no duplicate!");
    assert.strictEqual(global.AppState.transactions[0].source, "sms");
    assert.strictEqual(global.AppState.transactions[0].account, "SBI X3407");
    assert.strictEqual(global.AppState.transactions[0].merchant, "Reliance Retail");
    console.log("PASS: Dual alert scenario A (Notification first -> SMS arrives) merged into single record with SMS precedence");

    // 2. Dual alert Scenario B: SMS arrives first at T=0, Notification arrives at T=30s
    const sbiSms2 = {
        id: "sms_user_2",
        address: "VK-SBIINB",
        body: "Dear UPI user A/C X3407 debited by 11.00 on date 02Sep26 trf to Jio Prepaid Rech Refno 624534435350 If not u? call-1800111109 for other services-18001234-SBI",
        date: Date.parse("2026-09-02T10:15:00Z")
    };
    await handleIncomingSmsData(sbiSms2);
    assert.strictEqual(global.AppState.transactions.length, 2);

    // Notification arrives 30 seconds later
    const notifDuplicate = {
        packageName: "com.samsung.android.spay",
        title: "Samsung Pay",
        text: "Paid ₹11.00 to Jio Prepaid Rech via UPI",
        date: Date.parse("2026-09-02T10:15:30Z")
    };
    const notifDupResult = await handleIncomingNotificationData(notifDuplicate);
    assert.strictEqual(notifDupResult.status, "duplicate_skipped", "Duplicate notification must be skipped");
    assert.strictEqual(global.AppState.transactions.length, 2, "Transaction count must remain 2!");
    console.log("PASS: Dual alert scenario B (SMS first -> Notification arrives) duplicate skipped cleanly");

    // 3. Scenario C: Two legitimate distinct payments with the exact same amount 45 mins apart
    const notifLater = {
        packageName: "com.samsung.android.spay",
        title: "Samsung Pay",
        text: "Paid ₹11.00 to Local Chai Stall via UPI",
        date: Date.parse("2026-09-02T11:00:00Z") // 45 minutes later (> 15-minute window)
    };
    const notifLaterResult = await handleIncomingNotificationData(notifLater);
    assert.strictEqual(notifLaterResult.status, "saved");
    assert.strictEqual(global.AppState.transactions.length, 3, "Legitimate transaction outside 15 mins must be recorded!");
    console.log("PASS: Same amount outside 15-minute window recorded legitimately as separate transaction");

    console.log("\nALL NOTIFICATION & DEDUPLICATION TESTS PASSED WITH 100% SUCCESS!");
})();
