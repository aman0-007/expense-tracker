/* =========================================================
   EXPENSE TRACKER
   Main Application Controller
========================================================= */


document.addEventListener(
    "DOMContentLoaded",
    initApplication
);


async function initApplication() {

    try {

        await openDatabase();

        await initializeCategories();

        await initializeSettings();

        await initializeDummyData();

        await loadTransactions();

        AppState.transactions =
            sortTransactions(
                AppState.transactions
            );

        populateCategories();

        setupNavigation();

        setupTransactionControls();

        setupFilters();

        setupSettings();

        if (typeof setupAnalyticsControls === "function") {
            setupAnalyticsControls();
        }

        renderApplication();

        showPage("home");

    } catch (error) {

        console.error(
            "Application initialization failed:",
            error
        );

        showToast(
            "Unable to initialize application"
        );

    }

}


/* =========================================================
   INITIALIZATION
========================================================= */

async function initializeCategories() {

    let categories =
        await dbGetCategories();

    if (!categories.length) {

        for (
            const category
            of DEFAULT_CATEGORIES
        ) {

            await dbSaveCategory(
                category
            );

        }

        categories =
            await dbGetCategories();

    } else {
        // Upgrade stored categories with modern vector SVGs and seed missing income/expense categories
        for (const cat of categories) {
            const match = DEFAULT_CATEGORIES.find(d => d.name.toLowerCase() === (cat.name || "").toLowerCase());
            if (match) {
                if (!cat.icon || !cat.icon.trim().startsWith("<svg")) {
                    cat.icon = match.icon;
                }
                if (!cat.type && match.type) {
                    cat.type = match.type;
                }
                await dbSaveCategory(cat);
            }
        }

        // Add any missing default categories (e.g. Salary, Freelance, Investments)
        for (const defCat of DEFAULT_CATEGORIES) {
            const exists = categories.some(c => c.name.toLowerCase() === defCat.name.toLowerCase());
            if (!exists) {
                await dbSaveCategory(defCat);
            }
        }

        categories = await dbGetCategories();
    }

    AppState.categories =
        categories;

}


async function initializeSettings() {

    const budget =
        await dbGetSetting(
            "monthlyBudget"
        );

    const appearance =
        await dbGetSetting(
            "appearance"
        );

    const currency =
        await dbGetSetting(
            "currency"
        );

    if (budget !== undefined) {
        AppState.settings.budget = Number(budget);
    } else {
        AppState.settings.budget = 35000;
    }

    if (appearance !== undefined) {
        AppState.settings.appearance = appearance;
    } else {
        AppState.settings.appearance = "light";
    }

    if (currency !== undefined) {
        AppState.settings.currency = currency;
    } else {
        AppState.settings.currency = "₹";
    }

    // Apply active theme
    const theme = AppState.settings.appearance === "dark" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", theme);
    document.body.setAttribute("data-theme", theme);

}


async function initializeDummyData() {

    const existing =
        await dbGetTransactions();

    const isOldMinimalDummy =
        existing.length > 0 &&
        existing.length <= 4 &&
        existing.every(t => t.source === "dummy" || (t.id && t.id.startsWith("dummy-")));

    if (existing.length > 0 && !isOldMinimalDummy) {
        return;
    }

    if (isOldMinimalDummy) {
        for (const t of existing) {
            await dbDeleteTransaction(t.id);
        }
    }

    const dummyList = typeof generateDummyTransactions === "function" 
        ? generateDummyTransactions() 
        : DUMMY_TRANSACTIONS;

    for (
        const transaction
        of dummyList
    ) {

        await dbSaveTransaction({
            ...transaction,
            createdAt:
                new Date().toISOString(),
            updatedAt:
                new Date().toISOString()
        });

    }

}


/* =========================================================
   NAVIGATION
========================================================= */

function setupNavigation() {

    document
        .querySelectorAll(".nav-item")
        .forEach(item => {

            item.addEventListener(
                "click",
                () => {

                    showPage(
                        item.dataset.page
                    );

                }
            );

        });


    document
        .getElementById("viewAllBtn")
        .addEventListener(
            "click",
            () => showPage("transactions")
        );

}


function showPage(page) {

    AppState.currentPage =
        page;


    document
        .querySelectorAll(".page")
        .forEach(section => {

            section.classList.toggle(
                "active",
                section.id === `${page}-page`
            );

        });


    document
        .querySelectorAll(".nav-item")
        .forEach(item => {

            item.classList.toggle(
                "active",
                item.dataset.page === page
            );

        });


    // Hide floating action button on settings and analysis pages
    const floatingAdd = document.getElementById("floatingAddBtn");
    if (floatingAdd) {
        floatingAdd.style.display = (page === "home" || page === "transactions") ? "flex" : "none";
    }

    const pageContainer = document.getElementById("page-container");
    if (pageContainer) {
        pageContainer.scrollTop = 0;
    }

    if (page === "analysis" && typeof renderAnalytics === "function") {
        renderAnalytics();
    }

    window.scrollTo(0, 0);

}


/* =========================================================
   TRANSACTION CONTROLS
========================================================= */

function setupTransactionControls() {

    document
        .getElementById(
            "floatingAddBtn"
        )
        .addEventListener(
            "click",
            () => openTransactionForm(
                "expense"
            )
        );


    document
        .getElementById(
            "addExpenseBtn"
        )
        .addEventListener(
            "click",
            () => openTransactionForm(
                "expense"
            )
        );


    document
        .getElementById(
            "addIncomeBtn"
        )
        .addEventListener(
            "click",
            () => openTransactionForm(
                "income"
            )
        );


    document
        .getElementById(
            "closeTransactionModal"
        )
        .addEventListener(
            "click",
            () => {

                closeModal(
                    document.getElementById(
                        "transactionModal"
                    )
                );

            }
        );


    document
        .getElementById(
            "closeDetailsModal"
        )
        .addEventListener(
            "click",
            () => {

                closeModal(
                    document.getElementById(
                        "detailsModal"
                    )
                );

            }
        );


    document
        .querySelectorAll(".type-button")
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    setTransactionType(
                        button.dataset.type
                    );

                }
            );

        });


    document
        .getElementById(
            "transactionForm"
        )
        .addEventListener(
            "submit",
            handleTransactionSubmit
        );


    document
        .getElementById(
            "editTransactionBtn"
        )
        .addEventListener(
            "click",
            editSelectedTransaction
        );


    document
        .getElementById(
            "deleteTransactionBtn"
        )
        .addEventListener(
            "click",
            deleteSelectedTransaction
        );


    document
        .getElementById(
            "transactionModal"
        )
        .addEventListener(
            "click",
            event => {

                if (
                    event.target.id ===
                    "transactionModal"
                ) {

                    closeModal(
                        event.currentTarget
                    );

                }

            }
        );


    document
        .getElementById(
            "detailsModal"
        )
        .addEventListener(
            "click",
            event => {

                if (
                    event.target.id ===
                    "detailsModal"
                ) {

                    closeModal(
                        event.currentTarget
                    );

                }

            }
        );

}


async function handleTransactionSubmit(
    event
) {

    event.preventDefault();


    const amount =
        Number(
            document.getElementById(
                "amountInput"
            ).value
        );


    if (!amount || amount <= 0) {

        showToast(
            "Enter a valid amount"
        );

        return;

    }


    const transaction = {

        id:
            AppState.editingTransactionId ||
            generateId(),

        type:
            AppState.transactionType,

        amount,

        currency:
            "INR",

        merchant:
            document.getElementById(
                "merchantInput"
            ).value.trim() ||
            (AppState.transactionType === "income" ? (document.getElementById("categoryInput").value || "Income Source") : (document.getElementById("categoryInput").value || "Expense")),

        category:
            document.getElementById(
                "categoryInput"
            ).value ||
            (AppState.transactionType === "income" ? "Salary" : "Other"),

        date:
            document.getElementById(
                "dateInput"
            ).value || getTodayString(),

        time:
            document.getElementById(
                "timeInput"
            ).value || getCurrentTime(),

        account:
            document.getElementById(
                "accountInput"
            ).value.trim() ||
            (AppState.transactionType === "income" ? "HDFC Bank" : "UPI"),

        note:
            document.getElementById(
                "noteInput"
            ).value.trim(),

        source:
            "manual",

        smsId:
            null

    };


    const isEditing =
        Boolean(
            AppState.editingTransactionId
        );


    if (!isEditing) {

        transaction.createdAt =
            new Date().toISOString();

    }


    await saveTransaction(
        transaction
    );


    closeModal(
        document.getElementById(
            "transactionModal"
        )
    );


    resetTransactionForm();


    showToast(
        isEditing
            ? "Transaction updated"
            : (transaction.type === "income" ? "Income logged successfully" : "Expense recorded successfully")
    );

}


function editSelectedTransaction() {

    const transaction =
        AppState.transactions.find(
            item =>
                item.id ===
                AppState.selectedTransactionId
        );

    if (!transaction) return;

    closeModal(
        document.getElementById(
            "detailsModal"
        )
    );

    openTransactionForm(
        transaction.type,
        transaction
    );

}


async function deleteSelectedTransaction() {

    const id =
        AppState.selectedTransactionId;

    if (!id) return;


    const transaction =
        AppState.transactions.find(
            item => item.id === id
        );


    if (!transaction) return;


    const confirmed =
        confirm(
            `Delete "${transaction.merchant}"?`
        );


    if (!confirmed) {
        return;
    }


    await deleteTransaction(id);


    closeModal(
        document.getElementById(
            "detailsModal"
        )
    );


    showToast(
        "Transaction deleted"
    );

}


/* =========================================================
   FILTERS
========================================================= */

function setupFilters() {

    document
        .querySelectorAll(
            "[data-filter]"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    document
                        .querySelectorAll(
                            "[data-filter]"
                        )
                        .forEach(item =>
                            item.classList.remove(
                                "active"
                            )
                        );

                    button.classList.add(
                        "active"
                    );

                    AppState.transactionFilter =
                        button.dataset.filter;

                    renderTransactions();

                }
            );

        });


    document
        .querySelectorAll(
            "[data-date-filter]"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    document
                        .querySelectorAll(
                            "[data-date-filter]"
                        )
                        .forEach(item =>
                            item.classList.remove(
                                "active"
                            )
                        );

                    button.classList.add(
                        "active"
                    );

                    AppState.dateFilter =
                        button.dataset.dateFilter;

                    renderTransactions();

                }
            );

        });


    document
        .getElementById(
            "transactionSearch"
        )
        .addEventListener(
            "input",
            debounce(
                event => {

                    AppState.searchQuery =
                        event.target.value.trim();

                    renderTransactions();

                },
                150
            )
        );

}


/* =========================================================
   SETTINGS
========================================================= */

function setupSettings() {

    // Budget modal triggers
    const budgetTriggers = ["monthlyBudgetSetting", "budgetBtn"];
    budgetTriggers.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener("click", openBudgetModal);
    });

    // Appearance toggle
    const appEl = document.getElementById("appearanceSetting");
    if (appEl) appEl.addEventListener("click", toggleAppearance);

    // Currency selector modal
    const currEl = document.getElementById("currencySetting");
    if (currEl) currEl.addEventListener("click", openCurrencyModal);

    // Category management modal
    const catEl = document.getElementById("manageCategoriesBtn");
    if (catEl) catEl.addEventListener("click", openCategoriesModal);

    // Sample data loader
    const loadSampleBtn = document.getElementById("loadSampleDataBtn");
    if (loadSampleBtn) loadSampleBtn.addEventListener("click", reloadSampleData);

    // Data export & import
    const exportBtn = document.getElementById("exportDataBtn");
    if (exportBtn) exportBtn.addEventListener("click", exportData);

    const importBtn = document.getElementById("importDataBtn");
    const importFileInput = document.getElementById("importFile");
    if (importBtn && importFileInput) {
        importBtn.addEventListener("click", () => importFileInput.click());
        importFileInput.addEventListener("change", importData);
    }

    // Clear data confirmation modal
    const clearBtn = document.getElementById("clearDataBtn");
    if (clearBtn) clearBtn.addEventListener("click", openClearModal);

    // Setup Budget Modal Events
    const closeBudgetBtn = document.getElementById("closeBudgetModalBtn");
    const cancelBudgetBtn = document.getElementById("cancelBudgetBtn");
    const saveBudgetBtn = document.getElementById("saveBudgetBtn");
    if (closeBudgetBtn) closeBudgetBtn.addEventListener("click", () => closeModal("budgetModal"));
    if (cancelBudgetBtn) cancelBudgetBtn.addEventListener("click", () => closeModal("budgetModal"));
    if (saveBudgetBtn) saveBudgetBtn.addEventListener("click", saveBudget);

    document.querySelectorAll("[data-budget-val]").forEach(chip => {
        chip.addEventListener("click", () => {
            const input = document.getElementById("budgetInput");
            if (input) input.value = chip.dataset.budgetVal;
        });
    });

    // Setup Currency Modal Events
    const closeCurrModalBtn = document.getElementById("closeCurrencyModalBtn");
    const closeCurrBtn = document.getElementById("closeCurrencyBtn");
    if (closeCurrModalBtn) closeCurrModalBtn.addEventListener("click", () => closeModal("currencyModal"));
    if (closeCurrBtn) closeCurrBtn.addEventListener("click", () => closeModal("currencyModal"));

    document.querySelectorAll(".currency-option").forEach(btn => {
        btn.addEventListener("click", () => {
            selectCurrency(btn.dataset.currency);
        });
    });

    // Setup Category Modal Events
    const closeCatBtn = document.getElementById("closeCategoriesModalBtn");
    if (closeCatBtn) closeCatBtn.addEventListener("click", () => closeModal("categoriesModal"));

    const addCatBtn = document.getElementById("addNewCategoryBtn");
    if (addCatBtn) addCatBtn.addEventListener("click", addCustomCategory);

    // Setup Clear Confirm Modal Events
    const closeClearBtn = document.getElementById("closeClearModalBtn");
    const cancelClearBtn = document.getElementById("cancelClearBtn");
    const confirmClearBtn = document.getElementById("confirmClearBtn");
    if (closeClearBtn) closeClearBtn.addEventListener("click", () => closeModal("clearConfirmModal"));
    if (cancelClearBtn) cancelClearBtn.addEventListener("click", () => closeModal("clearConfirmModal"));
    if (confirmClearBtn) confirmClearBtn.addEventListener("click", executeClearAllData);

}


function openBudgetModal() {
    const input = document.getElementById("budgetInput");
    if (input) {
        input.value = AppState.settings.budget || 35000;
    }
    openModal("budgetModal");
}

async function saveBudget() {
    const input = document.getElementById("budgetInput");
    const val = Number(input.value);

    if (!Number.isFinite(val) || val <= 0) {
        showToast("Enter a valid budget amount");
        return;
    }

    AppState.settings.budget = val;
    await dbSetSetting("monthlyBudget", val);

    closeModal("budgetModal");
    renderApplication();
    showToast("Monthly budget updated");
}

async function toggleAppearance() {
    const nextTheme = AppState.settings.appearance === "dark" ? "light" : "dark";
    AppState.settings.appearance = nextTheme;
    await dbSetSetting("appearance", nextTheme);

    document.documentElement.setAttribute("data-theme", nextTheme);
    document.body.setAttribute("data-theme", nextTheme);

    updateSettingsUI();
    renderAnalytics();
    showToast(`Switched to ${nextTheme} theme`);
}

function openCurrencyModal() {
    const current = AppState.settings.currency || "₹";
    document.querySelectorAll(".currency-option").forEach(btn => {
        btn.classList.toggle("selected", btn.dataset.currency === current);
    });
    openModal("currencyModal");
}

async function selectCurrency(symbol) {
    AppState.settings.currency = symbol;
    await dbSetSetting("currency", symbol);
    closeModal("currencyModal");
    renderApplication();
    showToast(`Currency set to ${symbol}`);
}

function openCategoriesModal() {
    renderModalCategories();
    openModal("categoriesModal");
}

function renderModalCategories() {
    const list = document.getElementById("modalCategoriesList");
    if (!list) return;
    list.innerHTML = "";

    AppState.categories.forEach(cat => {
        const row = document.createElement("div");
        row.className = "category-manage-item";
        row.innerHTML = `
            <div class="cat-left">
                <span class="cat-icon">${cat.icon || "🏷️"}</span>
                <div>
                    <strong style="font-size: 0.95rem; color: var(--text-main);">${escapeHTML(cat.name)}</strong>
                    <span style="display: block; font-size: 0.75rem; color: var(--text-muted);">${cat.custom ? "Custom" : "Default"}</span>
                </div>
            </div>
            ${cat.custom ? `<button type="button" class="cat-delete" data-cat-id="${cat.id}">Delete</button>` : ""}
        `;
        list.appendChild(row);
    });

    list.querySelectorAll(".cat-delete").forEach(btn => {
        btn.addEventListener("click", async () => {
            const catId = btn.dataset.catId;
            AppState.categories = AppState.categories.filter(c => c.id !== catId);
            await dbDeleteCategory(catId);
            populateCategories();
            renderModalCategories();
            showToast("Category removed");
        });
    });
}

async function addCustomCategory() {
    const input = document.getElementById("newCategoryName");
    const name = (input.value || "").trim();

    if (!name) {
        showToast("Please enter a category name");
        return;
    }

    if (AppState.categories.some(c => c.name.toLowerCase() === name.toLowerCase())) {
        showToast("Category already exists");
        return;
    }

    const newCat = {
        id: "cat-" + Date.now().toString(36),
        name: name,
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"></circle><path d="M12 8v8M8 12h8"></path></svg>`,
        custom: true
    };

    AppState.categories.push(newCat);
    await dbSaveCategory(newCat);

    input.value = "";
    populateCategories();
    renderModalCategories();
    showToast(`Added "${name}" category`);
}

function openClearModal() {
    openModal("clearConfirmModal");
}


/* =========================================================
   EXPORT
========================================================= */

async function exportData() {

    const data = {

        version: 1,

        exportedAt:
            new Date().toISOString(),

        settings:
            AppState.settings,

        categories:
            AppState.categories,

        transactions:
            AppState.transactions

    };


    const blob =
        new Blob(
            [
                JSON.stringify(
                    data,
                    null,
                    2
                )
            ],
            {
                type:
                    "application/json"
            }
        );


    const url =
        URL.createObjectURL(blob);


    const link =
        document.createElement("a");

    link.href = url;

    link.download =
        `expense-tracker-backup-${getTodayString()}.json`;

    document.body.appendChild(link);

    link.click();

    link.remove();

    URL.revokeObjectURL(url);


    showToast(
        "Backup exported"
    );

}


/* =========================================================
   IMPORT
========================================================= */

async function importData(event) {

    const file =
        event.target.files[0];

    if (!file) return;


    try {

        const text =
            await file.text();

        const data =
            JSON.parse(text);


        if (
            !data ||
            !Array.isArray(
                data.transactions
            )
        ) {

            throw new Error(
                "Invalid backup"
            );

        }


        const confirmed =
            confirm(
                "Import this backup? Existing transactions with the same IDs will be replaced."
            );


        if (!confirmed) return;


        for (
            const transaction
            of data.transactions
        ) {

            await dbSaveTransaction(
                transaction
            );

        }


        if (
            data.settings &&
            typeof data.settings ===
            "object"
        ) {

            if (
                data.settings.budget !==
                undefined
            ) {

                await dbSetSetting(
                    "monthlyBudget",
                    data.settings.budget
                );

            }

        }


        if (data.categories) {

            for (
                const category
                of data.categories
            ) {

                await dbSaveCategory(
                    category
                );

            }

        }


        await loadTransactions();

        AppState.transactions =
            sortTransactions(
                AppState.transactions
            );


        await initializeCategories();

        await initializeSettings();

        populateCategories();

        renderApplication();


        showToast(
            "Backup imported"
        );


    } catch (error) {

        console.error(error);

        showToast(
            "Invalid backup file"
        );

    }


    event.target.value = "";

}


/* =========================================================
   CLEAR DATA & RELOAD DUMMY
========================================================= */

async function executeClearAllData() {

    try {
        await dbClearTransactions();
        AppState.transactions = [];
        closeModal("clearConfirmModal");
        renderApplication();
        showToast("All transactions deleted");
    } catch (error) {
        console.error("Failed to clear data:", error);
        showToast("Failed to delete transactions");
    }

}

async function reloadSampleData() {

    try {
        const dummyList = typeof generateDummyTransactions === "function" 
            ? generateDummyTransactions() 
            : DUMMY_TRANSACTIONS;

        // Clear existing transactions first
        await dbClearTransactions();

        for (const transaction of dummyList) {
            await dbSaveTransaction({
                ...transaction,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });
        }

        await loadTransactions();
        renderApplication();
        showToast("Sample transactions loaded!");
    } catch (error) {
        console.error("Failed to reload sample data:", error);
        showToast("Error loading sample data");
    }

}
