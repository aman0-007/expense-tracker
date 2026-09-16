const DB_NAME = "ExpenseTrackerDB";
const DB_VERSION = 1;

let dbInstance = null;


function openDatabase() {

    return new Promise((resolve, reject) => {

        if (dbInstance) {
            resolve(dbInstance);
            return;
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => {
            reject(request.error);
        };

        request.onupgradeneeded = event => {

            const db = event.target.result;

            if (!db.objectStoreNames.contains("transactions")) {

                const store = db.createObjectStore(
                    "transactions",
                    { keyPath: "id" }
                );

                store.createIndex(
                    "date",
                    "date",
                    { unique: false }
                );

                store.createIndex(
                    "type",
                    "type",
                    { unique: false }
                );

                store.createIndex(
                    "category",
                    "category",
                    { unique: false }
                );
            }


            if (!db.objectStoreNames.contains("categories")) {

                db.createObjectStore(
                    "categories",
                    { keyPath: "id" }
                );
            }


            if (!db.objectStoreNames.contains("settings")) {

                db.createObjectStore(
                    "settings",
                    { keyPath: "id" }
                );
            }

        };


        request.onsuccess = () => {

            dbInstance = request.result;

            resolve(dbInstance);
        };

    });

}


/* =========================
   TRANSACTIONS
========================= */

async function dbGetTransactions() {

    const db = await openDatabase();

    return new Promise((resolve, reject) => {

        const transaction = db.transaction(
            "transactions",
            "readonly"
        );

        const store = transaction.objectStore(
            "transactions"
        );

        const request = store.getAll();

        request.onsuccess = () => {
            resolve(request.result || []);
        };

        request.onerror = () => {
            reject(request.error);
        };

    });

}


async function dbSaveTransaction(transactionData) {

    const db = await openDatabase();

    return new Promise((resolve, reject) => {

        const transaction = db.transaction(
            "transactions",
            "readwrite"
        );

        const store = transaction.objectStore(
            "transactions"
        );

        const request = store.put(transactionData);

        request.onsuccess = () => {
            resolve(transactionData);
        };

        request.onerror = () => {
            reject(request.error);
        };

    });

}


async function dbDeleteTransaction(id) {

    const db = await openDatabase();

    return new Promise((resolve, reject) => {

        const transaction = db.transaction(
            "transactions",
            "readwrite"
        );

        const store = transaction.objectStore(
            "transactions"
        );

        const request = store.delete(id);

        request.onsuccess = () => {
            resolve(true);
        };

        request.onerror = () => {
            reject(request.error);
        };

    });

}


async function dbClearTransactions() {

    const db = await openDatabase();

    return new Promise((resolve, reject) => {

        const transaction = db.transaction(
            "transactions",
            "readwrite"
        );

        const store = transaction.objectStore(
            "transactions"
        );

        const request = store.clear();

        request.onsuccess = () => {
            resolve(true);
        };

        request.onerror = () => {
            reject(request.error);
        };

    });

}


/* =========================
   SETTINGS
========================= */

async function dbGetSetting(id) {

    const db = await openDatabase();

    return new Promise((resolve, reject) => {

        const transaction = db.transaction(
            "settings",
            "readonly"
        );

        const store = transaction.objectStore(
            "settings"
        );

        const request = store.get(id);

        request.onsuccess = () => {

            resolve(
                request.result
                    ? request.result.value
                    : undefined
            );

        };

        request.onerror = () => {
            reject(request.error);
        };

    });

}


async function dbSetSetting(id, value) {

    const db = await openDatabase();

    return new Promise((resolve, reject) => {

        const transaction = db.transaction(
            "settings",
            "readwrite"
        );

        const store = transaction.objectStore(
            "settings"
        );

        const request = store.put({
            id,
            value
        });

        request.onsuccess = () => {
            resolve(value);
        };

        request.onerror = () => {
            reject(request.error);
        };

    });

}


/* =========================
   CATEGORIES
========================= */

async function dbGetCategories() {

    const db = await openDatabase();

    return new Promise((resolve, reject) => {

        const transaction = db.transaction(
            "categories",
            "readonly"
        );

        const store = transaction.objectStore(
            "categories"
        );

        const request = store.getAll();

        request.onsuccess = () => {
            resolve(request.result || []);
        };

        request.onerror = () => {
            reject(request.error);
        };

    });

}


async function dbSaveCategory(category) {

    const db = await openDatabase();

    return new Promise((resolve, reject) => {

        const transaction = db.transaction(
            "categories",
            "readwrite"
        );

        const store = transaction.objectStore(
            "categories"
        );

        const request = store.put(category);

        request.onsuccess = () => {
            resolve(category);
        };

        request.onerror = () => {
            reject(request.error);
        };

    });

}
