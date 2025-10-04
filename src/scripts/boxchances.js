// boxchances.js - GOBoxes Chance Data for HashSense
// All probability data for different box tiers and their contents

const goBoxesData = {
    bronze: [
        { item: "8 TH Miner", chance: 0.25, range: "Range 0-24", rarity: "rare", icon: "⚡" },
        { item: "50 GOMINING", chance: 0.25, range: "Range 25-49", rarity: "rare", icon: "💎" },
        { item: "15 Bonus miner days", chance: 0.25, range: "Range 50-74", rarity: "rare", icon: "📅" },
        { item: "4 TH Miner", chance: 0.50, range: "Range 75-124", rarity: "uncommon", icon: "⚡" },
        { item: "20 GOMINING", chance: 0.50, range: "Range 125-174", rarity: "uncommon", icon: "💎" },
        { item: "10 Bonus miner days", chance: 0.50, range: "Range 175-224", rarity: "uncommon", icon: "📅" },
        { item: "2 TH Miner", chance: 1.00, range: "Range 225-324", rarity: "uncommon", icon: "⚡" },
        { item: "5 Bonus miner days", chance: 1.00, range: "Range 325-424", rarity: "uncommon", icon: "📅" },
        { item: "1 TH Miner", chance: 2.50, range: "Range 425-674", rarity: "uncommon", icon: "⚡" },
        { item: "10 GOMINING", chance: 2.50, range: "Range 675-924", rarity: "uncommon", icon: "💎" },
        { item: "3 Bonus miner days", chance: 2.50, range: "Range 925-1174", rarity: "uncommon", icon: "📅" },
        { item: "-10% on power upgrade", chance: 6.00, range: "Range 1175-1774", rarity: "", icon: "⚡" },
        { item: "-7% on power upgrade", chance: 15.00, range: "Range 1775-3274", rarity: "", icon: "⚡" },
        { item: "5 GOMINING", chance: 15.50, range: "Range 3275-4824", rarity: "common", icon: "💎" },
        { item: "1 Bonus miner day", chance: 15.75, range: "Range 4825-6399", rarity: "common", icon: "📅" },
        { item: "-5% on power upgrade", chance: 36.00, range: "Range 6400-9999", rarity: "common", icon: "⚡" }
    ],
    silver: [
        { item: "Access key", chance: 0.05, range: "Range 0-4", rarity: "legendary", icon: "🗝️" },
        { item: "16 TH Miner", chance: 0.10, range: "Range 5-14", rarity: "legendary", icon: "⚡" },
        { item: "200 GOMINING", chance: 0.10, range: "Range 15-24", rarity: "legendary", icon: "💎" },
        { item: "8 TH Miner", chance: 0.25, range: "Range 25-49", rarity: "rare", icon: "⚡" },
        { item: "100 GOMINING", chance: 0.25, range: "Range 50-74", rarity: "rare", icon: "💎" },
        { item: "50 GOMINING", chance: 0.50, range: "Range 75-124", rarity: "uncommon", icon: "💎" },
        { item: "4 TH Miner", chance: 0.75, range: "Range 125-199", rarity: "uncommon", icon: "⚡" },
        { item: "20 GOMINING", chance: 1.00, range: "Range 200-299", rarity: "uncommon", icon: "💎" },
        { item: "20 Bonus miner days", chance: 1.25, range: "Range 300-424", rarity: "uncommon", icon: "📅" },
        { item: "2 TH Miner", chance: 1.50, range: "Range 425-574", rarity: "uncommon", icon: "⚡" },
        { item: "10 Bonus miner days", chance: 2.75, range: "Range 575-849", rarity: "common", icon: "📅" },
        { item: "1 TH Miner", chance: 5.00, range: "Range 850-1349", rarity: "common", icon: "⚡" },
        { item: "10 GOMINING", chance: 5.00, range: "Range 1350-1849", rarity: "common", icon: "💎" },
        { item: "5 Bonus miner days", chance: 5.00, range: "Range 1850-2349", rarity: "common", icon: "📅" },
        { item: "-10% on power upgrade", chance: 6.00, range: "Range 2350-2949", rarity: "", icon: "⚡" },
        { item: "5 GOMINING", chance: 7.50, range: "Range 2950-3699", rarity: "common", icon: "💎" },
        { item: "3 Bonus miner days", chance: 12.00, range: "Range 3700-4899", rarity: "common", icon: "📅" },
        { item: "-7% on power upgrade", chance: 15.00, range: "Range 4900-6399", rarity: "", icon: "⚡" },
        { item: "-5% on power upgrade", chance: 36.00, range: "Range 6400-9999", rarity: "common", icon: "⚡" }
    ],
    gold: [
        { item: "64 TH Miner", chance: 0.05, range: "Range 0-4", rarity: "legendary", icon: "⚡" },
        { item: "500 GOMINING", chance: 0.05, range: "Range 5-9", rarity: "legendary", icon: "💎" },
        { item: "32 TH Miner", chance: 0.20, range: "Range 10-29", rarity: "rare", icon: "⚡" },
        { item: "250 GOMINING", chance: 0.20, range: "Range 30-49", rarity: "rare", icon: "💎" },
        { item: "Access key", chance: 0.25, range: "Range 50-74", rarity: "rare", icon: "🗝️" },
        { item: "16 TH Miner", chance: 0.50, range: "Range 75-124", rarity: "uncommon", icon: "⚡" },
        { item: "200 GOMINING", chance: 0.50, range: "Range 125-174", rarity: "uncommon", icon: "💎" },
        { item: "8 TH Miner", chance: 1.00, range: "Range 175-274", rarity: "uncommon", icon: "⚡" },
        { item: "100 GOMINING", chance: 1.25, range: "Range 275-399", rarity: "uncommon", icon: "💎" },
        { item: "30 Bonus miner days", chance: 1.25, range: "Range 400-524", rarity: "uncommon", icon: "📅" },
        { item: "4 TH Miner", chance: 2.50, range: "Range 525-774", rarity: "uncommon", icon: "⚡" },
        { item: "50 GOMINING", chance: 2.50, range: "Range 775-1024", rarity: "uncommon", icon: "💎" },
        { item: "20 Bonus miner days", chance: 2.75, range: "Range 1025-1299", rarity: "common", icon: "📅" },
        { item: "15 Bonus miner days", chance: 5.00, range: "Range 1300-1799", rarity: "common", icon: "📅" },
        { item: "-10% on power upgrade", chance: 6.00, range: "Range 1800-2399", rarity: "", icon: "⚡" },
        { item: "2 TH Miner", chance: 7.50, range: "Range 2400-3149", rarity: "common", icon: "⚡" },
        { item: "20 GOMINING", chance: 7.50, range: "Range 3150-3899", rarity: "common", icon: "💎" },
        { item: "10 Bonus miner days", chance: 10.00, range: "Range 3900-4899", rarity: "common", icon: "📅" },
        { item: "-7% on power upgrade", chance: 15.00, range: "Range 4900-6399", rarity: "", icon: "⚡" },
        { item: "-5% on power upgrade", chance: 36.00, range: "Range 6400-9999", rarity: "common", icon: "⚡" }
    ],
    platinum: [
        { item: "256 TH Miner", chance: 0.10, range: "Range 0-9", rarity: "legendary", icon: "⚡" },
        { item: "1000 GOMINING", chance: 0.10, range: "Range 10-19", rarity: "legendary", icon: "💎" },
        { item: "128 TH Miner", chance: 0.25, range: "Range 20-44", rarity: "rare", icon: "⚡" },
        { item: "500 GOMINING", chance: 0.25, range: "Range 45-69", rarity: "rare", icon: "💎" },
        { item: "Access key", chance: 0.55, range: "Range 70-124", rarity: "uncommon", icon: "🗝️" },
        { item: "64 TH Miner", chance: 0.75, range: "Range 125-199", rarity: "uncommon", icon: "⚡" },
        { item: "60 Bonus miner days", chance: 1.00, range: "Range 200-299", rarity: "uncommon", icon: "📅" },
        { item: "32 TH Miner", chance: 1.25, range: "Range 300-424", rarity: "uncommon", icon: "⚡" },
        { item: "250 GOMINING", chance: 1.25, range: "Range 425-549", rarity: "uncommon", icon: "💎" },
        { item: "16 TH Miner", chance: 2.50, range: "Range 550-799", rarity: "uncommon", icon: "⚡" },
        { item: "200 GOMINING", chance: 2.50, range: "Range 800-1049", rarity: "uncommon", icon: "💎" },
        { item: "30 Bonus miner days", chance: 2.50, range: "Range 1050-1299", rarity: "uncommon", icon: "📅" },
        { item: "8 TH Miner", chance: 5.00, range: "Range 1300-1799", rarity: "common", icon: "⚡" },
        { item: "25 Bonus miner days", chance: 5.00, range: "Range 1800-2299", rarity: "common", icon: "📅" },
        { item: "-10% on power upgrade", chance: 6.00, range: "Range 2300-2899", rarity: "", icon: "⚡" },
        { item: "100 GOMINING", chance: 7.50, range: "Range 2900-3649", rarity: "common", icon: "💎" },
        { item: "20 Bonus miner days", chance: 12.50, range: "Range 3650-4899", rarity: "common", icon: "📅" },
        { item: "-7% on power upgrade", chance: 15.00, range: "Range 4900-6399", rarity: "", icon: "⚡" },
        { item: "-5% on power upgrade", chance: 36.00, range: "Range 6400-9999", rarity: "common", icon: "⚡" }
    ],
    diamond: [
           { item: "256 TH Miner", chance: 0.15, range: "Range 0-14", rarity: "rare", icon: "⚡" },
           { item: "1000 GOMINING", chance: 0.15, range: "Range 15-29", rarity: "rare", icon: "💎" },
           { item: "128 TH Miner", chance: 0.50, range: "Range 30-79", rarity: "uncommon", icon: "⚡" },
           { item: "500 GOMINING", chance: 0.50, range: "Range 80-129", rarity: "uncommon", icon: "💎" },
           { item: "60 Bonus miner days", chance: 0.50, range: "Range 130-179", rarity: "uncommon", icon: "📅" },
           { item: "250 GOMINING", chance: 1.00, range: "Range 180-279", rarity: "uncommon", icon: "💎" },
           { item: "64 TH Miner", chance: 1.20, range: "Range 280-399", rarity: "uncommon", icon: "⚡" },
           { item: "Access key", chance: 2.50, range: "Range 400-649", rarity: "uncommon", icon: "🗝️" },
           { item: "32 TH Miner", chance: 2.50, range: "Range 650-899", rarity: "uncommon", icon: "⚡" },
           { item: "30 Bonus miner days", chance: 2.50, range: "Range 900-1149", rarity: "uncommon", icon: "📅" },
           { item: "16 TH Miner", chance: 5.00, range: "Range 1150-1649", rarity: "common", icon: "⚡" },
           { item: "200 GOMINING", chance: 5.00, range: "Range 1650-2149", rarity: "common", icon: "💎" },
           { item: "25 Bonus miner days", chance: 5.00, range: "Range 2150-2649", rarity: "common", icon: "📅" },
           { item: "-10% on power upgrade", chance: 6.00, range: "Range 2650-3249", rarity: "", icon: "⚡" },
           { item: "8 TH Miner", chance: 7.50, range: "Range 3250-3999", rarity: "common", icon: "⚡" },
           { item: "100 GOMINING", chance: 7.50, range: "Range 4000-4749", rarity: "common", icon: "💎" },
           { item: "-7% on power upgrade", chance: 22.50, range: "Range 4750-6999", rarity: "", icon: "⚡" },
           { item: "-5% on power upgrade", chance: 30.00, range: "Range 7000-9999", rarity: "common", icon: "⚡" }
    ],
    legend: [
        { item: "384 TH Miner", chance: 0.05, range: "Range 0-4", rarity: "legendary", icon: "⚡" },
        { item: "1500 GOMINING", chance: 0.05, range: "Range 5-9", rarity: "legendary", icon: "💎" },
        { item: "256 TH Miner", chance: 0.45, range: "Range 10-54", rarity: "rare", icon: "⚡" },
        { item: "1000 GOMINING", chance: 0.45, range: "Range 55-99", rarity: "rare", icon: "💎" },
        { item: "128 TH Miner", chance: 1.00, range: "Range 100-199", rarity: "uncommon", icon: "⚡" },
        { item: "500 GOMINING", chance: 1.00, range: "Range 200-299", rarity: "uncommon", icon: "💎" },
        { item: "64 TH Miner", chance: 2.50, range: "Range 300-549", rarity: "uncommon", icon: "⚡" },
        { item: "250 GOMINING", chance: 2.50, range: "Range 550-799", rarity: "uncommon", icon: "💎" },
        { item: "Access key", chance: 5.00, range: "Range 800-1299", rarity: "common", icon: "🗝️" },
        { item: "32 TH Miner", chance: 5.00, range: "Range 1300-1799", rarity: "common", icon: "⚡" },
        { item: "60 Bonus miner days", chance: 5.00, range: "Range 1800-2299", rarity: "common", icon: "📅" },
        { item: "16 TH Miner", chance: 7.50, range: "Range 2300-3049", rarity: "common", icon: "⚡" },
        { item: "200 GOMINING", chance: 7.50, range: "Range 3050-3799", rarity: "common", icon: "💎" },
        { item: "-10% on power upgrade", chance: 9.00, range: "Range 3800-4699", rarity: "", icon: "⚡" },
        { item: "100 GOMINING", chance: 12.50, range: "Range 4700-5949", rarity: "common", icon: "💎" },
        { item: "-7% on power upgrade", chance: 18.00, range: "Range 5950-7749", rarity: "", icon: "⚡" },
        { item: "-5% on power upgrade", chance: 22.50, range: "Range 7750-9999", rarity: "common", icon: "⚡" }
    ]
};

// Rarity definitions for color coding
const rarityConfig = {
    common: { color: 'text-gray-400', bgColor: 'bg-gray-600' },
    uncommon: { color: 'text-green-400', bgColor: 'bg-green-600' },
    rare: { color: 'text-blue-400', bgColor: 'bg-blue-600' },
    epic: { color: 'text-purple-400', bgColor: 'bg-purple-600' },
    legendary: { color: 'text-yellow-400', bgColor: 'bg-yellow-600' },
    mythic: { color: 'text-red-400', bgColor: 'bg-red-600' }
};

// Helper functions for data processing
function getBoxData(boxType) {
    return goBoxesData[boxType] || [];
}

function getRarityStyle(rarity) {
    return rarityConfig[rarity] || rarityConfig.common;
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { goBoxesData, rarityConfig, getBoxData, getRarityStyle };
}