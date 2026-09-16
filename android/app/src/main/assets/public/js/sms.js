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
                // 0 limit indicates fetch all messages
                rawJson = window.AndroidBridge.readInboxSmsSince(lastSyncTs, 0);
            } else {
                rawJson = window.AndroidBridge.readInboxSms(0);
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

    // Yield to browser event loop to guarantee 60fps UI responsiveness
    const yieldToEventLoop = () => new Promise(resolve => setTimeout(resolve, 0));

    // Time-sliced batch parsing (25 messages per chunk)
    const BATCH_SIZE = 25;
    for (let i = 0; i < smsList.length; i += BATCH_SIZE) {
        const batch = smsList.slice(i, i + BATCH_SIZE);
        for (const sms of batch) {
            const parsedTx = parseFinancialSms(sms);
            if (parsedTx) {
                parsedValidList.push(parsedTx);
            }
        }
        if (smsList.length > BATCH_SIZE) {
            await yieldToEventLoop();
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

    // Fast O(1) deduplication check using Set indices
    const existingIds = new Set((AppState.transactions || []).map(t => t.smsId).filter(Boolean));
    const existingSignatures = new Set((AppState.transactions || []).map(t => `${t.amount}_${t.date}_${t.merchant}`));
    const newTransactionsToSave = [];

    for (const parsedTx of parsedValidList) {
        const hasIdMatch = parsedTx.smsId && existingIds.has(parsedTx.smsId);
        const hasSigMatch = existingSignatures.has(`${parsedTx.amount}_${parsedTx.date}_${parsedTx.merchant}`);

        if (!hasIdMatch && !hasSigMatch) {
            newTransactionsToSave.push(parsedTx);
            if (parsedTx.smsId) existingIds.add(parsedTx.smsId);
            existingSignatures.add(`${parsedTx.amount}_${parsedTx.date}_${parsedTx.merchant}`);
        }
    }

    // Batch persist all new transactions in a single transaction & single render
    if (newTransactionsToSave.length > 0) {
        if (typeof saveTransactionsBatch === "function") {
            await saveTransactionsBatch(newTransactionsToSave);
        } else {
            for (const item of newTransactionsToSave) {
                await saveTransaction(item);
            }
        }
        importedCount = newTransactionsToSave.length;
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
 * Robust regex parser for Indian Banking & Financial SMS
 * Handles SBI, HDFC, ICICI, BOB, AXIS, KOTAK, PNB, CANARA, UPI, PAYTM, PHONEPE, GPAY,
 * and Investment platforms (Angel One, Zerodha, Groww, Upstox, Mutual Funds, etc.)
 */
function parseFinancialSms(sms) {
    if (!sms || !sms.body) return null;
    const rawBody = sms.body;
    const lower = rawBody.toLowerCase();
    const sender = (sms.address || "").toUpperCase();
    const fullText = (sender + " " + rawBody).toUpperCase();

    // 1. Filter out OTP, passwords, verification codes, and security warnings
    if (
        /\b(?:otp|one\s*time\s*password|verification\s*code|secret\s*code|m-?pin|upi\s*pin|login\s*password)\b/i.test(rawBody) ||
        /do\s+not\s+share/i.test(rawBody) ||
        /security\s+alert/i.test(rawBody)
    ) {
        return null;
    }

    // 2. Strict Filter: Filter out Upcoming / Reminder / Scheduled / Pre-debit alerts & Mandates
    // (e.g. "Upcoming Payment!", "Rs 1,000 will be debited on 18 Sep 2026 for upcoming SIP... Ensure you have sufficient balance")
    const nonExecutedPatterns = [
        /\bwill\s+be\s+(?:debited|deducted|charged|transferred|processed)\b/i,
        /\bwould\s+be\s+(?:debited|deducted)\b/i,
        /\bshall\s+be\s+(?:debited|deducted)\b/i,
        /\bupcoming\s+(?:payment|sip|bill|installment|emi|debit|mandate|txn|transaction)\b/i,
        /\bfor\s+upcoming\b/i,
        /\b(?:is|are)\s+scheduled\s+to\b/i,
        /\bscheduled\s+(?:on|for|to\s+be|debit)\b/i,
        /\bauto\s*debit\s+scheduled\b/i,
        /\bstanding\s+instruction\s+scheduled\b/i,
        /\bensure\s+(?:you\s+have\s+)?sufficient\s+balance\b/i,
        /\b(?:maintain|keep|have)\s+sufficient\s+(?:balance|funds)\b/i,
        /\bkindly\s+maintain\s+balance\b/i,
        /\bsufficient\s+balance\s+in\s+your\b/i,
        /\bpayment\s+reminder\b/i,
        /\bbill\s+reminder\b/i,
        /\breminder\s*:/i,
        /\bfriendly\s+reminder\b/i,
        /\b(?:payment|bill|amount|installment)\s+(?:is\s+)?due\s+on\b/i,
        /\bdue\s+date\s*(?:is|:)\b/i,
        /\blast\s+date\s+to\s+pay\b/i,
        /\bpay\s+before\b/i,
        /\bmandate\s+(?:has\s+been\s+)?(?:created|registered|approved)\b/i,
        /\be-mandate\b/i,
        /\bautopay\s+request\b/i,
        
        // Failed / Declined / Unsuccessful transactions
        /\b(?:transaction|payment|txn|auto\s*debit)\s+(?:failed|declined|unsuccessful|rejected)\b/i,
        /\bfailed\s+to\s+debit\b/i,
        /\bcould\s+not\s+be\s+processed\b/i,
        /\binsufficient\s+balance\s+to\s+debit\b/i,
        /\binward\s+mandate\s+rejected\b/i,
        
        // Payment requests / Collect money calls
        /\brequested\s+money\b/i,
        /\bpayment\s+request\s+from\b/i,
        /\bcollect\s+request\b/i,
        /\bhas\s+requested\s+(?:rs\.?|inr|₹)?\b/i,

        // Promotional / Pre-approved loan offers
        /\bpre-?approved\b/i,
        /\bapply\s+now\b/i,
        /\binstant\s+(?:personal\s+)?loan\b/i,
        /\bcredit\s+limit\s+increase\b/i
    ];

    for (const pattern of nonExecutedPatterns) {
        if (pattern.test(rawBody)) {
            return null; // Skip non-executed alerts
        }
    }

    // 3. Identify executed transaction type keywords
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

    // 4. Remove available balance / limit clauses to prevent balance misidentification
    const balancePattern = /(?:avl(?:\.|\s+)?bal(?:ance)?|avail(?:able)?\s+bal(?:ance)?|net\s+bal(?:ance)?|total\s+bal(?:ance)?|balance\s*is|bal:?|avl\s+lmt|avail\s+limit|bal\s+inr|bal\s+rs)\s*(?:is|:)?\s*(?:rs\.?|inr|₹)?\s*[0-9,]+(?:\.[0-9]{1,2})?/gi;
    const cleanedBody = rawBody.replace(balancePattern, " [BAL_STRIPPED] ");

    // 5. Extract Amount
    let amount = 0;
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

    // 6. Detect Bank Name
    let bankAccount = "Bank Account";
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
    } else if (fullText.includes("FEDERAL")) {
        bankAccount = "Federal Bank";
    } else if (fullText.includes("INDUSIND")) {
        bankAccount = "IndusInd Bank";
    } else if (fullText.includes("IDFC")) {
        bankAccount = "IDFC FIRST Bank";
    } else if (fullText.includes("UPI")) {
        bankAccount = "UPI";
    }

    // 7. Check for Investment platforms & keywords
    const isInvestment = (
        lower.includes("sip") ||
        lower.includes("mutual fund") ||
        lower.includes("index fund") ||
        lower.includes("etf") ||
        lower.includes("stocks") ||
        lower.includes("equity") ||
        lower.includes("demat") ||
        lower.includes("angel one") ||
        sender.includes("ANGONE") ||
        sender.includes("ANGEL") ||
        lower.includes("zerodha") ||
        sender.includes("ZERODH") ||
        lower.includes("groww") ||
        lower.includes("upstox") ||
        lower.includes("smallcase") ||
        lower.includes("kuvera") ||
        lower.includes("paytm money") ||
        lower.includes("5paisa") ||
        lower.includes("sharekhan") ||
        lower.includes("motilal") ||
        lower.includes("nippon") ||
        lower.includes("mirae") ||
        lower.includes("parag parikh") ||
        lower.includes("ppfas") ||
        lower.includes("aditya birla sun life") ||
        lower.includes("navi nifty") ||
        lower.includes("nps") ||
        lower.includes("ppf") ||
        lower.includes("dividend")
    );

    // 8. Extract Merchant or Source
    let merchant = "";
    if (type === "income") {
        if (lower.includes("salary")) merchant = "Monthly Salary";
        else if (lower.includes("dividend")) merchant = "Stock Dividend";
        else if (lower.includes("cashback")) merchant = "Cashback Reward";
        else if (lower.includes("refund")) merchant = "Refund Received";
        else if (isInvestment) merchant = "Investment Return";
        else merchant = bankAccount + " Credit";
    } else {
        if (sender.includes("ANGONE") || lower.includes("angel one")) {
            merchant = "Angel One";
        } else if (sender.includes("ZERODH") || lower.includes("zerodha")) {
            merchant = "Zerodha";
        } else if (lower.includes("groww")) {
            merchant = "Groww";
        } else if (lower.includes("upstox")) {
            merchant = "Upstox";
        } else if (lower.includes("navi nifty") || lower.includes("navi mutual")) {
            merchant = "Navi Mutual Fund";
        } else {
            const merchantMatch = rawBody.match(/(?:to|at|vpa|info:|towards)\s+([A-Za-z0-9\.\@\s\-_]{2,30})(?:[\.\,\;\s]+(?:on|ref|val|avbl|avl|bal|upi|thru)|$)/i);
            if (merchantMatch && merchantMatch[1]) {
                merchant = merchantMatch[1].trim().replace(/^UPI-?/i, "").trim();
            }
            if (!merchant || merchant.length < 2) {
                merchant = isInvestment ? "Investment SIP" : bankAccount + " Expense";
            }
        }
    }

    // 9. Intelligent Category Assignment (including Investments)
    let category = type === "income" ? "Salary" : "Other";
    const checkText = (merchant + " " + lower + " " + sender).toLowerCase();

    if (type === "income") {
        if (isInvestment || checkText.includes("dividend") || checkText.includes("mutual") || checkText.includes("stock") || checkText.includes("groww") || checkText.includes("zerodha") || checkText.includes("angel")) {
            category = "Investments";
        } else if (checkText.includes("salary") || checkText.includes("payroll")) {
            category = "Salary";
        } else if (checkText.includes("freelance") || checkText.includes("consult")) {
            category = "Freelance";
        } else if (checkText.includes("cashback") || checkText.includes("reward") || checkText.includes("refund")) {
            category = "Refund & Cashback";
        } else if (checkText.includes("rent")) {
            category = "Rental";
        } else {
            category = "Income";
        }
    } else {
        if (isInvestment) {
            category = "Investments";
        } else if (checkText.includes("swiggy") || checkText.includes("zomato") || checkText.includes("restaurant") || checkText.includes("mcdonald") || checkText.includes("burger") || checkText.includes("cafe") || checkText.includes("starbucks") || checkText.includes("domino") || checkText.includes("chai")) {
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

    // 10. Timestamp formatting
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
    // Non-blocking deferred init: Allows UI, charts, and first frame to render smoothly
    const scheduleInit = window.requestIdleCallback || ((cb) => setTimeout(cb, 1500));
    scheduleInit(() => {
        initSmsTracking();
    });
});
