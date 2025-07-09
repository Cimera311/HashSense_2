      globalThis.cancelExport = false;
      globalThis.dateFormat = 'us'; // Default

      function normalizeDate(dateStr, format) {
        if (format === 'eu') {
          if (dateStr.includes('/')) {
            const [d, m, y] = dateStr.split('/');
            return `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
          } else if (dateStr.includes('.')) {
            const [d, m, y] = dateStr.split('.');
            return `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
          }
        } else {
          if (dateStr.includes('/')) {
            const [m, d, y] = dateStr.split('/');
            return `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
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
          return `${pageNumber}_${date}_${time}_${value}`;
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
              console.log("Export manually aborted! 🚫");
              break;
            }

            console.log(`Page done ${pageCounter}...`);
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
              console.log(`Short break after page ${pageCounter}...`);
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
            console.log(`Exporting ${allData.length} transactions...`);
            exportToCSV(allData);
          } else {
            console.log("No data collected to export.");
          }
        }

        await goMiningAutoExport();
      })();