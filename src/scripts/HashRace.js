// ============================================
// HashRace Christmas Raffle 2025 - Main Logic
// ============================================

// ========== CONFIG ==========
const HASHRACE_CONFIG = {
    supabase: {
        url: 'YOUR_SUPABASE_URL',
        anonKey: 'YOUR_SUPABASE_ANON_KEY'
    },
    prizeTiers: [
        { id: 1, min: 0, max: 100, winners: 1, prizes: '50 GMT' },
        { id: 2, min: 101, max: 200, winners: 2, prizes: '50 GMT + 25 GMT' },
        { id: 3, min: 201, max: 300, winners: 3, prizes: '100 GMT/2TH + 50 + 25 GMT' },
        { id: 4, min: 301, max: Infinity, winners: 5, prizes: '100/2TH + 50 + 50 + 25 + 25 GMT' }
    ]
};

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
    
    // Setup auth listener
    setupAuthListener();
    
    // Load global stats
    await loadGlobalStats();
    
    // Check auth state
    await checkAuthState();
    
    // Update UI
    updateUI();
    
    console.log('✅ HashRace bereit!');
});

// ========== SUPABASE INIT ==========
function initSupabase() {
    // Access the global supabase object from CDN
    const { createClient } = window.supabase;
    
    // Replace with your actual Supabase credentials
    supabase = createClient(
        HASHRACE_CONFIG.supabase.url,
        HASHRACE_CONFIG.supabase.anonKey
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

async function handleAuthClick() {
    if (userState === 'not_logged_in') {
        // Show login modal or redirect to auth
        await handleLogin();
    } else {
        // User is logged in, show dashboard
        scrollToDashboard();
    }
}

async function handleLogin() {
    try {
        // Using Magic Link authentication
        const email = prompt('Enter your email address:');
        
        if (!email) return;
        
        const { error } = await supabase.auth.signInWithOtp({
            email: email,
            options: {
                emailRedirectTo: window.location.href
            }
        });
        
        if (error) {
            alert('Error sending magic link: ' + error.message);
            return;
        }
        
        alert('Check your email for the magic link!');
        
    } catch (error) {
        console.error('Login error:', error);
        alert('Login failed. Please try again.');
    }
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
    
    for (const tier of HASHRACE_CONFIG.prizeTiers) {
        if (total >= tier.min && total <= tier.max) {
            return tier;
        }
    }
    
    // Default to tier 4 if exceeds all
    return HASHRACE_CONFIG.prizeTiers[HASHRACE_CONFIG.prizeTiers.length - 1];
}

function getNextTier() {
    const currentTier = getCurrentTier();
    const currentIndex = HASHRACE_CONFIG.prizeTiers.findIndex(t => t.id === currentTier.id);
    
    if (currentIndex < HASHRACE_CONFIG.prizeTiers.length - 1) {
        return HASHRACE_CONFIG.prizeTiers[currentIndex + 1];
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
// This will be set up after supabase is initialized
function setupAuthListener() {
    if (!supabase) return;
    
    supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('Auth state changed:', event);
        
        if (event === 'SIGNED_IN') {
            await checkAuthState();
            updateUI();
        } else if (event === 'SIGNED_OUT') {
            currentUser = null;
            userState = 'not_logged_in';
            userTickets = 0;
            updateUI();
        }
    });
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
