/**
 * GoMining Reinvestment Calculator
 * Calculates different reinvestment strategies with 5% bonus feature
 */

// ===== DISCOUNT CALCULATION CONSTANTS =====
const ELECTRICITY_COST_PER_KWH = 0.05; // $0.05 per kWh
const SERVICE_COST_PER_TH = 0.0089; // $0.0089 per TH per day
const MAX_DISCOUNT_PERCENT = 20;
const DAYS_PER_PERCENT = 18;

// Discount system configuration
const DISCOUNT_SYSTEMS = {
    '36-378': {
        MIN_COVERAGE_DAYS: 36,
        MAX_COVERAGE_DAYS: 378,
        OFFSET: 18
    },
    '18-360': {
        MIN_COVERAGE_DAYS: 18,
        MAX_COVERAGE_DAYS: 360,
        OFFSET: 0
    }
};

/**
 * Calculate discount percentage based on coverage days
 * @param {number} coverageDays - Days of maintenance coverage from GMT
 * @param {string} system - Discount system ('36-378' or '18-360')
 * @returns {number} - Discount percentage (0-20%)
 */
function calculateDiscountFromDays(coverageDays, system = '36-378') {
    const config = DISCOUNT_SYSTEMS[system];
    
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
    
    return Math.min(discount, MAX_DISCOUNT_PERCENT);
}

/**
 * Calculate dynamic discount for a specific day
 * @param {number} gmtWallet - Current GMT wallet balance
 * @param {number} lockedGMT - Locked GMT amount
 * @param {number} dailyMaintenanceCost - Daily maintenance cost in USD (before discount)
 * @param {number} gmtPrice - Current GMT price in USD
 * @param {number} baseDiscount - Base discount percentage (VIP + ServiceButton + Solo)
 * @returns {object} - Discount breakdown
 */
function calculateDynamicDiscount(gmtWallet, lockedGMT, dailyMaintenanceCost, gmtPrice, baseDiscount) {
    // 1. Calculate total GMT value (wallet + locked)
    const walletValue = gmtWallet * gmtPrice;
    const lockedValue = lockedGMT * gmtPrice;
    const totalGMTValue = walletValue + lockedValue;
    
    // 2. Calculate coverage days with base discount already applied
    const actualDailyCost = dailyMaintenanceCost * (1 - baseDiscount / 100);
    const coverageDays = actualDailyCost > 0 ? totalGMTValue / actualDailyCost : 0;
    
    // 3. Get discount from coverage days
    const tokenDiscount = calculateDiscountFromDays(coverageDays);
    
    // 4. Total discount
    const totalDiscountPercent = baseDiscount + tokenDiscount;
    const totalDiscountDecimal = totalDiscountPercent / 100;
    
    return {
        tokenDiscount: tokenDiscount,
        totalDiscountDecimal: totalDiscountDecimal,
        totalDiscountPercent: totalDiscountPercent,
        coverageDays: coverageDays,
        breakdown: {
            base: baseDiscount,
            token: tokenDiscount
        }
    };
}

// ===== GREEDY MINER FEATURE =====

/**
 * Calculate how many Tuesdays are in the given number of days
 */

/**
 * Get all Tuesday day numbers within the calculation period
 * @param {number} totalDays - Total days to calculate
 * @returns {Array} - Array of day numbers that are Tuesdays [5, 12, 19, 26, ...]
 */
function getTuesdayDays(totalDays) {
    const tuesdayDays = [];
    const today = new Date();
    
    for (let day = 0; day < totalDays; day++) {
        const calculationDate = new Date(today);
        calculationDate.setDate(today.getDate() + day);
        
        // Check if it's Tuesday (getDay() returns 2 for Tuesday)
        if (calculationDate.getDay() === 2) {
            tuesdayDays.push(day);
        }
    }
    
    return tuesdayDays;
}

// ===== CALCULATION FUNCTIONS =====

/**
 * Calculate daily revenue for the farm
 */
function calculateDailyRevenue(satoshiPerTH, totalTH, btcPrice, gmtPrice) {
    const dailyRevenueBTC = (satoshiPerTH * totalTH) / 1e8;
    const dailyRevenueUSD = dailyRevenueBTC * btcPrice;
    const dailyRevenueGMT = gmtPrice ? dailyRevenueUSD / gmtPrice : null;

    return {
        btc: dailyRevenueBTC,
        usd: dailyRevenueUSD,
        gmt: dailyRevenueGMT
    };
}

/**
 * Calculate daily electricity costs
 */
function calculateDailyElectricity(totalTH, efficiency, btcPrice, gmtPrice, discount) {
    const costPerKWh = 0.05; // USD per kWh
    const hoursPerDay = 24;
    //const discount = 0; // No discount by default

    // Calculate costs in USD
    const dailyElectricityUSD = ((efficiency * totalTH * costPerKWh * hoursPerDay) / 1000) * (1 - discount);
    const dailyElectricityBTC = btcPrice ? dailyElectricityUSD / btcPrice : null;
    const dailyElectricityGMT = gmtPrice ? dailyElectricityUSD / gmtPrice : null;

    return {
        usd: dailyElectricityUSD,
        btc: dailyElectricityBTC,
        gmt: dailyElectricityGMT
    };
}

/**
 * Calculate daily service costs
 */
function calculateDailyService(totalTH, btcPrice, gmtPrice, discount) {
    const serviceCostPerTHUSD = 0.0089; // USD per TH per day
    //const discount = 0; // No discount by default

    const dailyServiceUSD = serviceCostPerTHUSD * totalTH * (1 - discount);
    const dailyServiceBTC = btcPrice ? dailyServiceUSD / btcPrice : null;
    const dailyServiceGMT = gmtPrice ? dailyServiceUSD / gmtPrice : null;

    return {
        usd: dailyServiceUSD,
        btc: dailyServiceBTC,
        gmt: dailyServiceGMT
    };
}

/**
 * Get price per TH based on efficiency and current TH amount
 */
function getPricePerTH(efficiency, thAmount) {
    efficiency = Math.round(parseFloat(efficiency));
    
    if (!priceMatrixdatei || !priceMatrixdatei[efficiency]) {
        console.error(`No price data found for ${efficiency} W/TH`);
        return null;
    }

    const priceEntries = priceMatrixdatei[efficiency];

    // Find the appropriate price for the given TH amount
    for (let i = priceEntries.length - 1; i >= 0; i--) {
        if (thAmount >= priceEntries[i].minTH) {
            return priceEntries[i].pricePerTH;
        }
    }

    return priceEntries[0].pricePerTH; // Return highest price tier if below minimum
}

/**
 * Calculate separate farm and miner efficiencies
 * This solves the mathematical problem of nested efficiency calculations
 */
function calculateSeparateEfficiencies(totalTH, avgEfficiency, minerTH, minerEfficiency) {
    const totalWatt = totalTH * avgEfficiency;
    const minerWatt = minerTH * minerEfficiency;
    const restFarmWatt = totalWatt - minerWatt;
    const restFarmTH = totalTH - minerTH;
    
    // Handle edge case where miner is the entire farm
    if (restFarmTH <= 0) {
        return {
            restFarmTH: 0,
            restFarmEfficiency: 0,
            minerTH: minerTH,
            minerEfficiency: minerEfficiency
        };
    }
    
    const restFarmEfficiency = restFarmWatt / restFarmTH;
    
    return {
        restFarmTH: restFarmTH,
        restFarmEfficiency: restFarmEfficiency,
        minerTH: minerTH,
        minerEfficiency: minerEfficiency
    };
}

/**
 * Calculate daily electricity costs with separate farm and miner calculations
 */
function calculateSeparateElectricity(farmComponents, btcPrice, gmtPrice, discount) {
    const costPerKWh = 0.05; // USD per kWh
    const hoursPerDay = 24;
    //const discount = 0; // No discount by default
    
    // Calculate electricity for rest of farm
    const farmElectricityUSD = farmComponents.restFarmTH > 0 ? 
        ((farmComponents.restFarmEfficiency * farmComponents.restFarmTH * costPerKWh * hoursPerDay) / 1000) * (1 - discount) : 0;
    
    // Calculate electricity for upgrade miner
    const minerElectricityUSD = ((farmComponents.minerEfficiency * farmComponents.minerTH * costPerKWh * hoursPerDay) / 1000) * (1 - discount);
    
    // Total electricity costs
    const totalElectricityUSD = farmElectricityUSD + minerElectricityUSD;
    const totalElectricityBTC = btcPrice ? totalElectricityUSD / btcPrice : null;
    const totalElectricityGMT = gmtPrice ? totalElectricityUSD / gmtPrice : null;
    
    return {
        usd: totalElectricityUSD,
        btc: totalElectricityBTC,
        gmt: totalElectricityGMT,
        breakdown: {
            farm: farmElectricityUSD,
            miner: minerElectricityUSD
        }
    };
}

/**
 * Calculate new farm efficiency as the upgrade miner grows
 */
function calculateNewFarmEfficiency(originalFarmTH, originalFarmEfficiency, currentMinerTH, originalMinerTH, minerEfficiency) {
    // Calculate how farm efficiency changes through miner growth
    const currentFarmTH = originalFarmTH + (currentMinerTH - originalMinerTH);
    
    // Original farm watt consumption
    const originalTotalWatt = originalFarmTH * originalFarmEfficiency;
    
    // Additional watt from miner growth
    const minerGrowthWatt = (currentMinerTH - originalMinerTH) * minerEfficiency;
    
    // New total watt consumption
    const newTotalWatt = originalTotalWatt + minerGrowthWatt;
    
    // New farm efficiency
    return newTotalWatt / currentFarmTH;
}

/**
 * Calculate how much TH can be bought with given USD amount
 */
function calculateTHFromUSD(usdAmount, efficiency, currentTH) {
    const pricePerTH = getPricePerTH(efficiency, currentTH);
    if (!pricePerTH) return 0;
    
    return usdAmount / pricePerTH;
}

/**
 * Main reinvestment calculation function
 */
function calculateReinvestmentStrategy() {
    // Get input values
    const inputs = {
        ...getInputValues(),
        greedy: document.getElementById('greedy-miner-enabled').checked,
        targetIsGreedy: document.getElementById('target-is-greedy-toggle').checked,
        // ✅ NUR setzen wenn Greedy aktiviert ist!
        greedyGrowthRate: document.getElementById('greedy-miner-enabled').checked ? 
            (parseFloat(document.getElementById('greedy-growth-rate').value) || 0.12) : 0,
        greedyMinerTH: document.getElementById('greedy-miner-enabled').checked ? 
            (parseFloat(document.getElementById('greedy-miner-th').value) || 10.00000000) : 0,
        greedyMinerEfficiency: document.getElementById('greedy-miner-enabled').checked ? 
            (parseFloat(document.getElementById('greedy-miner-efficiency').value) || 20.0) : 0
    };
    if (!inputs) return null;
    // ✅ DEBUG: Log initial inputs
    console.log('=== CALCULATION START ===');
    console.log('Inputs:', inputs);
    console.log('Strategy:', currentStrategy);
    let holdDaysCount = 0; // NEU: Counter für Hold Days

    const results = [];
    let currentDate = new Date();
    let currentGMTBalance = inputs.gmtWalletBalance;
    let currentBTCBalance = 0; // NEU: BTC Wallet für v2
    let totalInvestment = 0;
    
    // Yesterday values (starting values)
    let yesterdayFarmTH = inputs.farmTotalTH;
    let yesterdayFarmEfficiency = inputs.farmEfficiency;
    let yesterdayMinerTH = inputs.minerTH;
    // ✅ KORRIGIERT: Greedy TH abhängig vom Modus
    let yesterdayGreedyTH;
    if (inputs.greedy) {
        if (inputs.targetIsGreedy) {
            yesterdayGreedyTH = inputs.minerTH; // Target IS Greedy → Gleicher Wert
        } else {
            yesterdayGreedyTH = inputs.greedyMinerTH; // Separate Greedy → Eigener Wert
        }
    } else {
        yesterdayGreedyTH = 0; // Kein Greedy aktiviert
    }
    
    // For controlled strategy
    let dayInCycle = 0;
    const autoDays = currentStrategy === 'controlled' ? parseInt(document.getElementById('auto-days').value) : 30;
    const savingDays = 30 - autoDays;
    
    // For controlled v2 strategy - NEU
    let dayInCycleV2 = 0;
    const reinvestDaysV2 = currentStrategy === 'controlledv2' ? parseInt(document.getElementById('controlled-reinvest-days-v2').value) : 0;
    const btcRewardDaysV2 = currentStrategy === 'controlledv2' ? parseInt(document.getElementById('btc-reward-days-v2').value) : 0;
    const savingDaysV2 = currentStrategy === 'controlledv2' ? parseInt(document.getElementById('controlled-saving-days-v2').value) : 0;
    const totalCycleDaysV2 = reinvestDaysV2 + btcRewardDaysV2 + savingDaysV2;
    
    // Data for chart
    const chartData = {
        labels: [],
        thData: [],           // Target Miner TH
        greedyData: [],       // ✅ NEU: Separate Greedy TH
        totalMiningData: [],  // ✅ NEU: Target + Greedy combined
        gmtData: [],
        btcData: [],
        discountData: [],     // ✅ NEU: Discount % Data
        profitData: []
    };
    
    // Get chart display settings
    const chartPeriod = document.getElementById('chart-period').value;
    const periodCount = parseInt(document.getElementById('calculation-period').value) || 1;
    let chartInterval = 1;
    
    switch(chartPeriod) {
        case 'daily': 
            chartInterval = Math.max(1, Math.floor(inputs.calculationPeriod / Math.min(100, periodCount))); 
            break;
        case 'weekly': 
            chartInterval = 7; 
            break;
        case 'monthly': 
            chartInterval = 30; 
            break;
        case 'yearly': 
            chartInterval = 365; 
            break;
        case 'cycles':
            chartInterval = 7; // Same as weekly - Di-Mo period
            break;
    }
    
    // Tracking für average discount
    let totalDiscountSum = 0;
    let discountDayCount = 0;
    
    // Miner Wars weekly tracking
    let weeklyMiningRevenue = 0;
    let weeklyMaintenanceCost = 0;
    const isMinerWars = inputs.minerWarsEnabled;
    const minerWarsFactor = inputs.minerWarsFactor / 100; // Convert to decimal
    
    // Track cycles for Miner Wars (Tuesday to Monday periods)
    let currentCycleNumber = 1;
    let daysUntilNextTuesday = 0;
    let isFirstCycle = true; // Track if this is the first payout
    
    // Calculate days until next Tuesday from today
    if (isMinerWars) {
        const todayDayOfWeek = currentDate.getDay(); // 0=Sunday, 1=Monday, 2=Tuesday, etc.
        // Days until next Tuesday: (2 - today + 7) % 7, but if today is Tuesday, it's 0
        daysUntilNextTuesday = todayDayOfWeek === 2 ? 0 : (2 - todayDayOfWeek + 7) % 7;
        
        // If we start mid-cycle (not on Tuesday), pre-accumulate for the full cycle
        // Example: Start on Monday (day 6 of cycle) → need to count full 7 days for first payout
        const daysAlreadyInCycle = todayDayOfWeek === 2 ? 0 : (todayDayOfWeek === 0 ? 5 : (todayDayOfWeek + 5) % 7);
        
        // 🔍 DEBUG: Initial Cycle Setup
        console.log('\n🔍 === MINER WARS CYCLE SETUP ===');
        console.log('  Today (Start Date):', currentDate.toISOString().split('T')[0]);
        console.log('  Today Day of Week:', todayDayOfWeek, ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'][todayDayOfWeek]);
        console.log('  Days until next Tuesday:', daysUntilNextTuesday);
        console.log('  Days already in current cycle:', daysAlreadyInCycle);
        console.log('  Starting Cycle Number:', currentCycleNumber);
        console.log('  First payout will include FULL 7-day cycle');
    }
    
    for (let day = 0; day < inputs.calculationPeriod; day++) {
        // Calculate actual date for this iteration
        const thisDate = new Date(currentDate.getTime() + day * 24 * 60 * 60 * 1000);
        const actualDayOfWeek = thisDate.getDay(); // 0=Sunday, 1=Monday, 2=Tuesday, etc.
        const isTuesday = actualDayOfWeek === 2;
        
        // 🔍 DEBUG: Daily Date Check (nur erste 14 Tage oder Dienstage/Montage)
        if (isMinerWars && (day < 14 || isTuesday || actualDayOfWeek === 1)) {
            console.log(`\n🔍 Day ${day} (${thisDate.toISOString().split('T')[0]}):`, 
                ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'][actualDayOfWeek],
                isTuesday ? '✅ TUESDAY' : actualDayOfWeek === 1 ? '🔄 MONDAY' : '');
            console.log('  Current Cycle Number:', currentCycleNumber);
        }
        // ===== DYNAMIC DISCOUNT CALCULATION =====
        let currentDiscount = inputs.baseDiscount; // Default: nur Base Discount
        let currentDiscountPercent = inputs.baseDiscountPercent;
        let discountBreakdown = { base: inputs.baseDiscountPercent, token: 0 };
        
        if (inputs.dynamicDiscountEnabled) {
            // Berechne Maintenance Cost OHNE Discount für Coverage Days Calculation
            const rawElectricityCost = (yesterdayFarmEfficiency * yesterdayFarmTH * ELECTRICITY_COST_PER_KWH * 24) / 1000;
            const rawServiceCost = SERVICE_COST_PER_TH * yesterdayFarmTH;
            const rawMaintenanceCost = rawElectricityCost + rawServiceCost;
            
            const discountInfo = calculateDynamicDiscount(
                currentGMTBalance,
                inputs.lockedGMT,
                rawMaintenanceCost,
                inputs.gmtPrice,
                inputs.baseDiscountPercent
            );
            
            currentDiscount = discountInfo.totalDiscountDecimal;
            currentDiscountPercent = discountInfo.totalDiscountPercent;
            discountBreakdown = discountInfo.breakdown;
        }
        
        // Track for average
        totalDiscountSum += currentDiscountPercent;
        discountDayCount++;
        
        // Calculate separate farm components with YESTERDAY values
        const farmComponents = calculateSeparateEfficiencies(
            yesterdayFarmTH, 
            yesterdayFarmEfficiency, 
            yesterdayMinerTH, 
            inputs.minerEfficiency
        );
        
        // Calculate daily metrics with YESTERDAY farm values AND CURRENT DISCOUNT
        const dailyRevenue = calculateDailyRevenue(inputs.satPerTH, yesterdayFarmTH, inputs.btcPrice, inputs.gmtPrice);
        const dailyElectricity = calculateSeparateElectricity(farmComponents, inputs.btcPrice, inputs.gmtPrice, currentDiscount);
        const dailyService = calculateDailyService(yesterdayFarmTH, inputs.btcPrice, inputs.gmtPrice, currentDiscount);

        // Calculate daily profit for display purposes
        const dailyProfitGMT = dailyRevenue.gmt - dailyElectricity.gmt - dailyService.gmt;
        const dailyProfitUSD = dailyRevenue.usd - dailyElectricity.usd - dailyService.usd;
        // For the FIRST payout, always use 7 full days (full cycle)
        // For subsequent payouts, use accumulated days (should also be 7)
        //const daysToCalculate = isFirstCycle ? 7 : Math.max(1, Math.round(weeklyMiningRevenue / (dailyRevenue.gmt * minerWarsFactor)));
        const daysToCalculate = 7;
        // Calculate weekly metrics (ensure full 7-day cycle)
       /* const weeklyRevenueGMT = isFirstCycle ? (dailyRevenue.gmt * minerWarsFactor * 7) : weeklyMiningRevenue;
        const weeklyMaintenanceGMT = isFirstCycle ? ((dailyElectricity.gmt + dailyService.gmt) * minerWarsFactor * 7) : weeklyMaintenanceCost;
        const weeklyNetProfitGMT = weeklyRevenueGMT - weeklyMaintenanceGMT; */
        const weeklyRevenueGMT = (dailyRevenue.gmt * minerWarsFactor * 7) 
        const weeklyMaintenanceGMT = ((dailyElectricity.gmt + dailyService.gmt) * minerWarsFactor * 7) 
        const weeklyNetProfitGMT = weeklyRevenueGMT - weeklyMaintenanceGMT;


        let reinvestmentUSD = 0;
        let strategyText = 'Hold';
        let todayMinerTH = yesterdayMinerTH;
        let todayGreedyTH = yesterdayGreedyTH; // ✅ Separate Today Variable
        
        // ===== MINER WARS MODE: Weekly Accumulation =====
        /* if (isMinerWars) {
            // Accumulate revenue and costs for the week
            weeklyMiningRevenue += dailyRevenue.gmt * minerWarsFactor;
            weeklyMaintenanceCost += (dailyElectricity.gmt + dailyService.gmt) * minerWarsFactor;
            
            // Only process on Tuesday
            if (!isTuesday) {
                strategyText = 'Accumulating (Miner Wars)';
            }
        } */
        
        // ===== STRATEGY EXECUTION =====
        if (isMinerWars && isTuesday) {
            // ===== MINER WARS TUESDAY PAYOUT =====
                // Diese Berechnung EINMALIG am Dienstag:
        /*    const weeklyRevenueGMT = dailyRevenue.gmt * minerWarsFactor * daysToCalculate; // ✅ × 7
            const weeklyMaintenanceGMT = (dailyElectricity.gmt + dailyService.gmt) * minerWarsFactor * daysToCalculate; // ✅ × 7
            const weeklyNetProfitGMT = weeklyRevenueGMT - weeklyMaintenanceGMT;*/

            
            console.log(`💰 PAYOUT Day ${day}: ${isFirstCycle ? 'FIRST CYCLE (7 days)' : `Accumulated ${daysToCalculate} days`}`);
            console.log(`   Revenue: ${weeklyRevenueGMT.toFixed(2)} GMT, Maintenance: ${weeklyMaintenanceGMT.toFixed(2)} GMT, Net: ${weeklyNetProfitGMT.toFixed(2)} GMT`);
            
            // Add bonuses to GMT Wallet (always, independent of strategy)
            currentGMTBalance += inputs.soloBlockRewards;
            currentGMTBalance += inputs.weeklyAdditionalIncome;
            currentGMTBalance += (inputs.dailyAdditionalIncome * 7);
            
            // Mark first cycle as complete
            if (isFirstCycle) isFirstCycle = false;
            
            // NOW recalculate discount with new wallet balance
            if (inputs.dynamicDiscountEnabled) {
                const rawElectricityCost = (yesterdayFarmEfficiency * yesterdayFarmTH * ELECTRICITY_COST_PER_KWH * 24) / 1000;
                const rawServiceCost = SERVICE_COST_PER_TH * yesterdayFarmTH;
                const rawMaintenanceCost = rawElectricityCost + rawServiceCost;
                
                const newDiscountInfo = calculateDynamicDiscount(
                    currentGMTBalance,
                    inputs.lockedGMT,
                    rawMaintenanceCost,
                    inputs.gmtPrice,
                    inputs.baseDiscountPercent
                );
                
                currentDiscount = newDiscountInfo.totalDiscountDecimal;
                currentDiscountPercent = newDiscountInfo.totalDiscountPercent;
                discountBreakdown = newDiscountInfo.breakdown;
            }
            
            // MW STRATEGY EXECUTION
            if (currentStrategy === 'auto-mw') {
                // AUTO MW: Deduct costs, reinvest entire revenue + 5%
                const weeklyRevenueUSD = weeklyRevenueGMT * inputs.gmtPrice;
                
                if (currentGMTBalance >= weeklyMaintenanceGMT) {
                    reinvestmentUSD = weeklyRevenueUSD * 1.05; // +5% bonus from system
                    const additionalTH = calculateTHFromUSD(reinvestmentUSD, inputs.minerEfficiency, yesterdayMinerTH);
                    todayMinerTH = yesterdayMinerTH + additionalTH;
                    totalInvestment += reinvestmentUSD;
                    currentGMTBalance -= weeklyMaintenanceGMT; // Only deduct maintenance cost, not bonus
                    strategyText = 'MW Auto +5%';
                } else {
                    strategyText = 'MW Hold (Insufficient GMT)';
                    currentGMTBalance += weeklyNetProfitGMT; // Net profit bleibt im Wallet
                    holdDaysCount += 7;
                }
                
            } else if (currentStrategy === 'manual-mw') {
                // MANUAL MW: Reinvest net profit manually (no 5% bonus)
                if (weeklyNetProfitGMT > 0) {
                    const weeklyNetProfitUSD = weeklyNetProfitGMT * inputs.gmtPrice;
                    reinvestmentUSD = weeklyNetProfitUSD; // Net profit, no bonus
                    const additionalTH = calculateTHFromUSD(reinvestmentUSD, inputs.minerEfficiency, yesterdayMinerTH);
                    todayMinerTH = yesterdayMinerTH + additionalTH;
                    totalInvestment += reinvestmentUSD;
                    strategyText = 'MW Manual';
                } else {
                    strategyText = 'MW Manual (No Profit/Reward Protection)';
                }
                
            } else if (currentStrategy === 'saving-mw') {
                // SAVING MW: Accumulate all weekly profits, no reinvestment
                // Net profit already in GMT balance (bonuses added earlier)
                // Just accumulate, don't reinvest
                strategyText = 'MW Saving';
                currentGMTBalance += weeklyNetProfitGMT; // Net profit bleibt im Wallet
                
            } else if (currentStrategy === 'controlledv2-mw') {
                // CONTROLLED V2 MW: 3-phase cycle (TH Reinvest / BTC / Saving)
                const reinvestCyclesMW = parseInt(document.getElementById('reinvest-cycles-mw').value) || 2;
                const btcCyclesMW = parseInt(document.getElementById('btc-cycles-mw').value) || 1;
                const savingCyclesMW = parseInt(document.getElementById('saving-cycles-mw').value) || 2;
                const saveFirstV2MW = document.getElementById('save-first-toggle-v2-mw').checked;
                const totalCyclesV2MW = reinvestCyclesMW + btcCyclesMW + savingCyclesMW;
                const currentCycle = Math.floor(day / 7);
                const cyclePosition = currentCycle % totalCyclesV2MW;
                
                let isReinvestPhaseMW, isBTCPhaseMW, isSavingPhaseMW;
                
                if (saveFirstV2MW) {
                    // Save First: GMT Saving → BTC → TH Reinvest
                    isSavingPhaseMW = cyclePosition < savingCyclesMW;
                    isBTCPhaseMW = cyclePosition >= savingCyclesMW && cyclePosition < savingCyclesMW + btcCyclesMW;
                    isReinvestPhaseMW = cyclePosition >= savingCyclesMW + btcCyclesMW;
                } else {
                    // TH First: TH Reinvest → BTC → GMT Saving
                    isReinvestPhaseMW = cyclePosition < reinvestCyclesMW;
                    isBTCPhaseMW = cyclePosition >= reinvestCyclesMW && cyclePosition < reinvestCyclesMW + btcCyclesMW;
                    isSavingPhaseMW = cyclePosition >= reinvestCyclesMW + btcCyclesMW;
                }
                
                if (isReinvestPhaseMW) {
                    const weeklyRevenueUSD = weeklyRevenueGMT * inputs.gmtPrice;
                    
                    if (currentGMTBalance >= weeklyMaintenanceGMT) {
                        reinvestmentUSD = weeklyRevenueUSD * 1.05; // +5% bonus from system
                        const additionalTH = calculateTHFromUSD(reinvestmentUSD, inputs.minerEfficiency, yesterdayMinerTH);
                        todayMinerTH = yesterdayMinerTH + additionalTH;
                        totalInvestment += reinvestmentUSD;
                        currentGMTBalance -= weeklyMaintenanceGMT; // Only deduct maintenance cost
                        strategyText = `MW Reinvest +5% (${(cyclePosition % reinvestCyclesMW) + 1}/${reinvestCyclesMW})`;
                    } else {
                    strategyText = 'MW Hold (Insufficient GMT)';
                    currentGMTBalance += weeklyNetProfitGMT; // Net profit bleibt im Wallet
                    holdDaysCount += 7;
                    }
                    
                } else if (isBTCPhaseMW) {

                    if (currentGMTBalance >= weeklyMaintenanceGMT) {
                        // BTC Accumulation: Revenue goes to BTC, maintenance from GMT wallet
                        const dailySats = inputs.satPerTH; // sats per TH per day
                        const weeklyBTC = (dailySats * yesterdayFarmTH * 7 * minerWarsFactor) / 100_000_000;
                        currentBTCBalance += weeklyBTC;
                        
                        // Deduct revenue (went to BTC) and maintenance from GMT wallet
                        currentGMTBalance -= weeklyMaintenanceGMT; // Maintenance from wallet
                        
                        const btcPhaseIndex = saveFirstV2MW ? (cyclePosition - savingCyclesMW) : (cyclePosition - reinvestCyclesMW);
                        strategyText = `MW BTC Accumulation (${btcPhaseIndex + 1}/${btcCyclesMW})`;
                    } else {
                    strategyText = 'MW Hold (Insufficient GMT)';
                    currentGMTBalance += weeklyNetProfitGMT; // Net profit bleibt im Wallet
                    holdDaysCount += 7;
                    }
                } else if (isSavingPhaseMW) {
                    const savingPhaseIndex = saveFirstV2MW ? cyclePosition : (cyclePosition - reinvestCyclesMW - btcCyclesMW);
                    currentGMTBalance += weeklyNetProfitGMT; // Net profit bleibt im Wallet
                    strategyText = `MW Saving (${savingPhaseIndex + 1}/${savingCyclesMW})`;
                }
            }
            
            // Reset weekly counters
            weeklyMiningRevenue = 0;
            weeklyMaintenanceCost = 0;
            
        } else if (!isMinerWars) {
            // ===== MINING MODE: Daily Processing =====
        const dailymaintenanceGMT = dailyElectricity.gmt + dailyService.gmt;
        if (currentStrategy === 'auto') {
            // AUTOMATIC REINVEST: Deduct costs from wallet, reinvest ENTIRE revenue + 5%


            if (currentGMTBalance >= dailymaintenanceGMT) {
                reinvestmentUSD = dailyRevenue.usd * 1.05; // ENTIRE revenue + 5% bonus
                const additionalTH = calculateTHFromUSD(reinvestmentUSD, inputs.minerEfficiency, yesterdayMinerTH);
                todayMinerTH = yesterdayMinerTH + additionalTH;
                totalInvestment += reinvestmentUSD;
                currentGMTBalance -= dailymaintenanceGMT; // Maintenance costs deducted, bonus reinvested
                strategyText = 'Auto +5%';
            } else {
                // Not enough GMT for costs - revert and hold
                currentGMTBalance += dailyRevenue.gmt;
                strategyText = 'Hold (Insufficient GMT)';
                holdDaysCount++; // NEU: Increment Hold Days counter
            }
            
        } else if (currentStrategy === 'manual') {
            // MANUAL REINVEST: Revenue to wallet, deduct costs, reinvest profit
            //const currentGMTwalletinUSD = currentGMTBalance * inputs.gmtPrice;
           // const additionalTH = calculateTHFromUSD(currentGMTwalletinUSD, inputs.minerEfficiency, yesterdayMinerTH);
            if (dailyProfitGMT > 0 ) {
                reinvestmentUSD = dailyProfitUSD; // Only profit, no bonus
                const additionalTH = calculateTHFromUSD(dailyProfitUSD, inputs.minerEfficiency, yesterdayMinerTH);
                todayMinerTH = yesterdayMinerTH + additionalTH;
                totalInvestment += dailyProfitUSD;
                strategyText = 'Manual';
            } else {
                strategyText = 'Hold (No Profit/Insufficient GMT)';
                holdDaysCount++; // NEU: Increment Hold Days counter
            }
            
        } else if (currentStrategy === 'controlled') {
            // CONTROLLED AUTO (v1)
            const shouldAutoInvest = saveFirst ? 
                (dayInCycle >= (30 - autoDays)) : 
                (dayInCycle < autoDays);
            
            if (shouldAutoInvest) {

                
                if (currentGMTBalance >= dailymaintenanceGMT) {
                    reinvestmentUSD = dailyRevenue.usd * 1.05;
                    const additionalTH = calculateTHFromUSD(reinvestmentUSD, inputs.minerEfficiency, yesterdayMinerTH);
                    todayMinerTH = yesterdayMinerTH + additionalTH;
                    totalInvestment += reinvestmentUSD;
                    strategyText = 'Auto +5%';
                } else {

                    currentGMTBalance += dailyRevenue.gmt;
                    strategyText = 'Hold (Insufficient GMT)';
                    holdDaysCount++; // NEU: Increment Hold Days counter
                }
            } else {
                currentGMTBalance += dailyRevenue.gmt;
                strategyText = 'Saving';
            }
            
            dayInCycle++;
            if (dayInCycle >= 30) {
                dayInCycle = 0;
            }
            
        } else if (currentStrategy === 'controlledv2') {
            // ===== CONTROLLED AUTO V2 =====
            const cyclePosition = dayInCycleV2 % totalCycleDaysV2;
            
            // Determine which phase we're in based on save-first toggle
            let isReinvestPhase, isBTCPhase, isSavingPhase;
            
            if (saveFirstV2) {
                // Save First: GMT Saving → BTC → TH Reinvest
                isSavingPhase = cyclePosition < savingDaysV2;
                isBTCPhase = cyclePosition >= savingDaysV2 && cyclePosition < savingDaysV2 + btcRewardDaysV2;
                isReinvestPhase = cyclePosition >= savingDaysV2 + btcRewardDaysV2;
            } else {
                // TH First: TH Reinvest → BTC → GMT Saving
                isReinvestPhase = cyclePosition < reinvestDaysV2;
                isBTCPhase = cyclePosition >= reinvestDaysV2 && cyclePosition < reinvestDaysV2 + btcRewardDaysV2;
                isSavingPhase = cyclePosition >= reinvestDaysV2 + btcRewardDaysV2;
            }
            
            if (isReinvestPhase) {
                // PHASE: Reinvest in TH mit +5%
                
                if (currentGMTBalance >= dailymaintenanceGMT) {
                    currentGMTBalance -= dailymaintenanceGMT; // Maintenance costs deducted, bonus reinvested
                    reinvestmentUSD = dailyRevenue.usd * 1.05;
                    const additionalTH = calculateTHFromUSD(reinvestmentUSD, inputs.minerEfficiency, yesterdayMinerTH);
                    todayMinerTH = yesterdayMinerTH + additionalTH;
                    totalInvestment += dailyProfitUSD;
                    strategyText = 'TH Reinvest +5%';
                } else {
                    currentGMTBalance += dailyRevenue.gmt;
                    strategyText = 'Hold (Insufficient GMT)';
                    holdDaysCount++; // NEU: Increment Hold Days counter
                }
                
            } else if (isBTCPhase) {
                // PHASE: Reward in BTC, Maintenance in GMT
               
                if (currentGMTBalance > dailymaintenanceGMT) {                                                     
                    currentGMTBalance -= dailymaintenanceGMT; // Maintenance from wallet
                    currentBTCBalance += dailyRevenue.btc;
                    strategyText = 'BTC Accumulation';
                } else {
                    currentGMTBalance += dailyRevenue.gmt; // Net profit bleibt im Wallet
                    strategyText = 'Hold (Insufficient GMT)';
                    holdDaysCount++; // NEU: Increment Hold Days counter
                }
                
            } else if (isSavingPhase) {
                // PHASE: Saving (Reinvest in GMT)
                currentGMTBalance += dailyRevenue.gmt; // Net profit bleibt im Wallet
                strategyText = 'GMT Saving';
            }
            
            dayInCycleV2++;
            
        } else if (currentStrategy === 'saving') {
            // ONLY SAVING: Accumulate all profits, no reinvestment
            currentGMTBalance += dailyRevenue.gmt; // Net profit bleibt im Wallet
            strategyText = 'GMT Saving';
        }
        
        } // End of Mining Mode (!isMinerWars) block
        
        // ===== GREEDY MINER LOGIC (independent of strategy) =====
            // ✅ IMMER: Wenn Target IS Greedy → Synchronisiere Greedy TH
        if (inputs.greedy && inputs.targetIsGreedy) {
            todayGreedyTH = todayMinerTH; // ✅ JEDEN TAG, nicht nur Dienstag!
        }
        const tuesdayDays = getTuesdayDays(inputs.calculationPeriod);
        if (inputs.greedy && tuesdayDays.includes(day)) {


            if (inputs.targetIsGreedy) {
                // Case: Target miner IS the greedy miner
                const greedyResult = applyGreedyGrowthWhenTargetIsGreedy({
                    farmTH: yesterdayFarmTH,
                    farmEfficiencyWPerTH: yesterdayFarmEfficiency,
                    targetTH: todayMinerTH,
                    targetEfficiencyWPerTH: inputs.minerEfficiency
                }, {
                    greedyGrowthRate: inputs.greedyGrowthRate,
                    maxTargetTH: Infinity // optional: could be from UI
                });
                
                todayMinerTH = greedyResult.newTargetTH;
                todayGreedyTH = todayMinerTH; // ✅ NEU: Für Chart - Target IS Greedy!
                strategyText += ` + Greedy Tuesday +${inputs.greedyGrowthRate}%`;

            } else {
                // Case: Separate greedy miner (part of farm)
                const greedyResult = applyGreedyGrowthToFarmDay({
                    farmTH: yesterdayFarmTH,
                    farmEfficiencyWPerTH: yesterdayFarmEfficiency,
                    targetTH: todayMinerTH,
                    targetEfficiencyWPerTH: inputs.minerEfficiency,
                    greedyTH: todayGreedyTH, // ✅ Use todayGreedyTH, not inputs.greedyMinerTH
                    greedyEfficiencyWPerTH: inputs.greedyMinerEfficiency // ✅ Use defined value
                }, {
                    greedyGrowthRate: inputs.greedyGrowthRate,
                    maxGreedyTH: Infinity,
                    useGreedyEfficiencyIfProvided: true
                });
                
                // Update farm efficiency and greedy TH for next iteration
                yesterdayFarmEfficiency = greedyResult.newFarmEfficiencyWPerTH;
                todayGreedyTH = greedyResult.newGreedyTH; // ✅ Update todayGreedyTH
                strategyText += ` + Greedy Tuesday +${inputs.greedyGrowthRate}%`;
            }
        }

        // Calculate TODAY farm values
        const todayFarmTH = yesterdayFarmTH + (todayMinerTH - yesterdayMinerTH) +
                            (inputs.greedy && !inputs.targetIsGreedy ? 
                            (todayGreedyTH - yesterdayGreedyTH) : 0); // ✅ Include separate greedy growth
        const todayFarmEfficiency = calculateNewFarmEfficiency(
            yesterdayFarmTH,          // ✅ Yesterday Farm TH (not original!)
            yesterdayFarmEfficiency,  // ✅ Yesterday Farm Efficiency (not original!)
            todayMinerTH,            // ✅ Today Miner TH
            yesterdayMinerTH,        // ✅ Yesterday Miner TH (not original!)
            inputs.minerEfficiency   // ✅ Miner Efficiency (konstant)
        );
        // ✅ DEBUG: Log farm calculations every 7 days or on Greedy days
      /*  if (day % 7 === 0 || (inputs.greedy && tuesdayDays.includes(day))) {
            console.log(`\n--- Day ${day + 1} Farm Calculation ---`);
            console.log('  yesterdayFarmTH:', yesterdayFarmTH);
            console.log('  todayMinerTH:', todayMinerTH);
            console.log('  yesterdayMinerTH:', yesterdayMinerTH);
            console.log('  todayGreedyTH:', todayGreedyTH);
            console.log('  yesterdayGreedyTH:', yesterdayGreedyTH);
            console.log('  → todayFarmTH:', todayFarmTH);
            console.log('  Strategy:', strategyText);
        } */
        // Store data for chart based on selected interval
        // In Miner Wars mode, only store on Tuesdays (one entry per cycle)
        let shouldStore;
        if (isMinerWars) {
            shouldStore = isTuesday; // Only on payout days (Tuesdays), not last day
        } else {
            shouldStore = day % chartInterval === 0 || day === inputs.calculationPeriod - 1;
        }
        
        if (shouldStore) {
            const dateStr = thisDate.toISOString().split('T')[0];

            // In Miner Wars, show weekly profit instead of daily
            const displayProfitUSD = isMinerWars ? weeklyNetProfitGMT * inputs.gmtPrice : dailyProfitUSD;
            
            // Calculate reinvestment in GMT for display
            const reinvestmentGMT = reinvestmentUSD / inputs.gmtPrice;
            
            results.push({
                day: day + 1,
                date: dateStr,
                thAmount: todayMinerTH,
                farmTH: todayFarmTH,
                farmEfficiency: todayFarmEfficiency,
                greedyTH: inputs.greedy ? todayGreedyTH : 0, // ✅ NEU: Separate Greedy TH
                dailyProfitUSD: displayProfitUSD,
                reinvestmentUSD: reinvestmentUSD,
                reinvestmentGMT: reinvestmentGMT, // ✅ NEU: GMT Wert
                gmtBalance: currentGMTBalance,
                btcBalance: currentBTCBalance,
                discountPercent: currentDiscountPercent, // ✅ NEU: Current Discount %
                discountBreakdown: discountBreakdown, // ✅ NEU: Discount Breakdown
                strategy: strategyText,
                cycleNumber: isMinerWars ? currentCycleNumber : 0 // ✅ NEU: Actual cycle number
            });
            
            // Chart labels
            let label;
            if (isMinerWars) {
                // In Miner Wars, always show as cycles (Di-Mo)
                label = `Cycle ${currentCycleNumber}`;
            } else {
                switch(chartPeriod) {
                    case 'daily': label = `Day ${day + 1}`; break;
                    case 'weekly': label = `Week ${Math.ceil((day + 1) / 7)}`; break;
                    case 'monthly': label = `Month ${Math.ceil((day + 1) / 30)}`; break;
                    case 'yearly': label = `Year ${Math.ceil((day + 1) / 365)}`; break;
                    case 'cycles': label = `Cycle ${Math.ceil((day + 1) / 7)}`; break;
                    default: label = `Day ${day + 1}`;
                }
            }

            chartData.labels.push(label);
            chartData.thData.push(todayMinerTH); // Target Miner TH
            chartData.greedyData.push(inputs.greedy  ? todayGreedyTH : 0); // ✅ Nur bei separatem Greedy
            chartData.totalMiningData.push(todayFarmTH); // ✅ NEU: Total Mining TH
            chartData.gmtData.push(Number(currentGMTBalance.toFixed(4)));
            chartData.btcData.push(Number(currentBTCBalance.toFixed(8)));
            chartData.discountData.push(Number(currentDiscountPercent.toFixed(2))); // ✅ NEU: Discount %
            chartData.profitData.push(displayProfitUSD); // Use displayProfitUSD instead of dailyProfitUSD
        }
        
        // Add daily/weekly additional income to GMT wallet at end of day
        if (!isMinerWars) {
            // Mining Mode: Daily additional income
            currentGMTBalance += inputs.dailyAdditionalIncome;
            // Add weekly income on Tuesdays also in Mining Mode
            if (isTuesday) {
                currentGMTBalance += inputs.weeklyAdditionalIncome;
            }
        }
        // Note: In Miner Wars, both daily and weekly income are already added on Tuesday
        
        // In Miner Wars, increment cycle on Tuesday (start of new cycle)
        if (isMinerWars && isTuesday && day > 0) {
            // Tuesday = start of new cycle
            // Increment if we've reached the day that equals or exceeds the first Tuesday
            if (day >= daysUntilNextTuesday) {
                console.log(`🔄 CYCLE INCREMENT on Day ${day} (Tuesday):`, currentCycleNumber, '→', currentCycleNumber + 1);
                currentCycleNumber++;
            } else {
                console.log(`⏸️ FIRST TUESDAY Day ${day}: Staying in Cycle ${currentCycleNumber}`);
            }
        }
        
        // TODAY becomes YESTERDAY
        yesterdayFarmTH = todayFarmTH;
        yesterdayFarmEfficiency = todayFarmEfficiency;
        yesterdayMinerTH = todayMinerTH;
        yesterdayGreedyTH = todayGreedyTH; // ✅ NEU: Greedy TH für nächsten Tag
        // ✅ DEBUG: Log yesterday updates every 7 days
        if (day % 7 === 0) {
            console.log(`  Updated Yesterday Values for Day ${day + 2}:`);
            console.log('    yesterdayFarmTH:', yesterdayFarmTH);
            console.log('    yesterdayMinerTH:', yesterdayMinerTH);
            console.log('    yesterdayGreedyTH:', yesterdayGreedyTH);
        }
    }

    // ✅ DEBUG: Log final results
    console.log('\n=== FINAL RESULTS ===');
    console.log('Final Target Miner TH:', yesterdayMinerTH);
    console.log('Final Greedy TH:', yesterdayGreedyTH);
    console.log('Final Farm TH:', yesterdayFarmTH);
    console.log('Final Farm Efficiency:', yesterdayFarmEfficiency);
    console.log('=== CALCULATION END ===\n');
    
    // Calculate average discount
    const avgTotalDiscount = discountDayCount > 0 ? totalDiscountSum / discountDayCount : inputs.baseDiscountPercent;
    const avgTokenDiscount = avgTotalDiscount - inputs.baseDiscountPercent;

    return {
        results: results,
        chartData: chartData,
        summary: {
            finalTH: yesterdayMinerTH,
            finalFarmTH: yesterdayFarmTH,
            finalFarmEfficiency: yesterdayFarmEfficiency,
            finalGreedyTH: yesterdayGreedyTH, // ✅ Bereits da!
            totalInvestment: totalInvestment,
            finalGMTBalance: currentGMTBalance,
            finalBTCBalance: currentBTCBalance, // NEU
            totalDays: inputs.calculationPeriod, 
            holdDays: holdDaysCount, // NEU: Total Hold Days
            avgTotalDiscount: avgTotalDiscount, // ✅ NEU: Average Total Discount
            avgBaseDiscount: inputs.baseDiscountPercent, // ✅ NEU: Base Discount
            avgTokenDiscount: avgTokenDiscount // ✅ NEU: Average Token Discount
        }
    };
}

/**
 * Get and validate input values
 */
function getInputValues() {
    try {
        const gmtWalletBalance = parseFloat(document.getElementById('gmt-wallet-balance').value) || 0;
        const lockedGMT = parseFloat(document.getElementById('locked-gmt').value) || 0;
        const dailyAdditionalIncome = parseFloat(document.getElementById('daily-additional-income').value) || 0;
        const farmTotalTH = parseFloat(document.getElementById('farm-total-th').value) || 0;
        const farmEfficiency = parseFloat(document.getElementById('farm-efficiency').value) || 19.50;
        const minerTH = parseFloat(document.getElementById('miner-th').value) || 0;
        const minerEfficiency = parseInt(document.getElementById('miner-efficiency').value) || 19;
        
        // Convert calculation period to days based on selected unit
        const periodCount = parseInt(document.getElementById('calculation-period').value) || 1;
        const periodUnit = document.getElementById('chart-period').value || 'daily';
        
        // Get base discount from components (calculated by updateBaseDiscount())
        const vipLevel = parseInt(document.getElementById('vip-level-slider').value) || 0;
        const vipData = window.VIP_LEVELS ? window.VIP_LEVELS[vipLevel] : { discount: 0 };
        const vipDiscount = vipData.discount || 0;
        
        const serviceStreakDay = parseInt(document.getElementById('service-button-slider').value) || 0;
        const serviceStreakData = window.SERVICE_STREAK_LEVELS ? window.SERVICE_STREAK_LEVELS[serviceStreakDay] : { discount: 0 };
        const serviceDiscount = serviceStreakData.discount || 0;
        
        const soloDiscount = parseFloat(document.getElementById('solo-mining-discount').value) || 0;
        
        const baseDiscountPercent = vipDiscount + serviceDiscount + soloDiscount;
        const baseDiscount = baseDiscountPercent / 100;
        
        // Dynamic discount enabled?
        const dynamicDiscountEnabled = document.getElementById('dynamic-discount-enabled')?.checked ?? true;

        let calculationPeriod;
        switch(periodUnit) {
            case 'daily': calculationPeriod = periodCount; break;
            case 'weekly': calculationPeriod = periodCount * 7; break;
            case 'monthly': calculationPeriod = periodCount * 30; break;
            case 'yearly': calculationPeriod = periodCount * 365; break;
            case 'cycles': calculationPeriod = periodCount * 7; break; // Miner Wars: 1 Cycle = 7 days (Di-Mo)
            default: calculationPeriod = periodCount;
        }
        
        // Get prices
        const btcPrice = parseFloat(document.getElementById('bitcoin-price-dropdown').value) || 67000;
        const gmtPrice = parseFloat(document.getElementById('gmt-token-price').value) || 0.4269;
        const satPerTH = parseInt(document.getElementById('sat-TH').value) || 42;

        // Validate inputs
        if (farmTotalTH <= 0 || minerTH <= 0 || btcPrice <= 0 || gmtPrice <= 0 || satPerTH <= 0) {
            throw new Error('Invalid input values');
        }

        return {
            gmtWalletBalance,
            lockedGMT,
            dailyAdditionalIncome,
            weeklyAdditionalIncome: parseFloat(document.getElementById('weekly-additional-income').value) || 0,
            farmTotalTH,
            farmEfficiency,
            minerTH,
            minerEfficiency,
            calculationPeriod,
            btcPrice,
            gmtPrice,
            satPerTH,
            baseDiscount,
            baseDiscountPercent,
            dynamicDiscountEnabled,
            minerWarsEnabled: document.getElementById('miner-wars-toggle')?.checked ?? false,
            minerWarsFactor: parseFloat(document.getElementById('miner-wars-factor').value) || 80,
            soloBlockRewards: parseFloat(document.getElementById('solo-block-rewards').value) || 0
        };
    } catch (error) {
        console.error('Error getting input values:', error);
        alert('Please check your input values and try again.');
        return null;
    }
}

/**
 * Update the results display
 */
function updateResultsDisplay(calculationResult) {
    // Show results section
    document.getElementById('results-section').classList.remove('hidden');
    
    // ✅ Update table header based on strategy and greedy settings
    updateTableHeader(calculationResult.inputs);

    // Update summary cards
    document.getElementById('final-th').textContent = calculationResult.summary.finalTH.toFixed(2) + ' TH';
    document.getElementById('final-farm-th').textContent = calculationResult.summary.finalFarmTH.toFixed(2) + ' TH';
    document.getElementById('final-farm-efficiency').textContent = calculationResult.summary.finalFarmEfficiency.toFixed(2) + ' W/TH';
    document.getElementById('total-investment').textContent = '$' + calculationResult.summary.totalInvestment.toFixed(2);
    document.getElementById('final-gmt-balance').textContent = calculationResult.summary.finalGMTBalance.toFixed(4) + ' GMT';
    document.getElementById('hold-days').textContent = `${calculationResult.summary.holdDays}`; // NEU: Hold Days anzeigen
    
    // ✅ NEU: Update Average Discount Card
    if (document.getElementById('avg-total-discount')) {
        document.getElementById('avg-total-discount').textContent = calculationResult.summary.avgTotalDiscount.toFixed(2) + '%';
        document.getElementById('avg-base-discount').textContent = calculationResult.summary.avgBaseDiscount.toFixed(1) + '%';
        document.getElementById('avg-token-discount').textContent = calculationResult.summary.avgTokenDiscount.toFixed(2) + '%';
    }
    
    // ✅ NEU: Greedy Final TH Card
    const greedyFinalCard = document.getElementById('greedy-final-card');
    const greedyFinalTH = document.getElementById('greedy-final-th');
    
    if (document.getElementById('greedy-miner-enabled').checked) {
        greedyFinalCard.style.display = 'block';
        const isTargetIsGreedy = document.getElementById('target-is-greedy-toggle').checked;
        
        if (isTargetIsGreedy) {
            greedyFinalTH.textContent = calculationResult.summary.finalTH.toFixed(2) + ' TH ';
            greedyFinalTH.className = 'text-lg font-bold text-yellow-400 opacity-75'; // Dimmed
        } else {
            greedyFinalTH.textContent = calculationResult.summary.finalGreedyTH.toFixed(2) + ' TH';
            greedyFinalTH.className = 'text-lg font-bold text-yellow-400'; // Full brightness
        }
    } else {
        greedyFinalCard.style.display = 'none';
    }
    // ✅ NEU: Calculate and display greedy growth info
    if (document.getElementById('greedy-miner-enabled').checked) {
        greedyFinalCard.style.display = 'block';
        const isTargetIsGreedy = document.getElementById('target-is-greedy-toggle').checked;
        const greedyGrowthInfo = document.getElementById('greedy-growth-info');
        
        if (isTargetIsGreedy) {
            // ✅ KORRIGIERT: Target IS Greedy auch mit Growth % berechnen!
            const startingTargetTH = parseFloat(document.getElementById('miner-th').value) || 0;
            const finalTargetTH = calculationResult.summary.finalTH;
            const targetGrowth = startingTargetTH > 0 ? 
                ((finalTargetTH - startingTargetTH) / startingTargetTH * 100).toFixed(1) : 0;
            
            greedyFinalTH.textContent = finalTargetTH.toFixed(2) + ' TH';
            greedyFinalTH.className = 'text-lg font-bold text-yellow-400';
            if (greedyGrowthInfo) {
                greedyGrowthInfo.textContent = `Greedy: +${targetGrowth}%`;
            }
        } else {
            // ✅ Separate Greedy: Existierende Logik beibehalten
            const startingGreedyTH = parseFloat(document.getElementById('greedy-miner-th').value) || 0;
            const finalGreedyTH = calculationResult.summary.finalGreedyTH;
            const greedyGrowth = startingGreedyTH > 0 ? 
                ((finalGreedyTH - startingGreedyTH) / startingGreedyTH * 100).toFixed(1) : 0;
            
            greedyFinalTH.textContent = finalGreedyTH.toFixed(2) + ' TH';
            greedyFinalTH.className = 'text-lg font-bold text-yellow-400';
            if (greedyGrowthInfo) {
                greedyGrowthInfo.textContent = `Greedy: +${greedyGrowth}%`;
            }
        }
    } else {
        greedyFinalCard.style.display = 'none';
    }

    // NEU: BTC Balance Card (nur bei controlledv2 oder controlledv2-mw anzeigen)
    const btcBalanceCard = document.getElementById('final-btc').parentElement;
    if (currentStrategy === 'controlledv2' || currentStrategy === 'controlledv2-mw') {
        btcBalanceCard.style.display = 'block';
        document.getElementById('final-btc').textContent = calculationResult.summary.finalBTCBalance.toFixed(8) + ' BTC';
    } else {
        btcBalanceCard.style.display = 'none';
    }
    
    // Update chart
    updateChart(calculationResult.chartData);
    
    // Update results table
    const tableBody = document.getElementById('results-table-body');
    tableBody.innerHTML = '';
    
    // Prüfe MW Mode einmal außerhalb der Schleife
    const isMWMode = document.getElementById('miner-wars-toggle')?.checked ?? false;
    
    calculationResult.results.forEach(result => {
        const row = document.createElement('tr');
        
        // 1. Period label ✅ (MW immer als Cycles)
        const periodCell = document.createElement('td');
        
        if (isMWMode) {
            // Miner Wars: Immer Cycles anzeigen (basierend auf echten Di-Mo Perioden)
            const cycleNum = result.cycleNumber || Math.ceil(result.day / 7);
            periodCell.textContent = `Cycle ${cycleNum}`;
            periodCell.className = 'text-red-400 font-semibold';
        } else {
            // Mining Mode: Normal
            const chartPeriod = document.getElementById('chart-period').value;
            switch(chartPeriod) {
                case 'daily':
                    periodCell.textContent = `Day ${result.day}`;
                    break;
                case 'weekly':
                    periodCell.textContent = `Week ${Math.ceil(result.day / 7)}`;
                    break;
                case 'monthly':
                    periodCell.textContent = `Month ${Math.ceil(result.day / 30)}`;
                    break;
                case 'yearly':
                    periodCell.textContent = `Year ${Math.ceil(result.day / 365)}`;
                    break;
            }
        }
        row.appendChild(periodCell);
        
    // 2. Date ✅
    const dateCell = document.createElement('td');
    dateCell.textContent = result.date;
    row.appendChild(dateCell);
        
    // 3. Target Miner TH ✅
    const thCell = document.createElement('td');
    thCell.textContent = result.thAmount.toFixed(2) + ' TH';
    thCell.className = 'text-green-400';
    row.appendChild(thCell);
        
    // 4. Greedy TH Column (nur wenn greedy enabled) ✅
    const inputs = {
        greedy: document.getElementById('greedy-miner-enabled').checked,
        targetIsGreedy: document.getElementById('target-is-greedy-toggle').checked
    };
    
    if (inputs.greedy) {
        const greedyCell = document.createElement('td');
        if (inputs.targetIsGreedy) {
            greedyCell.textContent = result.thAmount.toFixed(2) + ' TH';
            greedyCell.className = 'text-yellow-400 opacity-60';
        } else {
            greedyCell.textContent = result.greedyTH.toFixed(2) + ' TH';
            greedyCell.className = 'text-yellow-400';
        }
        row.appendChild(greedyCell);
    }
        
    // 5. Farm TH Column ✅
    const farmCell = document.createElement('td');
    farmCell.textContent = result.farmTH.toFixed(2) + ' TH';
    farmCell.className = 'text-amber-600';
    row.appendChild(farmCell);
    
    // 6. Profit (Daily/Weekly je nach Mode) ✅
    const profitCell = document.createElement('td');
    profitCell.textContent = '$' + result.dailyProfitUSD.toFixed(2);
    profitCell.className = result.dailyProfitUSD >= 0 ? 'text-green-400' : 'text-red-400';
    // MW Mode: Zeige Hinweis dass es wöchentlicher Profit ist
    if (isMWMode && result.dailyProfitUSD !== 0) {
        profitCell.title = 'Weekly Net Profit (Revenue - Maintenance)';
    }
    row.appendChild(profitCell);
    
    // 7. Reinvestment ✅
    const reinvestCell = document.createElement('td');
    if (result.reinvestmentUSD > 0) {
        reinvestCell.innerHTML = `$${result.reinvestmentUSD.toFixed(2)}<br><span class="text-xs text-gray-400">${result.reinvestmentGMT.toFixed(2)} GMT</span>`;
    } else {
        reinvestCell.textContent = '-';
    }
    row.appendChild(reinvestCell);
    
    // 8. GMT Balance ✅
    const gmtCell = document.createElement('td');
    gmtCell.textContent = result.gmtBalance.toFixed(4) + ' GMT';
    gmtCell.className = result.gmtBalance >= 0 ? 'text-purple-400' : 'text-red-400';
    row.appendChild(gmtCell);
        // 10. BTC Balance (nur bei controlledv2) ✅
    if (currentStrategy === 'controlledv2') {
        const btcCell = document.createElement('td');
        btcCell.textContent = result.btcBalance.toFixed(8) + ' BTC';
        btcCell.className = 'text-orange-400';
        row.appendChild(btcCell);
    }
    // ✅ NEU: 9. Discount % Column
    const discountCell = document.createElement('td');
    if (result.discountPercent !== undefined) {
        discountCell.textContent = result.discountPercent.toFixed(2) + '%';
        discountCell.className = 'text-yellow-400';
        discountCell.title = `Base: ${result.discountBreakdown.base.toFixed(1)}% + Token: ${result.discountBreakdown.token.toFixed(1)}%`;
    } else {
        discountCell.textContent = '-';
        discountCell.className = 'text-gray-400';
    }
    row.appendChild(discountCell);
    
        
    // 11. Strategy ✅
    const strategyCell = document.createElement('td');
    strategyCell.textContent = result.strategy;
        
        // Color code strategy (existing logic)
        if (result.strategy.includes('Auto')) {
            strategyCell.className = 'text-green-400';
        } else if (result.strategy.includes('Manual')) {
            strategyCell.className = 'text-blue-400';
        } else if (result.strategy.includes('Saving') || result.strategy.includes('GMT')) {
            strategyCell.className = 'text-purple-400';
        } else if (result.strategy.includes('BTC')) {
            strategyCell.className = 'text-orange-400';
        } else if (result.strategy.includes('TH')) {
            strategyCell.className = 'text-green-400';
        } else if (result.strategy.includes('Greedy')) {
            strategyCell.className = 'text-yellow-400'; // ✅ NEU: Gold für Greedy Strategies
        } else {
            strategyCell.className = 'text-gray-400';
        }
        
    row.appendChild(strategyCell);
    
    tableBody.appendChild(row);
    });
    
    // Scroll to results
    document.getElementById('results-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
}


/**
 * Update table header based on strategy and greedy settings
 */
/**
 * Update table header based on strategy and greedy settings
 */
window.updateTableHeader = function updateTableHeader() {
    const table = document.querySelector('.results-table');
    if (!table) return;
    
    const thead = table.querySelector('thead tr');
    if (!thead) return;
    
    // Get current settings
    const isControlledV2 = currentStrategy === 'controlledv2';
    const isGreedyEnabled = document.getElementById('greedy-miner-enabled').checked;
    const isTargetIsGreedy = document.getElementById('target-is-greedy-toggle').checked;
    
    // Clear existing headers
    thead.innerHTML = '';
    
    // ✅ KORREKTE Header-Reihenfolge entsprechend den Spalten
    const headers = [];

    // 1. Day/Cycle (je nach Mode)
    const isMWMode = document.getElementById('miner-wars-toggle')?.checked ?? false;
    headers.push({ 
        text: isMWMode ? 'Cycle' : 'Day', 
        class: isMWMode ? 'text-red-400 px-4 py-3 text-left text-xs font-medium uppercase tracking-wider' : 'text-gray-300 px-4 py-3 text-left text-xs font-medium uppercase tracking-wider' 
    });
    
    // 2. Date
    headers.push({ text: 'Date', class: 'text-gray-300 px-4 py-3 text-left text-xs font-medium uppercase tracking-wider' });

    // 3. Target TH
    headers.push({ text: 'Target TH', class: 'text-green-400 px-4 py-3 text-left text-xs font-medium uppercase tracking-wider' });
    
    // 4. Greedy TH (nur wenn greedy enabled)
    if (isGreedyEnabled) {
        if (isTargetIsGreedy) {
            headers.push({ text: 'Greedy TH', class: 'text-yellow-400' });
        } else {
            headers.push({ text: 'Greedy TH', class: 'text-yellow-400' });
        }
    }
    
    // 5. Farm TH
    headers.push({ text: 'Farm TH', class: 'text-amber-600' });
    
    // 6. Profit (Daily/Weekly je nach Mode - uses isMWMode from line 1289)
    headers.push({ 
        text: isMWMode ? 'Weekly Profit' : 'Daily Profit', 
        class: isMWMode ? 'text-red-400' : 'text-gray-300' 
    });
    
    // 7. Reinvestment
    headers.push({ text: 'Reinvestment', class: 'text-gray-300' });
    
    // 8. GMT Balance
    headers.push({ text: 'GMT Balance', class: 'text-purple-400' });
    
    // 9. BTC Balance (nur bei controlledv2)
    if (isControlledV2) {
        headers.push({ text: 'BTC Balance', class: 'text-orange-400' });
    }
    
    // 10. Discount %
    headers.push({ text: 'Discount %', class: 'text-yellow-400' });
    
    // 11. Strategy
    headers.push({ text: 'Strategy', class: 'text-gray-300' });
    
    // Create header elements
    headers.forEach(header => {
        const th = document.createElement('th');
        th.textContent = header.text;
        th.className = `px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${header.class}`;
        thead.appendChild(th);
    });
}
/**
 * Update the growth chart
 */
function updateChart(chartData) {
    const ctx = document.getElementById('growthChart').getContext('2d');
    
    // Destroy existing chart if it exists
    if (growthChart) {
        growthChart.destroy();
    }
    
    // Determine which datasets to show based on strategy
    const datasets = [
        {
            label: 'GMT Balance',
            data: chartData.gmtData,
            borderColor: 'rgb(168, 85, 247)',
            backgroundColor: 'rgba(168, 85, 247, 0.1)',
            yAxisID: 'y1',
            tension: 0.4,
            fill: true
        },
        {
            label: 'Target Miner TH',
            data: chartData.thData,
            borderColor: 'rgb(34, 197, 94)',
            backgroundColor: 'rgba(34, 197, 94, 0.1)',
            yAxisID: 'y',
            tension: 0.4,
            fill: false
        },
        {
            label: 'Discount %',
            data: chartData.discountData,
            borderColor: 'rgb(234, 179, 8)', // Yellow-500
            backgroundColor: 'rgba(234, 179, 8, 0.1)',
            yAxisID: 'y3',
            tension: 0.4,
            fill: false
        }
    ];
    
    // Add BTC Balance line for controlledv2 strategy
    if (currentStrategy === 'controlledv2') {
        datasets.push({
            label: 'BTC Balance',
            data: chartData.btcData,
            borderColor: 'rgb(249, 115, 22)', // Orange
            backgroundColor: 'rgba(249, 115, 22, 0.1)',
            yAxisID: 'y2',
            tension: 0.4,
            fill: true
        });
    }
        // Add Greedy Miner line if separate greedy is enabled
    if (chartData.greedyData.some(value => value > 0)) {
        datasets.push({
            label: 'Greedy TH',
            data: chartData.greedyData,
            borderColor: 'rgb(255, 193, 7)', // Gold/Yellow for Greedy
            backgroundColor: 'rgba(255, 193, 7, 0.1)',
            yAxisID: 'y',
            tension: 0.4,
            fill: false
            });
        
        datasets.push({
            label: 'Total Farm TH',
            data: chartData.totalMiningData,
            borderColor: 'rgb(139, 69, 19)', // Brown for combined
            backgroundColor: 'rgba(139, 69, 19, 0.1)',
            yAxisID: 'y',
            tension: 0.4,
            fill: true
        });
    }
    // Create new chart
    growthChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: chartData.labels,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        color: '#d1d5db',
                        usePointStyle: true,
                        padding: 15
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(17, 24, 39, 0.9)',
                    titleColor: '#f3f4f6',
                    bodyColor: '#d1d5db',
                    borderColor: '#374151',
                    borderWidth: 1,
                    padding: 12,
                    displayColors: true,
                    callbacks: {
                        label: function(context) {
            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            
                            // Erweiterte Label-Behandlung für alle Chart-Linien
                            switch (context.dataset.label) {
                                case 'TH Amount':
                                case 'Target Miner TH':
                                    label += context.parsed.y.toFixed(2) + ' TH';
                                    break;
                                case 'Greedy Miner TH':
                                    label += context.parsed.y.toFixed(2) + ' TH';
                                    break;
                                case 'Total Mining TH':
                                    label += context.parsed.y.toFixed(2) + ' TH (Combined Farm)';
                                    break;
                                case 'GMT Balance':
                                    label += context.parsed.y.toFixed(4) + ' GMT';
                                    break;
                                case 'BTC Balance':
                                    label += context.parsed.y.toFixed(8) + ' BTC';
                                    break;
                                case 'Discount %':
                                    label += context.parsed.y.toFixed(2) + '%';
                                    break;
                                default:
                                    // Fallback für unbekannte Labels
                                    if (label.includes('TH')) {
                                        label += context.parsed.y.toFixed(2) + ' TH';
                                    } else {
                                        label += context.parsed.y.toFixed(2);
                                    }
                                    break;
                            }
                            return label;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        color: 'rgba(55, 65, 81, 0.5)'
                    },
                    ticks: {
                        color: '#9ca3af',
                        maxRotation: 45,
                        minRotation: 0
                    }
                },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: {
                        display: true,
                        text: 'TH Amount',
                        color: '#22c55e'
                    },
                    grid: {
                        color: 'rgba(55, 65, 81, 0.5)'
                    },
                    ticks: {
                        color: '#22c55e'
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: 'GMT Balance',
                        color: '#a855f7'
                    },
                    grid: {
                        drawOnChartArea: false,
                    },
                    ticks: {
                        color: '#a855f7'
                    }
                },
                // NEU: Y-Achse für BTC (nur bei controlledv2)
                ...(currentStrategy === 'controlledv2' && {
                    y2: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: {
                            display: true,
                            text: 'BTC Balance',
                            color: '#f97316'
                        },
                        grid: {
                            drawOnChartArea: false,
                        },
                        ticks: {
                            color: '#f97316',
                            callback: function(value) {
                                return value.toFixed(8);
                            }
                        }
                    }
                }),
                // NEU: Y-Achse für Discount %
                y3: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: 'Discount %',
                        color: '#eab308'
                    },
                    min: 0,
                    max: 35,
                    grid: {
                        drawOnChartArea: false,
                    },
                    ticks: {
                        color: '#eab308',
                        callback: function(value) {
                            return value.toFixed(1) + '%';
                        }
                    }
                }
            }
        }
    });
}

/**
 * Update the results table
 */
function updateResultsTable(results) {
    const tableBody = document.getElementById('results-table-body');
    tableBody.innerHTML = '';

    results.forEach((result, index) => {
        const row = document.createElement('tr');
        
        // Determine period label
        let periodLabel;
        if (result.day <= 30) {
            periodLabel = `Day ${result.day}`;
        } else if (result.day <= 365) {
            periodLabel = `Month ${Math.ceil(result.day / 30)}`;
        } else {
            periodLabel = `Year ${Math.ceil(result.day / 365)}`;
        }

        row.innerHTML = `
            <td>${periodLabel}</td>
            <td>${result.date}</td>
            <td>${result.thAmount.toFixed(3)} TH</td>
            <td>$${result.dailyProfitUSD.toFixed(2)}</td>
            <td>$${result.reinvestmentUSD.toFixed(2)}</td>
            <td>${result.gmtBalance.toFixed(2)} GMT</td>
            <td><span class="px-2 py-1 rounded text-xs font-medium ${getStrategyBadgeClass(result.strategy)}">${result.strategy}</span></td>
        `;
        
        tableBody.appendChild(row);
    });
}

/**
 * Get CSS classes for strategy badges
 */
function getStrategyBadgeClass(strategy) {
    switch (strategy) {
        case 'Auto +5%':
            return 'bg-green-600 text-white';
        case 'Manual':
            return 'bg-blue-600 text-white';
        case 'Saving':
        case 'MW Saving':
            return 'bg-cyan-600 text-white';
        default:
            return 'bg-gray-600 text-white';
    }
}

/**
 * Main calculation function called from HTML
 */
window.calculateReinvestment = function calculateReinvestment() {
    console.log('Starting reinvestment calculation...');
    
    try {
        const results = calculateReinvestmentStrategy();
        if (results) {
            updateResultsDisplay(results);
            console.log('Calculation completed successfully');
        }
    } catch (error) {
        console.error('Calculation error:', error);
        alert('An error occurred during calculation. Please check your inputs and try again.');
    }
}
// Global variable for cycle mode
let saveFirst = false;

window.updateCycleMode = function updateCycleMode() {
    saveFirst = document.getElementById('save-first-toggle').checked;
    const description = document.getElementById('cycle-description');
    
    if (saveFirst) {
        description.textContent = "Start with saving days, then auto-reinvest with 5% bonus";
    } else {
        description.textContent = "Start with auto-reinvest days, then save for maintenance";
    }
    
    // Recalculate if results are visible
    if (!document.getElementById('results-section').classList.contains('hidden')) {
        calculateReinvestment();
    }
}

/**
 * Calculate controlled reinvestment strategy (v2)
 * New version with separate BTC wallet and improved logic
 */
function calculateControlledReinvestV2() {
    const reinvestDays = parseInt(document.getElementById('controlled-reinvest-days-v2').value) || 0;
    const btcRewardDays = parseInt(document.getElementById('btc-reward-days-v2').value) || 0;
    const savingDays = parseInt(document.getElementById('controlled-saving-days-v2').value) || 0;
    
    const totalDays = reinvestDays + btcRewardDays + savingDays;
    document.getElementById('controlled-total-days-v2').textContent = totalDays;
    
    // Simulation über 365 Tage
    let currentTH = startingTH;
    let gmtWallet = startingGMT;
    let btcWallet = 0; // NEU: BTC Wallet
    
    const thData = [];
    const gmtData = [];
    const btcData = []; // NEU: BTC Chart-Daten
    
    for (let day = 1; day <= 365; day++) {
        const cycleDay = ((day - 1) % totalDays) + 1;
        
        const dailyReward = currentTH * satPerTH;
        const dailyMaintenanceSat = calculateDailyMaintenance(currentTH);
        const dailyMaintenanceGMT = (dailyMaintenanceSat / 1e8) * btcPrice / gmtPrice;
        
        // Entscheide basierend auf Zyklus-Tag
        if (cycleDay <= reinvestDays) {
            // Phase 1: Reinvest in TH mit +5%
            const netRewardSat = dailyReward - dailyMaintenanceSat;
            const netRewardUSD = (netRewardSat / 1e8) * btcPrice;
            const newTH = (netRewardUSD / pricePerTH) * 1.05; // +5% Bonus
            currentTH += newTH;
            gmtWallet -= dailyMaintenanceGMT;
            
        } else if (cycleDay <= reinvestDays + btcRewardDays) {
            // Phase 2: Reward in BTC, Maintenance in GMT
            btcWallet += dailyReward / 1e8; // Reward auf BTC Wallet
            gmtWallet -= dailyMaintenanceGMT;
            
        } else {
            // Phase 3: Saving (Reinvest in GMT)
            const rewardGMT = (dailyReward / 1e8) * btcPrice / gmtPrice;
            gmtWallet += rewardGMT - dailyMaintenanceGMT;
        }
        
        thData.push({ x: day, y: currentTH });
        gmtData.push({ x: day, y: gmtWallet });
        btcData.push({ x: day, y: btcWallet }); // NEU
    }
    
    // Chart aktualisieren mit BTC-Linie (orange)
    updateChart(thData, gmtData, btcData);
    
    // Results anzeigen
    displayResults({
        finalTH: currentTH,
        finalGMT: gmtWallet,
        finalBTC: btcWallet // NEU
    });
}
   /* function updateControlledV2Settings() {
        const reinvestDays = parseInt(document.getElementById('controlled-reinvest-days-v2').value) || 0;
        const btcRewardDays = parseInt(document.getElementById('btc-reward-days-v2').value) || 0;
        const savingDays = parseInt(document.getElementById('controlled-saving-days-v2').value) || 0;
        
        const totalDays = reinvestDays + btcRewardDays + savingDays;
        document.getElementById('controlled-total-days-v2').textContent = `${totalDays} days`;
        
        // Update phase summaries
        document.getElementById('phase1-summary').textContent = `${reinvestDays}d TH reinvest`;
        document.getElementById('phase2-summary').textContent = `${btcRewardDays}d BTC accumulation`;
        document.getElementById('phase3-summary').textContent = `${savingDays}d GMT saving`;
    } */
// Global variable for cycle mode v2
let saveFirstV2 = false;

window.updateCycleModeV2 = function updateCycleModeV2() {
    saveFirstV2 = document.getElementById('save-first-toggle-v2').checked;
    const description = document.getElementById('cycle-description-v2');
    const cycleOrder = document.getElementById('cycle-order-v2');
    
    // Sichere Element-Zugriffe mit Fallback-Werten
    const savingDaysElement = document.getElementById('controlled-saving-days-v2');
    const btcDaysElement = document.getElementById('btc-reward-days-v2');
    const reinvestDaysElement = document.getElementById('controlled-reinvest-days-v2');
    
    const savingDays = savingDaysElement ? savingDaysElement.value : '10';
    const btcDays = btcDaysElement ? btcDaysElement.value : '10';
    const reinvestDays = reinvestDaysElement ? reinvestDaysElement.value : '10';
    
    if (saveFirstV2) {
        description.textContent = "Start with GMT saving, then BTC accumulation, then TH reinvest with 5% bonus";
        cycleOrder.innerHTML = `
            Phase 1: <span class="text-green-400">${savingDays}d GMT saving</span> → 
            Phase 2: <span class="text-orange-400">${btcDays}d BTC accumulation</span> → 
            Phase 3: <span class="text-blue-400">${reinvestDays}d TH reinvest</span>
        `;
    } else {
        description.textContent = "Start with TH reinvest, then BTC accumulation, then GMT saving";
        cycleOrder.innerHTML = `
            Phase 1: <span class="text-blue-400">${reinvestDays}d TH reinvest</span> → 
            Phase 2: <span class="text-orange-400">${btcDays}d BTC accumulation</span> → 
            Phase 3: <span class="text-green-400">${savingDays}d GMT saving</span>
        `;
    }
    
    // Recalculate if results are visible
    if (!document.getElementById('results-section').classList.contains('hidden')) {
        calculateReinvestment();
    }
}

function updateControlledV2Settings() {
    const reinvestDays = parseInt(document.getElementById('controlled-reinvest-days-v2').value) || 0;
    const btcRewardDays = parseInt(document.getElementById('btc-reward-days-v2').value) || 0;
    const savingDays = parseInt(document.getElementById('controlled-saving-days-v2').value) || 0;
    
    const totalDays = reinvestDays + btcRewardDays + savingDays;
    document.getElementById('controlled-total-days-v2').textContent = `${totalDays} days`;
    
    // Update cycle order display
    updateCycleModeV2();
}

/**
 * Update table header based on strategy
 */  /*
function updateTableHeader() {
    const table = document.querySelector('.results-table');
    const btcHeader = table.querySelector('th:nth-child(7)'); // BTC Balance header
    
    if (currentStrategy === 'controlledv2') {
        btcHeader.style.display = 'table-cell';
    } else {
        btcHeader.style.display = 'none';
    }
} */
       // ===== GREEDY MINER FUNCTIONS =====
        
        function updateGreedyMode() {
            const isSeparate = document.getElementById('greedy-miner-separate').checked;
            const targetContainer = document.getElementById('target-th-container');
            const description = document.getElementById('greedy-mode-description');
            
            if (isSeparate) {
                targetContainer.style.display = 'none';
                description.textContent = 'Separate Mode: Miner grows independently without limit';
            } else {
                targetContainer.style.display = 'block';
                description.textContent = 'Target Mode: Miner grows towards a specific TH target';
            }
            
            updateGreedyPreview();
        }
        
        function updateGreedyPreview() {
            const calculationPeriod = parseInt(document.getElementById('calculation-period').value) || 30;
            const chartPeriod = document.getElementById('chart-period').value || 'daily';
            
            // Calculate total days based on period
            let totalDays;
            switch(chartPeriod) {
                case 'daily': totalDays = calculationPeriod; break;
                case 'weekly': totalDays = calculationPeriod * 7; break;
                case 'monthly': totalDays = calculationPeriod * 30; break;
                case 'yearly': totalDays = calculationPeriod * 365; break;
                case 'cycles': totalDays = calculationPeriod * 7; break; // Miner Wars cycles
                default: totalDays = calculationPeriod;
            }
            
            // Count Tuesdays using the same logic as in the calculator
            let tuesdayCount = 0;
            const startDate = new Date();
            
            for (let day = 0; day < totalDays; day++) {
                const currentDate = new Date(startDate.getTime() + day * 24 * 60 * 60 * 1000);
                if (currentDate.getDay() === 2) { // Tuesday = 2
                    tuesdayCount++;
                }
            }
            
            document.getElementById('tuesday-count').textContent = `${tuesdayCount}`;
        }

        window.toggleGreedyOptions = function toggleGreedyOptions() {
            const isEnabled = document.getElementById('greedy-miner-enabled').checked;
            const greedyOptions = document.getElementById('greedy-options');
            
            if (isEnabled) {
                greedyOptions.style.display = 'block';
                updateGreedyConfig(); // Update config when options are shown
            } else {
                greedyOptions.style.display = 'none';
            }
        }

        window.updateGreedyConfig = function updateGreedyConfig() {
            const targetIsGreedy = document.getElementById('target-is-greedy-toggle').checked;
            const separateGreedySection = document.getElementById('separate-greedy-section');
            const greedyConfigDescription = document.getElementById('greedy-config-description');
            const greedySummary = document.getElementById('greedy-summary');
            
            // Get current values
            const targetMinerTH = parseFloat(document.getElementById('miner-th').value) || 1.0;
            const greedyMinerTH = parseFloat(document.getElementById('greedy-miner-th').value) || 1.0;
            const greedyEfficiency = parseInt(document.getElementById('greedy-miner-efficiency').value) || 20.00;
            const greedyGrowthRate = parseFloat(document.getElementById('greedy-growth-rate').value) || 0.12;
            
            if (targetIsGreedy) {
                // Target miner IS the greedy miner
                separateGreedySection.style.display = 'none';
                greedyConfigDescription.textContent = 'The target miner will grow by the specified percentage every Tuesday';
                greedySummary.innerHTML = `
                    Configuration: <span class="text-green-400">Target Miner (${targetMinerTH.toFixed(1)} TH)</span> is the Greedy Miner 
                    (grows ${greedyGrowthRate}% every Tuesday)
                `;
            } else {
                // Separate greedy miner
                separateGreedySection.style.display = 'block';
                greedyConfigDescription.textContent = 'Target miner and greedy miner are separate miners';
                const totalTH = targetMinerTH + greedyMinerTH;
                greedySummary.innerHTML = `
                    Configuration: <span class="text-blue-400">Target Miner (${targetMinerTH.toFixed(1)} TH)</span> + 
                    <span class="text-green-400">Separate Greedy (${greedyMinerTH.toFixed(1)} TH @ ${greedyEfficiency} W/TH)</span> = 
                    <span class="text-white font-bold">${totalTH.toFixed(1)} TH total</span> with greedy growth ${greedyGrowthRate}% every Tuesday
                `;
            }
        }
