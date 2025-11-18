  // Global Data Storage
        let minerData = {};
        let errorList = []; // Stores import conflicts and errors
        let dateBlockOrder = {}; // z.B. { '10/17/2025': 3, '10/16/2025': 2 }
        let settings = {
            currency: 'USD',
            dateFormat: 'US',
            viewMode: 'table',
            exchangeRates: {
                USD: 0.45,
                EUR: 0.38
            }
        };

        // ===========================
        // ERROR PANEL FUNCTIONS
        // ===========================
        function addError(type, minerInfo, details) {
            const error = {
                id: Date.now() + Math.random(),
                type: type, // 'conflict', 'mismatch', 'warning'
                timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
                minerInfo: minerInfo,
                details: details
            };
            errorList.push(error);
            updateErrorPanel();
        }

        function clearErrors() {
            errorList = [];
            updateErrorPanel();
        }

        function removeError(errorId) {
            errorList = errorList.filter(e => e.id !== errorId);
            updateErrorPanel();
        }

        function updateErrorPanel() {
            const panel = document.getElementById('errorPanel');
            const list = document.getElementById('errorList');

            if (errorList.length === 0) {
                panel.style.display = 'none';
                return;
            }

            panel.style.display = 'block';
            list.innerHTML = '';

            errorList.forEach(error => {
                const errorDiv = document.createElement('div');
                errorDiv.style.cssText = 'background: rgba(0, 0, 0, 0.3); padding: 15px; border-radius: 8px; border-left: 4px solid #ff4d4d;';
                
                let icon = '⚠️';
                let title = 'Warning';
                if (error.type === 'conflict') {
                    icon = '⛔';
                    title = 'Data Conflict';
                } else if (error.type === 'mismatch') {
                    icon = '🔍';
                    title = 'Value Mismatch';
                }

                errorDiv.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: start; gap: 10px;">
                        <div style="flex: 1;">
                            <div style="font-weight: 600; color: #ff4d4d; margin-bottom: 8px; display: flex; align-items: center; gap: 8px;">
                                <span>${icon}</span>
                                <span>${title}</span>
                                <span style="font-size: 0.85em; color: #aaa;">${error.timestamp}</span>
                            </div>
                            <div style="color: #fff; margin-bottom: 5px;">
                                <strong>Miner:</strong> ${error.minerInfo.name || error.minerInfo.id}
                            </div>
                            <div style="color: #ddd; font-size: 0.95em;">
                                ${error.details}
                            </div>
                        </div>
                        <button onclick="removeError(${error.id})" style="background: rgba(255, 77, 77, 0.2); border: 1px solid #ff4d4d; padding: 6px 10px; border-radius: 6px; color: #ff4d4d; cursor: pointer;">
                            <span class="material-icons" style="font-size: 18px;">close</span>
                        </button>
                    </div>
                `;
                list.appendChild(errorDiv);
            });
        }

        // Initialize from localStorage
        function initializeData() {
            const saved = localStorage.getItem('goMiningMinerHistory');
            if (saved) {
                minerData = JSON.parse(saved);
                updateDisplay();
            }
        }

        // Save to localStorage
        function saveData() {
            localStorage.setItem('goMiningMinerHistory', JSON.stringify(minerData));
            showAutoSaveIndicator();
        }

        // Show auto-save indicator
        function showAutoSaveIndicator() {
            const indicator = document.getElementById('autoSaveIndicator');
            if (indicator) {
                indicator.style.opacity = '1';
                setTimeout(() => {
                    indicator.style.opacity = '0';
                }, 2000);
            }
        }

        // Backup Data
        function backupData() {
            if (Object.keys(minerData).length === 0) {
                alert('❌ No data to backup!');
                return;
            }

            const backup = {
                version: '1.0',
                exportDate: new Date().toISOString(),
                minerCount: Object.keys(minerData).length,
                data: minerData,
                settings: settings
            };

            const json = JSON.stringify(backup, null, 2);
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const now = new Date();
            const dateStr = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
            const timeStr = `${now.getHours().toString().padStart(2, '0')}-${now.getMinutes().toString().padStart(2, '0')}`;
            const filename = `GoMining_Backup_${dateStr}_${timeStr}.json`;
            
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            showResult('purchaseResult', 'success', `✅ Backup created: ${filename}`);
        }

        // Restore Data
        function restoreData(event) {
            const file = event.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const backup = JSON.parse(e.target.result);
                    
                    if (!backup.data || !backup.version) {
                        throw new Error('Invalid backup file format');
                    }

                    if (Object.keys(minerData).length > 0) {
                        if (!confirm('You have existing data. Restore will replace it. Continue?')) {
                            return;
                        }
                    }

                    minerData = backup.data;
                    if (backup.settings) {
                        settings = backup.settings;
                    }

                    saveData();
                    updateDisplay();

                    showResult('purchaseResult', 'success', `✅ Backup restored! ${Object.keys(minerData).length} miner(s) imported.`);

                } catch (error) {
                    console.error('Restore error:', error);
                    alert('❌ Error restoring backup. Invalid file format.');
                }
            };
            reader.readAsText(file);

            // Reset file input
            event.target.value = '';
        }

        // Settings Toggle Functions
        document.getElementById('currencyUSD').addEventListener('click', () => toggleSetting('currency', 'USD', ['currencyUSD', 'currencyEUR']));
        document.getElementById('currencyEUR').addEventListener('click', () => toggleSetting('currency', 'EUR', ['currencyUSD', 'currencyEUR']));
        document.getElementById('dateUS').addEventListener('click', () => toggleSetting('dateFormat', 'US', ['dateUS', 'dateEU']));
        document.getElementById('dateEU').addEventListener('click', () => toggleSetting('dateFormat', 'EU', ['dateUS', 'dateEU']));
        document.getElementById('viewTable').addEventListener('click', () => toggleSetting('viewMode', 'table', ['viewTable', 'viewAccordion', 'viewCards']));
        document.getElementById('viewAccordion').addEventListener('click', () => toggleSetting('viewMode', 'accordion', ['viewTable', 'viewAccordion', 'viewCards']));
        document.getElementById('viewCards').addEventListener('click', () => toggleSetting('viewMode', 'cards', ['viewTable', 'viewAccordion', 'viewCards']));

        function toggleSetting(setting, value, buttonIds) {
            settings[setting] = value;
            buttonIds.forEach(id => document.getElementById(id).classList.remove('active'));
            event.target.classList.add('active');
            if (Object.keys(minerData).length > 0) {
                updateDisplay();
            }
        }

        // Clear Field Function
        function clearField(fieldId) {
            document.getElementById(fieldId).value = '';
        }

        // Show Result Message
        function showResult(elementId, type, message) {
            const element = document.getElementById(elementId);
            element.className = `result-message ${type}`;
            element.textContent = message;
            element.style.display = 'block';
            setTimeout(() => {
                element.style.display = 'none';
            }, 5000);
        }

        // ===========================
        // STEP 1: Transfer Import (Current Farm State)
        // ===========================
        function parseTransferImport() {
            const input = document.getElementById('transferInput').value.trim();
            if (!input) {
                showResult('transferResult', 'error', '❌ Please paste current farm data');
                return;
            }

            try {
                const lines = input.split('\n').map(l => l.trim()).filter(l => l);
                let i = 0;
                let importedCount = 0;
                let updatedCount = 0;
                let errors = 0;

                while (i < lines.length) {
                    // Look for "miner" keyword (case-insensitive)
                    if (lines[i].toLowerCase() === 'miner') {
                        try {
                            i++; // Move to next line after "miner"

                            // Parse TH (e.g., "16 TH")
                            if (i >= lines.length || !lines[i].match(/[\d.]+\s*TH/i)) {
                                errors++;
                                i++;
                                continue;
                            }
                            const th = parseFloat(lines[i].match(/([\d.]+)/)[1]);
                            i++;

                            // Parse W/TH (e.g., "20 W/TH")
                            if (i >= lines.length || !lines[i].match(/[\d.]+\s*W\/TH/i)) {
                                errors++;
                                i++;
                                continue;
                            }
                            const wth = parseFloat(lines[i].match(/([\d.]+)/)[1]);
                            i++;

                            // Skip "0 days" if present (bonus miners)
                            if (i < lines.length && lines[i].match(/^\d+\s+days?$/i)) {
                                i++;
                            }

                            // Parse ID (e.g., "#303737") - search within next 5 lines
                            let minerId = null;
                            let idLineIndex = i;
                            for (let j = 0; j < 5 && (i + j) < lines.length; j++) {
                                const idMatch = lines[i + j].match(/#(\d+)/);
                                if (idMatch) {
                                    minerId = idMatch[1];
                                    idLineIndex = i + j;
                                    break;
                                }
                            }

                            if (!minerId) {
                                errors++;
                                i++;
                                continue;
                            }
                            i = idLineIndex + 1;

                            // Parse Collection (next line after ID, ends with " •" or just text)
                            let collection = 'Unknown';
                            if (i < lines.length) {
                                collection = lines[i].replace(/\s*•\s*$/, '').trim();
                                i++;
                            }

                            // Parse Chain (BSC/SOL/TON) - optional
                            let chain = 'BSC'; // default
                            if (i < lines.length && /^(BSC|SOL|TON|ETH|POLYGON|BTC)$/i.test(lines[i])) {
                                chain = lines[i].toUpperCase();
                                i++;
                            }

                            // Build miner name
                            const minerName = `${collection} ${minerId}`;

                            // Check if miner already exists
                            if (minerData[minerId]) {
                                // Update existing miner
                                minerData[minerId].currentTH = th;
                                minerData[minerId].currentWTH = wth;
                                minerData[minerId].collection = collection;
                                minerData[minerId].chain = chain;
                                minerData[minerId].status = 'TRANSFERRED';
                                updatedCount++;
                            } else {
                                // Create new miner
                                minerData[minerId] = {
                                    id: minerId,
                                    name: minerName,
                                    fullName: minerName,
                                    purchase: {
                                        date: 'Transfer Import',
                                        time: new Date().toLocaleTimeString('en-US', { hour12: false }),
                                        price: 0,
                                        th: th,
                                        wth: wth,
                                        status: 'TRANSFERRED'
                                    },
                                    currentTH: th,
                                    currentWTH: wth,
                                    upgrades: {
                                        th: [],
                                        efficiency: []
                                    },
                                    sale: null,
                                    collection: collection,
                                    chain: chain,
                                    status: 'TRANSFERRED',
                                    source: 'Transfer Import'
                                };
                                importedCount++;
                            }

                        } catch (e) {
                            console.error('Parse error for miner block:', e);
                            errors++;
                            i++;
                        }
                    } else {
                        i++;
                    }
                }

                // Save to localStorage
                saveData();

                // Clear input field
                document.getElementById('transferInput').value = '';

                // Show result
                let message = `✅ Transfer Import: ${importedCount} new miner(s)`;
                if (updatedCount > 0) message += `, ${updatedCount} updated`;
                if (errors > 0) message += `, ${errors} error(s)`;
                
                showResult('transferResult', 'success', message);

                // Update display
                updateDisplay();

            } catch (error) {
                console.error('Transfer import error:', error);
                showResult('transferResult', 'error', '❌ Error parsing transfer data. Check console for details.');
            }
        }

        // Parse Purchase History
        function parsePurchaseHistory() {
            const spinner = document.getElementById('purchaseSpinner');
            spinner.style.display = 'inline-block';
            
            try {
                const input = document.getElementById('purchaseInput').value.trim();
                
                if (!input) {
                    showResult('purchaseResult', 'error', '❌ Please paste some data first!');
                    spinner.style.display = 'none';
                    return;
                }

                const lines = input.split('\n').map(line => line.trim()).filter(line => line);
                let newMiners = 0;
                let duplicates = 0;
                let errors = 0;

                let i = 0;
                while (i < lines.length) {
                    // Look for "Miner" line
                    if (lines[i] === 'Miner' && i + 1 < lines.length) {
                        try {
                            const minerLine = lines[i + 1];
                            const minerMatch = minerLine.match(/^(.+?)\s+#(\d+)$/);
                            
                            if (!minerMatch) {
                                i++;
                                continue;
                            }

                            const minerName = minerMatch[1].trim();
                            const minerId = minerMatch[2];
                            const fullName = `${minerName} #${minerId}`;

                            // Extract TH and W/TH (these are CURRENT values from GoMining)
                            let currentTH = null;
                            let currentWTH = null;
                            let price = null;
                            let status = null;
                            let date = null;
                            let time = null;
                            let = blockOrder = 0;

                            // Look ahead for TH/W/TH/Price/Status
                            for (let j = i + 2; j < Math.min(i + 10, lines.length); j++) {
                                const line = lines[j];
                                
                                // TH detection
                                if (line.includes('TH') && !line.includes('W/TH')) {
                                    const thMatch = line.match(/([\d.,]+)\s*TH/);
                                    if (thMatch && currentTH === null) {
                                        currentTH = parseFloat(thMatch[1].replace(',', ''));
                                    }
                                }
                                
                                // W/TH detection
                                if (line.includes('W/TH')) {
                                    const wthMatch = line.match(/([\d.,]+)\s*W\/TH/);
                                    if (wthMatch && currentWTH === null) {
                                        currentWTH = parseFloat(wthMatch[1].replace(',', ''));
                                    }
                                }
                                
                                // Price detection (number with comma/dot, possibly with comma as thousands separator)
                                if (!price && /^[\d,]+\.?\d*$/.test(line) && !line.includes('TH')) {
                                    price = parseFloat(line.replace(/,/g, ''));
                                }
                                

                                // Status detection
                                if (line === 'Success' || line === 'Pending' || line === 'Failed') {
                                    status = line;
                                    break;
                                }
                            }

                            // Look backwards for date/time
                            for (let j = i - 1; j >= Math.max(0, i - 5); j--) {
                                const line = lines[j];
                                
                                // Time detection (HH:MM:SS)
                                if (/^\d{1,2}:\d{2}:\d{2}$/.test(line) && !time) {
                                    time = line;
                                }
                                
                                // Date detection (MM/DD/YYYY or DD.MM.YYYY)
                                if (/^\d{1,2}[\/\.]\d{1,2}[\/\.]\d{4}$/.test(line) && !date) {
                                    date = line;
                                }
                                // Reihenfolge pro Datum zählen
                                if (!dateBlockOrder[date]) {
                                    dateBlockOrder[date] = 1;
                                } else {
                                    dateBlockOrder[date]++;
                                }
                                blockOrder = dateBlockOrder[date];
                            }

                            // Check if miner already exists (from Transfer Import)
                            if (minerData[minerId]) {
                                // Miner exists (probably from Transfer Import)
                                const existing = minerData[minerId];
                                
                                // Compare TH/W/TH values (Transfer vs Purchase)
                                const thMatch = Math.abs((existing.currentTH || 0) - (currentTH || 0)) < 0.01;
                                const wthMatch = Math.abs((existing.currentWTH || 0) - (currentWTH || 0)) < 0.01;
                                
                                // If values don't match → add error to Error Panel
                                if (!thMatch || !wthMatch) {
                                    addError('mismatch', 
                                        { id: minerId, name: fullName },
                                        `Transfer Import: ${existing.currentTH} TH / ${existing.currentWTH} W/TH vs Purchase History: ${currentTH} TH / ${currentWTH} W/TH - Using Purchase values`
                                    );
                                }
                                
                                // MERGE: Overwrite with Purchase History data (it has more info)
                                existing.name = minerName;
                                existing.fullName = fullName;
                                existing.purchase = {
                                    date: date || 'Unknown',
                                    time: time || 'Unknown',
                                    price: price || 0,
                                    th: currentTH || 0,  // TEMP: Will be corrected after upgrade parsing
                                    wth: currentWTH || 0,  // TEMP: Will be corrected after upgrade parsing
                                    status: status || 'Unknown',
                                    blockOrder: blockOrder
                                };
                                existing.currentTH = currentTH || 0;
                                existing.currentWTH = currentWTH || 0;
                                existing.needsUpgradeAnalysis = true;
                                
                                duplicates++; // Count as duplicate (but merged)
                            } else {
                                // Create new miner entry
                                // NOTE: purchase.th and purchase.wth are TEMPORARY and will be corrected later
                                // after parsing upgrades to find the REAL purchase values
                                minerData[minerId] = {
                                    id: minerId,
                                    name: minerName,
                                    fullName: fullName,
                                    purchase: {
                                        date: date || 'Unknown',
                                        time: time || 'Unknown',
                                        price: price || 0,
                                        th: currentTH || 0,  // TEMP: Will be corrected after upgrade parsing
                                        wth: currentWTH || 0,  // TEMP: Will be corrected after upgrade parsing
                                        status: status || 'Unknown',
                                        blockOrder: blockOrder
                                    },
                                    upgrades: {
                                        th: [],
                                        efficiency: []
                                    },
                                    sale: null,
                                    currentTH: currentTH || 0,  // This IS correct (current state)
                                    currentWTH: currentWTH || 0,  // This IS correct (current state)
                                    needsUpgradeAnalysis: true  // Flag to recalculate purchase values
                                };
                                newMiners++;
                            }

                        } catch (e) {
                            console.error('Error parsing miner:', e);
                            errors++;
                        }
                    }
                    i++;
                }

                // Save to localStorage
                saveData();

                // Clear input field
                document.getElementById('purchaseInput').value = '';

                // Show result
                let message = `✅ Success! Found ${newMiners} new miner(s)`;
                if (duplicates > 0) message += `, ${duplicates} duplicate(s) ignored`;
                if (errors > 0) message += `, ${errors} error(s)`;
                
                showResult('purchaseResult', 'success', message);

                // Update display
                updateDisplay();

            } catch (error) {
                console.error('Purchase parsing error:', error);
                showResult('purchaseResult', 'error', '❌ Error parsing data. Check console for details.');
            } finally {
                spinner.style.display = 'none';
            }
        }

        // Parse Upgrade History
        function parseUpgradeHistory() {
            const spinner = document.getElementById('upgradeSpinner');
            spinner.style.display = 'inline-block';
            
            try {
                const input = document.getElementById('upgradeInput').value.trim();
                
                if (!input) {
                    showResult('upgradeResult', 'error', '❌ Please paste some data first!');
                    spinner.style.display = 'none';
                    return;
                }

                const lines = input.split('\n').map(line => line.trim()).filter(line => line);
                let thUpgrades = 0;
                let efficiencyUpgrades = 0;
                let notFound = 0;
                let duplicates = 0;
                let errors = 0;
                let canceled = 0;
                let blockOrder = 0;

                let i = 0;
                while (i < lines.length) {
                    // Detect new block by date line
                   // if (/^\d{1,2}[\/\.]\d{1,2}[\/\.]\d{4}$/.test(lines[i])) {
                     //   blockOrder++;
                   // }
                    // Look for "Miner" line
                    if (lines[i] === 'Miner' && i + 1 < lines.length) {
                        try {
                            const minerLine = lines[i + 1];
                            const minerMatch = minerLine.match(/^(.+?)\s+#(\d+)$/);
                            if (!minerMatch) { i++; continue; }
                            const minerId = minerMatch[2];
                            if (!minerData[minerId]) { notFound++; i++; continue; }

                            // Try to parse upgrades in both formats:
                            // 1. [ALT] TH/WTH, [NEU] TH/WTH, [PREIS], [Status]
                            // 2. (alt) HashRate/Efficiency Upgrade, arrow, etc.
                            let j = i + 2;
                            while (j < lines.length) {
                                // Check for end of block (next Miner or end)
                                if (lines[j] === 'Miner') break;

                                // Try new format: [ALT] TH/WTH, [NEU] TH/WTH, [PREIS], [Status]
                                const altLine = lines[j];
                                const neuLine = lines[j+1];
                                const preisLine = lines[j+2];
                                const statusLine = lines[j+3];
                                let upgradeType = null;
                                let fromValue = null;
                                let toValue = null;
                                let price = null;
                                let status = null;
                                let date = null;
                                let time = null;
                                let blockorder = 0;

                                // Check for TH/WTH pattern
                                const altTH = altLine && altLine.match(/([\d.,]+)\s*TH$/);
                                const neuTH = neuLine && neuLine.match(/([\d.,]+)\s*TH$/);
                                const altWTH = altLine && altLine.match(/([\d.,]+)\s*W\/TH$/);
                                const neuWTH = neuLine && neuLine.match(/([\d.,]+)\s*W\/TH$/);

                                if (altTH && neuTH && preisLine && statusLine) {
                                    upgradeType = 'th';
                                    fromValue = parseFloat(altTH[1].replace(',', ''));
                                    toValue = parseFloat(neuTH[1].replace(',', ''));
                                    price = parseFloat(preisLine.replace(/,/g, ''));
                                    status = statusLine;
                                } else if (altWTH && neuWTH && preisLine && statusLine) {
                                    upgradeType = 'efficiency';
                                    fromValue = parseFloat(altWTH[1].replace(',', ''));
                                    toValue = parseFloat(neuWTH[1].replace(',', ''));
                                    price = parseFloat(preisLine.replace(/,/g, ''));
                                    status = statusLine;
                                }

                                // Look backwards for date/time
                                for (let k = i - 1; k >= Math.max(0, i - 5); k--) {
                                    const line = lines[k];
                                    if (/^\d{1,2}:\d{2}:\d{2}$/.test(line) && !time) time = line;
                                    if (/^\d{1,2}[\/\.]\d{1,2}[\/\.]\d{4}$/.test(line) && !date) date = line;
                                }
                                if (!dateBlockOrder[date]) {
                                    dateBlockOrder[date] = 1;
                                } else {
                                    dateBlockOrder[date]++;
                                }
                                blockOrder = dateBlockOrder[date];
                                // Only process Success
                                if (status === 'Canceled') { canceled++; j += 4; continue; }
                                if (status === 'Success' && upgradeType && fromValue !== null && toValue !== null) {
                                    const upgradeObj = {
                                        date: date || 'Unknown',
                                        time: time || 'Unknown',
                                        from: fromValue,
                                        to: toValue,
                                        price: price || 0,
                                        status: status,
                                        blockOrder: blockOrder
                                    };
                                    if (upgradeType === 'th') {
                                        const isDuplicate = minerData[minerId].upgrades.th.some(u => 
                                            u.date === upgradeObj.date && u.time === upgradeObj.time &&
                                            u.from === upgradeObj.from && u.to === upgradeObj.to && u.price === upgradeObj.price
                                        );
                                        if (!isDuplicate) { minerData[minerId].upgrades.th.push(upgradeObj); thUpgrades++; } else { duplicates++; }
                                        ;
                                    } else if (upgradeType === 'efficiency') {
                                        const isDuplicate = minerData[minerId].upgrades.efficiency.some(u => 
                                            u.date === upgradeObj.date && u.time === upgradeObj.time &&
                                            u.from === upgradeObj.from && u.to === upgradeObj.to && u.price === upgradeObj.price
                                        );
                                        if (!isDuplicate) { minerData[minerId].upgrades.efficiency.push(upgradeObj); efficiencyUpgrades++; } else { duplicates++; }
                                        ;
                                    }
                                    j += 4; continue;
                                }

                                // Fallback: ALT-Format (HashRate/Efficiency Upgrade, →, etc.)
                                // ...existing code for old format (kann nach Bedarf ergänzt werden)...
                                j++;
                            }
                        } catch (e) {
                            console.error('Error parsing upgrade:', e);
                            errors++;
                        }
                    }
                    i++;
                }

                // 🔥 CRITICAL: FINALIZE PURCHASE VALUES after all upgrades are parsed
                finalizePurchaseValues();

                // Save to localStorage
                saveData();

                // Clear input field
                document.getElementById('upgradeInput').value = '';

                // Show result
                let message = `✅ Success! Added ${thUpgrades} TH upgrade(s) and ${efficiencyUpgrades} efficiency upgrade(s)`;
                if (duplicates > 0) message += `, ${duplicates} duplicate(s) ignored`;
                if (canceled > 0) message += `, ${canceled} canceled ignored`;
                if (notFound > 0) message += `, ${notFound} miner(s) not found`;
                if (errors > 0) message += `, ${errors} error(s)`;
                
                showResult('upgradeResult', 'success', message);

                // Update display
                if (Object.keys(minerData).length > 0) {
                    updateDisplay();
                }

            } catch (error) {
                console.error('Upgrade parsing error:', error);
                showResult('upgradeResult', 'error', '❌ Error parsing data. Check console for details.');
            } finally {
                spinner.style.display = 'none';
            }
        }

        // 🔥 NEW: Finalize purchase values based on upgrade history
        function finalizePurchaseValues() {
            console.log('\n🔥🔥🔥 STARTING FINALIZATION 🔥🔥🔥\n');
            
            Object.keys(minerData).forEach(minerId => {
                const miner = minerData[minerId];
                
                console.log(`\n📦 Processing Miner #${minerId} (${miner.name})`);
                console.log(`   needsUpgradeAnalysis: ${miner.needsUpgradeAnalysis}`);
                console.log(`   TH upgrades count: ${miner.upgrades.th.length}`);
                console.log(`   Efficiency upgrades count: ${miner.upgrades.efficiency.length}`);
                
                // Only process miners that need analysis
                if (!miner.needsUpgradeAnalysis) {
                    console.log(`   ⏭️ Skipping (no analysis needed)`);
                    return;
                }

                // Sort upgrades chronologically (oldest first)
                const sortUpgrades = (upgrades) => {
                    return upgrades.sort((a, b) => {
                        // Parse dates (handle both MM/DD/YYYY and DD.MM.YYYY)
                        const parseDate = (dateStr) => {
                            if (!dateStr || dateStr === 'Unknown') return new Date(0);
                            const parts = dateStr.split(/[\/\.]/);
                            return new Date(parts[2], parts[0] - 1, parts[1]);
                        };
                        const dateA = parseDate(a.date);
                        const dateB = parseDate(b.date);
                        if (dateA.getTime() !== dateB.getTime()) {
                            return dateA - dateB;
                        }
                        // If same date, compare times
                        if (a.time !== 'Unknown' && b.time !== 'Unknown') {
                            const tComp = a.time.localeCompare(b.time);
                            if (tComp !== 0) return tComp;
                        }
                        // Fallback: blockOrder
                        return (b.blockOrder ?? 0) - (a.blockOrder ?? 0);
                    });
                };

                // Sort both upgrade arrays
                if (miner.upgrades.th.length > 0) {
                    console.log(`\n   🔧 Sorting ${miner.upgrades.th.length} TH upgrades...`);
                    console.log(`   BEFORE SORT:`, miner.upgrades.th.map(u => `${u.date} ${u.time}: ${u.from}→${u.to}`));
                    
                    miner.upgrades.th = sortUpgrades(miner.upgrades.th);
                    
                    console.log(`   AFTER SORT:`, miner.upgrades.th.map(u => `${u.date} ${u.time}: ${u.from}→${u.to}`));
                    
                    // OLDEST upgrade "from" = actual purchase TH
                    const oldPurchaseTH = miner.purchase.th;
                    miner.purchase.th = miner.upgrades.th[0].from;
                    console.log(`   📝 Purchase TH: ${oldPurchaseTH} → ${miner.purchase.th}`);
                    
                    // NEWEST upgrade "to" = current TH
                    const oldCurrentTH = miner.currentTH;
                    miner.currentTH = miner.upgrades.th[miner.upgrades.th.length - 1].to;
                    console.log(`   📝 Current TH: ${oldCurrentTH} → ${miner.currentTH}`);
                }

                if (miner.upgrades.efficiency.length > 0) {
                    console.log(`\n   🔧 Sorting ${miner.upgrades.efficiency.length} Efficiency upgrades...`);
                    console.log(`   BEFORE SORT:`, miner.upgrades.efficiency.map(u => `${u.date} ${u.time}: ${u.from}→${u.to}`));
                    
                    miner.upgrades.efficiency = sortUpgrades(miner.upgrades.efficiency);
                    
                    console.log(`   AFTER SORT:`, miner.upgrades.efficiency.map(u => `${u.date} ${u.time}: ${u.from}→${u.to}`));
                    
                    // OLDEST upgrade "from" = actual purchase W/TH
                    const oldPurchaseWTH = miner.purchase.wth;
                    miner.purchase.wth = miner.upgrades.efficiency[0].from;
                    console.log(`   📝 Purchase W/TH: ${oldPurchaseWTH} → ${miner.purchase.wth}`);
                    
                    // NEWEST upgrade "to" = current W/TH
                    const oldCurrentWTH = miner.currentWTH;
                    miner.currentWTH = miner.upgrades.efficiency[miner.upgrades.efficiency.length - 1].to;
                    console.log(`   📝 Current W/TH: ${oldCurrentWTH} → ${miner.currentWTH}`);
                }

                // Remove the flag
                delete miner.needsUpgradeAnalysis;
                console.log(`   ✅ Finalization complete for #${minerId}\n`);
            });
            
            console.log('\n🎉🎉🎉 FINALIZATION COMPLETE 🎉🎉🎉\n');
        }

        // Parse Sell History
        function parseSellHistory() {
            const spinner = document.getElementById('sellSpinner');
            spinner.style.display = 'inline-block';
            
            try {
                const input = document.getElementById('sellInput').value.trim();
                
                if (!input) {
                    showResult('sellResult', 'error', '❌ Please paste some data first!');
                    spinner.style.display = 'none';
                    return;
                }

                const lines = input.split('\n').map(line => line.trim()).filter(line => line);
                let salesAdded = 0;
                let notFound = 0;
                let duplicates = 0;
                let errors = 0;
                let blockOrder = 0;

                let i = 0;
                while (i < lines.length) {
                    // Look for "Miner" line
                    if (lines[i] === 'Miner' && i + 1 < lines.length) {
                        try {
                            const minerLine = lines[i + 1];
                            const minerMatch = minerLine.match(/^(.+?)\s+#(\d+)$/);
                            
                            if (!minerMatch) {
                                i++;
                                continue;
                            }

                            const minerId = minerMatch[2];

                            // Check if miner exists
                            if (!minerData[minerId]) {
                                notFound++;
                                i++;
                                continue;
                            }

                            // Check if sale already exists
                            if (minerData[minerId].sale) {
                                duplicates++;
                                i++;
                                continue;
                            }

                            // Extract sale data
                            let buyerPrice = null;
                            let yourPrice = null;
                            let date = null;
                            let th = null;
                            let wth = null;

                            // Look ahead for prices and TH/W/TH
                            let priceCount = 0;
                            for (let j = i + 2; j < Math.min(i + 12, lines.length); j++) {
                                const line = lines[j];
                                
                                // TH detection (for verification)
                                if (line.includes('TH') && !line.includes('W/TH')) {
                                    const thMatch = line.match(/([\d.,]+)\s*TH/);
                                    if (thMatch && th === null) {
                                        th = parseFloat(thMatch[1].replace(',', ''));
                                    }
                                }
                                
                                // W/TH detection (for verification)
                                if (line.includes('W/TH')) {
                                    const wthMatch = line.match(/([\d.,]+)\s*W\/TH/);
                                    if (wthMatch && wth === null) {
                                        wth = parseFloat(wthMatch[1].replace(',', ''));
                                    }
                                }
                                
                                // Price detection - we need TWO prices (buyer price, then your price)
                                if (/^[\d,]+\.?\d*$/.test(line) && !line.includes('TH') && !line.includes('W/TH')) {
                                    const price = parseFloat(line.replace(',', ''));
                                    if (priceCount === 0) {
                                        buyerPrice = price;
                                        priceCount++;
                                    } else if (priceCount === 1) {
                                        yourPrice = price;
                                        priceCount++;
                                    }
                                }
                                
                                // Stop at Sold
                                if (line === 'Sold' || line === 'Pending' || line === 'Cancelled') {
                                    break;
                                }
                            }

                            // Look backwards for date
                            for (let j = i - 1; j >= Math.max(0, i - 5); j--) {
                                const line = lines[j];
                                
                                // Date detection (MM/DD/YYYY or DD.MM.YYYY)
                                if (/^\d{1,2}[\/\.]\d{1,2}[\/\.]\d{4}$/.test(line) && !date) {
                                    date = line;
                                    break;
                                }
                            }
                            // Reihenfolge pro Datum zählen
                            if (!dateBlockOrder[date]) {
                                dateBlockOrder[date] = 1;
                            } else {
                                dateBlockOrder[date]++;
                            }
                            blockOrder = dateBlockOrder[date];
                            // Validate sale data
                            if (buyerPrice && yourPrice) {
                                minerData[minerId].sale = {
                                    date: date || 'Unknown',
                                    buyerPrice: buyerPrice,
                                    yourPrice: yourPrice,
                                    th: th || minerData[minerId].currentTH,
                                    wth: wth || minerData[minerId].currentWTH,
                                    blockOrder: blockOrder // <--- Optional auch hier
                                };
                                salesAdded++;
                            }

                        } catch (e) {
                            console.error('Error parsing sale:', e);
                            errors++;
                        }
                    }
                    i++;
                }

                // Save to localStorage
                saveData();

                // Clear input field
                document.getElementById('sellInput').value = '';

                // Show result
                let message = `✅ Success! Added ${salesAdded} sale(s)`;
                if (duplicates > 0) message += `, ${duplicates} duplicate(s) ignored`;
                if (notFound > 0) message += `, ${notFound} miner(s) not found`;
                if (errors > 0) message += `, ${errors} error(s)`;
                
                showResult('sellResult', 'success', message);

                // Update display
                if (Object.keys(minerData).length > 0) {
                    updateDisplay();
                }

            } catch (error) {
                console.error('Sell parsing error:', error);
                showResult('sellResult', 'error', '❌ Error parsing data. Check console for details.');
            } finally {
                spinner.style.display = 'none';
            }
        }

        // Update Display
        function updateDisplay() {
            const minerCount = Object.keys(minerData).length;
            
            if (minerCount === 0) {
                document.getElementById('displaySection').style.display = 'none';
                return;
            }

            document.getElementById('displaySection').style.display = 'block';

            // Update Stats
            updateStats();

            // Render based on view mode
            const container = document.getElementById('minerDisplay');
            
            switch (settings.viewMode) {
                case 'table':
                    renderTableView(container);
                    break;
                case 'accordion':
                    renderAccordionView(container);
                    break;
                case 'cards':
                    renderCardsView(container);
                    break;
            }
        }

        // Update Statistics mit tagesgenauen Preisen
        function updateStats() {
            const miners = Object.values(minerData);
            const total = miners.length;
            const sold = miners.filter(m => m.sale).length;
            const active = total - sold;
            
            let totalInvestment = 0;
            let totalTH = 0;
            let salesRevenue = 0;
            
            const fiat = settings.currency;
            
            miners.forEach(m => {
                // Calculate investment mit tagesgenauen Preisen
                const purchasePrice = getPriceForDate(m.purchase.date, 'GMT', fiat) || settings.exchangeRates[settings.currency];
                const minerInvestment = (m.purchase.price || 0) * purchasePrice;
                
                m.upgrades.th.forEach(u => {
                    const upgradePrice = getPriceForDate(u.date, 'GMT', fiat) || settings.exchangeRates[settings.currency];
                    totalInvestment += (u.price || 0) * upgradePrice;
                });
                m.upgrades.efficiency.forEach(u => {
                    const upgradePrice = getPriceForDate(u.date, 'GMT', fiat) || settings.exchangeRates[settings.currency];
                    totalInvestment += (u.price || 0) * upgradePrice;
                });
                totalInvestment += minerInvestment;
                
                // Calculate total TH (active miners only)
                if (!m.sale) {
                    totalTH += m.currentTH;
                }
                
                // Calculate sales revenue mit tagesgenauen Preisen
                if (m.sale) {
                    const salePrice = getPriceForDate(m.sale.date, 'GMT', fiat) || settings.exchangeRates[settings.currency];
                    salesRevenue += (m.sale.yourPrice || 0) * salePrice;
                }
            });

            // Calculate profit/loss
            const profitLoss = salesRevenue - totalInvestment;
            const profitLossColor = profitLoss >= 0 ? '#00ff7f' : '#ff4d4d';
            const profitLossSign = profitLoss >= 0 ? '+' : '';

            document.getElementById('statTotal').textContent = total;
            document.getElementById('statActive').textContent = active;
            document.getElementById('statSold').textContent = sold;
            
            const currency = settings.currency === 'USD' ? '$' : '€';
            
            // Investment
            document.getElementById('statInvestment').textContent = `${currency}${totalInvestment.toFixed(2)}`;
            
            // Total TH
            document.getElementById('statTotalTH').textContent = `${totalTH.toFixed(2)} TH`;
            
            // Revenue
            document.getElementById('statRevenue').textContent = `${currency}${salesRevenue.toFixed(2)}`;
            
            // Profit/Loss
            const profitElement = document.getElementById('statProfit');
            profitElement.textContent = `${profitLossSign}${currency}${Math.abs(profitLoss).toFixed(2)}`;
            profitElement.style.color = profitLossColor;
        }

        // Format Date
        function formatDate(dateStr) {
            if (!dateStr || dateStr === 'Unknown') return dateStr;
            
            // Parse date
            let parts;
            if (dateStr.includes('/')) {
                parts = dateStr.split('/');
            } else if (dateStr.includes('.')) {
                parts = dateStr.split('.');
            } else {
                return dateStr;
            }

            if (settings.dateFormat === 'US') {
                // MM/DD/YYYY
                return `${parts[0].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[2]}`;
            } else {
                // DD.MM.YYYY
                if (dateStr.includes('/')) {
                    // Convert from MM/DD/YYYY to DD.MM.YYYY
                    return `${parts[1].padStart(2, '0')}.${parts[0].padStart(2, '0')}.${parts[2]}`;
                } else {
                    return `${parts[0].padStart(2, '0')}.${parts[1].padStart(2, '0')}.${parts[2]}`;
                }
            }
        }

        // Format Currency mit tagesgenauen Preisen
        function formatCurrency(gmtAmount, date = null) {
            if (!gmtAmount) return '0.00 GMT';
            
            const currency = settings.currency === 'USD' ? '$' : '€';
            const fiat = settings.currency;
            
            // Hole tagesgenauen Preis wenn Datum vorhanden
            let rate = settings.exchangeRates[settings.currency]; // Fallback
            if (date) {
                const priceAtDate = getPriceForDate(date, 'GMT', fiat);
                if (priceAtDate) {
                    rate = priceAtDate;
                }
            }
            
            const converted = (gmtAmount * rate).toFixed(2);
            return `${gmtAmount.toFixed(2)} GMT (${currency}${converted})`;
        }
// Export to CSV
function exportToCSV() {
    const miners = Object.values(minerData);
    
    if (miners.length === 0) {
        alert('❌ No data to export! Please import some miners first.');
        return;
    }

    const currency = settings.currency === 'USD' ? 'USD' : 'EUR';
    const currencySymbol = settings.currency === 'USD' ? '$' : '€';
    const fiat = settings.currency;

    // CSV Header
    let csv = 'Miner_ID;Miner_Name;Purchase_Date;Purchase_Time;Purchase_Price_GMT;Purchase_Price_' + currencySymbol + ';Purchase_TH;Purchase_WTH;';
    csv += 'Current_TH;Current_WTH;Total_TH_Upgrades;Total_Efficiency_Upgrades;';
    csv += 'Total_Upgrade_Cost_GMT;Total_Upgrade_Cost_' + currencySymbol + ';Total_Investment_GMT;Total_Investment_' + currencySymbol + ';';
    csv += 'Sale_Date;Sale_Buyer_Price_GMT;Sale_Buyer_Price_' + currencySymbol + ';Sale_Your_Price_GMT;Sale_Your_Price_' + currencySymbol + ';Profit_Loss_' + currencySymbol + ';Status\n';

    miners.forEach(miner => {
        // Get date-specific prices
        const purchaseRate = getPriceForDate(miner.purchase.date, 'GMT', fiat) || settings.exchangeRates[settings.currency];
        
        // Calculate upgrade costs with date-specific prices
        let totalUpgradeCostGMT = 0;
        let totalUpgradeCostFiat = 0;
        
        miner.upgrades.th.forEach(u => {
            const upgradeRate = getPriceForDate(u.date, 'GMT', fiat) || settings.exchangeRates[settings.currency];
            totalUpgradeCostGMT += u.price || 0;
            totalUpgradeCostFiat += (u.price || 0) * upgradeRate;
        });
        
        miner.upgrades.efficiency.forEach(u => {
            const upgradeRate = getPriceForDate(u.date, 'GMT', fiat) || settings.exchangeRates[settings.currency];
            totalUpgradeCostGMT += u.price || 0;
            totalUpgradeCostFiat += (u.price || 0) * upgradeRate;
        });
        
        const totalInvestmentGMT = (miner.purchase.price || 0) + totalUpgradeCostGMT;
        const totalInvestmentFiat = (miner.purchase.price || 0) * purchaseRate + totalUpgradeCostFiat;

        // Format values for CSV (replace . with , for decimal)
        const formatNumber = (num) => {
            if (!num && num !== 0) return '0';
            return num.toFixed(2).replace('.', ',');
        };

        const formatDateForCSV = (dateStr) => {
            if (!dateStr || dateStr === 'Unknown') return dateStr;
            
            let parts;
            if (dateStr.includes('/')) {
                parts = dateStr.split('/');
            } else if (dateStr.includes('.')) {
                parts = dateStr.split('.');
            } else {
                return dateStr;
            }

            if (settings.dateFormat === 'US') {
                return `${parts[0].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[2]}`;
            } else {
                if (dateStr.includes('/')) {
                    return `${parts[1].padStart(2, '0')}.${parts[0].padStart(2, '0')}.${parts[2]}`;
                } else {
                    return `${parts[0].padStart(2, '0')}.${parts[1].padStart(2, '0')}.${parts[2]}`;
                }
            }
        };

        // Build row
        let row = `"${miner.id}";`;
        row += `"${miner.name}";`;
        row += `"${formatDateForCSV(miner.purchase.date)}";`;
        row += `"${miner.purchase.time}";`;
        row += `"${formatNumber(miner.purchase.price)}";`;
        row += `"${formatNumber(miner.purchase.price * purchaseRate)}${currencySymbol}";`;
        row += `"${formatNumber(miner.purchase.th)}";`;
        row += `"${formatNumber(miner.purchase.wth)}";`;
        row += `"${formatNumber(miner.currentTH)}";`;
        row += `"${formatNumber(miner.currentWTH)}";`;
        row += `"${miner.upgrades.th.length}";`;
        row += `"${miner.upgrades.efficiency.length}";`;
        row += `"${formatNumber(totalUpgradeCostGMT)}";`;
        row += `"${formatNumber(totalUpgradeCostFiat)}${currencySymbol}";`;
        row += `"${formatNumber(totalInvestmentGMT)}";`;
        row += `"${formatNumber(totalInvestmentFiat)}${currencySymbol}";`;
        
        if (miner.sale) {
            const saleRate = getPriceForDate(miner.sale.date, 'GMT', fiat) || settings.exchangeRates[settings.currency];
            const saleRevenueFiat = (miner.sale.yourPrice || 0) * saleRate;
            const profitLossFiat = saleRevenueFiat - totalInvestmentFiat;
            
            row += `"${formatDateForCSV(miner.sale.date)}";`;
            row += `"${formatNumber(miner.sale.buyerPrice)}";`;
            row += `"${formatNumber(miner.sale.buyerPrice * saleRate)}${currencySymbol}";`;
            row += `"${formatNumber(miner.sale.yourPrice)}";`;
            row += `"${formatNumber(saleRevenueFiat)}${currencySymbol}";`;
            row += `"${formatNumber(profitLossFiat)}${currencySymbol}";`;
            row += `"SOLD"`;
        } else {
            row += `"";"";"";"";"";"";"ACTIVE"`;
        }
        
        csv += row + '\n';
    });

    // Add upgrades detail section
    csv += '\n\n';
    csv += 'DETAILED_UPGRADE_HISTORY\n';
    csv += 'Miner_ID;Miner_Name;Upgrade_Type;Date;From_Value;To_Value;Price_GMT;Price_' + currencySymbol + '\n';

    miners.forEach(miner => {
        // TH Upgrades
        miner.upgrades.th.forEach(upgrade => {
            const upgradeRate = getPriceForDate(upgrade.date, 'GMT', fiat) || settings.exchangeRates[settings.currency];
            
            const formatNumber = (num) => {
                if (!num && num !== 0) return '0';
                return num.toFixed(2).replace('.', ',');
            };

            const formatDateForCSV = (dateStr) => {
                if (!dateStr || dateStr === 'Unknown') return dateStr;
                
                let parts;
                if (dateStr.includes('/')) {
                    parts = dateStr.split('/');
                } else if (dateStr.includes('.')) {
                    parts = dateStr.split('.');
                } else {
                    return dateStr;
                }

                if (settings.dateFormat === 'US') {
                    return `${parts[0].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[2]}`;
                } else {
                    if (dateStr.includes('/')) {
                        return `${parts[1].padStart(2, '0')}.${parts[0].padStart(2, '0')}.${parts[2]}`;
                    } else {
                        return `${parts[0].padStart(2, '0')}.${parts[1].padStart(2, '0')}.${parts[2]}`;
                    }
                }
            };

            csv += `"${miner.id}";"${miner.name}";"TH_Upgrade";"${formatDateForCSV(upgrade.date)}";`;
            csv += `"${formatNumber(upgrade.from)}";"${formatNumber(upgrade.to)}";`;
            csv += `"${formatNumber(upgrade.price)}";"${formatNumber(upgrade.price * upgradeRate)}${currencySymbol}"\n`;
        });

        // Efficiency Upgrades
        miner.upgrades.efficiency.forEach(upgrade => {
            const upgradeRate = getPriceForDate(upgrade.date, 'GMT', fiat) || settings.exchangeRates[settings.currency];
            
            const formatNumber = (num) => {
                if (!num && num !== 0) return '0';
                return num.toFixed(2).replace('.', ',');
            };

            const formatDateForCSV = (dateStr) => {
                if (!dateStr || dateStr === 'Unknown') return dateStr;
                
                let parts;
                if (dateStr.includes('/')) {
                    parts = dateStr.split('/');
                } else if (dateStr.includes('.')) {
                    parts = dateStr.split('.');
                } else {
                    return dateStr;
                }

                if (settings.dateFormat === 'US') {
                    return `${parts[0].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[2]}`;
                } else {
                    if (dateStr.includes('/')) {
                        return `${parts[1].padStart(2, '0')}.${parts[0].padStart(2, '0')}.${parts[2]}`;
                    } else {
                        return `${parts[0].padStart(2, '0')}.${parts[1].padStart(2, '0')}.${parts[2]}`;
                    }
                }
            };

            csv += `"${miner.id}";"${miner.name}";"Efficiency_Upgrade";"${formatDateForCSV(upgrade.date)}";`;
            csv += `"${formatNumber(upgrade.from)}";"${formatNumber(upgrade.to)}";`;
            csv += `"${formatNumber(upgrade.price)}";"${formatNumber(upgrade.price * upgradeRate)}${currencySymbol}"\n`;
        });
    });

    // Generate filename with date
    const now = new Date();
    const dateStr = settings.dateFormat === 'US' 
        ? `${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}-${now.getFullYear()}`
        : `${now.getDate().toString().padStart(2, '0')}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getFullYear()}`;
    
    const filename = `GoMining_Miner_History_${dateStr}_${currency}.csv`;

    // Download CSV
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showResult('purchaseResult', 'success', `✅ CSV exported successfully as ${filename}`);
}
        // Export to CSV
        function exportToCSValt() {
            const miners = Object.values(minerData);
            
            if (miners.length === 0) {
                alert('❌ No data to export! Please import some miners first.');
                return;
            }

            const currency = settings.currency === 'USD' ? 'USD' : 'EUR';
            const currencySymbol = settings.currency === 'USD' ? '$' : '€';
            const rate = settings.exchangeRates[settings.currency];

            // CSV Header
            let csv = 'Miner_ID;Miner_Name;Purchase_Date;Purchase_Time;Purchase_Price_GMT;Purchase_Price ' + currencySymbol + ';Purchase_TH;Purchase_WTH;';
            csv += 'Current_TH;Current_WTH;Total_TH_Upgrades;Total_Efficiency_Upgrades;';
            csv += 'Total_Upgrade_Cost_GMT;Total_Upgrade_Cost_' + currencySymbol + ';Total_Investment_GMT;Total_Investment_' + currencySymbol + ';';
            csv += 'Sale_Date;Sale_Buyer_Price_GMT;Sale_Buyer_Price_' + currencySymbol + ';Sale_Your_Price_GMT;Sale_Your_Price_' + currencySymbol + ';Status\n';



            miners.forEach(miner => {
                // Calculate totals
                let totalUpgradeCost = 0;
                miner.upgrades.th.forEach(u => totalUpgradeCost += u.price || 0);
                miner.upgrades.efficiency.forEach(u => totalUpgradeCost += u.price || 0);
                
                const totalInvestment = (miner.purchase.price || 0) + totalUpgradeCost;

                // Format values for CSV (replace . with , for decimal)
                const formatNumber = (num) => {
                    if (!num && num !== 0) return '0';
                    return num.toFixed(2).replace('.', ',');
                };

                const formatDateForCSV = (dateStr) => {
                    if (!dateStr || dateStr === 'Unknown') return dateStr;
                    
                    let parts;
                    if (dateStr.includes('/')) {
                        parts = dateStr.split('/');
                    } else if (dateStr.includes('.')) {
                        parts = dateStr.split('.');
                    } else {
                        return dateStr;
                    }

                    if (settings.dateFormat === 'US') {
                        // MM/DD/YYYY
                        return `${parts[0].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[2]}`;
                    } else {
                        // DD.MM.YYYY
                        if (dateStr.includes('/')) {
                            return `${parts[1].padStart(2, '0')}.${parts[0].padStart(2, '0')}.${parts[2]}`;
                        } else {
                            return `${parts[0].padStart(2, '0')}.${parts[1].padStart(2, '0')}.${parts[2]}`;
                        }
                    }
                };

                // Build row
                let row = `"${miner.id}";`;
                row += `"${miner.name}";`;
                row += `"${formatDateForCSV(miner.purchase.date)}";`;
                row += `"${miner.purchase.time}";`;
                row += `"${formatNumber(miner.purchase.price)}";`;
                row += `"${formatNumber(miner.purchase.price * rate)}${currencySymbol}";`;
                row += `"${formatNumber(miner.purchase.th)}";`;
                row += `"${formatNumber(miner.purchase.wth)}";`;
                row += `"${formatNumber(miner.currentTH)}";`;
                row += `"${formatNumber(miner.currentWTH)}";`;
                row += `"${miner.upgrades.th.length}";`;
                row += `"${miner.upgrades.efficiency.length}";`;
                row += `"${formatNumber(totalUpgradeCost)}";`;
                row += `"${formatNumber(totalUpgradeCost * rate)}${currencySymbol}";`;
                row += `"${formatNumber(totalInvestment)}";`;
                row += `"${formatNumber(totalInvestment * rate)}${currencySymbol}";`;
                
                if (miner.sale) {
                    row += `"${formatDateForCSV(miner.sale.date)}";`;
                    row += `"${formatNumber(miner.sale.buyerPrice)}";`;
                    row += `"${formatNumber(miner.sale.buyerPrice * rate)}${currencySymbol}";`;
                    row += `"${formatNumber(miner.sale.yourPrice)}";`;
                    row += `"${formatNumber(miner.sale.yourPrice * rate)}${currencySymbol}";`;
                    row += `"${formatNumber((miner.sale.yourPrice - totalInvestment) * rate)}${currencySymbol}";`;
                    row += `"SOLD"`;
                } else {
                    row += `"";"";"";"";"";"ACTIVE"`;
                }
                
                csv += row + '\n';
            });

            // Add upgrades detail section
            csv += '\n\n';
            csv += 'DETAILED_UPGRADE_HISTORY\n';
            csv += 'Miner_ID;Miner_Name;Upgrade_Type;Date;From_Value;To_Value;Price_GMT;Price_Fiat' + currencySymbol + '\n';

            miners.forEach(miner => {
                // TH Upgrades
                miner.upgrades.th.forEach(upgrade => {
                    const formatNumber = (num) => {
                        if (!num && num !== 0) return '0';
                        return num.toFixed(2).replace('.', ',');
                    };

                    const formatDateForCSV = (dateStr) => {
                        if (!dateStr || dateStr === 'Unknown') return dateStr;
                        
                        let parts;
                        if (dateStr.includes('/')) {
                            parts = dateStr.split('/');
                        } else if (dateStr.includes('.')) {
                            parts = dateStr.split('.');
                        } else {
                            return dateStr;
                        }

                        if (settings.dateFormat === 'US') {
                            return `${parts[0].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[2]}`;
                        } else {
                            if (dateStr.includes('/')) {
                                return `${parts[1].padStart(2, '0')}.${parts[0].padStart(2, '0')}.${parts[2]}`;
                            } else {
                                return `${parts[0].padStart(2, '0')}.${parts[1].padStart(2, '0')}.${parts[2]}`;
                            }
                        }
                    };

                    csv += `"${miner.id}";"${miner.name}";"TH_Upgrade";"${formatDateForCSV(upgrade.date)}";`;
                    csv += `"${formatNumber(upgrade.from)}";"${formatNumber(upgrade.to)}";`;
                    csv += `"${formatNumber(upgrade.price)}";"${formatNumber(upgrade.price * rate)}${currencySymbol}"\n`;
                });

                // Efficiency Upgrades
                miner.upgrades.efficiency.forEach(upgrade => {
                    const formatNumber = (num) => {
                        if (!num && num !== 0) return '0';
                        return num.toFixed(2).replace('.', ',');
                    };

                    const formatDateForCSV = (dateStr) => {
                        if (!dateStr || dateStr === 'Unknown') return dateStr;
                        
                        let parts;
                        if (dateStr.includes('/')) {
                            parts = dateStr.split('/');
                        } else if (dateStr.includes('.')) {
                            parts = dateStr.split('.');
                        } else {
                            return dateStr;
                        }

                        if (settings.dateFormat === 'US') {
                            return `${parts[0].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[2]}`;
                        } else {
                            if (dateStr.includes('/')) {
                                return `${parts[1].padStart(2, '0')}.${parts[0].padStart(2, '0')}.${parts[2]}`;
                            } else {
                                return `${parts[0].padStart(2, '0')}.${parts[1].padStart(2, '0')}.${parts[2]}`;
                            }
                        }
                    };

                    csv += `"${miner.id}";"${miner.name}";"Efficiency_Upgrade";"${formatDateForCSV(upgrade.date)}";`;
                    csv += `"${formatNumber(upgrade.from)}";"${formatNumber(upgrade.to)}";`;
                    csv += `"${formatNumber(upgrade.price)}";"${formatNumber(upgrade.price * rate)}${currencySymbol}"\n`;
                });
            });

            // Generate filename with date
            const now = new Date();
            const dateStr = settings.dateFormat === 'US' 
                ? `${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}-${now.getFullYear()}`
                : `${now.getDate().toString().padStart(2, '0')}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getFullYear()}`;
            
            const filename = `GoMining_Miner_History_${dateStr}_${currency}.csv`;

            // Download CSV
            const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }); // ← HIER '\uFEFF' hinzufügen
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.setAttribute('href', url);
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            showResult('purchaseResult', 'success', `✅ CSV exported successfully as ${filename}`);
        }

        // Render Table View
        function renderTableView(container) {
            const miners = getFilteredMiners();
            
            if (miners.length === 0) {
                container.innerHTML = '<div style="text-align: center; padding: 40px; color: #aaa; font-size: 1.2em;">No miners found matching your filters.</div>';
                return;
            }
            
            let html = `
                <div style="overflow-x: auto;">
                    <table style="width: 100%; border-collapse: collapse; background: rgba(30, 30, 46, 0.6); border-radius: 8px;">
                        <thead>
                            <tr style="background: rgba(103, 61, 236, 0.3); border-bottom: 2px solid #673dec;">
                                <th style="padding: 12px; text-align: left; color: #00ff7f; cursor: pointer;" onclick="sortTable('name')">Miner ↕️</th>
                                <th style="padding: 12px; text-align: left; color: #00ff7f; cursor: pointer;" onclick="sortTable('date')">Purchase Date ↕️</th>
                                <th style="padding: 12px; text-align: right; color: #00ff7f; cursor: pointer;" onclick="sortTable('th')">TH ↕️</th>
                                <th style="padding: 12px; text-align: right; color: #00ff7f; cursor: pointer;" onclick="sortTable('wth')">W/TH ↕️</th>
                                <th style="padding: 12px; text-align: right; color: #00ff7f; cursor: pointer;" onclick="sortTable('price')">Price ↕️</th>
                                <th style="padding: 12px; text-align: center; color: #00ff7f;">Upgrades</th>
                                <th style="padding: 12px; text-align: center; color: #00ff7f;">Status</th>
                                <th style="padding: 12px; text-align: center; color: #00ff7f;">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            miners.forEach(miner => {
                const isSold = miner.sale !== null;
                const rowStyle = isSold ? 'background: rgba(255, 77, 77, 0.1);' : '';
                const statusBadge = isSold 
                    ? '<span style="background: #ff4d4d; padding: 4px 8px; border-radius: 4px; font-size: 0.85em;">SOLD</span>'
                    : '<span style="background: #00ff7f; color: #1a1a2e; padding: 4px 8px; border-radius: 4px; font-size: 0.85em;">ACTIVE</span>';
                
                const totalUpgrades = miner.upgrades.th.length + miner.upgrades.efficiency.length;
                
                html += `
                    <tr style="${rowStyle} border-bottom: 1px solid rgba(255,255,255,0.1);">
                        <td style="padding: 12px;">
                            <div style="font-weight: 600;">${miner.fullName}</div>
                            <div style="font-size: 0.85em; color: #aaa;">ID: ${miner.id}</div>
                        </td>
                        <td style="padding: 12px;">
                            <div>${formatDate(miner.purchase.date)}</div>
                            <div style="font-size: 0.85em; color: #aaa;">${miner.purchase.time}</div>
                        </td>
                        <td style="padding: 12px; text-align: right;">
                            <div>${miner.purchase.th} → ${miner.currentTH} TH</div>
                        </td>
                        <td style="padding: 12px; text-align: right;">
                            <div>${miner.purchase.wth} → ${miner.currentWTH} W/TH</div>
                        </td>
                        <td style="padding: 12px; text-align: right;">
                            <div style="font-weight: 600;">${formatCurrency(miner.purchase.price, miner.purchase.date)}</div>
                        </td>
                        <td style="padding: 12px; text-align: center;">
                            <span style="background: rgba(103, 61, 236, 0.3); padding: 4px 8px; border-radius: 4px; font-size: 0.9em;">${totalUpgrades}</span>
                        </td>
                        <td style="padding: 12px; text-align: center;">
                            ${statusBadge}
                        </td>
                        <td style="padding: 12px; text-align: center;">
                            <button onclick="viewMinerDetails('${miner.id}')" style="background: #673dec; border: none; padding: 6px 12px; border-radius: 4px; color: white; cursor: pointer; margin-right: 5px;">
                                <span class="material-icons" style="font-size: 16px; vertical-align: middle;">visibility</span>
                            </button>
                            <button onclick="deleteMiner('${miner.id}')" style="background: #ff4d4d; border: none; padding: 6px 12px; border-radius: 4px; color: white; cursor: pointer;">
                                <span class="material-icons" style="font-size: 16px; vertical-align: middle;">delete</span>
                            </button>
                        </td>
                    </tr>
                `;
            });

            html += `
                        </tbody>
                    </table>
                </div>
            `;

            container.innerHTML = html;
        }

        // Render Accordion View
        function renderAccordionView(container) {
            const miners = getFilteredMiners();
            
            if (miners.length === 0) {
                container.innerHTML = '<div style="text-align: center; padding: 40px; color: #aaa; font-size: 1.2em;">No miners found matching your filters.</div>';
                return;
            }
            
            let html = '<div style="display: flex; flex-direction: column; gap: 15px;">';

            miners.forEach(miner => {
                const isSold = miner.sale !== null;
                const borderColor = isSold ? '#ff4d4d' : '#673dec';
                const totalUpgrades = miner.upgrades.th.length + miner.upgrades.efficiency.length;
                
                html += `
                    <div style="background: rgba(30, 30, 46, 0.8); border: 2px solid ${borderColor}; border-radius: 10px; overflow: hidden;">
                        <div onclick="toggleAccordion('accordion-${miner.id}')" style="padding: 15px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; background: rgba(103, 61, 236, 0.2);">
                            <div>
                                <div style="font-size: 1.2em; font-weight: 600; color: #00ff7f;">${miner.fullName}</div>
                                <div style="font-size: 0.9em; color: #aaa; margin-top: 5px;">
                                    ${formatDate(miner.purchase.date)} • ${miner.currentTH} TH • ${miner.currentWTH} W/TH
                                </div>
                            </div>
                            <div>
                                <span class="material-icons" style="color: #673dec; font-size: 28px;">expand_more</span>
                            </div>
                        </div>
                        <div id="accordion-${miner.id}" style="display: none; padding: 20px;">
                            ${renderMinerDetails(miner)}
                        </div>
                    </div>
                `;
            });

            html += '</div>';
            container.innerHTML = html;
        }

        // Render Cards View
        function renderCardsView(container) {
            const miners = getFilteredMiners();
            
            if (miners.length === 0) {
                container.innerHTML = '<div style="text-align: center; padding: 40px; color: #aaa; font-size: 1.2em;">No miners found matching your filters.</div>';
                return;
            }
            
            let html = '<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: 20px;">';

            miners.forEach(miner => {
                const isSold = miner.sale !== null;
                const borderColor = isSold ? '#ff4d4d' : '#00ff7f';
                const statusBadge = isSold 
                    ? '<span style="background: #ff4d4d; padding: 6px 12px; border-radius: 6px; font-size: 0.9em;">SOLD</span>'
                    : '<span style="background: #00ff7f; color: #1a1a2e; padding: 6px 12px; border-radius: 6px; font-size: 0.9em; font-weight: 600;">ACTIVE</span>';
                
                html += `
                    <div style="background: rgba(30, 30, 46, 0.9); border: 2px solid ${borderColor}; border-radius: 12px; padding: 20px; box-shadow: 0 4px 15px rgba(0,0,0,0.3);">
                        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 15px;">
                            <div>
                                <div style="font-size: 1.3em; font-weight: 600; color: #00ff7f; margin-bottom: 5px;">${miner.name}</div>
                                <div style="color: #aaa; font-size: 0.9em;">ID: #${miner.id}</div>
                            </div>
                            ${statusBadge}
                        </div>

                        <div style="background: rgba(103, 61, 236, 0.1); padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                                <div>
                                    <div style="color: #aaa; font-size: 0.85em;">Hashrate</div>
                                    <div style="font-size: 1.3em; font-weight: 600; color: #673dec;">${miner.currentTH} TH</div>
                                    <div style="font-size: 0.8em; color: #888;">Start: ${miner.purchase.th} TH</div>
                                </div>
                                <div>
                                    <div style="color: #aaa; font-size: 0.85em;">Efficiency</div>
                                    <div style="font-size: 1.3em; font-weight: 600; color: #673dec;">${miner.currentWTH} W/TH</div>
                                    <div style="font-size: 0.8em; color: #888;">Start: ${miner.purchase.wth} W/TH</div>
                                </div>
                            </div>
                        </div>

                        <div style="margin-bottom: 15px;">
                            <div style="color: #aaa; font-size: 0.85em; margin-bottom: 5px;">Purchase</div>
                            <div style="font-weight: 600;">${formatCurrency(miner.purchase.price, miner.purchase.date)}</div>
                            <div style="font-size: 0.9em; color: #888;">${formatDate(miner.purchase.date)} ${miner.purchase.time}</div>
                        </div>

                        <div style="display: flex; gap: 10px;">
                            <button onclick="viewMinerDetails('${miner.id}')" style="flex: 1; background: #673dec; border: none; padding: 10px; border-radius: 6px; color: white; cursor: pointer; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 5px;">
                                <span class="material-icons" style="font-size: 18px;">visibility</span>
                                Details
                            </button>
                            <button onclick="deleteMiner('${miner.id}')" style="background: #ff4d4d; border: none; padding: 10px; border-radius: 6px; color: white; cursor: pointer;">
                                <span class="material-icons" style="font-size: 18px;">delete</span>
                            </button>
                        </div>
                    </div>
                `;
            });

            html += '</div>';
            container.innerHTML = html;
        }

        // Render Miner Details (for accordion and modal)
        function renderMinerDetails(miner) {
            let html = '<div style="display: flex; flex-direction: column; gap: 15px;">';

            // Purchase Info
            html += `
                <div style="background: rgba(103, 61, 236, 0.15); padding: 15px; border-radius: 8px; border-left: 4px solid #673dec;">
                    <h3 style="color: #673dec; margin-bottom: 10px; display: flex; align-items: center; gap: 8px;">
                        <span class="material-icons">shopping_cart</span>
                        Purchase Information
                    </h3>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px;">
                        <div><span style="color: #aaa;">Date:</span> ${formatDate(miner.purchase.date)} ${miner.purchase.time}</div>
                        <div><span style="color: #aaa;">Price:</span> ${formatCurrency(miner.purchase.price, miner.purchase.date)}</div>
                        <div><span style="color: #aaa;">TH:</span> ${miner.purchase.th} TH</div>
                        <div><span style="color: #aaa;">W/TH:</span> ${miner.purchase.wth} W/TH</div>
                        <div><span style="color: #aaa;">Status:</span> ${miner.purchase.status}</div>
                    </div>
                </div>
            `;

            // TH Upgrades (sortiert nach Datum/Zeit)
            if (miner.upgrades.th.length > 0) {
                const sortedTH = [...miner.upgrades.th].sort((a, b) => {
                    const parseDate = (d, t) => {
                        if (!d || d === 'Unknown') return new Date(0);
                        const parts = d.split(/[\/\.]/);
                        return new Date(parts[2], parts[0] - 1, parts[1], ...(t && t !== 'Unknown' ? t.split(':') : [0,0,0]));
                    };
                    const da = parseDate(a.date, a.time);
                    const db = parseDate(b.date, b.time);
                    return da - db;
                });
                html += `
                    <div style="background: rgba(0, 255, 127, 0.1); padding: 15px; border-radius: 8px; border-left: 4px solid #00ff7f;">
                        <h3 style="color: #00ff7f; margin-bottom: 10px; display: flex; align-items: center; gap: 8px;">
                            <span class="material-icons">trending_up</span>
                            TH Upgrades (${sortedTH.length})
                        </h3>
                        <div style="display: flex; flex-direction: column; gap: 8px;">
                `;
                sortedTH.forEach((upgrade, idx) => {
                    html += `
                        <div style="background: rgba(0,0,0,0.2); padding: 10px; border-radius: 5px;">
                            <div style="display: flex; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
                                <div><strong>#${idx + 1}</strong> ${formatDate(upgrade.date)}</div>
                                <div>${upgrade.from} TH → ${upgrade.to} TH</div>
                                <div style="color: #00ff7f; font-weight: 600;">${formatCurrency(upgrade.price, upgrade.date)}</div>
                            </div>
                        </div>
                    `;
                });
                html += `
                        </div>
                    </div>
                `;
            }

            // Efficiency Upgrades (sortiert nach Datum/Zeit)
            if (miner.upgrades.efficiency.length > 0) {
                const sortedEff = [...miner.upgrades.efficiency].sort((a, b) => {
                    const parseDate = (d, t) => {
                        if (!d || d === 'Unknown') return new Date(0);
                        const parts = d.split(/[\/\.]/);
                        return new Date(parts[2], parts[0] - 1, parts[1], ...(t && t !== 'Unknown' ? t.split(':') : [0,0,0]));
                    };
                    const da = parseDate(a.date, a.time);
                    const db = parseDate(b.date, b.time);
                    return da - db;
                });
                html += `
                    <div style="background: rgba(255, 193, 7, 0.1); padding: 15px; border-radius: 8px; border-left: 4px solid #ffc107;">
                        <h3 style="color: #ffc107; margin-bottom: 10px; display: flex; align-items: center; gap: 8px;">
                            <span class="material-icons">bolt</span>
                            Efficiency Upgrades (${sortedEff.length})
                        </h3>
                        <div style="display: flex; flex-direction: column; gap: 8px;">
                `;
                sortedEff.forEach((upgrade, idx) => {
                    html += `
                        <div style="background: rgba(0,0,0,0.2); padding: 10px; border-radius: 5px;">
                            <div style="display: flex; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
                                <div><strong>#${idx + 1}</strong> ${formatDate(upgrade.date)}</div>
                                <div>${upgrade.from} W/TH → ${upgrade.to} W/TH</div>
                                <div style="color: #ffc107; font-weight: 600;">${formatCurrency(upgrade.price, upgrade.date)}</div>
                            </div>
                        </div>
                    `;
                });
                html += `
                        </div>
                    </div>
                `;
            }

            // Sale Info
            if (miner.sale) {
                html += `
                    <div style="background: rgba(255, 77, 77, 0.15); padding: 15px; border-radius: 8px; border-left: 4px solid #ff4d4d;">
                        <h3 style="color: #ff4d4d; margin-bottom: 10px; display: flex; align-items: center; gap: 8px;">
                            <span class="material-icons">sell</span>
                            Sale Information
                        </h3>
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px;">
                            <div><span style="color: #aaa;">Date:</span> ${formatDate(miner.sale.date)}</div>
                            <div><span style="color: #aaa;">Buyer Price:</span> ${formatCurrency(miner.sale.buyerPrice, miner.sale.date)}</div>
                            <div><span style="color: #aaa;">You Got:</span> ${formatCurrency(miner.sale.yourPrice, miner.sale.date)}</div>
                        </div>
                    </div>
                `;
            }

            // Delete Button
            html += `
                <div style="text-align: center; padding-top: 10px;">
                    <button onclick="deleteMiner('${miner.id}')" style="background: #ff4d4d; border: none; padding: 10px 20px; border-radius: 6px; color: white; cursor: pointer; font-weight: 600; display: inline-flex; align-items: center; gap: 8px;">
                        <span class="material-icons">delete</span>
                        Delete This Miner
                    </button>
                </div>
            `;

            html += '</div>';
            return html;
        }

        // Toggle Accordion
        function toggleAccordion(id) {
            const element = document.getElementById(id);
            element.style.display = element.style.display === 'none' ? 'block' : 'none';
        }

        // View Miner Details (Modal)
        function viewMinerDetails(minerId) {
            const miner = minerData[minerId];
            if (!miner) return;

            const modal = document.createElement('div');
            modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 10000; padding: 20px;';
            modal.onclick = (e) => { if (e.target === modal) modal.remove(); };

            const content = document.createElement('div');
            content.style.cssText = 'background: #1a1a2e; padding: 30px; border-radius: 15px; max-width: 800px; width: 100%; max-height: 90vh; overflow-y: auto; border: 2px solid #673dec;';
            
            content.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h2 style="color: #00ff7f; margin: 0;">${miner.fullName}</h2>
                    <button onclick="this.closest('.modal-backdrop').remove()" style="background: none; border: none; color: #fff; font-size: 28px; cursor: pointer; padding: 0; line-height: 1;">
                        <span class="material-icons">close</span>
                    </button>
                </div>
                ${renderMinerDetails(miner)}
            `;

            modal.className = 'modal-backdrop';
            modal.appendChild(content);
            document.body.appendChild(modal);
        }

        // Delete Miner
        function deleteMiner(minerId) {
            const miner = minerData[minerId];
            if (confirm(`Are you sure you want to delete ${miner.fullName}? This cannot be undone.`)) {
                delete minerData[minerId];
                saveData();
                updateDisplay();
                showResult('purchaseResult', 'success', `✅ ${miner.fullName} has been deleted.`);
            }
        }

        // Sort State
        let sortState = {
            column: null,
            ascending: true
        };

        // Sort Table
        function sortTable(column) {
            // Toggle sort direction if same column
            if (sortState.column === column) {
                sortState.ascending = !sortState.ascending;
            } else {
                sortState.column = column;
                sortState.ascending = true;
            }

            const miners = Object.values(minerData);

            miners.sort((a, b) => {
                let valA, valB;

                switch (column) {
                    case 'name':
                        valA = a.fullName.toLowerCase();
                        valB = b.fullName.toLowerCase();
                        break;
                    case 'date':
                        valA = parseDateForSort(a.purchase.date);
                        valB = parseDateForSort(b.purchase.date);
                        break;
                    case 'th':
                        valA = a.currentTH;
                        valB = b.currentTH;
                        break;
                    case 'wth':
                        valA = a.currentWTH;
                        valB = b.currentWTH;
                        break;
                    case 'price':
                        valA = a.purchase.price || 0;
                        valB = b.purchase.price || 0;
                        break;
                    default:
                        return 0;
                }

                if (valA < valB) return sortState.ascending ? -1 : 1;
                if (valA > valB) return sortState.ascending ? 1 : -1;
                return 0;
            });

            // Rebuild minerData in sorted order
            const sortedData = {};
            miners.forEach(m => {
                sortedData[m.id] = m;
            });
            minerData = sortedData;

            // Re-render
            updateDisplay();
        }

        // Parse date for sorting
        function parseDateForSort(dateStr) {
            if (!dateStr || dateStr === 'Unknown') return new Date(0);
            
            let parts;
            if (dateStr.includes('/')) {
                parts = dateStr.split('/');
                // Assume MM/DD/YYYY
                return new Date(parts[2], parts[0] - 1, parts[1]);
            } else if (dateStr.includes('.')) {
                parts = dateStr.split('.');
                // Assume DD.MM.YYYY
                return new Date(parts[2], parts[1] - 1, parts[0]);
            }
            
            return new Date(0);
        }

        // Clear All Data
        function clearAllData() {
            if (confirm('⚠️ WARNING!\n\nDo you really want to permanently delete ALL data?\n\n- All Miners\n- Purchase/Upgrade/Sell History\n- Transfer Import Data\n- All Settings\n\nThis CANNOT be undone!')) {
                if (confirm('Last chance! Really delete EVERYTHING?')) {
                    // Clear minerData
                    minerData = {};
                    
                    // Remove ALL localStorage entries related to GoMining
                    localStorage.removeItem('goMiningMinerHistory');
                    localStorage.removeItem('myCompleteFarm');
                    localStorage.removeItem('farmSettings');
                    localStorage.removeItem('notFoundList');
                    
                    // Remove everything that might be related to GoMining/Miner
                    Object.keys(localStorage).forEach(key => {
                        if (key.toLowerCase().includes('miner') || 
                            key.toLowerCase().includes('gomining') || 
                            key.toLowerCase().includes('farm')) {
                            localStorage.removeItem(key);
                        }
                    });
                    
                    // Reset UI
                    document.getElementById('displaySection').style.display = 'none';
                    
                    // Clear all input fields
                    document.getElementById('transferInput').value = '';
                    document.getElementById('purchaseInput').value = '';
                    document.getElementById('upgradeInput').value = '';
                    document.getElementById('sellInput').value = '';
                    
                    showResult('transferResult', 'success', '✅ All data has been completely deleted! Storage is now empty.');
                    
                    console.log('🧹 All data cleared. localStorage is clean.');
                }
            }
        }

        // Filter State
        let filterState = {
            searchText: '',
            status: 'all'
        };

        // Filter Miners
        function filterMiners() {
            filterState.searchText = document.getElementById('searchInput')?.value.toLowerCase() || '';
            filterState.status = document.getElementById('statusFilter')?.value || 'all';
            
            // Show/hide bulk delete button
            const isFiltered = filterState.searchText || filterState.status !== 'all';
            const deleteBtn = document.getElementById('deleteFilteredBtn');
            if (deleteBtn) {
                deleteBtn.style.display = isFiltered ? 'flex' : 'none';
            }
            
            updateDisplay();
        }

        // Delete Filtered Miners
        function deleteFilteredMiners() {
            const filtered = getFilteredMiners();
            
            if (filtered.length === 0) {
                alert('No miners to delete!');
                return;
            }
            
            if (confirm(`Are you sure you want to delete ${filtered.length} miner(s)? This cannot be undone.`)) {
                filtered.forEach(miner => {
                    delete minerData[miner.id];
                });
                
                saveData();
                
                // Reset filters
                document.getElementById('searchInput').value = '';
                document.getElementById('statusFilter').value = 'all';
                filterState.searchText = '';
                filterState.status = 'all';
                
                updateDisplay();
                showResult('purchaseResult', 'success', `✅ ${filtered.length} miner(s) deleted successfully!`);
            }
        }

        // Get Filtered Miners
        function getFilteredMiners() {
            let miners = Object.values(minerData);

            // Apply search filter
            if (filterState.searchText) {
                miners = miners.filter(m => 
                    m.fullName.toLowerCase().includes(filterState.searchText) ||
                    m.id.includes(filterState.searchText) ||
                    m.name.toLowerCase().includes(filterState.searchText)
                );
            }

            // Apply status filter
            if (filterState.status === 'active') {
                miners = miners.filter(m => !m.sale);
            } else if (filterState.status === 'sold') {
                miners = miners.filter(m => m.sale);
            }

            return miners;
        }

        // Keyboard Shortcuts
        document.addEventListener('keydown', function(e) {
            // Ctrl/Cmd + E = Export CSV
            if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
                e.preventDefault();
                if (Object.keys(minerData).length > 0) {
                    exportToCSV();
                }
            }
            
            // Ctrl/Cmd + F = Focus search
            if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
                e.preventDefault();
                const searchInput = document.getElementById('searchInput');
                if (searchInput) {
                    searchInput.focus();
                }
            }
            
            // Escape = Clear search
            if (e.key === 'Escape') {
                const searchInput = document.getElementById('searchInput');
                if (searchInput && searchInput.value) {
                    searchInput.value = '';
                    filterMiners();
                }
            }
        });

        // Add keyboard shortcut hints
        function showKeyboardShortcuts() {
            const modal = document.createElement('div');
            modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 10000;';
            modal.onclick = (e) => { if (e.target === modal) modal.remove(); };

            const content = document.createElement('div');
            content.style.cssText = 'background: #1a1a2e; padding: 30px; border-radius: 15px; max-width: 500px; border: 2px solid #673dec;';
            
            content.innerHTML = `
                <h2 style="color: #00ff7f; margin-bottom: 20px; display: flex; align-items: center; gap: 10px;">
                    <span class="material-icons">keyboard</span>
                    Keyboard Shortcuts
                </h2>
                <div style="display: flex; flex-direction: column; gap: 12px; color: #fff;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span>Export CSV</span>
                        <kbd style="background: #673dec; padding: 6px 12px; border-radius: 4px; font-family: monospace;">Ctrl+E</kbd>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span>Focus Search</span>
                        <kbd style="background: #673dec; padding: 6px 12px; border-radius: 4px; font-family: monospace;">Ctrl+F</kbd>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span>Clear Search</span>
                        <kbd style="background: #673dec; padding: 6px 12px; border-radius: 4px; font-family: monospace;">Escape</kbd>
                    </div>
                </div>
                <div style="text-align: center; margin-top: 20px;">
                    <button onclick="this.closest('div').parentElement.remove()" style="background: #673dec; border: none; padding: 10px 20px; border-radius: 6px; color: white; cursor: pointer; font-weight: 600;">
                        Got it!
                    </button>
                </div>
            `;

            modal.appendChild(content);
            document.body.appendChild(modal);
        }

// Initialize on load
window.addEventListener('DOMContentLoaded', async () => {
    // Prüfe ob loadPriceData existiert
    if (typeof loadPriceData === 'function') {
        await loadPriceData(); // Preise laden ZUERST
    } else {
        console.warn('⚠️ loadPriceData() not found - price data will not be loaded');
    }
    initializeData(); // Dann Miner-Daten laden
});