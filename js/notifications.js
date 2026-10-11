/* =========================================================
   PAYMENT APP NOTIFICATIONS & DEDUPLICATION ENGINE
   Captures real-time push notifications from Samsung Pay,
   Google Pay, PhonePe, Paytm, and bank apps via Android bridge.
   Features a 15-minute sliding window deduplication engine
   with SMS precedence to prevent double-counting.
========================================================= */

const DEDUPLICATION_WINDOW_MS = 15 * 60 * 1000; // 15-minute matching window

// Known payment app packages and labels
const PAYMENT_APP_MAP = {
    "com.samsung.android.spay": "Samsung Pay",
    "com.samsung.android.raja.spay": "Samsung Pay",
    "com.samsung.android.app.spay": "Samsung Wallet",
    "com.google.android.apps.nbu.paisa.user": "Google Pay",
    "com.phonepe.app": "PhonePe",
    "net.one97.paytm": "Paytm",
    "com.dreamplug.androidapp": "CRED",
    "in.org.npci.upiapp": "BHIM",
    "com.axis.mobile": "Axis Mobile",
    "com.msf.kbank.mobile": "Kotak Bank",
    "com.csam.icici.bank.imobile": "iMobile Pay",
    "com.snapwork.hdfc": "HDFC MobileBanking",
    "com.sbi.lotusintouch": "SBI YONO"
};

/**
 * Checks if a candidate transaction matches an existing transaction
 * within the 15-minute sliding window with identical amount and transaction type.
 * @param {Object} candidate - { amount, type, date, ... }
 * @param {Array} [transactionsList] - list of transactions to check against
 * @returns {Object|null} Matching existing transaction or null
 */
function findMatchingRecentTransaction(candidate, transactionsList) {
    if (!candidate || candidate.amount === undefined || candidate.amount === null || !candidate.type) {
        return null;
    }

    const candidateTime = new Date(candidate.createdAt || candidate.date).getTime();
    if (isNaN(candidateTime)) return null;

    const list = transactionsList || (window.AppState ? window.AppState.transactions : []) || [];
    const candAmount = Number(candidate.amount);

    for (const existing of list) {
        if (!existing || existing.id === candidate.id) continue;
        if (existing.type !== candidate.type) continue;

        // Exact amount matching (allowing <= 0.01 difference for float rounding)
        if (Math.abs(Number(existing.amount) - candAmount) > 0.01) continue;

        const existingTime = new Date(existing.createdAt || existing.date).getTime();
        if (isNaN(existingTime)) continue;

        const timeDiff = Math.abs(candidateTime - existingTime);
        if (timeDiff <= DEDUPLICATION_WINDOW_MS) {
            return existing;
        }
    }
    return null;
}

/**
 * Categorize merchant into budget category
 */
function categorizeNotificationMerchant(merchantName, text) {
    const combined = `${merchantName || ""} ${text || ""}`.toLowerCase();

    if (/recharge|jio|airtel|\bvi\b|vodafone|bsnl|electricity|bescom|tneb|gas|water|broadband|wifi|\bbill\b/i.test(combined)) {
        return "Bills";
    }
    if (/swiggy|zomato|eats|food|restaurant|cafe|coffee|starbucks|mcdonald|burger|pizza|tea|chai|dhaba|baker|geeta chaurasiya/i.test(combined)) {
        return "Food";
    }
    if (/uber|ola|rapido|metro|railways|irctc|fuel|petrol|hpcl|bpcl|iocl|shell|auto|cab|bus|flight|indigo/i.test(combined)) {
        return "Transport";
    }
    if (/amazon|flipkart|myntra|reliance|retail|dmart|blinkit|zepto|instamart|store|mart|supermarket|bazaar/i.test(combined)) {
        return "Shopping";
    }
    if (/netflix|spotify|prime|hotstar|bookmyshow|cinema|pvr|inox|movie|theatre/i.test(combined)) {
        return "Entertainment";
    }
    if (/hospital|clinic|pharma|apollo|1mg|pharmacy|medplus|doctor|health/i.test(combined)) {
        return "Health";
    }
    if (/atm|withdrawn|cash/i.test(combined)) {
        return "Cash";
    }
    if (/zerodha|groww|upstox|angel|invest|mutual|sip|demat|stock/i.test(combined)) {
        return "Investments";
    }
    return "General";
}

/**
 * Parses notification payload from Samsung Pay, GPay, PhonePe, Paytm, or banks.
 * @param {Object} rawNotification - { packageName, title, text, date }
 * @returns {Object|null} Parsed transaction object or null if not a payment
 */
function parsePaymentNotification(rawNotification) {
    if (!rawNotification) return null;

    const title = (rawNotification.title || "").trim();
    const text = (rawNotification.text || "").trim();
    const pkg = (rawNotification.packageName || "").trim();
    const combined = `${title} ${text}`.trim();

    if (!combined) return null;

    // Strict Negative Filters: Promotional, OTP, Reminders, AutoPay schedules
    const negativePatterns = [
        /\botp\b/i,
        /verification\s*code/i,
        /is\s*due\s*(?:on|by|in)/i,
        /bill\s*generated/i,
        /reminder/i,
        /scheduled\s*(?:autopay|payment)/i,
        /mandate\s*(?:set\s*up|created|approved)/i,
        /flat\s*(?:rs|inr|₹|\d+%)\s*cashback/i,
        /win\s*(?:up\s*to|cashback|scratch|rewards)/i,
        /rate\s*your\s*experience/i,
        /pre-approved\s*loan/i,
        /claim\s*your\s*reward/i,
        /complete\s*(?:your\s*profile|kyc)/i
    ];

    for (const pat of negativePatterns) {
        if (pat.test(combined)) {
            return null;
        }
    }

    // Amount extraction
    let amount = null;
    const amountMatch = combined.match(/(?:₹|rs\.?|inr)\s*([\d,]+(?:\.\d{1,2})?)/i) ||
                        combined.match(/([\d,]+(?:\.\d{1,2})?)\s*(?:₹|rs\.?|inr)/i);

    if (amountMatch && amountMatch[1]) {
        amount = parseFloat(amountMatch[1].replace(/,/g, ""));
    }

    if (!amount || isNaN(amount) || amount <= 0) {
        return null;
    }

    // Determine transaction type (expense vs income)
    const isCredit = /(?:received|credited|refund(?:ed)?|cashback\s*credited|added\s*to\s*wallet)/i.test(combined) &&
                     !/(?:paid|debited|sent|charged|transferred\s*to)/i.test(combined);
    const type = isCredit ? "income" : "expense";

    // Detect Source App
    let appName = PAYMENT_APP_MAP[pkg] || "";
    if (!appName) {
        if (/samsung\s*(?:pay|wallet)/i.test(combined)) appName = "Samsung Pay";
        else if (/google\s*pay|gpay/i.test(combined)) appName = "Google Pay";
        else if (/phonepe/i.test(combined)) appName = "PhonePe";
        else if (/paytm/i.test(combined)) appName = "Paytm";
        else if (/cred/i.test(combined)) appName = "CRED";
        else appName = "Payment App";
    }

    // Extract Merchant / Payee
    let merchant = "";

    // Pattern 1: "Paid ₹189.00 to Reliance Retail" or "Sent ₹189 to Reliance Retail"
    let mMatch = combined.match(/(?:paid|sent|transfer(?:red)?|payment\s*of)\s*(?:₹|rs\.?|inr)?\s*[\d,.]+\s*(?:to|for)\s+([^.,\n]+?)(?:\s+(?:via|using|from|ref|on|successful)\b|\.|$|\n)/i);
    if (mMatch && mMatch[1]) merchant = mMatch[1].trim();

    // Pattern 2: "₹189.00 paid to Reliance Retail" or "₹189.00 debited for NIMAI DAS AGENCY"
    if (!merchant) {
        mMatch = combined.match(/[\d,.]+\s*(?:paid|debited|sent)\s*(?:to|for|at)\s+([^.,\n]+?)(?:\s+(?:via|using|from|ref|on|successful)\b|\.|$|\n)/i);
        if (mMatch && mMatch[1]) merchant = mMatch[1].trim();
    }

    // Pattern 3: "Transaction of ₹330.00 successful at GEETA CHAURASIYA"
    if (!merchant) {
        mMatch = combined.match(/(?:successful\s*(?:at|for|to)|at)\s+([^.,\n]+?)(?:\s+(?:via|using|ref|on)\b|\.|$|\n)/i);
        if (mMatch && mMatch[1]) merchant = mMatch[1].trim();
    }

    // Pattern 4: "Card ... charged ₹490.00 at Indian Railways"
    if (!merchant) {
        mMatch = combined.match(/charged\s*(?:₹|rs\.?|inr)?\s*[\d,.]+\s*(?:at|to|for)\s+([^.,\n]+?)(?:\s+(?:via|using|ref|on)\b|\.|$|\n)/i);
        if (mMatch && mMatch[1]) merchant = mMatch[1].trim();
    }

    // Pattern 5: "Received ₹... from SELECT AI"
    if (!merchant && isCredit) {
        mMatch = combined.match(/received\s*(?:₹|rs\.?|inr)?\s*[\d,.]+\s*(?:from|by)\s+([^.,\n]+?)(?:\s+(?:via|using|ref|on|into|in)\b|\.|$|\n)/i);
        if (mMatch && mMatch[1]) merchant = mMatch[1].trim();
    }

    // Pattern 6: If title looks like a merchant name (e.g. Title: "Reliance Retail", Text: "Paid ₹189.00")
    if (!merchant && title && !/samsung|wallet|gpay|google\s*pay|phonepe|paytm|cred|payment|transaction|alert/i.test(title)) {
        merchant = title;
    }

    // Clean up merchant name
    if (merchant) {
        merchant = merchant
            .replace(/^(the|a)\s+/i, "")
            .replace(/\s+(?:into\s+account|to\s+account|in\s+account|successful|completed|via\s+.*|ref.*)$/i, "")
            .replace(/[^\w\s&'-]/g, "")
            .trim();
    }

    if (!merchant || merchant.length < 2) {
        merchant = isCredit ? "Online Credit" : "UPI Payment";
    }

    // Capitalize appropriately if fully lowercase or uppercase
    if (merchant.length > 3 && (merchant === merchant.toLowerCase() || merchant === merchant.toUpperCase())) {
        merchant = merchant.split(" ")
            .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
            .join(" ");
    }

    const timestamp = rawNotification.date ? Number(rawNotification.date) : Date.now();
    const dateObj = new Date(timestamp);
    const dateStr = !isNaN(dateObj.getTime()) ? dateObj.toISOString().split("T")[0] : new Date().toISOString().split("T")[0];

    const category = categorizeNotificationMerchant(merchant, combined);

    return {
        id: `notif_${timestamp}_${Math.floor(Math.random() * 10000)}`,
        title: merchant,
        amount: amount,
        type: type,
        category: category,
        date: dateStr,
        createdAt: new Date(timestamp).toISOString(),
        merchant: merchant,
        account: appName,
        source: "notification",
        packageName: pkg,
        rawNotification: combined
    };
}

/**
 * Handle incoming notification from native bridge or browser simulation
 */
async function handleIncomingNotificationData(rawNotification) {
    if (!rawNotification) return null;

    const parsedTx = parsePaymentNotification(rawNotification);
    if (!parsedTx) return null;

    // Check sliding 15-minute deduplication window against existing transactions
    const existingMatch = findMatchingRecentTransaction(parsedTx);

    if (existingMatch) {
        // A matching transaction already exists!
        // Per user requirements: SMS takes precedence, notification skipped on conflict.
        return {
            status: "duplicate_skipped",
            matchedTransaction: existingMatch,
            candidate: parsedTx
        };
    }

    // If dummy data is present, clear it on first real notification
    if (window.clearDummyTransactions) {
        const hasDummy = (window.AppState && window.AppState.transactions || []).some(
            t => t.source === "dummy" || (t.id && t.id.startsWith("dummy-"))
        );
        if (hasDummy) {
            await window.clearDummyTransactions();
        }
    }

    // Save transaction
    if (typeof saveTransaction === "function") {
        await saveTransaction(parsedTx);
    } else if (window.dbSaveTransaction) {
        await window.dbSaveTransaction(parsedTx);
        if (window.AppState && window.AppState.transactions) {
            window.AppState.transactions.unshift(parsedTx);
        }
    }

    // Re-render
    if (typeof renderApplication === "function") {
        renderApplication();
    } else if (typeof renderTransactions === "function" && window.AppState && window.AppState.currentPage === "transactions") {
        renderTransactions();
    }

    const sign = parsedTx.type === "income" ? "+" : "−";
    if (typeof showToast === "function") {
        showToast(`${parsedTx.account}: ${sign}₹${parsedTx.amount.toLocaleString("en-IN")} logged (${parsedTx.merchant})`);
    }

    if (typeof triggerNativeHaptic === "function") {
        triggerNativeHaptic("medium");
    }

    return {
        status: "saved",
        transaction: parsedTx
    };
}

/**
 * Global bridge callback called from MainActivity.java
 */
if (typeof window !== "undefined") {
    window.onNativeNotificationReceived = async function(notifData) {
        if (!notifData) return;
        try {
            const data = typeof notifData === "string" ? JSON.parse(notifData) : notifData;
            await handleIncomingNotificationData(data);
        } catch (_) {
            // Zero logging
        }
    };
}

/**
 * Check if Android Notification Access is granted
 */
function isNotificationAccessActive() {
    if (typeof window !== "undefined" && window.AndroidBridge && typeof window.AndroidBridge.hasNotificationAccess === "function") {
        try {
            return window.AndroidBridge.hasNotificationAccess();
        } catch (_) {
            return false;
        }
    }
    // In browser preview, default to true for interactive simulation
    if (typeof localStorage !== "undefined") {
        return localStorage.getItem("expense_notif_tracking") !== "false";
    }
    return true;
}

/**
 * Request Notification Access in Android Settings
 */
function requestNotificationAccessPermission() {
    if (typeof window !== "undefined" && window.AndroidBridge && typeof window.AndroidBridge.requestNotificationAccess === "function") {
        try {
            window.AndroidBridge.requestNotificationAccess();
            if (typeof showToast === "function") {
                showToast("Opening Notification Access settings. Please enable Expense Tracker.");
            }
            return;
        } catch (_) {}
    }

    if (typeof showToast === "function") {
        showToast("Notification tracking ready (native bridge active)");
    }
}

/**
 * Initialize Notification Tracking UI and event listeners
 */
function initNotificationTracking() {
    if (typeof document === "undefined") return;

    const notifToggle = document.getElementById("notifTrackingToggle");
    const notifSubtitle = document.getElementById("notifStatusSubtitle");

    const isNative = typeof window !== "undefined" && Boolean(window.AndroidBridge);
    const hasAccess = isNotificationAccessActive();

    if (notifSubtitle) {
        if (isNative) {
            notifSubtitle.textContent = hasAccess ?
                "Active: Listening for Samsung Pay & UPI alerts" :
                "Permission required: Tap to open Android settings";
        } else {
            notifSubtitle.textContent = "Listening for Samsung Pay & payment notifications";
        }
    }

    if (notifToggle) {
        notifToggle.disabled = false;
        const savedPref = typeof localStorage !== "undefined" ? localStorage.getItem("expense_notif_tracking") : null;
        const shouldEnable = savedPref === null ? true : savedPref === "true";
        notifToggle.checked = shouldEnable;

        notifToggle.addEventListener("change", (e) => {
            if (e.target.checked) {
                if (typeof localStorage !== "undefined") localStorage.setItem("expense_notif_tracking", "true");
                if (isNative && !hasAccess) {
                    requestNotificationAccessPermission();
                } else if (typeof showToast === "function") {
                    showToast("Payment notification tracking enabled");
                }
            } else {
                if (typeof localStorage !== "undefined") localStorage.setItem("expense_notif_tracking", "false");
                if (typeof showToast === "function") {
                    showToast("Payment notification tracking paused");
                }
            }

            if (notifSubtitle) {
                notifSubtitle.textContent = e.target.checked ?
                    "Active: Listening for Samsung Pay & UPI alerts" :
                    "Tracking paused";
            }
        });
    }
}

/**
 * Browser preview helper to simulate an incoming payment notification
 */
if (typeof window !== "undefined") {
    window.simulatePaymentNotification = async function(customData) {
        const defaultSample = {
            packageName: "com.samsung.android.spay",
            title: "Samsung Pay",
            text: "Paid ₹189.00 to Reliance Retail via UPI",
            date: Date.now()
        };

        const payload = customData || defaultSample;
        return await handleIncomingNotificationData(payload);
    };
}

// Export functions for test harnesses (Node.js) & window globals
if (typeof module !== "undefined" && module.exports) {
    module.exports = {
        DEDUPLICATION_WINDOW_MS,
        findMatchingRecentTransaction,
        categorizeNotificationMerchant,
        parsePaymentNotification,
        handleIncomingNotificationData
    };
}
