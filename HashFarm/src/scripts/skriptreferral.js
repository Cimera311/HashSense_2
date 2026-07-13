function processCSV() {
    const input = document.getElementById('csvInput');
    if (!input.files.length) {
      alert('Bitte eine CSV-Datei auswählen!');
      return;
    }
  
    const file = input.files[0];
    const reader = new FileReader();
  
    reader.onload = function (e) {
      let content = e.target.result;
  
      const lines = content.split('\n');
      const fixedLines = [];
  
      let currentTime = "";
      let pendingEntry = null;
  
      lines.forEach((line, index) => {
        const parts = line.split(';').map(x => x.trim());
  
        // Header
        if (index === 0) {
          fixedLines.push("Time;Date;User ID;Type;Purchase amount;USD amount;Your share;Reward;Status");
          return;
        }
  
        // Uhrzeitzeile
        if (parts.length === 1 && /^\d{2}:\d{2}:\d{2}$/.test(parts[0])) {
          currentTime = parts[0];
          return;
        }
  
        // Rewardzeile
        if (parts.length >= 4 && !parts[0].startsWith("$")) {
          const date = parts[0];
          const userId = parts[1];
          const type = parts[2];
          const purchaseAmount = parts[3] ? fixDecimalComma(parts[3]) : "";
          let reward = parts[6] ? parts[6].replace(".", ",") : "";
          let status = parts[7] || "";
  
          pendingEntry = {
            time: currentTime,
            date,
            userId,
            type,
            purchaseAmount: "", // initial leer
            usdAmount: "",
            yourShare: "",
            reward: fixDecimalComma(reward),
            status
          };
  
          // Type prüfen
          if (type === "Upgrade" || type === "Purchase" || type === "Boosts") {
            pendingEntry.purchaseAmount = purchaseAmount;
  
            // Check, ob nächste Zeile eine $-Zeile ist
            const nextLine = lines[index + 1];
            if (nextLine && nextLine.startsWith("$")) {
              const nextParts = nextLine.split(';').map(x => x.trim());
  
              pendingEntry.usdAmount = fixDecimalComma(nextParts[0].replace("$", ""));
              pendingEntry.yourShare = nextParts[2] || "";
              pendingEntry.reward = nextParts[3] ? fixDecimalComma(nextParts[3]) : "";
              pendingEntry.status = nextParts[4] || "";
  
              lines[index + 1] = ""; // $-Zeile als verarbeitet markieren
            }
          }
          // Type prüfen
          if (type === "Registration") {
            pendingEntry.reward = "";
            pendingEntry.status = ""; // 
  
            }
          
  
  
  
  
          // Push fertige Zeile
          fixedLines.push([
            pendingEntry.time,
            pendingEntry.date,
            pendingEntry.userId,
            pendingEntry.type,
            pendingEntry.purchaseAmount,
            pendingEntry.usdAmount,
            pendingEntry.yourShare,
            pendingEntry.reward,
            pendingEntry.status
          ].join(';'));
  
          pendingEntry = null;
        }
      });
  
      // 3. Neue CSV bauen
      const newContent = fixedLines.join('\n');
  
      const blob = new Blob([newContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.setAttribute("download", "referral_transactions_fixed_final.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };
  
    reader.readAsText(file, "UTF-8");
  }
  function fixDecimalComma(value) {
    if (!value) return "";
  
    let pointCount = (value.match(/\./g) || []).length;
    let commaCount = (value.match(/,/g) || []).length;
  
    // Fall 1: Nur 1 Punkt, kein Komma → Standardformat wie "113.35"
    if (pointCount === 1 && commaCount === 0) {
      return value.replace(".", ",");
    }
  
    // Fall 2: Komma ist Dezimaltrenner → Entferne alle Punkte (Tausender), Komma bleibt
    if (commaCount === 1 && pointCount >= 1) {
      return value.replace(/\./g, "");
    }
  
    // Fall 3: Zahl hat mehrere Punkte, keine Kommas → letzter Punkt = Dezimalstelle
    if (pointCount > 1 && commaCount === 0) {
      value = value.replace(/\.(?=[^.]*$)/, "#"); // Letzten Punkt merken
      value = value.replace(/\./g, "");           // Alle anderen löschen
      return value.replace("#", ",");             // Letzten Punkt zu Komma
    }
  
    // Fall 4: Es gibt mehrere Kommas → wie bei Punkt behandeln
    if (commaCount > 1) {
      value = value.replace(/,(?=[^,]*$)/, "#");
      value = value.replace(/,/g, "");
      return value.replace("#", ",");
    }
  
    return value;
  }
  function convertTransactionsToXLSX() {
    const input = document.getElementById('transactionInput').value;
    const lines = input.split('\n').map(line => line.trim()).filter(line => line !== '');

    const today = new Date();
    let currentDate = formatDate(today);

    const dateMapping = {
        "today": 0,
        "yesterday": -1,
        "2 days ago": -2,
        "3 days ago": -3,
        "4 days ago": -4
    };

    let i = 0;
    let startReading = false;
    const rows = [["Date", "Type", "Value", "Status", "Currency"]];

    while (i < lines.length) {
        const line = lines[i];

        // Skip until "today" appears
        if (!startReading) {
            if (line.toLowerCase().includes("today")) {
                startReading = true;
            }
            i++;
            continue;
        }

        if (dateMapping.hasOwnProperty(line.toLowerCase())) {
            const offset = dateMapping[line.toLowerCase()];
            const newDate = new Date();
            newDate.setDate(today.getDate() + offset);
            currentDate = formatDate(newDate);
            i++;
            continue;
        }

        const dateMatch = line.match(/^[A-Za-z]{3} \d{2}$/);
        if (dateMatch) {
            currentDate = convertToGermanDate(line);
            i++;
            continue;
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

    // Setze die "Value" Spalte (C) auf Währung
    const range = XLSX.utils.decode_range(worksheet['!ref']);
    for (let R = 1; R <= range.e.r; ++R) {
        const cell = worksheet[XLSX.utils.encode_cell({ r: R, c: 2 })]; // 2 = C-Spalte
        if (cell && typeof cell.v === 'number') {
            cell.t = 'n';
            cell.z = '"$"#,##0.00'; // Format: Währung USD
        }
    }

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
    const months = {
        Jan: '01', Feb: '02', Mar: '03', Apr: '04',
        May: '05', Jun: '06', Jul: '07', Aug: '08',
        Sep: '09', Oct: '10', Nov: '11', Dec: '12'
    };
    const [monthStr, dayStr] = dateString.split(' ');
    const month = months[monthStr];
    const day = dayStr.padStart(2, '0');
    const year = new Date().getFullYear();
    return `${day}.${month}.${year}`;
}
function showTab(tabId) {
  // Alle Tabs verstecken
  document.querySelectorAll('.tab-page').forEach(tab => {
      tab.style.display = 'none';
      tab.classList.remove('active');
  });

  // Tab mit übergebener ID anzeigen
  const activeTab = document.getElementById(tabId);
  if (activeTab) {
      activeTab.style.display = 'block';
      activeTab.classList.add('active');
  }

  // Alle Buttons zurücksetzen
  document.querySelectorAll('.button-group .main-btn').forEach(btn => {
      btn.classList.remove('active');
  });

  // Aktiven Button hervorheben
  const buttons = document.querySelectorAll('.button-group .main-btn');
  buttons.forEach(btn => {
      if (btn.getAttribute('onclick')?.includes(tabId)) {
          btn.classList.add('active');
      }
  });
}
