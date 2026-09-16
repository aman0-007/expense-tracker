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
        
        // Restore saved preference (default to active if native bridge is available)
        const savedTracking = localStorage.getItem("expense_sms_tracking");
        const shouldTrack = savedTracking === null ? hasNativeBridge : savedTracking === "true";
        
        if (shouldTrack) {
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
            syncDeviceSmsInbox(false, false);
        });
    }

    if (subtitle) {
        if (hasNativeBridge) {
            subtitle.textContent = "Native Android SMS bridge connected";
        } else {
            subtitle.textContent = "Active in Android APK (tap to test demo)";
        }
    }

    // Auto-sync on app launch if permission is already granted
    if (hasNativeBridge && typeof window.AndroidBridge.hasSmsPermission === "function") {
        setTimeout(() => {
            try {
                if (window.AndroidBridge.hasSmsPermission()) {
                    syncDeviceSmsInbox(false, true /* silent auto-catchup */);
                }
            } catch (_) {}
        }, 1200);
    }

    // Auto-sync whenever user returns to the app (e.g. after making a payment in GPay/PhonePe)
    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible" && hasNativeBridge) {
            try {
                if (typeof window.AndroidBridge.hasSmsPermission === "function" && window.AndroidBridge.hasSmsPermission()) {
                    syncDeviceSmsInbox(false, true /* silent auto-catchup */);
                }
            } catch (_) {}
        }
    });
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

    // Record latest SMS timestamp checkpoint
    if (sms.date) {
        const currentCheck = parseInt(localStorage.getItem("expense_last_sms_sync_ts") || "0", 10);
        if (sms.date > currentCheck) {
            localStorage.setItem("expense_last_sms_sync_ts", String(sms.date));
        }
    }

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
 * Scan device SMS inbox (optimized with incremental sync)
 * @param {boolean} forceFullSync - Whether to re-scan all inbox messages regardless of timestamp
 * @param {boolean} isSilent - Whether to suppress toasts when no new messages are detected
 */
async function syncDeviceSmsInbox(forceFullSync = false, isSilent = false) {
    const isNative = Boolean(window.AndroidBridge);
    if (!isSilent) {
        showToast("Checking bank SMS for new transactions...");
    }

    let smsList = [];
    let lastSyncTs = 0;

    const hasExistingSmsTransactions = (AppState.transactions || []).some(t => t.source === "sms");
    if (!forceFullSync && hasExistingSmsTransactions) {
        lastSyncTs = parseInt(localStorage.getItem("expense_last_sms_sync_ts") || "0", 10);
    }

    // 1. Check if running in Native Android app with AndroidBridge
    if (isNative && typeof window.AndroidBridge.readInboxSms === "function") {
        try {
            if (typeof window.AndroidBridge.hasSmsPermission === "function" && !window.AndroidBridge.hasSmsPermission()) {
                if (!isSilent) {
                    showToast("SMS permission required. Please allow in the prompt...");
                }
                window.AndroidBridge.requestSmsPermission();
                return;
            }

            let rawJson;
            if (typeof window.AndroidBridge.readInboxSmsSince === "function") {
                rawJson = window.AndroidBridge.readInboxSmsSince(lastSyncTs, 250);
            } else {
                rawJson = window.AndroidBridge.readInboxSms(250);
            }

            if (rawJson === "PERMISSION_REQUESTED") {
                if (!isSilent) {
                    showToast("Please allow SMS access in the system dialog...");
                }
                return;
            }
            if (rawJson && rawJson.trim().startsWith("[")) {
                smsList = JSON.parse(rawJson);
            }
        } catch (e) {
            console.error("Native SMS read error:", e);
        }

        // On Native Android, if no messages found:
        if (!smsList || smsList.length === 0) {
            if (!isSilent) {
                showToast(lastSyncTs > 0 ? "Bank transactions are up-to-date." : "No SMS found in phone inbox.");
            }
            return;
        }
    } else {
        // Standalone browser preview demo fallback
        smsList = SAMPLE_DEVICE_BANK_SMS;
    }

    // Update timestamp checkpoint based on latest message received
    const maxTs = smsList.reduce((max, s) => Math.max(max, Number(s.date) || 0), 0);
    if (maxTs > 0) {
        localStorage.setItem("expense_last_sms_sync_ts", String(maxTs));
    }

    let importedCount = 0;
    const parsedValidList = [];

    for (const sms of smsList) {
        const parsedTx = parseFinancialSms(sms);
        if (parsedTx) {
            parsedValidList.push(parsedTx);
        }
    }

    if (parsedValidList.length === 0) {
        if (!isSilent) {
            showToast("No new bank alerts detected in recent SMS.");
        }
        return;
    }

    // Clean up pre-existing fake dummy data if this is a native Android sync
    if (isNative && window.clearDummyTransactions) {
        await window.clearDummyTransactions();
    }

    for (const parsedTx of parsedValidList) {
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
        showToast(`Synced ${importedCount} new transaction${importedCount > 1 ? "s" : ""} from bank SMS!`);
        if (window.triggerNativeHaptic) {
            window.triggerNativeHaptic("medium");
        }
    } else if (!isSilent) {
        showToast("All bank SMS transactions are already up-to-date.");
    }
}

/**
 * Android Permission Callback - called from MainActivity.java
 */
window.onSmsPermissionResult = function(granted) {
    if (granted) {
        showToast("Permission granted! Scanning SMS inbox now...");
        setTimeout(() => {
            syncDeviceSmsInbox();
        }, 300);
    } else {
        showToast("SMS permission denied. Enable in Phone Settings to auto-track.");
    }
};

/**
 * Android Real-time SMS Broadcast Callback - called from MainActivity.java
 */
window.onNativeSmsReceived = async function(sms) {
    if (!sms || !sms.body) return;
    try {
        const parsedTx = parseFinancialSms(sms);
        if (!parsedTx) return;

        // If this is the first real transaction and dummy transactions are present, clear dummy
        if (window.clearDummyTransactions) {
            const hasDummy = (AppState.transactions || []).some(t => t.source === "dummy" || (t.id && t.id.startsWith("dummy-")));
            if (hasDummy) {
                await window.clearDummyTransactions();
            }
        }

        const isDuplicate = (AppState.transactions || []).some(t => {
            return (t.smsId && t.smsId === parsedTx.smsId) ||
                   (t.amount === parsedTx.amount && t.date === parsedTx.date && t.merchant === parsedTx.merchant);
        });

        if (!isDuplicate) {
            await saveTransaction(parsedTx);
            if (typeof renderApplication === "function") {
                renderApplication();
            }
            showToast(`New ${parsedTx.type}: ₹${parsedTx.amount.toLocaleString("en-IN")} at ${parsedTx.merchant}`);
            if (window.triggerNativeHaptic) {
                window.triggerNativeHaptic("medium");
            }
        }
    } catch (e) {
        console.error("Failed to process real-time SMS:", e);
    }
};

/**
 * Robust regex parser for Indian Banking SMS
 * Handles SBI, HDFC, ICICI, BOB, AXIS, KOTAK, PNB, CANARA, UPI, PAYTM, PHONEPE, GPAY
 */
function parseFinancialSms(sms) {
    if (!sms || !sms.body) return null;
    const rawBody = sms.body;
    const lower = rawBody.toLowerCase();

    // 1. Filter out OTP, passwords, and non-transaction messages
    if (lower.includes("otp") || lower.includes("verification code") || lower.includes("do not share") || lower.includes("login password")) {
        return null;
    }

    // 2. Identify transaction type keywords
    const expenseKeywords = [
        "debited", "spent", "paid", "deducted", "sent to",
        "withdrawn", "purchase", "txn", "transferred to", "dr ", "dr.", "used at"
    ];
    const incomeKeywords = [
        "credited", "received", "added", "deposited", "refund", "cashback", "cr ", "cr."
    ];

    const isExpense = expenseKeywords.some(k => lower.includes(k));
    const isIncome = incomeKeywords.some(k => lower.includes(k));

    if (!isExpense && !isIncome) return null;
    const type = isIncome ? "income" : "expense";

    // 3. Remove available balance / limit clauses to prevent balance misidentification
    // e.g. "Avl Bal: Rs. 14,000", "Avail Bal Rs 5000", "Balance is Rs 1000", "Limit: Rs 50,000"
    const balancePattern = /(?:avl(?:\.|\s+)?bal(?:ance)?|avail(?:able)?\s+bal(?:ance)?|net\s+bal(?:ance)?|total\s+bal(?:ance)?|balance\s*is|bal:?|avl\s+lmt|avail\s+limit|bal\s+inr|bal\s+rs)\s*(?:is|:)?\s*(?:rs\.?|inr|₹)?\s*[0-9,]+(?:\.[0-9]{1,2})?/gi;
    const cleanedBody = rawBody.replace(balancePattern, " [BAL_STRIPPED] ");

    // 4. Extract Amount
    let amount = 0;
    // Match amount right next to financial verbs first (highest precision)
    let amountMatch = cleanedBody.match(/(?:debited|credited|spent|paid|withdrawn|sent|received|purchase|transferred|refund|cashback|deposited)\s+(?:for|by|of|with|amount of)?\s*(?:rs\.?|inr|₹)?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i);

    if (!amountMatch) {
        amountMatch = cleanedBody.match(/(?:rs\.?|inr|₹)\s*([0-9,]+(?:\.[0-9]{1,2})?)\s*(?:has been|is|was)?\s*(?:debited|credited|spent|paid|withdrawn|sent|received|transferred|deposited)?/i);
    }

    if (!amountMatch) {
        amountMatch = cleanedBody.match(/(?:rs\.?|inr|₹)\s*([0-9,]+(?:\.[0-9]{1,2})?)/i);
    }

    if (amountMatch && amountMatch[1]) {
        amount = parseFloat(amountMatch[1].replace(/,/g, ""));
    }

    if (isNaN(amount) || amount <= 0) return null;

    // 5. Detect Bank Name
    let bankAccount = "Bank Account";
    const sender = (sms.address || "").toUpperCase();
    const fullText = (sender + " " + rawBody).toUpperCase();

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
    } else if (fullText.includes("PNB") || fullText.includes("PUNJAB NATIONAL")) {
        bankAccount = "PNB Bank";
    } else if (fullText.includes("CANARA")) {
        bankAccount = "Canara Bank";
    } else if (fullText.includes("PAYTM")) {
        bankAccount = "Paytm Bank";
    } else if (fullText.includes("UPI")) {
        bankAccount = "UPI";
    }

    // 6. Extract Merchant or Source
    let merchant = "";
    if (type === "income") {
        if (lower.includes("salary")) merchant = "Monthly Salary";
        else if (lower.includes("cashback")) merchant = "Cashback Reward";
        else if (lower.includes("dividend")) merchant = "Stock Dividend";
        else if (lower.includes("refund")) merchant = "Refund Received";
        else merchant = bankAccount + " Credit";
    } else {
        // Match merchant names after "to", "at", "vpa", "info:", "towards"
        const merchantMatch = rawBody.match(/(?:to|at|vpa|info:|towards)\s+([A-Za-z0-9\.\@\s\-_]{2,30})(?:[\.\,\;\s]+(?:on|ref|val|avbl|avl|bal|upi|thru)|$)/i);
        if (merchantMatch && merchantMatch[1]) {
            merchant = merchantMatch[1].trim().replace(/^UPI-?/i, "").trim();
        }
        if (!merchant || merchant.length < 2) {
            merchant = bankAccount + " Expense";
        }
    }

    // 7. Intelligent Category Assignment
    let category = type === "income" ? "Salary" : "Other";
    const checkText = (merchant + " " + lower).toLowerCase();

    if (type === "income") {
        if (checkText.includes("salary") || checkText.includes("payroll")) category = "Salary";
        else if (checkText.includes("freelance") || checkText.includes("consult")) category = "Freelance";
        else if (checkText.includes("dividend") || checkText.includes("mutual") || checkText.includes("stock") || checkText.includes("groww") || checkText.includes("zerodha")) category = "Investments";
        else if (checkText.includes("cashback") || checkText.includes("reward") || checkText.includes("refund")) category = "Refund & Cashback";
        else if (checkText.includes("rent")) category = "Rental";
        else category = "Income";
    } else {
        if (checkText.includes("swiggy") || checkText.includes("zomato") || checkText.includes("restaurant") || checkText.includes("mcdonald") || checkText.includes("burger") || checkText.includes("cafe") || checkText.includes("starbucks") || checkText.includes("domino") || checkText.includes("chai")) {
            category = "Food";
        } else if (checkText.includes("blinkit") || checkText.includes("zepto") || checkText.includes("grocery") || checkText.includes("mart") || checkText.includes("bigbasket") || checkText.includes("supermarket") || checkText.includes("dmart") || checkText.includes("reliance fresh")) {
            category = "Groceries";
        } else if (checkText.includes("uber") || checkText.includes("ola") || checkText.includes("rapido") || checkText.includes("metro") || checkText.includes("petrol") || checkText.includes("fuel") || checkText.includes("shell") || checkText.includes("indian oil") || checkText.includes("hpcl") || checkText.includes("bpcl")) {
            category = "Transport";
        } else if (checkText.includes("amazon") || checkText.includes("flipkart") || checkText.includes("myntra") || checkText.includes("zara") || checkText.includes("meesho") || checkText.includes("ajio")) {
            category = "Shopping";
        } else if (checkText.includes("bescom") || checkText.includes("electricity") || checkText.includes("airtel") || checkText.includes("jio") || checkText.includes("bill") || checkText.includes("recharge") || checkText.includes("vi") || checkText.includes("gas") || checkText.includes("water")) {
            category = "Bills";
        } else if (checkText.includes("apollo") || checkText.includes("pharmeasy") || checkText.includes("hospital") || checkText.includes("clinic") || checkText.includes("1mg") || checkText.includes("med") || checkText.includes("doctor")) {
            category = "Health";
        } else if (checkText.includes("netflix") || checkText.includes("prime") || checkText.includes("bookmyshow") || checkText.includes("pvr") || checkText.includes("inox") || checkText.includes("spotify") || checkText.includes("hotstar") || checkText.includes("cinema")) {
            category = "Entertainment";
        }
    }

    // 8. Timestamp formatting
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
        note: `Synced from ${bankAccount} SMS`,
        source: "sms",
        smsId: String(sms.id || (sender + "_" + amount + "_" + txDate)),
        createdAt: new Date().toISOString()
    };
}

document.addEventListener("DOMContentLoaded", () => {
    setTimeout(initSmsTracking, 800);
});
