function generateDummyTransactions() {
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth(); // 0-indexed

    // Format helper YYYY-MM-DD
    function fmtDate(year, month, day) {
        const m = String(month + 1).padStart(2, "0");
        const d = String(day).padStart(2, "0");
        return `${year}-${m}-${d}`;
    }

    // Previous month calculation
    const prevMonthDate = new Date(curYear, curMonth - 1, 1);
    const prevYear = prevMonthDate.getFullYear();
    const prevMonth = prevMonthDate.getMonth();

    const transactions = [
        // ================= CURRENT MONTH TRANSACTIONS =================
        {
            id: "dummy-c01",
            type: "income",
            amount: 65000,
            currency: "INR",
            merchant: "Monthly Salary",
            category: "Income",
            date: fmtDate(curYear, curMonth, 1),
            time: "09:00",
            account: "HDFC Bank",
            note: "Monthly primary salary credit",
            source: "dummy",
            smsId: null
        },
        {
            id: "dummy-c02",
            type: "expense",
            amount: 4500,
            currency: "INR",
            merchant: "Apartment Maintenance",
            category: "Bills",
            date: fmtDate(curYear, curMonth, 2),
            time: "10:15",
            account: "HDFC Bank",
            note: "Society maintenance & water utility",
            source: "dummy",
            smsId: null
        },
        {
            id: "dummy-c03",
            type: "expense",
            amount: 280,
            currency: "INR",
            merchant: "Blue Tokai Coffee",
            category: "Food",
            date: fmtDate(curYear, curMonth, 2),
            time: "16:40",
            account: "UPI - Google Pay",
            note: "Cold brew & almond croissant",
            source: "dummy",
            smsId: null
        },
        {
            id: "dummy-c04",
            type: "expense",
            amount: 2450,
            currency: "INR",
            merchant: "Nature's Basket",
            category: "Groceries",
            date: fmtDate(curYear, curMonth, 3),
            time: "18:30",
            account: "ICICI Card",
            note: "Fresh vegetables, olive oil & pantry items",
            source: "dummy",
            smsId: null
        },
        {
            id: "dummy-c05",
            type: "expense",
            amount: 380,
            currency: "INR",
            merchant: "Uber Premier",
            category: "Transport",
            date: fmtDate(curYear, curMonth, 3),
            time: "20:10",
            account: "UPI - Google Pay",
            note: "Evening commute from client office",
            source: "dummy",
            smsId: null
        },
        {
            id: "dummy-c06",
            type: "expense",
            amount: 3199,
            currency: "INR",
            merchant: "Amazon India",
            category: "Shopping",
            date: fmtDate(curYear, curMonth, 5),
            time: "14:20",
            account: "ICICI Card",
            note: "Wireless desk accessories & organizer",
            source: "dummy",
            smsId: null
        },
        {
            id: "dummy-c07",
            type: "expense",
            amount: 1850,
            currency: "INR",
            merchant: "Adani Electricity",
            category: "Bills",
            date: fmtDate(curYear, curMonth, 5),
            time: "11:00",
            account: "HDFC Bank",
            note: "Power utility monthly bill payment",
            source: "dummy",
            smsId: null
        },
        {
            id: "dummy-c08",
            type: "expense",
            amount: 420,
            currency: "INR",
            merchant: "Starbucks Coffee",
            category: "Food",
            date: fmtDate(curYear, curMonth, 6),
            time: "17:15",
            account: "UPI - Google Pay",
            note: "Caramel Macchiato & cookie",
            source: "dummy",
            smsId: null
        },
        {
            id: "dummy-c09",
            type: "expense",
            amount: 1850,
            currency: "INR",
            merchant: "Social Offline",
            category: "Food",
            date: fmtDate(curYear, curMonth, 7),
            time: "21:30",
            account: "ICICI Card",
            note: "Team dinner & artisan drinks",
            source: "dummy",
            smsId: null
        },
        {
            id: "dummy-c10",
            type: "expense",
            amount: 2200,
            currency: "INR",
            merchant: "Shell Petrol Station",
            category: "Transport",
            date: fmtDate(curYear, curMonth, 8),
            time: "08:45",
            account: "ICICI Card",
            note: "Vehicle fuel refill",
            source: "dummy",
            smsId: null
        },
        {
            id: "dummy-c11",
            type: "income",
            amount: 18500,
            currency: "INR",
            merchant: "UI Consulting Client",
            category: "Income",
            date: fmtDate(curYear, curMonth, 9),
            time: "15:00",
            account: "HDFC Bank",
            note: "Freelance web design sprint completion",
            source: "dummy",
            smsId: null
        },
        {
            id: "dummy-c12",
            type: "expense",
            amount: 680,
            currency: "INR",
            merchant: "Apollo Pharmacy",
            category: "Health",
            date: fmtDate(curYear, curMonth, 10),
            time: "12:10",
            account: "UPI - Google Pay",
            note: "Prescription vitamins & wellness essentials",
            source: "dummy",
            smsId: null
        },
        {
            id: "dummy-c13",
            type: "expense",
            amount: 580,
            currency: "INR",
            merchant: "Swiggy Gourmet",
            category: "Food",
            date: fmtDate(curYear, curMonth, 11),
            time: "19:50",
            account: "UPI - Google Pay",
            note: "Sourdough artisan pizza delivery",
            source: "dummy",
            smsId: null
        },
        {
            id: "dummy-c14",
            type: "expense",
            amount: 500,
            currency: "INR",
            merchant: "Metro Transit Card",
            category: "Transport",
            date: fmtDate(curYear, curMonth, 11),
            time: "09:30",
            account: "UPI - Google Pay",
            note: "Automated transit card top-up",
            source: "dummy",
            smsId: null
        },
        {
            id: "dummy-c15",
            type: "expense",
            amount: 1800,
            currency: "INR",
            merchant: "Cult.fit Club",
            category: "Health",
            date: fmtDate(curYear, curMonth, 12),
            time: "07:30",
            account: "ICICI Card",
            note: "Monthly gym and yoga pass",
            source: "dummy",
            smsId: null
        },
        {
            id: "dummy-c16",
            type: "expense",
            amount: 848,
            currency: "INR",
            merchant: "Netflix & Spotify",
            category: "Bills",
            date: fmtDate(curYear, curMonth, 12),
            time: "11:25",
            account: "ICICI Card",
            note: "Monthly entertainment subscriptions",
            source: "dummy",
            smsId: null
        },
        {
            id: "dummy-c17",
            type: "expense",
            amount: 2990,
            currency: "INR",
            merchant: "Zara Retail",
            category: "Shopping",
            date: fmtDate(curYear, curMonth, 13),
            time: "16:15",
            account: "ICICI Card",
            note: "Casual cotton wear & linen shirt",
            source: "dummy",
            smsId: null
        },
        {
            id: "dummy-c18",
            type: "expense",
            amount: 320,
            currency: "INR",
            merchant: "Theobroma Patisserie",
            category: "Food",
            date: fmtDate(curYear, curMonth, 13),
            time: "18:40",
            account: "UPI - Google Pay",
            note: "Walnut brownies & cappuccino",
            source: "dummy",
            smsId: null
        },
        {
            id: "dummy-c19",
            type: "expense",
            amount: 1480,
            currency: "INR",
            merchant: "Blinkit Instant Delivery",
            category: "Groceries",
            date: fmtDate(curYear, curMonth, 14),
            time: "11:10",
            account: "UPI - Google Pay",
            note: "Fresh milk, berries, sourdough & eggs",
            source: "dummy",
            smsId: null
        },
        {
            id: "dummy-c20",
            type: "expense",
            amount: 240,
            currency: "INR",
            merchant: "Uber Go",
            category: "Transport",
            date: fmtDate(curYear, curMonth, 14),
            time: "20:30",
            account: "UPI - Google Pay",
            note: "Evening city trip",
            source: "dummy",
            smsId: null
        },
        {
            id: "dummy-c21",
            type: "expense",
            amount: 450,
            currency: "INR",
            merchant: "California Burrito",
            category: "Food",
            date: fmtDate(curYear, curMonth, 15),
            time: "13:20",
            account: "UPI - Google Pay",
            note: "Mexican rice bowl & guacamole",
            source: "dummy",
            smsId: null
        },
        {
            id: "dummy-c22",
            type: "expense",
            amount: 650,
            currency: "INR",
            merchant: "Crossword Bookstore",
            category: "Other",
            date: fmtDate(curYear, curMonth, 15),
            time: "17:45",
            account: "ICICI Card",
            note: "Architecture & design paperback",
            source: "dummy",
            smsId: null
        },

        // ================= PREVIOUS MONTH TRANSACTIONS =================
        {
            id: "dummy-p01",
            type: "income",
            amount: 65000,
            currency: "INR",
            merchant: "Monthly Salary",
            category: "Income",
            date: fmtDate(prevYear, prevMonth, 1),
            time: "09:00",
            account: "HDFC Bank",
            note: "Previous month salary credit",
            source: "dummy",
            smsId: null
        },
        {
            id: "dummy-p02",
            type: "expense",
            amount: 4800,
            currency: "INR",
            merchant: "Amazon Electronics Sale",
            category: "Shopping",
            date: fmtDate(prevYear, prevMonth, 5),
            time: "15:40",
            account: "ICICI Card",
            note: "Ergonomic keyboard & desk lamp",
            source: "dummy",
            smsId: null
        },
        {
            id: "dummy-p03",
            type: "expense",
            amount: 3200,
            currency: "INR",
            merchant: "Blinkit Superstore",
            category: "Groceries",
            date: fmtDate(prevYear, prevMonth, 10),
            time: "11:20",
            account: "UPI - Google Pay",
            note: "Monthly pantry and kitchen restocking",
            source: "dummy",
            smsId: null
        },
        {
            id: "dummy-p04",
            type: "expense",
            amount: 2600,
            currency: "INR",
            merchant: "Taj Gateway Bistro",
            category: "Food",
            date: fmtDate(prevYear, prevMonth, 16),
            time: "20:30",
            account: "ICICI Card",
            note: "Family celebration dinner",
            source: "dummy",
            smsId: null
        },
        {
            id: "dummy-p05",
            type: "expense",
            amount: 3500,
            currency: "INR",
            merchant: "Automobile Service Center",
            category: "Transport",
            date: fmtDate(prevYear, prevMonth, 20),
            time: "14:00",
            account: "HDFC Bank",
            note: "Periodic vehicle inspection & wheel alignment",
            source: "dummy",
            smsId: null
        },
        {
            id: "dummy-p06",
            type: "expense",
            amount: 1199,
            currency: "INR",
            merchant: "Airtel Xstream Fiber",
            category: "Bills",
            date: fmtDate(prevYear, prevMonth, 22),
            time: "10:30",
            account: "HDFC Bank",
            note: "High-speed home broadband plan",
            source: "dummy",
            smsId: null
        },
        {
            id: "dummy-p07",
            type: "expense",
            amount: 1500,
            currency: "INR",
            merchant: "Care Dental Clinic",
            category: "Health",
            date: fmtDate(prevYear, prevMonth, 26),
            time: "16:00",
            account: "ICICI Card",
            note: "Annual dental routine checkup",
            source: "dummy",
            smsId: null
        },
        {
            id: "dummy-p08",
            type: "income",
            amount: 2400,
            currency: "INR",
            merchant: "Mutual Fund Dividend",
            category: "Income",
            date: fmtDate(prevYear, prevMonth, 29),
            time: "12:00",
            account: "HDFC Bank",
            note: "Quarterly portfolio investment dividend",
            source: "dummy",
            smsId: null
        }
    ];

    return transactions;
}

const DUMMY_TRANSACTIONS = generateDummyTransactions();

const DEFAULT_CATEGORIES = [
    // Income Categories
    { id: "income-salary", name: "Salary", type: "income", icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"></rect><line x1="2" y1="10" x2="22" y2="10"></line><circle cx="7" cy="15" r="1"></circle><path d="M14 15h4"></path></svg>` },
    { id: "income-freelance", name: "Freelance", type: "income", icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>` },
    { id: "income-investments", name: "Investments", type: "income", icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>` },
    { id: "income-business", name: "Business", type: "income", icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"></path><path d="M9 8h1"></path><path d="M9 12h1"></path><path d="M9 16h1"></path><path d="M14 8h1"></path><path d="M14 12h1"></path><path d="M14 16h1"></path><path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16"></path></svg>` },
    { id: "income-rental", name: "Rental", type: "income", icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>` },
    { id: "income-refund", name: "Refund & Cashback", type: "income", icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"></polyline><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path></svg>` },
    { id: "income-gifts", name: "Gifts & Grants", type: "income", icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 12 20 22 4 22 4 12"></polyline><rect x="2" y="7" width="20" height="5"></rect><line x1="12" y1="22" x2="12" y2="7"></line><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"></path><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"></path></svg>` },
    { id: "income-other", name: "Other Income", type: "income", icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"></rect><circle cx="12" cy="12" r="2"></circle><path d="M6 12h.01M18 12h.01"></path></svg>` },

    // Expense Categories
    { id: "food", name: "Food", type: "expense", icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8h1a4 4 0 0 1 0 8h-1"></path><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path><line x1="6" y1="1" x2="6" y2="4"></line><line x1="10" y1="1" x2="10" y2="4"></line><line x1="14" y1="1" x2="14" y2="4"></line></svg>` },
    { id: "groceries", name: "Groceries", type: "expense", icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>` },
    { id: "transport", name: "Transport", type: "expense", icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"></path><circle cx="7" cy="17" r="2"></circle><path d="M9 17h6"></path><circle cx="17" cy="17" r="2"></circle></svg>` },
    { id: "shopping", name: "Shopping", type: "expense", icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>` },
    { id: "bills", name: "Bills", type: "expense", icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>` },
    { id: "health", name: "Health", type: "expense", icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg>` },
    { id: "entertainment", name: "Entertainment", type: "expense", icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="6" width="20" height="12" rx="2"></rect><polygon points="10 9 15 12 10 15 10 9"></polygon></svg>` },
    { id: "education", name: "Education", type: "expense", icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>` },
    { id: "travel", name: "Travel", type: "expense", icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.3c.4-.2.6-.6.5-1.1z"></path></svg>` },
    { id: "other", name: "Other", type: "expense", icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>` }
];
