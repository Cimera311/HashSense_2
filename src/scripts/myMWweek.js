// Global State
let timezoneOffset = 0;
let transactions = [];
let allWeeks = [];
let selectedWeeks = [];
let chart = null;
let btcPriceUSD = 0;
let gmtPriceUSD = 0;
let selectedTypes = []; // Filter by transaction type
let showUSD = false; // Toggle between original currency and USD

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    detectTimezone();
    setupUpload();
    loadPrices();
});

// Detect User Timezone
function detectTimezone() {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const now = new Date();
    const offsetMinutes = -now.getTimezoneOffset();
    const offsetHours = offsetMinutes / 60;
    timezoneOffset = offsetHours;

    const sign = offsetHours >= 0 ? '+' : '';
    document.getElementById('timezoneInfo').textContent = 
        `${tz} (UTC${sign}${offsetHours})`;
    document.getElementById('timezoneOffset').textContent = 
        `UTC${sign}${offsetHours}`;
    
    updateWeekDisplay();
}

// Adjust Timezone (±1 hour)
function adjustTimezone(delta) {
    timezoneOffset += delta;
    const sign = timezoneOffset >= 0 ? '+' : '';
    document.getElementById('timezoneOffset').textContent = 
        `UTC${sign}${timezoneOffset}`;
    updateWeekDisplay();
    
    // Reprocess transactions if loaded
    if (transactions.length > 0) {
        processTransactions(transactions);
    }
}

// Update Week Display
function updateWeekDisplay() {
    const localHour = ((timezoneOffset % 24) + 24) % 24;
    const weekDisplay = document.getElementById('weekDisplay');
    
    weekDisplay.innerHTML = `
        <strong>🎯 Spells (Expenses):</strong> Tuesday ${String(localHour).padStart(2, '0')}:00 → Tuesday ${String(localHour).padStart(2, '0')}:00 (7 days)<br>
        <strong>💰 Rewards (Income):</strong> Wednesday ${String(localHour).padStart(2, '0')}:00 → Wednesday ${String(localHour).padStart(2, '0')}:00 (next week, excluding first 24h)
    `;
}

// Setup Upload Zone
function setupUpload() {
    const uploadZone = document.getElementById('uploadZone');
    const fileInput = document.getElementById('csvFileInput');

    uploadZone.addEventListener('click', () => fileInput.click());
    
    uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadZone.classList.add('dragover');
    });
    
    uploadZone.addEventListener('dragleave', () => {
        uploadZone.classList.remove('dragover');
    });
    
    uploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadZone.classList.remove('dragover');
        const files = e.dataTransfer.files;
        if (files.length > 0) handleFile(files[0]);
    });
    
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) handleFile(e.target.files[0]);
    });
}

// Handle CSV File
function handleFile(file) {
    if (!file.name.endsWith('.csv')) {
        alert('❌ Please upload a CSV file!');
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        const csv = e.target.result;
        parseCSV(csv);
    };
    reader.readAsText(file);
}

// Parse CSV
function parseCSV(csv) {
    const lines = csv.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
        alert('❌ CSV is empty or invalid!');
        return;
    }

    const dataLines = lines.slice(1);
    
    transactions = dataLines.map(line => {
        const parts = line.match(/(".*?"|[^;]+)(?=;|$)/g) || [];
        const cleanParts = parts.map(p => p.replace(/^"|"$/g, '').trim());

        if (cleanParts.length < 6) return null;

        const [dateStr, time, type, value, currency, status] = cleanParts;
        const normalizedDate = normalizeDateString(dateStr);

        return {
            date: normalizedDate,
            time: time,
            type: type,
            value: parseFloat(value.replace(',', '.').replace(/[^\d.-]/g, '')),
            currency: currency,
            status: status,
            timestamp: new Date(`${normalizedDate}T${time}Z`)
        };
    }).filter(t => t !== null);

    console.log(`📊 Parsed ${transactions.length} transactions`);
    
    // Extract unique transaction types for filter
    const uniqueTypes = [...new Set(transactions.map(t => t.type))];
    renderTypeFilter(uniqueTypes);
    
    processTransactions(transactions);
}

// Normalize Date String
function normalizeDateString(dateStr) {
    // YYYY-??-?? or YYYY/??/?? format (could be YYYY-MM-DD or YYYY-DD-MM)
    if (dateStr.match(/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/)) {
        const parts = dateStr.split(/[-/]/);
        const year = parts[0];
        const num1 = parseInt(parts[1]);
        const num2 = parseInt(parts[2]);
        
        // Heuristic: If num1 > 12, it must be YYYY-DD-MM
        if (num1 > 12) {
            // YYYY-DD-MM format (day-month) - swap to YYYY-MM-DD
            return `${year}-${num2.toString().padStart(2, '0')}-${num1.toString().padStart(2, '0')}`;
        } else {
            // YYYY-MM-DD format (already correct order) or ambiguous
            return `${year}-${num1.toString().padStart(2, '0')}-${num2.toString().padStart(2, '0')}`;
        }
    } 
    // DD.MM.YYYY format (European)
    else if (dateStr.match(/^\d{1,2}[.]\d{1,2}[.]\d{4}$/)) {
        const [d, m, y] = dateStr.split('.');
        return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    } 
    // DD/MM/YYYY or MM/DD/YYYY format
    else if (dateStr.match(/^\d{1,2}[/]\d{1,2}[/]\d{4}$/)) {
        const parts = dateStr.split('/');
        if (parseInt(parts[0]) > 12) {
            // Must be DD/MM/YYYY
            return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        } else {
            // Assume MM/DD/YYYY (US format)
            return `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
        }
    }
    return dateStr;
}

// Load BTC and GMT Prices from price-data JS files
function loadPrices() {
    try {
        // Get latest prices from price-data objects
        // btcPriceData and gmtPriceData are loaded from external JS files
        
        if (typeof btcPriceData === 'undefined' || typeof gmtPriceData === 'undefined') {
            throw new Error('Price data not loaded. Make sure price-data-btc.js and price-data-gmt.js are included.');
        }
        
        // Get most recent date from price data
        const btcDates = Object.keys(btcPriceData).sort();
        const gmtDates = Object.keys(gmtPriceData).sort();
        
        const latestBtcDate = btcDates[btcDates.length - 1];
        const latestGmtDate = gmtDates[gmtDates.length - 1];
        
        // Parse prices (format: "44152,2269\r" -> remove \r and replace comma)
        const btcPriceStr = btcPriceData[latestBtcDate].price_usd.replace('\r', '').replace(',', '.');
        const gmtPriceStr = gmtPriceData[latestGmtDate].price_usd.replace('\r', '').replace(',', '.');
        
        btcPriceUSD = parseFloat(btcPriceStr);
        gmtPriceUSD = parseFloat(gmtPriceStr);
        
        console.log(`💰 Loaded prices from ${latestBtcDate} / ${latestGmtDate}:`);
        console.log(`   BTC = $${btcPriceUSD.toFixed(2)}, GMT = $${gmtPriceUSD.toFixed(4)}`);
    } catch (error) {
        // Fallback prices
        btcPriceUSD = 95000;
        gmtPriceUSD = 0.35;
        
        console.error('❌ Failed to load price data:', error);
        console.log(`💰 Using fallback prices: BTC = $${btcPriceUSD.toFixed(2)}, GMT = $${gmtPriceUSD.toFixed(4)}`);
    }
}

// Define Type Categories and Default Selection
const TYPE_CONFIG = {
    // Expenses - während Cycle
    expensesDuringCycle: ['Spell purchase', 'Power upgrade', 'Miner purchase'],
    
    // Expenses - 24h nach Cycle
    expensesAfterCycle: ['Miner maintenance'],
    
    // Income - während Cycle
    incomeDuringCycle: ['GOMINING purchase', 'Referral bonus', 'Bounty program', 'Liquidity provider reward'],
    
    // Income - 24h nach Cycle
    incomeAfterCycle: ['Clan ownership rewards', 'Personal game rewards', 'Miner Wars reward'],
    
    // Default selected types
    defaultSelected: ['Clan ownership rewards', 'Personal game rewards', 'Miner Wars reward', 'Spell purchase', 'Miner maintenance']
};

// Render Type Filter
function renderTypeFilter(types) {
    const uploadCard = document.querySelector('.card');
    
    let filterCard = document.getElementById('typeFilterCard');
    if (!filterCard) {
        filterCard = document.createElement('div');
        filterCard.id = 'typeFilterCard';
        filterCard.className = 'card mt-3';
        uploadCard.insertAdjacentElement('afterend', filterCard);
    }
    
    filterCard.innerHTML = `
        <div class="card-header">
            🔍 Filter by Transaction Type
        </div>
        <div class="card-body">
            <div class="mb-2">
                <button class="btn btn-sm btn-primary me-2" onclick="selectDefaultTypes()">Select Default</button>
                <button class="btn btn-sm btn-outline-primary me-2" onclick="selectAllTypes()">Select All</button>
                <button class="btn btn-sm btn-outline-secondary" onclick="deselectAllTypes()">Deselect All</button>
            </div>
            <div id="typeCheckboxes" class="d-flex flex-wrap gap-2">
                ${types.map((type, idx) => {
                    const isDefault = TYPE_CONFIG.defaultSelected.includes(type);
                    return `
                        <div class="form-check">
                            <input class="form-check-input" type="checkbox" value="${type}" id="type${idx}" ${isDefault ? 'checked' : ''} onchange="updateTypeFilter()">
                            <label class="form-check-label" for="type${idx}">
                                ${type}
                            </label>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;
    
    // Initialize selectedTypes with default types
    selectedTypes = TYPE_CONFIG.defaultSelected.filter(t => types.includes(t));
}

// Type Filter Functions
window.selectDefaultTypes = function() {
    document.querySelectorAll('#typeCheckboxes input[type="checkbox"]').forEach(cb => {
        cb.checked = TYPE_CONFIG.defaultSelected.includes(cb.value);
    });
    updateTypeFilter();
};

window.selectAllTypes = function() {
    document.querySelectorAll('#typeCheckboxes input[type="checkbox"]').forEach(cb => cb.checked = true);
    updateTypeFilter();
};

window.deselectAllTypes = function() {
    document.querySelectorAll('#typeCheckboxes input[type="checkbox"]').forEach(cb => cb.checked = false);
    updateTypeFilter();
};

window.updateTypeFilter = function() {
    selectedTypes = Array.from(document.querySelectorAll('#typeCheckboxes input[type="checkbox"]:checked'))
        .map(cb => cb.value);
    
    if (allWeeks.length > 0) {
        updateDisplayForSelectedWeeks();
    }
};

// Process Transactions
function processTransactions(data) {
    // Find all Miner Wars Weeks in data
    allWeeks = findAllMWWeeks(data);
    
    console.log(`🎮 Found ${allWeeks.length} Miner Wars Weeks in data`);
    allWeeks.forEach((week, idx) => {
        console.log(`   Week ${idx + 1}: ${week.label}`);
    });

    if (allWeeks.length === 0) {
        alert('❌ No Miner Wars weeks found in data!');
        return;
    }

    // Select most recent completed week by default
    const now = new Date();
    const lastCompletedWeek = allWeeks.find(w => w.spellEnd < now);
    selectedWeeks = lastCompletedWeek ? [lastCompletedWeek.id] : [allWeeks[allWeeks.length - 1].id];

    // Render week selector
    renderWeekSelector();

    // Update display
    updateDisplayForSelectedWeeks();
}

// Find All MW Weeks in Data
function findAllMWWeeks(data) {
    if (data.length === 0) return [];

    // 1. Sammle alle Transaktions-Timestamps
    const timestamps = data.map(t => t.timestamp).sort((a, b) => a - b);
    const earliest = timestamps[0];
    const latest = timestamps[timestamps.length - 1];

    console.log('🔍 DEBUG: Earliest transaction:', earliest.toISOString());
    console.log('🔍 DEBUG: Latest transaction:', latest.toISOString());
    console.log('🔍 DEBUG: Current timezone offset:', timezoneOffset, 'hours');

    // 2. Erstelle Array mit allen Tagen vom frühesten bis spätesten Datum
    // WICHTIG: Wir arbeiten in UTC (00:00 UTC), nicht mit lokalem Offset!
    const allDays = [];
    let currentDay = new Date(earliest);
    currentDay.setUTCHours(0, 0, 0, 0);
    
    console.log('🔍 DEBUG: Start day before -7:', currentDay.toISOString(), 'Day of week:', currentDay.getUTCDay());
    
    // Gehe 7 Tage vor dem frühesten zurück, um sicherzustellen wir fangen vor allen Transaktionen an
    currentDay.setUTCDate(currentDay.getUTCDate() - 7);
    
    console.log('🔍 DEBUG: Start day after -7:', currentDay.toISOString(), 'Day of week:', currentDay.getUTCDay());
    
    const endDay = new Date(latest);
    endDay.setUTCHours(0, 0, 0, 0);
    endDay.setUTCDate(endDay.getUTCDate() + 7); // und 7 Tage nach dem letzten
    
    while (currentDay <= endDay) {
        allDays.push(new Date(currentDay));
        currentDay.setUTCDate(currentDay.getUTCDate() + 1);
    }

    // 3. Filtere nur Dienstage (getUTCDay() === 2)
    const allTuesdays = allDays.filter(day => day.getUTCDay() === 2);
    
    console.log(`📅 Found ${allTuesdays.length} Tuesdays in date range`);
    allTuesdays.forEach((tue, idx) => {
        console.log(`   Tuesday ${idx + 1}:`, tue.toISOString(), '= Day of week:', tue.getUTCDay());
    });

    // 4. Erstelle MW-Wochen aus aufeinanderfolgenden Dienstagen
    const weeks = [];
    for (let i = 0; i < allTuesdays.length - 1; i++) {
        const cycleStart = allTuesdays[i];          // Dienstag 00:00 UTC
        const nextTuesday = allTuesdays[i + 1];     // Nächster Dienstag 00:00 UTC
        
        // Cycle Ende ist Montag 23:59:59 (1 Sekunde vor nächstem Dienstag)
        const cycleEnd = new Date(nextTuesday.getTime() - 1000); // -1 Sekunde
        
        // Rewards/Maintenance Fenster: Dienstag 00:00 - 23:59:59 (nach Cycle-Ende)
        const rewardStart = nextTuesday;
        const rewardEnd = new Date(nextTuesday);
        rewardEnd.setUTCDate(rewardEnd.getUTCDate() + 1);
        rewardEnd.setUTCMilliseconds(rewardEnd.getUTCMilliseconds() - 1); // 23:59:59.999

        // Format label with user's timezone offset
        const formatLocalDate = (date) => {
            const localDate = new Date(date.getTime() + timezoneOffset * 60 * 60 * 1000);
            const day = String(localDate.getUTCDate()).padStart(2, '0');
            const month = String(localDate.getUTCMonth() + 1).padStart(2, '0');
            const year = localDate.getUTCFullYear();
            return `${day}.${month}.${year}`;
        };
        
        // Label zeigt Start (Di) bis Ende (Mo)
        const endLabel = new Date(cycleEnd);

        weeks.push({
            id: i + 1,
            cycleStart,      // Dienstag 00:00
            cycleEnd,        // Montag 23:59:59
            rewardStart,     // Dienstag 00:00 (nächste Woche)
            rewardEnd,       // Dienstag 23:59:59 (nächste Woche)
            label: `${formatLocalDate(cycleStart)} - ${formatLocalDate(endLabel)}`
        });
    }

    return weeks;
}

// Render Week Selector
function renderWeekSelector() {
    const uploadCard = document.querySelector('.card');
    
    // Check if selector already exists
    let selectorCard = document.getElementById('weekSelectorCard');
    if (!selectorCard) {
        selectorCard = document.createElement('div');
        selectorCard.id = 'weekSelectorCard';
        selectorCard.className = 'card mt-3';
        selectorCard.innerHTML = `
            <div class="card-header">
                📅 Select Miner Wars Weeks to Compare
            </div>
            <div class="card-body" id="weekSelectorBody"></div>
        `;
        uploadCard.parentElement.appendChild(selectorCard);
    }

    const body = document.getElementById('weekSelectorBody');
    body.innerHTML = '';

    // Add "Select All" / "Deselect All" buttons
    const buttonRow = document.createElement('div');
    buttonRow.className = 'mb-3';
    buttonRow.innerHTML = `
        <button class="btn btn-sm btn-outline-primary me-2" onclick="selectAllWeeks()">Select All</button>
        <button class="btn btn-sm btn-outline-secondary" onclick="deselectAllWeeks()">Deselect All</button>
    `;
    body.appendChild(buttonRow);

    // Add checkboxes for each week
    const checkboxContainer = document.createElement('div');
    checkboxContainer.className = 'row g-2';
    
    allWeeks.forEach(week => {
        const col = document.createElement('div');
        col.className = 'col-md-4';
        
        const isChecked = selectedWeeks.includes(week.id);
        const now = new Date();
        const isCompleted = week.spellEnd < now;
        const statusBadge = isCompleted 
            ? '<span class="badge bg-success ms-2">Completed</span>' 
            : '<span class="badge bg-warning ms-2">Ongoing</span>';
        
        col.innerHTML = `
            <div class="form-check">
                <input class="form-check-input" type="checkbox" id="week${week.id}" 
                       ${isChecked ? 'checked' : ''} 
                       onchange="toggleWeek(${week.id})">
                <label class="form-check-label" for="week${week.id}">
                    ${week.label} ${statusBadge}
                </label>
            </div>
        `;
        checkboxContainer.appendChild(col);
    });
    
    body.appendChild(checkboxContainer);
}

// Toggle Week Selection
function toggleWeek(weekId) {
    if (selectedWeeks.includes(weekId)) {
        selectedWeeks = selectedWeeks.filter(id => id !== weekId);
    } else {
        selectedWeeks.push(weekId);
    }
    updateDisplayForSelectedWeeks();
}

// Select All Weeks
function selectAllWeeks() {
    selectedWeeks = allWeeks.map(w => w.id);
    allWeeks.forEach(w => {
        document.getElementById(`week${w.id}`).checked = true;
    });
    updateDisplayForSelectedWeeks();
}

// Deselect All Weeks
function deselectAllWeeks() {
    selectedWeeks = [];
    allWeeks.forEach(w => {
        document.getElementById(`week${w.id}`).checked = false;
    });
    updateDisplayForSelectedWeeks();
}

// Update Display for Selected Weeks
function updateDisplayForSelectedWeeks() {
    if (selectedWeeks.length === 0) {
        document.getElementById('statsSection').style.display = 'none';
        document.getElementById('chartSection').style.display = 'none';
        document.getElementById('tableSection').style.display = 'none';
        return;
    }

    // Use selectedTypes from filter (or all types if none selected)
    const activeTypes = selectedTypes.length > 0 ? selectedTypes : 
        [...new Set(transactions.map(t => t.type))];

    // Aggregate data from selected weeks
    let allFilteredTx = [];
    let totalSpells = 0;
    let totalExpenses = { BTC: 0, GMT: 0 };
    let totalRewards = { BTC: 0, GMT: 0 };

    const weekData = selectedWeeks.map(weekId => {
        const week = allWeeks.find(w => w.id === weekId);
        
        const weekTx = transactions.filter(t => {
            // Apply user's type filter
            if (!activeTypes.includes(t.type)) return false;

            // Filter by time window based on type category
            if (TYPE_CONFIG.expensesDuringCycle.includes(t.type)) {
                // Expenses während Cycle: (Di 00:00 - Mo 23:59:59)
                return t.timestamp >= week.cycleStart && t.timestamp <= week.cycleEnd;
            } else if (TYPE_CONFIG.expensesAfterCycle.includes(t.type)) {
                // Expenses nach Cycle: 24h nach Cycle-Ende (Di 00:00 - Di 23:59:59)
                return t.timestamp >= week.rewardStart && t.timestamp <= week.rewardEnd;
            } else if (TYPE_CONFIG.incomeDuringCycle.includes(t.type)) {
                // Income während Cycle: (Di 00:00 - Mo 23:59:59)
                return t.timestamp >= week.cycleStart && t.timestamp <= week.cycleEnd;
            } else if (TYPE_CONFIG.incomeAfterCycle.includes(t.type)) {
                // Income nach Cycle: 24h nach Cycle-Ende (Di 00:00 - Di 23:59:59)
                return t.timestamp >= week.rewardStart && t.timestamp <= week.rewardEnd;
            }
            
            // Unknown types: include in cycle window
            return t.timestamp >= week.cycleStart && t.timestamp <= week.cycleEnd;
        });

        // Separate expenses and income
        const expenseTx = weekTx.filter(t => 
            TYPE_CONFIG.expensesDuringCycle.includes(t.type) || 
            TYPE_CONFIG.expensesAfterCycle.includes(t.type)
        );
        const incomeTx = weekTx.filter(t => 
            TYPE_CONFIG.incomeDuringCycle.includes(t.type) || 
            TYPE_CONFIG.incomeAfterCycle.includes(t.type)
        );

        const weekSpells = expenseTx.filter(t => t.type === 'Spell purchase').length;
        
        // Calculate expenses by currency
        const weekExpensesGMT = Math.abs(expenseTx.filter(t => t.currency === 'GMT').reduce((sum, t) => sum + t.value, 0));
        const weekExpensesBTC = Math.abs(expenseTx.filter(t => t.currency === 'BTC').reduce((sum, t) => sum + t.value, 0));
        
        // Calculate income by currency
        const weekRewardsGMT = incomeTx.filter(t => t.currency === 'GMT').reduce((sum, t) => sum + t.value, 0);
        const weekRewardsBTC = incomeTx.filter(t => t.currency === 'BTC').reduce((sum, t) => sum + t.value, 0);

        totalSpells += weekSpells;
        totalExpenses.GMT += weekExpensesGMT;
        totalExpenses.BTC += weekExpensesBTC;
        totalRewards.GMT += weekRewardsGMT;
        totalRewards.BTC += weekRewardsBTC;
        allFilteredTx.push(...weekTx);

        // Convert to USD for chart
        const weekExpensesUSD = (weekExpensesGMT * gmtPriceUSD) + (weekExpensesBTC * btcPriceUSD);
        const weekRewardsUSD = (weekRewardsGMT * gmtPriceUSD) + (weekRewardsBTC * btcPriceUSD);

        return {
            label: week.label,
            expenses: weekExpensesUSD,
            rewards: weekRewardsUSD
        };
    });

    // Update Stats
    updateStats(totalSpells, totalExpenses, totalRewards);

    // Update Chart (multi-week comparison)
    updateChart(weekData);

    // Update Table
    updateTable(allFilteredTx);

    // Show sections
    document.getElementById('statsSection').style.display = 'flex';
    document.getElementById('chartSection').style.display = 'block';
    document.getElementById('tableSection').style.display = 'block';
}

// Toggle Currency Display
window.toggleCurrency = function() {
    showUSD = !showUSD;
    const btn = document.getElementById('currencyToggle');
    btn.textContent = showUSD ? 'Show Original Currency' : 'Show USD';
    
    if (allWeeks.length > 0) {
        updateDisplayForSelectedWeeks();
    }
};

// Update Stats
function updateStats(spells, expenses, rewards) {
    document.getElementById('statSpells').textContent = spells;
    
    // Calculate USD values
    const expensesUSD = (expenses.GMT * gmtPriceUSD) + (expenses.BTC * btcPriceUSD);
    const rewardsGMTUSD = rewards.GMT * gmtPriceUSD;
    const rewardsBTCUSD = rewards.BTC * btcPriceUSD;
    const rewardsUSD = rewardsGMTUSD + rewardsBTCUSD;
    
    // Calculate net in original currencies
    const netGMT = rewards.GMT - expenses.GMT;
    const netBTC = rewards.BTC - expenses.BTC;
    const netUSD = rewardsUSD - expensesUSD;
    
    if (showUSD) {
        // Show USD
        document.getElementById('statExpenses').innerHTML = `$${expensesUSD.toFixed(2)}`;
        document.getElementById('statRewardsGMT').innerHTML = `$${rewardsGMTUSD.toFixed(2)}`;
        document.getElementById('statRewardsBTC').innerHTML = `$${rewardsBTCUSD.toFixed(2)}`;
        
        // Net result in USD
        const netEl = document.getElementById('statNet');
        netEl.innerHTML = `$${(netUSD >= 0 ? '+' : '')}${netUSD.toFixed(2)}`;
        netEl.className = 'stat-value ' + (netUSD >= 0 ? 'income' : 'expense');
    } else {
        // Show original currency
        const expensesGMT = expenses.GMT > 0 ? `${expenses.GMT.toFixed(4)} GMT` : '';
        const expensesBTC = expenses.BTC > 0 ? `${expenses.BTC.toFixed(8)} BTC` : '';
        const expensesText = [expensesGMT, expensesBTC].filter(x => x).join(' + ') || '0';
        document.getElementById('statExpenses').innerHTML = expensesText;
        
        document.getElementById('statRewardsGMT').innerHTML = rewards.GMT > 0 ? `${rewards.GMT.toFixed(4)} GMT` : '0 GMT';
        document.getElementById('statRewardsBTC').innerHTML = rewards.BTC > 0 ? `${rewards.BTC.toFixed(8)} BTC` : '0 BTC';
        
        // Net result in original currencies
        const netGMTText = netGMT !== 0 ? `${(netGMT >= 0 ? '+' : '')}${netGMT.toFixed(4)} GMT` : '';
        const netBTCText = netBTC !== 0 ? `${(netBTC >= 0 ? '+' : '')}${netBTC.toFixed(8)} BTC` : '';
        const netText = [netGMTText, netBTCText].filter(x => x).join('<br>') || '0';
        
        const netEl = document.getElementById('statNet');
        netEl.innerHTML = netText;
        netEl.className = 'stat-value ' + (netUSD >= 0 ? 'income' : 'expense');
    }
}

// Update Chart (Multi-Week)
function updateChart(weekData) {
    const ctx = document.getElementById('mwChart').getContext('2d');

    if (chart) chart.destroy();

    const labels = weekData.map(w => w.label);
    const expensesData = weekData.map(w => w.expenses);
    const rewardsData = weekData.map(w => w.rewards);

    chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Expenses (USD)',
                    data: expensesData,
                    backgroundColor: 'rgba(255, 77, 77, 0.8)',
                    borderColor: '#ff4d4d',
                    borderWidth: 2
                },
                {
                    label: 'Rewards (USD)',
                    data: rewardsData,
                    backgroundColor: 'rgba(0, 255, 127, 0.8)',
                    borderColor: '#00ff7f',
                    borderWidth: 2
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { 
                    display: true,
                    labels: { color: '#adb5bd' }
                },
                tooltip: {
                    callbacks: {
                        label: (ctx) => `${ctx.dataset.label}: $${ctx.parsed.y.toFixed(2)}`
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { color: '#adb5bd' },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                },
                x: {
                    ticks: { 
                        color: '#adb5bd',
                        maxRotation: 45,
                        minRotation: 45
                    },
                    grid: { display: false }
                }
            }
        }
    });
}

// Update Table
function updateTable(data) {
    const tbody = document.getElementById('transactionTableBody');
    tbody.innerHTML = '';

    // Sort by date/time
    data.sort((a, b) => a.timestamp - b.timestamp);

    data.forEach(tx => {
        const row = document.createElement('tr');
        const isExpense = TYPE_CONFIG.expensesDuringCycle.includes(tx.type) || 
                          TYPE_CONFIG.expensesAfterCycle.includes(tx.type);
        const category = isExpense ? 
            '<span class="badge bg-danger">Expense</span>' : 
            '<span class="badge bg-success">Income</span>';
        
        // Format value based on currency
        let valueFormatted;
        let valueUSD;
        if (tx.currency === 'BTC') {
            valueFormatted = tx.value.toFixed(8);
            valueUSD = (tx.value * btcPriceUSD).toFixed(2);
        } else { // GMT
            valueFormatted = tx.value.toFixed(4);
            valueUSD = (tx.value * gmtPriceUSD).toFixed(2);
        }
        
        row.innerHTML = `
            <td>${tx.date}</td>
            <td>${tx.time}</td>
            <td>${tx.type}</td>
            <td class="${tx.value < 0 ? 'expense' : 'income'}">${valueFormatted} ${tx.currency}<br><small class="text-muted">$${valueUSD}</small></td>
            <td>${category}</td>
        `;
        tbody.appendChild(row);
    });
}

// Export CSV
function exportCSV() {
    let csv = 'Date;Time;Type;Value;USD Value;Category\n';
    
    // Export from original data
    const tbody = document.getElementById('transactionTableBody');
    const rows = Array.from(tbody.querySelectorAll('tr'));
    
    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        const date = cells[0].textContent;
        const time = cells[1].textContent;
        const type = cells[2].textContent;
        const valueCell = cells[3].textContent.trim();
        const category = cells[4].textContent.trim();
        
        // Extract value and USD from cell (format: "0.00001234 BTC\n$1.23")
        const lines = valueCell.split('\n');
        const value = lines[0];
        const usd = lines[1].replace('$', '');
        
        csv += `"${date}";"${time}";"${type}";"${value}";"${usd}";"${category}"\n`;
    });

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
    
    link.setAttribute('href', url);
    link.setAttribute('download', `MinerWars_Weeks_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Copy Script to Clipboard
function copyScriptToClipboard() {
    const script = `
globalThis.cancelExport = false;
globalThis.dateFormat = 'us';

function normalizeDate(dateStr, format) {
    if (format === 'eu') {
        if (dateStr.includes('/')) {
            const [d, m, y] = dateStr.split('/');
            return \`\${y}-\${m.padStart(2,'0')}-\${d.padStart(2,'0')}\`;
        } else if (dateStr.includes('.')) {
            const [d, m, y] = dateStr.split('.');
            return \`\${y}-\${m.padStart(2,'0')}-\${d.padStart(2,'0')}\`;
        }
    } else {
        if (dateStr.includes('/')) {
            const [m, d, y] = dateStr.split('/');
            return \`\${y}-\${m.padStart(2,'0')}-\${d.padStart(2,'0')}\`;
        }
    }
    return dateStr;
}

(async function () {
    window.cancelGoMiningExport = function () {
        cancelExport = true;
        console.log("Export manually aborted! 🚫");
    };

    function getFirstRowKey() {
        const firstRow = document.querySelector('tbody tr');
        const rawDate = firstRow?.querySelector('datetime-display span.text-muted')?.innerText.trim() || '';
        const date = normalizeDate(rawDate, dateFormat);
        const time = firstRow?.querySelector('datetime-display span.fw-medium')?.innerText.trim() || '';
        const value = firstRow?.querySelector('[data-qa-column="value"] span.hidden-empty.ms-1 > span')?.innerText.trim() || '';
        const pageSpan = document.querySelector('div.w-100.d-flex.align-items-center.justify-content-center span.mx-2.p-2');
        const pageNumber = pageSpan?.innerText.trim() || '';
        return \`\${pageNumber}_\${date}_\${time}_\${value}\`;
    }

    function extractRows() {
        const rows = document.querySelectorAll('tbody tr');
        const extracted = [];

        rows.forEach(row => {
            const time = row.querySelector('datetime-display span.fw-medium')?.innerText.trim() || '';
            const rawDate = row.querySelector('datetime-display span.text-muted')?.innerText.trim() || '';
            const date = normalizeDate(rawDate, dateFormat);
            const type = row.querySelector('[data-qa-column="type"]')?.innerText.trim() || '';

            const valueElement = row.querySelector('[data-qa-column="value"]');
            let valueText = valueElement?.querySelector('span.hidden-empty.ms-1 > span')?.innerText.trim() || '';
            let isNegative = valueText.startsWith('-');
            valueText = valueText.replace('.', '#').replace(/[.,]/g, '').replace('#', ',');
            valueText = valueText.replace('+', '').replace('-', '');
            if (isNegative) {
                valueText = '-' + valueText;
            }

            let currency = '';
            if (valueElement?.querySelector('icon-gmt')) {
                currency = 'GMT';
            } else if (valueElement?.querySelector('icon-bitcoin-circle')) {
                currency = 'BTC';
            }

            const status = row.querySelector('[data-qa-column="status"]')?.innerText.trim() || '';

            extracted.push({ date, time, type, value: valueText, currency, status });
        });

        return extracted;
    }

    function exportToCSV(data) {
        let csv = "Date-DayMonthYear;Date-Time;Type;Value;Currency;Status\\n";
        data.forEach(item => {
            csv += \`"\${item.date}";"\${item.time}";"\${item.type}";"\${item.value}";"\${item.currency}";"\${item.status}"\\n\`;
        });

        let filename = "gomining_transactions.csv";
        const dateRangeElement = document.querySelector('.catalog-index_block-filter-item');
        if (dateRangeElement) {
            const dateText = dateRangeElement.innerText
                .trim()
                .replace(/\\s+/g, '_')
                .replace(/[,]/g, '')
                .replace(/[^\\w\\-]/g, '');
            filename = \`gomining_\${dateText}.csv\`;
        }

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    async function goMiningAutoExport() {
        let allData = [];
        let previousKey = getFirstRowKey();
        let pageCounter = 1;

        while (true) {
            if (cancelExport) {
                console.log("Export manually aborted! 🚫");
                break;
            }

            console.log(\`Page done \${pageCounter}...\`);
            allData = allData.concat(extractRows());

            let icon = document.querySelector('icon-arrow-short[direction="right"]');
            let nextButton = icon?.closest('button');

            if (!nextButton || nextButton.disabled) {
                console.log("Button not ready yet. Waiting 5 seconds and trying again...");
                await new Promise(r => setTimeout(r, 5000));
                icon = document.querySelector('icon-arrow-short[direction="right"]');
                nextButton = icon?.closest('button');

                if (!nextButton || nextButton.disabled) {
                    console.log("Button still not ready. Waiting again...");
                    await new Promise(r => setTimeout(r, 5000));
                    icon = document.querySelector('icon-arrow-short[direction="right"]');
                    nextButton = icon?.closest('button');

                    if (!nextButton || nextButton.disabled) {
                        console.log("Still no button. Exporting current data and stopping.");
                        break;
                    }
                }
            }

            nextButton.click();
            if (pageCounter % 10 === 0) {
                console.log(\`Short break after page \${pageCounter}...\`);
                await new Promise(r => setTimeout(r, 5000));
            } else {
                await new Promise(r => setTimeout(r, 350));
            }

            let newKey = getFirstRowKey();
            if (newKey === previousKey) {
                console.log("Page appears unchanged. Waiting 5 seconds and checking again...");
                await new Promise(r => setTimeout(r, 5000));
                newKey = getFirstRowKey();

                if (newKey === previousKey) {
                    console.log("Page still unchanged. Saving final page...");
                    allData = allData.concat(extractRows());
                    break;
                }
            }

            previousKey = newKey;
            pageCounter++;
        }

        if (allData.length > 0) {
            console.log(\`Exporting \${allData.length} transactions...\`);
            exportToCSV(allData);
        } else {
            console.log("No data collected to export.");
        }
    }

    await goMiningAutoExport();
})();
`.trim();

    navigator.clipboard.writeText(script).then(() => {
        alert('✅ Export script copied to clipboard!\n\nPaste it in your browser console on GoMining transactions page.');
    }).catch(err => {
        console.error('Failed to copy script:', err);
        alert('❌ Failed to copy script. Please copy manually from console.');
        console.log(script);
    });
}