// Test suite for bank SMS regex parser
function parseDateFromText(text) {
    if (!text) return null;
    const months = {
        jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
        jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
    };

    // e.g. 12Sep26, 12-Sep-26, 12 Sep 2026, 26Jun26
    const alphaMatch = text.match(/\b([0-3]?[0-9])[-/\s]?([A-Za-z]{3})[-/\s]?([0-9]{2,4})\b/);
    if (alphaMatch) {
        const day = parseInt(alphaMatch[1], 10);
        const monKey = alphaMatch[2].toLowerCase();
        let yr = parseInt(alphaMatch[3], 10);
        if (yr < 100) yr += 2000;
        if (months[monKey] !== undefined && day >= 1 && day <= 31) {
            const m = String(months[monKey] + 1).padStart(2, "0");
            const d = String(day).padStart(2, "0");
            return `${yr}-${m}-${d}`;
        }
    }

    // e.g. 01-08-26 or 01/08/2026 or 11-09-26
    const numMatch = text.match(/\b([0-3]?[0-9])[-/.]([0-1]?[0-9])[-/.]([0-9]{2,4})\b/);
    if (numMatch) {
        const day = parseInt(numMatch[1], 10);
        const mon = parseInt(numMatch[2], 10);
        let yr = parseInt(numMatch[3], 10);
        if (yr < 100) yr += 2000;
        if (mon >= 1 && mon <= 12 && day >= 1 && day <= 31) {
            const m = String(mon).padStart(2, "0");
            const d = String(day).padStart(2, "0");
            return `${yr}-${m}-${d}`;
        }
    }
    return null;
}

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

    // 2. Strict Negative Filter: Skip Upcoming / Scheduled / Pre-debit alerts & Mandates & Reminders
    const nonExecutedPatterns = [
        // Mandates & Autopay setups
        /\b(?:upi\s+)?mandate\s+(?:set\s*up|created|registered|approved|requested|active)\b/i,
        /\b(?:set\s*up|create|register|approve)\s+(?:a\s+)?(?:upi\s+)?mandate\b/i,
        /\be-mandate\b/i,
        /\bautopay\s+for\b/i,
        /\bautopay\s+(?:request|scheduled|active)\b/i,

        // Scheduled & Upcoming debits
        /\b(?:is|are)\s+scheduled\s+(?:on|for|to)\b/i,
        /\bscheduled\s+(?:on|for|to\s+be)\b/i,
        /\bauto\s*debit\s+scheduled\b/i,
        /\bstanding\s+instruction\s+scheduled\b/i,
        /\bwill\s+be\s+(?:debited|deducted|charged|transferred|processed)\b/i,
        /\bwould\s+be\s+(?:debited|deducted)\b/i,
        /\bshall\s+be\s+(?:debited|deducted)\b/i,
        /\bupcoming\s+(?:payment|sip|bill|installment|emi|debit|mandate|txn|transaction)\b/i,
        /\bfor\s+upcoming\b/i,

        // Reminders & Balance warnings
        /\b(?:please\s+)?ensure\s+(?:you\s+have\s+)?sufficient\s+balance\b/i,
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
        /\bcredit\s+limit\s+(?:increase|enhanced)\b/i
    ];

    for (const pattern of nonExecutedPatterns) {
        if (pattern.test(rawBody)) {
            return null; // Skip non-executed alerts
        }
    }

    // Strip support/disclaimer clauses that cause false positives (e.g. "if not withdrawn call...", "if cash not received call...")
    const cleanedSupportBody = rawBody.replace(/(?:if\s+not\s+(?:withdrawn|u\b|you\b|recognized)|call\s+[0-9\-]+|if\s+cash\s+not\s+received).*$/i, "");

    // 3. Identify executed transaction type keywords
    // Debits
    const isExpense = (
        /\b(?:debited|spent|paid|deducted|withdrawn|purchase|used\s+at)\b/i.test(cleanedSupportBody) ||
        /\b(?:sent\s+(?:rs\.?|inr|₹|to)|trf\s+to|transfer(?:red)?\s+to)\b/i.test(cleanedSupportBody) ||
        /\b(?:dr\.?|dr)\s+(?:rs\.?|inr|₹)?\b/i.test(cleanedSupportBody)
    );

    // Credits
    const isIncome = (
        /\b(?:credited|deposited|refund(?:ed)?|cashback)\b/i.test(cleanedSupportBody) ||
        /\b(?:received\s+(?:rs\.?|inr|₹|[0-9]))\b/i.test(cleanedSupportBody) ||
        /\b(?:cr\.?|cr)\s+(?:rs\.?|inr|₹)?\b/i.test(cleanedSupportBody)
    );

    if (!isExpense && !isIncome) return null;
    
    // If both keywords matched (rare, e.g. "debited ... cashback"), prioritize expense unless it's cashback/refund
    let type = "expense";
    if (isIncome && !isExpense) {
        type = "income";
    } else if (isIncome && isExpense) {
        type = (lower.includes("refund") || lower.includes("cashback")) ? "income" : "expense";
    }

    // 4. Remove available balance / limit clauses to prevent balance misidentification
    const balancePattern = /(?:avl(?:\.|\s+)?bal(?:ance)?|avail(?:able)?\s+bal(?:ance)?|net\s+bal(?:ance)?|total\s+bal(?:ance)?|balance\s*is|bal:?|avl\s+lmt|avail\s+limit|bal\s+inr|bal\s+rs)\s*(?:is|:)?\s*(?:rs\.?|inr|₹)?\s*[0-9,]+(?:\.[0-9]{1,2})?/gi;
    const cleanedBody = rawBody.replace(balancePattern, " [BAL_STRIPPED] ");

    // 5. Extract Amount
    let amount = 0;

    // Pattern A: "debited by 189.00", "credited by Rs.37300.00", "spent INR 450.00", "paid Rs 200"
    let amountMatch = cleanedBody.match(/(?:debited|credited|spent|paid|withdrawn|sent|received|purchase|transferred|deposited)\s+(?:for|by|of|with|amount\s+of)?\s*(?:rs\.?|inr|₹)?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i);

    // Pattern B: "Rs.10000 withdrawn", "Rs 640.00 debited", "INR 2,499.00 debited"
    if (!amountMatch) {
        amountMatch = cleanedBody.match(/(?:rs\.?|inr|₹)\s*([0-9,]+(?:\.[0-9]{1,2})?)\s*(?:has been|is|was)?\s*(?:debited|credited|spent|paid|withdrawn|sent|received|transferred|deposited)/i);
    }

    // Pattern C: "Sent Rs. 450.00 from", "transfer of Rs 500.00"
    if (!amountMatch) {
        amountMatch = cleanedBody.match(/(?:rs\.?|inr|₹)\s*([0-9,]+(?:\.[0-9]{1,2})?)/i);
    }

    if (amountMatch && amountMatch[1]) {
        amount = parseFloat(amountMatch[1].replace(/,/g, ""));
    }

    if (isNaN(amount) || amount <= 0) return null;

    // 6. Detect Bank & Account
    let bankName = "Bank";
    if (fullText.includes("SBI") || fullText.includes("STATE BANK")) {
        bankName = "SBI";
    } else if (fullText.includes("HDFC")) {
        bankName = "HDFC Bank";
    } else if (fullText.includes("ICICI")) {
        bankName = "ICICI Bank";
    } else if (fullText.includes("AXIS")) {
        bankName = "Axis Bank";
    } else if (fullText.includes("KOTAK")) {
        bankName = "Kotak Bank";
    } else if (fullText.includes("BARODA") || fullText.includes("BOB")) {
        bankName = "Bank of Baroda";
    } else if (fullText.includes("PNB") || fullText.includes("PUNJAB NATIONAL")) {
        bankName = "PNB";
    } else if (fullText.includes("CANARA")) {
        bankName = "Canara Bank";
    } else if (fullText.includes("PAYTM")) {
        bankName = "Paytm Bank";
    } else if (fullText.includes("FEDERAL")) {
        bankName = "Federal Bank";
    } else if (fullText.includes("INDUSIND")) {
        bankName = "IndusInd Bank";
    } else if (fullText.includes("IDFC")) {
        bankName = "IDFC FIRST Bank";
    } else if (fullText.includes("UPI")) {
        bankName = "UPI";
    }

    // Extract Account Number (e.g. A/C X3407, a/c no. XXXXXXXX3407, A/C **8910, ending 4321)
    let accountCode = "";
    const acctMatch = rawBody.match(/(?:a\/c\s*(?:no\.?)?|acct|ac|account|card\s*ending)\s*[:\s]*([X\*0-9]{3,16})/i);
    if (acctMatch && acctMatch[1]) {
        let rawNum = acctMatch[1].trim();
        // Shorten long masked accounts like XXXXXXXX3407 -> X3407
        const lastDigits = rawNum.match(/([0-9]{3,4})$/);
        if (lastDigits) {
            accountCode = "X" + lastDigits[1];
        } else {
            accountCode = rawNum;
        }
    }

    const bankAccount = accountCode ? `${bankName} ${accountCode}` : (bankName !== "Bank" ? `${bankName} Account` : "Bank Account");

    // 7. Check for Investment platforms & keywords
    const isInvestment = (
        /\b(?:sip|mutual\s+fund|index\s+fund|etf|stocks|equity|demat|smallcase|kuvera|dividend)\b/i.test(rawBody) ||
        lower.includes("angel one") ||
        sender.includes("ANGONE") ||
        sender.includes("ANGEL") ||
        lower.includes("zerodha") ||
        sender.includes("ZERODH") ||
        lower.includes("groww") ||
        lower.includes("upstox") ||
        lower.includes("paytm money") ||
        lower.includes("5paisa") ||
        lower.includes("sharekhan") ||
        lower.includes("nippon") ||
        lower.includes("mirae") ||
        lower.includes("parag parikh") ||
        lower.includes("ppfas") ||
        lower.includes("navi nifty")
    );

    // 8. Extract Merchant or Transfer Party
    let merchant = "";

    // Pattern 1: SBI UPI "trf to <Merchant> Refno" or "transfer to <Merchant>"
    const trfMatch = rawBody.match(/(?:trf\s+to|transfer(?:red)?\s+to)\s+([^,\.;\n]+?)(?=\s+(?:refno|ref\s*#|ref\s*no|ref|if\s+not|call|on\s+date|avl|bal|upi|$))/i);
    if (trfMatch && trfMatch[1]) {
        merchant = trfMatch[1].trim();
    }

    // Pattern 2: ATM Cash withdrawal "withdrawn at <ATM Location>"
    if (!merchant) {
        const atmMatch = rawBody.match(/(?:withdrawn\s+at|atm\s+w\/d\s+at|at\s+([A-Za-z0-9\s]+ATM[A-Za-z0-9\s]*))\s+([^,\.;\n]+?)(?=\s+(?:from|on|txn|transaction|number|ref|avl|bal|$))/i);
        if (atmMatch) {
            const loc = (atmMatch[2] || atmMatch[1] || "").trim();
            merchant = loc.includes("ATM") ? loc : `ATM Cash (${loc})`;
        } else if (lower.includes("atm") && lower.includes("withdrawn")) {
            merchant = "ATM Cash Withdrawal";
        }
    }

    // Pattern 3: Credit from mobile/IMPS: "by a/c linked to mobile 7XXXXXX919-SELECT AI"
    if (!merchant && type === "income") {
        const creditSrcMatch = rawBody.match(/by\s+a\/c\s+linked\s+to\s+mobile\s+[0-9X]+-([A-Za-z0-9\s\.\-_&]+?)(?=\s*\(|\s+imps|\s+ref|\s+on|$)/i);
        if (creditSrcMatch && creditSrcMatch[1]) {
            merchant = creditSrcMatch[1].trim();
        } else {
            const fromMatch = rawBody.match(/(?:received\s+from|from\s+sender|transferred\s+by)\s+([A-Za-z0-9\s\.\-_&]{2,30})(?=\s+(?:ref|on|avl|bal|\(|$))/i);
            if (fromMatch && fromMatch[1]) {
                merchant = fromMatch[1].trim();
            }
        }
    }

    // Pattern 4: Standard "to <Merchant>", "at <Merchant>", "Info: UPI/<ID>/<Merchant>"
    if (!merchant) {
        if (sender.includes("ANGONE") || lower.includes("angel one")) {
            merchant = "Angel One";
        } else if (sender.includes("ZERODH") || lower.includes("zerodha")) {
            merchant = "Zerodha";
        } else if (lower.includes("groww")) {
            merchant = "Groww";
        } else if (lower.includes("upstox")) {
            merchant = "Upstox";
        } else {
            // Check Info: UPI/.../<Merchant>
            const infoMatch = rawBody.match(/info:\s*upi(?:\/[^/\s]+)*\/([A-Za-z0-9\s\-_]+)/i);
            if (infoMatch && infoMatch[1]) {
                merchant = infoMatch[1].trim();
            } else {
                const toMatch = rawBody.match(/(?:to|at|towards)\s+([A-Za-z0-9\.\@\s\-_]{2,32})(?:[\.\,\;\s]+(?:on|ref|val|avbl|avl|bal|upi|thru|info)|$)/i);
                if (toMatch && toMatch[1]) {
                    merchant = toMatch[1].trim().replace(/^UPI-?/i, "").trim();
                }
            }
        }
    }

    // Fallbacks
    if (!merchant || merchant.length < 2) {
        if (type === "income") {
            if (lower.includes("salary")) merchant = "Monthly Salary";
            else if (lower.includes("dividend")) merchant = "Stock Dividend";
            else if (lower.includes("cashback")) merchant = "Cashback Reward";
            else if (lower.includes("refund")) merchant = "Refund Received";
            else if (isInvestment) merchant = "Investment Return";
            else merchant = bankName + " Credit";
        } else {
            if (isInvestment) merchant = "Investment SIP";
            else if (lower.includes("atm")) merchant = "ATM Cash Withdrawal";
            else merchant = bankName + " Expense";
        }
    }

    // Clean trailing punctuation or reference fragments from merchant
    merchant = merchant.replace(/\s+(?:refno|ref|txn|if\s+not).*$/i, "").replace(/[\.\,\;\-]+$/, "").trim();

    // 9. Intelligent Category Assignment
    let category = type === "income" ? "Salary" : "Other";
    const checkText = (merchant + " " + lower + " " + sender).toLowerCase();

    if (type === "income") {
        if (isInvestment || checkText.includes("dividend") || checkText.includes("mutual") || checkText.includes("stock") || checkText.includes("groww") || checkText.includes("zerodha") || checkText.includes("angel")) {
            category = "Investments";
        } else if (checkText.includes("salary") || checkText.includes("payroll")) {
            category = "Salary";
        } else if (checkText.includes("freelance") || checkText.includes("consult") || checkText.includes("select ai")) {
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
        } else if (checkText.includes("atm") || checkText.includes("withdrawn") || checkText.includes("cash")) {
            category = "Cash";
        } else if (checkText.includes("swiggy") || checkText.includes("zomato") || checkText.includes("restaurant") || checkText.includes("mcdonald") || checkText.includes("burger") || checkText.includes("cafe") || checkText.includes("starbucks") || checkText.includes("domino") || checkText.includes("chai") || checkText.includes("hotel") || checkText.includes("food") || checkText.includes("chaurasiya")) {
            category = "Food";
        } else if (checkText.includes("blinkit") || checkText.includes("zepto") || checkText.includes("grocery") || checkText.includes("mart") || checkText.includes("bigbasket") || checkText.includes("supermarket") || checkText.includes("dmart") || checkText.includes("reliance fresh")) {
            category = "Groceries";
        } else if (checkText.includes("railway") || checkText.includes("irctc") || checkText.includes("uber") || checkText.includes("ola") || checkText.includes("rapido") || checkText.includes("metro") || checkText.includes("petrol") || checkText.includes("fuel") || checkText.includes("shell") || checkText.includes("indian oil") || checkText.includes("hpcl") || checkText.includes("bpcl") || checkText.includes("flight") || checkText.includes("airways")) {
            category = "Transport";
        } else if (checkText.includes("reliance retail") || checkText.includes("amazon") || checkText.includes("flipkart") || checkText.includes("myntra") || checkText.includes("zara") || checkText.includes("meesho") || checkText.includes("ajio") || checkText.includes("retail")) {
            category = "Shopping";
        } else if (checkText.includes("jio") || checkText.includes("rech") || checkText.includes("prepaid") || checkText.includes("postpaid") || checkText.includes("bescom") || checkText.includes("electricity") || checkText.includes("airtel") || checkText.includes("bill") || checkText.includes("vi") || checkText.includes("gas") || checkText.includes("water") || checkText.includes("broadband")) {
            category = "Bills";
        } else if (checkText.includes("apollo") || checkText.includes("pharmeasy") || checkText.includes("hospital") || checkText.includes("clinic") || checkText.includes("1mg") || checkText.includes("med") || checkText.includes("doctor")) {
            category = "Health";
        } else if (checkText.includes("netflix") || checkText.includes("prime") || checkText.includes("bookmyshow") || checkText.includes("pvr") || checkText.includes("inox") || checkText.includes("spotify") || checkText.includes("hotstar") || checkText.includes("cinema")) {
            category = "Entertainment";
        }
    }

    // 10. Date parsing: from text or sms.date
    let txDate = "2026-09-16";
    const parsedTextDate = parseDateFromText(rawBody);
    if (parsedTextDate) {
        txDate = parsedTextDate;
    } else if (sms.date) {
        const d = new Date(sms.date);
        if (!isNaN(d.getTime())) {
            txDate = d.toISOString().split("T")[0];
        }
    }

    return {
        amount,
        type,
        merchant,
        category,
        account: bankAccount,
        date: txDate
    };
}

// -------------------------------------------------------------
// Test execution
// -------------------------------------------------------------
const testMessages = [
    {
        name: "User SBI Sample 1 (Reliance Retail)",
        sms: {
            address: "VK-SBIINB",
            body: "Dear UPI user A/C X3407 debited by 189.00 on date 12Sep26 trf to Reliance Retail Refno 625515721424 If not u? call-1800111109 for other services-18001234-SBI"
        },
        expected: { valid: true, type: "expense", amount: 189, merchant: "Reliance Retail", category: "Shopping", date: "2026-09-12", account: "SBI X3407" }
    },
    {
        name: "User SBI Sample 2 (Jio Recharge)",
        sms: {
            address: "VK-SBIINB",
            body: "Dear UPI user A/C X3407 debited by 11.00 on date 02Sep26 trf to Jio Prepaid Rech Refno 624534435350 If not u? call-1800111109 for other services-18001234-SBI"
        },
        expected: { valid: true, type: "expense", amount: 11, merchant: "Jio Prepaid Rech", category: "Bills", date: "2026-09-02", account: "SBI X3407" }
    },
    {
        name: "User SBI Sample 3 (Geeta Chaurasiya)",
        sms: {
            address: "VK-SBIINB",
            body: "Dear UPI user A/C X3407 debited by 330.00 on date 28Jun26 trf to GEETA CHAURASIYA Refno 117323581796 If not u? call-1800111109 for other services-18001234-SBI"
        },
        expected: { valid: true, type: "expense", amount: 330, merchant: "GEETA CHAURASIYA", date: "2026-06-28", account: "SBI X3407" }
    },
    {
        name: "User SBI Sample 4 (Nimai Das Agency)",
        sms: {
            address: "VK-SBIINB",
            body: "Dear UPI user A/C X3407 debited by 226.00 on date 15Sep26 trf to NIMAI DAS AGENCY Refno 567264362586 If not u? call-1800111109 for other services-18001234-SBI"
        },
        expected: { valid: true, type: "expense", amount: 226, merchant: "NIMAI DAS AGENCY", date: "2026-09-15", account: "SBI X3407" }
    },
    {
        name: "User SBI Sample 5 (NEGATIVE: Scheduled AutoPay)",
        sms: {
            address: "VK-SBIINB",
            body: "Dear UPI User, UPI AutoPay for ANGEL ONE MUTUL FUND debit of Rs.200.00 is scheduled on .18/09/26, daf519ecdee14cdbae2c3ef9ca31b4d3@okicici. Please ensure sufficient balance in your account. -SBI --- not this one**"
        },
        expected: { valid: false }
    },
    {
        name: "User SBI Sample 6 (Indian Railways)",
        sms: {
            address: "VK-SBIINB",
            body: "Dear UPI user A/C X3407 debited by 490.00 on date 06Sep26 trf to Indian Railways Refno 852117152496 If not u? call-1800111109 for other services-18001234-SBI"
        },
        expected: { valid: true, type: "expense", amount: 490, merchant: "Indian Railways", category: "Transport", date: "2026-09-06", account: "SBI X3407" }
    },
    {
        name: "User Axis Sample 7 (NEGATIVE: Mandate Set Up)",
        sms: {
            address: "VK-AXISBK",
            body: "UPI mandate set up for NAUKRI COM for INR 750.00. Not you? Call us on 18001035577 - Axis Bank-- not this also"
        },
        expected: { valid: false }
    },
    {
        name: "User SBI Sample 8 (Salary / IMPS Credit)",
        sms: {
            address: "VK-SBIINB",
            body: "Dear Customer, Your a/c no. XXXXXXXX3407 is credited by Rs.37300.00 on 01-08-26 by a/c linked to mobile 7XXXXXX919-SELECT AI  (IMPS Ref# 621309006645)-SBI"
        },
        expected: { valid: true, type: "income", amount: 37300, merchant: "SELECT AI", date: "2026-08-01", account: "SBI X3407" }
    },
    {
        name: "User SBI Sample 9 (ATM Cash Withdrawal)",
        sms: {
            address: "VK-SBIINB",
            body: "Dear SBI Customer, Rs.10000 withdrawn at HIB ATM HCB02801 from A/cX3407 on 26Jun26 Transaction Number 617719001821. Available Balance Rs.6247.30. If not withdrawn by you, forward this SMS to 7400165218 / call 1800111109 or 09449112211 to block your card. Call 18001234 if cash not received."
        },
        expected: { valid: true, type: "expense", amount: 10000, merchant: "HIB ATM HCB02801", category: "Cash", date: "2026-06-26", account: "SBI X3407" }
    },
    {
        name: "HDFC UPI Swiggy",
        sms: {
            address: "VM-HDFCBK",
            body: "Rs 640.00 debited from HDFC Bank A/C **8910 on 15-AUG-26 to SWIGGY. Info: UPI-349102. Avl Bal: Rs 42,310.00."
        },
        expected: { valid: true, type: "expense", amount: 640, merchant: "SWIGGY", category: "Food", date: "2026-08-15", account: "HDFC Bank X8910" }
    },
    {
        name: "ICICI Netflix",
        sms: {
            address: "AD-ICICIB",
            body: "Your A/C XXXXXX1029 is debited with INR 299.00 on 12-Aug-26. Info: UPI/321456/NETFLIX. Avl Bal: INR 15,000.00"
        },
        expected: { valid: true, type: "expense", amount: 299, merchant: "NETFLIX", category: "Entertainment", date: "2026-08-12", account: "ICICI Bank X1029" }
    },
    {
        name: "Angel One Demat",
        sms: {
            address: "AD-ANGONE",
            body: "Dear Client, Rs. 5000.00 debited from Bank A/c for Angel One demat fund transfer on 10-Sep-26. UPI Ref 45678."
        },
        expected: { valid: true, type: "expense", amount: 5000, merchant: "Angel One", category: "Investments", date: "2026-09-10" }
    },
    {
        name: "Negative: OTP SMS",
        sms: {
            address: "VK-SBIINB",
            body: "Your OTP for SBI Net Banking is 584920. Do not share this OTP with anyone. Valid for 10 mins."
        },
        expected: { valid: false }
    },
    {
        name: "Negative: Postpaid Due Reminder",
        sms: {
            address: "VM-AIRTEL",
            body: "Dear Customer, bill of Rs 1,450.00 for your Airtel postpaid is due on 22-Sep-26. Pay before due date to avoid late fee."
        },
        expected: { valid: false }
    }
];

let failed = 0;
for (const test of testMessages) {
    const res = parseFinancialSms(test.sms);
    if (!test.expected.valid) {
        if (res !== null) {
            console.error(`FAIL: ${test.name} should be rejected, but got:`, res);
            failed++;
        } else {
            console.log(`PASS: ${test.name} correctly rejected.`);
        }
    } else {
        if (res === null) {
            console.error(`FAIL: ${test.name} was rejected!`);
            failed++;
        } else {
            let ok = true;
            if (test.expected.type && res.type !== test.expected.type) {
                console.error(`FAIL [type]: ${test.name} got ${res.type}, expected ${test.expected.type}`);
                ok = false;
            }
            if (test.expected.amount && res.amount !== test.expected.amount) {
                console.error(`FAIL [amount]: ${test.name} got ${res.amount}, expected ${test.expected.amount}`);
                ok = false;
            }
            if (test.expected.merchant && !res.merchant.toLowerCase().includes(test.expected.merchant.toLowerCase())) {
                console.error(`FAIL [merchant]: ${test.name} got "${res.merchant}", expected "${test.expected.merchant}"`);
                ok = false;
            }
            if (test.expected.category && res.category !== test.expected.category) {
                console.error(`FAIL [category]: ${test.name} got "${res.category}", expected "${test.expected.category}"`);
                ok = false;
            }
            if (test.expected.date && res.date !== test.expected.date) {
                console.error(`FAIL [date]: ${test.name} got "${res.date}", expected "${test.expected.date}"`);
                ok = false;
            }
            if (test.expected.account && res.account !== test.expected.account) {
                console.error(`FAIL [account]: ${test.name} got "${res.account}", expected "${test.expected.account}"`);
                ok = false;
            }
            if (ok) {
                console.log(`PASS: ${test.name} -> ₹${res.amount} | ${res.type} | ${res.merchant} | ${res.category} | ${res.account} | ${res.date}`);
            } else {
                failed++;
            }
        }
    }
}

if (failed === 0) {
    console.log("\nALL TESTS PASSED WITH 100% ACCURACY!");
} else {
    console.error(`\n${failed} TESTS FAILED.`);
    process.exit(1);
}
