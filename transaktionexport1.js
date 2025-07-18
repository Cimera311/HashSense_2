// Globale Abbruch-Variable
globalThis.cancelExport = false;

(async function() {
    window.cancelGoMiningExport = function() {
        cancelExport = true;
        console.log("Export wird nach der aktuellen Seite abgebrochen! 🚫");
    };

    function getFirstRowKey() {
        const firstRow = document.querySelector('tbody tr');
        const date = firstRow?.querySelector('datetime-display span.text-muted')?.innerText.trim() || '';
        const time = firstRow?.querySelector('datetime-display span.fw-medium')?.innerText.trim() || '';
        const value = firstRow?.querySelector('[data-qa-column="value"] span.hidden-empty.ms-1 > span')?.innerText.trim() || '';
        const pageSpan = document.querySelector('div.w-100.d-flex.align-items-center.justify-content-center span.mx-2.p-2');
        const pageNumber = pageSpan?.innerText.trim() || '';
        return `${pageNumber}_${date}_${time}_${value}`;
    }

    function extractRows() {
        const rows = document.querySelectorAll('tbody tr');
        const extracted = [];

        rows.forEach(row => {
            const time = row.querySelector('datetime-display span.fw-medium')?.innerText.trim() || '';
            const date = row.querySelector('datetime-display span.text-muted')?.innerText.trim() || '';
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
        let csv = "Date-DayMonthYear;Date-Time;Type;Value;Currency;Status\n";
        data.forEach(item => {
            csv += `"${item.date}";"${item.time}";"${item.type}";"${item.value}";"${item.currency}";"${item.status}"\n`;
        });

        let filename = "gomining_transactions.csv";
        const dateRangeElement = document.querySelector('.catalog-index_block-filter-item');
        if (dateRangeElement) {
            const dateText = dateRangeElement.innerText
                .trim()
                .replace(/\s+/g, '_')
                .replace(/[,]/g, '')
                .replace(/[^\w\-]/g, '');
            filename = `gomining_${dateText}.csv`;
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
                console.log("Export wurde manuell abgebrochen! 🚫");
                break;
            }

            console.log(`page done ${pageCounter}...`);
            allData = allData.concat(extractRows());

            let icon = document.querySelector('icon-arrow-short[direction="right"]');
            let nextButton = icon?.closest('button');

            if (!nextButton || nextButton.disabled) {
                console.log("button not ready yet. waiting 2 seconds and try again...");
                await new Promise(r => setTimeout(r, 2000));
                icon = document.querySelector('icon-arrow-short[direction="right"]');
                nextButton = icon?.closest('button');

                if (!nextButton || nextButton.disabled) {
                    console.log("Weiter-Button weiterhin deaktiviert. Abbruch.");
                    break;
                }
            }

            nextButton.click();
            if (pageCounter % 10 === 0) {
                console.log(`Kurze Pause nach Seite ${pageCounter}...`);
                await new Promise(r => setTimeout(r, 2000));
            } else {
                await new Promise(r => setTimeout(r, 300));
            }

            let newKey = getFirstRowKey();
            if (newKey === previousKey) {
                console.log("Seite hat sich scheinbar nicht verändert. Warte 2 Sekunden und prüfe erneut...");
                await new Promise(r => setTimeout(r, 2000));
                newKey = getFirstRowKey();

                if (newKey === previousKey) {
                    console.log("Seite hat sich wirklich nicht verändert. Speichere letzte Seite...");
                    allData = allData.concat(extractRows());
                    break;
                }
            }

            previousKey = newKey;
            pageCounter++;
        }

        if (allData.length > 0) {
            console.log(`Exportiere ${allData.length} Transaktionen...`);
            exportToCSV(allData);
        } else {
            console.log("Keine Daten zum Exportieren gesammelt.");
        }
    }

    await goMiningAutoExport();
})();