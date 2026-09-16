/* =========================================================
   EXPENSE TRACKER - ANALYTICS & ADVANCED CHARTS
========================================================= */

const chartInstances = {
    spending: null,
    category: null,
    cashflow: null,
    weekday: null,
    accounts: null
};

let currentAnalyticsData = {
    list: [],
    totals: { income: 0, expenses: 0, balance: 0 },
    label: "",
    daysCount: 30
};

function getThemeColors() {
    const isDark = document.documentElement.getAttribute("data-theme") === "dark";
    return {
        isDark,
        expense: isDark ? '#E57373' : '#E07A5F',
        expenseSubtle: isDark ? 'rgba(229, 115, 115, 0.22)' : 'rgba(224, 122, 95, 0.18)',
        expenseGradient: isDark ? 'rgba(229, 115, 115, 0.05)' : 'rgba(224, 122, 95, 0.03)',
        income: isDark ? '#4EAA7E' : '#3E8E68',
        incomeSubtle: isDark ? 'rgba(78, 170, 126, 0.22)' : 'rgba(62, 142, 104, 0.18)',
        savings: isDark ? '#64B5F6' : '#3D5A80',
        savingsSubtle: isDark ? 'rgba(100, 181, 246, 0.22)' : 'rgba(61, 90, 128, 0.18)',
        accent: isDark ? '#FFB74D' : '#F4A261',
        text: isDark ? '#F3F4F6' : '#2C363F',
        textMuted: isDark ? '#9CA3AF' : '#6B7280',
        grid: isDark ? 'rgba(255,255,255,0.06)' : '#E6EAE4',
        surface: isDark ? '#1A1E26' : '#FFFFFF',
        palette: isDark 
            ? ['#E57373', '#4EAA7E', '#64B5F6', '#FFB74D', '#BA68C8', '#4DD0E1', '#A1887F', '#90A4AE', '#FF8A65', '#81C784']
            : ['#E07A5F', '#3E8E68', '#3D5A80', '#D0694E', '#8CA396', '#F4A261', '#2A9D8F', '#E76F51', '#7209B7', '#457B9D']
    };
}

function destroyAllAnalyticsCharts() {
    Object.keys(chartInstances).forEach(key => {
        if (chartInstances[key]) {
            try {
                chartInstances[key].destroy();
            } catch (err) {
                console.warn("Chart destroy warning:", err);
            }
            chartInstances[key] = null;
        }
    });
}

function getAnalyticsTransactions(timeframe) {
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = String(now.getMonth() + 1).padStart(2, "0");
    const all = AppState.transactions || [];

    if (timeframe === "month") {
        const list = all.filter(t => t.date && t.date.startsWith(`${curYear}-${curMonth}`));
        return {
            list,
            label: getCurrentMonthName(),
            daysCount: Math.max(1, now.getDate())
        };
    } else if (timeframe === "30days") {
        const cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const cutoffStr = cutoff.toISOString().split("T")[0];
        const list = all.filter(t => t.date && t.date >= cutoffStr);
        return {
            list,
            label: "Last 30 Days",
            daysCount: 30
        };
    } else if (timeframe === "week") {
        const cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const cutoffStr = cutoff.toISOString().split("T")[0];
        const list = all.filter(t => t.date && t.date >= cutoffStr);
        return {
            list,
            label: "Last 7 Days",
            daysCount: 7
        };
    } else {
        // "all"
        return {
            list: all,
            label: "All Time Activity",
            daysCount: Math.max(30, all.length)
        };
    }
}

function setupAnalyticsControls() {
    // Timeframe selector tabs
    document.querySelectorAll(".timeframe-tab").forEach(tab => {
        tab.addEventListener("click", () => {
            const tf = tab.dataset.timeframe;
            if (AppState.analyticsTimeframe === tf) return;
            AppState.analyticsTimeframe = tf;
            document.querySelectorAll(".timeframe-tab").forEach(t => {
                t.classList.toggle("active", t === tab);
            });
            renderAnalytics();
        });
    });

    // Chart mode toggle (Daily vs Cumulative)
    const btnBar = document.getElementById("modeBtnBar");
    const btnCum = document.getElementById("modeBtnCumulative");
    if (btnBar && btnCum) {
        btnBar.addEventListener("click", () => {
            if (AppState.analyticsChartMode === "bar") return;
            AppState.analyticsChartMode = "bar";
            btnBar.classList.add("active");
            btnCum.classList.remove("active");
            const sub = document.getElementById("spendingChartSubtitle");
            if (sub) sub.textContent = "Daily outflows over selected period";
            renderSpendingChart(currentAnalyticsData.list);
        });

        btnCum.addEventListener("click", () => {
            if (AppState.analyticsChartMode === "cumulative") return;
            AppState.analyticsChartMode = "cumulative";
            btnCum.classList.add("active");
            btnBar.classList.remove("active");
            const sub = document.getElementById("spendingChartSubtitle");
            if (sub) sub.textContent = "Cumulative spending curve over selected period";
            renderSpendingChart(currentAnalyticsData.list);
        });
    }
}

/* =========================================================
   MAIN RENDER ANALYTICS CONTROLLER
========================================================= */

function renderAnalytics() {
    const timeframe = AppState.analyticsTimeframe || "month";
    const data = getAnalyticsTransactions(timeframe);
    currentAnalyticsData = data;
    const totals = getTotals(data.list);
    currentAnalyticsData.totals = totals;

    // 1. Update Period and Count Badges
    const periodBadge = document.getElementById("analysis-period-span");
    if (periodBadge) periodBadge.textContent = data.label;

    const txCountBadge = document.getElementById("analysis-tx-count");
    if (txCountBadge) {
        const count = data.list.length;
        txCountBadge.textContent = `${count} transaction${count === 1 ? "" : "s"}`;
    }

    // 2. Executive Metric Cards
    // Total Spent
    const expEl = document.getElementById("analysis-expense");
    if (expEl) expEl.textContent = formatCurrency(totals.expenses);

    const dailyAvgEl = document.getElementById("analysis-daily-avg");
    if (dailyAvgEl) {
        const avg = Math.round(totals.expenses / Math.max(1, data.daysCount));
        dailyAvgEl.textContent = `${formatCurrency(avg)} / day avg`;
    }

    // Total Income
    const incEl = document.getElementById("analysis-income");
    if (incEl) incEl.textContent = formatCurrency(totals.income);

    const incCountEl = document.getElementById("analysis-income-count");
    if (incCountEl) {
        const incCount = data.list.filter(t => t.type === "income").length;
        incCountEl.textContent = `${incCount} deposit${incCount === 1 ? "" : "s"}`;
    }

    // Net Savings & Rate
    const netEl = document.getElementById("analysis-net-savings");
    const netSavings = totals.income - totals.expenses;
    if (netEl) netEl.textContent = (netSavings >= 0 ? "+" : "") + formatCurrency(netSavings);

    const savingsRateEl = document.getElementById("analysis-savings-rate");
    if (savingsRateEl) {
        if (totals.income > 0) {
            const rate = Math.round((netSavings / totals.income) * 100);
            if (rate >= 0) {
                savingsRateEl.textContent = `${rate}% saved`;
                savingsRateEl.className = "status-badge surplus";
            } else {
                savingsRateEl.textContent = `${Math.abs(rate)}% deficit`;
                savingsRateEl.className = "status-badge deficit";
            }
        } else {
            savingsRateEl.textContent = totals.expenses > 0 ? "No income" : "Balanced";
            savingsRateEl.className = "status-badge";
        }
    }

    // Budget Health
    const budget = Number(AppState.settings.budget) || 35000;
    const budgetPctEl = document.getElementById("analysis-budget-percent");
    const budgetLeftEl = document.getElementById("analysis-budget-left");
    const budgetFill = document.getElementById("budgetProgressFill");

    if (budgetPctEl && budgetLeftEl && budgetFill) {
        const pct = Math.round((totals.expenses / budget) * 100);
        budgetPctEl.textContent = `${pct}%`;
        const remaining = budget - totals.expenses;

        if (remaining >= 0) {
            budgetLeftEl.textContent = `${formatCurrency(remaining)} left`;
        } else {
            budgetLeftEl.textContent = `${formatCurrency(Math.abs(remaining))} over budget`;
        }

        budgetFill.style.width = `${Math.min(100, pct)}%`;
        budgetFill.className = "mini-progress-fill" + (pct >= 100 ? " danger" : pct >= 80 ? " warning" : "");
    }

    // 3. Render Individual Charts and Analysis Modules
    renderSpendingChart(data.list);
    renderCategoryChart(data.list);
    renderCashflowChart(data.list, totals);
    renderWeekdayChart(data.list);
    renderAccountsChart(data.list);
    renderTopExpenses(data.list);
    renderInsights(data.list, totals, data);
}

/* =========================================================
   CHART 1: SPENDING VELOCITY & DAILY ACTIVITY
========================================================= */

function renderSpendingChart(transactions) {
    const ctx = document.getElementById('spendingChartCanvas');
    if (!ctx) return;

    const theme = getThemeColors();
    const curr = (AppState && AppState.settings && AppState.settings.currency) || "₹";
    const mode = AppState.analyticsChartMode || "bar";
    const timeframe = AppState.analyticsTimeframe || "month";

    // Build timeline dates & data points
    const now = new Date();
    let datesList = [];

    if (timeframe === "month") {
        const curYear = now.getFullYear();
        const curMonth = now.getMonth();
        const daysInMonth = new Date(curYear, curMonth + 1, 0).getDate();
        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${curYear}-${String(curMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
            datesList.push({ date: dateStr, label: String(d) });
        }
    } else if (timeframe === "week") {
        for (let i = 6; i >= 0; i--) {
            const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
            const dateStr = d.toISOString().split("T")[0];
            const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
            datesList.push({ date: dateStr, label: dayName });
        }
    } else if (timeframe === "30days") {
        for (let i = 29; i >= 0; i--) {
            const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
            const dateStr = d.toISOString().split("T")[0];
            const label = i % 5 === 0 || i === 0 ? d.getDate() + " " + d.toLocaleDateString('en-US', { month: 'short' }) : "";
            datesList.push({ date: dateStr, label: label || String(d.getDate()) });
        }
    } else {
        // "all": group by unique sorted dates
        const dateSet = new Set(transactions.map(t => t.date).filter(Boolean));
        const sorted = Array.from(dateSet).sort();
        datesList = sorted.map(d => ({ date: d, label: d.slice(5) }));
        if (!datesList.length) {
            datesList.push({ date: now.toISOString().split("T")[0], label: "Today" });
        }
    }

    const labels = datesList.map(item => item.label);
    const dailyExpenses = datesList.map(item => {
        return transactions
            .filter(t => t.type === "expense" && t.date === item.date)
            .reduce((sum, t) => sum + Number(t.amount), 0);
    });

    // Compute cumulative data if needed
    let cumulativeExpenses = [];
    let runningTotal = 0;
    for (const val of dailyExpenses) {
        runningTotal += val;
        cumulativeExpenses.push(runningTotal);
    }

    // Stats calculations
    let peakAmount = 0;
    let peakDate = "-";
    let activeDaysCount = 0;
    dailyExpenses.forEach((val, idx) => {
        if (val > 0) activeDaysCount++;
        if (val > peakAmount) {
            peakAmount = val;
            peakDate = datesList[idx].label;
        }
    });

    const stripPeak = document.getElementById("stripPeakVal");
    if (stripPeak) stripPeak.textContent = peakAmount > 0 ? formatCurrency(peakAmount) : "-";

    const stripAvg = document.getElementById("stripDailyAvg");
    if (stripAvg) {
        const avg = Math.round((runningTotal || 0) / Math.max(1, activeDaysCount));
        stripAvg.textContent = activeDaysCount > 0 ? formatCurrency(avg) : "-";
    }

    const stripActive = document.getElementById("stripActiveDays");
    if (stripActive) stripActive.textContent = `${activeDaysCount} day${activeDaysCount === 1 ? "" : "s"}`;

    if (chartInstances.spending) {
        try { chartInstances.spending.destroy(); } catch(e) {}
        chartInstances.spending = null;
    }

    if (mode === "cumulative") {
        // Smooth Area Curve
        chartInstances.spending = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Cumulative Spending',
                    data: cumulativeExpenses,
                    borderColor: theme.expense,
                    backgroundColor: theme.expenseSubtle,
                    borderWidth: 2.5,
                    pointBackgroundColor: theme.expense,
                    pointBorderColor: theme.surface,
                    pointBorderWidth: 1.5,
                    pointRadius: datesList.length > 20 ? 0 : 3,
                    pointHoverRadius: 6,
                    tension: 0.35,
                    fill: 'start'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { intersect: false, mode: 'index' },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: theme.surface,
                        titleColor: theme.text,
                        bodyColor: theme.text,
                        borderColor: theme.grid,
                        borderWidth: 1,
                        padding: 10,
                        cornerRadius: 8,
                        titleFont: { family: 'Inter', size: 12 },
                        bodyFont: { family: 'Inter', size: 13, weight: 'bold' },
                        displayColors: false,
                        callbacks: {
                            label: (context) => ' Cumulative: ' + formatCurrency(context.raw)
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: theme.grid, drawBorder: false },
                        border: { display: false },
                        ticks: {
                            color: theme.textMuted,
                            font: { family: 'Inter', size: 10 },
                            maxTicksLimit: 5,
                            callback: (val) => curr + (val >= 1000 ? (val/1000).toFixed(0) + 'k' : val)
                        }
                    },
                    x: {
                        grid: { display: false, drawBorder: false },
                        border: { display: false },
                        ticks: {
                            color: theme.textMuted,
                            font: { family: 'Inter', size: 10 },
                            maxTicksLimit: 8
                        }
                    }
                }
            }
        });
    } else {
        // Daily Rounded Bars
        chartInstances.spending = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Daily Outflow',
                    data: dailyExpenses,
                    backgroundColor: theme.expense,
                    hoverBackgroundColor: theme.isDark ? '#EF5350' : '#D0694E',
                    borderRadius: 5,
                    borderSkipped: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: theme.surface,
                        titleColor: theme.text,
                        bodyColor: theme.text,
                        borderColor: theme.grid,
                        borderWidth: 1,
                        padding: 10,
                        cornerRadius: 8,
                        titleFont: { family: 'Inter', size: 12 },
                        bodyFont: { family: 'Inter', size: 13, weight: 'bold' },
                        displayColors: false,
                        callbacks: {
                            label: (context) => ' Spent: ' + formatCurrency(context.raw)
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: theme.grid, drawBorder: false },
                        border: { display: false },
                        ticks: {
                            color: theme.textMuted,
                            font: { family: 'Inter', size: 10 },
                            maxTicksLimit: 5,
                            callback: (val) => curr + (val >= 1000 ? (val/1000).toFixed(0) + 'k' : val)
                        }
                    },
                    x: {
                        grid: { display: false, drawBorder: false },
                        border: { display: false },
                        ticks: {
                            color: theme.textMuted,
                            font: { family: 'Inter', size: 10 },
                            maxTicksLimit: 8
                        }
                    }
                }
            }
        });
    }
}

/* =========================================================
   CHART 2: CATEGORY BREAKDOWN DONUT
========================================================= */

function renderCategoryChart(transactions) {
    const ctx = document.getElementById('categoryChartCanvas');
    if (!ctx) return;

    const theme = getThemeColors();
    const totals = getCategoryTotals(transactions);
    const totalExpenses = Object.values(totals).reduce((sum, v) => sum + v, 0);
    const entries = Object.entries(totals).sort((a, b) => b[1] - a[1]);

    const labels = entries.map(e => e[0]);
    const data = entries.map(e => e[1]);
    const isDataEmpty = data.length === 0 || totalExpenses === 0;

    const chartData = isDataEmpty ? [1] : data;
    const chartColors = isDataEmpty ? [theme.grid] : theme.palette.slice(0, data.length);

    // Update donut center display
    const centerLabel = document.getElementById("donutCenterLabel");
    const centerVal = document.getElementById("donutCenterValue");
    if (centerLabel && centerVal) {
        centerLabel.textContent = "Total Spent";
        centerVal.textContent = formatCurrency(totalExpenses);
    }

    if (chartInstances.category) {
        try { chartInstances.category.destroy(); } catch(e) {}
        chartInstances.category = null;
    }

    chartInstances.category = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: isDataEmpty ? ['No Expenses'] : labels,
            datasets: [{
                data: chartData,
                backgroundColor: chartColors,
                borderColor: theme.surface,
                borderWidth: 2,
                cutout: '72%',
                hoverOffset: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            onHover: (event, activeElements) => {
                if (isDataEmpty || !centerLabel || !centerVal) return;
                if (activeElements.length > 0) {
                    const idx = activeElements[0].index;
                    const catName = labels[idx];
                    const catAmount = data[idx];
                    centerLabel.textContent = catName;
                    centerVal.textContent = formatCurrency(catAmount);
                } else {
                    centerLabel.textContent = "Total Spent";
                    centerVal.textContent = formatCurrency(totalExpenses);
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    enabled: !isDataEmpty,
                    backgroundColor: theme.surface,
                    titleColor: theme.text,
                    bodyColor: theme.text,
                    borderColor: theme.grid,
                    borderWidth: 1,
                    padding: 10,
                    cornerRadius: 8,
                    bodyFont: { family: 'Inter', size: 13, weight: 'bold' },
                    callbacks: {
                        label: (ctx) => {
                            const val = ctx.raw;
                            const pct = Math.round((val / totalExpenses) * 100);
                            return ` ${formatCurrency(val)} (${pct}%)`;
                        }
                    }
                }
            }
        }
    });

    // Populate Detailed Category Breakdown List
    const legendContainer = document.getElementById('category-legend');
    if (!legendContainer) return;
    legendContainer.innerHTML = '';

    if (isDataEmpty) {
        legendContainer.innerHTML = `
            <div style="text-align: center; color: var(--text-muted); font-size: 0.85rem; padding: 16px 0;">
                No expense transactions recorded in this period.
            </div>
        `;
        return;
    }

    entries.forEach(([category, amount], index) => {
        const color = theme.palette[index % theme.palette.length];
        const pct = Math.round((amount / totalExpenses) * 100);
        const count = transactions.filter(t => t.type === "expense" && t.category === category).length;
        const icon = getCategoryIcon(category);

        const item = document.createElement("div");
        item.className = "cat-breakdown-item";
        item.innerHTML = `
            <div class="cat-breakdown-top">
                <div class="cat-breakdown-left">
                    <span class="cat-breakdown-icon">${icon}</span>
                    <span class="cat-breakdown-name">${escapeHTML(category)}</span>
                    <span class="cat-breakdown-count">${count} tx</span>
                </div>
                <div class="cat-breakdown-right">
                    <span class="cat-breakdown-amount">${formatCurrency(amount)}</span>
                    <span class="cat-breakdown-pct" style="color: ${color}; border-color: ${color}40;">${pct}%</span>
                </div>
            </div>
            <div class="cat-progress-track">
                <div class="cat-progress-bar" style="width: ${pct}%; background-color: ${color};"></div>
            </div>
        `;
        legendContainer.appendChild(item);
    });
}

/* =========================================================
   CHART 3 (NEW): CASHFLOW DYNAMICS (INCOME VS EXPENSE)
========================================================= */

function renderCashflowChart(transactions, totals) {
    const ctx = document.getElementById('cashflowChartCanvas');
    if (!ctx) return;

    const theme = getThemeColors();
    const curr = (AppState && AppState.settings && AppState.settings.currency) || "₹";

    const income = totals.income;
    const expenses = totals.expenses;
    const net = income - expenses;

    // Update summary values
    const cfInc = document.getElementById("cfIncomeVal");
    const cfExp = document.getElementById("cfExpenseVal");
    const cfNet = document.getElementById("cfNetVal");
    if (cfInc) cfInc.textContent = formatCurrency(income);
    if (cfExp) cfExp.textContent = formatCurrency(expenses);
    if (cfNet) cfNet.textContent = (net >= 0 ? "+" : "") + formatCurrency(net);

    if (chartInstances.cashflow) {
        try { chartInstances.cashflow.destroy(); } catch(e) {}
        chartInstances.cashflow = null;
    }

    const netColor = net >= 0 ? theme.savings : theme.expense;

    chartInstances.cashflow = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Total Inflow', 'Total Outflow', 'Net Retained'],
            datasets: [{
                data: [income, expenses, Math.max(0, net)],
                backgroundColor: [theme.income, theme.expense, netColor],
                borderRadius: 6,
                borderSkipped: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: theme.surface,
                    titleColor: theme.text,
                    bodyColor: theme.text,
                    borderColor: theme.grid,
                    borderWidth: 1,
                    padding: 10,
                    cornerRadius: 8,
                    bodyFont: { family: 'Inter', size: 13, weight: 'bold' },
                    displayColors: true,
                    callbacks: {
                        label: (ctx) => ' ' + formatCurrency(ctx.raw)
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: theme.grid, drawBorder: false },
                    border: { display: false },
                    ticks: {
                        color: theme.textMuted,
                        font: { family: 'Inter', size: 10 },
                        maxTicksLimit: 5,
                        callback: (val) => curr + (val >= 1000 ? (val/1000).toFixed(0) + 'k' : val)
                    }
                },
                x: {
                    grid: { display: false, drawBorder: false },
                    border: { display: false },
                    ticks: {
                        color: theme.textMuted,
                        font: { family: 'Inter', size: 11, weight: '500' }
                    }
                }
            }
        }
    });
}

/* =========================================================
   CHART 4 (NEW): DAY OF WEEK PATTERN (BEHAVIORAL HABIT)
========================================================= */

function renderWeekdayChart(transactions) {
    const ctx = document.getElementById('weekdayChartCanvas');
    if (!ctx) return;

    const theme = getThemeColors();
    const curr = (AppState && AppState.settings && AppState.settings.currency) || "₹";

    // 0 = Sun, 1 = Mon, ... 6 = Sat
    const days = [
        { name: "Mon", total: 0, count: 0 },
        { name: "Tue", total: 0, count: 0 },
        { name: "Wed", total: 0, count: 0 },
        { name: "Thu", total: 0, count: 0 },
        { name: "Fri", total: 0, count: 0 },
        { name: "Sat", total: 0, count: 0 },
        { name: "Sun", total: 0, count: 0 }
    ];

    let weekdaySum = 0;
    let weekendSum = 0;

    transactions
        .filter(t => t.type === "expense" && t.date)
        .forEach(t => {
            const dt = new Date(t.date + "T00:00:00");
            const dayNum = dt.getDay(); // 0 is Sun, 1 is Mon...
            // Map 1..6,0 to 0..6 (Mon..Sun)
            const mappedIdx = dayNum === 0 ? 6 : dayNum - 1;
            const amt = Number(t.amount) || 0;
            days[mappedIdx].total += amt;
            days[mappedIdx].count += 1;

            if (dayNum === 0 || dayNum === 6) {
                weekendSum += amt;
            } else {
                weekdaySum += amt;
            }
        });

    const totalExpense = weekdaySum + weekendSum;
    let highestDay = days[0];
    days.forEach(d => {
        if (d.total > highestDay.total) highestDay = d;
    });

    // Update habit text banner
    const habitBanner = document.getElementById("weekdayHabitText");
    if (habitBanner) {
        if (totalExpense > 0) {
            const weekendPct = Math.round((weekendSum / totalExpense) * 100);
            const weekdayPct = 100 - weekendPct;
            habitBanner.innerHTML = `<strong>${highestDay.name}</strong> was your most active spending day (${formatCurrency(highestDay.total)}). Your volume splits <strong>${weekdayPct}% Weekdays</strong> vs. <strong>${weekendPct}% Weekends</strong>.`;
        } else {
            habitBanner.textContent = "No outflow recorded during this period to analyze day-of-week patterns.";
        }
    }

    if (chartInstances.weekday) {
        try { chartInstances.weekday.destroy(); } catch(e) {}
        chartInstances.weekday = null;
    }

    chartInstances.weekday = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: days.map(d => d.name),
            datasets: [{
                data: days.map(d => d.total),
                backgroundColor: days.map(d => d.name === highestDay.name && d.total > 0 ? theme.accent : theme.expense),
                borderRadius: 5,
                borderSkipped: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: theme.surface,
                    titleColor: theme.text,
                    bodyColor: theme.text,
                    borderColor: theme.grid,
                    borderWidth: 1,
                    padding: 10,
                    cornerRadius: 8,
                    bodyFont: { family: 'Inter', size: 13, weight: 'bold' },
                    callbacks: {
                        label: (ctx) => ' ' + formatCurrency(ctx.raw)
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: theme.grid, drawBorder: false },
                    border: { display: false },
                    ticks: {
                        color: theme.textMuted,
                        font: { family: 'Inter', size: 10 },
                        maxTicksLimit: 4,
                        callback: (val) => curr + (val >= 1000 ? (val/1000).toFixed(0) + 'k' : val)
                    }
                },
                x: {
                    grid: { display: false, drawBorder: false },
                    border: { display: false },
                    ticks: {
                        color: theme.textMuted,
                        font: { family: 'Inter', size: 11 }
                    }
                }
            }
        }
    });
}

/* =========================================================
   CHART 5 (NEW): PAYMENT CHANNELS & ACCOUNTS
========================================================= */

function renderAccountsChart(transactions) {
    const ctx = document.getElementById('accountsChartCanvas');
    if (!ctx) return;

    const theme = getThemeColors();
    const curr = (AppState && AppState.settings && AppState.settings.currency) || "₹";

    const accountTotals = {};
    let totalExpense = 0;

    transactions
        .filter(t => t.type === "expense")
        .forEach(t => {
            const acc = t.account || "Default Account";
            const amt = Number(t.amount) || 0;
            accountTotals[acc] = (accountTotals[acc] || 0) + amt;
            totalExpense += amt;
        });

    const entries = Object.entries(accountTotals).sort((a, b) => b[1] - a[1]);
    const labels = entries.map(e => e[0]);
    const data = entries.map(e => e[1]);

    if (chartInstances.accounts) {
        try { chartInstances.accounts.destroy(); } catch(e) {}
        chartInstances.accounts = null;
    }

    chartInstances.accounts = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels.length ? labels : ['No Outflows'],
            datasets: [{
                data: data.length ? data : [0],
                backgroundColor: theme.palette.slice(0, Math.max(1, labels.length)),
                borderRadius: 4,
                borderSkipped: false
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: theme.surface,
                    titleColor: theme.text,
                    bodyColor: theme.text,
                    borderColor: theme.grid,
                    borderWidth: 1,
                    padding: 10,
                    cornerRadius: 8,
                    bodyFont: { family: 'Inter', size: 13, weight: 'bold' },
                    callbacks: {
                        label: (ctx) => ' ' + formatCurrency(ctx.raw)
                    }
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    grid: { color: theme.grid, drawBorder: false },
                    border: { display: false },
                    ticks: {
                        color: theme.textMuted,
                        font: { family: 'Inter', size: 10 },
                        maxTicksLimit: 4,
                        callback: (val) => curr + (val >= 1000 ? (val/1000).toFixed(0) + 'k' : val)
                    }
                },
                y: {
                    grid: { display: false, drawBorder: false },
                    border: { display: false },
                    ticks: {
                        color: theme.textMuted,
                        font: { family: 'Inter', size: 11, weight: '500' }
                    }
                }
            }
        }
    });

    // Populate Accounts Distribution Pills
    const listContainer = document.getElementById("accountsDistributionList");
    if (!listContainer) return;
    listContainer.innerHTML = "";

    if (!entries.length) {
        listContainer.innerHTML = `<span style="font-size: 0.8rem; color: var(--text-muted);">No account breakdown available.</span>`;
        return;
    }

    entries.forEach(([acc, amt]) => {
        const pct = totalExpense > 0 ? Math.round((amt / totalExpense) * 100) : 0;
        const pill = document.createElement("div");
        pill.className = "account-pill";
        pill.innerHTML = `
            <span class="account-pill-name">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: -2px; margin-right: 6px;"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>${escapeHTML(acc)}
            </span>
            <span class="account-pill-amt">${formatCurrency(amt)} <small style="color: var(--text-muted);">(${pct}%)</small></span>
        `;
        listContainer.appendChild(pill);
    });
}

/* =========================================================
   TOP OUTFLOW DRIVERS (LARGEST SINGLE PURCHASES)
========================================================= */

function renderTopExpenses(transactions) {
    const container = document.getElementById("topTransactionsList");
    if (!container) return;
    container.innerHTML = "";

    const expenses = transactions
        .filter(t => t.type === "expense" && Number(t.amount) > 0)
        .sort((a, b) => Number(b.amount) - Number(a.amount))
        .slice(0, 4);

    if (!expenses.length) {
        container.innerHTML = `
            <div style="text-align: center; color: var(--text-muted); font-size: 0.85rem; padding: 12px 0;">
                No major expenses logged in this period.
            </div>
        `;
        return;
    }

    expenses.forEach(t => {
        const icon = getCategoryIcon(t.category);
        const item = document.createElement("div");
        item.className = "top-tx-item";
        item.innerHTML = `
            <div class="top-tx-left">
                <div class="top-tx-icon">${icon}</div>
                <div>
                    <div class="top-tx-title">${escapeHTML(t.merchant || t.category || "Expense")}</div>
                    <div class="top-tx-sub">${t.date || ""} • ${escapeHTML(t.account || "Account")}</div>
                </div>
            </div>
            <div class="top-tx-amount">-${formatCurrency(t.amount)}</div>
        `;
        container.appendChild(item);
    });
}

/* =========================================================
   SMART FINANCIAL INSIGHTS
========================================================= */

function renderInsights(transactions, totals, timeframeData) {
    const container = document.getElementById("insights");
    if (!container) return;
    container.innerHTML = "";

    const insights = [];
    const budget = Number(AppState.settings.budget) || 35000;

    // SVG icons for insights
    const SVG_ICONS = {
        seed: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a10 10 0 0 1 10 10c0 5.523-4.477 10-10 10S2 17.523 2 12A10 10 0 0 1 12 2z"></path><path d="m9 12 2 2 4-4"></path></svg>`,
        warning: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`,
        target: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg>`,
        lightbulb: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6"></path><path d="M10 22h4"></path><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5.76.76 1.23 1.52 1.41 2.5h6.18z"></path></svg>`,
        trendUp: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>`,
        scale: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"></path><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"></path><path d="M7 21h10"></path><path d="M12 3v18"></path><path d="M3 7h18"></path></svg>`,
        zap: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>`,
        chart: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>`
    };

    if (totals.expenses === 0) {
        insights.push({
            icon: SVG_ICONS.seed,
            colorClass: "income",
            text: "No expenses recorded during this timeframe. New transactions will populate automated trends here."
        });
    } else {
        // 1. Budget Pace
        if (totals.expenses > budget) {
            insights.push({
                icon: SVG_ICONS.warning,
                colorClass: "expense",
                text: `You have exceeded your monthly budget of <strong>${formatCurrency(budget)}</strong> by <strong>${formatCurrency(totals.expenses - budget)}</strong>.`
            });
        } else {
            const left = budget - totals.expenses;
            const pct = Math.round((totals.expenses / budget) * 100);
            insights.push({
                icon: SVG_ICONS.target,
                colorClass: "income",
                text: `You have utilized <strong>${pct}%</strong> of your budget with <strong>${formatCurrency(left)}</strong> remaining cushion.`
            });
        }

        // 2. Largest Category Share
        const categoryTotals = getCategoryTotals(transactions);
        const catEntries = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
        if (catEntries.length) {
            const [topCat, topAmt] = catEntries[0];
            const pct = Math.round((topAmt / totals.expenses) * 100);
            insights.push({
                icon: SVG_ICONS.lightbulb,
                colorClass: "accent",
                text: `<strong>${escapeHTML(topCat)}</strong> represents your highest outflow driver at <strong>${pct}%</strong> (${formatCurrency(topAmt)}) of total spending.`
            });
        }

        // 3. Savings Rate Signal
        if (totals.income > 0) {
            const net = totals.income - totals.expenses;
            const rate = Math.round((net / totals.income) * 100);
            if (rate > 20) {
                insights.push({
                    icon: SVG_ICONS.trendUp,
                    colorClass: "income",
                    text: `Strong financial retention: You are saving <strong>${rate}%</strong> of total inflows this period.`
                });
            } else if (rate > 0) {
                insights.push({
                    icon: SVG_ICONS.scale,
                    colorClass: "savings",
                    text: `Balanced flow: Retaining <strong>${rate}%</strong> (${formatCurrency(net)}) of current period inflows.`
                });
            } else {
                insights.push({
                    icon: SVG_ICONS.zap,
                    colorClass: "expense",
                    text: `Spending exceeds current period deposits by <strong>${formatCurrency(Math.abs(net))}</strong>.`
                });
            }
        }

        // 4. Daily Burn Rate
        const dailyAvg = Math.round(totals.expenses / Math.max(1, timeframeData.daysCount));
        insights.push({
            icon: SVG_ICONS.chart,
            colorClass: "savings",
            text: `Average burn rate is <strong>${formatCurrency(dailyAvg)} / day</strong> across the active period.`
        });
    }

    insights.forEach(item => {
        const card = document.createElement("div");
        card.className = "insight-bubble-card";
        card.innerHTML = `
            <div class="insight-bubble-icon ${item.colorClass || ''}">${item.icon}</div>
            <div class="insight-bubble-text">${item.text}</div>
        `;
        container.appendChild(card);
    });
}
