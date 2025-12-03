// ============================================
// HashRace Christmas Raffle 2025 - Main Logic
// ============================================

// ========== CONFIG ==========
const HASHRACE_CONFIG = {
    supabase: {
        url: 'https://zdphhfnsijuevfpivdvl.supabase.co',
        anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpkcGhoZm5zaWp1ZXZmcGl2ZHZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3ODE0NzQsImV4cCI6MjA4MDM1NzQ3NH0.Si_ljivloBb9QFT7bL3wBruH0074NO9wpz0dk5sGFsk'
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
        openAuthModal();
    } else {
        scrollToDashboard();
    }
}

async function handleLogin() {
    const email = document.getElementById('authEmail').value;
    const password = document.getElementById('authPassword').value;
    const messageDiv = document.getElementById('authMessage');
    
    if (!email) {
        messageDiv.innerHTML = '<p style="color: #ef4444;">❌ Please enter an email address</p>';
        return;
    }
    
    messageDiv.innerHTML = '<p style="color: #3b82f6;">⏳ Signing in...</p>';
    
    try {
        if (password) {
            // Try password login first
            const { data, error } = await supabase.auth.signInWithPassword({
                email: email,
                password: password
            });
            
            if (error) {
                // Password login failed - show error, don't fallback automatically
                if (error.message.includes('Invalid login credentials')) {
                    messageDiv.innerHTML = '<p style="color: #ef4444;">❌ Wrong password. <a href="#" onclick="document.getElementById(\'authPassword\').value=\'\'; document.getElementById(\'authMessage\').innerHTML=\'\'; return false;" style="color: #3b82f6; text-decoration: underline;">Try magic link instead?</a></p>';
                } else {
                    messageDiv.innerHTML = `<p style="color: #ef4444;">❌ ${error.message}</p>`;
                }
            } else {
                // Success! Close immediately
                closeAuthModal();
                // Update state
                await checkAuthState();
                updateUI();
            }
        } else {
            // No password provided, send magic link
            await sendMagicLink(email, messageDiv);
        }
    } catch (error) {
        console.error('Login error:', error);
        messageDiv.innerHTML = `<p style="color: #ef4444;">❌ Error: ${error.message}</p>`;
    }
}

async function sendMagicLink(email, messageDiv) {
    try {
        const { error } = await supabase.auth.signInWithOtp({
            email: email,
            options: {
                emailRedirectTo: window.location.href
            }
        });
        
        if (error) {
            console.error('Magic link error:', error);
            messageDiv.innerHTML = `<p style="color: #ef4444;">❌ Error: ${error.message}</p>`;
        } else {
            messageDiv.innerHTML = '<p style="color: #10b981;">✅ Magic link sent! Check your email.</p>';
        }
    } catch (error) {
        console.error('Error sending magic link:', error);
        messageDiv.innerHTML = '<p style="color: #ef4444;">❌ Error sending magic link</p>';
    }
}

function openAuthModal() {
    document.getElementById('authModal').style.display = 'flex';
    resetPasswordSetupForm();
}

function closeAuthModal() {
    document.getElementById('authModal').style.display = 'none';
    document.getElementById('authEmail').value = '';
    document.getElementById('authPassword').value = '';
    document.getElementById('authMessage').innerHTML = '';
    resetPasswordSetupForm();
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
            
            // Close login form first
            const loginForm = document.getElementById('loginForm');
            if (loginForm && loginForm.style.display !== 'none') {
                // User just logged in, close the login form
                closeAuthModal();
            }
            
            // Check if user needs to set up password (first time magic link login)
            // Only show if they logged in via magic link (no password method)
            if (session?.user && event === 'SIGNED_IN') {
                const hasPassword = await checkIfUserHasPassword(session.user);
                const justUsedMagicLink = !session.user.app_metadata?.provider || session.user.app_metadata?.provider === 'email';
                
                if (!hasPassword && justUsedMagicLink) {
                    // Small delay to ensure auth flow is complete
                    setTimeout(() => {
                        showPasswordSetupForm();
                    }, 800);
                }
            }
        } else if (event === 'SIGNED_OUT') {
            currentUser = null;
            userState = 'not_logged_in';
            userTickets = 0;
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

function showPasswordSetupForm() {
    // Only show if modal is still open or shortly after login
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('passwordSetupForm').style.display = 'block';
    document.getElementById('authModal').style.display = 'flex';
}

async function setupPassword() {
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const messageDiv = document.getElementById('passwordSetupMessage');
    
    if (!newPassword || newPassword.length < 6) {
        messageDiv.innerHTML = '<p style="color: #ef4444;">❌ Password must be at least 6 characters</p>';
        return;
    }
    
    if (newPassword !== confirmPassword) {
        messageDiv.innerHTML = '<p style="color: #ef4444;">❌ Passwords do not match</p>';
        return;
    }
    
    try {
        const { error } = await supabase.auth.updateUser({
            password: newPassword,
            data: { has_password: true }
        });
        
        if (error) {
            messageDiv.innerHTML = `<p style="color: #ef4444;">❌ Error: ${error.message}</p>`;
        } else {
            messageDiv.innerHTML = '<p style="color: #10b981;">✅ Password set! You can now login with email + password.</p>';
            setTimeout(() => {
                closeAuthModal();
                resetPasswordSetupForm();
            }, 2000);
        }
    } catch (error) {
        console.error('Password setup error:', error);
        messageDiv.innerHTML = '<p style="color: #ef4444;">❌ Error setting password</p>';
    }
}

function skipPasswordSetup() {
    closeAuthModal();
    resetPasswordSetupForm();
}

function resetPasswordSetupForm() {
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('passwordSetupForm').style.display = 'none';
    document.getElementById('newPassword').value = '';
    document.getElementById('confirmPassword').value = '';
    document.getElementById('passwordSetupMessage').innerHTML = '';
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
