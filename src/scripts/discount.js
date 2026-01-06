/**
 * Maintenance Discount Calculator for GoMining
 * 
 * Discount Rules:
 * - Maximum 20% discount at 378 days of maintenance coverage
 * - < 36 days = 0%
 * - 36-53 days = 1%
 * - 54-71 days = 2%
 * - Linear scaling: Every 18 days of coverage = +1% discount
 * - Formula: Discount% = floor((coverageDays - 18) / 18), capped at 20%
 * 
 * Coverage Days = GMT Value / Daily Maintenance Cost
 */

// Constants
const ELECTRICITY_COST_PER_KWH = 0.05; // $0.05 per kWh
const SERVICE_COST_PER_TH = 0.0089; // $0.0089 per TH per day
const MAX_DISCOUNT_PERCENT = 20;
const MAX_COVERAGE_DAYS = 378;
const MIN_COVERAGE_DAYS = 36;
const DAYS_PER_PERCENT = 18;

/**
 * Calculate daily maintenance costs
 */
function calculateMaintenanceCosts(th, efficiency) {
    // Electricity Cost = (Efficiency × TH × Cost per kWh × 24 hours) / 1000
    const dailyElectricityCost = (efficiency * th * ELECTRICITY_COST_PER_KWH * 24) / 1000;
    
    // Service Cost = Service cost per TH × TH
    const dailyServiceCost = SERVICE_COST_PER_TH * th;
    
    // Total daily maintenance cost
    const dailyTotalCost = dailyElectricityCost + dailyServiceCost;
    
    return {
        electricity: dailyElectricityCost,
        service: dailyServiceCost,
        total: dailyTotalCost
    };
}

/**
 * Calculate discount percentage based on coverage days
 */
function calculateDiscountFromDays(coverageDays) {
    if (coverageDays < MIN_COVERAGE_DAYS) {
        return 0;
    }
    
    if (coverageDays >= MAX_COVERAGE_DAYS) {
        return MAX_DISCOUNT_PERCENT;
    }
    
    // Formula: floor((coverageDays - 18) / 18)
    const discount = Math.floor((coverageDays - DAYS_PER_PERCENT) / DAYS_PER_PERCENT);
    
    // Cap at 20%
    return Math.min(discount, MAX_DISCOUNT_PERCENT);
}

/**
 * Calculate coverage days needed for a specific discount percentage
 */
function calculateDaysForDiscount(discountPercent) {
    if (discountPercent === 0) {
        return 0;
    }
    
    // Formula: (discountPercent × 18) + 18
    // 1% = 36 days, 2% = 54 days, etc.
    return (discountPercent * DAYS_PER_PERCENT) + DAYS_PER_PERCENT;
}

/**
 * Calculate GMT needed for a specific discount percentage
 */
function calculateGMTForDiscount(discountPercent, dailyMaintenanceCost) {
    const daysNeeded = calculateDaysForDiscount(discountPercent);
    return daysNeeded * dailyMaintenanceCost;
}

/**
 * Main calculation function
 */
function calculateDiscount() {
    // Get input values
    const th = parseFloat(document.getElementById('total-th').value) || 0;
    const efficiency = parseFloat(document.getElementById('efficiency').value) || 20;
    const gmtPrice = parseFloat(document.getElementById('gmt-price').value) || 0.4269;
    const baseDiscount = parseFloat(document.getElementById('base-discount').value) || 0;
    
    // Sync slider
    document.getElementById('th-slider').value = th;
    
    // Calculate maintenance costs
    const costs = calculateMaintenanceCosts(th, efficiency);
    
    // Get current GMT and calculate total discount
    const currentGMT = parseFloat(document.getElementById('current-gmt').value) || 0;
    const gmtValue = currentGMT * gmtPrice;
    const rawDailyCost = costs.total;
    const actualDailyCost = rawDailyCost * (1 - baseDiscount / 100);
    const coverageDays = actualDailyCost > 0 ? gmtValue / actualDailyCost : 0;
    const tokenDiscount = calculateDiscountFromDays(coverageDays);
    const totalDiscount = baseDiscount + tokenDiscount;
    
    // Apply total discount to costs for display
    const discountedElectricity = costs.electricity * (1 - totalDiscount / 100);
    const discountedService = costs.service * (1 - totalDiscount / 100);
    const discountedTotal = costs.total * (1 - totalDiscount / 100);
    
    const electricityGMT = discountedElectricity / gmtPrice;
    const serviceGMT = discountedService / gmtPrice;
    const totalGMT = discountedTotal / gmtPrice;
    
    document.getElementById('daily-electricity').innerText = `$${discountedElectricity.toFixed(4)}`;
    document.getElementById('daily-electricity-gmt').innerText = `${electricityGMT.toFixed(8)} GMT`;
    document.getElementById('daily-service').innerText = `$${discountedService.toFixed(4)}`;
    document.getElementById('daily-service-gmt').innerText = `${serviceGMT.toFixed(8)} GMT`;
    document.getElementById('daily-total').innerText = `$${discountedTotal.toFixed(4)}`;
    document.getElementById('daily-total-gmt').innerText = `${totalGMT.toFixed(8)} GMT`;
    
    // Generate discount level cards (based on actual daily cost with base discount)
    generateDiscountCards(actualDailyCost, gmtPrice, baseDiscount);
    
    // Calculate current discount if GMT is entered
    calculateCurrentDiscount();
}

/**
 * Generate cards showing GMT needed for each discount level
 */
function generateDiscountCards(actualDailyCost, gmtPrice, baseDiscount) {
    const container = document.getElementById('discount-cards');
    container.innerHTML = '';
    
    const currentGMT = parseFloat(document.getElementById('current-gmt').value) || 0;
    
    // Key discount levels to show: 1%, 5%, 10%, 15%, 20%
    const discountLevels = [1, 5, 10, 15, 20];
    
    discountLevels.forEach(discountPercent => {
        // Calculate GMT needed based on actual daily cost (WITH base discount already applied)
        const daysNeeded = calculateDaysForDiscount(discountPercent);
        const gmtNeeded = daysNeeded * actualDailyCost;
        const gmtTokens = gmtNeeded / gmtPrice;
        const gmtStillNeeded = Math.max(0, gmtTokens - currentGMT);
        const savingsPerDay = (actualDailyCost * discountPercent) / 100;
        const savingsPerMonth = savingsPerDay * 30;
        
        const card = document.createElement('div');
        card.className = 'bg-gray-700 rounded-xl p-5 shadow-lg hover:shadow-purple-500/20 transition-shadow duration-200';
        
        // Color coding based on discount level
        let badgeColor = 'bg-gray-600';
        if (discountPercent >= 15) badgeColor = 'bg-green-600';
        else if (discountPercent >= 10) badgeColor = 'bg-yellow-600';
        else if (discountPercent >= 5) badgeColor = 'bg-orange-600';
        
        const savingsPerDayGMT = savingsPerDay / gmtPrice;
        const savingsPerMonthGMT = savingsPerMonth / gmtPrice;
        
        card.innerHTML = `
            <div class="flex items-center justify-between mb-3">
                <span class="${badgeColor} text-white px-3 py-1 rounded-full text-sm font-bold">
                    ${discountPercent}% Discount
                </span>
                <span class="text-gray-400 text-sm">${daysNeeded} days</span>
            </div>
            
            <div class="space-y-2">
                <div>
                    <p class="text-xs text-gray-400">GMT Tokens Required</p>
                    <p class="text-2xl font-bold text-purple-400">${gmtTokens.toFixed(8)}</p>
                    ${currentGMT > 0 ? `<p class="text-xs text-green-400 mt-1">Still need: ${gmtStillNeeded.toFixed(8)} GMT</p>` : ''}
                </div>
                
                <div>
                    <p class="text-xs text-gray-400">Value in USD</p>
                    <p class="text-lg font-semibold text-white">$${gmtNeeded.toFixed(2)}</p>
                </div>
                
                <div class="border-t border-gray-600 pt-2 mt-2">
                    <p class="text-xs text-gray-400">Daily Savings</p>
                    <p class="text-sm font-semibold text-green-400">$${savingsPerDay.toFixed(2)}/day</p>
                    <p class="text-xs text-gray-400">${savingsPerDayGMT.toFixed(2)} GMT/day</p>
                    <p class="text-xs text-gray-400 mt-1">Monthly: $${savingsPerMonth.toFixed(2)} (${savingsPerMonthGMT.toFixed(2)} GMT)</p>
                </div>
            </div>
        `;
        
        container.appendChild(card);
    });
    
    // Add a special card for custom discount levels
    const customCard = document.createElement('div');
    customCard.className = 'bg-gradient-to-br from-purple-900/50 to-gray-700 rounded-xl p-5 shadow-lg border border-purple-500/30';
    customCard.innerHTML = `
        <div class="flex items-center gap-2 mb-3">
            <span class="material-icons text-purple-400">tune</span>
            <span class="text-white font-bold">Custom Level</span>
        </div>
        
        <label class="block text-xs text-gray-300 mb-2">Target Discount %</label>
        <input type="number" id="custom-discount" min="0" max="20" step="1" value="8"
               class="w-full bg-gray-600 border border-gray-500 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 mb-3"
               oninput="updateCustomDiscount(${actualDailyCost}, ${gmtPrice})">
        
        <div id="custom-result" class="space-y-2">
            <!-- Will be filled by updateCustomDiscount -->
        </div>
    `;
    
    container.appendChild(customCard);
    
    // Initialize custom discount
    updateCustomDiscount(actualDailyCost, gmtPrice);
}

/**
 * Update custom discount calculation
 */
function updateCustomDiscount(actualDailyCost, gmtPrice) {
    const customDiscountInput = document.getElementById('custom-discount');
    if (!customDiscountInput) return;
    
    const currentGMT = parseFloat(document.getElementById('current-gmt').value) || 0;
    
    let discountPercent = parseInt(customDiscountInput.value) || 0;
    discountPercent = Math.max(0, Math.min(20, discountPercent)); // Clamp between 0-20
    customDiscountInput.value = discountPercent;
    
    const daysNeeded = calculateDaysForDiscount(discountPercent);
    const gmtNeeded = daysNeeded * actualDailyCost;
    const gmtTokens = gmtNeeded / gmtPrice;
    const gmtStillNeeded = Math.max(0, gmtTokens - currentGMT);
    const savingsPerDay = (actualDailyCost * discountPercent) / 100;
    
    const savingsPerDayGMT = savingsPerDay / gmtPrice;
    
    const resultDiv = document.getElementById('custom-result');
    if (resultDiv) {
        resultDiv.innerHTML = `
            <div>
                <p class="text-xs text-gray-400">GMT Tokens Required</p>
                <p class="text-2xl font-bold text-purple-400">${gmtTokens.toFixed(8)}</p>
                ${currentGMT > 0 ? `<p class="text-xs text-green-400 mt-1">Still need: ${gmtStillNeeded.toFixed(8)} GMT</p>` : ''}
            </div>
            <div>
                <p class="text-xs text-gray-400">Coverage: ${daysNeeded} days</p>
                <p class="text-sm text-gray-300">Daily Savings: $${savingsPerDay.toFixed(2)}</p>
                <p class="text-xs text-gray-400">${savingsPerDayGMT.toFixed(8)} GMT/day</p>
            </div>
        `;
    }
}

/**
 * Calculate discount based on current GMT holdings
 */
function calculateCurrentDiscount() {
    const currentGMT = parseFloat(document.getElementById('current-gmt').value) || 0;
    const gmtPrice = parseFloat(document.getElementById('gmt-price').value) || 0.4269;
    const th = parseFloat(document.getElementById('total-th').value) || 0;
    const efficiency = parseFloat(document.getElementById('efficiency').value) || 20;
    const baseDiscount = parseFloat(document.getElementById('base-discount').value) || 0;
    
    if (th === 0) {
        document.getElementById('current-discount').innerText = `${baseDiscount.toFixed(1)}%`;
        document.getElementById('coverage-days').innerText = 'Coverage: 0 days';
        return;
    }
    
    // Calculate maintenance costs
    const costs = calculateMaintenanceCosts(th, efficiency);
    const actualDailyCost = costs.total * (1 - baseDiscount / 100);
    
    // Calculate coverage days based on actual daily cost
    const gmtValue = currentGMT * gmtPrice;
    const coverageDays = gmtValue / actualDailyCost;
    
    // Calculate additional discount from tokens
    const additionalDiscount = calculateDiscountFromDays(coverageDays);
    const totalDiscount = baseDiscount + additionalDiscount;
    
    // Display results (show total discount and breakdown)
    document.getElementById('current-discount').innerText = `${totalDiscount.toFixed(1)}%`;
    document.getElementById('coverage-days').innerText = `Coverage: ${coverageDays.toFixed(0)} days (Base: ${baseDiscount.toFixed(1)}% + Token: ${additionalDiscount.toFixed(1)}%)`;
    
    // Update color based on discount level
    const discountElement = document.getElementById('current-discount');
    if (discount >= 15) {
        discountElement.className = 'text-3xl font-bold text-green-400';
    } else if (discount >= 10) {
        discountElement.className = 'text-3xl font-bold text-yellow-400';
    } else if (discount >= 5) {
        discountElement.className = 'text-3xl font-bold text-orange-400';
    } else if (discount >= 1) {
        discountElement.className = 'text-3xl font-bold text-blue-400';
    } else {
        discountElement.className = 'text-3xl font-bold text-gray-400';
    }
}

/**
 * Sync efficiency slider with input field
 */
function syncEfficiencySlider(event) {
    const value = event.target.value;
    document.getElementById('efficiency-slider').value = value;
    calculateDiscount();
}

/**
 * Sync efficiency input with slider
 */
function syncEfficiencyInput(event) {
    const value = event.target.value;
    document.getElementById('efficiency').value = value;
    calculateDiscount();
}

/**
 * Sync base discount slider with input field
 */
function syncBaseDiscountSlider(event) {
    const value = event.target.value;
    document.getElementById('base-discount-slider').value = value;
    calculateDiscount();
}

/**
 * Sync base discount input with slider
 */
function syncBaseDiscountInput(event) {
    const value = event.target.value;
    document.getElementById('base-discount').value = value;
    calculateDiscount();
}

/**
 * Calculate daily maintenance costs using the same logic as skript.js
 * Falls skript.js geladen ist, könnten wir dessen Funktionen nutzen
 */
function calculateMaintenanceCosts(th, efficiency) {
    // Electricity Cost = (Efficiency × TH × Cost per kWh × 24 hours) / 1000
    // Gleiche Berechnung wie in skript.js Zeile 177
    const dailyElectricityCost = (efficiency * th * ELECTRICITY_COST_PER_KWH * 24) / 1000;
    
    // Service Cost = Service cost per TH × TH
    // Gleiche Berechnung wie in skript.js Zeile 182
    const dailyServiceCost = SERVICE_COST_PER_TH * th;
    
    // Total daily maintenance cost
    const dailyTotalCost = dailyElectricityCost + dailyServiceCost;
    
    return {
        electricity: dailyElectricityCost,
        service: dailyServiceCost,
        total: dailyTotalCost
    };
}

/**
 * Initialize calculator on page load
 */
document.addEventListener('DOMContentLoaded', function() {
    // Fetch current GMT price from API
    fetchGMTPrice();
    
    // Set default values
    const gmtPriceInput = document.getElementById('gmt-price');
    if (gmtPriceInput && window.gmtPrice) {
        gmtPriceInput.value = window.gmtPrice;
    }
    
    // Sync TH slider with input
    const thInput = document.getElementById('total-th');
    const thSlider = document.getElementById('th-slider');
    
    if (thInput && thSlider) {
        thInput.addEventListener('input', function() {
            thSlider.value = this.value;
        });
    }
    
    // Run initial calculation
    setTimeout(() => {
        calculateDiscount();
    }, 500); // Wait for GMT price to load
    
    console.log('✅ Maintenance Discount Calculator initialized');
});

/**
 * Fetch GMT price from CoinPaprika API (same as in skript.js)
 */
function fetchGMTPrice() {
    console.log('Fetching GMT price...');
    fetch('https://api.coinpaprika.com/v1/tickers/gmt-gomining-token')
        .then(response => response.json())
        .then(data => {
            const gmtPrice = parseFloat(data.quotes.USD.price).toFixed(4);
            const priceInput = document.getElementById('gmt-price');
            
            if (priceInput) {
                priceInput.value = gmtPrice;
            }
            
            // Update global gmtPrice variable
            window.gmtPrice = parseFloat(gmtPrice);
            
            console.log('GMT Price updated:', gmtPrice);
            
            // Recalculate with new price
            calculateDiscount();
        })
        .catch(error => {
            console.error('Error fetching GMT Price:', error);
            console.log('Using default GMT price: 0.4269');
        });
}
