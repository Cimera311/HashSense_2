


        // Modal functions
        function openImportModal() {
            document.getElementById('importModal').classList.remove('hidden');
            document.getElementById('importModal').classList.add('flex');
            showTab('import-tab');
        }

        function closeImportModal(tabId) {
            document.getElementById('importModal').classList.add('hidden');
            document.getElementById('importModal').classList.remove('flex');
        }

        function openHowToImportModal(modalId) {
            document.getElementById(modalId).classList.remove('hidden');
            document.getElementById(modalId).classList.add('flex');
        }

        function closeHowToImportModal(modalId) {
            document.getElementById(modalId).classList.add('hidden');
            document.getElementById(modalId).classList.remove('flex');
        }

        function openConfirmDeleteModal() {
            document.getElementById('confirmDeleteModal').classList.remove('hidden');
            document.getElementById('confirmDeleteModal').classList.add('flex');
        }

        function closeConfirmDeleteModal() {
            document.getElementById('confirmDeleteModal').classList.add('hidden');
            document.getElementById('confirmDeleteModal').classList.remove('flex');
        }

        function openPreviewModal() {
            document.getElementById('previewModal').classList.remove('hidden');
            document.getElementById('previewModal').classList.add('flex');
        }

        function closePreviewModal() {
            document.getElementById('previewModal').classList.add('hidden');
            document.getElementById('previewModal').classList.remove('flex');
        }

        function showTab(tabId) {
            // Hide all tabs
            document.querySelectorAll('.tab-page').forEach(tab => {
                tab.style.display = 'none';
            });
            // Show selected tab
            document.getElementById(tabId).style.display = 'block';
        }

        // Copy to clipboard function
        function copyToClipboard(text) {
            navigator.clipboard.writeText(text).then(() => {
                showToast('Address copied to clipboard!', 'success');
            }).catch(err => {
                console.error('Failed to copy: ', err);
                showToast('Failed to copy address', 'error');
            });
        }

        // Toast notification function
        function showToast(message, type = 'success') {
            let toast = document.getElementById('toast');
            if (!toast) {
                toast = document.createElement('div');
                toast.id = 'toast';
                toast.className = `toast ${type}`;
                document.body.appendChild(toast);
            } else {
                toast.className = `toast ${type}`;
            }

            toast.textContent = message;
            toast.style.display = 'block';

            setTimeout(() => {
                toast.style.display = 'none';
            }, 3000);
        }



        // Note: Main functions like hinzufuegenCard, ladenMinerSupabase, etc. 
        // are implemented in src/scripts/skriptfarm.js and will be used automatically

        function clearTransactionInput() {
            document.getElementById('transactionInput').value = '';
        }

        // View Config Modal functions
        function openViewConfigModal() {
            // Define available columns
            const availableColumns = [
                { key: 'ID', label: 'ID' },
                { key: 'Miner Name', label: 'Miner Name' },
                { key: 'TH', label: 'TH' },
                { key: 'W/TH', label: 'W/TH' },
                { key: 'Worth', label: 'Worth' },
                { key: 'ROI TH', label: 'ROI TH' },
                { key: 'ROI Eff', label: 'ROI Eff' },
                { key: 'Profit', label: 'Profit' },
                { key: 'Electricity', label: 'Electricity' },
                { key: 'Service', label: 'Service' },
                { key: 'Revenue', label: 'Revenue' }
            ];

            // Get current active columns from localStorage or default to all
            let activeColumns = JSON.parse(localStorage.getItem('minerTableColumns'));
            if (!activeColumns) {
                activeColumns = availableColumns.map(col => col.key); // Default: all columns
            }

            // Build checkbox HTML
            const optionsHTML = availableColumns.map(col => `
                <label class="flex items-center gap-2 mb-2 p-2 hover:bg-gray-700 rounded cursor-pointer">
                    <input type="checkbox" class="view-column-checkbox" value="${col.key}" 
                           ${activeColumns.includes(col.key) ? 'checked' : ''}>
                    <span class="text-gray-200">${col.label}</span>
                </label>
            `).join('');

            document.getElementById('viewConfigOptions').innerHTML = optionsHTML;
            document.getElementById('viewConfigModal').classList.remove('hidden');
            document.getElementById('viewConfigModal').classList.add('flex');
        }

        function closeViewConfigModal() {
            document.getElementById('viewConfigModal').classList.add('hidden');
            document.getElementById('viewConfigModal').classList.remove('flex');
        }

        function setViewPreset(preset) {
            const presets = {
                minimal: ['ID', 'Miner Name', 'TH', 'Profit', 'Revenue'],
                standard: ['ID', 'Miner Name', 'TH', 'W/TH', 'Worth', 'Profit', 'Revenue'],
                all: ['ID', 'Miner Name', 'TH', 'W/TH', 'Worth', 'ROI TH', 'ROI Eff', 'Profit', 'Electricity', 'Service', 'Revenue']
            };

            const selectedColumns = presets[preset] || presets.all;
            
            // Update checkboxes
            document.querySelectorAll('.view-column-checkbox').forEach(checkbox => {
                checkbox.checked = selectedColumns.includes(checkbox.value);
            });
        }

        function applyViewConfig() {
            // Get selected columns
            const selectedColumns = [];
            document.querySelectorAll('.view-column-checkbox:checked').forEach(checkbox => {
                selectedColumns.push(checkbox.value);
            });

            // Save to localStorage
            localStorage.setItem('minerTableColumns', JSON.stringify(selectedColumns));

            // Close modal
            closeViewConfigModal();

            // Reload tables to apply changes
            ladenDaten();
            
            showToast('Tabellenansicht aktualisiert!', 'success');
        }

        function updateBTCPrice() {
            aktualisiereFarmWerte();
        } 

    
        
        // ===== SIDEBAR NAVIGATION FUNCTIONS =====
        function toggleSidebar() {
            const sidebar = document.getElementById('sidebar');
            const overlay = document.getElementById('mobile-overlay');
            
            sidebar.classList.toggle('sidebar');
            overlay.classList.toggle('hidden');
        }

        // Simple sidebar functionality - just toggle open/close for now