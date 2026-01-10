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
                
                <!-- Live Prices - Desktop Full -->
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
                            <option id="currentp" value="0">current price</option>
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
                        <input type="number" id="header-gmt-price" step="0.0001" 
                            class="bg-transparent text-white font-mono w-20 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm px-1"
                            style="background-color: #1a1a2e !important; border: 1px solid #6b46c1; border-radius: 4px; padding: 4px;"
                            placeholder="0.4269" oninput="updateGMTPrice();">
                    </div>
                    
                    <!-- Sats/TH -->
                    <div class="flex items-center gap-2 px-3 py-1.5 bg-gray-800/50 rounded-lg border border-gray-700/50">
                        <img src="sats-ordinals-sats-logo.png" alt="Sats" class="w-5 h-5">
                        <span class="text-gray-400 hidden xl:inline">Sats/TH</span>
                        <span class="font-mono text-yellow-400 font-semibold">42</span>
                    </div>
                </div>

                <!-- Compact Prices (Tablet) -->
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
                        <input type="number" id="header-gmt-price-tablet" step="0.0001"
                            class="bg-transparent text-white font-mono w-16 text-sm focus:outline-none"
                            style="background-color: #1a1a2e !important; border: 1px solid #6b46c1; border-radius: 4px; padding: 2px;"
                            oninput="updateGMTPrice();">
                    </div>
                </div>
                
                <!-- Desktop Navigation -->
                <nav class="hidden md:flex items-center gap-4">
                    <a href="index.html" class="text-gray-300 hover:text-purple-400 transition-colors text-sm font-medium">
                        Dashboard
                    </a>
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
        <div id="mobile-menu" class="hidden md:hidden bg-gray-900 border-t border-gray-800 max-h-screen overflow-y-auto">
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
                            <input type="number" id="header-gmt-price-mobile" step="0.0001"
                                class="w-full bg-transparent text-white text-sm focus:outline-none font-mono"
                                style="background-color: #1a1a2e !important; border: 1px solid #6b46c1; border-radius: 4px; padding: 4px;"
                                oninput="updateGMTPrice();">
                        </div>
                    </div>
                </div>

                <!-- HashSense Title -->
                <h2 class="text-lg font-bold text-purple-400 pt-2">HashSense</h2>
                
                <!-- Main Dashboard -->
                <a href="index.html" class="flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-gray-800 hover:text-blue-400 rounded-lg transition-colors">
                    <svg class="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
                    </svg>
                    <span>Main Dashboard</span>
                </a>

                <!-- Divider -->
                <div class="border-t border-gray-700 my-2"></div>

                <!-- Calculator Sections (nur wenn auf HashSense.html) -->
                <div id="hashsense-nav-sections" class="space-y-2" style="display: none;">
                    <button onclick="showSection('calc', event); toggleMobileMenu();" class="nav-item w-full flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-gray-800 hover:text-purple-400 rounded-lg transition-colors text-left">
                        <svg class="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
                        </svg>
                        <span>Mining Calculator</span>
                    </button>
                    <button onclick="showSection('roi', event); toggleMobileMenu();" class="nav-item w-full flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-gray-800 hover:text-green-400 rounded-lg transition-colors text-left">
                        <svg class="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
                        </svg>
                        <span>ROI Calculator</span>
                    </button>
                    <button onclick="showSection('invest', event); toggleMobileMenu();" class="nav-item w-full flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-gray-800 hover:text-yellow-400 rounded-lg transition-colors text-left">
                        <svg class="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/>
                        </svg>
                        <span>Investment Optimizer</span>
                    </button>
                    <div class="border-t border-gray-700 my-2"></div>
                </div>

                <!-- Standalone Page: HashSense -->
                <a href="HashSense.html" class="flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-gray-800 hover:text-purple-400 rounded-lg transition-colors">
                    <svg class="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
                    </svg>
                    <span>Calculator Hub</span>
                </a>

                <!-- Reinvestment Calculator -->
                <a href="reinvest-calculator.html" class="flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-gray-800 hover:text-purple-400 rounded-lg transition-colors">
                    <svg class="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                    </svg>
                    <span>Reinvestment Calculator</span>
                </a>

                <!-- GOBoxes Chances -->
                <a href="GoBoxMatrix.html" class="flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-gray-800 hover:text-orange-400 rounded-lg transition-colors">
                    <svg class="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
                    </svg>
                    <span>GOBoxes Chances</span>
                </a>

                <!-- My Farm -->
                <a href="farm2.html" class="flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-gray-800 hover:text-green-400 rounded-lg transition-colors">
                    <svg class="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
                    </svg>
                    <span>My Farm</span>
                </a>

                <!-- Divider -->
                <div class="border-t border-gray-700 my-2"></div>

                <!-- Refresh Prices Button -->
                <button onclick="refreshPrices()" class="w-full flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-gray-800 rounded-lg transition-colors text-left">
                    <svg class="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                    </svg>
                    <div class="flex-1">
                        <span class="block font-medium">Refresh Prices</span>
                        <span class="block text-xs text-gray-400">Update BTC & GMT prices</span>
                    </div>
                </button>

                <!-- Login Button -->
                <a href="login.html" class="block px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white text-center rounded-lg transition-all duration-300 font-medium mt-4">
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
        // Show HashSense sections only if on HashSense.html
        if (window.location.pathname.includes('HashSense')) {
            const sections = document.getElementById('hashsense-nav-sections');
            if (sections) sections.style.display = 'block';
        }
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

// Refresh prices function
function refreshPrices() {
    if (typeof fetchBTCPrice === 'function') {
        fetchBTCPrice();
    }
    if (typeof fetchGMTPrice === 'function') {
        fetchGMTPrice();
    }
    // Visual feedback
    const btn = event?.target?.closest('button');
    if (btn) {
        const icon = btn.querySelector('svg');
        if (icon) {
            icon.classList.add('animate-spin');
            setTimeout(() => icon.classList.remove('animate-spin'), 1000);
        }
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
            desktopOption.textContent = `$${btcFormatted} (current)`;
            desktopOption.value = price;
            desktopSelect.value = price;
        }

        // Tablet dropdown
        const tabletOption = document.getElementById('currentp-tablet');
        const tabletSelect = document.getElementById('bitcoin-price-dropdown-tablet');
        if (tabletOption && tabletSelect) {
            tabletOption.textContent = `$${btcFormatted} (current)`;
            tabletOption.value = price;
            tabletSelect.value = price;
        }

        // Mobile dropdown
        const mobileOption = document.getElementById('currentp-mobile');
        const mobileSelect = document.getElementById('bitcoin-price-dropdown-mobile');
        if (mobileOption && mobileSelect) {
            mobileOption.textContent = `$${btcFormatted} (current)`;
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