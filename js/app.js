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

    if (budget !== undefined) {

        AppState.settings.budget =
            Number(budget);

    }

    if (appearance !== undefined) {

        AppState.settings.appearance =
            appearance;

    }

}


async function initializeDummyData() {

    const existing =
        await dbGetTransactions();

    if (existing.length > 0) {
        return;
    }

    for (
        const transaction
        of DUMMY_TRANSACTIONS
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


    const titles = {

        home: "Overview",

        transactions: "Transactions",

        analysis: "Analysis",

        settings: "Settings"

    };


    


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
            document.getElementById(
                "categoryInput"
            ).value,

        category:
            document.getElementById(
                "categoryInput"
            ).value,

        date:
            document.getElementById(
                "dateInput"
            ).value,

        time:
            document.getElementById(
                "timeInput"
            ).value,

        account:
            document.getElementById(
                "accountInput"
            ).value.trim(),

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
            : "Transaction added"
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

    document
        .getElementById(
            "monthlyBudgetSetting"
        )
        .addEventListener(
            "click",
            changeBudget
        );


    document
        .getElementById(
            "budgetBtn"
        )
        .addEventListener(
            "click",
            changeBudget
        );


    document
        .getElementById(
            "appearanceSetting"
        )
        .addEventListener(
            "click",
            toggleAppearance
        );


    document
        .getElementById(
            "exportDataBtn"
        )
        .addEventListener(
            "click",
            exportData
        );


    document
        .getElementById(
            "importDataBtn"
        )
        .addEventListener(
            "click",
            () => {

                document
                    .getElementById(
                        "importFile"
                    )
                    .click();

            }
        );


    document
        .getElementById(
            "importFile"
        )
        .addEventListener(
            "change",
            importData
        );


    document
        .getElementById(
            "clearDataBtn"
        )
        .addEventListener(
            "click",
            clearAllData
        );


    document
        .getElementById(
            "manageCategoriesBtn"
        )
        .addEventListener(
            "click",
            () => {

                showToast(
                    "Category management coming next"
                );

            }
        );


    document
        .getElementById(
            "currencySetting"
        )
        .addEventListener(
            "click",
            () => {

                showToast(
                    "INR is currently selected"
                );

            }
        );

}


async function changeBudget() {

    const current =
        AppState.settings.budget;

    const input =
        prompt(
            "Enter your monthly budget:",
            current
        );


    if (input === null) return;


    const budget =
        Number(input);


    if (
        !Number.isFinite(budget) ||
        budget < 0
    ) {

        showToast(
            "Enter a valid budget"
        );

        return;

    }


    AppState.settings.budget =
        budget;


    await dbSetSetting(
        "monthlyBudget",
        budget
    );


    renderApplication();

    showToast(
        "Budget updated"
    );

}


async function toggleAppearance() {

    /*
       For now the application is designed
       around the dark theme.

       The setting is already persisted,
       so a full light theme can be added
       without changing the data layer.
    */

    showToast(
        "Dark appearance is currently active"
    );

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
   CLEAR DATA
========================================================= */

async function clearAllData() {

    const confirmed =
        confirm(
            "This will permanently delete all transactions from this device. Continue?"
        );


    if (!confirmed) return;


    await dbClearTransactions();

    AppState.transactions = [];

    renderApplication();

    showToast(
        "All transactions deleted"
    );

}

/* Inject Dummy Data for Native Testing */
async function loadDummyData() {
    try {
        for (const tx of DUMMY_TRANSACTIONS) {
            await saveTransaction(tx);
        }
        alert("Test data injected successfully!");
        window.location.reload();
    } catch (e) {
        console.error("Failed to load data:", e);
        alert("Error loading data. Check console.");
    }
}
