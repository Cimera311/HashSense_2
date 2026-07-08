// ============================================
// HashRace Christmas Raffle 2025 - Main Logic
// ============================================

// Prize Tiers Configuration (inline, no external config needed)
const PRIZE_TIERS = [
    { id: 1, min: 0, max: 25, winners: 1, prizes: '50GMT/1TH' },
    { id: 2, min: 26, max: 100, winners: 2, prizes: '50GMT/1TH + 25 GMT' },
    { id: 3, min: 101, max: 200, winners: 3, prizes: '100GMT/2TH + 50GMT/1TH + 25 GMT' },
    { id: 4, min: 201, max: Infinity, winners: 5, prizes: '100/2TH + 50GMT/1TH + 50GMT/1TH + 25 GMT + 25 GMT' }
];

// ========== GLOBAL STATE ==========
let supabase = null;
let currentUser = null;
let userState = 'not_logged_in'; // 'not_logged_in', 'logged_in_not_active', 'logged_in_active'
let globalStats = {
    totalTickets: 0
};
let userTickets = 0;

// ========== INITIALIZATION ==========
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🎄 HashRace Christmas 2025 initialisiert...');
    
    // Initialize Supabase
    initSupabase();
    
    // Load global stats
    await loadGlobalStats();
    
    // Check auth state FIRST (this sets userState correctly)
    await checkAuthState();
    
    // Setup auth listener AFTER initial check
    setupAuthListener();
    
    // Update UI (this will set the correct button text)
    updateUI();
    
    console.log('✅ HashRace bereit!');
});

// ========== SUPABASE INIT ==========
function initSupabase() {
    if (!window.supabase || !window.supabase.createClient) {
        console.error('❌ Supabase CDN nicht geladen!');
        showMessage('loginMessage', 'Supabase nicht verfügbar. Bitte Seite neu laden.', 'error');
        return;
    }
    
    // Load config from external file
    if (typeof HASHRACE_CONFIG === 'undefined') {
        console.error('❌ HashRace_config.js nicht geladen!');
        showMessage('loginMessage', 'Konfiguration fehlt. Bitte Admin kontaktieren.', 'error');
        return;
    }
    
    const { createClient } = window.supabase;
    
    supabase = createClient(
        HASHRACE_CONFIG.supabaseUrl,
        HASHRACE_CONFIG.supabaseAnonKey
    );
    
    console.log('✅ Supabase initialisiert');
}

// ========== AUTH FUNCTIONS ==========
async function checkAuthState() {
    try {
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error) {
            console.error('Auth error:', error);
            userState = 'not_logged_in';
            return;
        }
        
        if (!user) {
            userState = 'not_logged_in';
            return;
        }
        
        currentUser = user;
        
        // Check email confirmation status
        const emailConfirmationHint = document.getElementById('emailConfirmationHint');
        if (emailConfirmationHint) {
            // Show hint if email is not confirmed
            if (user.email_confirmed_at) {
                emailConfirmationHint.style.display = 'none';
            } else {
                emailConfirmationHint.style.display = 'block';
            }
        }
        
        // Check if user is active participant
        const isActive = await checkParticipantStatus(user.id);
        
        if (isActive) {
            userState = 'logged_in_active';
            await loadUserTickets(user.id);
        } else {
            userState = 'logged_in_not_active';
        }
        
    } catch (error) {
        console.error('Error checking auth:', error);
        userState = 'not_logged_in';
    }
}

async function checkParticipantStatus(userId) {
    try {
        const { data, error } = await supabase
            .from('participants')
            .select('is_active')
            .eq('id', userId)
            .single();
        
        if (error) {
            console.log('User not in participants table');
            return false;
        }
        
        return data?.is_active || false;
        
    } catch (error) {
        console.error('Error checking participant status:', error);
        return false;
    }
}

// ========== AUTH HANDLERS ==========
async function handleAuthClick() {
    if (userState === 'not_logged_in') {
        openAuthModal();
    } else {
        scrollToDashboard();
    }
}

/**
 * Handle Login (Email + Password)
 */
async function handleLogin() {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value.trim();
    
    if (!email || !password) {
        showMessage('loginMessage', '❌ Bitte Email und Passwort eingeben', 'error');
        return;
    }
    
    showMessage('loginMessage', '⏳ Anmeldung läuft...', 'loading');
    
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });
        
        if (error) {
            console.error('Login error:', error);
            showMessage('loginMessage', `❌ Login fehlgeschlagen: ${error.message}`, 'error');
            return;
        }
        
        console.log('✅ Login erfolgreich!', data);
        showMessage('loginMessage', '✅ Anmeldung erfolgreich!', 'success');
        
        // Close modal and update UI
        setTimeout(() => {
            closeAuthModal();
        }, 1000);
        
    } catch (error) {
        console.error('Login error:', error);
        showMessage('loginMessage', `❌ Fehler: ${error.message}`, 'error');
    }
}

/**
 * Handle Signup (Email + Password)
 */
async function handleSignup() {
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value.trim();
    const passwordConfirm = document.getElementById('signupPasswordConfirm').value.trim();
    
    // Validation
    if (!email || !password || !passwordConfirm) {
        showMessage('signupMessage', '❌ Bitte alle Felder ausfüllen', 'error');
        return;
    }
    
    if (password.length < 6) {
        showMessage('signupMessage', '❌ Passwort muss mindestens 6 Zeichen haben', 'error');
        return;
    }
    
    if (password !== passwordConfirm) {
        showMessage('signupMessage', '❌ Passwörter stimmen nicht überein', 'error');
        return;
    }
    
    showMessage('signupMessage', '⏳ Account wird erstellt...', 'loading');
    
    try {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                emailRedirectTo: 'https://Hashfarm.me/Hashrace.html'
            }
        });
        
        if (error) {
            console.error('Signup error:', error);
            showMessage('signupMessage', `❌ Registrierung fehlgeschlagen: ${error.message}`, 'error');
            return;
        }
        
        console.log('✅ Signup erfolgreich!', data);
        
        // Check if email confirmation is required
        if (data.user && !data.session) {
            // Email confirmation required
            showMessage('signupMessage', '✅ Account erstellt! Bitte bestätige deine Email.', 'success');
            setTimeout(() => {
                closeAuthModal();
            }, 3000);
        } else if (data.session) {
            // Immediate login (email confirmation disabled in Supabase)
            showMessage('signupMessage', '✅ Account erstellt! Du wirst eingeloggt...', 'success');
            setTimeout(() => {
                closeAuthModal();
            }, 1500);
        }
        
    } catch (error) {
        console.error('Signup error:', error);
        showMessage('signupMessage', `❌ Fehler: ${error.message}`, 'error');
    }
}

/**
 * Switch between Login and Signup tabs
 */
function switchAuthTab(tab) {
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const tabs = document.querySelectorAll('.auth-tab');
    
    // Reset messages
    document.getElementById('loginMessage').innerHTML = '';
    document.getElementById('signupMessage').innerHTML = '';
    
    if (tab === 'login') {
        loginForm.style.display = 'block';
        signupForm.style.display = 'none';
        tabs[0].classList.add('active');
        tabs[1].classList.remove('active');
    } else if (tab === 'signup') {
        loginForm.style.display = 'none';
        signupForm.style.display = 'block';
        tabs[0].classList.remove('active');
        tabs[1].classList.add('active');
    }
}

/**
 * Open Auth Modal
 */
function openAuthModal() {
    document.getElementById('authModal').style.display = 'flex';
    switchAuthTab('login'); // Default to login tab
}

/**
 * Close Auth Modal
 */
function closeAuthModal() {
    document.getElementById('authModal').style.display = 'none';
    
    // Clear all inputs
    document.getElementById('loginEmail').value = '';
    document.getElementById('loginPassword').value = '';
    document.getElementById('signupEmail').value = '';
    document.getElementById('signupPassword').value = '';
    document.getElementById('signupPasswordConfirm').value = '';
    
    // Clear messages
    document.getElementById('loginMessage').innerHTML = '';
    document.getElementById('signupMessage').innerHTML = '';
    
    // Reset to login tab
    switchAuthTab('login');
}

/**
 * Helper: Show message in UI
 */
function showMessage(elementId, message, type) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    let color = '#9ca3af';
    if (type === 'error') color = '#ef4444';
    if (type === 'success') color = '#10b981';
    if (type === 'loading') color = '#fbbf24';
    
    element.innerHTML = `<p style="color: ${color};">${message}</p>`;
}


async function handleLogout() {
    try {
        const { error } = await supabase.auth.signOut();
        
        if (error) {
            alert('Logout failed: ' + error.message);
            return;
        }
        
        // Reset state
        currentUser = null;
        userState = 'not_logged_in';
        userTickets = 0;
        
        // Update UI
        updateUI();
        
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
    } catch (error) {
        console.error('Logout error:', error);
    }
}

function scrollToDashboard() {
    const dashboard = document.getElementById('dashboardSection');
    if (dashboard) {
        dashboard.scrollIntoView({ behavior: 'smooth' });
    }
}

// ========== DATA LOADING ==========
async function loadGlobalStats() {
    try {
        const { data, error } = await supabase
            .from('system_stats')
            .select('total_tickets')
            .eq('id', 1)
            .single();
        
        if (error) {
            console.error('Error loading stats:', error);
            globalStats.totalTickets = 0;
            return;
        }
        
        globalStats.totalTickets = data?.total_tickets || 0;
        
        console.log('✅ Global stats geladen:', globalStats);
        
    } catch (error) {
        console.error('Error loading global stats:', error);
        globalStats.totalTickets = 0;
    }
}

async function loadUserTickets(userId) {
    try {
        const { data, error } = await supabase
            .from('tickets')
            .select('tickets')
            .eq('user_id', userId)
            .single();
        
        if (error) {
            console.log('No tickets found for user');
            userTickets = 0;
            return;
        }
        
        userTickets = data?.tickets || 0;
        
        console.log('✅ User tickets geladen:', userTickets);
        
    } catch (error) {
        console.error('Error loading user tickets:', error);
        userTickets = 0;
    }
}

// ========== UI UPDATE ==========
function updateUI() {
    // Update global stats
    updateGlobalStatsUI();
    
    // Update prize tier progress
    updatePrizeTierProgress();
    
    // Update auth button
    updateAuthButton();
    
    // Show/hide dashboard based on state
    updateDashboardVisibility();
}

function updateGlobalStatsUI() {
    const totalTicketsEl = document.getElementById('totalTicketsDisplay');
    if (totalTicketsEl) {
        totalTicketsEl.textContent = globalStats.totalTickets.toLocaleString();
    }
}

function updateAuthButton() {
    const authButton = document.getElementById('authButton');
    const authButtonText = document.getElementById('authButtonText');
    
    if (!authButton || !authButtonText) return;
    
    if (userState === 'not_logged_in') {
        authButtonText.textContent = 'Login / Join';
    } else if (userState === 'logged_in_not_active') {
        authButtonText.textContent = 'View Dashboard';
    } else if (userState === 'logged_in_active') {
        authButtonText.textContent = 'View Dashboard';
    }
}

function updateDashboardVisibility() {
    const dashboardSection = document.getElementById('dashboardSection');
    const notActiveDashboard = document.getElementById('notActiveDashboard');
    const activeDashboard = document.getElementById('activeDashboard');
    
    if (!dashboardSection || !notActiveDashboard || !activeDashboard) return;
    
    // Hide all by default
    dashboardSection.style.display = 'none';
    notActiveDashboard.style.display = 'none';
    activeDashboard.style.display = 'none';
    
    if (userState === 'not_logged_in') {
        // Show nothing
        return;
    }
    
    dashboardSection.style.display = 'block';
    
    if (userState === 'logged_in_not_active') {
        notActiveDashboard.style.display = 'block';
    } else if (userState === 'logged_in_active') {
        activeDashboard.style.display = 'block';
        updateActiveDashboard();
    }
}

function updateActiveDashboard() {
    // Update user tickets display
    const userTicketsEl = document.getElementById('userTicketsDisplay');
    if (userTicketsEl) {
        userTicketsEl.textContent = userTickets.toLocaleString();
    }
    
    // Update total tickets in dashboard
    const totalTicketsDashboardEl = document.getElementById('totalTicketsDisplayDashboard');
    if (totalTicketsDashboardEl) {
        totalTicketsDashboardEl.textContent = globalStats.totalTickets.toLocaleString();
    }
    
    // Update current tier display
    const currentTierEl = document.getElementById('currentTierDisplay');
    if (currentTierEl) {
        const tier = getCurrentTier();
        currentTierEl.textContent = `Tier ${tier.id}`;
    }
    
    // Update next tier info in dashboard
    const nextTierDashboardInfoEl = document.getElementById('nextTierDashboardInfo');
    if (nextTierDashboardInfoEl) {
        const nextTier = getNextTier();
        if (nextTier) {
            nextTierDashboardInfoEl.textContent = 
                `Next prize tier at ${nextTier.min} tickets (Tier ${nextTier.id} - ${nextTier.winners} winners unlocked)`;
        } else {
            nextTierDashboardInfoEl.textContent = 'Maximum tier reached! 🎉';
        }
    }
}

// ========== PRIZE TIER LOGIC ==========
function getCurrentTier() {
    const total = globalStats.totalTickets;
    
    for (const tier of PRIZE_TIERS) {
        if (total >= tier.min && total <= tier.max) {
            return tier;
        }
    }
    
    // Default to tier 4 if exceeds all
    return PRIZE_TIERS[PRIZE_TIERS.length - 1];
}

function getNextTier() {
    const currentTier = getCurrentTier();
    const currentIndex = PRIZE_TIERS.findIndex(t => t.id === currentTier.id);
    
    if (currentIndex < PRIZE_TIERS.length - 1) {
        return PRIZE_TIERS[currentIndex + 1];
    }
    
    return null; // No next tier (already at max)
}

function updatePrizeTierProgress() {
    const currentTier = getCurrentTier();
    const total = globalStats.totalTickets;
    
    // Highlight current tier
    document.querySelectorAll('.tier-item').forEach(item => {
        const tierNum = parseInt(item.dataset.tier);
        
        if (tierNum === currentTier.id) {
            item.classList.add('active');
        } else if (tierNum < currentTier.id) {
            item.classList.add('completed');
        } else {
            item.classList.remove('active', 'completed');
        }
    });
    
    // Update progress bar
    const progressFill = document.getElementById('tierProgressFill');
    const progressMarker = document.getElementById('tierProgressMarker');
    
    if (progressFill && progressMarker) {
        // Calculate progress percentage within current tier
        const tierRange = currentTier.max - currentTier.min;
        const tierProgress = total - currentTier.min;
        let percentage = 0;
        
        if (tierRange === Infinity) {
            // Tier 4 (no upper limit)
            percentage = 100;
        } else {
            percentage = (tierProgress / tierRange) * 100;
        }
        
        progressFill.style.width = `${Math.min(percentage, 100)}%`;
        progressMarker.style.left = `${Math.min(percentage, 100)}%`;
    }
    
    // Update next tier info text
    const nextTierInfoEl = document.getElementById('nextTierInfo');
    if (nextTierInfoEl) {
        const nextTier = getNextTier();
        if (nextTier) {
            nextTierInfoEl.textContent = `Next prize tier at ${nextTier.min} tickets`;
        } else {
            nextTierInfoEl.textContent = 'Maximum tier reached! 🎉';
        }
    }
}

// ========== LISTEN TO AUTH CHANGES ==========
function setupAuthListener() {
    if (!supabase) return;
    
    supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('🔔 Auth state changed:', event);
        
        if (event === 'SIGNED_IN') {
            console.log('✅ User signed in');
            await checkAuthState();
            updateUI();
        } else if (event === 'SIGNED_OUT') {
            console.log('👋 User signed out');
            currentUser = null;
            userState = 'not_logged_in';
            userTickets = 0;
            updateUI();
        } else if (event === 'USER_UPDATED') {
            console.log('🔄 User data updated');
            await checkAuthState();
            updateUI();
        }
    });
}

async function checkIfUserHasPassword(user) {
    // Check if user has set password via our metadata flag
    if (user?.user_metadata?.has_password) {
        return true;
    }
    
    // Also check if password was set (they can login with password)
    // This is implicit - if they used password login, they have one
    return false;
}

// ========== UTILITY FUNCTIONS ==========
function formatNumber(num) {
    return num.toLocaleString();
}

// ========== EXPORT FOR DEBUGGING ==========
window.HashRace = {
    getState: () => ({
        userState,
        currentUser,
        globalStats,
        userTickets
    }),
    refreshStats: async () => {
        await loadGlobalStats();
        if (userState === 'logged_in_active') {
            await loadUserTickets(currentUser.id);
        }
        updateUI();
    }
};

console.log('🎄 HashRace.js geladen');
