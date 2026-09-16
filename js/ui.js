function renderApplication() {

    updateHome();

    renderTransactions();

    renderAnalytics();

    updateSettingsUI();

}


function updateHome() {

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
                <div class="empty-state-icon">📊</div>
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
                <div class="empty-state-icon">🔎</div>
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
                <div class="empty-state-icon">💳</div>
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


    document.getElementById(
        "detailsType"
    ).textContent =
        transaction.type === "income"
            ? "Income"
            : "Expense";


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

    document.getElementById(
        "detailsAccount"
    ).textContent =
        transaction.account || "—";

    document.getElementById(
        "detailsNote"
    ).textContent =
        transaction.note || "—";

    document.getElementById(
        "detailsSource"
    ).textContent =
        transaction.source === "sms"
            ? "SMS"
            : "Demo data";


    openModal(
        document.getElementById(
            "detailsModal"
        )
    );

}


function updateSettingsUI() {

    document.getElementById(
        "settingsBudgetValue"
    ).textContent =
        formatCurrency(
            AppState.settings.budget
        );

    document.getElementById(
        "appearanceValue"
    ).textContent =
        AppState.settings.appearance === "dark"
            ? "Dark"
            : "System default";

}


function populateCategories() {
    const select = document.getElementById("categoryInput");
    const currentVal = select.value;
    select.innerHTML = "";
    const type = AppState.transactionType;
    
    const filtered = AppState.categories.filter(cat => {
        const isIncome = cat.name.toLowerCase() === "income" || cat.type === "income";
        return type === "income" ? isIncome : !isIncome;
    });

    filtered.forEach(category => {
        const option = document.createElement("option");
        option.value = category.name;
        option.textContent = category.name;
        select.appendChild(option);
    });
    
    if (filtered.some(c => c.name === currentVal)) {
        select.value = currentVal;
    } else if (filtered.length > 0) {
        select.value = filtered[0].name;
    }
}

function openModal(modal) {

    modal.classList.add("active");

    document.body.classList.add(
        "modal-open"
    );

}


function closeModal(modal) {

    modal.classList.remove("active");

    document.body.classList.remove(
        "modal-open"
    );

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

    setTransactionType(
        transaction
            ? transaction.type
            : type
    );


    document.getElementById(
        "modalTitle"
    ).textContent =
        transaction
            ? "Edit Transaction"
            : (
                type === "income"
                    ? "Add Income"
                    : "Add Expense"
            );


    document.getElementById(
        "modalSubtitle"
    ).textContent =
        transaction
            ? "Update transaction"
            : "New transaction";


    document.getElementById(
        "amountInput"
    ).value =
        transaction?.amount || "";


    document.getElementById(
        "merchantInput"
    ).value =
        transaction?.merchant || "";


    document.getElementById(
        "categoryInput"
    ).value =
        transaction?.category ||
        AppState.categories[0]?.name ||
        "Other";


    document.getElementById(
        "dateInput"
    ).value =
        transaction?.date ||
        getTodayString();


    document.getElementById(
        "timeInput"
    ).value =
        transaction?.time ||
        getCurrentTime();


    document.getElementById(
        "accountInput"
    ).value =
        transaction?.account || "";


    document.getElementById(
        "noteInput"
    ).value =
        transaction?.note || "";


    openModal(modal);

}


function setTransactionType(type) {
    AppState.transactionType = type;
    document.querySelectorAll(".type-button").forEach(button => {
        button.classList.toggle("active", button.dataset.type === type);
    });
    populateCategories();
}

function resetTransactionForm() {

    AppState.editingTransactionId =
        null;

    document.getElementById(
        "transactionForm"
    ).reset();

    setTransactionType("expense");

    document.getElementById(
        "dateInput"
    ).value =
        getTodayString();

    document.getElementById(
        "timeInput"
    ).value =
        getCurrentTime();

}
