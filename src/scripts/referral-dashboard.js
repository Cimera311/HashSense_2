// GoMining Referral Dashboard Script
// Handles data parsing, storage, statistics, charts, and export

// Global state
let referralData = [];
let filteredData = [];
let currentCurrency = 'GMT'; // GMT, USD, or EUR
let currentDateFormat = 'us'; // us or eu
let sortColumn = 'date';
let sortDirection = 'desc';

// Chart instances
let earningsChart = null;
let typeChart = null;
let acquisitionChart = null; // NEW: Performance chart

// Acquisition filter state
let acquisitionFilterFrom = null;
let acquisitionFilterTo = null;
let monthlySortColumn = 'month';
let monthlySortDirection = 'desc';

// ===========================
// INITIALIZATION
// ===========================

document.addEventListener('DOMContentLoaded', function() {
    loadFromLocalStorage();
    setupEventListeners();
    
    if (referralData.length > 0) {
        updateDisplay();
    }
});

function setupEventListeners() {
    // Currency toggle
    document.getElementById('currencyUSD').addEventListener('click', () => switchCurrency('USD'));
    document.getElementById('currencyEUR').addEventListener('click', () => switchCurrency('EUR'));
    document.getElementById('currencyGMT').addEventListener('click', () => switchCurrency('GMT'));
    
    // Date format toggle
    document.getElementById('dateUS').addEventListener('click', () => switchDateFormat('us'));
    document.getElementById('dateEU').addEventListener('click', () => switchDateFormat('eu'));
}

function switchCurrency(currency) {
    currentCurrency = currency;
    
    // Update button states
    document.querySelectorAll('.setting-group button[id^="currency"]').forEach(btn => {
        btn.classList.remove('active');
    });
    document.getElementById('currency' + currency).classList.add('active');
    
    // Update display
    if (referralData.length > 0) {
        updateStatistics();
        updateTable();
    }
}

function switchDateFormat(format) {
    currentDateFormat = format;
    
    // Update button states
    document.querySelectorAll('.setting-group button[id^="date"]').forEach(btn => {
        btn.classList.remove('active');
    });
    document.getElementById('date' + (format === 'us' ? 'US' : 'EU')).classList.add('active');
    
    // Update display
    if (referralData.length > 0) {
        updateTable();
    }
}

// ===========================
// DATA PARSING
// ===========================

function parseReferralData() {
    const input = document.getElementById('referralInput').value.trim();
    
    if (!input) {
        showMessage('importResult', 'Please paste your referral data first.', 'error');
        return;
    }
    
    showSpinner('parseSpinner', true);
    
    try {
        const lines = input.split('\n').filter(line => line.trim());
        const newRewards = [];
        
        let i = 0;
        // Skip header if present
        if (lines[0].includes('Date') && lines[0].includes('User ID')) {
            i = 1;
        }
        
        while (i < lines.length) {
            // Parse pattern: Time, Date, UserID, Type, Purchase (GMT + USD), Share %, Reward (GMT + USD), Status
            const timeLine = lines[i++];
            if (!timeLine || i >= lines.length) break;
            
            const dateLine = lines[i++];
            if (!dateLine || i >= lines.length) break;
            
            const dataLine = lines[i++];
            if (!dataLine) break;
            
            const parts = dataLine.split('\t');
            if (parts.length < 7) continue;
            
            const time = timeLine.trim();
            const dateRaw = dateLine.trim();
            const date = parseDate(dateRaw);
            const userId = parts[0].trim();
            const type = parts[1].trim();
            
            // Parse purchase amount (GMT and USD)
            const purchaseParts = parts[2].split('$');
            const purchaseGMT = parseFloat(purchaseParts[0].replace(/,/g, '')) || 0;
            const purchaseUSD = parseFloat(purchaseParts[1]) || 0;
            
            // Parse share percentage
            const sharePercent = parts[3].trim();
            
            // Parse reward (GMT and USD)
            const rewardParts = parts[4].split('$');
            const rewardGMT = parseFloat(rewardParts[0].replace(/,/g, '')) || 0;
            const rewardUSD = parseFloat(rewardParts[1]) || 0;
            
            // Status
            const status = parts[5].trim();
            
            // Create unique ID
            const id = `${date}_${time}_${userId}_${rewardGMT}`;
            
            // Check for duplicates
            if (!referralData.find(r => r.id === id)) {
                newRewards.push({
                    id,
                    date,
                    time,
                    userId,
                    type,
                    purchaseGMT,
                    purchaseUSD,
                    sharePercent,
                    rewardGMT,
                    rewardUSD,
                    status
                });
            }
        }
        
        if (newRewards.length > 0) {
            referralData.push(...newRewards);
            saveToLocalStorage();
            updateDisplay();
            showMessage('importResult', `✅ Successfully imported ${newRewards.length} new rewards!`, 'success');
            document.getElementById('referralInput').value = '';
        } else {
            showMessage('importResult', 'No new rewards found (all might be duplicates).', 'info');
        }
        
    } catch (error) {
        console.error('Parse error:', error);
        showMessage('importResult', '❌ Error parsing data. Please check format.', 'error');
    } finally {
        showSpinner('parseSpinner', false);
    }
}

function uploadCSV(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const content = e.target.result;
        parseCSVContent(content);
    };
    reader.readAsText(file);
}

function parseCSVContent(csvContent) {
    try {
        const lines = csvContent.split('\n').filter(line => line.trim());
        const newRewards = [];
        
        // Skip header
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].replace(/"/g, '').trim();
            if (!line) continue;
            
            const parts = line.split(';');
            if (parts.length < 10) continue;
            
            const date = parts[0].trim();
            const time = parts[1].trim();
            const userId = parts[2].trim();
            const type = parts[3].trim();
            const purchaseGMT = parseFloat(parts[4].replace(',', '.')) || 0;
            const purchaseUSD = parseFloat(parts[5].replace(',', '.')) || 0;
            const sharePercent = parts[6].trim();
            const rewardGMT = parseFloat(parts[7].replace(',', '.')) || 0;
            const rewardUSD = parseFloat(parts[8].replace(',', '.')) || 0;
            const status = parts[9].trim();
            
            const id = `${date}_${time}_${userId}_${rewardGMT}`;
            
            if (!referralData.find(r => r.id === id)) {
                newRewards.push({
                    id,
                    date,
                    time,
                    userId,
                    type,
                    purchaseGMT,
                    purchaseUSD,
                    sharePercent,
                    rewardGMT,
                    rewardUSD,
                    status
                });
            }
        }
        
        if (newRewards.length > 0) {
            referralData.push(...newRewards);
            saveToLocalStorage();
            updateDisplay();
            showMessage('importResult', `✅ Successfully imported ${newRewards.length} rewards from CSV!`, 'success');
        } else {
            showMessage('importResult', 'No new rewards found in CSV.', 'info');
        }
        
    } catch (error) {
        console.error('CSV parse error:', error);
        showMessage('importResult', '❌ Error parsing CSV file.', 'error');
    }
}

function parseDate(dateStr) {
    // Convert "Nov 1, 2025" to YYYY-MM-DD
    const date = new Date(dateStr);
    if (!isNaN(date)) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    return dateStr;
}

// ===========================
// DISPLAY & STATISTICS
// ===========================

function updateDisplay() {
    document.getElementById('displaySection').style.display = 'block';
    filteredData = [...referralData];
    updateStatistics();
    updateCharts();
    updatePerformanceAnalysis(); // NEW: Performance section
    updateTable();
}

function updateStatistics() {
    // Total earnings
    const totalGMT = referralData.reduce((sum, r) => sum + r.rewardGMT, 0);
    const totalUSD = referralData.reduce((sum, r) => sum + r.rewardUSD, 0);
    
    document.getElementById('statTotalEarnings').textContent = formatCurrency(totalGMT, 'GMT');
    document.getElementById('statTotalEarningsUSD').textContent = formatCurrency(totalUSD, 'USD');
    
    // Total rewards count
    document.getElementById('statTotalRewards').textContent = referralData.length;
    
    // Active referrals (unique user IDs)
    const uniqueUsers = new Set(referralData.map(r => r.userId));
    document.getElementById('statActiveReferrals').textContent = uniqueUsers.size;
    
    // This month
    const now = new Date();
    const thisMonthData = referralData.filter(r => {
        const rewardDate = new Date(r.date);
        return rewardDate.getMonth() === now.getMonth() && rewardDate.getFullYear() === now.getFullYear();
    });
    const thisMonthGMT = thisMonthData.reduce((sum, r) => sum + r.rewardGMT, 0);
    const thisMonthUSD = thisMonthData.reduce((sum, r) => sum + r.rewardUSD, 0);
    
    document.getElementById('statThisMonth').textContent = formatCurrency(thisMonthGMT, 'GMT');
    document.getElementById('statThisMonthUSD').textContent = formatCurrency(thisMonthUSD, 'USD');
    
    // Last 7 days
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last7DaysData = referralData.filter(r => new Date(r.date) >= sevenDaysAgo);
    const last7DaysGMT = last7DaysData.reduce((sum, r) => sum + r.rewardGMT, 0);
    const last7DaysUSD = last7DaysData.reduce((sum, r) => sum + r.rewardUSD, 0);
    
    document.getElementById('statLast7Days').textContent = formatCurrency(last7DaysGMT, 'GMT');
    document.getElementById('statLast7DaysUSD').textContent = formatCurrency(last7DaysUSD, 'USD');
    
    // Average per reward
    const avgGMT = totalGMT / referralData.length || 0;
    const avgUSD = totalUSD / referralData.length || 0;
    
    document.getElementById('statAvgReward').textContent = formatCurrency(avgGMT, 'GMT');
    document.getElementById('statAvgRewardUSD').textContent = formatCurrency(avgUSD, 'USD');
}

function updateCharts() {
    // Earnings over time (daily aggregation)
    const dailyEarnings = {};
    
    referralData.forEach(r => {
        if (!dailyEarnings[r.date]) {
            dailyEarnings[r.date] = { gmt: 0, usd: 0 };
        }
        dailyEarnings[r.date].gmt += r.rewardGMT;
        dailyEarnings[r.date].usd += r.rewardUSD;
    });
    
    const sortedDates = Object.keys(dailyEarnings).sort();
    const earningsValues = sortedDates.map(date => dailyEarnings[date][currentCurrency.toLowerCase()]);
    
    // Destroy existing chart
    if (earningsChart) {
        earningsChart.destroy();
    }
    
    // Create earnings chart
    const ctx1 = document.getElementById('earningsChart').getContext('2d');
    earningsChart = new Chart(ctx1, {
        type: 'line',
        data: {
            labels: sortedDates,
            datasets: [{
                label: `Earnings (${currentCurrency})`,
                data: earningsValues,
                borderColor: '#00ff7f',
                backgroundColor: 'rgba(0, 255, 127, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    labels: { color: '#fff' }
                }
            },
            scales: {
                x: {
                    ticks: { color: '#aaa' },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                },
                y: {
                    ticks: { color: '#aaa' },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                }
            }
        }
    });
    
    // Type distribution
    const typeCounts = {};
    referralData.forEach(r => {
        typeCounts[r.type] = (typeCounts[r.type] || 0) + 1;
    });
    
    // Destroy existing chart
    if (typeChart) {
        typeChart.destroy();
    }
    
    // Create type chart
    const ctx2 = document.getElementById('typeChart').getContext('2d');
    typeChart = new Chart(ctx2, {
        type: 'doughnut',
        data: {
            labels: Object.keys(typeCounts),
            datasets: [{
                data: Object.values(typeCounts),
                backgroundColor: ['#673dec', '#00ff7f', '#ffa500', '#ff4d4d']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    labels: { color: '#fff' }
                }
            }
        }
    });
}

function updateTable() {
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '';
    
    // Sort data
    const sorted = [...filteredData].sort((a, b) => {
        let aVal = a[sortColumn];
        let bVal = b[sortColumn];
        
        if (sortColumn === 'date') {
            aVal = new Date(a.date + ' ' + a.time);
            bVal = new Date(b.date + ' ' + b.time);
        } else if (typeof aVal === 'string') {
            aVal = aVal.toLowerCase();
            bVal = bVal.toLowerCase();
        }
        
        if (sortDirection === 'asc') {
            return aVal > bVal ? 1 : -1;
        } else {
            return aVal < bVal ? 1 : -1;
        }
    });
    
    sorted.forEach(reward => {
        const row = document.createElement('tr');
        
        const formattedDate = formatDate(reward.date);
        const purchaseAmount = currentCurrency === 'GMT' ? formatCurrency(reward.purchaseGMT, 'GMT') : formatCurrency(reward.purchaseUSD, 'USD');
        const rewardAmount = currentCurrency === 'GMT' ? formatCurrency(reward.rewardGMT, 'GMT') : formatCurrency(reward.rewardUSD, 'USD');
        
        row.innerHTML = `
            <td>${formattedDate}</td>
            <td>${reward.time}</td>
            <td>${reward.userId}</td>
            <td>${reward.type}</td>
            <td>${purchaseAmount}</td>
            <td>${reward.sharePercent}</td>
            <td>${rewardAmount}</td>
            <td class="status-${reward.status.toLowerCase()}">${reward.status}</td>
        `;
        
        tbody.appendChild(row);
    });
}

function formatDate(dateStr) {
    const [year, month, day] = dateStr.split('-');
    
    if (currentDateFormat === 'eu') {
        return `${day}.${month}.${year}`;
    } else {
        return `${month}/${day}/${year}`;
    }
}

function formatCurrency(amount, currency) {
    if (currency === 'GMT') {
        return amount.toFixed(2) + ' GMT';
    } else if (currency === 'USD') {
        return '$' + amount.toFixed(2);
    } else if (currency === 'EUR') {
        return '€' + amount.toFixed(2);
    }
}

// ===========================
// NEW: PERFORMANCE ANALYSIS
// ===========================

function updatePerformanceAnalysis() {
    // 1. Find first appearance for each user
    const userFirstAppearance = {};
    
    referralData.forEach(reward => {
        if (!userFirstAppearance[reward.userId]) {
            userFirstAppearance[reward.userId] = {
                date: reward.date,
                time: reward.time,
                type: reward.type,
                category: reward.type === 'Registration' ? 'Registration' : 'First Purchase',
                dateTime: new Date(reward.date + ' ' + reward.time)
            };
        } else {
            // Check if this is earlier
            const currentDateTime = new Date(reward.date + ' ' + reward.time);
            if (currentDateTime < userFirstAppearance[reward.userId].dateTime) {
                userFirstAppearance[reward.userId] = {
                    date: reward.date,
                    time: reward.time,
                    type: reward.type,
                    category: reward.type === 'Registration' ? 'Registration' : 'First Purchase',
                    dateTime: currentDateTime
                };
            }
        }
    });
    
    // 2. Count by category
    const registrationUsers = Object.values(userFirstAppearance).filter(u => u.category === 'Registration').length;
    const firstPurchaseUsers = Object.values(userFirstAppearance).filter(u => u.category === 'First Purchase').length;
    const totalUsers = registrationUsers + firstPurchaseUsers;
    
    // Update stats cards
    document.getElementById('statRegistrationUsers').textContent = registrationUsers;
    document.getElementById('statRegistrationPercent').textContent = 
        totalUsers > 0 ? ((registrationUsers / totalUsers * 100).toFixed(1) + '%') : '0%';
    
    document.getElementById('statFirstPurchaseUsers').textContent = firstPurchaseUsers;
    document.getElementById('statFirstPurchasePercent').textContent = 
        totalUsers > 0 ? ((firstPurchaseUsers / totalUsers * 100).toFixed(1) + '%') : '0%';
    
    document.getElementById('statTotalUniqueUsers').textContent = totalUsers;
    
    // 3. Calculate conversion rate (Registration users who later made a purchase)
    const registrationUserIds = Object.keys(userFirstAppearance).filter(
        id => userFirstAppearance[id].category === 'Registration'
    );
    
    const purchasedAfterRegistration = registrationUserIds.filter(userId => {
        // Check if user has any Purchase/Upgrade/Boosts after registration
        return referralData.some(r => 
            r.userId === userId && 
            r.type !== 'Registration' && 
            new Date(r.date + ' ' + r.time) > userFirstAppearance[userId].dateTime
        );
    }).length;
    
    const conversionRate = registrationUsers > 0 
        ? ((purchasedAfterRegistration / registrationUsers) * 100).toFixed(1) 
        : 0;
    
    document.getElementById('statConversionRate').textContent = conversionRate + '%';
    
    // 4. Calculate average time to first purchase (for Registration users)
    let totalDays = 0;
    let countWithPurchase = 0;
    
    registrationUserIds.forEach(userId => {
        const registrationDate = userFirstAppearance[userId].dateTime;
        const firstPurchase = referralData
            .filter(r => r.userId === userId && r.type !== 'Registration')
            .sort((a, b) => new Date(a.date + ' ' + a.time) - new Date(b.date + ' ' + b.time))[0];
        
        if (firstPurchase) {
            const purchaseDate = new Date(firstPurchase.date + ' ' + firstPurchase.time);
            const daysDiff = (purchaseDate - registrationDate) / (1000 * 60 * 60 * 24);
            totalDays += daysDiff;
            countWithPurchase++;
        }
    });
    
    const avgDays = countWithPurchase > 0 ? (totalDays / countWithPurchase).toFixed(1) : 0;
    document.getElementById('statAvgTimeToPurchase').textContent = avgDays + ' days';
    
    // 5. Calculate average daily growth
    const dateMap = {};
    Object.values(userFirstAppearance).forEach(user => {
        dateMap[user.date] = (dateMap[user.date] || 0) + 1;
    });
    
    const uniqueDates = Object.keys(dateMap).length;
    const avgDailyGrowth = uniqueDates > 0 ? (totalUsers / uniqueDates).toFixed(1) : 0;
    document.getElementById('statAvgDailyGrowth').textContent = avgDailyGrowth;
    
    // 6. Initialize date filter dropdowns
    initializeAcquisitionDateFilters(userFirstAppearance);
    
    // 7. Create acquisition timeline chart
    updateAcquisitionChart(userFirstAppearance);
    
    // 8. Create monthly summary table
    updateMonthlyAcquisitionTable(userFirstAppearance);
}

function updateAcquisitionChart(userFirstAppearance) {
    // Aggregate by date
    const dailyAcquisition = {};
    
    Object.values(userFirstAppearance).forEach(user => {
        if (!dailyAcquisition[user.date]) {
            dailyAcquisition[user.date] = { registration: 0, firstPurchase: 0 };
        }
        
        if (user.category === 'Registration') {
            dailyAcquisition[user.date].registration++;
        } else {
            dailyAcquisition[user.date].firstPurchase++;
        }
    });
    
    // Sort dates
    const sortedDates = Object.keys(dailyAcquisition).sort();
    const registrationData = sortedDates.map(date => dailyAcquisition[date].registration);
    const firstPurchaseData = sortedDates.map(date => dailyAcquisition[date].firstPurchase);
    
    // Destroy existing chart
    if (acquisitionChart) {
        acquisitionChart.destroy();
    }
    
    // Create chart
    const ctx = document.getElementById('acquisitionChart').getContext('2d');
    acquisitionChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sortedDates,
            datasets: [
                {
                    label: '🔵 Registration Users',
                    data: registrationData,
                    backgroundColor: 'rgba(59, 130, 246, 0.7)',
                    borderColor: '#3b82f6',
                    borderWidth: 1
                },
                {
                    label: '🟢 First Purchase Users',
                    data: firstPurchaseData,
                    backgroundColor: 'rgba(16, 185, 129, 0.7)',
                    borderColor: '#10b981',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            scales: {
                x: {
                    stacked: true,
                    ticks: { color: '#aaa' },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                },
                y: {
                    stacked: true,
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'New Users',
                        color: '#aaa'
                    },
                    ticks: { 
                        color: '#aaa',
                        stepSize: 1
                    },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                }
            },
            plugins: {
                legend: {
                    labels: { color: '#fff' }
                },
                tooltip: {
                    callbacks: {
                        footer: function(tooltipItems) {
                            let total = 0;
                            tooltipItems.forEach(item => {
                                total += item.parsed.y;
                            });
                            return 'Total: ' + total + ' users';
                        }
                    }
                }
            }
        }
    });
}

function initializeAcquisitionDateFilters(userFirstAppearance) {
    // Get all unique dates
    const allDates = Object.values(userFirstAppearance).map(u => new Date(u.date));
    if (allDates.length === 0) return;
    
    const minDate = new Date(Math.min(...allDates));
    const maxDate = new Date(Math.max(...allDates));
    
    // Populate month dropdowns
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const fromMonth = document.getElementById('acquisitionFromMonth');
    const toMonth = document.getElementById('acquisitionToMonth');
    
    fromMonth.innerHTML = '';
    toMonth.innerHTML = '';
    
    months.forEach((month, idx) => {
        fromMonth.innerHTML += `<option value="${idx}">${month}</option>`;
        toMonth.innerHTML += `<option value="${idx}">${month}</option>`;
    });
    
    // Populate year dropdowns
    const fromYear = document.getElementById('acquisitionFromYear');
    const toYear = document.getElementById('acquisitionToYear');
    
    fromYear.innerHTML = '';
    toYear.innerHTML = '';
    
    const minYear = minDate.getFullYear();
    const maxYear = maxDate.getFullYear();
    
    for (let year = minYear; year <= maxYear; year++) {
        fromYear.innerHTML += `<option value="${year}">${year}</option>`;
        toYear.innerHTML += `<option value="${year}">${year}</option>`;
    }
    
    // Set default values
    fromMonth.value = minDate.getMonth();
    fromYear.value = minYear;
    toMonth.value = maxDate.getMonth();
    toYear.value = maxYear;
    
    // Initialize filter state
    acquisitionFilterFrom = minDate;
    acquisitionFilterTo = maxDate;
}

function applyAcquisitionFilter() {
    const fromMonth = parseInt(document.getElementById('acquisitionFromMonth').value);
    const fromYear = parseInt(document.getElementById('acquisitionFromYear').value);
    const toMonth = parseInt(document.getElementById('acquisitionToMonth').value);
    const toYear = parseInt(document.getElementById('acquisitionToYear').value);
    
    acquisitionFilterFrom = new Date(fromYear, fromMonth, 1);
    acquisitionFilterTo = new Date(toYear, toMonth + 1, 0); // Last day of month
    
    // Re-analyze and update charts
    updatePerformanceAnalysis();
}

function resetAcquisitionFilter() {
    acquisitionFilterFrom = null;
    acquisitionFilterTo = null;
    updatePerformanceAnalysis();
}

function updateAcquisitionChart(userFirstAppearance) {
    // Filter by date range if set
    let filteredUsers = Object.values(userFirstAppearance);
    
    if (acquisitionFilterFrom && acquisitionFilterTo) {
        filteredUsers = filteredUsers.filter(user => {
            const userDate = new Date(user.date);
            return userDate >= acquisitionFilterFrom && userDate <= acquisitionFilterTo;
        });
    }
    
    // Aggregate by date
    const dailyAcquisition = {};
    
    filteredUsers.forEach(user => {
        if (!dailyAcquisition[user.date]) {
            dailyAcquisition[user.date] = { registration: 0, firstPurchase: 0 };
        }
        
        if (user.category === 'Registration') {
            dailyAcquisition[user.date].registration++;
        } else {
            dailyAcquisition[user.date].firstPurchase++;
        }
    });
    
    // Sort dates
    const sortedDates = Object.keys(dailyAcquisition).sort();
    const registrationData = sortedDates.map(date => dailyAcquisition[date].registration);
    const firstPurchaseData = sortedDates.map(date => dailyAcquisition[date].firstPurchase);
    
    // Destroy existing chart
    if (acquisitionChart) {
        acquisitionChart.destroy();
    }
    
    // Create chart
    const ctx = document.getElementById('acquisitionChart').getContext('2d');
    acquisitionChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sortedDates,
            datasets: [
                {
                    label: '🔵 Registration Users',
                    data: registrationData,
                    backgroundColor: 'rgba(59, 130, 246, 0.7)',
                    borderColor: '#3b82f6',
                    borderWidth: 1
                },
                {
                    label: '🟢 First Purchase Users',
                    data: firstPurchaseData,
                    backgroundColor: 'rgba(16, 185, 129, 0.7)',
                    borderColor: '#10b981',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            scales: {
                x: {
                    stacked: true,
                    ticks: { color: '#aaa' },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                },
                y: {
                    stacked: true,
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'New Users',
                        color: '#aaa'
                    },
                    ticks: { 
                        color: '#aaa',
                        stepSize: 1
                    },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                }
            },
            plugins: {
                legend: {
                    labels: { color: '#fff' }
                },
                tooltip: {
                    callbacks: {
                        footer: function(tooltipItems) {
                            let total = 0;
                            tooltipItems.forEach(item => {
                                total += item.parsed.y;
                            });
                            return 'Total: ' + total + ' users';
                        }
                    }
                }
            }
        }
    });
}

function updateMonthlyAcquisitionTable(userFirstAppearance) {
    // Filter by date range if set
    let filteredUsers = Object.values(userFirstAppearance);
    
    if (acquisitionFilterFrom && acquisitionFilterTo) {
        filteredUsers = filteredUsers.filter(user => {
            const userDate = new Date(user.date);
            return userDate >= acquisitionFilterFrom && userDate <= acquisitionFilterTo;
        });
    }
    
    // Group by month
    const monthlyData = {};
    
    filteredUsers.forEach(user => {
        const date = new Date(user.date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        if (!monthlyData[monthKey]) {
            monthlyData[monthKey] = {
                registration: 0,
                firstPurchase: 0,
                registrationUserIds: [],
                allUserIds: []
            };
        }
        
        monthlyData[monthKey].allUserIds.push(Object.keys(userFirstAppearance).find(
            id => userFirstAppearance[id] === user
        ));
        
        if (user.category === 'Registration') {
            monthlyData[monthKey].registration++;
            monthlyData[monthKey].registrationUserIds.push(Object.keys(userFirstAppearance).find(
                id => userFirstAppearance[id] === user
            ));
        } else {
            monthlyData[monthKey].firstPurchase++;
        }
    });
    
    // Calculate additional metrics for each month
    const monthlyStats = [];
    
    Object.keys(monthlyData).forEach(monthKey => {
        const data = monthlyData[monthKey];
        const total = data.registration + data.firstPurchase;
        
        // Calculate conversion rate (registration users who purchased in that month or later)
        const converted = data.registrationUserIds.filter(userId => {
            return referralData.some(r => 
                r.userId === userId && 
                r.type !== 'Registration'
            );
        }).length;
        
        const conversionRate = data.registration > 0 ? ((converted / data.registration) * 100).toFixed(1) : 0;
        
        // Calculate average days to purchase for registration users
        let totalDays = 0;
        let countWithPurchase = 0;
        
        data.registrationUserIds.forEach(userId => {
            const regDate = new Date(userFirstAppearance[userId].date + ' ' + userFirstAppearance[userId].time);
            const firstPurchase = referralData
                .filter(r => r.userId === userId && r.type !== 'Registration')
                .sort((a, b) => new Date(a.date + ' ' + a.time) - new Date(b.date + ' ' + b.time))[0];
            
            if (firstPurchase) {
                const purchaseDate = new Date(firstPurchase.date + ' ' + firstPurchase.time);
                const daysDiff = (purchaseDate - regDate) / (1000 * 60 * 60 * 24);
                totalDays += daysDiff;
                countWithPurchase++;
            }
        });
        
        const avgDays = countWithPurchase > 0 ? (totalDays / countWithPurchase).toFixed(1) : 0;
        
        // Calculate earnings for users acquired in this month
        const earnings = referralData
            .filter(r => data.allUserIds.includes(r.userId))
            .reduce((sum, r) => sum + r.rewardGMT, 0);
        
        monthlyStats.push({
            month: monthKey,
            registration: data.registration,
            firstPurchase: data.firstPurchase,
            total: total,
            conversionRate: parseFloat(conversionRate),
            avgDays: parseFloat(avgDays),
            earnings: earnings
        });
    });
    
    // Sort by month (descending by default)
    monthlyStats.sort((a, b) => {
        let aVal = a[monthlySortColumn];
        let bVal = b[monthlySortColumn];
        
        if (monthlySortDirection === 'asc') {
            return aVal > bVal ? 1 : -1;
        } else {
            return aVal < bVal ? 1 : -1;
        }
    });
    
    // Render table
    const tbody = document.getElementById('monthlyAcquisitionBody');
    tbody.innerHTML = '';
    
    monthlyStats.forEach(stat => {
        const [year, month] = stat.month.split('-');
        const monthName = new Date(year, parseInt(month) - 1).toLocaleString('en', { month: 'short', year: 'numeric' });
        
        const regPercent = stat.total > 0 ? ((stat.registration / stat.total) * 100).toFixed(1) : 0;
        const fpPercent = stat.total > 0 ? ((stat.firstPurchase / stat.total) * 100).toFixed(1) : 0;
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${monthName}</strong></td>
            <td>${stat.registration} <span style="color: #888; font-size: 0.85em;">(${regPercent}%)</span></td>
            <td>${stat.firstPurchase} <span style="color: #888; font-size: 0.85em;">(${fpPercent}%)</span></td>
            <td><strong>${stat.total}</strong></td>
            <td>${stat.conversionRate}%</td>
            <td>${stat.avgDays} days</td>
            <td>${stat.earnings.toFixed(2)} GMT</td>
        `;
        tbody.appendChild(row);
    });
}

function sortMonthlyTable(column) {
    if (monthlySortColumn === column) {
        monthlySortDirection = monthlySortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        monthlySortColumn = column;
        monthlySortDirection = 'desc';
    }
    
    updatePerformanceAnalysis();
}

// ===========================
// FILTERING & SORTING
// ===========================

function filterData() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const typeFilter = document.getElementById('typeFilter').value;
    const statusFilter = document.getElementById('statusFilter').value;
    
    filteredData = referralData.filter(reward => {
        const matchesSearch = reward.userId.toLowerCase().includes(searchTerm);
        const matchesType = typeFilter === 'all' || reward.type === typeFilter;
        const matchesStatus = statusFilter === 'all' || reward.status === statusFilter;
        
        return matchesSearch && matchesType && matchesStatus;
    });
    
    updateTable();
}

function sortTable(column) {
    if (sortColumn === column) {
        sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        sortColumn = column;
        sortDirection = 'desc';
    }
    
    updateTable();
}

// ===========================
// EXPORT
// ===========================

function exportToCSV() {
    let csv = 'Date;Time;User_ID;Type;Purchase_GMT;Purchase_USD;Share_Percent;Reward_GMT;Reward_USD;Status\n';
    
    referralData.forEach(r => {
        csv += `"${r.date}";"${r.time}";"${r.userId}";"${r.type}";"${r.purchaseGMT}";"${r.purchaseUSD}";"${r.sharePercent}";"${r.rewardGMT}";"${r.rewardUSD}";"${r.status}"\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `referral_rewards_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// ===========================
// STORAGE
// ===========================

function saveToLocalStorage() {
    localStorage.setItem('referralData', JSON.stringify(referralData));
    showAutoSaveIndicator();
}

function loadFromLocalStorage() {
    const saved = localStorage.getItem('referralData');
    if (saved) {
        referralData = JSON.parse(saved);
    }
}

function backupData() {
    const backup = {
        timestamp: new Date().toISOString(),
        data: referralData
    };
    
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `referral_backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function restoreData(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const backup = JSON.parse(e.target.result);
            referralData = backup.data || backup;
            saveToLocalStorage();
            updateDisplay();
            alert('✅ Backup restored successfully!');
        } catch (error) {
            alert('❌ Error restoring backup.');
        }
    };
    reader.readAsText(file);
}

function clearAllData() {
    if (confirm('Are you sure you want to delete all referral data? This cannot be undone!')) {
        referralData = [];
        filteredData = [];
        localStorage.removeItem('referralData');
        document.getElementById('displaySection').style.display = 'none';
        alert('✅ All data cleared.');
    }
}

// ===========================
// UTILITY FUNCTIONS
// ===========================

function showMessage(elementId, message, type) {
    const element = document.getElementById(elementId);
    element.textContent = message;
    element.className = 'result-message ' + type;
    element.style.display = 'block';
    
    setTimeout(() => {
        element.style.display = 'none';
    }, 5000);
}

function showSpinner(spinnerId, show) {
    document.getElementById(spinnerId).style.display = show ? 'inline-block' : 'none';
}

function showAutoSaveIndicator() {
    const indicator = document.getElementById('autoSaveIndicator');
    indicator.style.opacity = '1';
    
    setTimeout(() => {
        indicator.style.opacity = '0';
    }, 2000);
}

function clearField(fieldId) {
    document.getElementById(fieldId).value = '';
}
