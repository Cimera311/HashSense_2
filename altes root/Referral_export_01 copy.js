(() => {
  console.log("=== TRANSACTION EXPORT START (ALLE SEITEN) ===");

  const tableIndex = 1; // zweite Tabelle ist die Transaktions-Tabelle
  let csv = [];
  let collectedRows = [];
  let inactiveNextCount = 0;
  const maxInactive = 4;
  const maxPages = 999;

  function formatNumber(val) {
    if (!val) return "";
    let cleaned = val.replace(/[^0-9.,-]/g, "");
    let parts = cleaned.split(/[,\.]/);
    if (parts.length > 1) {
      let decimal = parts.pop();
      let intPart = parts.join("");
      return intPart + "," + decimal;
    }
    return cleaned;
  }

  function formatDate(val) {
    if (!val) return "";
    let d = new Date(val);
    if (!isNaN(d)) {
      return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
    }
    let matchEU = val.match(/(\d{1,2})[\.\/\-](\d{1,2})[\.\/\-](\d{4})/);
    if (matchEU) {
      let [_, dd, mm, yyyy] = matchEU;
      return dd.padStart(2,"0")+"."+mm.padStart(2,"0")+"."+yyyy;
    }
    let matchUS = val.match(/([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})/);
    if (matchUS) {
      let d2 = new Date(matchUS[0]);
      if (!isNaN(d2)) {
        return d2.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
      }
    }
    return val;
  }

  function extractPageData() {
    const table = document.querySelectorAll("table")[tableIndex];
    if (!table) return [];

    let rowsOut = [];
    const rows = table.querySelectorAll("tbody tr");
    rows.forEach(row => {
      const time = row.querySelector('span.text-nowrap.text-muted')?.innerText.trim() || "";
      const dateRaw = row.querySelector('span.text-nowrap:not(.text-muted)')?.innerText.trim() || "";
      const date = formatDate(dateRaw);
      const userId = row.querySelector('td[data-qa-column="userId"]')?.innerText.trim() || "";
      const type = row.querySelector('td[data-qa-column="type"]')?.innerText.replace(/\s+/g, " ").trim() || "";

      const isRegistration = type.toLowerCase().includes("registration");

      const amountCoin = isRegistration ? "-" : formatNumber(row.querySelector('td[data-qa-column="amount"] span.ms-1')?.innerText.trim() || "");
      const amountUsd  = isRegistration ? "-" : formatNumber(row.querySelector('td[data-qa-column="amount"] .text-grey')?.innerText.trim() || "");
      const rewardCoin = isRegistration ? "-" : formatNumber(row.querySelector('td[data-qa-column="reward"] span.ms-1')?.innerText.trim() || "");
      const rewardUsd  = isRegistration ? "-" : formatNumber(row.querySelector('td[data-qa-column="reward"] .text-grey')?.innerText.trim() || "");
      const royalty    = isRegistration ? "-" : formatNumber(row.querySelector('td[data-qa-column="summary"]')?.innerText.trim() || "");
      const status     = isRegistration ? "-" : (row.querySelector('td[data-qa-column="status"] span')?.innerText.trim() || "");

      rowsOut.push([time,date,userId,type,amountCoin,amountUsd,rewardCoin,rewardUsd,royalty,status]);
    });
    return rowsOut;
  }

  async function processPages() {
    csv.push([
      "Time",
      "Date",
      "UserID",
      "Type",
      "Amount (Coin)",
      "Amount (USD)",
      "Reward (Coin)",
      "Reward (USD)",
      "Royalty %",
      "Status"
    ].join(";"));

    for (let page = 1; page <= maxPages; page++) {
      console.log(`📄 Exportiere Seite ${page}...`);
      collectedRows.push(...extractPageData());

      // Next-Button suchen
      const nextBtn = Array.from(document.querySelectorAll("a,button")).find(b => /next/i.test(b.innerText));
      if (!nextBtn || nextBtn.classList.contains("disabled")) {
        inactiveNextCount++;
        console.log(`⚠️ Next-Button inaktiv (${inactiveNextCount}/${maxInactive})`);
        if (inactiveNextCount >= maxInactive) {
          console.log("✅ Ende erreicht (kein Next mehr).");
          break;
        }
        await new Promise(r => setTimeout(r, 5000)); // 5 Sek. warten und nochmal versuchen
        page--; // gleiche Seite erneut prüfen
        continue;
      }

      // Reset counter wenn Button aktiv ist
      inactiveNextCount = 0;

      // 250ms warten, dann klicken
      await new Promise(r => setTimeout(r, 250));
      nextBtn.click();

      // 5 Sekunden warten, bis Daten geladen sind
      await new Promise(r => setTimeout(r, 5000));
    }

    // CSV aufbauen
    collectedRows.forEach(r => {
      csv.push(r.map(v => `"${v}"`).join(";"));
    });

    // Download
    const blob = new Blob([csv.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "transactions_all.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    console.log("🎉 Export abgeschlossen, CSV mit allen Seiten heruntergeladen!");
  }

  processPages();
})();