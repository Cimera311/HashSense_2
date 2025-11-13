// My GoMining Dashboard Script
// Handles transaction data parsing, analysis, and visualization

// Global state
let transactions = [];
let filteredTransactions = [];

// Chart instances
let balanceChart = null;
let typeChart = null;
let monthlyChart = null;
let miningChart = null;

// ===========================
// INITIALIZATION
// ===========================

document.addEventListener('DOMContentLoaded', function() {
    loadFromLocalStorage();
    
    if (transactions.length > 0) {
        updateDisplay();
    }
});

// ===========================
// DATA IMPORT
// ===========================

function handleFileUpload(event) {
    const file = event.target.files[0];
    
    if (!file) {
        showMessage('csvMessage', '❌ No file selected', 'error');
        return;
    }
    
    const reader = new FileReader();
    
    reader.onload = function(e) {
        const csvContent = e.target.result;
        parseCSVContent(csvContent, 'csvMessage');
    };
    
    reader.onerror = function() {
        showMessage('csvMessage', '❌ Error reading file', 'error');
    };
    
    reader.readAsText(file);
}

function parseCSVPaste() {
    const content = document.getElementById('pasteInput').value.trim();
    
    if (!content) {
        showMessage('pasteMessage', '❌ Please paste CSV data first', 'error');
        return;
    }
    
    parseCSVContent(content, 'pasteMessage');
}

function parseCSVContent(content, messageElementId) {
    try {
        const lines = content.split('\n').filter(line => line.trim());
        
        if (lines.length < 2) {
            showMessage(messageElementId, '❌ CSV file is empty or invalid', 'error');
            return;
        }
        
        // Parse header
        const header = lines[0].split(';').map(h => h.trim().replace(/"/g, ''));
        
        // Expected columns (flexible order detection)
        const dateIdx = header.findIndex(h => 
            h.toLowerCase().includes('date-daymonthyear') || 
            h.toLowerCase().includes('date') || 
            h.toLowerCase().includes('datum')
        );
        const timeIdx = header.findIndex(h => 
            h.toLowerCase().includes('date-time') || 
            h.toLowerCase().includes('time') || 
            h.toLowerCase().includes('zeit')
        );
        const typeIdx = header.findIndex(h => h.toLowerCase().includes('type') || h.toLowerCase().includes('typ'));
        const valueIdx = header.findIndex(h => 
            h.toLowerCase().includes('value') || 
            h.toLowerCase().includes('amount') || 
            h.toLowerCase().includes('betrag')
        );
        const currencyIdx = header.findIndex(h => h.toLowerCase().includes('currency') || h.toLowerCase().includes('währung'));
        const statusIdx = header.findIndex(h => h.toLowerCase().includes('status'));
        
        const newTransactions = [];
        let runningBalance = 0;
        
        // Parse data rows
        for (let i = 1; i < lines.length; i++) {
            const cells = lines[i].split(';').map(c => c.trim().replace(/"/g, ''));
            
            if (cells.length < 4) continue; // Skip invalid rows
            
            // Parse amount (handle German number format with comma as decimal separator)
            let amount = 0;
            if (valueIdx >= 0 && cells[valueIdx]) {
                amount = parseFloat(cells[valueIdx].replace(',', '.')) || 0;
            }
            
            // Get currency (default to GMT if not found)
            const currency = currencyIdx >= 0 ? cells[currencyIdx] : 'GMT';
            
            // Convert BTC to GMT if needed (approximate conversion)
            if (currency === 'BTC') {
                amount = amount * 100000; // Rough BTC to GMT conversion for display
            }
            
            // Calculate running balance
            runningBalance += amount;
            
            // Clean date (remove quotes)
            const dateStr = dateIdx >= 0 ? cells[dateIdx] : '';
            const timeStr = timeIdx >= 0 ? cells[timeIdx] : '';
            
            const transaction = {
                date: dateStr,
                time: timeStr,
                type: typeIdx >= 0 ? cells[typeIdx] : 'Unknown',
                description: typeIdx >= 0 ? cells[typeIdx] : '', // Use type as description
                amount: amount,
                balance: runningBalance,
                status: statusIdx >= 0 ? cells[statusIdx] : 'Success',
                currency: currency
            };
            
            newTransactions.push(transaction);
        }
        
        if (newTransactions.length === 0) {
            showMessage(messageElementId, '❌ No valid transactions found', 'error');
            return;
        }
        
        // Sort by date/time (oldest first) to calculate balance correctly
        newTransactions.sort((a, b) => {
            const dateA = new Date(a.date + ' ' + a.time);
            const dateB = new Date(b.date + ' ' + b.time);
            return dateA - dateB;
        });
        
        // Recalculate balance from oldest to newest
        runningBalance = 0;
        newTransactions.forEach(t => {
            runningBalance += t.amount;
            t.balance = runningBalance;
        });
        
        // Store in global variable
        transactions = newTransactions;
        
        // Save to localStorage
        saveToLocalStorage();
        
        // Update display
        updateDisplay();
        
        showMessage(messageElementId, `✅ Successfully imported ${newTransactions.length} transactions!`, 'success');
        
        // Clear input
        if (messageElementId === 'pasteMessage') {
            document.getElementById('pasteInput').value = '';
        }
        
    } catch (error) {
        console.error('Parse error:', error);
        showMessage(messageElementId, '❌ Error parsing CSV: ' + error.message, 'error');
    }
}

// ===========================
// LOCAL STORAGE
// ===========================

function saveToLocalStorage() {
    try {
        localStorage.setItem('myTransactions', JSON.stringify(transactions));
    } catch (error) {
        console.error('Error saving to localStorage:', error);
    }
}

function loadFromLocalStorage() {
    try {
        const stored = localStorage.getItem('myTransactions');
        if (stored) {
            transactions = JSON.parse(stored);
        }
    } catch (error) {
        console.error('Error loading from localStorage:', error);
        transactions = [];
    }
}

function clearAllData() {
    if (confirm('Are you sure you want to delete all transaction data? This cannot be undone!')) {
        transactions = [];
        filteredTransactions = [];
        localStorage.removeItem('myTransactions');
        document.getElementById('displaySection').style.display = 'none';
        alert('✅ All data cleared.');
    }
}

// ===========================
// DISPLAY UPDATE
// ===========================

function updateDisplay() {
    if (transactions.length === 0) {
        document.getElementById('displaySection').style.display = 'none';
        return;
    }
    
    document.getElementById('displaySection').style.display = 'block';
    
    updateStatistics();
    updateCharts();
    updateTable();
}

function updateStatistics() {
    // Current balance (last transaction balance)
    const sortedByDate = [...transactions].sort((a, b) => 
        new Date(b.date + ' ' + b.time) - new Date(a.date + ' ' + a.time)
    );
    const currentBalance = sortedByDate.length > 0 ? sortedByDate[0].balance : 0;
    
    document.getElementById('statBalance').textContent = currentBalance.toFixed(2) + ' GMT';
    document.getElementById('statBalanceUSD').textContent = '$' + (currentBalance * 0.5).toFixed(2); // Placeholder rate
    
    // Mining revenue
    const miningTransactions = transactions.filter(t => 
        t.type.toLowerCase().includes('mining') || 
        t.description.toLowerCase().includes('mining')
    );
    const totalMining = miningTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const miningDays = new Set(miningTransactions.map(t => t.date)).size;
    
    document.getElementById('statMining').textContent = totalMining.toFixed(2) + ' GMT';
    document.getElementById('statMiningDays').textContent = miningDays + ' days';
    
    // Deposits
    const deposits = transactions.filter(t => 
        t.type.toLowerCase().includes('deposit') || 
        t.amount > 0 && !t.type.toLowerCase().includes('mining')
    );
    const totalDeposits = deposits.reduce((sum, t) => sum + Math.abs(t.amount), 0);
    
    document.getElementById('statDeposits').textContent = totalDeposits.toFixed(2) + ' GMT';
    document.getElementById('statDepositCount').textContent = deposits.length + ' transactions';
    
    // Withdrawals
    const withdrawals = transactions.filter(t => 
        t.type.toLowerCase().includes('withdrawal') || 
        t.type.toLowerCase().includes('withdraw')
    );
    const totalWithdrawals = withdrawals.reduce((sum, t) => sum + Math.abs(t.amount), 0);
    
    document.getElementById('statWithdrawals').textContent = totalWithdrawals.toFixed(2) + ' GMT';
    document.getElementById('statWithdrawalCount').textContent = withdrawals.length + ' transactions';
    
    // ROI calculation
    const invested = totalDeposits;
    const earned = totalMining;
    const roi = invested > 0 ? ((earned / invested) * 100) : 0;
    const daysToBreakEven = invested > 0 && totalMining > 0 && miningDays > 0 
        ? Math.ceil((invested - earned) / (totalMining / miningDays))
        : 0;
    
    document.getElementById('statROI').textContent = roi.toFixed(1) + '%';
    document.getElementById('statROIDetails').textContent = 
        daysToBreakEven > 0 ? `Break-even: ${daysToBreakEven} days` : 'Break-even reached! 🎉';
    
    // Average daily mining
    const avgDaily = miningDays > 0 ? totalMining / miningDays : 0;
    const bestDay = miningTransactions.length > 0 
        ? Math.max(...Object.values(
            miningTransactions.reduce((acc, t) => {
                acc[t.date] = (acc[t.date] || 0) + Math.abs(t.amount);
                return acc;
            }, {})
        ))
        : 0;
    
    document.getElementById('statAvgDaily').textContent = avgDaily.toFixed(2) + ' GMT';
    document.getElementById('statBestDay').textContent = 'Best: ' + bestDay.toFixed(2) + ' GMT';
}

function updateCharts() {
    createBalanceChart();
    createTypeChart();
    createMonthlyChart();
    createMiningChart();
}

function createBalanceChart() {
    // Sort by date
    const sorted = [...transactions].sort((a, b) => 
        new Date(a.date + ' ' + a.time) - new Date(b.date + ' ' + b.time)
    );
    
    const labels = sorted.map(t => t.date);
    const data = sorted.map(t => t.balance);
    
    if (balanceChart) {
        balanceChart.destroy();
    }
    
    const ctx = document.getElementById('balanceChart').getContext('2d');
    balanceChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Balance (GMT)',
                data: data,
                borderColor: '#00ff7f',
                backgroundColor: 'rgba(0, 255, 127, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            scales: {
                x: {
                    ticks: { 
                        color: '#aaa',
                        maxRotation: 45,
                        minRotation: 45
                    },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                },
                y: {
                    beginAtZero: true,
                    ticks: { color: '#aaa' },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                }
            },
            plugins: {
                legend: {
                    labels: { color: '#fff' }
                }
            }
        }
    });
}

function createTypeChart() {
    // Count transaction types
    const typeCounts = {};
    
    transactions.forEach(t => {
        const type = categorizeTransaction(t);
        typeCounts[type] = (typeCounts[type] || 0) + 1;
    });
    
    const labels = Object.keys(typeCounts);
    const data = Object.values(typeCounts);
    const colors = labels.map(type => getTypeColor(type));
    
    if (typeChart) {
        typeChart.destroy();
    }
    
    const ctx = document.getElementById('typeChart').getContext('2d');
    typeChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors,
                borderColor: '#1a1a2e',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: '#fff' }
                }
            }
        }
    });
}

function createMonthlyChart() {
    // Group by month
    const monthlyData = {};
    
    transactions.forEach(t => {
        const date = new Date(t.date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        if (!monthlyData[monthKey]) {
            monthlyData[monthKey] = { income: 0, expenses: 0 };
        }
        
        if (t.amount > 0) {
            monthlyData[monthKey].income += t.amount;
        } else {
            monthlyData[monthKey].expenses += Math.abs(t.amount);
        }
    });
    
    const sortedMonths = Object.keys(monthlyData).sort();
    const incomeData = sortedMonths.map(m => monthlyData[m].income);
    const expensesData = sortedMonths.map(m => monthlyData[m].expenses);
    
    if (monthlyChart) {
        monthlyChart.destroy();
    }
    
    const ctx = document.getElementById('monthlyChart').getContext('2d');
    monthlyChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sortedMonths,
            datasets: [
                {
                    label: 'Income',
                    data: incomeData,
                    backgroundColor: 'rgba(0, 255, 127, 0.7)',
                    borderColor: '#00ff7f',
                    borderWidth: 1
                },
                {
                    label: 'Expenses',
                    data: expensesData,
                    backgroundColor: 'rgba(255, 77, 77, 0.7)',
                    borderColor: '#ff4d4d',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            scales: {
                x: {
                    ticks: { color: '#aaa' },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                },
                y: {
                    beginAtZero: true,
                    ticks: { color: '#aaa' },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                }
            },
            plugins: {
                legend: {
                    labels: { color: '#fff' }
                }
            }
        }
    });
}

function createMiningChart() {
    // Daily mining revenue
    const miningByDate = {};
    
    transactions.forEach(t => {
        if (categorizeTransaction(t) === 'Mining') {
            miningByDate[t.date] = (miningByDate[t.date] || 0) + Math.abs(t.amount);
        }
    });
    
    const sortedDates = Object.keys(miningByDate).sort();
    const miningData = sortedDates.map(d => miningByDate[d]);
    
    if (miningChart) {
        miningChart.destroy();
    }
    
    const ctx = document.getElementById('miningChart').getContext('2d');
    miningChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: sortedDates,
            datasets: [{
                label: 'Daily Mining (GMT)',
                data: miningData,
                borderColor: '#673dec',
                backgroundColor: 'rgba(103, 61, 236, 0.2)',
                borderWidth: 2,
                fill: true,
                tension: 0.2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            scales: {
                x: {
                    ticks: { 
                        color: '#aaa',
                        maxRotation: 45,
                        minRotation: 45
                    },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                },
                y: {
                    beginAtZero: true,
                    ticks: { color: '#aaa' },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                }
            },
            plugins: {
                legend: {
                    labels: { color: '#fff' }
                }
            }
        }
    });
}

// ===========================
// TABLE MANAGEMENT
// ===========================

function updateTable() {
    filteredTransactions = [...transactions];
    renderTable();
}

function renderTable() {
    const tbody = document.getElementById('transactionTableBody');
    tbody.innerHTML = '';
    
    filteredTransactions.forEach(t => {
        const row = document.createElement('tr');
        
        const type = categorizeTransaction(t);
        const typeClass = type.toLowerCase().replace(' ', '-');
        const amountClass = t.amount >= 0 ? 'amount-positive' : 'amount-negative';
        const amountSign = t.amount >= 0 ? '+' : '';
        
        row.innerHTML = `
            <td>${t.date}</td>
            <td>${t.time}</td>
            <td><span class="badge badge-${typeClass}">${type}</span></td>
            <td>${t.description || '-'}</td>
            <td class="${amountClass}">${amountSign}${t.amount.toFixed(2)} GMT</td>
            <td>${t.balance.toFixed(2)} GMT</td>
            <td>${t.status}</td>
        `;
        
        tbody.appendChild(row);
    });
}

function filterTransactions() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const typeFilter = document.getElementById('typeFilter').value;
    
    filteredTransactions = transactions.filter(t => {
        const matchesSearch = !searchTerm || 
            t.description.toLowerCase().includes(searchTerm) ||
            t.type.toLowerCase().includes(searchTerm) ||
            t.date.includes(searchTerm);
        
        const type = categorizeTransaction(t).toLowerCase();
        const matchesType = typeFilter === 'all' || type === typeFilter;
        
        return matchesSearch && matchesType;
    });
    
    sortTransactions();
}

function sortTransactions() {
    const sortBy = document.getElementById('sortBy').value;
    
    filteredTransactions.sort((a, b) => {
        if (sortBy === 'date-desc') {
            return new Date(b.date + ' ' + b.time) - new Date(a.date + ' ' + a.time);
        } else if (sortBy === 'date-asc') {
            return new Date(a.date + ' ' + a.time) - new Date(b.date + ' ' + b.time);
        } else if (sortBy === 'amount-desc') {
            return Math.abs(b.amount) - Math.abs(a.amount);
        } else if (sortBy === 'amount-asc') {
            return Math.abs(a.amount) - Math.abs(b.amount);
        }
    });
    
    renderTable();
}

// ===========================
// EXPORT
// ===========================

function exportToCSV() {
    let csv = 'Date;Time;Type;Description;Amount (GMT);Balance;Status\n';
    
    filteredTransactions.forEach(t => {
        csv += `${t.date};${t.time};${categorizeTransaction(t)};${t.description};${t.amount};${t.balance};${t.status}\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `my_transactions_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
}

// ===========================
// UTILITY FUNCTIONS
// ===========================

function categorizeTransaction(transaction) {
    const type = transaction.type.toLowerCase();
    const desc = transaction.description.toLowerCase();
    
    if (type.includes('mining') || desc.includes('mining')) {
        return 'Mining';
    } else if (type.includes('referral') || type.includes('bonus')) {
        return 'Referral';
    } else if (type.includes('bounty') || type.includes('program')) {
        return 'Bounty';
    } else if (type.includes('maintenance')) {
        return 'Maintenance';
    } else if (type.includes('deposit')) {
        return 'Deposit';
    } else if (type.includes('withdrawal') || type.includes('withdraw')) {
        return 'Withdrawal';
    } else if (type.includes('upgrade') || desc.includes('upgrade')) {
        return 'Upgrade';
    } else if (type.includes('purchase') || desc.includes('purchase')) {
        return 'Purchase';
    } else {
        return 'Other';
    }
}

function getTypeColor(type) {
    const colors = {
        'Mining': '#00ff7f',
        'Referral': '#a78bfa',
        'Bounty': '#ffd93d',
        'Maintenance': '#ff6b6b',
        'Deposit': '#007bff',
        'Withdrawal': '#ff4d4d',
        'Upgrade': '#ffc107',
        'Purchase': '#4ecdc4',
        'Other': '#888'
    };
    return colors[type] || '#888';
}

function showMessage(elementId, message, type) {
    const element = document.getElementById(elementId);
    element.textContent = message;
    element.className = 'result-message ' + type;
    element.style.display = 'block';
    
    setTimeout(() => {
        element.style.display = 'none';
    }, 5000);
}
