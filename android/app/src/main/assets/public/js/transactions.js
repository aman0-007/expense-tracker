async function loadTransactions() {

    AppState.transactions =
        await dbGetTransactions();

}


async function saveTransaction(data) {

    const transaction = {

        ...data,

        amount: Number(data.amount),

        updatedAt: new Date().toISOString()

    };

    await dbSaveTransaction(transaction);

    const index =
        AppState.transactions.findIndex(
            item => item.id === transaction.id
        );

    if (index >= 0) {

        AppState.transactions[index] =
            transaction;

    } else {

        AppState.transactions.push(transaction);

    }

    AppState.transactions =
        sortTransactions(AppState.transactions);

    renderApplication();

}


async function saveTransactionsBatch(dataList) {
    if (!dataList || dataList.length === 0) return;

    const formattedList = dataList.map(data => ({
        ...data,
        amount: Number(data.amount),
        updatedAt: new Date().toISOString()
    }));

    if (typeof dbSaveTransactionsBatch === "function") {
        await dbSaveTransactionsBatch(formattedList);
    } else {
        for (const item of formattedList) {
            await dbSaveTransaction(item);
        }
    }

    for (const transaction of formattedList) {
        const index = AppState.transactions.findIndex(
            item => item.id === transaction.id
        );
        if (index >= 0) {
            AppState.transactions[index] = transaction;
        } else {
            AppState.transactions.push(transaction);
        }
    }

    AppState.transactions = sortTransactions(AppState.transactions);
    renderApplication();
}


async function deleteTransaction(id) {

    await dbDeleteTransaction(id);

    AppState.transactions =
        AppState.transactions.filter(
            item => item.id !== id
        );

    renderApplication();

}


function getTotals(transactions) {

    let income = 0;
    let expenses = 0;

    transactions.forEach(item => {

        if (item.type === "income") {

            income += Number(item.amount);

        } else {

            expenses += Number(item.amount);

        }

    });

    return {

        income,

        expenses,

        balance: income - expenses

    };

}


function getCategoryTotals(transactions) {

    const totals = {};

    transactions
        .filter(item => item.type === "expense")
        .forEach(item => {

            if (!totals[item.category]) {
                totals[item.category] = 0;
            }

            totals[item.category] +=
                Number(item.amount);

        });

    return totals;

}


function getFilteredTransactions() {

    let result =
        [...AppState.transactions];

    if (AppState.transactionFilter !== "all") {

        result = result.filter(
            item =>
                item.type ===
                AppState.transactionFilter
        );

    }


    if (AppState.dateFilter === "month") {

        result =
            result.filter(item => {

                return isSameMonth(
                    new Date(item.date + "T00:00:00"),
                    new Date()
                );

            });

    }


    if (AppState.dateFilter === "week") {

        result =
            result.filter(item =>
                isThisWeek(item.date)
            );

    }


    if (AppState.searchQuery) {

        const query =
            AppState.searchQuery.toLowerCase();

        result =
            result.filter(item => {

                return [

                    item.merchant,

                    item.category,

                    item.account,

                    item.note

                ]
                    .filter(Boolean)
                    .join(" ")
                    .toLowerCase()
                    .includes(query);

            });

    }

    return sortTransactions(result);

}
