/* =========================================================
   POPULAR BANK LOGO REGISTRY & HELPERS
   (SBI, HDFC Bank, ICICI Bank, Bank of Baroda, etc.)
========================================================= */

const BANK_SVGS = {
    sbi: `<svg viewBox="0 0 100 100" width="100%" height="100%"><defs><linearGradient id="sbi-inline-grad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#0091DF" /><stop offset="100%" stop-color="#0066A2" /></linearGradient></defs><circle cx="50" cy="50" r="48" fill="url(#sbi-inline-grad)" /><circle cx="50" cy="42" r="15" fill="#FFFFFF" /><rect x="45.5" y="42" width="9" height="42" rx="4.5" fill="#FFFFFF" /><circle cx="50" cy="42" r="3.5" fill="url(#sbi-inline-grad)" /></svg>`,
    
    hdfc: `<svg viewBox="0 0 100 100" width="100%" height="100%"><rect width="100" height="100" rx="16" fill="#004C8F" /><rect x="12" y="12" width="76" height="76" rx="4" fill="#FFFFFF" /><path d="M 18 18 H 44 V 30 H 30 V 44 H 18 Z" fill="#004C8F" /><path d="M 56 18 H 82 V 44 H 70 V 30 H 56 Z" fill="#004C8F" /><path d="M 18 56 H 30 V 70 H 44 V 82 H 18 Z" fill="#004C8F" /><path d="M 70 56 H 82 V 82 H 56 V 70 H 70 Z" fill="#004C8F" /><rect x="36" y="36" width="28" height="28" rx="2" fill="#ED232A" /></svg>`,
    
    icici: `<svg viewBox="0 0 100 100" width="100%" height="100%"><defs><linearGradient id="icici-inline-bg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#C8232B" /><stop offset="100%" stop-color="#A51A24" /></linearGradient><linearGradient id="icici-inline-flame" x1="0%" y1="100%" x2="100%" y2="0%"><stop offset="0%" stop-color="#F58220" /><stop offset="100%" stop-color="#FDB913" /></linearGradient></defs><rect width="100" height="100" rx="16" fill="url(#icici-inline-bg)" /><path d="M 50 14 C 70 14 86 30 86 50 C 86 64 78 76 66 82 C 64 83 62 82 62 80 C 62 78 63 77 65 75 C 75 70 80 61 80 50 C 80 34 66 20 50 20 C 34 20 20 34 20 50 C 20 62 27 72 37 77 C 39 78 39 80 38 82 C 37 83 35 83 33 82 C 21 76 14 64 14 50 C 14 30 30 14 50 14 Z" fill="url(#icici-inline-flame)" opacity="0.9" /><circle cx="50" cy="34" r="6.5" fill="#FFFFFF" /><path d="M 44 46 C 44 44.5 45.5 44 47 44 L 53 44 C 54.5 44 56 44.5 56 46 L 56 68 C 56 71 58 72 61 72 C 62 72 63 73 63 74 C 63 75.5 61.5 76 59 76 C 54 76 50 73 49 69 L 45 69 C 44 69 44 67.5 44 67.5 L 44 46 Z" fill="#FFFFFF" /></svg>`,
    
    bob: `<svg viewBox="0 0 100 100" width="100%" height="100%"><defs><linearGradient id="bob-inline-bg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#FF6B1A" /><stop offset="100%" stop-color="#E84F00" /></linearGradient></defs><rect width="100" height="100" rx="16" fill="url(#bob-inline-bg)" /><g fill="#FFFFFF"><circle cx="50" cy="50" r="12" /><path d="M 33 28 C 30 33 28 40 28 50 C 28 60 30 67 33 72 C 34 73 34.5 73.5 35 73.5 C 36 73.5 36.5 72.5 36 71 C 33.5 65.5 32 58 32 50 C 32 42 33.5 34.5 36 29 C 36.5 27.5 36 26.5 35 26.5 C 34.5 26.5 34 27 33 28 Z" /><path d="M 40 32 C 38 37 36.5 43 36.5 50 C 36.5 57 38 63 40 68 C 40.5 69 41.5 69 42 68 C 42.5 67 42 66 41.5 65 C 40 60.5 39 55.5 39 50 C 39 44.5 40 39.5 41.5 35 C 42 34 42.5 33 42 32 C 41.5 31 40.5 31 40 32 Z" /><path d="M 67 28 C 70 33 72 40 72 50 C 72 60 70 67 67 72 C 66 73 65.5 73.5 65 73.5 C 64 73.5 63.5 72.5 64 71 C 66.5 65.5 68 58 68 50 C 68 42 66.5 34.5 64 29 C 63.5 27.5 64 26.5 65 26.5 C 65.5 26.5 66 27 67 28 Z" /><path d="M 60 32 C 62 37 63.5 43 63.5 50 C 63.5 57 62 63 60 68 C 59.5 69 58.5 69 58 68 C 57.5 67 58 66 58.5 65 C 60 60.5 61 55.5 61 50 C 61 44.5 60 39.5 58.5 35 C 58 34 57.5 33 58 32 C 58.5 31 59.5 31 60 32 Z" /><rect x="47.5" y="20" width="5" height="12" rx="2.5" /><rect x="47.5" y="68" width="5" height="12" rx="2.5" /></g></svg>`,

    upi: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>`,

    card: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>`,

    cash: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"></rect><circle cx="12" cy="12" r="2"></circle><path d="M6 12h.01M18 12h.01"></path></svg>`
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
    if (lower.includes("upi") || lower.includes("gpay") || lower.includes("phonepe") || lower.includes("paytm")) {
        return BANK_SVGS.upi;
    }
    if (lower.includes("cash")) {
        return BANK_SVGS.cash;
    }
    return BANK_SVGS.card;
}
