function formatCurrency(amount) {

    return new Intl.NumberFormat(
        "en-IN",
        {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 0
        }
    ).format(amount || 0);

}


function formatDate(dateString) {

    const date = new Date(
        dateString + "T00:00:00"
    );

    return date.toLocaleDateString(
        "en-IN",
        {
            day: "numeric",
            month: "short",
            year: "numeric"
        }
    );

}


function formatShortDate(dateString) {

    const date = new Date(
        dateString + "T00:00:00"
    );

    return date.toLocaleDateString(
        "en-IN",
        {
            day: "numeric",
            month: "short"
        }
    );

}


function formatDateGroup(dateString) {

    const today = new Date();

    const date = new Date(
        dateString + "T00:00:00"
    );

    const todayString =
        today.toISOString().slice(0, 10);

    if (dateString === todayString) {
        return "TODAY";
    }

    const yesterday = new Date(today);

    yesterday.setDate(
        yesterday.getDate() - 1
    );

    const yesterdayString =
        yesterday.toISOString().slice(0, 10);

    if (dateString === yesterdayString) {
        return "YESTERDAY";
    }

    return date.toLocaleDateString(
        "en-IN",
        {
            day: "numeric",
            month: "short",
            year: "numeric"
        }
    ).toUpperCase();

}


function generateId() {

    return (
        Date.now().toString(36) +
        Math.random().toString(36).slice(2, 8)
    );

}


function getTodayString() {

    const now = new Date();

    const offset =
        now.getTimezoneOffset() * 60000;

    return new Date(
        now.getTime() - offset
    ).toISOString().slice(0, 10);

}


function getCurrentTime() {

    const now = new Date();

    return now.toTimeString().slice(0, 5);

}


function getCategoryIcon(categoryName) {

    const category =
        AppState.categories.find(
            item => item.name === categoryName
        );

    return category
        ? category.icon
        : "📦";

}


function getMonthTransactions() {

    const now = new Date();

    const year = now.getFullYear();

    const month =
        String(now.getMonth() + 1).padStart(2, "0");

    return AppState.transactions.filter(item => {

        return item.date.startsWith(
            `${year}-${month}`
        );

    });

}


function sortTransactions(list) {

    return [...list].sort((a, b) => {

        const first =
            `${a.date} ${a.time || "00:00"}`;

        const second =
            `${b.date} ${b.time || "00:00"}`;

        return second.localeCompare(first);

    });

}


function escapeHTML(value) {

    if (value === null || value === undefined) {
        return "";
    }

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}


function debounce(callback, delay = 200) {

    let timeout;

    return (...args) => {

        clearTimeout(timeout);

        timeout = setTimeout(
            () => callback(...args),
            delay
        );

    };

}


function getDateDaysAgo(days) {

    const date = new Date();

    date.setDate(
        date.getDate() - days
    );

    return date;

}


function isSameMonth(dateA, dateB) {

    return (
        dateA.getFullYear() === dateB.getFullYear() &&
        dateA.getMonth() === dateB.getMonth()
    );

}


function isThisWeek(dateString) {

    const date =
        new Date(dateString + "T00:00:00");

    const now = new Date();

    const start = new Date(now);

    const day = start.getDay();

    const difference =
        day === 0 ? 6 : day - 1;

    start.setDate(
        start.getDate() - difference
    );

    start.setHours(0, 0, 0, 0);

    return date >= start && date <= now;

}


function showToast(message) {

    const toast =
        document.getElementById("toast");

    const text =
        document.getElementById("toastMessage");

    text.textContent = message;

    toast.classList.add("show");

    clearTimeout(showToast.timeout);

    showToast.timeout =
        setTimeout(() => {

            toast.classList.remove("show");

        }, 2200);

}
