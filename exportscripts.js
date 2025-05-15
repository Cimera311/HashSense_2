
let parsedMiners = [];

function importMinerData() {
    let text = document.getElementById("minerInput").value;
    parsedMiners = [];
    let lines = text.split("\n").map(line => line.trim());
    let currentMiner = null;

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];

        if (line.startsWith("Miner")) {
            if (currentMiner !== null) parsedMiners.push(currentMiner);
            currentMiner = { miner_id: "", Miner_Name: "", power: 0, efficiency: 0 };
        } else if (line.startsWith("The") || line.startsWith("Khabib")) {
            let parts = line.split(" #");
            currentMiner.Miner_Name = parts[0].trim();
            currentMiner.miner_id = "#" + parts[1].trim();
        } else if (line.endsWith("W/TH")) {
            currentMiner.efficiency = parseFloat(line.replace(" W/TH", "").trim());
        } else if (line.endsWith("TH")) {
            currentMiner.power = parseFloat(line.replace(" TH", "").trim());
        }
    }
    if (currentMiner !== null) parsedMiners.push(currentMiner);
    showPreviewModal();
}

function showPreviewModal() {
    let tbody = document.getElementById("preview-tbody");
    tbody.innerHTML = "";
    parsedMiners.forEach(miner => {
        let row = document.createElement("tr");
        row.innerHTML = `<td>${miner.miner_id}</td><td>${miner.Miner_Name}</td><td>${miner.power} TH</td><td>${miner.efficiency} W/TH</td>`;
        tbody.appendChild(row);
    });
    document.getElementById("previewModal").style.display = "flex";
}

function finalizeImport(replaceExisting) {
    if (replaceExisting) {
        localStorage.setItem("minerData", JSON.stringify(parsedMiners));
    } else {
        let existingData = JSON.parse(localStorage.getItem("minerData")) || [];
        localStorage.setItem("minerData", JSON.stringify(existingData.concat(parsedMiners)));
    }
    location.reload();
    closePreviewModal();
    closeImportModal();
}

function closePreviewModal() {
    document.getElementById("previewModal").style.display = "none";
}

function openHowToImportModal(page) {
    document.getElementById(page).style.display = "block";
}

function closeHowToImportModal(page) {
    document.getElementById(page).style.display = "none";
}

function closeImportModal() {
    document.getElementById("importModal").style.display = "none";
}

function convertReferralToCSV() {
    const input = document.getElementById('referralInput').value;
    const lines = input.split('\n').map(l => l.trim()).filter(l => l);
    const header = "Time;Date;User ID;Type;Purchase amount;USD amount;Your share;Reward;Status";
    const rows = [header];
    let currentTime = "";

    lines.forEach((line, i) => {
        const parts = line.split(';').map(p => p.trim());
        if (parts.length === 1 && /^\d{2}:\d{2}:\d{2}$/.test(parts[0])) {
            currentTime = parts[0];
        } else if (parts.length >= 4 && !parts[0].startsWith("$")) {
            const date = parts[0];
            const userId = parts[1];
            const type = parts[2];
            const purchaseAmount = fixDecimalComma(parts[3]);
            let reward = fixDecimalComma(parts[6] || "");
            let status = parts[7] || "";
            rows.push([currentTime, date, userId, type, purchaseAmount, "", "", reward, status].join(';'));
        }
    });

    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", "referral_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function fixDecimalComma(value) {
    if (!value) return "";
    let pointCount = (value.match(/\./g) || []).length;
    let commaCount = (value.match(/,/g) || []).length;
    if (pointCount === 1 && commaCount === 0) return value.replace(".", ",");
    if (commaCount === 1 && pointCount >= 1) return value.replace(/\./g, "");
    if (pointCount > 1 && commaCount === 0) {
        value = value.replace(/\.(?=[^.]*$)/, "#").replace(/\./g, "").replace("#", ",");
        return value;
    }
    if (commaCount > 1) {
        value = value.replace(/,(?=[^,]*$)/, "#").replace(/,/g, "").replace("#", ",");
        return value;
    }
    return value;
}

function convertTransactionsToXLSX() {
    const input = document.getElementById('transactionInput').value;
    const lines = input.split('\n').map(line => line.trim()).filter(line => line !== '');
    const today = new Date();
    let currentDate = formatDate(today);
    const dateMapping = { "today": 0, "yesterday": -1, "2 days ago": -2, "3 days ago": -3, "4 days ago": -4 };
    let i = 0;
    let startReading = false;
    const rows = [["Date", "Type", "Value", "Status", "Currency"]];

    while (i < lines.length) {
        const line = lines[i];
        if (!startReading) {
            if (line.toLowerCase().includes("today")) startReading = true;
            i++; continue;
        }

        if (dateMapping.hasOwnProperty(line.toLowerCase())) {
            const offset = dateMapping[line.toLowerCase()];
            const newDate = new Date();
            newDate.setDate(today.getDate() + offset);
            currentDate = formatDate(newDate);
            i++; continue;
        }

        const dateMatch = line.match(/^[A-Za-z]{3} \d{2}$/);
        if (dateMatch) {
            currentDate = convertToGermanDate(line);
            i++; continue;
        }

        const type = lines[i];
        const amount = lines[i + 1];
        const status = lines[i + 2];
        const currency = lines[i + 3];

        if (type && amount && status && currency) {
            rows.push([currentDate, type, parseFloat(amount), status, currency]);
            i += 4;
        } else {
            i++;
        }
    }

    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Transactions");
    XLSX.writeFile(workbook, "transactions.xlsx");
}

function formatDate(date) {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
}

function convertToGermanDate(dateString) {
    const months = { Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06', Jul: '07', Aug: '08',
                     Sep: '09', Oct: '10', Nov: '11', Dec: '12' };
    const [monthStr, dayStr] = dateString.split(' ');
    const month = months[monthStr];
    const day = dayStr.padStart(2, '0');
    const year = new Date().getFullYear();
    return `${day}.${month}.${year}`;
}

function showTab(tabId) {
    document.querySelectorAll('.tab-page').forEach(tab => {
        tab.style.display = 'none';
        tab.classList.remove('active');
    });

    const activeTab = document.getElementById(tabId);
    if (activeTab) {
        activeTab.style.display = 'block';
        activeTab.classList.add('active');
    }

    document.querySelectorAll('.button-group .main-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    const buttons = document.querySelectorAll('.button-group .main-btn');
    buttons.forEach(btn => {
        if (btn.getAttribute('onclick')?.includes(tabId)) {
            btn.classList.add('active');
        }
    });
}

function clearTransactionInput() {
    document.getElementById('transactionInput').value = '';
}
