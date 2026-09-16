/* =========================================================
   POPULAR BANK LOGO REGISTRY & HELPERS
   (SBI, HDFC Bank, ICICI Bank, Bank of Baroda, Axis, Kotak, UPI, etc.)
========================================================= */

const BANK_SVGS = {
    // Authentic State Bank of India Keyhole Logo
    sbi: `<svg viewBox="0 0 100 100" width="20" height="20" style="width:20px;height:20px;flex-shrink:0;border-radius:50%;" aria-label="SBI"><circle cx="50" cy="50" r="50" fill="#0082C8"/><circle cx="50" cy="46" r="14.5" fill="#FFFFFF"/><rect x="46" y="46" width="8" height="54" fill="#FFFFFF"/></svg>`,
    
    // Authentic HDFC Bank Grid Logo
    hdfc: `<svg viewBox="0 0 100 100" width="20" height="20" style="width:20px;height:20px;flex-shrink:0;border-radius:4px;" aria-label="HDFC Bank"><rect width="100" height="100" rx="16" fill="#004C8F"/><rect x="12" y="12" width="76" height="76" rx="4" fill="#FFFFFF"/><path d="M 18 18 H 44 V 30 H 30 V 44 H 18 Z M 56 18 H 82 V 44 H 70 V 30 H 56 Z M 18 56 H 30 V 70 H 44 V 82 H 18 Z M 70 56 H 82 V 82 H 56 V 70 H 70 Z" fill="#004C8F"/><rect x="36" y="36" width="28" height="28" rx="2" fill="#ED232A"/></svg>`,
    
    // Authentic ICICI Bank Maroon & Vivid Flame "i" Logo
    icici: `<svg viewBox="0 0 100 100" width="20" height="20" style="width:20px;height:20px;flex-shrink:0;border-radius:4px;" aria-label="ICICI Bank"><rect width="100" height="100" rx="20" fill="#9B1C22"/><path d="M 50 14 C 70 14 86 30 86 50 C 86 64 78 76 66 82 C 64 83 62 82 62 80 C 62 78 63 77 65 75 C 74 69 78 61 78 50 C 78 35 65 22 50 22 C 35 22 22 35 22 50 C 22 62 29 71 38 76 C 39 77 39 79 38 81 C 37 82 35 82 33 81 C 21 75 14 63 14 50 C 14 30 30 14 50 14 Z" fill="#F58220"/><circle cx="50" cy="32" r="7.5" fill="#FFFFFF"/><path d="M 44 44 H 56 V 64 C 56 68.5 53 71 47.5 71 C 44.5 71 42 70 42 70 V 64.5 C 42 64.5 43.5 65.2 45.5 65.2 C 47.5 65.2 48.5 64.2 48.5 62.5 V 44 Z" fill="#FFFFFF"/></svg>`,
    
    // Authentic Bank of Baroda Vermilion Sun Logo
    bob: `<svg viewBox="0 0 100 100" width="20" height="20" style="width:20px;height:20px;flex-shrink:0;border-radius:4px;" aria-label="Bank of Baroda"><rect width="100" height="100" rx="16" fill="#F26522"/><g fill="#FFFFFF"><circle cx="50" cy="50" r="12"/><path d="M 33 28 C 30 33 28 40 28 50 C 28 60 30 67 33 72 C 34 73 34.5 73.5 35 73.5 C 36 73.5 36.5 72.5 36 71 C 33.5 65.5 32 58 32 50 C 32 42 33.5 34.5 36 29 C 36.5 27.5 36 26.5 35 26.5 C 34.5 26.5 34 27 33 28 Z"/><path d="M 40 32 C 38 37 36.5 43 36.5 50 C 36.5 57 38 63 40 68 C 40.5 69 41.5 69 42 68 C 42.5 67 42 66 41.5 65 C 40 60.5 39 55.5 39 50 C 39 44.5 40 39.5 41.5 35 C 42 34 42.5 33 42 32 C 41.5 31 40.5 31 40 32 Z"/><path d="M 67 28 C 70 33 72 40 72 50 C 72 60 70 67 67 72 C 66 73 65.5 73.5 65 73.5 C 64 73.5 63.5 72.5 64 71 C 66.5 65.5 68 58 68 50 C 68 42 66.5 34.5 64 29 C 63.5 27.5 64 26.5 65 26.5 C 65.5 26.5 66 27 67 28 Z"/><path d="M 60 32 C 62 37 63.5 43 63.5 50 C 63.5 57 62 63 60 68 C 59.5 69 58.5 69 58 68 C 57.5 67 58 66 58.5 65 C 60 60.5 61 55.5 61 50 C 61 44.5 60 39.5 58.5 35 C 58 34 57.5 33 58 32 C 58.5 31 59.5 31 60 32 Z"/><rect x="47.5" y="20" width="5" height="12" rx="2.5"/><rect x="47.5" y="68" width="5" height="12" rx="2.5"/></g></svg>`,

    // Axis Bank Burgundy Badge
    axis: `<svg viewBox="0 0 100 100" width="20" height="20" style="width:20px;height:20px;flex-shrink:0;border-radius:4px;" aria-label="Axis Bank"><rect width="100" height="100" rx="16" fill="#97144D"/><path d="M 50 18 L 82 82 H 62 L 50 56 L 38 82 H 18 Z M 50 40 L 58 56 H 42 Z" fill="#FFFFFF"/></svg>`,

    // Kotak Mahindra Bank
    kotak: `<svg viewBox="0 0 100 100" width="20" height="20" style="width:20px;height:20px;flex-shrink:0;border-radius:4px;" aria-label="Kotak Bank"><rect width="100" height="100" rx="16" fill="#ED1C24"/><path d="M 32 38 C 24 38 18 44 18 50 C 18 56 24 62 32 62 C 42 62 50 50 50 50 C 50 50 58 38 68 38 C 76 38 82 44 82 50 C 82 56 76 62 68 62 C 58 62 50 50 50 50 C 50 50 42 62 32 62 Z" fill="none" stroke="#FFFFFF" stroke-width="8" stroke-linecap="round"/></svg>`,

    // UPI Payment
    upi: `<svg viewBox="0 0 24 24" width="20" height="20" style="width:20px;height:20px;flex-shrink:0;" fill="none" stroke="#00B074" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-label="UPI"><rect x="5" y="2" width="14" height="20" rx="3"></rect><path d="M12 18h.01"></path><path d="M13 7l-3 4.5h3.5L11 15" stroke="#00B074" stroke-width="2"></path></svg>`,

    // Card
    card: `<svg viewBox="0 0 24 24" width="20" height="20" style="width:20px;height:20px;flex-shrink:0;" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-label="Card"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>`,

    // Cash
    cash: `<svg viewBox="0 0 24 24" width="20" height="20" style="width:20px;height:20px;flex-shrink:0;" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-label="Cash"><rect x="2" y="6" width="20" height="12" rx="2"></rect><circle cx="12" cy="12" r="2"></circle><path d="M6 12h.01M18 12h.01"></path></svg>`
};

function getBankIcon(accountName) {
    if (!accountName) return BANK_SVGS.card;
    const lower = accountName.toLowerCase();
    
    if (lower.includes("sbi") || lower.includes("state bank")) {
        return BANK_SVGS.sbi;
    }
    if (lower.includes("hdfc")) {
        return BANK_SVGS.hdfc;
    }
    if (lower.includes("icici")) {
        return BANK_SVGS.icici;
    }
    if (lower.includes("bob") || lower.includes("baroda")) {
        return BANK_SVGS.bob;
    }
    if (lower.includes("axis")) {
        return BANK_SVGS.axis;
    }
    if (lower.includes("kotak")) {
        return BANK_SVGS.kotak;
    }
    if (lower.includes("upi") || lower.includes("gpay") || lower.includes("phonepe") || lower.includes("paytm")) {
        return BANK_SVGS.upi;
    }
    if (lower.includes("cash")) {
        return BANK_SVGS.cash;
    }
    return BANK_SVGS.card;
}
