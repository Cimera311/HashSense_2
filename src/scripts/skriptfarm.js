
function hinzufuegenCard(cardId, power, efficiency, name = "Miner") {
let content = document.querySelector('.content');

let card = document.createElement('div');
card.className = 'card';
card.id = cardId;

let label = document.createElement('span');
label.className = 'card-label';
label.innerText = `#${cardId}`;
card.appendChild(label);

let deleteBtn = document.createElement('button');
deleteBtn.className = 'delete-btn';
deleteBtn.innerHTML = '&times;';
deleteBtn.onclick = function () {
entfernenCard(cardId);
loescheEinzelnenMinerSupabase(cardId);
};
card.appendChild(deleteBtn);

let copyBtn = document.createElement('button');
copyBtn.className = 'copy-btn';
copyBtn.innerHTML = '&#x2398;';
copyBtn.onclick = function () {
kopiereWerte(cardId);
};
card.appendChild(copyBtn);

// **Name Input mit Label**
let nameContainer = document.createElement('div');
nameContainer.className = 'input-container';

let nameLabel = document.createElement('label');
nameLabel.setAttribute('for', `${cardId}-name`);
nameLabel.innerText = 'Name';

let nameInput = document.createElement('input');
nameInput.type = 'text';
nameInput.id = `${cardId}-name`;
nameInput.value = name;
nameInput.oninput = function () { aktualisiereWert(cardId, 'name'); };

nameContainer.appendChild(nameLabel);
nameContainer.appendChild(nameInput);
card.appendChild(nameContainer);

// **Power Input mit Label**
let powerContainer = document.createElement('div');
powerContainer.className = 'input-container';

let powerLabel = document.createElement('label');
powerLabel.setAttribute('for', `${cardId}-power`);
powerLabel.innerText = 'Power';

let powerInput = document.createElement('input');
powerInput.type = 'text';
powerInput.id = `${cardId}-power`;
powerInput.value = `${power}`;
powerInput.oninput = function () { aktualisiereWert(cardId, 'power'); aktualisiereFarmWerte(); };

powerContainer.appendChild(powerLabel);
powerContainer.appendChild(powerInput);
card.appendChild(powerContainer);

// **Efficiency Input mit Label**
let efficiencyContainer = document.createElement('div');
efficiencyContainer.className = 'input-container';

let efficiencyLabel = document.createElement('label');
efficiencyLabel.setAttribute('for', `${cardId}-efficiency`);
efficiencyLabel.innerText = 'Efficiency';

let efficiencyInput = document.createElement('input');
efficiencyInput.type = 'text';
efficiencyInput.id = `${cardId}-efficiency`;
efficiencyInput.value = `${efficiency}`;
efficiencyInput.oninput = function () { aktualisiereWert(cardId, 'efficiency'); aktualisiereFarmWerte(); };

efficiencyContainer.appendChild(efficiencyLabel);
efficiencyContainer.appendChild(efficiencyInput);
card.appendChild(efficiencyContainer);

content.appendChild(card);
aktualisiereFarmWerte();
}


function entfernenCard(cardId) {
let card = document.getElementById(cardId);
if (card) {
card.remove();
} else {
console.warn(`Card mit ID ${cardId} existiert nicht.`);
}
aktualisiereFarmWerte();

}
function get_highest_card(content) {
let highestId = 0;
let cards = content.querySelectorAll('.card');

cards.forEach(card => {
let cardId = parseInt(card.id, 10);
if (!isNaN(cardId) && cardId > highestId) {
highestId = cardId;
}
});

return String(highestId + 1).padStart(5, '0'); // Rückgabe als fünfstellige Zahl
}
function speichernDaten() {
let viewElement = document.getElementById('viewMode');
ansicht = viewElement.innerText; // Holt den aktuellen Modus aus der UI
let minerData = [];
let user_data = {}; // Neues Objekt für User-Daten

if (ansicht === 'grid') {
// **1️⃣ Alle Cards auslesen und speichern**
let cards = document.getElementsByClassName('card');
for (let i = 0; i < cards.length; i++) {
let cardId = cards[i].id;
let powerElement = document.getElementById(`${cardId}-power`);
let efficiencyElement = document.getElementById(`${cardId}-efficiency`);
let nameElement = document.getElementById(`${cardId}-name`);
if (powerElement && efficiencyElement) {
    minerData.push({
        miner_id: cardId,
        Miner_Name: nameElement.value || "-",
        power: parseFloat(powerElement.value) || 0, // Jetzt wird es als Zahl gespeichert
        efficiency: parseFloat(efficiencyElement.value) || 0
    });
}
}

// 🔹 **2️⃣ User-Discount aus Farm-Card speichern**
let discountElement = document.getElementById("gomining-discount");
if (discountElement) {
user_data.total_discount = parseFloat(discountElement.value) || 0;
}
} else if (ansicht === 'list') {
// **2️⃣ Falls die Tabelle aktiv ist, Daten aus Tabelle speichern**
let rows = document.getElementById('miner-tbody').getElementsByTagName('tr');
for (let i = 0; i < rows.length; i++) {
let cells = rows[i].getElementsByTagName('td');
minerData.push({
    miner_id: cells[0].getElementsByTagName('input')[0].value,               
    Miner_Name: cells[1].getElementsByTagName('input')[0].value,
    power: cells[2].getElementsByTagName('input')[0].value.replace(' TH', ''), // "TH" entfernen
    efficiency: cells[3].getElementsByTagName('input')[0].value.replace(' W/TH', '') // "W/TH" entfernen
});
}

let table = document.getElementById("farm-table");
if (table) {
let rows = table.getElementsByTagName("tr");
for (let i = 1; i < rows.length; i++) { // Überspringt den Header (erste Zeile)
    let cells = rows[i].getElementsByTagName("td");
    if (cells.length >= 2) { // Sicherheitscheck, dass Spalte existiert
        user_data.total_discount = parseFloat(cells[2].innerText) || 0;
    }
}
}

}

// **3️⃣ Miner-Daten in LocalStorage unter "minerData" speichern**
localStorage.setItem('minerData', JSON.stringify(minerData));
localStorage.setItem('user_data', JSON.stringify(user_data));
}

function ladenDaten() {
let viewElement = document.getElementById('viewMode');
ansicht = viewElement.innerText; // Holt den aktuellen Modus aus der UI

let savedData = localStorage.getItem('minerData');
if (!savedData) return; // Falls keine Daten existieren, nichts tun

let minerData = JSON.parse(savedData);

// Ansicht abhängig vom gespeicherten Modus laden
// let content = document.getElementById('content');
// let table = document.getElementById('miner-table');
// if (table) table.remove(); // Falls eine Tabelle existiert, löschen
// Lösche bestehende Miner-Tabelle (inkl. Container)
let minerTableContainer = document.getElementById('miner-table-container');
if (minerTableContainer) minerTableContainer.remove();
// Ansicht abhängig vom gespeicherten Modus laden
// let contentfarm = document.getElementById('farm-content');
// let tablefarm = document.getElementById('farm-table');
// if (tablefarm) tablefarm.remove(); // Falls eine Tabelle existiert, löschen
// Lösche bestehende Farm-Tabelle (inkl. Container)
let farmTableContainer = document.getElementById('farm-table-container');
if (farmTableContainer) farmTableContainer.remove();

let cardsfarm = document.getElementsByClassName('farm-card');
for (let i = cardsfarm.length - 1; i >= 0; i--) {
cardsfarm[i].remove();
}
let cards = document.getElementsByClassName('card');
for (let i = cards.length - 1; i >= 0; i--) {
cards[i].remove();
}



// **Zuerst Farm laden (entweder als Card oder als Tabelle)**
if (ansicht === 'grid') {
ladeFarmCard(minerData); // Farm als Card laden
} else {
ladeFarmTable(minerData); // Farm als Tabelle laden
}
if (ansicht === 'grid') {
// Miner als Cards hinzufügen

minerData.forEach(miner => {
hinzufuegenCard(miner.miner_id, miner.power, miner.efficiency, miner.Miner_Name);
});

} else if (ansicht === 'list') {
// Erstelle den scrollbaren Container
let tableContainer = document.createElement('div');
tableContainer.className = 'table-container';
tableContainer.id = 'miner-table-container'; // ID für gezieltes Löschen

// Erstelle die Tabelle
let tableElement = document.createElement('table');
tableElement.id = 'miner-table';

// Erstelle den Tabellenkopf (thead)
let thead = document.createElement('thead');
thead.innerHTML = `
<tr>
<th>ID</th>
<th class="mineral-header">Miner Name</th>               
<th>TH</th>
<th>W/TH</th>
<th>Miner worth $</th>
<th>ROI +1 TH(%)</th>
<th>ROI -1 W/TH(%)</th>
<th>Profit</th>
<th>= Electricity -</th>
<th>Service -</th>
<th>Revenue</th>
</tr>
`;
tableElement.appendChild(thead);

// Erstelle den Tabellenkörper (tbody)
let tbody = document.createElement('tbody');
tbody.id = 'miner-tbody';
tableElement.appendChild(tbody);

// Füge die Tabelle in den Container ein
tableContainer.appendChild(tableElement);

// Füge den Container in den Content-Bereich ein
content.appendChild(tableContainer);


ladenMinerInTabelle();
setTableSorting(); // Damit die neue Tabelle ebenfalls sortierbar ist
}
}
function ladeFarmTable(minerData) {
let farmContent = document.getElementById('farm-content');
if (!farmContent) {
console.error("Fehler: #farm-content nicht gefunden.");
return;
}

// Falls bereits eine Farm-Tabelle existiert, entfernen wir sie
let existingTable = document.getElementById('farm-table');
if (existingTable) {
existingTable.remove();
}

// Erstelle den scrollbaren Container für die Farm-Tabelle
let tableContainer = document.createElement('div');
tableContainer.className = 'table-container';
tableContainer.id = 'farm-table-container'; // ID für gezieltes Löschen

// Neue Farm-Tabelle erstellen
let tableElement = document.createElement('table');
tableElement.id = 'farm-table';

// Tabellenkopf hinzufügen
let thead = document.createElement('thead');
thead.innerHTML = `
<tr>
<th>Power (TH)</th>
<th>Efficiency (W/TH)</th>
<th>My Total Discount (%)</th>
<th>Farm worth $</th>
<th>Profit</th>
<th>= Electricity -</th>
<th> Service -</th>
<th>Revenue</th>
</tr>
`;
tableElement.appendChild(thead);

// Tabellenkörper hinzufügen
let tbody = document.createElement('tbody');
tbody.id = 'farm-tbody';
tableElement.appendChild(tbody);



// Berechnung der Gesamtwerte für die Farm
let totalPower = 0;
let weightedEfficiencySum = 0;
let btcPrice = parseFloat(document.getElementById('bitcoin-price-dropdown').value) || 0;
let gmtPrice = parseFloat(document.getElementById('gmt-token-price').value) || 0;
let satoshiPerTH = parseFloat(document.getElementById('sat-TH').value) || 0;
// Aktuelle Währung auslesen
let currencyElement = document.getElementById('currencyMode');
let waehrung = currencyElement.innerText; // btc, usd oder gmt
minerData.forEach(miner => {
let power = parseFloat(miner.power) || 0;
let efficiency = parseFloat(miner.efficiency) || 0;
totalPower += power;
weightedEfficiencySum += (power * efficiency);
});
let user_data = JSON.parse(localStorage.getItem('user_data')) || { total_discount: 0 };
let avgEfficiency = totalPower > 0 ? (weightedEfficiencySum / totalPower).toFixed(2) : 0;
let revenue = calculateDailyRevenue(satoshiPerTH, totalPower, btcPrice, gmtPrice, avgEfficiency);
let dailyelectricity = calculateDailyElectricity(totalPower, avgEfficiency, btcPrice, gmtPrice);
let dailyservice = calculateDailyService(totalPower, btcPrice, gmtPrice)
let worth = calculateWorth(getPricePerTH(avgEfficiency, totalPower), totalPower) || 0; // Wert der Farm

//let roiEff = calculateROI_EfficiencyUpgrade(miner.efficiency, miner.efficiency - 5, miner.power);
let profitbtc = revenue.btc - dailyelectricity.btc - dailyservice.btc;
let revenueDisplay = '';
if (waehrung === 'btc') {
revenueDisplay = `${revenue.btc.toFixed(8)} BTC`;
electricityDisplay = `${dailyelectricity.btc.toFixed(8)} BTC`;
serviceDisplay = `${dailyservice.btc.toFixed(8)} BTC`;
profitDisplay = `${profitbtc.toFixed(8)} BTC`;
} else if (waehrung === 'usd') {
revenueDisplay = `$${revenue.usd.toFixed(2)}`;
electricityDisplay = `$${dailyelectricity.usd.toFixed(2)}`;
serviceDisplay = `$${dailyservice.usd.toFixed(2)} `;
let profit = btc2usd(btcPrice, profitbtc);
profitDisplay = `$${profit} `;
} else if (waehrung === 'gmt') {
revenueDisplay = `${revenue.gmt ? revenue.gmt.toFixed(2) : "N/A"} GMT`;
electricityDisplay = `${dailyelectricity.gmt.toFixed(2)} GMT`;
serviceDisplay = `${dailyservice.gmt.toFixed(2)} GMT`;
let profit = btc2gmt(btcPrice, gmtPrice, profitbtc);
profitDisplay = `${profit} GMT`;
}
let row = document.createElement('tr');
row.innerHTML = `
<td>${totalPower}</td>
<td>${avgEfficiency}</td>
<td>${user_data.total_discount}</td>
<td>$${worth}</td>
<td>${profitDisplay}</td>
<td>${electricityDisplay}</td>
<td>${serviceDisplay}</td>
<td>${revenueDisplay}</td>
`;
tbody.appendChild(row);
tableElement.appendChild(tbody);

// Füge die Tabelle in den Container ein
tableContainer.appendChild(tableElement);

// Jetzt den gesamten Container in den Farm-Content-Bereich einfügen
farmContent.appendChild(tableContainer);

}
function ladeFarmCard(minerData) {
let farmContent = document.getElementById('farm-content');
if (!farmContent) {
console.error("Fehler: #farm-content nicht gefunden.");
return;
}

// Falls eine bestehende Farm-Card existiert, entfernen
let existingFarm = document.getElementById('farm');
if (existingFarm) {
existingFarm.remove();
}

// Neue Farm-Card erstellen
let farmCard = document.createElement('div');
farmCard.className = 'farm-card';
farmCard.id = 'farm';

// Farm-Label und Delete-Button
farmCard.innerHTML = `
<button class="delete-btn" onclick="entfernenFarm()">&times;</button>
<span class="card-label">Farm</span>
`;

// Farm-Gesamtwerte berechnen
let totalPower = 0;
let weightedEfficiencySum = 0;
let user_data = JSON.parse(localStorage.getItem('user_data')) || { total_discount: 0 };
minerData.forEach(miner => {
let power = parseFloat(miner.power) || 0;
let efficiency = parseFloat(miner.efficiency) || 0;
totalPower += power;
weightedEfficiencySum += (power * efficiency);
});

let avgEfficiency = totalPower > 0 ? (weightedEfficiencySum / totalPower).toFixed(2) : 0;

// Input-Felder für Power & Efficiency
farmCard.innerHTML += `
<div class="input-container-farm">
<label for="farm-power">Power</label>
<input type="text" id="farm-power" value="${totalPower.toFixed(2)}" oninput="aktualisiereWert('farm', 'power')">
</div>   
<div class="input-container-farm">
<label for="farm-efficiency">Efficiency</label>
<input type="text" id="farm-efficiency" value="${avgEfficiency}" oninput="aktualisiereWert('farm', 'efficiency')">
</div>
<div class="input-container-farm">
<label for="gomining-discount">My total Discount (%):</label>
<input type="number" id="gomining-discount" value="${user_data.total_discount}" min="0" max="20" placeholder="0,0">
</div>      

`;

// Farm-Card in farm-content einfügen
farmContent.appendChild(farmCard);
}


/* function ladenMinerInTabelle() {
let minerData = JSON.parse(localStorage.getItem('minerData')) || [];
let tbody = document.getElementById('miner-tbody');

// Aktuelle Währung auslesen
let currencyElement = document.getElementById('currencyMode');
let waehrung = currencyElement.innerText; // btc, usd oder gmt

// **1️⃣ Fehlende Variablen aus UI abrufen**
let satoshiPerTH = parseFloat(document.getElementById('sat-TH').value) || 0; // Satoshi pro TH
let btcPrice = parseFloat(document.getElementById('bitcoin-price-dropdown').value) || 0; // BTC-Preis
let gmtPrice = parseFloat(document.getElementById('gmt-token-price').value) || 0; // GMT-Token-Preis


tbody.innerHTML = ''; // Leere Tabelle vor dem Neuladen

minerData.forEach(miner => {
let myTH = parseFloat(miner.power) ? parseFloat(miner.power) : 0; // Miner-TH aus `minerData`

let efficiency = parseFloat(miner.efficiency) || 0; // Effizienz aus `minerData`
let worth = calculateWorth(getPricePerTH(efficiency, myTH), myTH) || 0; // Wert des Miners
let upgradeprice = getPricePerTH(efficiency, myTH) || 0; // Preis pro TH
let revenue = calculateDailyRevenue(satoshiPerTH, myTH, btcPrice, gmtPrice, efficiency);
let revenueupgrade = calculateDailyRevenue(satoshiPerTH, 1, btcPrice, gmtPrice, efficiency);
let dailyelectricity = calculateDailyElectricity(miner.power, miner.efficiency, btcPrice, gmtPrice)
let dailyservice = calculateDailyService(miner.power, btcPrice, gmtPrice)
let roiTH;
if (miner.efficiency <= 28) {
roiTH = calculateROI_THUpgrade(miner.power, 1, getPricePerTH(efficiency, myTH), revenueupgrade, efficiency);
} else {
roiTH = '0';
}
let roiWATT;
if (miner.efficiency <= 50) {
roiWATT = ROIofWATTUpgrade(getUpgradeCostWATT(efficiency, efficiency -1 , myTH), myTH, efficiency, efficiency-1) ;
} else {
roiWATT.roi_percent = '0';            
roiWATT.profit_increase.btc = 0;
roiWATT.profit_increase.usd = 0;
roiWATT.profit_increase.gmt = 0;
}

//let roiEff = calculateROI_EfficiencyUpgrade(miner.efficiency, miner.efficiency - 5, miner.power);
let profitbtc = revenue.btc - dailyelectricity.btc - dailyservice.btc;
let revenueDisplay = '';
let plusTHprofit = 0;
let plusWATTprofit = 0;
if (waehrung === 'btc') {
revenueDisplay = `${revenue.btc.toFixed(8)} BTC`;
electricityDisplay = `${dailyelectricity.btc.toFixed(8)} BTC`;
serviceDisplay = `${dailyservice.btc.toFixed(8)} BTC`;
profitDisplay = `${profitbtc.toFixed(8)} BTC`;
plusWATTprofit =  `${roiWATT.profit_increase.btc.toFixed(8)} BTC`;
} else if (waehrung === 'usd') {
revenueDisplay = `$${revenue.usd.toFixed(2)}`;
electricityDisplay = `$${dailyelectricity.usd.toFixed(2)}`;
serviceDisplay = `$${dailyservice.usd.toFixed(2)} `;
let profit = btc2usd(btcPrice, profitbtc);
profitDisplay = `$${profit} `;
plusWATTprofit =  `$${roiWATT.profit_increase.usd}`;
} else if (waehrung === 'gmt') {
revenueDisplay = `${revenue.gmt ? revenue.gmt.toFixed(2) : "N/A"} GMT`;
electricityDisplay = `${dailyelectricity.gmt.toFixed(2)} GMT`;
serviceDisplay = `${dailyservice.gmt.toFixed(2)} GMT`;
let profit = btc2gmt(btcPrice, gmtPrice, profitbtc);
profitDisplay = `${profit} GMT`;
plusWATTprofit =  `${roiWATT.profit_increase.gmt} GMT`;
}
let row = document.createElement('tr');
row.innerHTML = `
<td class="id-header"><input type="text" value="${miner.miner_id}"  class="editable-field" data-field="miner_id"></td>
<td class="mineral-header"><input type="text" value="${miner.Miner_Name || 'Miner'}"  class="editable-field" data-field="name"></td>
<td class="id-header"><input type="number" value="${miner.power}"  class="editable-field" data-field="power"></td>
<td class="id-header"><input type="number" value="${miner.efficiency}"  class="editable-field" data-field="efficiency"></td>
<td class="id-header">$${worth}<span style="color: green;">(1TH=$${upgradeprice})</span></td>
<td class="id-header">${roiTH}%</td>
<td class="id-header">${roiWATT.roi_percent}% <span style="color: green;">(+${plusWATTprofit})</span></td>
<td class="id-header">${profitDisplay}</td>
<td class="id-header">${electricityDisplay}</td>
<td class="id-header">${serviceDisplay}</td>
<td class="id-header">${revenueDisplay}</td>         
`;
tbody.appendChild(row);
});
} */




// Seite initialisieren
window.onload = function() {
ladenDaten();
aktualisiereFarmWerte();

};

let ansicht = 'grid';


function aktualisiereWert(cardId, feld) {
let inputElement = document.getElementById(`${cardId}-${feld}`);
if (inputElement) {
let gespeicherteCards = JSON.parse(localStorage.getItem('cards')) || [];

// Finde die richtige Karte und aktualisiere den Wert
gespeicherteCards.forEach(card => {
if (card.id === cardId) {
    card[feld] = inputElement.value;
}
});

// Aktualisierte Werte speichern
localStorage.setItem('cards', JSON.stringify(gespeicherteCards));


}
}
function entfernenFarm() {
let content = document.querySelector('.content');
content.innerHTML = '';
aktualisiereFarmWerte();

}
function aktualisiereFarmWerte() {
let content = document.querySelector('.content');
let cards = content.querySelectorAll('.card');

let totalPower = 0;
let totalEfficiency = 0;
let count = 0;

cards.forEach(card => {
let powerElement = document.getElementById(`${card.id}-power`);
let efficiencyElement = document.getElementById(`${card.id}-efficiency`);


if (powerElement && efficiencyElement) {
let powerValue = parseFloat(powerElement.value) || 0;
let efficiencyValue = parseFloat(efficiencyElement.value) || 0;

totalPower += powerValue;
totalEfficiency += ( powerValue * efficiencyValue );
count++;
}
});

let avgEfficiency = count > 0 ? (totalEfficiency / totalPower).toFixed(2) : 0;

document.getElementById('farm-power').value = totalPower.toFixed(2);
document.getElementById('farm-efficiency').value = avgEfficiency;
}

function kopiereWerte(cardId) {
let powerValue = document.getElementById(`${cardId}-power`).value;
let efficiencyValue = document.getElementById(`${cardId}-efficiency`).value;
let nameValue = document.getElementById(`${cardId}-name`).value;
hinzufuegenCard(get_highest_card(document.querySelector('.content')), powerValue, efficiencyValue, nameValue);


}
function updateViewClasses() {
    const content = document.querySelector('.content');
    if (content) {
        content.classList.remove('grid-view', 'list-view');
        content.classList.add(`${ansicht}-view`);
    }
}
function toggleActionButtons() {
    let viewMode = document.getElementById('viewMode').innerText;
    let addBtn = document.getElementById('addMinerBtn');
    let deleteBtn = document.getElementById('deleteAllBtn');

    if (viewMode === 'list') {
        if (addBtn) addBtn.style.display = 'none';
        if (deleteBtn) deleteBtn.style.display = 'none';
    } else {
        if (addBtn) addBtn.style.display = 'inline-flex';
        if (deleteBtn) deleteBtn.style.display = 'inline-flex';
    }
}

// View and currency switching functions
function wechselAnsicht(neueAnsicht) {
speichernDaten(); // Speichert die aktuellen Miner-Daten
ansicht = neueAnsicht;
document.getElementById('viewMode').innerText = neueAnsicht;

document.getElementById("grid-btn").classList.remove("active");
document.getElementById("list-btn").classList.remove("active");
// Update button styles
document.querySelectorAll('[id$="-btn"]').forEach(btn => {
    if (btn.id.includes('grid') || btn.id.includes('list')) {
        btn.classList.remove('bg-purple-600', 'text-white');
        btn.classList.add('text-gray-300', 'hover:text-white');
    }
});
document.getElementById(`${ansicht}-btn`).classList.add('active');
document.getElementById(`${ansicht}-btn`).classList.remove('text-gray-300', 'hover:text-white');
document.getElementById(`${ansicht}-btn`).classList.add('bg-purple-600', 'text-white');

ladenDaten(); // Lädt die Daten für die neue Ansicht   
    // Update button styles
    document.querySelectorAll('[id$="-btn"]').forEach(btn => {
        if (btn.id.includes('grid') || btn.id.includes('list')) {
            btn.classList.remove('bg-purple-600', 'text-white');
            btn.classList.add('text-gray-300', 'hover:text-white');
        }
    });
    
    document.getElementById(`${neueAnsicht}-btn`).classList.remove('text-gray-300', 'hover:text-white');
    document.getElementById(`${neueAnsicht}-btn`).classList.add('bg-purple-600', 'text-white');
    
    updateViewClasses();
    toggleActionButtons();
}





function calculateROI_THUpgrade(power, additionalTH, pricePerTH, dailyRevenuePerTH, minerefficency) {
let btcPrice = parseFloat(document.getElementById('bitcoin-price-dropdown').value) || 0; // BTC-Preis
let gmtPrice = parseFloat(document.getElementById('gmt-token-price').value) || 0; // GMT-Token-Preis
let upgradeCost = additionalTH * pricePerTH; // Gesamtkosten für das Upgrade
let additionalDailyRevenuebtc = additionalTH * dailyRevenuePerTH.btc; // Zusätzlicher täglicher Ertrag in BTC
let dailyelectricity = calculateDailyElectricity(additionalTH, minerefficency, btcPrice, gmtPrice)
let dailyservice = calculateDailyService(additionalTH, btcPrice, gmtPrice)
let dailyProfitbtc = additionalDailyRevenuebtc - dailyelectricity.btc - dailyservice.btc
let dailyProfit = btc2usd(btcPrice, dailyProfitbtc);
let upgradecostbtc = usd2btc(upgradeCost ,btcPrice );
let roiDays = upgradecostbtc / dailyProfitbtc // ROI in Tagen
let roiPercent = (365 / roiDays) * 100; // ROI in %

return roiPercent.toFixed(2); // Rückgabe als Prozentwert
}


// Berechnet den zusätzlichen Profit durch ein TH-Upgrade
function calculateProfitIncreaseTH(amountTH) {
let satoshiPerTH = parseFloat(document.getElementById('sat-TH').value) || 0;
let moreSatoshi = satoshiPerTH * amountTH;
return moreSatoshi; // Da der Profit pro TH bereits definiert ist
}

// Berechnet den zusätzlichen Profit durch ein Effizienz-Upgrade
function calculateProfitIncreaseEfficiency(currentTH, currentEfficiency, newEfficiency) {
let satoshiPerTH = parseFloat(document.getElementById('sat-TH').value) || 0;
let btcPrice = parseFloat(document.getElementById('bitcoin-price-dropdown').value) || 0;
let gmtPrice = parseFloat(document.getElementById('gmt-token-price').value) || 0;

let currentRevenue = calculateDailyRevenue(satoshiPerTH, currentTH, btcPrice, gmtPrice);
let currentElectricity = calculateDailyElectricity(currentTH, currentEfficiency, btcPrice, gmtPrice);
let currentService = calculateDailyService(currentTH, btcPrice, gmtPrice);
let currentProfitBTC = currentRevenue.btc - currentElectricity.btc - currentService.btc;

let newRevenue = calculateDailyRevenue(satoshiPerTH, currentTH, btcPrice, gmtPrice);
let newElectricity = calculateDailyElectricity(currentTH, newEfficiency, btcPrice, gmtPrice);
let newService = calculateDailyService(currentTH, btcPrice, gmtPrice);
let newProfitBTC = newRevenue.btc - newElectricity.btc - newService.btc;

return {
btc: newProfitBTC - currentProfitBTC,
usd: btc2usd(btcPrice, newProfitBTC - currentProfitBTC),
gmt: btc2gmt(btcPrice, gmtPrice, newProfitBTC - currentProfitBTC)
};
}

// Berechnet das ROI eines Upgrades basierend auf den Investitionskosten und dem zusätzlichen Profit
function ROIofWATTUpgrade(upgradeCost, currentTH, currentEfficiency, newEfficiency) {
let profitIncrease = calculateProfitIncreaseEfficiency(currentTH, currentEfficiency, newEfficiency);
let btcPrice = parseFloat(document.getElementById('bitcoin-price-dropdown').value) || 0;

if (profitIncrease.btc <= 0) {
return "∞"; // Falls das Upgrade keinen positiven Profit generiert
}
let upgradeCostBTC = usd2btc(upgradeCost, btcPrice);
let roiDays = upgradeCostBTC / profitIncrease.btc;
let roiPercent = (365 / roiDays) * 100; // ROI in %

return {
roi_percent: roiPercent.toFixed(2), // Rückgabe als Prozentwert
profit_increase: profitIncrease        }
}

// Berechnet die Gesamtkosten für ein Effizienz-Upgrade über mehrere Stufen
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

return totalCost.toFixed(2); // Rückgabe der gesamten Upgrade-Kosten
}





function getEfficiencyUpgradePrice(currentEfficiency) {
if (efficiencyMatrixfarm[currentEfficiency]) {
return efficiencyMatrixfarm[currentEfficiency].pricePerW;
}
return null; // Falls keine Daten vorhanden sind
}
function getPricePerTH(efficiency, thAmount) {
efficiency = Math.round(parseFloat(efficiency)); // Runden auf die nächste ganze Zahl
if (!priceMatrixdatei[efficiency]) {
console.error(`Keine Preisdaten für ${efficiency} W/TH gefunden.`);
return null;
}

let priceEntries = priceMatrixdatei[efficiency];

// Finde den passenden Preis für die gegebene TH-Menge
for (let i = priceEntries.length - 1; i >= 0; i--) {
if (thAmount >= priceEntries[i].minTH) {
return priceEntries[i].pricePerTH;
}
}

return null; // Falls keine passende Preisstufe gefunden wurde
}
/*
function wechselWaehrung(mode) {
// Alle Buttons manuell über ID deselektieren
document.getElementById("btc-btn").classList.remove("active");
document.getElementById("usd-btn").classList.remove("active");
document.getElementById("gmt-btn").classList.remove("active");

// Aktiven Button setzen
if (mode === "btc") {
document.getElementById("btc-btn").classList.add("active");
} else if (mode === "usd") {
document.getElementById("usd-btn").classList.add("active");
} else if (mode === "gmt") {
document.getElementById("gmt-btn").classList.add("active");
}
let currencyElement = document.getElementById('currencyMode');
currencyElement.innerText = mode; // Speichert die Währung im UI

// Entferne vorherige aktive Markierung
document.querySelectorAll('.currency-btn').forEach(btn => btn.classList.remove('active'));

// Setze den aktiven Button basierend auf der gewählten Währung
let activeButton = document.getElementById(`${mode}-btn`);
if (activeButton) {
activeButton.classList.add('active');
} else {
console.error(`Fehler: Der Button ${mode}-btn existiert nicht.`);
}

// Aktualisiere die Miner-Tabelle mit der neuen Währung
speichernDaten();
ladenDaten();
} */
function wechselWaehrung(neueWaehrung) {
    document.getElementById('currencyMode').innerText = neueWaehrung;
    // Update button styles
    document.querySelectorAll('[id$="-btn"]').forEach(btn => {
        if (btn.id.includes('btc') || btn.id.includes('usd') || btn.id.includes('gmt')) {
            btn.classList.remove('bg-purple-600', 'text-white');
            btn.classList.add('text-gray-300', 'hover:text-white');
        }
    });
    document.getElementById(`${neueWaehrung}-btn`).classList.remove('text-gray-300', 'hover:text-white');
    document.getElementById(`${neueWaehrung}-btn`).classList.add('bg-purple-600', 'text-white');
    // Daten speichern und neu laden wie im alten Code
    if (typeof speichernDaten === 'function') speichernDaten();
    if (typeof ladenDaten === 'function') ladenDaten();
}

function btc2usd(btcPrice, valueBtc) {
return (btcPrice * valueBtc).toFixed(2);
}
function usd2btc(usdValue, btcPrice) {
return (usdValue / btcPrice).toFixed(8);
}
function btc2gmt(btcPrice, gmtPrice, valueBtc) {
if (gmtPrice === 0 || isNaN(gmtPrice)) {
console.error("Fehler: GMT-Preis ist 0 oder ungültig.");
return "N/A";
}
return ((btcPrice * valueBtc) / gmtPrice).toFixed(2);
}
function getTotalDiscount() {
let user_data = JSON.parse(localStorage.getItem('user_data')) || {};

// 🔹 Falls `user_data` ein Array wird, nimm das erste Element
if (Array.isArray(user_data) && user_data.length > 0) {
return user_data[0].total_discount || 0;
}

// 🔹 Falls `user_data` noch ein einzelnes Objekt ist, greife direkt darauf zu
return user_data.total_discount || 0;
}


async function speichernMinerSupabase() {
    speichernDaten();

    // Benutzer abrufen
    const { data: user, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
        console.error("❌ Fehler beim Abrufen des Benutzers:", userError);
        return;
    }

    let userId = user.user.id; // Aktuelle User-ID
    let minerData = JSON.parse(localStorage.getItem('minerData')) || [];

    // 🔹 User-Daten direkt über `getTotalDiscount()` abrufen
    let totalDiscount = getTotalDiscount(); 

    // Bestehende Daten in Supabase löschen
    await supabase.from('miners').delete().eq('user_id', userId);
    await supabase.from('user_data').delete().eq('user_id', userId);

    // 🔹 Miner-Daten speichern
    let { data, error } = await supabase.from('miners').insert(
        minerData.map(miner => ({
            user_id: userId,
            miner_id: miner.miner_id,
            Miner_Name: miner.Miner_Name,
            power: miner.power,
            efficiency: miner.efficiency
        }))
    );

    // 🔹 User-Daten speichern (total_discount)
    let data2, error2;
    if (totalDiscount !== null) {
        ({ data: data2, error: error2 } = await supabase.from('user_data').insert({
            user_id: userId,
            total_discount: totalDiscount
        }));
    } else {
        console.warn("❌ Kein total_discount gespeichert.");
    }

    // Fehlerhandling
    if (error) {
        console.error("❌ Fehler beim Speichern der Miner in Supabase:", error);
        alert("Error while saving miners!");
    } else if (error2) {
        console.error("❌ Fehler beim Speichern der User-Daten in Supabase:", error2);
        alert("Error while saving user data!");
    } else {
        console.log("✅ Miner erfolgreich gespeichert:", data);
        console.log("✅ User-Daten erfolgreich gespeichert:", data2);
        alert("All miners and user data saved!");
    }
}

async function ladenuserdataSupabase() {
const { data: user, error: userError } = await supabase.auth.getUser();
if (userError || !user) {
    console.error("Fehler beim Abrufen des Benutzers:", userError);
    return;
}

let userId = user.user.id;

let { data: user_data, error } = await supabase
    .from('user_data')
    .select('total_discount')
    .eq('user_id', userId);

if (error) {
    console.error("❌ Fehler beim Laden der user_data aus Supabase:", error);
    alert("Error loading user_data!");
    user_data = [{ total_discount: 0 }]; // Falls Fehler: Standardwert setzen
}

// 🔹 Sicherstellen, dass `user_data` nicht leer ist
let totalDiscount = (user_data.length > 0) ? user_data[0].total_discount : 0;

// 🔹 In LocalStorage speichern
localStorage.setItem('user_data', JSON.stringify({ total_discount: totalDiscount }));

console.log("✅ user_data geladen:", totalDiscount);
alert("user_data loaded!");
}

    async function ladenMinerSupabase() {
        const { data: user, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
            console.error("Fehler beim Abrufen des Benutzers:", userError);
            return;
        }
    
        let userId = user.user.id;
    
        let { data: miners, error } = await supabase
            .from('miners')
            .select('miner_id, power, efficiency , Miner_Name')
            .order('miner_id', { ascending: true }) // Sortierung nach miner_id
            .eq('user_id', userId);
    
        if (error) {
            console.error("Fehler beim Laden der Miner aus Supabase:", error);
            alert("Error loading miners!");
            return;
        }
    
        // Miner in localStorage speichern und laden
        localStorage.setItem('minerData', JSON.stringify(miners));
        ladenuserdataSupabase()
        ladenDaten(); // Miner in UI anzeigen
        alert("All miners loaded!");
    }
    
    async function loescheMinerSupabase() {
        const { data: user, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
            console.error("Fehler beim Abrufen des Benutzers:", userError);
            return;
        }
    
        let userId = user.user.id;
    
        let { error } = await supabase.from('miners').delete().eq('user_id', userId);
    
        if (error) {
            console.error("Fehler beim Löschen der Miner aus Supabase:", error);
        } else {
            console.log("Alle Miner des Nutzers wurden gelöscht.");
            alert("All miners deleted!");
        }
    }
    async function loescheEinzelnenMinerSupabase(minerIdloc) {
        const { data: user, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
            console.error("Fehler beim Abrufen des Benutzers:", userError);
            return;
        }
    
        let userId = user.user.id;
    
        let { error } = await supabase
            .from('miners')
            .delete()
            .match({ user_id: userId, miner_id: minerIdloc });
    
        if (error) {
            console.error(`Fehler beim Löschen des Miners mit ID ${minerIdloc}:`, error);
            alert("Error deleting miner!");
        } else {
            console.log(`Miner mit ID ${minerIdloc} wurde gelöscht.`);
            alert("Miner deleted!");
        }
}

function importMinerData(replaceExisting) {
let text = document.getElementById("minerInput").value;
let minerData = [];
let lines = text.split("\n").map(line => line.trim());
let currentMiner = null;

for (let i = 0; i < lines.length; i++) {
let line = lines[i];

if (line.startsWith("Miner")) {
// Neuer Miner beginnt
if (currentMiner !== null) {
    minerData.push(currentMiner); // Letzten Miner speichern
}
currentMiner = { miner_id: "", Miner_Name: "", power: 0, efficiency: 0 };
} else if (line.startsWith("The")) {
// Miner-Typ und Nummer extrahieren
let parts = line.split(" #");
currentMiner.Miner_Name = parts[0].trim();
currentMiner.miner_id = "#" + parts[1].trim();
} else if (line.endsWith("TH")) {
// TH extrahieren
currentMiner.power = parseFloat(line.replace(" TH", "").trim());
} else if (line.endsWith("W/TH")) {
// W/TH extrahieren
currentMiner.efficiency = parseFloat(line.replace(" W/TH", "").trim());
}
}

// Letzten Miner nicht vergessen, falls vorhanden!
if (currentMiner !== null) {
minerData.push(currentMiner);
}

if (replaceExisting) {
// **Ersetze alle vorhandenen Miner mit den importierten**
localStorage.setItem("minerData", JSON.stringify(minerData));
} else {
// **Hole bestehende Miner und füge die neuen hinzu**
let existingData = JSON.parse(localStorage.getItem("minerData")) || [];
let updatedData = existingData.concat(minerData);
localStorage.setItem("minerData", JSON.stringify(updatedData));
}

// **Lade die aktuell gespeicherten Miner aus LocalStorage neu in die Tabelle**
ladeFarmTable(JSON.parse(localStorage.getItem("minerData"))); 

// Schließe das Import-Modal
closeImportModal();
}


let parsedMiners = []; // Temporärer Speicher für geparste Miner

function importMinerData() {
let text = document.getElementById("minerInput").value;
parsedMiners = []; // Reset der Liste
let lines = text.split("\n").map(line => line.trim());
let currentMiner = null;

for (let i = 0; i < lines.length; i++) {
let line = lines[i];

if (line.startsWith("Miner")) {
if (currentMiner !== null) {
    parsedMiners.push(currentMiner); // Letzten Miner speichern
}
currentMiner = { miner_id: "", Miner_Name: "", power: 0, efficiency: 0 };
}  else if (line.startsWith("The") || line.startsWith("Khabib")) {
let parts = line.split(" #");
currentMiner.Miner_Name = parts[0].trim();
currentMiner.miner_id = "#" + parts[1].trim();
} else if (line.endsWith("W/TH")) {
currentMiner.efficiency = parseFloat(line.replace(" W/TH", "").trim());
} else if (line.endsWith("TH")) {
currentMiner.power = parseFloat(line.replace(" TH", "").trim());
}
}

if (currentMiner !== null) {
parsedMiners.push(currentMiner);
}

showPreviewModal();
}

// Zeigt das Modal mit den importierten Minern an
function showPreviewModal() {
let tbody = document.getElementById("preview-tbody");
tbody.innerHTML = ""; // Vorherige Inhalte löschen

parsedMiners.forEach(miner => {
let row = document.createElement("tr");
row.innerHTML = `
<td>${miner.miner_id}</td>
<td>${miner.Miner_Name}</td>
<td>${miner.power} TH</td>
<td>${miner.efficiency} W/TH</td>
`;
tbody.appendChild(row);
});

document.getElementById("previewModal").style.display = "flex"; // Modal anzeigen
}

// Schließt das Kontroll-Modal
function closePreviewModal() {
document.getElementById("previewModal").style.display = "none";
}
function finalizeImport(replaceExisting) {
if (replaceExisting) {
localStorage.setItem("minerData", JSON.stringify(parsedMiners)); // Ersetzt alte Miner
} else {
let existingData = JSON.parse(localStorage.getItem("minerData")) || [];
localStorage.setItem("minerData", JSON.stringify(existingData.concat(parsedMiners))); // Fügt hinzu
}

ladenDaten()
speichernDaten()
closePreviewModal(); // Kontroll-Modal schließen
closeImportModal(); // Haupt-Import-Modal schließen
}
