let spendingChartInstance = null;
let categoryChartInstance = null;

// Zen UI Theme Color Palette
const themeColors = {
    expense: '#E07A5F',
    income: '#4E876C',
    text: '#2C363F',
    textMuted: '#6B7280',
    grid: '#E3E8E1',
    palette: ['#E07A5F', '#4E876C', '#2C363F', '#D0694E', '#8CA396', '#6B7280', '#D4D9D2']
};

function renderAnalytics() {
    const monthTransactions = getMonthTransactions();
    const totals = getTotals(monthTransactions);

    document.getElementById("analysis-expense").textContent = formatCurrency(totals.expenses);
    document.getElementById("analysis-income").textContent = formatCurrency(totals.income);

    renderSpendingChart(monthTransactions);
    renderCategoryChart(monthTransactions);
    renderInsights(monthTransactions, totals);
}

function renderSpendingChart(transactions) {
    const ctx = document.getElementById('spendingChartCanvas');
    if (!ctx) return;

    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const labels = [];
    const data = [];

    for (let day = 1; day <= daysInMonth; day++) {
        labels.push(day);
        const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        const amount = transactions
            .filter(item => item.type === "expense" && item.date === date)
            .reduce((sum, item) => sum + Number(item.amount), 0);
        data.push(amount);
    }

    if (spendingChartInstance) spendingChartInstance.destroy();

    spendingChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Daily Spending',
                data: data,
                backgroundColor: themeColors.expense,
                borderRadius: 4,
                borderSkipped: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: themeColors.text,
                    padding: 12,
                    titleFont: { family: 'Inter', size: 13, weight: 'normal' },
                    bodyFont: { family: 'Inter', size: 15, weight: 'bold' },
                    displayColors: false,
                    callbacks: { label: (context) => formatCurrency(context.raw) }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: themeColors.grid, drawBorder: false },
                    border: { display: false },
                    ticks: {
                        color: themeColors.textMuted,
                        font: { family: 'Inter', size: 11 },
                        maxTicksLimit: 5,
                        callback: (value) => '₹' + (value >= 1000 ? (value/1000) + 'k' : value)
                    }
                },
                x: {
                    grid: { display: false, drawBorder: false },
                    border: { display: false },
                    ticks: {
                        color: themeColors.textMuted,
                        font: { family: 'Inter', size: 11 },
                        maxTicksLimit: 7
                    }
                }
            }
        }
    });
}

function renderCategoryChart(transactions) {
    const ctx = document.getElementById('categoryChartCanvas');
    if (!ctx) return;

    const totals = getCategoryTotals(transactions);
    const entries = Object.entries(totals).sort((a, b) => b[1] - a[1]);

    const labels = entries.map(e => e[0]);
    const data = entries.map(e => e[1]);

    if (categoryChartInstance) categoryChartInstance.destroy();

    const isDataEmpty = data.length === 0;
    const chartData = isDataEmpty ? [1] : data;
    const chartColors = isDataEmpty ? [themeColors.grid] : themeColors.palette;

    categoryChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: isDataEmpty ? ['No Data'] : labels,
            datasets: [{
                data: chartData,
                backgroundColor: chartColors,
                borderWidth: 0,
                cutout: '75%',
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    enabled: !isDataEmpty,
                    backgroundColor: themeColors.text,
                    padding: 12,
                    bodyFont: { family: 'Inter', size: 14, weight: 'bold' },
                    displayColors: true,
                    callbacks: { label: (context) => ' ' + formatCurrency(context.raw) }
                }
            }
        }
    });

    const legendContainer = document.getElementById('category-legend');
    legendContainer.innerHTML = '';
    
    if (!isDataEmpty) {
        entries.forEach(([category, amount], index) => {
            const color = themeColors.palette[index % themeColors.palette.length];
            legendContainer.innerHTML += `
                <div class="legend-item">
                    <span class="legend-dot" style="background-color: ${color}"></span>
                    <span>${escapeHTML(category)}</span>
                    <strong>${formatCurrency(amount)}</strong>
                </div>
            `;
        });
    }
}

function renderInsights(transactions, totals) {
    const container = document.getElementById("insights");
    container.innerHTML = "";
    const insights = [];

    if (totals.expenses === 0) {
        insights.push("💡 No expenses have been recorded this month yet.");
    } else {
        const categoryTotals = getCategoryTotals(transactions);
        const entries = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);

        if (entries.length) {
            const [category, amount] = entries[0];
            const percentage = Math.round((amount / totals.expenses) * 100);
            insights.push(`💡 <strong>${category}</strong> is your largest spending category at ${percentage}% of your expenses.`);
        }

        if (totals.expenses < AppState.settings.budget) {
            const remaining = AppState.settings.budget - totals.expenses;
            insights.push(`🎯 You have <strong>${formatCurrency(remaining)}</strong> remaining in your monthly budget.`);
        } else {
            insights.push("⚠️ You have exceeded your monthly budget.");
        }
    }

    insights.forEach(message => {
        const card = document.createElement("div");
        card.style.cssText = "background-color: var(--surface); padding: 16px; border-radius: var(--radius-md); border: 1px solid var(--border-soft); margin-bottom: 12px; font-size: 0.9rem; color: var(--text-main); line-height: 1.5;";
        card.innerHTML = message;
        container.appendChild(card);
    });
}
