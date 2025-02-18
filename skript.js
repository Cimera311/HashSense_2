		let BitcoinPrice = null; // Speichert den Bitcoin-Preis
		let GMTPrice = null; // Speichert den Gomining-Token-Preis
		let currentCurrency = 'USD'; // Standardwährung
		
		    document.addEventListener('DOMContentLoaded', () => {
				fetchBTCPrice();
				fetchGMTPrice();
                calculateWeeklyRewardSolo();
                calculateWeeklyMWReward();
				});
		function updateCurrency(currency) {
				currentCurrency = currency; // Setze die aktuelle Währung
				generateRevenueTable(document.getElementById('bitcoin-price-dropdown').value, document.getElementById('sat-TH').value, document.getElementById('gmt-token-price').value); // Aktualisiere die Tabelle
			}

            const tabs = [
                { name: "Solo-Mining", id: "Calc", description: "Configure your miner settings and calculate your daily, weekly, and monthly earnings for Solo Mining." },
                { name: "Secondary Market ROI", id: "ROI", description: "Calculate the return on investment (ROI) and yearly profitability buying a miner." },
                { name: "New Miner Invest", id: "New Miner Invest", description: "Compare miner efficiency and costs to plan your future investments." },
                { name: "Miner wars", id: "miner wars", description: "Analyze weekly rewards. Solo mining vs. miner wars." },
                //{ name: "worth it ?", id: "worth", description: "Compare earnings and costs in different currencies." }
            ];

            let currentTab = 0;
            function switchTab(direction) {
                document.getElementById(tabs[currentTab].id).classList.remove("active");
                currentTab = (currentTab + direction + tabs.length) % tabs.length;
                document.getElementById("tab-name").innerText = tabs[currentTab].name;
                document.getElementById("tab-description").innerText = tabs[currentTab].description;
                document.getElementById(tabs[currentTab].id).classList.add("active");
            }



        function updateBTCPrice() {
            const dropdown = document.getElementById('bitcoin-price-dropdown');
            const selectedValue = dropdown.value;

            if (selectedValue === 'current price') {
                // Benutzerdefinierten Preis abfragen
                fetchBTCPrice();
                fetchGMTPrice();
            } 
                
        }


		async function fetchBTCPrice() {
			try {
                const dropdown = document.getElementById('bitcoin-price-dropdown');
				const response = await fetch('https://api.coinpaprika.com/v1/tickers/btc-bitcoin');
				const data = await response.json();
				btcPrice = parseFloat(data.quotes.USD.price).toFixed(0); // Speichere den gefetcheten Bitcoin-Preis in der globalen Variable
                const selectedOption = dropdown.querySelector('#currentp');
                selectedOption.value = btcPrice;
                selectedOption.text = formatDollar(btcPrice);   
                selectedOption.selected = true;
			} catch (error) {
				console.error('Error fetching BTC Price:', error);
				alert('Failed to fetch BTC Price. Please try again later.');
			}
		}
        
		async function fetchGMTPrice() {
				try {
					const response = await fetch('https://api.coinpaprika.com/v1/tickers/gmt-gomining-token');
					const data = await response.json();
					const gominingPrice = parseFloat(data.quotes.USD.price).toFixed(4); // Abrufen des Preises in USD


					// Wert in Feld und Slider setzen
					document.getElementById('gmt-token-price').value = gominingPrice;
					console.log(`Gomining Price: $${gominingPrice}`);
				} catch (error) {
					console.error('Error fetching Gomining Token Price:', error);
					alert('Failed to fetch Gomining Token Price. Please try again later.');
				}
			}




			function syncFieldAndSlider(event, fieldId, sliderId) {
				const field = document.getElementById(fieldId);
				const slider = document.getElementById(sliderId);

				if (event.target === field) {
					slider.value = field.value; // Aktualisiert den Slider basierend auf dem Eingabefeld
				} else if (event.target === slider) {
					field.value = slider.value; // Aktualisiert das Eingabefeld basierend auf dem Slider
				}
			}




            function calculateCost() {
                const BTC = parseFloat(document.getElementById('bitcoin-price-dropdown').value);       

				const th = parseFloat(document.getElementById('My_TH').value);
                const efficiency = parseFloat(document.getElementById('Energy-efficiency').value);
                const discount = parseFloat(document.getElementById('gomining-discount').value);

                const dailyReward = parseFloat(document.getElementById('Daily-Reward').value);
                const costPerKWh = 0.05;
                const daily_cost = 0.0089;

                if (isNaN(efficiency) || isNaN(th) || isNaN(BTC) || isNaN(dailyReward)) {
                    alert("Please fill out all fields!");
                    return;
                }
                
                // Daily calculations
				const dailyElectricityCost = ((efficiency * th * 0.05 * 24) / 1000 ) * ((100 - discount) / 100); // Kosten für Strom
                const dailyElectricityCostBTC = dailyElectricityCost / BTC 


                const dailyServiceCostBTC = (daily_cost / BTC )* th ;
                const dailyServiceCost = dailyServiceCostBTC * BTC * ((100 - discount) / 100);
                const dailyTotalMaintenanceCost = dailyElectricityCost + dailyServiceCost;
                const dailyRewardsInUSD = (dailyReward * 0.00000001) * BTC;
                const dailyNetProfitInUSD = dailyRewardsInUSD - dailyTotalMaintenanceCost;
                
                const weeklyRewardsInUSD = dailyRewardsInUSD * 7;
                const weeklyMaintenanceCostInUSD = dailyTotalMaintenanceCost * 7;
                const weeklyNetProfitInUSD = weeklyRewardsInUSD - weeklyMaintenanceCostInUSD;
                
                const monthlyRewardsInUSD = dailyRewardsInUSD * 30;
                const monthlyMaintenanceCostInUSD = dailyTotalMaintenanceCost * 30;
                const monthlyNetProfitInUSD = monthlyRewardsInUSD - monthlyMaintenanceCostInUSD;

                // BTC values
                const dailyRewardsInBTC = dailyReward * 0.00000001;
                const dailyElectricityCostInBTC = dailyElectricityCost / BTC;
                const dailyServiceCostInBTC = dailyServiceCost / BTC;
                const dailyMaintenanceCostInBTC = dailyTotalMaintenanceCost / BTC;
                const dailyNetProfitInBTC = dailyNetProfitInUSD / BTC;
                const weeklyRewardsInBTC = dailyRewardsInBTC * 7;
                const weeklyMaintenanceCostInBTC = weeklyMaintenanceCostInUSD / BTC;
                const weeklyNetProfitInBTC = weeklyNetProfitInUSD / BTC;
                const monthlyRewardsInBTC = dailyRewardsInBTC * 30;
                const monthlyMaintenanceCostInBTC = monthlyMaintenanceCostInUSD / BTC;
                const monthlyNetProfitInBTC = monthlyNetProfitInUSD / BTC;
                const totalCosts = dailyElectricityCost + dailyServiceCost; // Gesamtkosten (Strom + Service)
                const costPercentage = (totalCosts / dailyRewardsInUSD) * 100; // Prozentuale Kosten




                // Update table
                document.getElementById('daily-rewards').innerText = `${dailyRewardsInUSD.toFixed(2)}`;
                document.getElementById('daily-rewards-btc').innerText = `${dailyRewardsInBTC.toFixed(8)}`;
                document.getElementById('electricity-cost').innerText = `${dailyElectricityCost.toFixed(2)}`;
                document.getElementById('electricity-cost-btc').innerText = `${dailyElectricityCostInBTC.toFixed(8)}`;
                document.getElementById('service-cost').innerText = `${dailyServiceCost.toFixed(2)}`;
                document.getElementById('service-cost-btc').innerText = `${dailyServiceCostInBTC.toFixed(8)}`;
                document.getElementById('daily-maintenance-cost').innerText = `${dailyTotalMaintenanceCost.toFixed(2)}`;
                document.getElementById('daily-maintenance-cost-btc').innerText = `${dailyMaintenanceCostInBTC.toFixed(8)}`;
                document.getElementById('daily-net-profit').innerText = `${dailyNetProfitInUSD.toFixed(2)}`;
                document.getElementById('daily-net-profit-btc').innerText = `${dailyNetProfitInBTC.toFixed(8)}`;
                document.getElementById('weekly-rewards').innerText = `${weeklyRewardsInUSD.toFixed(2)}`;
                document.getElementById('weekly-rewards-btc').innerText = `${weeklyRewardsInBTC.toFixed(8)}`;
                document.getElementById('weekly-maintenance-cost').innerText = `${weeklyMaintenanceCostInUSD.toFixed(2)}`;
                document.getElementById('weekly-maintenance-cost-btc').innerText = `${weeklyMaintenanceCostInBTC.toFixed(8)}`;
                document.getElementById('weekly-net-profit').innerText = `${weeklyNetProfitInUSD.toFixed(2)}`;
                document.getElementById('weekly-net-profit-btc').innerText = `${weeklyNetProfitInBTC.toFixed(8)}`;
                document.getElementById('monthly-rewards').innerText = `${monthlyRewardsInUSD.toFixed(2)}`;
                document.getElementById('monthly-rewards-btc').innerText = `${monthlyRewardsInBTC.toFixed(8)}`;
                document.getElementById('monthly-maintenance-cost').innerText = `${monthlyMaintenanceCostInUSD.toFixed(2)}`;
                document.getElementById('monthly-maintenance-cost-btc').innerText = `${monthlyMaintenanceCostInBTC.toFixed(8)}`;
                document.getElementById('monthly-net-profit').innerText = `${monthlyNetProfitInUSD.toFixed(2)}`;
                document.getElementById('monthly-net-profit-btc').innerText = `${monthlyNetProfitInBTC.toFixed(8)}`;
                document.getElementById('maintenance').innerText = `${costPercentage.toFixed(2)} %`; // Wert aktualisieren
            }
            function calculateMobileView() {
                const dailyRevenue = parseFloat(document.getElementById('daily-revenue').textContent.replace('$', ''));
                const dailyMaintenance = parseFloat(document.getElementById('daily-maintenance').textContent.replace('$', ''));
                const dailyNet = dailyRevenue - dailyMaintenance;

                // Wöchentliche Werte
                const weeklyRevenue = dailyRevenue * 7;
                const weeklyMaintenance = dailyMaintenance * 7;
                const weeklyNet = dailyNet * 7;

                // Monatliche Werte (30 Tage)
                const monthlyRevenue = dailyRevenue * 30;
                const monthlyMaintenance = dailyMaintenance * 30;
                const monthlyNet = dailyNet * 30;

                // Werte aktualisieren
                document.getElementById('daily-net').textContent = `$${dailyNet.toFixed(2)}`;
                document.getElementById('weekly-revenue').textContent = `$${weeklyRevenue.toFixed(2)}`;
                document.getElementById('weekly-maintenance').textContent = `$${weeklyMaintenance.toFixed(2)}`;
                document.getElementById('weekly-net').textContent = `$${weeklyNet.toFixed(2)}`;
                document.getElementById('monthly-revenue').textContent = `$${monthlyRevenue.toFixed(2)}`;
                document.getElementById('monthly-maintenance').textContent = `$${monthlyMaintenance.toFixed(2)}`;
                document.getElementById('monthly-net').textContent = `$${monthlyNet.toFixed(2)}`;
            }

			function calculateROI() {
				// Eingabefelder abrufen
				const bitcoinPrice = parseFloat(document.getElementById('bitcoin-price-dropdown').value);
				const gominingPrice = parseFloat(document.getElementById('gmt-token-price').value);
				const myTH = parseFloat(document.getElementById('My_TH_ROI').value);
				const energyEfficiency = parseFloat(document.getElementById('Energy-efficiency_ROI').value);
				const gominingDiscount = parseFloat(document.getElementById('gomining-discount_ROI').value);
				const pricePerTH = parseFloat(document.getElementById('price-per-th_ROI').value);
				const satoshiPerTH = parseFloat(document.getElementById('sat-TH').value);
				// Validierung der Eingaben Satoshi-per-TH_ROI
				if (
					isNaN(bitcoinPrice) || isNaN(gominingPrice) ||
					isNaN(myTH) || isNaN(energyEfficiency) ||
					isNaN(gominingDiscount) || isNaN(pricePerTH)
				) {
					alert("Please ensure all fields are filled correctly.");
					return;
				}

				// Berechnungen
				const totalInvestment = pricePerTH * myTH;
				const dailyRevenue = (satoshiPerTH * myTH * bitcoinPrice) / 1e8; // 
				const electricityCost = ((energyEfficiency * myTH * 0.05 * 24) / 1000 ) * ((100 - gominingDiscount) / 100); // Kosten für Strom
				const serviceCostBTC = (0.0089 / bitcoinPrice) * myTH; // Servicekosten pro TH
				const dailyServiceCost = serviceCostBTC * bitcoinPrice * ((100 - gominingDiscount) / 100);
				const totalMaintenanceCost = (electricityCost + dailyServiceCost) 
				const dailyProfit = dailyRevenue - totalMaintenanceCost;

				const monthlyProfit = dailyProfit * 30; // Monatlicher Gewinn
				const yearlyProfit = dailyProfit * 365; // Jährlicher Gewinn
				const daysOfROI = totalInvestment / dailyProfit; // ROI in Tagen
				const roiPercentage = (yearlyProfit / totalInvestment) * 100; // ROI in %
				const yearlyNetBTC = dailyProfit / bitcoinPrice * 365; // Daily Profit in BTC * 365 Tage

				// Ergebnisse in der UI anzeigen
				document.getElementById('total-investment_ROI').textContent = `$${totalInvestment.toFixed(2)}`;
				document.getElementById('daily-profit_ROI').textContent = `$${dailyProfit.toFixed(2)}`;
				document.getElementById('monthly-profit_ROI').textContent = `$${monthlyProfit.toFixed(2)}`;
				document.getElementById('yearly-profit_ROI').textContent = `$${yearlyProfit.toFixed(2)}`;
				document.getElementById('days-of-roi_ROI').textContent = `${Math.ceil(daysOfROI)} Days`;
				document.getElementById('roi-percentage_ROI').textContent = `${roiPercentage.toFixed(2)}%`;
				document.getElementById('yearly-net-btc_ROI').textContent = `${yearlyNetBTC.toFixed(8)} BTC`;
			}


			function generateRevenueTable(btcPrice, satPerTH, GMTPrice) {
				const tbody = document.getElementById('revenue-summary').querySelector('tbody');
				tbody.innerHTML = ''; // Tabelle zurücksetzen

				const costPerKWh = 0.05; // Stromkosten pro kWh
				const dailyServiceCostPerTHInBTC = 0.0089 / btcPrice; // Servicekosten in BTC
				const dailyServiceCostPerTHInUSD = dailyServiceCostPerTHInBTC * btcPrice; // Servicekosten in USD
				const dailyServiceCostPerTHInGMT = dailyServiceCostPerTHInUSD / GMTPrice; // Servicekosten in GMT

				const wthValues = [35, 30, 25, 20, 15]; // Effizienzstufen
				const th = document.getElementById('My_TH').value; // 1 TH für die Berechnung

				// Tabellenkopf generieren
				const thead = document.getElementById('revenue-summary').querySelector('thead');
				thead.innerHTML = `
					<tr>
						<th>W/TH</th>
						${wthValues.map(wth => `<th>${wth} W/TH</th>`).join('')}
					</tr>
				`;

				// Tabellenzeilen generieren
				const rows = [
					{ label: 'Revenue', values: [] },
					{ label: 'Maintenance', values: [] },
					{ label: 'Net Revenue', values: [] },
					{ label: 'Net %', values: [] }
				];

				wthValues.forEach(wth => {
					const dailyRevenueInBTC = (satPerTH / 1e8 ) * th; // Revenue in BTC
					const dailyRevenueInUSD = dailyRevenueInBTC * btcPrice; // Revenue in USD
					const dailyRevenueInGMT = dailyRevenueInUSD / GMTPrice; // Revenue in GMT

					const dailyElectricityCost = (wth * th * costPerKWh * 24) / 1000; // Stromkosten in USD
					const maintenanceCostBTC = dailyServiceCostPerTHInBTC * th; // Servicekosten in BTC
					const maintenanceCostUSD = maintenanceCostBTC * btcPrice + dailyElectricityCost; // Wartungskosten in USD
					const maintenanceCostGMT = maintenanceCostUSD / GMTPrice; // Wartungskosten in GMT

					const netRevenueBTC = dailyRevenueInBTC - maintenanceCostBTC; // Netto in BTC
					const netRevenueUSD = dailyRevenueInUSD - maintenanceCostUSD; // Netto in USD
					const netRevenueGMT = dailyRevenueInGMT - maintenanceCostGMT; // Netto in GMT

					const revenuePercentage = (netRevenueUSD / dailyRevenueInUSD) * 100; // Nettoerlös in %

					// Werte basierend auf der aktuellen Währung speichern
					rows[0].values.push(currentCurrency === 'USD' ? dailyRevenueInUSD.toFixed(2) :
										currentCurrency === 'BTC' ? dailyRevenueInBTC.toFixed(8) :
										dailyRevenueInGMT.toFixed(2));

					rows[1].values.push(currentCurrency === 'USD' ? maintenanceCostUSD.toFixed(2) :
										currentCurrency === 'BTC' ? maintenanceCostBTC.toFixed(8) :
										maintenanceCostGMT.toFixed(2));

					rows[2].values.push(currentCurrency === 'USD' ? netRevenueUSD.toFixed(2) :
										currentCurrency === 'BTC' ? netRevenueBTC.toFixed(8) :
										netRevenueGMT.toFixed(2));

					rows[3].values.push(revenuePercentage.toFixed(2)); // Prozentwert bleibt gleich
				});

				// Zeilen in die Tabelle einfügen
				rows.forEach(row => {
					const tr = document.createElement('tr');
					const labelCell = document.createElement('td');
					labelCell.textContent = row.label;
					tr.appendChild(labelCell);

					row.values.forEach(value => {
						const valueCell = document.createElement('td');
						valueCell.textContent = value;
						tr.appendChild(valueCell);
					});

					tbody.appendChild(tr);
				});
			}




					// Füge einen Event Listener hinzu, der das Feld "Daily-Reward" überwacht
			document.getElementById('Daily-Reward').addEventListener('input', function () {
				const dailyReward = parseFloat(document.getElementById('Daily-Reward').value); // Wert des Daily-Reward-Feldes
				const myTH = parseFloat(document.getElementById('My_TH').value); // Wert des My_TH-Feldes

				// Überprüfe, ob beide Werte gültig sind, um eine Division durch 0 zu vermeiden
				if (!isNaN(dailyReward) && !isNaN(myTH) && myTH > 0) {
					const satoshiPerTH = dailyReward / myTH; // Berechnung
					document.getElementById('sat-TH').value = satoshiPerTH.toFixed(2); // Ergebnis einfügen
				} else {
					document.getElementById('sat-TH').value = ''; // Leeren, falls ungültig
				}
			});
            function copyWalletAddress() {
    const walletInput = document.querySelector('footer input[type="text"]');
    walletInput.select();
    navigator.clipboard.writeText(walletInput.value).then(
        () => {
            alert("Wallet address copied to clipboard!");
        },
        () => {
            alert("Failed to copy wallet address.");
        }
    );
}
            
            
            
					// Füge einen Event Listener hinzu, der das Feld "Daily-Reward" überwacht
			document.getElementById('sat-TH').addEventListener('input', function () {
				const satpTH = parseFloat(document.getElementById('sat-TH').value); // Wert des Daily-Reward-Feldes
				const myTH = parseFloat(document.getElementById('My_TH').value); // Wert des My_TH-Feldes

				// Überprüfe, ob beide Werte gültig sind, um eine Division durch 0 zu vermeiden
				if (!isNaN(satpTH) && !isNaN(myTH) && myTH > 0) {
					const dailyReward = satpTH * myTH; // Berechnung
					document.getElementById('Daily-Reward').value = dailyReward.toFixed(2); // Ergebnis einfügen
				} else {
					document.getElementById('Daily-Reward').value = '0'; // Leeren, falls ungültig
				}
			});	
					// Füge einen Event Listener hinzu, der das Feld "Daily-Reward" überwacht
			document.getElementById('My_TH').addEventListener('input', function () {
				const satpTH = parseFloat(document.getElementById('sat-TH').value); // Wert des Daily-Reward-Feldes
				const myTH = parseFloat(document.getElementById('My_TH').value); // Wert des My_TH-Feldes

				// Überprüfe, ob beide Werte gültig sind, um eine Division durch 0 zu vermeiden
				if (!isNaN(satpTH) && !isNaN(myTH) && myTH > 0) {
					const dailyReward = satpTH * myTH; // Berechnung
					document.getElementById('Daily-Reward').value = dailyReward.toFixed(2); // Ergebnis einfügen
				} else {
					document.getElementById('Daily-Reward').value = '0'; // Leeren, falls ungültig
				}
			});
	    					// Füge einen Event Listener hinzu, der das Feld "Daily-Reward" überwacht
			document.getElementById('th-slider').addEventListener('input', function () {
				const satpTH = parseFloat(document.getElementById('sat-TH').value); // Wert des Daily-Reward-Feldes
				const myTH = parseFloat(document.getElementById('My_TH').value); // Wert des My_TH-Feldes

				// Überprüfe, ob beide Werte gültig sind, um eine Division durch 0 zu vermeiden
				if (!isNaN(satpTH) && !isNaN(myTH) && myTH > 0) {
					const dailyReward = satpTH * myTH; // Berechnung
					document.getElementById('Daily-Reward').value = dailyReward.toFixed(2); // Ergebnis einfügen
				} else {
					document.getElementById('Daily-Reward').value = '0'; // Leeren, falls ungültig
				}
			});
			document.addEventListener('DOMContentLoaded', () => {
			// Füge einen Event Listener für alle Eingabefelder hinzu
			const inputs = document.querySelectorAll('input');

			inputs.forEach((input, index) => {
				input.addEventListener('keydown', (event) => {
					if (event.key === 'Enter') {
						event.preventDefault(); // Verhindere das Standardverhalten (z. B. Form-Submission)
						const nextInput = inputs[index + 1]; // Nächstes Feld suchen

						if (nextInput) {
							nextInput.focus(); // Fokus auf das nächste Feld setzen
						} else {
							input.blur(); // Letztes Feld: Tastatur schließen
						}
					}
				});
			});
		});
        function setMinerValues(watt) {
                const pricePerTHField = document.getElementById('price-per-th_ROI');
                const efficiencyField = document.getElementById('Energy-efficiency_ROI');

                // Preise basierend auf Watt-Stufe
                const minerData = {
                    15: { pricePerTH: 38.99, efficiency: 15 },
                    20: { pricePerTH: 26.77, efficiency: 20 },
                    28: { pricePerTH: 18.55, efficiency: 28 },
                    35: { pricePerTH: 11.88, efficiency: 35 }
                };

                if (minerData[watt]) {
                    pricePerTHField.value = minerData[watt].pricePerTH.toFixed(2);
                    efficiencyField.value = minerData[watt].efficiency;
                } else {
                    pricePerTHField.value = '';
                    efficiencyField.value = '';
                }
                }

                let priceMatrix = null; // Variable für die Price-Matrix

        async function loadPriceMatrix() {
            try {
                const response = await fetch('https://raw.githubusercontent.com/Cimera311/Gomining_Calculator/main/priceMatrix.json');
                if (!response.ok) {
                    throw new Error('Failed to load price matrix.');
                }
                priceMatrix = await response.json();
                console.log('Price matrix loaded:', priceMatrix);
            } catch (error) {
                console.error('Error loading price matrix:', error);
            }
        }

        // Beispiel, wie die Funktion aufgerufen wird
        document.addEventListener('DOMContentLoaded', loadPriceMatrix);

        function getPriceMatrix(efficiency) {
                if (!priceMatrix) {
                    console.error('Price matrix is not loaded yet.');
                    return null;
                }
                return priceMatrix[efficiency];
            }

            const efficiencyMatrix = {
                16: { to: 15, pricePerW: 1.32 },
                17: { to: 16, pricePerW: 1.32 },
                18: { to: 17, pricePerW: 1.32 },
                19: { to: 18, pricePerW: 1.32 },
                20: { to: 19, pricePerW: 1.32 },
                21: { to: 20, pricePerW: 1.02 },
                22: { to: 21, pricePerW: 1.02 },
                23: { to: 22, pricePerW: 1.02 },
                24: { to: 23, pricePerW: 1.02 },
                25: { to: 24, pricePerW: 1.02 },
                26: { to: 25, pricePerW: 1.02 },
                27: { to: 26, pricePerW: 1.02 },
                28: { to: 27, pricePerW: 1.02 },
                29: { to: 28, pricePerW: 0.99 },
                30: { to: 29, pricePerW: 0.99 },
                31: { to: 30, pricePerW: 0.99 },
                32: { to: 31, pricePerW: 0.99 },
                33: { to: 32, pricePerW: 0.99 },
                34: { to: 33, pricePerW: 0.99 },
                35: { to: 34, pricePerW: 0.99 },
                36: { to: 35, pricePerW: 0.27 },
                37: { to: 36, pricePerW: 0.27 },
                38: { to: 37, pricePerW: 0.27 },
                39: { to: 38, pricePerW: 0.27 },
                40: { to: 39, pricePerW: 0.27 },
                41: { to: 40, pricePerW: 0.27 },
                42: { to: 41, pricePerW: 0.27 },
                43: { to: 42, pricePerW: 0.27 },
                44: { to: 43, pricePerW: 0.27 },
                45: { to: 44, pricePerW: 0.27 },
                46: { to: 45, pricePerW: 0.27 },
                47: { to: 46, pricePerW: 0.27 },
                48: { to: 47, pricePerW: 0.27 },
                49: { to: 48, pricePerW: 0.27 },
                50: { to: 49, pricePerW: 0.27 }
            };
            const priceMatrixlocal = {
                    "22": [ 	{ minTH: 	1	, pricePerTH:	22.48	},	
                                { minTH: 	2	, pricePerTH:	22.39	},	
                                { minTH: 	4	, pricePerTH:	22.31	},	
                                { minTH: 	8	, pricePerTH:	22.23	},	
                                { minTH: 	16	, pricePerTH:	22.15	},	
                                { minTH: 	32	, pricePerTH:	22.07	},	
                                { minTH: 	48	, pricePerTH:	22.00	},	
                                { minTH: 	64	, pricePerTH:	21.92	},	
                                { minTH: 	96	, pricePerTH:	21.84	},	
                                { minTH: 	128	, pricePerTH:	21.76	},	
                                { minTH: 	192	, pricePerTH:	21.69	},	
                                { minTH: 	256	, pricePerTH:	21.61	},	
                                { minTH: 	384	, pricePerTH:	21.54	},	
                                { minTH: 	512	, pricePerTH:	21.47	},	
                                { minTH: 	768	, pricePerTH:	21.39	},	
                                { minTH: 	1024	, pricePerTH:	21.32	},	
                                { minTH: 	1536	, pricePerTH:	21.25	},	
                                { minTH: 	2560	, pricePerTH:	21.18	},	
                                { minTH: 	3584	, pricePerTH:	21.11	},	],
                                                    
                    "21": [ 	{ minTH: 	1	, pricePerTH:	23.49	},	
                                { minTH: 	2	, pricePerTH:	23.41	},	
                                { minTH: 	4	, pricePerTH:	23.33	},	
                                { minTH: 	8	, pricePerTH:	23.25	},	
                                { minTH: 	16	, pricePerTH:	23.17	},	
                                { minTH: 	32	, pricePerTH:	23.09	},	
                                { minTH: 	48	, pricePerTH:	23.01	},	
                                { minTH: 	64	, pricePerTH:	22.94	},	
                                { minTH: 	96	, pricePerTH:	22.86	},	
                                { minTH: 	128	, pricePerTH:	22.78	},	
                                { minTH: 	192	, pricePerTH:	22.71	},	
                                { minTH: 	256	, pricePerTH:	22.63	},	
                                { minTH: 	384	, pricePerTH:	22.56	},	
                                { minTH: 	512	, pricePerTH:	22.48	},	
                                { minTH: 	768	, pricePerTH:	22.41	},	
                                { minTH: 	1024	, pricePerTH:	22.34	},	
                                { minTH: 	1536	, pricePerTH:	22.27	},	
                                { minTH: 	2560	, pricePerTH:	22.20	},	
                                { minTH: 	3584	, pricePerTH:	22.12	},	],
                                                    
                    "20": [ 	{ minTH: 	1	, pricePerTH:	24.51	, minerCost: 27.99 },	
                                { minTH: 	2	, pricePerTH:	24.43	},	
                                { minTH: 	4	, pricePerTH:	24.35	},	
                                { minTH: 	8	, pricePerTH:	24.27	},	
                                { minTH: 	16	, pricePerTH:	24.19	},	
                                { minTH: 	32	, pricePerTH:	24.11	},	
                                { minTH: 	48	, pricePerTH:	24.03	},	
                                { minTH: 	64	, pricePerTH:	23.95	},	
                                { minTH: 	96	, pricePerTH:	23.88	},	
                                { minTH: 	128	, pricePerTH:	23.80	},	
                                { minTH: 	192	, pricePerTH:	23.72	},	
                                { minTH: 	256	, pricePerTH:	23.65	},	
                                { minTH: 	384	, pricePerTH:	23.58	},	
                                { minTH: 	512	, pricePerTH:	23.50	},	
                                { minTH: 	768	, pricePerTH:	23.43	},	
                                { minTH: 	1024	, pricePerTH:	23.36	},	
                                { minTH: 	1536	, pricePerTH:	23.28	},	
                                { minTH: 	2560	, pricePerTH:	23.21	},	
                                { minTH: 	3584	, pricePerTH:	23.14	},	],
                                                    
                    "19": [ 	{ minTH: 	1	, pricePerTH:	25.84	},	
                                { minTH: 	2	, pricePerTH:	25.75	},	
                                { minTH: 	4	, pricePerTH:	25.67	},	
                                { minTH: 	8	, pricePerTH:	25.59	},	
                                { minTH: 	16	, pricePerTH:	25.51	},	
                                { minTH: 	32	, pricePerTH:	25.43	},	
                                { minTH: 	48	, pricePerTH:	25.35	},	
                                { minTH: 	64	, pricePerTH:	25.28	},	
                                { minTH: 	96	, pricePerTH:	25.20	},	
                                { minTH: 	128	, pricePerTH:	25.12	},	
                                { minTH: 	192	, pricePerTH:	25.05	},	
                                { minTH: 	256	, pricePerTH:	24.97	},	
                                { minTH: 	384	, pricePerTH:	24.90	},	
                                { minTH: 	512	, pricePerTH:	24.82	},	
                                { minTH: 	768	, pricePerTH:	24.75	},	
                                { minTH: 	1024	, pricePerTH:	24.68	},	
                                { minTH: 	1536	, pricePerTH:	24.61	},	
                                { minTH: 	2560	, pricePerTH:	24.54	},	
                                { minTH: 	3584	, pricePerTH:	24.47	},	],
                                                    
                    "18": [ 	{ minTH: 	1	, pricePerTH:	27.16	},	
                                { minTH: 	2	, pricePerTH:	27.08	},	
                                { minTH: 	4	, pricePerTH:	27.00	},	
                                { minTH: 	8	, pricePerTH:	26.91	},	
                                { minTH: 	16	, pricePerTH:	26.83	},	
                                { minTH: 	32	, pricePerTH:	26.76	},	
                                { minTH: 	48	, pricePerTH:	26.68	},	
                                { minTH: 	64	, pricePerTH:	26.60	},	
                                { minTH: 	96	, pricePerTH:	26.52	},	
                                { minTH: 	128	, pricePerTH:	26.45	},	
                                { minTH: 	192	, pricePerTH:	26.37	},	
                                { minTH: 	256	, pricePerTH:	26.30	},	
                                { minTH: 	384	, pricePerTH:	26.22	},	
                                { minTH: 	512	, pricePerTH:	26.15	},	
                                { minTH: 	768	, pricePerTH:	26.07	},	
                                { minTH: 	1024	, pricePerTH:	26.00	},	
                                { minTH: 	1536	, pricePerTH:	25.93	},	
                                { minTH: 	2560	, pricePerTH:	25.86	},	
                                { minTH: 	3584	, pricePerTH:	25.79	},	],
                                                    
                    "17": [ 	{ minTH: 	1	, pricePerTH:	28.48	},	
                                { minTH: 	2	, pricePerTH:	28.40	},	
                                { minTH: 	4	, pricePerTH:	28.32	},	
                                { minTH: 	8	, pricePerTH:	28.24	},	
                                { minTH: 	16	, pricePerTH:	28.16	},	
                                { minTH: 	32	, pricePerTH:	28.08	},	
                                { minTH: 	48	, pricePerTH:	28.00	},	
                                { minTH: 	64	, pricePerTH:	27.92	},	
                                { minTH: 	96	, pricePerTH:	27.85	},	
                                { minTH: 	128	, pricePerTH:	27.77	},	
                                { minTH: 	192	, pricePerTH:	27.69	},	
                                { minTH: 	256	, pricePerTH:	27.62	},	
                                { minTH: 	384	, pricePerTH:	27.54	},	
                                { minTH: 	512	, pricePerTH:	27.47	},	
                                { minTH: 	768	, pricePerTH:	27.40	},	
                                { minTH: 	1024	, pricePerTH:	27.33	},	
                                { minTH: 	1536	, pricePerTH:	27.25	},	
                                { minTH: 	2560	, pricePerTH:	27.18	},	
                                { minTH: 	3584	, pricePerTH:	27.11	},	],
                                                    
                    "16": [ 	{ minTH: 	1	, pricePerTH:	29.80	},	
                                { minTH: 	2	, pricePerTH:	29.72	},	
                                { minTH: 	4	, pricePerTH:	29.64	},	
                                { minTH: 	8	, pricePerTH:	29.56	},	
                                { minTH: 	16	, pricePerTH:	29.48	},	
                                { minTH: 	32	, pricePerTH:	29.40	},	
                                { minTH: 	48	, pricePerTH:	29.32	},	
                                { minTH: 	64	, pricePerTH:	29.25	},	
                                { minTH: 	96	, pricePerTH:	29.17	},	
                                { minTH: 	128	, pricePerTH:	29.09	},	
                                { minTH: 	192	, pricePerTH:	29.02	},	
                                { minTH: 	256	, pricePerTH:	28.94	},	
                                { minTH: 	384	, pricePerTH:	28.87	},	
                                { minTH: 	512	, pricePerTH:	28.79	},	
                                { minTH: 	768	, pricePerTH:	28.72	},	
                                { minTH: 	1024	, pricePerTH:	28.65	},	
                                { minTH: 	1536	, pricePerTH:	28.58	},	
                                { minTH: 	2560	, pricePerTH:	28.51	},	
                                { minTH: 	3584	, pricePerTH:	28.43	},	],
                                                
                    "15": [ 	{ minTH: 	1	, pricePerTH:	31.13	, minerCost: 35.99 },	
                                { minTH: 	2	, pricePerTH:	31.05	},	
                                { minTH: 	4	, pricePerTH:	30.96	},	
                                { minTH: 	8	, pricePerTH:	30.88	},	
                                { minTH: 	16	, pricePerTH:	30.80	},	
                                { minTH: 	32	, pricePerTH:	30.72	},	
                                { minTH: 	48	, pricePerTH:	30.65	},	
                                { minTH: 	64	, pricePerTH:	30.57	},	
                                { minTH: 	96	, pricePerTH:	30.49	},	
                                { minTH: 	128	, pricePerTH:	30.42	},	
                                { minTH: 	192	, pricePerTH:	30.34	},	
                                { minTH: 	256	, pricePerTH:	30.26	},	
                                { minTH: 	384	, pricePerTH:	30.19	},	
                                { minTH: 	512	, pricePerTH:	30.12	},	
                                { minTH: 	768	, pricePerTH:	30.04	},	
                                { minTH: 	1024	, pricePerTH:	29.97	},	
                                { minTH: 	1536	, pricePerTH:	29.90	},	
                                { minTH: 	2560	, pricePerTH:	29.83	},	
                                { minTH: 	3584	, pricePerTH:	29.76	},	],

                    "23": [ 	{ minTH: 	1	, pricePerTH:	21.46	},	
                                { minTH: 	2	, pricePerTH:	21.38	},	
                                { minTH: 	4	, pricePerTH:	21.30	},	
                                { minTH: 	8	, pricePerTH:	21.21	},	
                                { minTH: 	16	, pricePerTH:	21.13	},	
                                { minTH: 	32	, pricePerTH:	21.06	},	
                                { minTH: 	48	, pricePerTH:	20.98	},	
                                { minTH: 	64	, pricePerTH:	20.90	},	
                                { minTH: 	96	, pricePerTH:	20.82	},	
                                { minTH: 	128	, pricePerTH:	20.75	},	
                                { minTH: 	192	, pricePerTH:	20.67	},	
                                { minTH: 	256	, pricePerTH:	20.60	},	
                                { minTH: 	384	, pricePerTH:	20.52	},	
                                { minTH: 	512	, pricePerTH:	20.45	},	
                                { minTH: 	768	, pricePerTH:	20.37	},	
                                { minTH: 	1024	, pricePerTH:	20.30	},	
                                { minTH: 	1536	, pricePerTH:	20.23	},	
                                { minTH: 	2560	, pricePerTH:	20.16	},	
                                { minTH: 	3584	, pricePerTH:	20.09	},	],
                    "24": [ 	{ minTH: 	1	, pricePerTH:	20.44	},	
                                { minTH: 	2	, pricePerTH:	20.36	},	
                                { minTH: 	4	, pricePerTH:	20.28	},	
                                { minTH: 	8	, pricePerTH:	20.20	},	
                                { minTH: 	16	, pricePerTH:	20.12	},	
                                { minTH: 	32	, pricePerTH:	20.04	},	
                                { minTH: 	48	, pricePerTH:	19.96	},	
                                { minTH: 	64	, pricePerTH:	19.88	},	
                                { minTH: 	96	, pricePerTH:	19.80	},	
                                { minTH: 	128	, pricePerTH:	19.73	},	
                                { minTH: 	192	, pricePerTH:	19.65	},	
                                { minTH: 	256	, pricePerTH:	19.58	},	
                                { minTH: 	384	, pricePerTH:	19.50	},	
                                { minTH: 	512	, pricePerTH:	19.43	},	
                                { minTH: 	768	, pricePerTH:	19.36	},	
                                { minTH: 	1024	, pricePerTH:	19.28	},	
                                { minTH: 	1536	, pricePerTH:	19.21	},	
                                { minTH: 	2560	, pricePerTH:	19.14	},	
                                { minTH: 	3584	, pricePerTH:	19.07	},	],

                    "25": [ 	{ minTH: 	1	, pricePerTH:	19.42	},	
                                { minTH: 	2	, pricePerTH:	19.34	},	
                                { minTH: 	4	, pricePerTH:	19.26	},	
                                { minTH: 	8	, pricePerTH:	19.18	},	
                                { minTH: 	16	, pricePerTH:	19.10	},	
                                { minTH: 	32	, pricePerTH:	19.02	},	
                                { minTH: 	48	, pricePerTH:	18.94	},	
                                { minTH: 	64	, pricePerTH:	18.86	},	
                                { minTH: 	96	, pricePerTH:	18.79	},	
                                { minTH: 	128	, pricePerTH:	18.71	},	
                                { minTH: 	192	, pricePerTH:	18.63	},	
                                { minTH: 	256	, pricePerTH:	18.56	},	
                                { minTH: 	384	, pricePerTH:	18.49	},	
                                { minTH: 	512	, pricePerTH:	18.41	},	
                                { minTH: 	768	, pricePerTH:	18.34	},	
                                { minTH: 	1024	, pricePerTH:	18.27	},	
                                { minTH: 	1536	, pricePerTH:	18.19	},	
                                { minTH: 	2560	, pricePerTH:	18.12	},	
                                { minTH: 	3584	, pricePerTH:	18.05	},	],
                    "26": [ 	{ minTH: 	1	, pricePerTH:	18.40	},	
                                { minTH: 	2	, pricePerTH:	18.32	},	
                                { minTH: 	4	, pricePerTH:	18.24	},	
                                { minTH: 	8	, pricePerTH:	18.16	},	
                                { minTH: 	16	, pricePerTH:	18.08	},	
                                { minTH: 	32	, pricePerTH:	18.00	},	
                                { minTH: 	48	, pricePerTH:	17.92	},	
                                { minTH: 	64	, pricePerTH:	17.85	},	
                                { minTH: 	96	, pricePerTH:	17.77	},	
                                { minTH: 	128	, pricePerTH:	17.69	},	
                                { minTH: 	192	, pricePerTH:	17.62	},	
                                { minTH: 	256	, pricePerTH:	17.54	},	
                                { minTH: 	384	, pricePerTH:	17.47	},	
                                { minTH: 	512	, pricePerTH:	17.39	},	
                                { minTH: 	768	, pricePerTH:	17.32	},	
                                { minTH: 	1024 , pricePerTH:	17.25	},	
                                { minTH: 	1536	, pricePerTH:	17.18	},	
                                { minTH: 	2560	, pricePerTH:	17.11	},	
                                { minTH: 	3584	, pricePerTH:	17.03	},	],
                    "27": [ 	{ minTH: 	1	, pricePerTH:	17.39	},	
                                { minTH: 	2	, pricePerTH:	17.30	},	
                                { minTH: 	4	, pricePerTH:	17.22	},	
                                { minTH: 	8	, pricePerTH:	17.14	},	
                                { minTH: 	16	, pricePerTH:	17.06	},	
                                { minTH: 	32	, pricePerTH:	16.98	},	
                                { minTH: 	48	, pricePerTH:	16.91	},	
                                { minTH: 	64	, pricePerTH:	16.83	},	
                                { minTH: 	96	, pricePerTH:	16.75	},	
                                { minTH: 	128	, pricePerTH:	16.67	},	
                                { minTH: 	192	, pricePerTH:	16.60	},	
                                { minTH: 	256	, pricePerTH:	16.52	},	
                                { minTH: 	384	, pricePerTH:	16.45	},	
                                { minTH: 	512	, pricePerTH:	16.38	},	
                                { minTH: 	768	, pricePerTH:	16.30	},	
                                { minTH: 	1024	, pricePerTH:	16.23	},	
                                { minTH: 	1536	, pricePerTH:	16.16	},	
                                { minTH: 	2560	, pricePerTH:	16.09	},	
                                { minTH: 	3584	, pricePerTH:	16.02	},	],
                    "28": [ 	{ minTH: 	1	, pricePerTH:	16.37	},	
                                { minTH: 	2	, pricePerTH:	16.29	},	
                                { minTH: 	4	, pricePerTH:	16.21	},	
                                { minTH: 	8	, pricePerTH:	16.12	},	
                                { minTH: 	16	, pricePerTH:	16.04	},	
                                { minTH: 	32	, pricePerTH:	15.97	},	
                                { minTH: 	48	, pricePerTH:	15.89	},	
                                { minTH: 	64	, pricePerTH:	15.81	},	
                                { minTH: 	96	, pricePerTH:	15.73	},	
                                { minTH: 	128	, pricePerTH:	15.66	},	
                                { minTH: 	192	, pricePerTH:	15.58	},	
                                { minTH: 	256	, pricePerTH:	15.51	},	
                                { minTH: 	384	, pricePerTH:	15.43	},	
                                { minTH: 	512	, pricePerTH:	15.36	},	
                                { minTH: 	768	, pricePerTH:	15.28	},	
                                { minTH: 	1024	, pricePerTH:	15.21	},	
                                { minTH: 	1536	, pricePerTH:	15.14	},	
                                { minTH: 	2560	, pricePerTH:	15.07	},	
                                { minTH: 	3584	, pricePerTH:	15.00	},	],

                }

                const priceMatrixlocalalt = {
                    "15": [
                        { minTH: 1, pricePerTH: 31.57, minerCost: 36.99 },
                        { minTH: 2, pricePerTH: 31.49 },
                        { minTH: 4, pricePerTH: 31.41 },
                        { minTH: 8, pricePerTH: 31.33 },
                        { minTH: 16, pricePerTH: 31.25 },
                        { minTH: 32, pricePerTH: 31.17 },
                        { minTH: 64, pricePerTH: 31.02 },
                        { minTH: 128, pricePerTH: 30.87 },
                        { minTH: 256, pricePerTH: 30.72 },
                        { minTH: 512, pricePerTH: 30.57 },
                        { minTH: 1024, pricePerTH: 30.42 },
                    ],
                    "20": [
                        { minTH: 1, pricePerTH: 23.25, minerCost: 26.99 },
                        { minTH: 2, pricePerTH: 23.17 },
                        { minTH: 4, pricePerTH: 23.09 },
                        { minTH: 8, pricePerTH: 23.01 },
                        { minTH: 16, pricePerTH: 22.93 },
                        { minTH: 32, pricePerTH: 22.85 },
                        { minTH: 64, pricePerTH: 22.70 },
                        { minTH: 128, pricePerTH: 22.55 },
                        { minTH: 256, pricePerTH: 22.40 },
                        { minTH: 512, pricePerTH: 22.25 },
                        { minTH: 1024, pricePerTH: 22.10 },
                    ],
                    "28": [
                        { minTH: 1, pricePerTH: 16.30 },
                        { minTH: 2, pricePerTH: 16.22 },
                        { minTH: 4, pricePerTH: 16.14 },
                        { minTH: 8, pricePerTH: 16.06 },
                        { minTH: 16, pricePerTH: 15.98 },
                        { minTH: 32, pricePerTH: 15.90 },
                        { minTH: 64, pricePerTH: 15.75 },
                        { minTH: 128, pricePerTH: 15.59 },
                        { minTH: 256, pricePerTH: 15.44 },
                        { minTH: 512, pricePerTH: 15.30 },
                        { minTH: 1024, pricePerTH: 15.15 },
                    ],
                    "25": [
                        { minTH: 1, pricePerTH: 18.91 },
                        { minTH: 2, pricePerTH: 18.82 },
                        { minTH: 4, pricePerTH: 18.74 },
                        { minTH: 8, pricePerTH: 18.66 },
                        { minTH: 16, pricePerTH: 18.59 },
                        { minTH: 32, pricePerTH: 18.51 },
                        { minTH: 64, pricePerTH: 18.35 },
                        { minTH: 128, pricePerTH: 18.20 },
                        { minTH: 256, pricePerTH: 18.05 },
                        { minTH: 512, pricePerTH: 17.90 },
                        { minTH: 1024, pricePerTH: 17.76 },
                    ],
                    "27": [
                        { minTH: 1, pricePerTH: 17.17 },
                        { minTH: 2, pricePerTH: 17.09 },
                        { minTH: 4, pricePerTH: 17.01 },
                        { minTH: 8, pricePerTH: 16.93 },
                        { minTH: 16, pricePerTH: 16.85 },
                        { minTH: 32, pricePerTH: 16.77 },
                        { minTH: 64, pricePerTH: 16.61 },
                        { minTH: 128, pricePerTH: 16.46 },
                        { minTH: 256, pricePerTH: 16.31 },
                        { minTH: 512, pricePerTH: 16.17 },
                        { minTH: 1024, pricePerTH: 16.02 },
                    ],

                };

                function berechneUpgradeKosten(startEff, zielEff, hashRate) {
                    let totalCost = 0;
                
                    while (startEff > zielEff && efficiencyMatrix[startEff]) {
                        totalCost += efficiencyMatrix[startEff].pricePerTH * hashRate;
                        startEff = efficiencyMatrix[startEff].to; // Zum nächsten Effizienz-Level wechseln
                    }
                
                    return totalCost.toFixed(2);
                }
                
                function calculateInvest(investment, efficiency) {
                    if (isNaN(investment) || investment <= 0) {
                        alert("Please enter a valid investment amount.");
                        return;
                    }

                    const result = calculateTHAndCostForEfficiency(investment, efficiency);

                    // Ergebnisse anzeigen
                    document.getElementById('My-Th-I').textContent = result.th; // Total TH
                    document.getElementById('Total-Invest').textContent = `$${result.cost.toFixed(2)}`; // Invested Amount
                    document.getElementById('Unused-Budget').textContent = `$${result.remainingInvestment.toFixed(2)}`; // Remaining Budget

                    const averagePrice = calculateAveragePrice(result.cost, result.th);
                    document.getElementById('average-price-th').textContent = `$${averagePrice.toFixed(2)}`;


                    // ROI berechnen und anzeigen
                    const satoshiPerTH = parseFloat(document.getElementById('sat-TH').value);
                    const btcPrice = parseFloat(document.getElementById('bitcoin-price-dropdown').value);
                    

                    const roiResult = calculate_ROI_I(satoshiPerTH, result.th, efficiency, result.cost, btcPrice);


                    document.getElementById('daily-revenue-usd-I').textContent = `$${roiResult.dailyRevenueUSD}`;
                   //document.getElementById('daily-revenue-btc-I').textContent = roiResult.dailyRevenueBTC;
                   // document.getElementById('daily-revenue-gmt-I').textContent = roiResult.dailyRevenueGMT;

                    document.getElementById('daily-electricity-usd-I').textContent = `$${roiResult.dailyElectricityUSD}`;
                   // document.getElementById('daily-electricity-btc-I').textContent = roiResult.dailyElectricityBTC;
                  //  document.getElementById('daily-electricity-gmt-I').textContent = roiResult.dailyElectricityGMT;

                    document.getElementById('daily-service-usd-I').textContent = `$${roiResult.dailyServiceUSD}`;
                   // document.getElementById('daily-service-btc-I').textContent = roiResult.dailyServiceBTC;
                  // document.getElementById('daily-service-gmt-I').textContent = roiResult.dailyServiceGMT;

                    document.getElementById('daily-net-profit-I').textContent = `$${roiResult.dailyNetProfitUSD}`;
                    document.getElementById('roi-days-I').textContent = `${roiResult.roiDays} Days`;
                    document.getElementById('roi-percentage-I').textContent = `${roiResult.roiPercentage}%`;


                    // Berechne wöchentlich, monatlich und jährlich
                    const extendedValues = calculateWeeklyMonthlyYearly({
                        electricityUSD: roiResult.dailyElectricityUSD,
                        serviceUSD: roiResult.dailyServiceUSD,
                        revenueUSD: roiResult.dailyRevenueUSD,
                        netUSD: roiResult.dailyNetProfitUSD
                    });



                }
                function calculateWeeklyMonthlyYearly(dailyValues) {
                        // Berechne die Werte für Woche, Monat und Jahr
                        const weekly = {
                            electricity: dailyValues.electricityUSD * 7,
                            service: dailyValues.serviceUSD * 7,
                            reward: dailyValues.revenueUSD * 7,
                            net: dailyValues.netUSD * 7
                        };

                        const monthly = {
                            electricity: dailyValues.electricityUSD * 30,
                            service: dailyValues.serviceUSD * 30,
                            reward: dailyValues.revenueUSD * 30,
                            net: dailyValues.netUSD * 30
                        };

                        const yearly = {
                            electricity: dailyValues.electricityUSD * 365,
                            service: dailyValues.serviceUSD * 365,
                            reward: dailyValues.revenueUSD * 365,
                            net: dailyValues.netUSD * 365
                        };

                        return { weekly, monthly, yearly };
                    }




                function calculateAveragePrice(totalCost, totalTH) {
                    if (totalTH > 0) {
                        return totalCost / totalTH; // Durchschnittspreis berechnen
                    }
                    return 0; // Fallback, falls totalTH 0 ist
                }


                function calculateTHAndCostForEfficiency(investment, efficiency) {
                        const matrix = getPriceMatrix(efficiency); // Wählt die Preismatrix für die Effizienzklasse
                        const minerBaseCost = matrix[0].minerCost; // Grundpreis für den ersten TH

                        // Prüfen, ob das Investment kleiner als der Minerpreis ist
                        if (investment < minerBaseCost) {
                            return {
                                th: 0,
                                cost: 0,
                                remainingInvestment: investment,
                            };
                        }

                        let remainingInvestment = investment - minerBaseCost; // Ziehe Minerpreis ab
                        let totalTH = 1; // Start mit 1 TH (im Minerpreis enthalten)
                        let totalCost = minerBaseCost; // Minerpreis initial setzen
                        let usedPricePerTH = minerBaseCost; // Zuletzt genutzter Preis

                        for (let i = 1; i < matrix.length; i++) {
                            const pricePerTH = matrix[i].pricePerTH;
                            const nextTH = (i + 1 < matrix.length) ? matrix[i + 1].minTH : Infinity;

                            // Berechne, wie viele TH in dieser Preisstufe gekauft werden können
                            const additionalTH = Math.min(Math.floor(remainingInvestment / pricePerTH), nextTH - matrix[i].minTH);

                            if (additionalTH > 0) {
                                const costForThisTH = additionalTH * pricePerTH;
                                totalTH += additionalTH;
                                totalCost += costForThisTH;
                                remainingInvestment -= costForThisTH;
                                usedPricePerTH = pricePerTH; // Speichere den zuletzt verwendeten Preis
                            }

                            // Budget reicht nicht mehr für die nächste TH
                            if (remainingInvestment < pricePerTH) {
                                break;
                            }
                        }

                        return {
                            th: totalTH,
                            cost: totalCost,
                            remainingInvestment: remainingInvestment,
                            pricePerTH: usedPricePerTH, // Letzter Preis pro TH
                        };
                    }


                function calculate_ROI_I(satoshiPerTH, myTH, efficiency, totalInvestment, btcPrice, gmtPrice) {
                    // Daily Revenue
                    const revenue = calculateDailyRevenue(satoshiPerTH, myTH, btcPrice, gmtPrice);

                    // Daily Electricity Cost
                    const electricity = calculateDailyElectricity(myTH, efficiency, btcPrice, gmtPrice);

                    // Daily Service Cost
                    const service = calculateDailyService(myTH, btcPrice, gmtPrice);

                    // Daily Net Profit (USD)
                    const dailyNetProfitUSD = revenue.usd - (electricity.usd + service.usd);

                    // ROI in USD und GMT
                    const roiDays = dailyNetProfitUSD > 0 ? totalInvestment / dailyNetProfitUSD : Infinity;
                    const yearlyNetProfitUSD = dailyNetProfitUSD * 365;
                    const roiPercentage = (yearlyNetProfitUSD / totalInvestment) * 100;

                    return {
                        dailyRevenueUSD: revenue.usd.toFixed(2),
                        dailyRevenueBTC: revenue.btc.toFixed(8),
                        dailyRevenueGMT: revenue.gmt ? revenue.gmt.toFixed(2) : "-",
                        dailyElectricityUSD: electricity.usd.toFixed(2),
                        dailyElectricityBTC: electricity.btc ? electricity.btc.toFixed(8) : "-",
                        dailyElectricityGMT: electricity.gmt ? electricity.gmt.toFixed(2) : "-",
                        dailyServiceUSD: service.usd.toFixed(2),
                        dailyServiceBTC: service.btc ? service.btc.toFixed(8) : "-",
                        dailyServiceGMT: service.gmt ? service.gmt.toFixed(2) : "-",
                        dailyNetProfitUSD: dailyNetProfitUSD.toFixed(2),
                        roiDays: isFinite(roiDays) ? Math.ceil(roiDays) : "∞",
                        roiPercentage: roiPercentage.toFixed(2)
                    };
                }



                // Daily Electricity Cost in USD, BTC und GMT
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

                function getDiscount() {
                        const discountElement = document.getElementById('gomining-discount-I');
                        const discount = parseFloat(discountElement?.value) || 0; // Fallback zu 0%, falls leer oder ungültig
                        return Math.max(0, Math.min(discount, 100)) / 100; // Begrenzung zwischen 0% und 100% und in Dezimalform
                    }

                // Daily Service Cost in USD, BTC und GMT
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

                function formatDollar(value) {
                    // Versuche, den Wert in eine Zahl zu konvertieren, falls er kein numerischer Typ ist
                    const numericValue = parseFloat(value);

                    // Überprüfe, ob die Konvertierung erfolgreich war
                    if (isNaN(numericValue)) {
                        console.error("Invalid value passed to formatDollar:", value);
                        return "$0.00"; // Rückgabewert bei Fehler
                    }

                    // Formatiere den Wert als Dollar ($123,456.78)
                    
                        return `$${numericValue.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
                    


                }



                // Daily Revenue (in BTC, USD, GMT)
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

                function calculateWeeklyRewardSolo() {
                    // Hole die Werte aus den entsprechenden Feldern
                    const satPerTH = parseFloat(document.getElementById('sat-TH').value);
                    const myTH = parseFloat(document.getElementById('My_TH_MW').value);

                    // Überprüfe, ob die Eingabewerte gültig sind
                    if (isNaN(satPerTH) || isNaN(myTH)) {
                        alert('Bitte geben Sie gültige Werte für Satoshi pro TH und My TH ein.');
                        return;
                    }

                    // Berechne den wöchentlichen Reward
                    const weeklyReward = satPerTH * myTH * 7;

                    // Schreibe den berechneten Wert in das Feld
                    document.getElementById('Weelky-Solo-Reward_MW').value = weeklyReward.toFixed(0);
                }
                function calculateWeeklyMWReward() {
                    // Hole die Eingabewerte
                    const rewardFund = parseFloat(document.getElementById('Reward-fund_MW').value);
                    const blockShare = parseFloat(document.getElementById('Blocksshare_MW').value) / 100; // Prozent zu Dezimal
                    const clanTH = parseFloat(document.getElementById('My-Clan_MW').value);
                    const myTH = parseFloat(document.getElementById('My_TH_MW').value);

                    // Überprüfe die Eingaben
                    if (isNaN(rewardFund) || isNaN(blockShare) || isNaN(clanTH) || isNaN(myTH) || clanTH === 0) {
                        alert('Bitte geben Sie gültige Werte ein und stellen Sie sicher, dass Clan TH nicht 0 ist.');
                        return;
                    }

                    // Berechnung
                    const myShare = (myTH / clanTH) * 100; // Prozentualer Anteil
                    // Umrechnung von rewardFund in Satoshi und Berechnung des wöchentlichen Miner Wars Rewards
                    const weeklyMWReward = (rewardFund * 100000000 * blockShare / clanTH) * myTH;


                    // Werte ins Feld schreiben
                    document.getElementById('Weelky-mw-Reward_MW').value = weeklyMWReward.toFixed(0);
                    document.getElementById('My-share-MW').value = myShare.toFixed(2);
                }
                function updateMyTHMW(change, slider, input) {
                    const myTHInput = document.getElementById(input);
                    const thSlider = document.getElementById(slider);

                    // Aktuellen Wert aus dem Input-Feld holen
                    let currentTH = parseInt(myTHInput.value) || 0;

                    // Neuen Wert berechnen
                    let newTH = currentTH + change;

                    // Sicherstellen, dass der Wert innerhalb der Slider-Min/Max-Grenzen bleibt
                    const minTH = parseInt(thSlider.min);
                    const maxTH = parseInt(thSlider.max);
                    newTH = Math.max(minTH, Math.min(maxTH, newTH));

                    // Aktualisiere das Input-Feld und den Slider
                    myTHInput.value = newTH;
                    thSlider.value = newTH;
                    myTHInput.dispatchEvent(new Event('input')); // Löst das 'oninput'-Event aus
                    // Führe die Berechnung aus
                    calculateWeeklyRewardSolo();
                }
                function highlightLargerInput() {
                    const soloRewardInput = document.getElementById('Weelky-Solo-Reward_MW');
                    const mwRewardInput = document.getElementById('Weelky-mw-Reward_MW');

                    const soloReward = parseInt(soloRewardInput.value) || 0;
                    const mwReward = parseInt(mwRewardInput.value) || 0;

                    // Zurücksetzen der Farben
                    soloRewardInput.style.color = '';
                    mwRewardInput.style.color = '';

                    // Größeren Wert hervorheben
                    if (soloReward > mwReward) {
                        soloRewardInput.style.color = 'green';
                    } else if (mwReward > soloReward) {
                        mwRewardInput.style.color = 'green';
                    }
                }
                function copyToClipboard(text) {
                    navigator.clipboard.writeText(text).then(() => {
                        alert('Wallet address copied to clipboard!');
                    }).catch(err => {
                        alert('Failed to copy: ', err);
                    });
                }
