// filepath: src/scripts/header_new.js
function renderHeader() {
    return `
    <header class="fixed top-0 left-0 right-0 z-50 bg-gray-900/95 backdrop-blur-lg border-b border-purple-500/30">
        <div class="container mx-auto px-6">
            <div class="flex items-center justify-between h-16">
                <!-- Logo/Brand -->
                <div class="flex items-center gap-3">
                    <img src="assets/favicon.ico" alt="HashFarm" class="w-8 h-8">
                    <a href="index.html" class="text-xl font-bold text-white hover:text-purple-400 transition-colors">
                        HashFarm
                    </a>
                </div>
                
                <!-- Live Prices - Compact -->
                <div class="hidden md:flex items-center gap-4 text-sm">
                    <!-- BTC Price -->
                    <div class="flex items-center gap-2 px-3 py-1.5 bg-gray-800/50 rounded-lg border border-gray-700/50">
                        <img src="bitcoin-910307_1280.webp" alt="BTC" class="w-5 h-5">
                        <span class="text-gray-400">BTC</span>
                        <span class="font-mono text-white" id="header-btc-price">$--</span>
                    </div>
                    
                    <!-- GMT Price -->
                    <div class="flex items-center gap-2 px-3 py-1.5 bg-gray-800/50 rounded-lg border border-gray-700/50">
                        <img src="GoMining_Logo.webp" alt="GMT" class="w-5 h-5">
                        <span class="text-gray-400">GMT</span>
                        <span class="font-mono text-white" id="gmt-token-price">$--</span>
                    </div>
                    
                    <!-- Sats/TH - Fixed at 42 -->
                    <div class="flex items-center gap-2 px-3 py-1.5 bg-gray-800/50 rounded-lg border border-gray-700/50">
                        <img src="sats-ordinals-sats-logo.png" alt="Sats" class="w-5 h-5">
                        <span class="text-gray-400">Sats/TH</span>
                        <span class="font-mono text-yellow-400 font-semibold">42</span>
                    </div>
                </div>
                
                <!-- Navigation -->
                <nav class="flex items-center gap-4">
                    <a href="HashSense.html" class="text-gray-300 hover:text-purple-400 transition-colors text-sm font-medium">
                        Calculator
                    </a>
                    <a href="farm2.html" class="text-gray-300 hover:text-purple-400 transition-colors text-sm font-medium">
                        Farm
                    </a>
                    <a href="login.html" class="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-all duration-300 text-sm font-medium">
                        Login
                    </a>
                </nav>
            </div>
        </div>
    </header>
    `;
}

// Update header prices from global variables
function updateHeaderPrices() {
    // BTC Price
    if (window.btcPrice || window.BitcoinPrice) {
        const price = window.btcPrice || window.BitcoinPrice;
        const btcFormatted = parseFloat(price).toLocaleString('en-US', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        });
        const element = document.getElementById('header-btc-price');
        if (element) {
            element.textContent = `$${btcFormatted}`;
        }
    }
    
    // GMT Price
    if (window.gmtPrice || window.GMTPrice) {
        const price = window.gmtPrice || window.GMTPrice;
        const element = document.getElementById('gmt-token-price');
        if (element) {
            element.textContent = `$${price}`;
        }
    }
}

// Auto-render header on page load
document.addEventListener('DOMContentLoaded', () => {
    const headerContainer = document.getElementById('header-container');
    if (headerContainer) {
        headerContainer.innerHTML = renderHeader();
        
        // Update prices periodically
        setInterval(updateHeaderPrices, 500);
        
        // Initial update after short delay
        setTimeout(updateHeaderPrices, 100);
    }
});
