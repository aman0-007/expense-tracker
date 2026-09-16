function renderApplication() {

    updateHome();

    renderTransactions();

    renderAnalytics();

    updateSettingsUI();

}


function updateHome() {

    const monthEl = document.getElementById("current-month");
    if (monthEl) {
        monthEl.textContent = getCurrentMonthName();
    }

    const monthTransactions =
        getMonthTransactions();

    const totals =
        getTotals(monthTransactions);

    document.getElementById(
        "total-balance"
    ).textContent =
        formatCurrency(totals.balance);

    document.getElementById(
        "total-income"
    ).textContent =
        formatCurrency(totals.income);

    document.getElementById(
        "total-expenses"
    ).textContent =
        formatCurrency(totals.expenses);


    const budget =
        Number(AppState.settings.budget);

    const percentage =
        budget > 0
            ? Math.min(
                100,
                (totals.expenses / budget) * 100
            )
            : 0;

    document.getElementById(
        "budget-spent"
    ).textContent =
        formatCurrency(totals.expenses);

    document.getElementById(
        "budget-total"
    ).textContent =
        formatCurrency(budget);

    document.getElementById(
        "budget-progress"
    ).style.width =
        `${percentage}%`;

    document.getElementById(
        "budget-percent"
    ).textContent =
        `${Math.round(percentage)}% used`;

    document.getElementById(
        "budget-remaining"
    ).textContent =
        `${formatCurrency(
            Math.max(0, budget - totals.expenses)
        )} remaining`;


    const recent =
        sortTransactions(
            AppState.transactions
        ).slice(0, 5);

    renderTransactionList(
        recent,
        document.getElementById(
            "recent-transactions"
        )
    );

    renderHomeCategories(
        monthTransactions
    );

}


function renderHomeCategories(transactions) {

    const container =
        document.getElementById(
            "home-categories"
        );

    container.innerHTML = "";

    const totals =
        getCategoryTotals(transactions);

    const entries =
        Object.entries(totals)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);

    const total =
        entries.reduce(
            (sum, [, amount]) =>
                sum + amount,
            0
        );


    if (!entries.length) {

        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:32px;height:32px;margin:auto;"><rect x="3" y="12" width="4" height="9" rx="1"></rect><rect x="10" y="7" width="4" height="14" rx="1"></rect><rect x="17" y="3" width="4" height="18" rx="1"></rect></svg>
                </div>
                <strong>No spending yet</strong>
                <span>Your category breakdown will appear here.</span>
            </div>
        `;

        return;
    }


    entries.forEach(
        ([category, amount]) => {

            const percentage =
                total
                    ? Math.round(
                        amount / total * 100
                    )
                    : 0;

            const row =
                document.createElement("div");

            row.className =
                "category-row";

            row.innerHTML = `

                <div class="category-icon">
                    ${getCategoryIcon(category)}
                </div>

                <div class="category-info">

                    <strong>
                        ${escapeHTML(category)}
                    </strong>

                    <span>
                        ${percentage}% of spending
                    </span>

                    <div class="category-progress">
                        <span
                            style="width:${percentage}%"
                        ></span>
                    </div>

                </div>

                <div class="category-amount">
                    ${formatCurrency(amount)}
                </div>

            `;

            container.appendChild(row);

        }
    );

}


function renderTransactions() {

    const container =
        document.getElementById(
            "all-transactions"
        );

    container.innerHTML = "";

    const transactions =
        getFilteredTransactions();


    if (!transactions.length) {

        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:32px;height:32px;margin:auto;"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                </div>
                <strong>No transactions found</strong>
                <span>Try changing your filters or search.</span>
            </div>
        `;

        return;

    }


    let currentDate = null;


    transactions.forEach(transaction => {

        if (
            transaction.date !== currentDate
        ) {

            currentDate =
                transaction.date;

            const heading =
                document.createElement("div");

            heading.className =
                "date-heading";

            heading.textContent =
                formatDateGroup(
                    transaction.date
                );

            container.appendChild(
                heading
            );

        }


        const item =
            createTransactionElement(
                transaction
            );

        container.appendChild(item);

    });

}


function renderTransactionList(
    transactions,
    container
) {

    container.innerHTML = "";

    if (!transactions.length) {

        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:32px;height:32px;margin:auto;"><rect x="1" y="4" width="22" height="16" rx="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
                </div>
                <strong>No transactions yet</strong>
                <span>Add your first transaction.</span>
            </div>
        `;

        return;

    }


    transactions.forEach(transaction => {

        container.appendChild(
            createTransactionElement(
                transaction
            )
        );

    });

}


function createTransactionElement(
    transaction
) {

    const item =
        document.createElement("div");

    item.className =
        "transaction-item";

    const sign =
        transaction.type === "income"
            ? "+"
            : "−";

    const amountClass =
        transaction.type === "income"
            ? "income"
            : "expense";


    item.innerHTML = `

        <div class="transaction-icon">
            ${getCategoryIcon(transaction.category)}
        </div>

        <div class="transaction-info">

            <strong>
                ${escapeHTML(
                    transaction.merchant ||
                    transaction.category
                )}
            </strong>

            <span>
                ${escapeHTML(transaction.category)}
                ·
                ${formatShortDate(transaction.date)}
                ${transaction.time
                    ? " · " + transaction.time
                    : ""}
                ${transaction.account ? ` · <span class="tx-account-badge">${typeof getBankIcon === "function" ? getBankIcon(transaction.account) : ""} <span>${escapeHTML(transaction.account)}</span></span>` : ""}
            </span>

        </div>

        <div class="transaction-amount ${amountClass}">
            ${sign}${formatCurrency(transaction.amount)}
        </div>

    `;


    item.addEventListener(
        "click",
        () => openDetails(transaction.id)
    );


    return item;

}


function openDetails(id) {

    const transaction =
        AppState.transactions.find(
            item => item.id === id
        );

    if (!transaction) return;

    AppState.selectedTransactionId =
        id;


    document.getElementById(
        "detailsMerchant"
    ).textContent =
        transaction.merchant ||
        transaction.category;

    const amount =
        document.getElementById(
            "detailsAmount"
        );

    amount.textContent =
        `${transaction.type === "income" ? "+" : "−"}${formatCurrency(transaction.amount)}`;

    amount.className =
        "details-amount " +
        (
            transaction.type === "income"
                ? "amount-positive"
                : "amount-negative"
        );

    const typeEl = document.getElementById("detailsType");
    typeEl.textContent =
        transaction.type === "income"
            ? "Income"
            : "Expense";
    typeEl.className =
        "details-type " +
        (
            transaction.type === "income"
                ? "type-income"
                : "type-expense"
        );

    document.getElementById(
        "detailsCategory"
    ).textContent =
        transaction.category || "—";

    document.getElementById(
        "detailsDate"
    ).textContent =
        formatDate(transaction.date);

    document.getElementById(
        "detailsTime"
    ).textContent =
        transaction.time || "—";

    const detailsAccountEl = document.getElementById("detailsAccount");
    if (detailsAccountEl) {
        if (transaction.account) {
            const icon = typeof getBankIcon === "function" ? getBankIcon(transaction.account) : "";
            detailsAccountEl.innerHTML = `<span class="details-account-chip">${icon}<span>${escapeHTML(transaction.account)}</span></span>`;
        } else {
            detailsAccountEl.textContent = "—";
        }
    }

    document.getElementById(
        "detailsNote"
    ).textContent =
        transaction.note || "—";

    const detailsSourceEl = document.getElementById("detailsSource");
    if (detailsSourceEl) {
        if (transaction.source === "sms") {
            detailsSourceEl.innerHTML = `<span class="details-source-badge source-sms"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg> SMS Detected</span>`;
        } else {
            detailsSourceEl.innerHTML = `<span class="details-source-badge">Manual Entry</span>`;
        }
    }


    openModal(
        document.getElementById(
            "detailsModal"
        )
    );

}


function updateSettingsUI() {

    const budgetEl = document.getElementById("settingsBudgetValue");
    if (budgetEl) {
        budgetEl.textContent = formatCurrency(AppState.settings.budget);
    }

    const appValEl = document.getElementById("appearanceValue");
    if (appValEl) {
        appValEl.textContent = AppState.settings.appearance === "dark" ? "Dark mode" : "Light mode";
    }

    const currIconEl = document.getElementById("settingsCurrencyIcon");
    if (currIconEl) {
        currIconEl.textContent = AppState.settings.currency || "₹";
    }

    const currValEl = document.getElementById("settingsCurrencyValue");
    if (currValEl) {
        const currNames = {
            "₹": "Indian Rupee (₹)",
            "$": "US Dollar ($)",
            "€": "Euro (€)",
            "£": "British Pound (£)",
            "¥": "Japanese Yen (¥)"
        };
        currValEl.textContent = currNames[AppState.settings.currency] || `${AppState.settings.currency}`;
    }

    // Synchronize data-theme on document root
    const theme = AppState.settings.appearance === "dark" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", theme);
    document.body.setAttribute("data-theme", theme);

    // Update all currency-symbol inline spans
    document.querySelectorAll(".currency-symbol").forEach(el => {
        el.textContent = AppState.settings.currency || "₹";
    });

}


function populateCategories() {
    const select = document.getElementById("categoryInput");
    const chipsContainer = document.getElementById("categoryChipsGrid");
    if (!select) return;

    const currentVal = select.value;
    select.innerHTML = "";
    if (chipsContainer) chipsContainer.innerHTML = "";

    const type = AppState.transactionType || "expense";
    
    const filtered = (AppState.categories || []).filter(cat => {
        const isIncome = (cat.name || "").toLowerCase() === "income" || cat.type === "income";
        return type === "income" ? isIncome : !isIncome;
    });

    filtered.forEach(category => {
        // Dropdown option
        const option = document.createElement("option");
        option.value = category.name;
        option.textContent = category.name;
        select.appendChild(option);

        // Visual Chip Button
        if (chipsContainer) {
            const chip = document.createElement("button");
            chip.type = "button";
            chip.className = "cat-pill";
            chip.dataset.category = category.name;
            const iconSvg = typeof getCategoryIcon === "function" ? getCategoryIcon(category.name) : "";
            chip.innerHTML = `<span class="cat-pill-icon">${iconSvg}</span><span>${category.name}</span>`;
            
            chip.addEventListener("click", () => {
                select.value = category.name;
                updateActiveCategoryChip(category.name);
            });
            chipsContainer.appendChild(chip);
        }
    });
    
    let activeVal = "";
    if (filtered.some(c => c.name === currentVal)) {
        select.value = currentVal;
        activeVal = currentVal;
    } else if (filtered.length > 0) {
        select.value = filtered[0].name;
        activeVal = filtered[0].name;
    }

    updateActiveCategoryChip(activeVal);
}

function updateActiveCategoryChip(categoryName) {
    const chips = document.querySelectorAll(".cat-pill");
    chips.forEach(chip => {
        const isMatch = (chip.dataset.category || "").toLowerCase() === (categoryName || "").toLowerCase();
        chip.classList.toggle("active", isMatch);
    });
}

function updateSuggestionsBar(type) {
    const container = document.getElementById("merchantSuggestionsBar");
    if (!container) return;

    const expenseSuggestions = [
        { name: "Groceries", cat: "Groceries" },
        { name: "Swiggy / Food", cat: "Food" },
        { name: "Amazon Shopping", cat: "Shopping" },
        { name: "Uber / Fuel", cat: "Transport" },
        { name: "Electricity Bill", cat: "Bills" },
        { name: "Pharmacy / Meds", cat: "Health" },
        { name: "Movies & Outing", cat: "Entertainment" }
    ];

    const incomeSuggestions = [
        { name: "Monthly Salary", cat: "Salary" },
        { name: "Freelance Project", cat: "Freelance" },
        { name: "Stock Dividend", cat: "Investments" },
        { name: "Business Revenue", cat: "Business" },
        { name: "Rental Income", cat: "Rental" },
        { name: "Cashback / Refund", cat: "Refund & Cashback" },
        { name: "Consulting Fee", cat: "Freelance" }
    ];

    const list = type === "income" ? incomeSuggestions : expenseSuggestions;
    container.innerHTML = "";

    list.forEach(item => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "sugg-chip";
        btn.textContent = item.name;
        btn.addEventListener("click", () => {
            const input = document.getElementById("merchantInput");
            if (input) {
                input.value = item.name;
            }
            // Auto-select matching category if available
            const catSelect = document.getElementById("categoryInput");
            if (catSelect && item.cat) {
                const opt = Array.from(catSelect.options).find(o => o.value.toLowerCase() === item.cat.toLowerCase());
                if (opt) {
                    catSelect.value = opt.value;
                    updateActiveCategoryChip(opt.value);
                }
            }
        });
        container.appendChild(btn);
    });
}

function updateAccountChipsActiveState(accountName) {
    const chips = document.querySelectorAll(".account-chip");
    const isIncome = AppState.transactionType === "income";
    chips.forEach(chip => {
        const chipAcc = chip.dataset.account || "";
        const matches = accountName && chipAcc.toLowerCase() === accountName.trim().toLowerCase();
        chip.classList.toggle("active", Boolean(matches));
        chip.classList.toggle("income-active", Boolean(matches && isIncome));
    });
}

function openModal(modal) {
    const el = typeof modal === "string" ? document.getElementById(modal) : modal;
    if (!el) return;
    el.classList.add("active");
    document.body.classList.add("modal-open");
}

function closeModal(modal) {
    const el = typeof modal === "string" ? document.getElementById(modal) : modal;
    if (!el) return;
    el.classList.remove("active");
    document.body.classList.remove("modal-open");
}


function openTransactionForm(
    type = "expense",
    transaction = null
) {

    const modal =
        document.getElementById(
            "transactionModal"
        );

    AppState.editingTransactionId =
        transaction
            ? transaction.id
            : null;

    const actualType = transaction ? transaction.type : type;
    setTransactionType(actualType);

    const titleEl = document.getElementById("modalTitle");
    const subEl = document.getElementById("modalSubtitle");
    
    if (titleEl) {
        titleEl.textContent = transaction
            ? (actualType === "income" ? "Edit Income" : "Edit Expense")
            : (actualType === "income" ? "Add Income" : "Add Expense");
    }

    if (subEl) {
        subEl.textContent = actualType === "income" ? "Income Inflow" : "Expense Outflow";
    }

    const amountInput = document.getElementById("amountInput");
    if (amountInput) {
        amountInput.value = transaction?.amount || "";
    }

    const merchantInput = document.getElementById("merchantInput");
    if (merchantInput) {
        merchantInput.value = transaction?.merchant || "";
    }

    const categoryInput = document.getElementById("categoryInput");
    if (categoryInput) {
        categoryInput.value = transaction?.category || (actualType === "income" ? "Salary" : "Food");
        updateActiveCategoryChip(categoryInput.value);
    }

    const dateInput = document.getElementById("dateInput");
    if (dateInput) {
        dateInput.value = transaction?.date || getTodayString();
    }

    const timeInput = document.getElementById("timeInput");
    if (timeInput) {
        timeInput.value = transaction?.time || getCurrentTime();
    }

    const accountInput = document.getElementById("accountInput");
    if (accountInput) {
        accountInput.value = transaction?.account || (actualType === "income" ? "HDFC Bank" : "UPI");
        updateAccountChipsActiveState(accountInput.value);
    }

    const noteInput = document.getElementById("noteInput");
    if (noteInput) {
        noteInput.value = transaction?.note || "";
    }

    openModal(modal);
}


function setTransactionType(type) {
    AppState.transactionType = type;
    
    // Toggle active state on buttons
    document.querySelectorAll(".type-button").forEach(button => {
        button.classList.toggle("active", button.dataset.type === type);
    });

    // Update modal subtitle & badge styling
    const badge = document.getElementById("modalTypeBadge");
    const subtitle = document.getElementById("modalSubtitle");
    const title = document.getElementById("modalTitle");
    const merchantLabel = document.getElementById("merchantLabelText");
    const merchantInput = document.getElementById("merchantInput");
    const saveBtn = document.getElementById("saveTransactionBtn");
    const amountHeroCard = document.querySelector(".amount-hero-card");

    const isIncome = type === "income";

    if (badge) {
        badge.classList.toggle("income-mode", isIncome);
    }
    if (subtitle) {
        subtitle.textContent = isIncome ? "Income Inflow" : "Expense Outflow";
    }
    if (title) {
        const isEdit = Boolean(AppState.editingTransactionId);
        title.textContent = isEdit
            ? (isIncome ? "Edit Income" : "Edit Expense")
            : (isIncome ? "Add Income" : "Add Expense");
    }
    if (merchantLabel) {
        merchantLabel.textContent = isIncome ? "Received From / Source" : "Paid To / Merchant";
    }
    if (merchantInput) {
        merchantInput.placeholder = isIncome ? "e.g. Employer, Client Name, Dividend..." : "e.g. Swiggy, Amazon, Groceries...";
    }
    if (saveBtn) {
        const isEdit = Boolean(AppState.editingTransactionId);
        saveBtn.textContent = isEdit
            ? (isIncome ? "Update Income" : "Update Expense")
            : (isIncome ? "Save Income" : "Save Expense");
        saveBtn.classList.toggle("income-btn", isIncome);
    }
    if (amountHeroCard) {
        amountHeroCard.classList.toggle("income-focus", isIncome);
    }

    populateCategories();
    updateSuggestionsBar(type);

    const accountInput = document.getElementById("accountInput");
    if (accountInput) {
        updateAccountChipsActiveState(accountInput.value);
    }
}

function initTransactionFormInteractions() {
    // Quick Amount chips
    document.querySelectorAll(".quick-amt-chip").forEach(btn => {
        btn.addEventListener("click", () => {
            const addVal = Number(btn.dataset.amt) || 0;
            const amountInput = document.getElementById("amountInput");
            if (!amountInput) return;
            const current = Number(amountInput.value) || 0;
            amountInput.value = current + addVal;
            amountInput.focus();
        });
    });

    const clearAmtBtn = document.getElementById("clearAmountBtn");
    if (clearAmtBtn) {
        clearAmtBtn.addEventListener("click", () => {
            const amountInput = document.getElementById("amountInput");
            if (amountInput) {
                amountInput.value = "";
                amountInput.focus();
            }
        });
    }

    // Account chips click handling
    document.querySelectorAll(".account-chip").forEach(chip => {
        chip.addEventListener("click", () => {
            const accountInput = document.getElementById("accountInput");
            const accName = chip.dataset.account;
            if (accountInput) {
                accountInput.value = accName;
            }
            updateAccountChipsActiveState(accName);
        });
    });

    // Account input live sync with chips
    const accountInput = document.getElementById("accountInput");
    if (accountInput) {
        accountInput.addEventListener("input", () => {
            updateAccountChipsActiveState(accountInput.value);
        });
    }

    // Category select live sync with chips
    const categoryInput = document.getElementById("categoryInput");
    if (categoryInput) {
        categoryInput.addEventListener("change", () => {
            updateActiveCategoryChip(categoryInput.value);
        });
    }
}

// Automatically bind interactions when DOM is ready
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initTransactionFormInteractions);
} else {
    initTransactionFormInteractions();
}

function resetTransactionForm() {

    AppState.editingTransactionId =
        null;

    const form = document.getElementById("transactionForm");
    if (form) form.reset();

    setTransactionType("expense");

    const dateInput = document.getElementById("dateInput");
    if (dateInput) dateInput.value = getTodayString();

    const timeInput = document.getElementById("timeInput");
    if (timeInput) timeInput.value = getCurrentTime();

    updateAccountChipsActiveState("");
}
