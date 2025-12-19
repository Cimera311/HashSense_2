// filepath: src/scripts/footer-component.js
function renderFooter() {
    // Festes Datum - wird manuell aktualisiert wenn Preise geändert werden
    const PRICE_UPDATE_DATE = '2025-12-19'; // Format: YYYY-MM-DD
    
    const updateDate = new Date(PRICE_UPDATE_DATE + 'T00:00:00');
    const updateTimeString = updateDate.toLocaleString('de-DE', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    return `
    <footer class="bg-gray-800 border-t border-gray-700 py-8 mt-12">
        <div class="max-w-6xl mx-auto px-4">
            <div class="grid md:grid-cols-4 gap-8">
                <!-- Brand -->
                <div>
                    <div class="flex items-center gap-3 mb-4">
                        <img src="assets/favicon.ico" alt="HashFarm" class="w-8 h-8">
                        <span class="text-xl font-bold text-white">HashFarm</span>
                    </div>
                    <p class="text-gray-400">Calculators and tools for GoMining</p>
                </div>
                
                <!-- Tools -->
                <div>
                    <h3 class="text-lg font-semibold text-white mb-4">Tools</h3>
                    <ul class="space-y-2">
                        <li><a href="HashSense.html" class="text-gray-400 hover:text-purple-400 transition-colors">Mining Calculators</a></li>
                        <li><a href="reinvest-calculator.html" class="text-gray-400 hover:text-purple-400 transition-colors">Reinvest Calculator</a></li>
                        <li><a href="farm2.html" class="text-gray-400 hover:text-purple-400 transition-colors">Hashfarm</a></li>
                        <li><a href="gomining-promocode.html" class="text-gray-400 hover:text-purple-400 transition-colors">Promo Codes</a></li>
                    </ul>
                </div>
                
                <!-- Resources -->
                <div>
                    <h3 class="text-lg font-semibold text-white mb-4">Resources</h3>
                    <ul class="space-y-2">
                        <li><a href="https://gomining.com/?ref=ICjK3" target="_blank" rel="noopener" class="text-gray-400 hover:text-purple-400 transition-colors">GoMining ↗</a></li>
                    </ul>
                    
                    <!-- Support Us Section -->
                    <div class="mt-4 pt-4 border-t border-gray-700">
                        <h4 class="text-sm font-semibold text-purple-400 mb-2 flex items-center gap-2">
                            <span class="material-icons text-sm">favorite</span>
                            Support Us
                        </h4>
                        <ul class="space-y-2">
                            <li>
                                <a href="support.html" class="text-gray-400 hover:text-purple-400 transition-colors flex items-center gap-2">
                                    <span class="material-icons text-sm">card_giftcard</span>
                                    Ways to Support
                                </a>
                            </li>
                        </ul>
                    </div>
                </div>
                
                <!-- Info -->
                <div>
                    <h3 class="text-lg font-semibold text-white mb-4">Important</h3>
                    <ul class="space-y-2">
                        <li class="text-gray-400 flex items-center gap-2">
                            <span class="material-icons text-sm text-green-400">check_circle</span>
                            Free to use
                        </li>
                        <li class="text-gray-400 flex items-center gap-2">
                            <span class="material-icons text-sm text-green-400">check_circle</span>
                            No registration required
                        </li>
                        <li class="text-gray-400 flex items-center gap-2">
                            <span class="material-icons text-sm text-green-400">check_circle</span>
                            Real-time calculations
                        </li>
                        <li class="text-gray-400 flex items-center gap-2">
                            <span class="material-icons text-sm text-orange-400">warning</span>
                            DYOR - Do Your Own Research
                        </li>
                    </ul>
                    
                    <!-- Price Update Info -->
                    <div class="mt-4 pt-4 border-t border-gray-700">
                        <p class="text-xs text-gray-500 flex items-center gap-2">
                            <span class="material-icons text-sm">schedule</span>
                            Price date::
                        </p>
                        <p class="text-sm text-gray-300 font-mono mt-1">${updateTimeString}</p>
                    </div>
                </div>
            </div>
            
            <!-- Bottom Bar -->
            <div class="border-t border-gray-700 mt-8 pt-6">
                <div class="flex flex-col md:flex-row justify-between items-center gap-4">
                    <p class="text-gray-400 text-sm">
                        &copy; ${new Date().getFullYear()} HashSense. Made with ❤️ for the Gomining community.
                    </p>
                    <div class="flex items-center gap-4 text-sm">
                        <a href="#" class="text-gray-400 hover:text-purple-400 transition-colors">Privacy</a>
                        <a href="#" class="text-gray-400 hover:text-purple-400 transition-colors">Terms</a>
                        <a href="#" class="text-gray-400 hover:text-purple-400 transition-colors">Contact</a>
                    </div>
                </div>
            </div>
        </div>
    </footer>
    `;
}

// Auto-render footer on page load
document.addEventListener('DOMContentLoaded', () => {
    const footerContainer = document.getElementById('footer-container');
    if (footerContainer) {
        footerContainer.innerHTML = renderFooter();
    }
});