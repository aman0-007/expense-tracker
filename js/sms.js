let isSmsWatching = false;

function initSmsTracking() {
    const smsToggle = document.querySelector('.settings-section input[type="checkbox"]');
    if (window.plugins && window.plugins.smsReceive) {
        smsToggle.disabled = false;
        smsToggle.addEventListener('change', (e) => {
            if (e.target.checked) startSmsWatching();
            else stopSmsWatching();
        });
    } else {
        if(smsToggle) smsToggle.disabled = true;
    }
}

function startSmsWatching() {
    window.plugins.smsReceive.requestPermission(
        function() {
            window.plugins.smsReceive.startWatch(
                function() {
                    isSmsWatching = true;
                    showToast("SMS tracking active");
                    document.addEventListener('onSMSArrive', handleIncomingSms);
                },
                function(err) {
                    showToast("Failed to start SMS tracking");
                    document.querySelector('.settings-section input[type="checkbox"]').checked = false;
                }
            );
        },
        function(err) {
            showToast("SMS Permission denied");
            document.querySelector('.settings-section input[type="checkbox"]').checked = false;
        }
    );
}

function stopSmsWatching() {
    window.plugins.smsReceive.stopWatch(
        function() {
            isSmsWatching = false;
            showToast("SMS tracking stopped");
            document.removeEventListener('onSMSArrive', handleIncomingSms);
        },
        function() {}
    );
}

async function handleIncomingSms(e) {
    const sms = e.data;
    const body = sms.body.toLowerCase();
    
    // Advanced Regex: Matches Rs, Rs., INR, or ₹ followed by an amount (with or without commas)
    const amountRegex = /(?:rs\.?|inr|₹)\s*([0-9,]+(?:\.[0-9]+)?)/i;
    const amountMatch = body.match(amountRegex);

    if (!amountMatch) return; // Ignore non-financial messages

    // Strip commas and convert to float
    const amount = parseFloat(amountMatch[1].replace(/,/g, ''));
    
    // Indian banking trigger words
    const expenseKeywords = ["debited", "spent", "paid", "deducted", "sent to"];
    const incomeKeywords = ["credited", "received", "added"];
    
    const isExpense = expenseKeywords.some(keyword => body.includes(keyword));
    const isIncome = incomeKeywords.some(keyword => body.includes(keyword));

    if (!isExpense && !isIncome) return; 

    const type = isExpense ? "expense" : "income";

    // Attempt to extract the merchant/VPA using common structural markers
    let merchant = sms.address; 
    const merchantMatch = body.match(/(?:to|vpa|at)\s+([a-z0-9\.\@\s]+?)(?:\s+(?:on|ref|val|avbl|avl|bal|upi)|$)/i);
    if (merchantMatch && merchantMatch[1]) {
        merchant = merchantMatch[1].trim().toUpperCase();
    }

    const transaction = {
        id: generateId(),
        type: type,
        amount: amount,
        currency: "INR",
        merchant: merchant,
        category: "Other",
        date: getTodayString(), // Assumes these functions exist in app.js
        time: getCurrentTime(),
        account: sms.address,
        note: "Auto-detected from SMS",
        source: "sms",
        smsId: sms.date || generateId(),
        createdAt: new Date().toISOString()
    };

    await saveTransaction(transaction);
    
    // Live update the UI if the user is looking at the transactions page
    if (typeof renderTransactions === 'function' && document.getElementById("transactions-page").classList.contains("active")) {
        renderTransactions();
    }
    
    showToast(`₹${amount} ${type} logged via SMS`);
}

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(initSmsTracking, 1000);
});
