// ============================================
// HashRace Admin Panel - JavaScript Logic
// ============================================

// ========== CONFIG ==========
// Note: ADMIN_SECRETS is loaded from admin-config.js (not in Git)
const ADMIN_CONFIG = {
    supabase: {
        url: 'https://zdphhfnsijuevfpivdvl.supabase.co',
        serviceRoleKey: typeof ADMIN_SECRETS !== 'undefined' ? ADMIN_SECRETS.serviceRoleKey : 'YOUR_SERVICE_ROLE_KEY_HERE'
    },
    adminEmails: typeof ADMIN_SECRETS !== 'undefined' ? ADMIN_SECRETS.adminEmails : ['admin@example.com']
};

// ========== GLOBAL STATE ==========
let supabase = null;
let currentAdminUser = null;
let allUsers = [];
let currentEditUserId = null;

// ========== INITIALIZATION ==========
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🔐 Admin Panel initializing...');
    
    // Initialize Supabase
    initSupabase();
    
    // Check if admin is already logged in
    await checkAdminAuth();
});

// ========== SUPABASE INIT ==========
function initSupabase() {
    const { createClient } = window.supabase;
    supabase = createClient(
        ADMIN_CONFIG.supabase.url,
        ADMIN_CONFIG.supabase.serviceRoleKey  // Use service_role key for admin access
    );
    console.log('✅ Supabase initialized with service_role key');
}

// ========== AUTH FUNCTIONS ==========
async function checkAdminAuth() {
    try {
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error || !user) {
            showLoginSection();
            return;
        }
        
        // Check if user is admin
        if (ADMIN_CONFIG.adminEmails.includes(user.email)) {
            currentAdminUser = user;
            showAdminPanel();
            await loadAllData();
        } else {
            showNoAccessMessage();
        }
        
    } catch (error) {
        console.error('Auth check error:', error);
        showLoginSection();
    }
}

async function adminLogin() {
    const email = document.getElementById('adminEmail').value;
    const password = document.getElementById('adminPassword').value;
    const messageDiv = document.getElementById('loginMessage');
    
    if (!email || !password) {
        messageDiv.innerHTML = '<p style="color: #ef4444;">❌ Please enter email and password</p>';
        return;
    }
    
    // Check if email is in admin list
    if (!ADMIN_CONFIG.adminEmails.includes(email)) {
        messageDiv.innerHTML = '<p style="color: #ef4444;">❌ You are not authorized as admin</p>';
        return;
    }
    
    messageDiv.innerHTML = '<p style="color: #3b82f6;">⏳ Logging in...</p>';
    
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });
        
        if (error) {
            messageDiv.innerHTML = `<p style="color: #ef4444;">❌ ${error.message}</p>`;
        } else {
            currentAdminUser = data.user;
            showAdminPanel();
            await loadAllData();
        }
    } catch (error) {
        console.error('Login error:', error);
        messageDiv.innerHTML = '<p style="color: #ef4444;">❌ Login failed</p>';
    }
}

async function adminLogout() {
    await supabase.auth.signOut();
    currentAdminUser = null;
    showLoginSection();
}

function showLoginSection() {
    document.getElementById('loginSection').style.display = 'flex';
    document.getElementById('adminPanel').style.display = 'none';
}

function showAdminPanel() {
    document.getElementById('loginSection').style.display = 'none';
    document.getElementById('adminPanel').style.display = 'block';
    document.getElementById('adminUserEmail').textContent = currentAdminUser.email;
}

function showNoAccessMessage() {
    document.getElementById('loginSection').innerHTML = `
        <div class="login-box">
            <h2 style="color: var(--danger);">🚫 Access Denied</h2>
            <p style="color: var(--text-secondary); margin: 1rem 0;">
                You are not authorized to access the admin panel.
            </p>
            <button onclick="adminLogout()" class="btn-secondary">Back to Login</button>
        </div>
    `;
}

// ========== DATA LOADING ==========
async function loadAllData() {
    try {
        document.getElementById('loadingSpinner').style.display = 'block';
        document.getElementById('usersTable').style.display = 'none';
        
        console.log('Loading users with service_role key...');
        
        // Load all users from auth.users using admin API
        const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
        
        console.log('Auth users response:', authData, authError);
        
        if (authError) {
            console.error('Error loading auth users:', authError);
            document.getElementById('loadingSpinner').innerHTML = '<p style="color: #ef4444;">❌ Error: ' + authError.message + '</p>';
            return;
        }
        
        if (!authData || !authData.users || authData.users.length === 0) {
            console.log('No users found in auth.users');
            allUsers = [];
            updateStats();
            renderUsersTable();
            document.getElementById('loadingSpinner').style.display = 'none';
            document.getElementById('usersTable').style.display = 'table';
            return;
        }
        
        console.log(`Found ${authData.users.length} users`);
        
        // Load participants data
        console.log('Loading participants...');
        let participants = [];
        try {
            const { data, error } = await supabase
                .from('participants')
                .select('*');
            
            console.log('Participants response:', data, error);
            
            if (error) {
                console.error('Error loading participants:', error);
            } else {
                participants = data || [];
            }
        } catch (err) {
            console.error('Exception loading participants:', err);
        }
        
        // Load tickets data
        console.log('Loading tickets...');
        let tickets = [];
        try {
            const { data, error } = await supabase
                .from('tickets')
                .select('*');
            
            console.log('Tickets response:', data, error);
            
            if (error) {
                console.error('Error loading tickets:', error);
            } else {
                tickets = data || [];
            }
        } catch (err) {
            console.error('Exception loading tickets:', err);
        }
        
        // Merge data
        allUsers = authData.users.map(user => {
            const participant = participants?.find(p => p.id === user.id);
            const userTickets = tickets?.find(t => t.user_id === user.id);
            
            return {
                id: user.id,
                email: user.email,
                created_at: user.created_at,
                gomining_user_id: participant?.gomining_user_id || null,
                is_active: participant?.is_active || false,
                activated_at: participant?.activated_at || null,
                tickets: userTickets?.tickets || 0
            };
        });
        
        console.log('Merged users:', allUsers);
        
        updateStats();
        renderUsersTable();
        
        document.getElementById('loadingSpinner').style.display = 'none';
        document.getElementById('usersTable').style.display = 'table';
        
    } catch (error) {
        console.error('Error loading data:', error);
        document.getElementById('loadingSpinner').innerHTML = '<p style="color: #ef4444;">❌ Error loading data: ' + error.message + '</p>';
    }
}

async function loadUsersFromProfiles() {
    // Fallback method using profiles table
    const { data: profiles, error } = await supabase
        .from('profiles')
        .select(`
            *,
            participants(*),
            tickets(*)
        `);
    
    if (error) {
        console.error('Error loading profiles:', error);
        return;
    }
    
    allUsers = profiles.map(profile => ({
        id: profile.id,
        email: profile.email,
        created_at: profile.created_at,
        gomining_user_id: profile.participants?.gomining_user_id || null,
        is_active: profile.participants?.is_active || false,
        activated_at: profile.participants?.activated_at || null,
        tickets: profile.tickets?.tickets || 0
    }));
    
    updateStats();
    renderUsersTable();
    
    document.getElementById('loadingSpinner').style.display = 'none';
    document.getElementById('usersTable').style.display = 'table';
}

// ========== STATS UPDATE ==========
function updateStats() {
    console.log('updateStats called with allUsers:', allUsers);
    
    const totalUsers = allUsers.length;
    const activeUsers = allUsers.filter(u => u.is_active).length;
    const pendingUsers = allUsers.filter(u => !u.is_active && u.gomining_user_id).length;
    const totalTickets = allUsers.reduce((sum, u) => sum + (u.tickets || 0), 0);
    
    console.log('Stats:', { totalUsers, activeUsers, pendingUsers, totalTickets });
    
    const totalUsersEl = document.getElementById('totalUsersCount');
    const activeUsersEl = document.getElementById('activeUsersCount');
    const pendingUsersEl = document.getElementById('pendingUsersCount');
    const totalTicketsEl = document.getElementById('totalTicketsCount');
    
    console.log('Elements:', { totalUsersEl, activeUsersEl, pendingUsersEl, totalTicketsEl });
    
    if (totalUsersEl) totalUsersEl.textContent = totalUsers;
    if (activeUsersEl) activeUsersEl.textContent = activeUsers;
    if (pendingUsersEl) pendingUsersEl.textContent = pendingUsers;
    if (totalTicketsEl) totalTicketsEl.textContent = totalTickets;
}

// ========== TABLE RENDERING ==========
function renderUsersTable() {
    console.log('renderUsersTable called with', allUsers.length, 'users');
    
    const tbody = document.getElementById('usersTableBody');
    
    if (!tbody) {
        console.error('usersTableBody not found!');
        return;
    }
    
    tbody.innerHTML = '';
    
    console.log('Rendering table rows...');
    
    allUsers.forEach(user => {
        const row = document.createElement('tr');
        row.dataset.userId = user.id;
        
        // Status
        let statusBadge = '';
        if (user.is_active) {
            statusBadge = '<span class="status-badge status-active">Active</span>';
        } else if (user.gomining_user_id) {
            statusBadge = '<span class="status-badge status-pending">Pending</span>';
        } else {
            statusBadge = '<span class="status-badge status-inactive">Not Registered</span>';
        }
        
        // Activated date
        const activatedDate = user.activated_at 
            ? new Date(user.activated_at).toLocaleDateString() 
            : '-';
        
        row.innerHTML = `
            <td>${user.email}</td>
            <td>${user.gomining_user_id || '<span style="color: var(--text-secondary);">Not set</span>'}</td>
            <td><strong style="color: var(--gold);">${user.tickets}</strong></td>
            <td>${statusBadge}</td>
            <td>${activatedDate}</td>
            <td>
                ${!user.is_active ? 
                    `<button class="action-btn btn-activate" onclick="activateUser('${user.id}')">✅ Activate</button>` :
                    `<button class="action-btn btn-deactivate" onclick="deactivateUser('${user.id}')">❌ Deactivate</button>`
                }
                <button class="action-btn btn-edit" onclick="openEditModal('${user.id}')">✏️ Edit</button>
            </td>
        `;
        
        tbody.appendChild(row);
    });
}

// ========== SEARCH/FILTER ==========
function filterUsers() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const rows = document.querySelectorAll('#usersTableBody tr');
    
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(searchTerm) ? '' : 'none';
    });
}

// ========== USER ACTIONS ==========
async function activateUser(userId) {
    const user = allUsers.find(u => u.id === userId);
    
    if (!user.gomining_user_id) {
        alert('⚠️ Please set GoMining ID first before activating!');
        openEditModal(userId);
        return;
    }
    
    if (!confirm(`Activate user ${user.email}?`)) return;
    
    try {
        // Insert or update participant record
        const { error } = await supabase
            .from('participants')
            .upsert({
                id: userId,
                gomining_user_id: user.gomining_user_id,
                is_active: true,
                activated_at: new Date().toISOString()
            }, {
                onConflict: 'id'
            });
        
        if (error) throw error;
        
        // Log action
        await logAdminAction('activate_user', userId, `Activated user ${user.email}`);
        
        alert('✅ User activated!');
        await loadAllData();
        
    } catch (error) {
        console.error('Error activating user:', error);
        alert('❌ Error: ' + error.message);
    }
}

async function deactivateUser(userId) {
    const user = allUsers.find(u => u.id === userId);
    
    if (!confirm(`Deactivate user ${user.email}?`)) return;
    
    try {
        const { error } = await supabase
            .from('participants')
            .update({ is_active: false })
            .eq('id', userId);
        
        if (error) throw error;
        
        // Log action
        await logAdminAction('deactivate_user', userId, `Deactivated user ${user.email}`);
        
        alert('✅ User deactivated!');
        await loadAllData();
        
    } catch (error) {
        console.error('Error deactivating user:', error);
        alert('❌ Error: ' + error.message);
    }
}

// ========== EDIT MODAL ==========
function openEditModal(userId) {
    const user = allUsers.find(u => u.id === userId);
    if (!user) return;
    
    currentEditUserId = userId;
    
    document.getElementById('editEmail').value = user.email;
    document.getElementById('editGominingId').value = user.gomining_user_id || '';
    document.getElementById('editTickets').value = user.tickets || 0;
    document.getElementById('editStatus').value = user.is_active ? 'true' : 'false';
    document.getElementById('editReason').value = '';
    document.getElementById('editMessage').innerHTML = '';
    
    document.getElementById('editModal').style.display = 'flex';
}

function closeEditModal() {
    document.getElementById('editModal').style.display = 'none';
    currentEditUserId = null;
}

async function saveUserChanges() {
    if (!currentEditUserId) return;
    
    const gominingId = document.getElementById('editGominingId').value.trim();
    const tickets = parseInt(document.getElementById('editTickets').value) || 0;
    const isActive = document.getElementById('editStatus').value === 'true';
    const reason = document.getElementById('editReason').value.trim();
    const messageDiv = document.getElementById('editMessage');
    
    if (!gominingId) {
        messageDiv.innerHTML = '<p style="color: #ef4444;">❌ GoMining ID is required</p>';
        return;
    }
    
    messageDiv.innerHTML = '<p style="color: #3b82f6;">⏳ Saving...</p>';
    
    try {
        // Update participant
        const { error: participantError } = await supabase
            .from('participants')
            .upsert({
                id: currentEditUserId,
                gomining_user_id: gominingId,
                is_active: isActive,
                activated_at: isActive ? new Date().toISOString() : null
            }, {
                onConflict: 'id'
            });
        
        if (participantError) throw participantError;
        
        // Update tickets
        const { error: ticketsError } = await supabase
            .from('tickets')
            .upsert({
                user_id: currentEditUserId,
                tickets: tickets
            }, {
                onConflict: 'user_id'
            });
        
        if (ticketsError) throw ticketsError;
        
        // Log action
        const user = allUsers.find(u => u.id === currentEditUserId);
        await logAdminAction(
            'edit_user', 
            currentEditUserId, 
            `Updated ${user.email}: GoMining=${gominingId}, Tickets=${tickets}, Active=${isActive}. Reason: ${reason || 'N/A'}`
        );
        
        messageDiv.innerHTML = '<p style="color: #10b981;">✅ Changes saved!</p>';
        
        setTimeout(() => {
            closeEditModal();
            loadAllData();
        }, 1500);
        
    } catch (error) {
        console.error('Error saving changes:', error);
        messageDiv.innerHTML = `<p style="color: #ef4444;">❌ Error: ${error.message}</p>`;
    }
}

// ========== ADMIN ACTION LOGGING ==========
async function logAdminAction(actionType, targetUserId, details) {
    try {
        await supabase
            .from('admin_actions')
            .insert({
                admin_user_id: currentAdminUser.id,
                action_type: actionType,
                target_user_id: targetUserId,
                details: details
            });
    } catch (error) {
        console.error('Error logging admin action:', error);
    }
}
