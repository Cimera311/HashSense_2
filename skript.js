		let BitcoinPrice = null; // Speichert den Bitcoin-Preis
		let GMTPrice = null; // Speichert den Gomining-Token-Preis
		let currentCurrency = 'USD'; // Standardwährung
		
		    document.addEventListener('DOMContentLoaded', () => {
				fetchBTCPrice();
				fetchGMTPrice();
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



       /* Preise jetzt in skript-prices.js*/
      
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

let priceMatrix = null;

function loadPriceMatrix() {
    if (typeof priceMatrixdatei !== 'undefined' && Object.keys(priceMatrixdatei).length > 0) {
        priceMatrix = priceMatrixdatei;
        console.log('✅ Price matrix loaded from priceMatrix.js (priceMatrixdatei):', priceMatrix);
    } else {
        console.warn('⚠️ priceMatrixdatei is not defined or empty.');
        priceMatrix = null;
    }
}

function getPriceMatrix(efficiency) {
    if (!priceMatrix) {
        console.error('❌ Price matrix not loaded yet.');
        return null;
    }
    return priceMatrix[efficiency] || null;
}



        


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
                    const discountI = document.getElementById('gomining-discount-I');
                    const discountFarm = document.getElementById('gomining-discount');
                    const discountROI = document.getElementById('gomining-discount_ROI');
                
                    // Neuer Fallback: aus Tabellenzelle farm2
                    let discountTable = 0;
                    try {
                        const row = document.querySelector('#farm-tbody tr');
                        const cell = row?.children?.[2]; // 3. Spalte
                        if (cell) {
                            discountTable = parseFloat(cell.textContent.trim());
                        }
                    } catch (e) {
                        discountTable = 0;
                    }
                    let user_data = JSON.parse(localStorage.getItem('user_data')) || { total_discount: 0 };
                    const value =
                        parseFloat(discountI?.value) ||
                        parseFloat(discountFarm?.value) ||
                        parseFloat(discountROI?.value) ||
                        discountTable ||
                        user_data.total_discount ||
                        0;
                
                    return Math.max(0, Math.min(value, 100)) / 100;
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
                    const bitcoinPrice = parseFloat(document.getElementById('bitcoin-price-dropdown').value);

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
                function openImportModal() {
                    document.getElementById("importModal").style.display = "flex";
                }
                function closeImportModal() {
                    document.getElementById("importModal").style.display = "none";
                }
                function openConfirmDeleteModal() {
                    document.getElementById("confirmDeleteModal").style.display = "flex";
                }
                
                function closeConfirmDeleteModal() {
                    document.getElementById("confirmDeleteModal").style.display = "none";
                }
                function openHowToImportModal(page) {
                    document.getElementById(page).style.display = "block";
                }
                
                function closeHowToImportModal(page) {
                    document.getElementById(page).style.display = "none";
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
                
                
                document.addEventListener("DOMContentLoaded", function () {
                    setTableSorting();
                });
                
                function setTableSorting() {
                    document.querySelectorAll("table").forEach(table => {
                        const headers = table.querySelectorAll("th");
                
                        headers.forEach((header, columnIndex) => {
                            header.addEventListener("click", function () {
                                sortTable(table, columnIndex);
                            });
                        });
                    });
                }
                
                function sortTable(table, columnIndex) {
                    const tbody = table.querySelector("tbody");
                    const rows = Array.from(tbody.querySelectorAll("tr"));
                
                    // Prüfen, ob die Spalte Inputs enthält
                    const isInputColumn = rows[0].cells[columnIndex].querySelector("input") !== null;
                    const ascending = table.dataset.sortOrder !== "asc";
                    table.dataset.sortOrder = ascending ? "asc" : "desc";
                
                    rows.sort((rowA, rowB) => {
                        let cellA = rowA.cells[columnIndex];
                        let cellB = rowB.cells[columnIndex];
                
                        // Falls die Spalte ein Input enthält, nehme dessen Wert
                        let valueA = isInputColumn ? cellA.querySelector("input").value.trim() : cellA.innerText.trim();
                        let valueB = isInputColumn ? cellB.querySelector("input").value.trim() : cellB.innerText.trim();
                
                        // Prüfen, ob die Werte numerisch sind
                        const isNumeric = !isNaN(parseFloat(valueA)) && !isNaN(parseFloat(valueB));
                
                        if (isNumeric) {
                            return ascending
                                ? parseFloat(valueA) - parseFloat(valueB)
                                : parseFloat(valueB) - parseFloat(valueA);
                        } else {
                            return ascending
                                ? valueA.localeCompare(valueB)
                                : valueB.localeCompare(valueA);
                        }
                    });
                
                    tbody.innerHTML = "";
                    rows.forEach(row => tbody.appendChild(row));
                }
                
                
                // Falls eine neue Tabelle dynamisch erstellt wird, erneut das Sortieren aktivieren
                document.addEventListener("click", function () {
                    setTableSorting();
                });
                // Funktion bleibt
                function calculateWorth(pricePerTH, myTH) {
                    if (isNaN(pricePerTH) || isNaN(myTH)) {
                        console.error('Invalid input: pricePerTH and myTH must be numbers.');
                        return 0;
                    }
                    const worth = pricePerTH * myTH;
                    return worth.toFixed(2);
                }
                function openHowToImportModal(page) {
                    document.getElementById(page).style.display = "block";
                }
                
                function closeHowToImportModal(page) {
                    document.getElementById(page).style.display = "none";
                }

                    document.addEventListener('DOMContentLoaded', function () {
			  const toggleBtn = document.getElementById('toggleMode');
			  if (toggleBtn) {
				toggleBtn.addEventListener('click', function () {
				  document.body.classList.toggle('dark');
				});
			  }
			});      
