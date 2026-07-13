// GoMining Referral Rewards Export Script
// Automatically exports all referral rewards across multiple pages
// Usage: Open GoMining → Rewards → Referral Rewards, then run this script in browser console

globalThis.cancelExport = false;
globalThis.dateFormat = 'us'; // Default: 'us' or 'eu'

function normalizeDate(dateStr, format) {
  // Handle different date formats
  if (format === 'eu') {
    if (dateStr.includes('/')) {
      const [d, m, y] = dateStr.split('/');
      return `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
    } else if (dateStr.includes('.')) {
      const [d, m, y] = dateStr.split('.');
      return `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
    }
  } else {
    // US format: "Nov 1, 2025" or "10/31/2025"
    if (dateStr.includes(',')) {
      // "Nov 1, 2025" format - convert to YYYY-MM-DD
      const date = new Date(dateStr);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } else if (dateStr.includes('/')) {
      const [m, d, y] = dateStr.split('/');
      return `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
    }
  }
  return dateStr;
}

function normalizeNumber(numberStr) {
  // Remove all non-numeric chars except dots, commas, and minus
  // Replace first dot with # (thousands separator becomes temp marker)
  // Remove all commas
  // Replace # back to comma (German decimal separator)
  let cleaned = numberStr.replace(/[^\d.,-]/g, '');
  
  // Handle negative numbers
  let isNegative = cleaned.startsWith('-');
  cleaned = cleaned.replace(/[-+]/g, '');
  
  // Convert dot-as-thousands and comma-as-decimal (or vice versa) to German format
  // Assuming input is: 152.40 or 1,234.56 (US) or 152,40 or 1.234,56 (EU)
  cleaned = cleaned.replace('.', '#').replace(/,/g, '').replace('#', ',');
  
  if (isNegative) {
    cleaned = '-' + cleaned;
  }
  
  return cleaned;
}

(async function () {
  window.cancelReferralExport = function () {
    cancelExport = true;
    console.log("🚫 Referral export manually aborted!");
  };

  console.log("🚀 Starting GoMining Referral Rewards Export...");
  console.log("💡 To cancel anytime, run: cancelReferralExport()");

  function getFirstRowKey() {
    const firstRow = document.querySelector('tbody tr');
    if (!firstRow) return '';
    
    const dateCell = firstRow.querySelectorAll('td')[0];
    const userIdCell = firstRow.querySelectorAll('td')[1];
    const rewardCell = firstRow.querySelectorAll('td')[5];
    
    const time = dateCell?.querySelector('div:first-child')?.innerText.trim() || '';
    const rawDate = dateCell?.querySelector('div:last-child')?.innerText.trim() || '';
    const date = normalizeDate(rawDate, dateFormat);
    const userId = userIdCell?.innerText.trim() || '';
    const reward = rewardCell?.querySelector('div:first-child')?.innerText.trim() || '';
    
    return `${date}_${time}_${userId}_${reward}`;
  }

  function extractRows() {
    const rows = document.querySelectorAll('tbody tr');
    const extracted = [];

    rows.forEach(row => {
      const cells = row.querySelectorAll('td');
      if (cells.length < 7) return; // Skip invalid rows

      // Date & Time (Column 0)
      const dateCell = cells[0];
      const time = dateCell.querySelector('div:first-child')?.innerText.trim() || '';
      const rawDate = dateCell.querySelector('div:last-child')?.innerText.trim() || '';
      const date = normalizeDate(rawDate, dateFormat);

      // User ID (Column 1)
      const userId = cells[1]?.innerText.trim() || '';

      // Type (Column 2)
      const type = cells[2]?.innerText.trim() || '';

      // Purchase Amount (Column 3) - GMT and USD
      const purchaseCell = cells[3];
      let purchaseGMT = purchaseCell.querySelector('div:first-child')?.innerText.trim() || '';
      let purchaseUSD = purchaseCell.querySelector('div:last-child')?.innerText.trim() || '';
      
      // Clean and normalize numbers using the same logic as transaction export
      purchaseGMT = normalizeNumber(purchaseGMT);
      purchaseUSD = normalizeNumber(purchaseUSD);

      // Your Share % (Column 4)
      const sharePercent = cells[4]?.innerText.trim() || '';

      // Reward (Column 5) - GMT and USD
      const rewardCell = cells[5];
      let rewardGMT = rewardCell.querySelector('div:first-child')?.innerText.trim() || '';
      let rewardUSD = rewardCell.querySelector('div:last-child')?.innerText.trim() || '';
      
      // Clean and normalize numbers using the same logic as transaction export
      rewardGMT = normalizeNumber(rewardGMT);
      rewardUSD = normalizeNumber(rewardUSD);

      // Status (Column 6)
      const status = cells[6]?.innerText.trim() || '';

      extracted.push({
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
    });

    return extracted;
  }

  function exportToCSV(data) {
    // Header uses same format as transaction export: Date-DayMonthYear;Date-Time;...
    let csv = "Date-DayMonthYear;Date-Time;User_ID;Type;Purchase_GMT;Purchase_USD;Share_Percent;Reward_GMT;Reward_USD;Status\n";
    
    data.forEach(item => {
      csv += `"${item.date}";"${item.time}";"${item.userId}";"${item.type}";"${item.purchaseGMT}";"${item.purchaseUSD}";"${item.sharePercent}";"${item.rewardGMT}";"${item.rewardUSD}";"${item.status}"\n`;
    });

    const now = new Date();
    const timestamp = now.toISOString().split('T')[0];
    const filename = `gomining_referral_rewards_${timestamp}.csv`;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    console.log(`✅ Exported ${data.length} referral rewards to ${filename}`);
  }

  async function goMiningReferralAutoExport() {
    let allData = [];
    let previousKey = getFirstRowKey();
    let pageCounter = 1;

    while (true) {
      if (cancelExport) {
        console.log("🛑 Export manually aborted!");
        break;
      }

      console.log(`Page done ${pageCounter}...`);
      allData = allData.concat(extractRows());

      // Find "Next" link by searching for visually-hidden span with text "Next"
      const nextLinks = Array.from(document.querySelectorAll('a')).filter(link => {
        const hiddenSpan = link.querySelector('span.visually-hidden');
        return hiddenSpan && hiddenSpan.innerText.trim() === 'Next';
      });

      let nextLink = nextLinks[0];

      // Check if link is disabled (has .disabled class or pointer-events: none)
      const isDisabled = nextLink?.classList.contains('disabled') || 
                        window.getComputedStyle(nextLink).pointerEvents === 'none';

      if (!nextLink || isDisabled) {
        console.log("Button not ready yet. Waiting 5 seconds and trying again...");
        await new Promise(r => setTimeout(r, 5000));
        
        const retryLinks = Array.from(document.querySelectorAll('a')).filter(link => {
          const hiddenSpan = link.querySelector('span.visually-hidden');
          return hiddenSpan && hiddenSpan.innerText.trim() === 'Next';
        });
        nextLink = retryLinks[0];
        const stillDisabled = nextLink?.classList.contains('disabled') || 
                            window.getComputedStyle(nextLink).pointerEvents === 'none';

        if (!nextLink || stillDisabled) {
          console.log("Button still not ready. Waiting again...");
          await new Promise(r => setTimeout(r, 5000));
          
          const finalRetryLinks = Array.from(document.querySelectorAll('a')).filter(link => {
            const hiddenSpan = link.querySelector('span.visually-hidden');
            return hiddenSpan && hiddenSpan.innerText.trim() === 'Next';
          });
          nextLink = finalRetryLinks[0];
          const finalDisabled = nextLink?.classList.contains('disabled') || 
                              window.getComputedStyle(nextLink).pointerEvents === 'none';

          if (!nextLink || finalDisabled) {
            console.log("Still no button. Exporting current data and stopping.");
            break;
          }
        }
      }

      // Click next link
      nextLink.click();

      // Throttle to avoid rate limiting (same as transaction export)
      if (pageCounter % 10 === 0) {
        console.log(`Short break after page ${pageCounter}...`);
        await new Promise(r => setTimeout(r, 5000));
      } else {
        await new Promise(r => setTimeout(r, 350));
      }

      // Check if page actually changed
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
      // Remove duplicates based on unique key
      const uniqueData = [];
      const seen = new Set();
      
      allData.forEach(item => {
        const key = `${item.date}_${item.time}_${item.userId}_${item.rewardGMT}`;
        if (!seen.has(key)) {
          seen.add(key);
          uniqueData.push(item);
        }
      });

      console.log(`Exporting ${uniqueData.length} transactions...`);
      if (allData.length !== uniqueData.length) {
        console.log(`(Removed ${allData.length - uniqueData.length} duplicates)`);
      }
      
      exportToCSV(uniqueData);
    } else {
      console.log("No data collected to export.");
    }
  }

  await goMiningReferralAutoExport();
})();