/**
 * Maintenance Discount Calculator for GoMining
 * 
 * Discount Rules:
 * 
 * System 36/378 (Default):
 * - Maximum 20% discount at 378 days of maintenance coverage
 * - < 36 days = 0%
 * - 36-53 days = 1%
 * - 54-71 days = 2%
 * - Linear scaling: Every 18 days of coverage = +1% discount
 * - Formula: Discount% = floor((coverageDays - 18) / 18), capped at 20%
 * 
 * System 18/360 (Alternative):
 * - Maximum 20% discount at 360 days of maintenance coverage
 * - < 18 days = 0%
 * - 18-35 days = 1%
 * - 36-53 days = 2%
 * - Linear scaling: Every 18 days of coverage = +1% discount
 * - Formula: Discount% = floor(coverageDays / 18), capped at 20%
 * 
 * Coverage Days = GMT Value / Daily Maintenance Cost
 */

// Constants
const ELECTRICITY_COST_PER_KWH = 0.05; // $0.05 per kWh
const SERVICE_COST_PER_TH = 0.0089; // $0.0089 per TH per day
const MAX_DISCOUNT_PERCENT = 20;
const DAYS_PER_PERCENT = 18;

// System-specific constants
const SYSTEMS = {
    '36-378': {
        MIN_COVERAGE_DAYS: 36,
        MAX_COVERAGE_DAYS: 378,
        OFFSET: 18  // offset for formula
    },
    '18-360': {
        MIN_COVERAGE_DAYS: 18,
        MAX_COVERAGE_DAYS: 360,
        OFFSET: 0   // no offset
    }
};

/**
 * Get current system configuration
 */
function getSystemConfig() {
    const system = window.discountSystem || '36-378';
    return SYSTEMS[system];
}

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
    const config = getSystemConfig();
    
    if (coverageDays < config.MIN_COVERAGE_DAYS) {
        return 0;
    }
    
    if (coverageDays >= config.MAX_COVERAGE_DAYS) {
        return MAX_DISCOUNT_PERCENT;
    }
    
    // Formula depends on system:
    // 36/378: floor((coverageDays - 18) / 18)
    // 18/360: floor(coverageDays / 18)
    const discount = Math.floor((coverageDays - config.OFFSET) / DAYS_PER_PERCENT);
    
    // Cap at 20%
    return Math.min(discount, MAX_DISCOUNT_PERCENT);
}

/**
 * Calculate coverage days needed for a specific discount percentage
 */
function calculateDaysForDiscount(discountPercent) {
    const config = getSystemConfig();
    
    if (discountPercent === 0) {
        return 0;
    }
    
    // Formula depends on system:
    // 36/378: (discountPercent × 18) + 18 = 36, 54, 72, ..., 378
    // 18/360: (discountPercent × 18) = 18, 36, 54, ..., 360
    return (discountPercent * DAYS_PER_PERCENT) + config.OFFSET;
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
    // Check calculation mode
    const mode = window.calculationMode || 'static';
    
    if (mode === 'static') {
        calculateDiscountStatic();
    } else if (mode === 'iterative') {
        calculateDiscountIterative();
    }
}

/**
 * Static calculation (original method)
 */
function calculateDiscountStatic() {
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
 * Iterative calculation 
 * Calculates GMT requirements by stepping through each discount level (1% to 20%)
 * and applying the discount to reduce daily costs for the next iteration
 */
function calculateDiscountIterative() {
    // Get input values
    const th = parseFloat(document.getElementById('total-th').value) || 0;
    const efficiency = parseFloat(document.getElementById('efficiency').value) || 20;
    const gmtPrice = parseFloat(document.getElementById('gmt-price').value) || 0.4269;
    const baseDiscount = parseFloat(document.getElementById('base-discount').value) || 0;
    
    // Sync slider
    document.getElementById('th-slider').value = th;
    
    // Calculate base maintenance costs (without any GMT discount)
    const baseCosts = calculateMaintenanceCosts(th, efficiency);
    const baseDailyCost = baseCosts.total;
    
    // Apply base discount to get starting daily cost
    let currentDailyCost = baseDailyCost * (1 - baseDiscount / 100);
    
    // Tracking variables
    let accumulatedGMTValue = 0; // Total $ value of GMT accumulated
    let currentGMTDiscount = 0; // Current GMT-based discount (0-20%)
    let previousCoverageDays = 0; // Track previous level's coverage days
    
    // Store results for each discount level
    const iterativeResults = {};
    
    // Key discount levels to calculate: 1%, 5%, 10%, 15%, 20%
    const targetLevels = [1, 5, 10, 15, 20];
    
    // Iterate through each percentage from 1 to 20
    for (let discountLevel = 1; discountLevel <= MAX_DISCOUNT_PERCENT; discountLevel++) {
        // Calculate coverage days required for this discount level
        const requiredCoverageDays = calculateDaysForDiscount(discountLevel);
        
        // Calculate INCREMENTAL days (additional days needed from previous level)
        const incrementalDays = requiredCoverageDays - previousCoverageDays;
        
        // How much GMT value needed for these INCREMENTAL days at CURRENT reduced cost?
        const gmtValueNeeded = currentDailyCost * incrementalDays;
        
        // Accumulate total GMT value
        accumulatedGMTValue += gmtValueNeeded;
        
        // Store result if this is a target level
        if (targetLevels.includes(discountLevel)) {
            const gmtTokens = accumulatedGMTValue / gmtPrice;
            iterativeResults[discountLevel] = {
                gmtTokens: gmtTokens,
                gmtValue: accumulatedGMTValue,
                coverageDays: requiredCoverageDays,
                effectiveDailyCost: currentDailyCost,
                totalDiscount: baseDiscount + discountLevel,
                incrementalDays: incrementalDays
            };
        }
        
        // Update for next iteration
        previousCoverageDays = requiredCoverageDays;
        currentGMTDiscount = discountLevel;
        const totalDiscount = baseDiscount + currentGMTDiscount;
        currentDailyCost = baseDailyCost * (1 - totalDiscount / 100);
    }
    
    // Calculate current user's discount
    const currentGMT = parseFloat(document.getElementById('current-gmt').value) || 0;
    const gmtValue = currentGMT * gmtPrice;
    
    // Find what discount level the user currently has by iterating
    let userCoverageDays = 0;
    let userTokenDiscount = 0;
    let userEffectiveCost = baseDailyCost * (1 - baseDiscount / 100);
    
    if (currentGMT > 0) {
        let tempAccumulatedValue = 0;
        let tempDiscount = 0;
        let tempDailyCost = baseDailyCost * (1 - baseDiscount / 100);
        let tempPreviousCoverageDays = 0;
        
        // Iterate to find current discount
        for (let level = 1; level <= MAX_DISCOUNT_PERCENT; level++) {
            const daysNeeded = calculateDaysForDiscount(level);
            const incrementalDays = daysNeeded - tempPreviousCoverageDays;
            const valueNeeded = tempDailyCost * incrementalDays;
            tempAccumulatedValue += valueNeeded;
            
            if (gmtValue >= tempAccumulatedValue) {
                userTokenDiscount = level;
                userEffectiveCost = tempDailyCost;
                userCoverageDays = daysNeeded;
                
                // Update for next level
                tempPreviousCoverageDays = daysNeeded;
                tempDiscount = level;
                tempDailyCost = baseDailyCost * (1 - (baseDiscount + tempDiscount) / 100);
            } else {
                break;
            }
        }
    }
    
    const userTotalDiscount = baseDiscount + userTokenDiscount;
    
    // Display daily costs with user's current discount
    const discountedElectricity = baseCosts.electricity * (1 - userTotalDiscount / 100);
    const discountedService = baseCosts.service * (1 - userTotalDiscount / 100);
    const discountedTotal = baseCosts.total * (1 - userTotalDiscount / 100);
    
    const electricityGMT = discountedElectricity / gmtPrice;
    const serviceGMT = discountedService / gmtPrice;
    const totalGMT = discountedTotal / gmtPrice;
    
    document.getElementById('daily-electricity').innerText = `$${discountedElectricity.toFixed(4)}`;
    document.getElementById('daily-electricity-gmt').innerText = `${electricityGMT.toFixed(8)} GMT`;
    document.getElementById('daily-service').innerText = `$${discountedService.toFixed(4)}`;
    document.getElementById('daily-service-gmt').innerText = `${serviceGMT.toFixed(8)} GMT`;
    document.getElementById('daily-total').innerText = `$${discountedTotal.toFixed(4)}`;
    document.getElementById('daily-total-gmt').innerText = `${totalGMT.toFixed(8)} GMT`;
    
    // Generate discount cards using iterative results
    generateDiscountCardsIterative(iterativeResults, gmtPrice, baseDiscount, baseDailyCost);
    
    // Update current discount display
    document.getElementById('current-discount').innerText = `${userTotalDiscount.toFixed(1)}%`;
    document.getElementById('coverage-days').innerText = `Coverage: ${userCoverageDays} days (Base: ${baseDiscount.toFixed(1)}% + Token: ${userTokenDiscount.toFixed(1)}%)`;
    
    // Update color based on discount level
    const discountElement = document.getElementById('current-discount');
    if (userTotalDiscount >= 15) {
        discountElement.className = 'text-lg font-bold text-green-400';
    } else if (userTotalDiscount >= 10) {
        discountElement.className = 'text-lg font-bold text-yellow-400';
    } else if (userTotalDiscount >= 5) {
        discountElement.className = 'text-lg font-bold text-orange-400';
    } else if (userTotalDiscount >= 1) {
        discountElement.className = 'text-lg font-bold text-blue-400';
    } else {
        discountElement.className = 'text-lg font-bold text-gray-400';
    }
}

/**
 * Generate discount cards using iterative calculation results
 */
function generateDiscountCardsIterative(iterativeResults, gmtPrice, baseDiscount, baseDailyCost) {
    const container = document.getElementById('discount-cards');
    container.innerHTML = '';
    
    const currentGMT = parseFloat(document.getElementById('current-gmt').value) || 0;
    
    // Display cards for each target level
    Object.keys(iterativeResults).sort((a, b) => a - b).forEach(discountPercent => {
        const result = iterativeResults[discountPercent];
        const gmtTokens = result.gmtTokens;
        const gmtStillNeeded = Math.max(0, gmtTokens - currentGMT);
        
        // Calculate savings based on the effective daily cost at this level
        const savingsPerDay = (baseDailyCost * discountPercent) / 100;
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
                <span class="text-gray-400 text-sm">${result.coverageDays} days</span>
            </div>
            
            <div class="space-y-2">
                <div>
                    <p class="text-xs text-gray-400">GMT Tokens Required (Iterative)</p>
                    <p class="text-2xl font-bold text-purple-400">${gmtTokens.toFixed(8)}</p>
                    ${currentGMT > 0 ? `<p class="text-xs text-green-400 mt-1">Still need: ${gmtStillNeeded.toFixed(8)} GMT</p>` : ''}
                </div>
                
                <div>
                    <p class="text-xs text-gray-400">Value in USD</p>
                    <p class="text-lg font-semibold text-white">$${result.gmtValue.toFixed(2)}</p>
                </div>
                
                <div>
                    <p class="text-xs text-gray-400">Effective Daily Cost at this level</p>
                    <p class="text-sm text-gray-300">$${result.effectiveDailyCost.toFixed(4)}</p>
                </div>
                
                <div class="border-t border-gray-600 pt-2 mt-2">
                    <p class="text-xs text-gray-400">Daily Savings vs Base</p>
                    <p class="text-sm font-semibold text-green-400">$${savingsPerDay.toFixed(2)}/day</p>
                    <p class="text-xs text-gray-400">${savingsPerDayGMT.toFixed(2)} GMT/day</p>
                    <p class="text-xs text-gray-400 mt-1">Monthly: $${savingsPerMonth.toFixed(2)} (${savingsPerMonthGMT.toFixed(2)} GMT)</p>
                </div>
            </div>
        `;
        
        container.appendChild(card);
    });
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
    if (totalDiscount >= 15) {
        discountElement.className = 'text-3xl font-bold text-green-400';
    } else if (totalDiscount >= 10) {
        discountElement.className = 'text-3xl font-bold text-yellow-400';
    } else if (totalDiscount >= 5) {
        discountElement.className = 'text-3xl font-bold text-orange-400';
    } else if (totalDiscount >= 1) {
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
