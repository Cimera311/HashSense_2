// skript-tables.js - Dynamische Tabellenerstellung für HashFarm
// Alle Funktionen für die Farm- und Miner-Tabellen

// Efficiency Matrix für Upgrade-Kosten-Berechnungen
const efficiencyMatrixfarm = {
    16: { to: 15, pricePerW: 1.02 },
    17: { to: 16, pricePerW: 1.02 },
    18: { to: 17, pricePerW: 1.02 },
    19: { to: 18, pricePerW: 1.02 },
    20: { to: 19, pricePerW: 1.02 },
    21: { to: 20, pricePerW: 1.50 },
    22: { to: 21, pricePerW: 1.50 },
    23: { to: 22, pricePerW: 1.50 },
    24: { to: 23, pricePerW: 1.50 },
    25: { to: 24, pricePerW: 1.50 },
    26: { to: 25, pricePerW: 1.50 },
    27: { to: 26, pricePerW: 1.50 },
    28: { to: 27, pricePerW: 1.50 },
    29: { to: 28, pricePerW: 0.72 },
    30: { to: 29, pricePerW: 0.72 },
    31: { to: 30, pricePerW: 0.72 },
    32: { to: 31, pricePerW: 0.72 },
    33: { to: 32, pricePerW: 0.72 },
    34: { to: 33, pricePerW: 0.72 },
    35: { to: 34, pricePerW: 0.72 },
    36: { to: 35, pricePerW: 0.15 },
    37: { to: 36, pricePerW: 0.15 },
    38: { to: 37, pricePerW: 0.15 },
    39: { to: 38, pricePerW: 0.15 },
    40: { to: 39, pricePerW: 0.15 },
    41: { to: 40, pricePerW: 0.15 },
    42: { to: 41, pricePerW: 0.15 },
    43: { to: 42, pricePerW: 0.15 },
    44: { to: 43, pricePerW: 0.15 },
    45: { to: 44, pricePerW: 0.15 },
    46: { to: 45, pricePerW: 0.15 },
    47: { to: 46, pricePerW: 0.15 },
    48: { to: 47, pricePerW: 0.15 },
    49: { to: 48, pricePerW: 0.15 },
    50: { to: 49, pricePerW: 0.15 }
};

/**
 * Lädt und erstellt die Farm-Übersichtstabelle dynamisch
 * @param {Array} minerData - Array mit allen Miner-Daten
 */
function ladeFarmTable(minerData) {
    let farmContent = document.getElementById('farm-content');
    if (!farmContent) {
        console.error("Fehler: #farm-content nicht gefunden.");
        return;
    }

    // Leere den kompletten farm-content Container
    farmContent.innerHTML = '';

    // Erstelle den scrollbaren Container für die Farm-Tabelle
    let tableContainer = document.createElement('div');
    tableContainer.className = 'overflow-x-auto bg-gray-800 rounded-lg border border-gray-700 mb-6';
    tableContainer.id = 'farm-table-container';

    // Neue Farm-Tabelle erstellen
    let tableElement = document.createElement('table');
    tableElement.id = 'farm-table';
    tableElement.className = 'w-full text-sm text-left';

    // Tabellenkopf hinzufügen
    let thead = document.createElement('thead');
    thead.innerHTML = `
        <tr class="bg-gray-700">
            <th class="px-4 py-3 text-gray-300 font-medium">Power (TH)</th>
            <th class="px-4 py-3 text-gray-300 font-medium">Efficiency (W/TH)</th>
            <th class="px-4 py-3 text-gray-300 font-medium">My Total Discount (%)</th>
            <th class="px-4 py-3 text-gray-300 font-medium">Farm worth $</th>
            <th class="px-4 py-3 text-gray-300 font-medium">Profit</th>
            <th class="px-4 py-3 text-gray-300 font-medium">Electricity -</th>
            <th class="px-4 py-3 text-gray-300 font-medium">Service -</th>
            <th class="px-4 py-3 text-gray-300 font-medium">Revenue</th>
        </tr>
    `;
    tableElement.appendChild(thead);

    // Tabellenkörper hinzufügen
    let tbody = document.createElement('tbody');
    tbody.id = 'farm-tbody';

    // Berechnung der Gesamtwerte für die Farm
    let totalPower = 0;
    let weightedEfficiencySum = 0;
    let btcPrice = parseFloat(document.getElementById('bitcoin-price-dropdown').value) || 0;
    let gmtPrice = parseFloat(document.getElementById('gmt-token-price').value) || 0;
                let satoshiPerTH = parseFloat(document.getElementById('sat-TH').value) || 44;
    
    let currencyElement = document.getElementById('currencyMode');
    let waehrung = currencyElement ? currencyElement.innerText : 'usd';

    minerData.forEach(miner => {
        let power = parseFloat(miner.power) || 0;
        let efficiency = parseFloat(miner.efficiency) || 0;
        totalPower += power;
        weightedEfficiencySum += (power * efficiency);
    });

    let user_data = JSON.parse(localStorage.getItem('user_data')) || { total_discount: 0 };
    let avgEfficiency = totalPower > 0 ? (weightedEfficiencySum / totalPower).toFixed(2) : 0;

    // Placeholder calculations - to be integrated with existing functions
    let revenue = calculateDailyRevenue(satoshiPerTH, totalPower, btcPrice, gmtPrice, avgEfficiency);
    let dailyelectricity = calculateDailyElectricity(totalPower, avgEfficiency, btcPrice, gmtPrice);
    let dailyservice = calculateDailyService(totalPower, btcPrice, gmtPrice);
    let worth = calculateWorth(getPricePerTH(avgEfficiency, totalPower), totalPower) || 0;

    // TODO: Integrate with existing calculation functions:
    // revenue = calculateDailyRevenue(satoshiPerTH, totalPower, btcPrice, gmtPrice, avgEfficiency);
    // dailyelectricity = calculateDailyElectricity(totalPower, avgEfficiency, btcPrice, gmtPrice);
    // dailyservice = calculateDailyService(totalPower, btcPrice, gmtPrice);
    // worth = calculateWorth(getPricePerTH(avgEfficiency, totalPower), totalPower);

    let profitbtc = revenue.btc - dailyelectricity.btc - dailyservice.btc;
    
    let revenueDisplay = '$0';
    let electricityDisplay = '$0';
    let serviceDisplay = '$0';
    let profitDisplay = '$0';

    if (waehrung === 'btc') {
        revenueDisplay = `${revenue.btc.toFixed(8)} BTC`;
        electricityDisplay = `${dailyelectricity.btc.toFixed(8)} BTC`;
        serviceDisplay = `${dailyservice.btc.toFixed(8)} BTC`;
        profitDisplay = `${profitbtc.toFixed(8)} BTC`;
    } else if (waehrung === 'usd') {
        revenueDisplay = `$${revenue.usd.toFixed(2)}`;
        electricityDisplay = `$${dailyelectricity.usd.toFixed(2)}`;
        serviceDisplay = `$${dailyservice.usd.toFixed(2)}`;
        profitDisplay = `$${(revenue.usd - dailyelectricity.usd - dailyservice.usd).toFixed(2)}`;
    } else if (waehrung === 'gmt') {
        revenueDisplay = `${revenue.gmt.toFixed(2)} GMT`;
        electricityDisplay = `${dailyelectricity.gmt.toFixed(2)} GMT`;
        serviceDisplay = `${dailyservice.gmt.toFixed(2)} GMT`;
        profitDisplay = `${(revenue.gmt - dailyelectricity.gmt - dailyservice.gmt).toFixed(2)} GMT`;
    }

    let row = document.createElement('tr');
    row.innerHTML = `
        <td class="px-4 py-3 border-t border-gray-700 text-white">${totalPower}</td>
        <td class="px-4 py-3 border-t border-gray-700 text-white">${avgEfficiency}</td>
        <td class="px-4 py-3 border-t border-gray-700 text-white">${user_data.total_discount}</td>
        <td class="px-4 py-3 border-t border-gray-700 text-white">$${worth}</td>
        <td class="px-4 py-3 border-t border-gray-700 text-white">${profitDisplay}</td>
        <td class="px-4 py-3 border-t border-gray-700 text-white">${electricityDisplay}</td>
        <td class="px-4 py-3 border-t border-gray-700 text-white">${serviceDisplay}</td>
        <td class="px-4 py-3 border-t border-gray-700 text-white">${revenueDisplay}</td>
    `;
    tbody.appendChild(row);
    tableElement.appendChild(tbody);

    // Container und Tabelle zusammenfügen
    tableContainer.appendChild(tableElement);
    farmContent.appendChild(tableContainer);
}

/**
 * Lädt und erstellt die detaillierte Miner-Tabelle dynamisch
 */
function ladenMinerInTabelle() {
    let minerData = JSON.parse(localStorage.getItem('minerData')) || [];
    
    let content = document.getElementById('content');
    if (!content) {
        console.error("Error: #content not found.");
        return;
    }

    // Define all available columns with keys and labels
    const allColumns = [
        { key: 'ID', label: 'ID' },
        { key: 'Miner Name', label: 'Miner Name' },
        { key: 'TH', label: 'TH' },
        { key: 'W/TH', label: 'W/TH' },
        { key: 'Worth', label: 'Worth' },
        { key: 'ROI TH', label: 'ROI TH' },
        { key: 'ROI Eff', label: 'ROI Eff' },
        { key: 'Profit', label: 'Profit' },
        { key: 'Electricity', label: 'Electricity' },
        { key: 'Service', label: 'Service' },
        { key: 'Revenue', label: 'Revenue' }
    ];

    // Get active columns from localStorage or default to all columns
    let activeColumns = JSON.parse(localStorage.getItem('minerTableColumns'));
    if (!activeColumns || activeColumns.length === 0) {
        activeColumns = allColumns.map(col => col.key); // Default: show all columns
    }

    // Clear content container
    content.innerHTML = '';

    // Erstelle den scrollbaren Container
    let tableContainer = document.createElement('div');
    tableContainer.className = 'overflow-x-auto bg-gray-800 rounded-lg border border-gray-700';
    tableContainer.id = 'miner-table-container';

    // Neue Tabelle erstellen
    let tableElement = document.createElement('table');
    tableElement.id = 'miner-table';
    tableElement.className = 'w-full text-sm text-left table-fixed';

    // Dynamic table header - only show active columns
    let thead = document.createElement('thead');
    let headerRow = document.createElement('tr');
    headerRow.className = 'bg-gray-700';
    
    // Filter columns to only show active ones and create header cells
    allColumns
        .filter(col => activeColumns.includes(col.key))
        .forEach(col => {
            let th = document.createElement('th');
            th.className = 'px-4 py-3 text-gray-300 font-medium resize-x overflow-hidden min-w-[100px]';
            th.textContent = col.label;
            headerRow.appendChild(th);
        });
    
    thead.appendChild(headerRow);
    tableElement.appendChild(thead);

    // Tabellenkörper
    let tbody = document.createElement('tbody');
    tbody.id = 'miner-tbody';
    
    let currencyElement = document.getElementById('currencyMode');
    let waehrung = currencyElement ? currencyElement.innerText : 'usd';
    
    if (minerData.length === 0) {
        let emptyRow = document.createElement('tr');
        emptyRow.innerHTML = `
            <td class="px-4 py-8 text-gray-400 text-center" colspan="${activeColumns.length}">
                <div class="py-4">
                    <div class="mb-2">🚀</div>
                    <div>No miners added yet</div>
                    <div class="text-sm text-gray-500 mt-1">Click "Add Miner" or use "Import" to get started</div>
                </div>
            </td>
        `;
        tbody.appendChild(emptyRow);
    } else {
        minerData.forEach(miner => {
            // Get current prices
            let btcPrice = parseFloat(document.getElementById('bitcoin-price-dropdown').value) || window.btcPrice || 100000;
            let gmtPrice = parseFloat(document.getElementById('gmt-token-price').value) || window.gmtPrice || 0.4269;
            let satoshiPerTH = parseFloat(document.getElementById('sat-TH').value) || 44;
            
            // Extract miner data
            let myTH = parseFloat(miner.power) || parseFloat(miner.TH) || 0;
            let efficiency = parseFloat(miner.efficiency) || parseFloat(miner.W_TH) || 20;
            
            // Calculate values for this miner
            let pricePerTH = getPricePerTH(efficiency, myTH);
            let worth = calculateWorth(pricePerTH, myTH);
            let revenue = calculateDailyRevenue(satoshiPerTH, myTH, btcPrice, gmtPrice);
            let dailyelectricity = calculateDailyElectricity(myTH, efficiency, btcPrice, gmtPrice);
            let dailyservice = calculateDailyService(myTH, btcPrice, gmtPrice);
            
            // Calculate profit
            let profitUSD = (revenue.usd || 0) - (dailyelectricity.usd || 0) - (dailyservice.usd || 0);
            let profitBTC = (revenue.btc || 0) - (dailyelectricity.btc || 0) - (dailyservice.btc || 0);
            let profitGMT = (revenue.gmt || 0) - (dailyelectricity.gmt || 0) - (dailyservice.gmt || 0);
            
            // Calculate ROI values
            let revenueupgrade = calculateDailyRevenue(satoshiPerTH, 1, btcPrice, gmtPrice);
            let roiTH = calculateROI_THUpgrade(myTH, 1, pricePerTH, revenueupgrade, efficiency);
            let upgradeCostWATT = getUpgradeCostWATT(efficiency, efficiency - 1, myTH);
            let roiWATT = ROIofWATTUpgrade(upgradeCostWATT, myTH, efficiency, efficiency - 1);

            // Währungsabhängige Anzeige wie in farmold.html
            let worthDisplay = `$${parseFloat(worth).toFixed(2)}`;
            let profitDisplay = `$${profitUSD.toFixed(2)}`;
            let electricityDisplay = `$${(dailyelectricity.usd || 0).toFixed(2)}`;
            let serviceDisplay = `$${(dailyservice.usd || 0).toFixed(2)}`;
            let revenueDisplay = `$${(revenue.usd || 0).toFixed(2)}`;
            if (waehrung === 'btc') {
                worthDisplay = `${(worth / btcPrice).toFixed(8)} BTC`;
                profitDisplay = `${profitBTC.toFixed(8)} BTC`;
                electricityDisplay = `${(dailyelectricity.btc || 0).toFixed(8)} BTC`;
                serviceDisplay = `${(dailyservice.btc || 0).toFixed(8)} BTC`;
                revenueDisplay = `${(revenue.btc || 0).toFixed(8)} BTC`;
            } else if (waehrung === 'gmt') {
                worthDisplay = `${(worth / gmtPrice).toFixed(2)} GMT`;
                profitDisplay = `${profitGMT.toFixed(2)} GMT`;
                electricityDisplay = `${(dailyelectricity.gmt || 0).toFixed(2)} GMT`;
                serviceDisplay = `${(dailyservice.gmt || 0).toFixed(2)} GMT`;
                revenueDisplay = `${(revenue.gmt || 0).toFixed(2)} GMT`;
            }
            // Create column content mapping
            const columnContent = {
                'ID': `<td class="px-4 py-3 border-t border-gray-700 text-white">
                    <input type="text" value="${miner.miner_id || miner.id || ''}" 
                           class="bg-transparent border-0 text-white w-full focus:outline-none focus:bg-gray-600 rounded px-1"
                           data-field="miner_id" onchange="updateMinerData(this)">
                </td>`,
                'Miner Name': `<td class="px-4 py-3 border-t border-gray-700 text-white">
                    <input type="text" value="${miner.Miner_Name || miner.name || 'Miner'}" 
                           class="bg-transparent border-0 text-white w-full focus:outline-none focus:bg-gray-600 rounded px-1"
                           data-field="name" onchange="updateMinerData(this)">
                </td>`,
                'TH': `<td class="px-4 py-3 border-t border-gray-700 text-white">
                    <input type="number" value="${miner.power || miner.TH || 0}" 
                           class="bg-transparent border-0 text-white w-full focus:outline-none focus:bg-gray-600 rounded px-1"
                           data-field="power" onchange="updateMinerData(this)">
                </td>`,
                'W/TH': `<td class="px-4 py-3 border-t border-gray-700 text-white">
                    <input type="number" value="${miner.efficiency || miner.W_TH || 0}" 
                           class="bg-transparent border-0 text-white w-full focus:outline-none focus:bg-gray-600 rounded px-1"
                           data-field="efficiency" onchange="updateMinerData(this)">
                </td>`,
                'Worth': `<td class="px-4 py-3 border-t border-gray-700 text-white">${worthDisplay}</td>`,
                'ROI TH': `<td class="px-4 py-3 border-t border-gray-700 text-white">${roiTH.toFixed(1)}%</td>`,
                'ROI Eff': `<td class="px-4 py-3 border-t border-gray-700 text-white">${(typeof roiWATT === 'object' ? roiWATT.roi_percent : roiWATT.toFixed(1))}%</td>`,
                'Profit': `<td class="px-4 py-3 border-t border-gray-700 text-white">${profitDisplay}</td>`,
                'Electricity': `<td class="px-4 py-3 border-t border-gray-700 text-white">${electricityDisplay}</td>`,
                'Service': `<td class="px-4 py-3 border-t border-gray-700 text-white">${serviceDisplay}</td>`,
                'Revenue': `<td class="px-4 py-3 border-t border-gray-700 text-white">${revenueDisplay}</td>`
            };

            // Generate row HTML with only active columns
            let row = document.createElement('tr');
            row.innerHTML = activeColumns.map(colKey => columnContent[colKey] || '').join('');
            tbody.appendChild(row);
        });
    }

    tableElement.appendChild(tbody);
    tableContainer.appendChild(tableElement);
    content.appendChild(tableContainer);
}

/**
 * Hilfsfunktion zum Aktualisieren der Miner-Daten bei Eingabe-Änderungen
 * @param {HTMLElement} inputElement - Das geänderte Input-Element
 */
function updateMinerData(inputElement) {
    console.log('Updating miner data:', inputElement.dataset.field, inputElement.value);
    
    // Get current miner data from localStorage
    let minerData = JSON.parse(localStorage.getItem('minerData')) || [];
    
    // Find the row index by traversing up to the table row
    let row = inputElement.closest('tr');
    let tbody = row.parentElement;
    let rowIndex = Array.from(tbody.children).indexOf(row);
    
    // Update the specific field in the miner data
    if (minerData[rowIndex]) {
        let field = inputElement.dataset.field;
        let value = inputElement.value;
        
        // Convert numeric fields to numbers
        if (field === 'power' || field === 'efficiency') {
            value = parseFloat(value) || 0;
        }
        
        // Map field names to data structure
        switch(field) {
            case 'miner_id':
                minerData[rowIndex].miner_id = value;
                minerData[rowIndex].id = value; // Also update id field
                break;
            case 'name':
                minerData[rowIndex].Miner_Name = value;
                minerData[rowIndex].name = value;
                break;
            case 'power':
                minerData[rowIndex].power = value;
                minerData[rowIndex].TH = value;
                break;
            case 'efficiency':
                minerData[rowIndex].efficiency = value;
                minerData[rowIndex].W_TH = value;
                break;
        }
        
        // Save updated data to localStorage
        localStorage.setItem('minerData', JSON.stringify(minerData));
        
        // Refresh both tables to show updated calculations
        setTimeout(() => {
            loadAllTables();
        }, 100); // Small delay to ensure the input value is properly set
        
        console.log('Updated miner data:', minerData[rowIndex]);
    }
}

/**
 * Lädt beide Tabellen (Farm + Miner) basierend auf gespeicherten Daten
 */
function loadAllTables() {
    let minerData = JSON.parse(localStorage.getItem('minerData')) || [];
    if (minerData.length > 0) {
        ladeFarmTable(minerData);
        ladenMinerInTabelle();
    }
}

// ===== CALCULATION FUNCTIONS =====
// Imported from existing skript.js and skriptfarm.js

/**
 * Berechnet das tägliche Revenue in BTC, USD und GMT
 */
function calculateDailyRevenue(satoshiPerTH, myTH, btcPrice, gmtPrice) {
    const dailyRevenueBTC = (satoshiPerTH * myTH) / 1e8;
    const dailyRevenueUSD = dailyRevenueBTC * btcPrice;
    const dailyRevenueGMT = gmtPrice ? dailyRevenueUSD / gmtPrice : null;

    return {
        btc: dailyRevenueBTC,
        usd: dailyRevenueUSD,
        gmt: dailyRevenueGMT
    };
}

/**
 * Berechnet die täglichen Stromkosten in USD, BTC und GMT
 */
function calculateDailyElectricity(myTH, efficiency, btcPrice, gmtPrice) {
    const costPerKWh = 0.05; // Strompreis pro kWh in USD
    const hoursPerDay = 24;

    const discount = getDiscount(); // Rabattwert (z.B. 0.1 für 10%)

    // Berechnung der Kosten in USD mit Rabatt
    const dailyElectricityUSD = ((efficiency * myTH * costPerKWh * hoursPerDay) / 1000) * (1 - discount);

    // Umrechnung in BTC
    const dailyElectricityBTC = btcPrice ? dailyElectricityUSD / btcPrice : null;

    // Umrechnung in GMT
    const dailyElectricityGMT = gmtPrice ? dailyElectricityUSD / gmtPrice : null;

    return {
        usd: dailyElectricityUSD,
        btc: dailyElectricityBTC,
        gmt: dailyElectricityGMT
    };
}

/**
 * Berechnet die täglichen Service-Kosten in USD, BTC und GMT
 */
function calculateDailyService(myTH, btcPrice, gmtPrice) {
    const serviceCostPerTHUSD = 0.0089; // Servicekosten pro TH pro Tag in USD

    const discount = getDiscount(); // Rabattwert

    // Berechnung der Kosten in USD mit Rabatt
    const dailyServiceUSD = serviceCostPerTHUSD * myTH * (1 - discount);

    // Umrechnung in BTC
    const dailyServiceBTC = btcPrice ? dailyServiceUSD / btcPrice : null;

    // Umrechnung in GMT
    const dailyServiceGMT = gmtPrice ? dailyServiceUSD / gmtPrice : null;

    return {
        usd: dailyServiceUSD,
        btc: dailyServiceBTC,
        gmt: dailyServiceGMT
    };
}

/**
 * Berechnet den Wert eines Miners basierend auf Preis pro TH und TH-Menge
 */
function calculateWorth(pricePerTH, myTH) {
    if (isNaN(pricePerTH) || isNaN(myTH)) {
        console.error('Invalid input: pricePerTH and myTH must be numbers.');
        return 0;
    }
    const worth = pricePerTH * myTH;
    return worth.toFixed(2);
}

/**
 * Ermittelt den Preis pro TH basierend auf Effizienz und TH-Menge
 */
function getPricePerTH(efficiency, thAmount) {
    efficiency = Math.round(parseFloat(efficiency)); // Runden auf die nächste ganze Zahl
    
    // Check if priceMatrixdatei exists (should be loaded from priceMatrix.js)
    if (typeof priceMatrixdatei === 'undefined') {
        console.error('priceMatrixdatei is not defined. Make sure priceMatrix.js is loaded.');
        return 0;
    }
    
    if (!priceMatrixdatei[efficiency]) {
        console.error(`Keine Preisdaten für ${efficiency} W/TH gefunden.`);
        return 0;
    }

    let priceEntries = priceMatrixdatei[efficiency];

    // Finde den passenden Preis für die gegebene TH-Menge
    for (let i = priceEntries.length - 1; i >= 0; i--) {
        if (thAmount >= priceEntries[i].minTH) {
            return priceEntries[i].pricePerTH;
        }
    }

    return 0; // Falls keine passende Preisstufe gefunden wurde
}

/**
 * Ermittelt den aktuellen Discount-Wert aus den verschiedenen Discount-Feldern
 */
function getDiscount() {
    // Try different possible discount input elements
    const discountElements = [
        'gomining-discount',
        'gomining-discount-I', 
        'gomining-discount_ROI'
    ];
    
    for (let elementId of discountElements) {
        const element = document.getElementById(elementId);
        if (element && element.value) {
            const value = parseFloat(element.value) || 0;
            return Math.max(0, Math.min(value, 100)) / 100; // Convert percentage to decimal
        }
    }
    
    // Check localStorage for user_data discount
    const user_data = JSON.parse(localStorage.getItem('user_data'));
    if (user_data && user_data.total_discount) {
        return Math.max(0, Math.min(user_data.total_discount, 100)) / 100;
    }
    
    return 0; // Default: no discount
}

// ===== ROI CALCULATION FUNCTIONS =====
// Imported from skriptfarm.js

/**
 * Berechnet das ROI für ein TH-Upgrade
 */
function calculateROI_THUpgrade(power, additionalTH, pricePerTH, dailyRevenuePerTH, minerefficency) {
    let btcPrice = parseFloat(document.getElementById('bitcoin-price-dropdown').value) || window.btcPrice || 100000;
    let gmtPrice = parseFloat(document.getElementById('gmt-token-price').value) || window.gmtPrice || 0.4269;
    
    let upgradeCost = additionalTH * pricePerTH;
    let additionalDailyRevenuebtc = additionalTH * dailyRevenuePerTH.btc;
    let dailyelectricity = calculateDailyElectricity(additionalTH, minerefficency, btcPrice, gmtPrice);
    let dailyservice = calculateDailyService(additionalTH, btcPrice, gmtPrice);
    let dailyProfitbtc = additionalDailyRevenuebtc - dailyelectricity.btc - dailyservice.btc;
    let upgradecostbtc = usd2btc(upgradeCost, btcPrice);
    
    if (dailyProfitbtc <= 0) {
        return 0;
    }
    
    let roiDays = upgradecostbtc / dailyProfitbtc;
    let roiPercent = (365 / roiDays) * 100;

    return Math.max(0, roiPercent);
}

/**
 * Berechnet das ROI für ein Effizienz-Upgrade
 */
function ROIofWATTUpgrade(upgradeCost, currentTH, currentEfficiency, newEfficiency) {
    let profitIncrease = calculateProfitIncreaseEfficiency(currentTH, currentEfficiency, newEfficiency);
    let btcPrice = parseFloat(document.getElementById('bitcoin-price-dropdown').value) || window.btcPrice || 100000;

    if (profitIncrease.btc <= 0) {
        return 0;
    }
    
    let upgradeCostBTC = usd2btc(upgradeCost, btcPrice);
    let roiDays = upgradeCostBTC / profitIncrease.btc;
    let roiPercent = (365 / roiDays) * 100;

    return Math.max(0, roiPercent);
}

/**
 * Berechnet die Upgrade-Kosten für Effizienz-Verbesserung
 */
function getUpgradeCostWATT(currentEfficiency, newEfficiency, currentTH) {
    let totalCost = 0;

    // Sicherstellen, dass die Werte korrekt eingegeben sind
    if (currentEfficiency <= newEfficiency) {
        console.error("Upgrade nicht möglich: newEfficiency muss kleiner als currentEfficiency sein.");
        return totalCost;
    }

    let efficiency = currentEfficiency; // Startwert

    while (efficiency > newEfficiency) {
        if (efficiencyMatrixfarm[efficiency]) {
            let costPerW = efficiencyMatrixfarm[efficiency].pricePerW;
            let nextEfficiency = efficiencyMatrixfarm[efficiency].to;
            let efficiencyStep = efficiency - nextEfficiency;
            totalCost += costPerW * efficiencyStep * currentTH;
            efficiency = nextEfficiency; // Nächstes Effizienz-Level setzen
        } else {
            console.error(`Kein Eintrag für Effizienz ${efficiency} in efficiencyMatrixfarm gefunden.`);
            break;
        }
    }

    return parseFloat(totalCost.toFixed(2)); // Rückgabe der gesamten Upgrade-Kosten
}

/**
 * Berechnet den Profit-Anstieg durch Effizienz-Verbesserung
 */
function calculateProfitIncreaseEfficiency(currentTH, currentEfficiency, newEfficiency) {
    let btcPrice = parseFloat(document.getElementById('bitcoin-price-dropdown').value) || window.btcPrice || 100000;
    let gmtPrice = parseFloat(document.getElementById('gmt-token-price').value) || window.gmtPrice || 0.4269;

    let currentElectricity = calculateDailyElectricity(currentTH, currentEfficiency, btcPrice, gmtPrice);
    let newElectricity = calculateDailyElectricity(currentTH, newEfficiency, btcPrice, gmtPrice);
    
    let electricitySavingsBTC = (currentElectricity.btc || 0) - (newElectricity.btc || 0);
    
    return {
        btc: Math.max(0, electricitySavingsBTC),
        usd: btc2usd(btcPrice, electricitySavingsBTC)
    };
}

/**
 * Hilfsfunktionen für Währungsumrechnungen
 */
function btc2usd(btcPrice, valueBtc) {
    return (btcPrice * valueBtc);
}

function usd2btc(usdValue, btcPrice) {
    return (usdValue / btcPrice);
}

// Export functions for global access (if using modules later)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        ladeFarmTable,
        ladenMinerInTabelle,
        updateMinerData,
        loadAllTables
    };
}