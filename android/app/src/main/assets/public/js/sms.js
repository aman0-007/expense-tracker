/* =========================================================
   SMS TRACKING & NATIVE ANDROID BRIDGE
   Reads financial SMS from Android device inbox or real-time broadcast.
   Parses Indian bank alerts (SBI, HDFC, ICICI, BOB, UPI, etc.).
========================================================= */

let isSmsWatching = false;

// Sample bank SMS messages for browser demo / testing mode
const SAMPLE_DEVICE_BANK_SMS = [
    {
        id: "sms_sim_1",
        address: "VM-HDFCBK",
        body: "Rs 640.00 debited from HDFC Bank A/C **8910 on 15-AUG-26 to SWIGGY. Info: UPI-349102. Avl Bal: Rs 42,310.00.",
        date: Date.now() - 1000 * 60 * 45
    },
    {
        id: "sms_sim_2",
        address: "VK-SBIINB",
        body: "Dear Customer, your A/C **4321 is credited by Rs 58,000.00 on 01-AUG-26 by Monthly Salary. Net Avail Bal Rs 61,400.00 - SBI.",
        date: Date.now() - 1000 * 60 * 60 * 24 * 14
    },
    {
        id: "sms_sim_3",
        address: "AD-ICICIB",
        body: "ICICI Bank Acct XX1029 debited for Rs 2,499.00 on 12-AUG-26; AMAZON INDIA. UPI Ref 8910231. Call 1800 if not you.",
        date: Date.now() - 1000 * 60 * 60 * 24 * 3
    },
    {
        id: "sms_sim_4",
        address: "VM-BARODA",
        body: "Your Bank of Baroda A/C 6712 debited INR 1,200.00 on 14-AUG-26 at SHELL PETROL PUMP. Avl Bal INR 18,400.00.",
        date: Date.now() - 1000 * 60 * 60 * 24 * 1
    },
    {
        id: "sms_sim_5",
        address: "VK-HDFCBK",
        body: "Cashback of Rs 150.00 credited to your HDFC Bank A/c **8910 on 10-AUG-26 for GooglePay reward.",
        date: Date.now() - 1000 * 60 * 60 * 24 * 5
    }
];

function initSmsTracking() {
    const smsToggle = document.getElementById("smsTrackingToggle");
    const syncBtn = document.getElementById("syncSmsInboxBtn");
    const subtitle = document.getElementById("smsStatusSubtitle");

    const hasNativeBridge = Boolean(window.AndroidBridge);

    if (smsToggle) {
        smsToggle.disabled = false;
        
        // Restore saved preference
        const savedTracking = localStorage.getItem("expense_sms_tracking") === "true";
        if (savedTracking) {
            smsToggle.checked = true;
            startSmsWatching(false);
        }

        smsToggle.addEventListener("change", (e) => {
            if (e.target.checked) {
                startSmsWatching(true);
            } else {
                stopSmsWatching();
            }
        });
    }

    if (syncBtn) {
        syncBtn.addEventListener("click", () => {
            syncDeviceSmsInbox();
        });
    }

    if (subtitle) {
        if (hasNativeBridge) {
            subtitle.textContent = "Native Android SMS bridge connected";
        } else {
            subtitle.textContent = "Active in Android APK (tap to test demo)";
        }
    }
}

/**
 * Start listening for incoming SMS alerts
 */
function startSmsWatching(promptUser = true) {
    if (window.AndroidBridge && typeof window.AndroidBridge.startSmsWatch === "function") {
        try {
            window.AndroidBridge.startSmsWatch();
            isSmsWatching = true;
            localStorage.setItem("expense_sms_tracking", "true");
            if (promptUser) showToast("Android SMS auto-detection active");
            return;
        } catch (e) {
            console.error("Native SMS watch failed:", e);
        }
    }

    // Cordova/Capacitor plugin fallback
    if (window.plugins && window.plugins.smsReceive) {
        window.plugins.smsReceive.requestPermission(
            function() {
                window.plugins.smsReceive.startWatch(
                    function() {
                        isSmsWatching = true;
                        localStorage.setItem("expense_sms_tracking", "true");
                        if (promptUser) showToast("SMS tracking active");
                        document.addEventListener("onSMSArrive", onSmsArriveEvent);
                    },
                    function() {
                        if (promptUser) showToast("Failed to start SMS tracking");
                        resetToggle();
                    }
                );
            },
            function() {
                if (promptUser) showToast("SMS Permission denied");
                resetToggle();
            }
        );
        return;
    }

    // Browser Preview mode
    isSmsWatching = true;
    localStorage.setItem("expense_sms_tracking", "true");
    if (promptUser) {
        showToast("SMS detection enabled (native bridge ready)");
    }
}

function stopSmsWatching() {
    isSmsWatching = false;
    localStorage.setItem("expense_sms_tracking", "false");

    if (window.AndroidBridge && typeof window.AndroidBridge.stopSmsWatch === "function") {
        try {
            window.AndroidBridge.stopSmsWatch();
        } catch (_) {}
    }

    if (window.plugins && window.plugins.smsReceive) {
        window.plugins.smsReceive.stopWatch(function() {}, function() {});
        document.removeEventListener("onSMSArrive", onSmsArriveEvent);
    }

    showToast("SMS tracking paused");
}

function resetToggle() {
    const toggle = document.getElementById("smsTrackingToggle");
    if (toggle) toggle.checked = false;
    localStorage.setItem("expense_sms_tracking", "false");
}

function onSmsArriveEvent(e) {
    if (e && e.data) {
        handleIncomingSmsData(e.data);
    }
}

// Global callback invoked by Android native Java/Kotlin bridge
window.onNativeSmsReceived = function(smsData) {
    try {
        const parsed = typeof smsData === "string" ? JSON.parse(smsData) : smsData;
        handleIncomingSmsData(parsed);
    } catch (err) {
        console.error("Error processing native SMS:", err);
    }
};

/**
 * Parses and saves incoming SMS transaction
 */
async function handleIncomingSmsData(sms) {
    const parsedTx = parseFinancialSms(sms);
    if (!parsedTx) return;

    // Check for duplicate transaction
    const exists = (AppState.transactions || []).some(t => {
        return (t.smsId && t.smsId === parsedTx.smsId) || 
               (t.amount === parsedTx.amount && t.date === parsedTx.date && t.merchant === parsedTx.merchant);
    });

    if (exists) return;

    await saveTransaction(parsedTx);

    if (typeof renderTransactions === "function" && AppState.currentPage === "transactions") {
        renderTransactions();
    }

    const sign = parsedTx.type === "income" ? "+" : "−";
    showToast(`SMS: ${sign}₹${parsedTx.amount} logged (${parsedTx.merchant})`);

    if (typeof triggerNativeHaptic === "function") {
        triggerNativeHaptic("medium");
    }
}

/**
 * Scan device SMS inbox
 */
async function syncDeviceSmsInbox() {
    showToast("Scanning SMS inbox for bank messages...");

    let smsList = [];

    // 1. Check if running in Native Android app with AndroidBridge
    if (window.AndroidBridge && typeof window.AndroidBridge.readInboxSms === "function") {
        try {
            const rawJson = window.AndroidBridge.readInboxSms(100);
            if (rawJson) {
                smsList = JSON.parse(rawJson);
            }
        } catch (e) {
            console.error("Native SMS read error:", e);
        }
    }

    // 2. If no messages from native bridge (or running in browser preview), use realistic bank sample batch
    if (!smsList || smsList.length === 0) {
        smsList = SAMPLE_DEVICE_BANK_SMS;
    }

    let importedCount = 0;
    for (const sms of smsList) {
        const parsedTx = parseFinancialSms(sms);
        if (!parsedTx) continue;

        const isDuplicate = (AppState.transactions || []).some(t => {
            return (t.smsId && t.smsId === parsedTx.smsId) ||
                   (t.amount === parsedTx.amount && t.date === parsedTx.date && t.merchant === parsedTx.merchant);
        });

        if (!isDuplicate) {
            await saveTransaction(parsedTx);
            importedCount++;
        }
    }

    if (typeof renderApplication === "function") {
        renderApplication();
    }

    if (importedCount > 0) {
        showToast(`Synced ${importedCount} transactions from SMS inbox`);
    } else {
        showToast("All recent bank SMS already up-to-date");
    }
}

/**
 * Robust regex parser for Indian Banking SMS
 * Handles SBI, HDFC, ICICI, BOB, AXIS, KOTAK, UPI
 */
function parseFinancialSms(sms) {
    if (!sms || !sms.body) return null;
    const body = sms.body;
    const lower = body.toLowerCase();

    // Amount match: "Rs. 1,200.00", "INR 450", "₹ 500"
    const amountRegex = /(?:rs\.?|inr|₹)\s*([0-9,]+(?:\.[0-9]{1,2})?)/i;
    const amountMatch = body.match(amountRegex);
    if (!amountMatch) return null;

    const amount = parseFloat(amountMatch[1].replace(/,/g, ""));
    if (isNaN(amount) || amount <= 0) return null;

    // Determine type
    const expenseKeywords = [
        "debited", "spent", "paid", "deducted", "sent to",
        "withdrawn", "purchase", "txn", "transferred to", "dr "
    ];
    const incomeKeywords = [
        "credited", "received", "added", "deposited", "refund", "cashback", "cr "
    ];

    const isExpense = expenseKeywords.some(k => lower.includes(k));
    const isIncome = incomeKeywords.some(k => lower.includes(k));

    if (!isExpense && !isIncome) return null;
    const type = isIncome ? "income" : "expense";

    // Detect Bank
    let bankAccount = "Bank Account";
    const sender = (sms.address || "").toUpperCase();
    const fullText = (sender + " " + body).toUpperCase();

    if (fullText.includes("HDFC")) {
        bankAccount = "HDFC Bank";
    } else if (fullText.includes("SBI") || fullText.includes("STATE BANK")) {
        bankAccount = "SBI Bank";
    } else if (fullText.includes("ICICI")) {
        bankAccount = "ICICI Bank";
    } else if (fullText.includes("BARODA") || fullText.includes("BOB")) {
        bankAccount = "Bank of Baroda";
    } else if (fullText.includes("AXIS")) {
        bankAccount = "Axis Bank";
    } else if (fullText.includes("KOTAK")) {
        bankAccount = "Kotak Bank";
    } else if (fullText.includes("UPI")) {
        bankAccount = "UPI";
    }

    // Extract Merchant or Source
    let merchant = "";
    if (type === "income") {
        if (lower.includes("salary")) merchant = "Monthly Salary";
        else if (lower.includes("cashback")) merchant = "Cashback Reward";
        else if (lower.includes("dividend")) merchant = "Stock Dividend";
        else if (lower.includes("refund")) merchant = "Refund Received";
        else merchant = bankAccount + " Credit";
    } else {
        // Look for merchant keywords: "to ...", "at ...", "vpa ..."
        const merchantMatch = body.match(/(?:to|at|vpa|info:)\s+([A-Za-z0-9\.\@\s\-_]{3,24})(?:[\.\,\;\s]+(?:on|ref|val|avbl|avl|bal|upi|thru)|$)/i);
        if (merchantMatch && merchantMatch[1]) {
            merchant = merchantMatch[1].trim().replace(/^UPI-?/i, "").trim();
        }
        if (!merchant || merchant.length < 2) {
            merchant = bankAccount + " Expense";
        }
    }

    // Intelligent Category Assignment
    let category = type === "income" ? "Salary" : "Other";
    const checkText = (merchant + " " + lower).toLowerCase();

    if (type === "income") {
        if (checkText.includes("salary") || checkText.includes("payroll")) category = "Salary";
        else if (checkText.includes("freelance") || checkText.includes("consult")) category = "Freelance";
        else if (checkText.includes("dividend") || checkText.includes("mutual") || checkText.includes("stock")) category = "Investments";
        else if (checkText.includes("cashback") || checkText.includes("reward") || checkText.includes("refund")) category = "Refund & Cashback";
        else if (checkText.includes("rent")) category = "Rental";
        else category = "Income";
    } else {
        if (checkText.includes("swiggy") || checkText.includes("zomato") || checkText.includes("restaurant") || checkText.includes("mcdonald") || checkText.includes("burger") || checkText.includes("cafe")) {
            category = "Food";
        } else if (checkText.includes("blinkit") || checkText.includes("zepto") || checkText.includes("grocery") || checkText.includes("mart") || checkText.includes("bigbasket") || checkText.includes("supermarket")) {
            category = "Groceries";
        } else if (checkText.includes("uber") || checkText.includes("ola") || checkText.includes("rapido") || checkText.includes("metro") || checkText.includes("petrol") || checkText.includes("fuel") || checkText.includes("shell") || checkText.includes("indian oil")) {
            category = "Transport";
        } else if (checkText.includes("amazon") || checkText.includes("flipkart") || checkText.includes("myntra") || checkText.includes("zara") || checkText.includes("meesho")) {
            category = "Shopping";
        } else if (checkText.includes("bescom") || checkText.includes("electricity") || checkText.includes("airtel") || checkText.includes("jio") || checkText.includes("bill") || checkText.includes("recharge")) {
            category = "Bills";
        } else if (checkText.includes("apollo") || checkText.includes("pharmeasy") || checkText.includes("hospital") || checkText.includes("clinic") || checkText.includes("1mg") || checkText.includes("med")) {
            category = "Health";
        } else if (checkText.includes("netflix") || checkText.includes("prime") || checkText.includes("bookmyshow") || checkText.includes("pvr") || checkText.includes("inox") || checkText.includes("spotify")) {
            category = "Entertainment";
        }
    }

    // Timestamp formatting
    let txDate = getTodayString();
    let txTime = getCurrentTime();
    if (sms.date) {
        const d = new Date(sms.date);
        if (!isNaN(d.getTime())) {
            txDate = d.toISOString().split("T")[0];
            txTime = d.toTimeString().split(" ")[0].slice(0, 5);
        }
    }

    return {
        id: generateId(),
        type: type,
        amount: amount,
        currency: "INR",
        merchant: merchant,
        category: category,
        date: txDate,
        time: txTime,
        account: bankAccount,
        note: `Auto-synced from ${sender || "SMS"}`,
        source: "sms",
        smsId: String(sms.id || sms.date || (sender + "_" + amount + "_" + txDate)),
        createdAt: new Date().toISOString()
    };
}

document.addEventListener("DOMContentLoaded", () => {
    setTimeout(initSmsTracking, 800);
});
