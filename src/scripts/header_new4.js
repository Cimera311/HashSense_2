// filepath: src/scripts/header_new.js
function renderHeader() {
    return `
    <header class="fixed top-0 left-0 right-0 z-50 bg-gray-900/95 backdrop-blur-lg border-b border-purple-500/30">
        <div class="container mx-auto px-4 sm:px-6">
            <div class="flex items-center justify-between h-16">
                <!-- Logo/Brand -->
                <div class="flex items-center gap-3">
                    <img src="assets/favicon.ico" alt="HashFarm" class="w-8 h-8">
                    <a href="index.html" class="text-xl font-bold text-white hover:text-purple-400 transition-colors">
                        HashFarm
                    </a>
                </div>
                
                <!-- Live Prices - Responsive Grid -->
                <div class="hidden lg:flex items-center gap-3 text-sm">
                    <!-- BTC Price -->
                    <div class="flex items-center gap-2 px-3 py-1.5 bg-gray-800/50 rounded-lg border border-gray-700/50">
                        <img src="bitcoin-910307_1280.webp" alt="BTC" class="w-5 h-5">
                        <span class="text-gray-400 hidden xl:inline">BTC</span>
                        <select id="bitcoin-price-dropdown" onchange="updateBTCPrice();" 
                            class="bg-transparent text-white focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                            style="background-color: #1a1a2e !important; border: 1px solid #6b46c1; border-radius: 6px; padding: 4px 8px; min-width: 120px;">
                            <option value="10000">10,000 $</option>
                            <option value="20000">20,000 $</option>
                            <option value="30000">30,000 $</option>    
                            <option value="40000">40,000 $</option>
                            <option value="50000">50,000 $</option>
                            <option value="60000">60,000 $</option>   
                            <option value="70000">70,000 $</option>
                            <option value="80000">80,000 $</option>
                            <option value="90000">90,000 $</option>
                            <option id="currentp" value="0">0 </option>
                            <option value="100000">100,000 $</option>
                            <option value="110000">110,000 $</option>
                            <option value="120000">120,000 $</option>
                            <option value="130000">130,000 $</option>
                            <option value="140000">140,000 $</option>
                            <option value="150000">150,000 $</option>
                            <option value="160000">160,000 $</option>
                            <option value="200000">200,000 $</option>
                            <option value="250000">250,000 $</option>
                            <option value="300000">300,000 $</option>
                            <option value="400000">400,000 $</option>   
                        </select>
                    </div>
                    
                    <!-- GMT Price -->
                    <div class="flex items-center gap-2 px-3 py-1.5 bg-gray-800/50 rounded-lg border border-gray-700/50">
                        <img src="GoMining_Logo.webp" alt="GMT" class="w-5 h-5">
                        <span class="text-gray-400 hidden xl:inline">GMT</span>
                        <span class="font-mono text-white" id="header-gmt-price">$--</span>
                    </div>
                    
                    <!-- Sats/TH -->
                    <div class="flex items-center gap-2 px-3 py-1.5 bg-gray-800/50 rounded-lg border border-gray-700/50">
                        <img src="sats-ordinals-sats-logo.png" alt="Sats" class="w-5 h-5">
                        <span class="text-gray-400 hidden xl:inline">Sats/TH</span>
                        <span class="font-mono text-yellow-400 font-semibold">42</span>
                    </div>
                </div>

                <!-- Compact Prices (Tablet screens) -->
                <div class="hidden md:flex lg:hidden items-center gap-2 text-sm">
                    <div class="flex items-center gap-2 px-2 py-1.5 bg-gray-800/50 rounded-lg border border-gray-700/50">
                        <img src="bitcoin-910307_1280.webp" alt="BTC" class="w-4 h-4">
                        <select id="bitcoin-price-dropdown-tablet" onchange="updateBTCPrice();" 
                            class="bg-transparent text-white focus:outline-none text-sm"
                            style="background-color: #1a1a2e !important; border: 1px solid #6b46c1; border-radius: 4px; padding: 4px;">
                            <option value="10000">10,000 $</option>
                            <option value="20000">20,000 $</option>
                            <option value="30000">30,000 $</option>    
                            <option value="40000">40,000 $</option>
                            <option value="50000">50,000 $</option>
                            <option value="60000">60,000 $</option>   
                            <option value="70000">70,000 $</option>
                            <option value="80000">80,000 $</option>
                            <option value="90000">90,000 $</option>
                            <option id="currentp-tablet" value="0">current price</option>
                            <option value="100000">100,000 $</option>
                            <option value="110000">110,000 $</option>
                            <option value="120000">120,000 $</option>
                            <option value="130000">130,000 $</option>
                            <option value="140000">140,000 $</option>
                            <option value="150000">150,000 $</option>
                            <option value="160000">160,000 $</option>
                            <option value="200000">200,000 $</option>
                            <option value="250000">250,000 $</option>
                            <option value="300000">300,000 $</option>
                            <option value="400000">400,000 $</option>
                        </select>
                    </div>
                    <div class="flex items-center gap-2 px-2 py-1.5 bg-gray-800/50 rounded-lg border border-gray-700/50">
                        <img src="GoMining_Logo.webp" alt="GMT" class="w-4 h-4">
                        <span class="font-mono text-white text-sm" id="header-gmt-price-tablet">$--</span>
                    </div>
                </div>
                
                <!-- Desktop Navigation -->
                <nav class="hidden md:flex items-center gap-4">
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

                <!-- Mobile: Burger Menu Button -->
                <button id="burger-menu-btn" class="md:hidden text-white p-2 hover:bg-gray-800 rounded-lg transition-colors" onclick="toggleMobileMenu()">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
                    </svg>
                </button>
            </div>
        </div>

        <!-- Mobile Menu (Hidden by default) -->
        <div id="mobile-menu" class="hidden md:hidden bg-gray-900 border-t border-gray-800">
            <div class="container mx-auto px-4 py-4 space-y-3">
                <!-- Mobile Prices -->
                <div class="grid grid-cols-2 gap-2 pb-3 border-b border-gray-800">
                    <div class="flex items-center gap-2 px-3 py-2 bg-gray-800/50 rounded-lg">
                        <img src="bitcoin-910307_1280.webp" alt="BTC" class="w-5 h-5">
                        <div class="flex-1">
                            <span class="text-gray-400 text-xs block">BTC</span>
                            <select id="bitcoin-price-dropdown-mobile" onchange="updateBTCPrice();" 
                                class="w-full bg-transparent text-white text-sm focus:outline-none"
                                style="background-color: #1a1a2e !important; border: 1px solid #6b46c1; border-radius: 4px; padding: 4px;">
                                <option value="10000">10,000 $</option>
                                <option value="20000">20,000 $</option>
                                <option value="30000">30,000 $</option>    
                                <option value="40000">40,000 $</option>
                                <option value="50000">50,000 $</option>
                                <option value="60000">60,000 $</option>   
                                <option value="70000">70,000 $</option>
                                <option value="80000">80,000 $</option>
                                <option value="90000">90,000 $</option>
                                <option id="currentp-mobile" value="0">current price</option>
                                <option value="100000">100,000 $</option>
                                <option value="110000">110,000 $</option>
                                <option value="120000">120,000 $</option>
                                <option value="130000">130,000 $</option>
                                <option value="140000">140,000 $</option>
                                <option value="150000">150,000 $</option>
                                <option value="160000">160,000 $</option>
                                <option value="200000">200,000 $</option>
                                <option value="250000">250,000 $</option>
                                <option value="300000">300,000 $</option>
                                <option value="400000">400,000 $</option>
                            </select>
                        </div>
                    </div>
                    <div class="flex items-center gap-2 px-3 py-2 bg-gray-800/50 rounded-lg">
                        <img src="GoMining_Logo.webp" alt="GMT" class="w-5 h-5">
                        <div class="flex-1">
                            <span class="text-gray-400 text-xs block">GMT</span>
                            <span class="font-mono text-white text-sm" id="header-gmt-price-mobile">$--</span>
                        </div>
                    </div>
                </div>

                <!-- Mobile Navigation Links -->
                <a href="HashSense.html" class="block px-4 py-3 text-gray-300 hover:bg-gray-800 hover:text-purple-400 rounded-lg transition-colors">
                    Calculator
                </a>
                <a href="farm2.html" class="block px-4 py-3 text-gray-300 hover:bg-gray-800 hover:text-purple-400 rounded-lg transition-colors">
                    Farm
                </a>
                <a href="login.html" class="block px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white text-center rounded-lg transition-all duration-300 font-medium">
                    Login
                </a>
            </div>
        </div>
    </header>
    `;
}

// Toggle Mobile Menu
function toggleMobileMenu() {
    const mobileMenu = document.getElementById('mobile-menu');
    const burgerBtn = document.getElementById('burger-menu-btn');
    
    if (mobileMenu.classList.contains('hidden')) {
        mobileMenu.classList.remove('hidden');
        // Change burger to X icon
        burgerBtn.innerHTML = `
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
        `;
    } else {
        mobileMenu.classList.add('hidden');
        // Change X back to burger icon
        burgerBtn.innerHTML = `
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
            </svg>
        `;
    }
}

// Update header prices from global variables
function updateHeaderPrices() {
    // BTC Price - Update ALLE 3 Dropdowns
    if (window.btcPrice) {
        const price = window.btcPrice;
        const btcFormatted = parseFloat(price).toLocaleString('en-US', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        });
        
        // Desktop dropdown
        const desktopOption = document.getElementById('currentp');
        const desktopSelect = document.getElementById('bitcoin-price-dropdown');
        if (desktopOption && desktopSelect) {
            desktopOption.textContent = `$${btcFormatted}`;
            desktopOption.value = price;
            desktopSelect.value = price;
        }

        // Tablet dropdown
        const tabletOption = document.getElementById('currentp-tablet');
        const tabletSelect = document.getElementById('bitcoin-price-dropdown-tablet');
        if (tabletOption && tabletSelect) {
            tabletOption.textContent = `$${btcFormatted}`;
            tabletOption.value = price;
            tabletSelect.value = price;
        }

        // Mobile dropdown
        const mobileOption = document.getElementById('currentp-mobile');
        const mobileSelect = document.getElementById('bitcoin-price-dropdown-mobile');
        if (mobileOption && mobileSelect) {
            mobileOption.textContent = `$${btcFormatted}`;
            mobileOption.value = price;
            mobileSelect.value = price;
        }
    }
    
    // GMT Price - Update all instances
    if (window.gmtPrice) {
        const price = window.gmtPrice;
        const elements = [
            'header-gmt-price',          // Desktop
            'header-gmt-price-tablet',   // Tablet
            'header-gmt-price-mobile'    // Mobile
        ];
        elements.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = `$${price}`;
            }
        });
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
