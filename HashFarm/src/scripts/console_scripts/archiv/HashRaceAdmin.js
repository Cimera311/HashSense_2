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
        ADMIN_CONFIG.supabase.serviceRoleKey,  // Use service_role key for admin access
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            },
            db: {
                schema: 'public'
            }
        }
    );
    console.log('✅ Supabase initialized with service_role key (RLS bypassed)');
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
// ...existing code...

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
        
        console.log(`Found ${authData.users.length} users from auth.users`);
        
        // ✅ FIX: Loop through each user and fetch their data individually
        allUsers = [];
        
        for (const authUser of authData.users) {
            console.log(`\n🔍 Loading data for: ${authUser.email} (${authUser.id})`);
            
            // Fetch participant data for this specific user
            const { data: participant, error: participantError } = await supabase
                .from('participants')
                .select('*')
                .eq('id', authUser.id)
                .maybeSingle();
            
            if (participantError) {
                console.error(`  ❌ Error loading participant:`, participantError);
            } else if (participant) {
                console.log(`  ✅ Found participant:`, participant);
            } else {
                console.log(`  ℹ️ No participant entry`);
            }
            
            // Fetch tickets data for this specific user
            const { data: userTickets, error: ticketsError } = await supabase
                .from('tickets')
                .select('*')
                .eq('user_id', authUser.id)
                .maybeSingle();
            
            if (ticketsError) {
                console.error(`  ❌ Error loading tickets:`, ticketsError);
            } else if (userTickets) {
                console.log(`  ✅ Found tickets:`, userTickets);
            } else {
                console.log(`  ℹ️ No tickets entry`);
            }
            
            // Merge data for this user
            const mergedUser = {
                id: authUser.id,
                email: authUser.email,
                created_at: authUser.created_at,
                gomining_user_id: participant?.gomining_user_id || null,
                is_active: participant?.is_active || false,
                activated_at: participant?.activated_at || null,
                tickets: userTickets?.tickets || 0
            };
            
            console.log(`  ✅ Merged result:`, mergedUser);
            allUsers.push(mergedUser);
        }
        
        console.log(`\n📊 Final merged users (${allUsers.length}):`, allUsers);
        
        updateStats();
        renderUsersTable();
        
        document.getElementById('loadingSpinner').style.display = 'none';
        document.getElementById('usersTable').style.display = 'table';
        
    } catch (error) {
        console.error('Error loading data:', error);
        document.getElementById('loadingSpinner').innerHTML = '<p style="color: #ef4444;">❌ Error loading data: ' + error.message + '</p>';
    }
}

// ...existing code...

// ========== STATS UPDATE ==========
function updateStats() {
    console.log('updateStats called with allUsers:', allUsers);
    
    // Calculate stats
    const stats = {
        totalUsers: allUsers.length,
        activeUsers: allUsers.filter(u => u.is_active === true).length,
        pendingUsers: allUsers.filter(u => u.gomining_user_id && u.is_active === false).length,
        totalTickets: allUsers.reduce((sum, u) => sum + (u.tickets || 0), 0)
    };
    
    console.log('Stats:', stats);
    
    // Update DOM elements
    const elements = {
        totalUsersEl: document.getElementById('totalUsersCount'),
        activeUsersEl: document.getElementById('activeUsersCount'),
        pendingUsersEl: document.getElementById('pendingUsersCount'),
        totalTicketsEl: document.getElementById('totalTicketsCount')
    };
    
    console.log('Elements:', elements);
    
    if (elements.totalUsersEl) {
        elements.totalUsersEl.textContent = stats.totalUsers;
    }
    if (elements.activeUsersEl) {
        elements.activeUsersEl.textContent = stats.activeUsers;
    }
    if (elements.pendingUsersEl) {
        elements.pendingUsersEl.textContent = stats.pendingUsers;
    }
    if (elements.totalTicketsEl) {
        elements.totalTicketsEl.textContent = stats.totalTickets;
    }
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
        // Check if participant exists
        const { data: existingParticipant } = await supabase
            .from('participants')
            .select('id')
            .eq('id', userId)
            .single();
        
        let error;
        if (existingParticipant) {
            // UPDATE
            const result = await supabase
                .from('participants')
                .update({
                    is_active: true,
                    activated_at: new Date().toISOString()
                })
                .eq('id', userId);
            error = result.error;
        } else {
            // INSERT
            const result = await supabase
                .from('participants')
                .insert({
                    id: userId,
                    gomining_user_id: user.gomining_user_id,
                    is_active: true,
                    activated_at: new Date().toISOString()
                });
            error = result.error;
        }
        
        if (error) throw error;
        
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
// ...existing code...

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
        console.log('🔧 Saving changes for user:', currentEditUserId);
        console.log('Data:', { gominingId, tickets, isActive, reason });
        
        // Check if participant exists
        const { data: existingParticipant, error: checkError } = await supabase
            .from('participants')
            .select('id, gomining_user_id, is_active')
            .eq('id', currentEditUserId)
            .maybeSingle();
        
        console.log('Existing participant check:', { existingParticipant, checkError });
        
        // Update or insert participant
        let participantError;
        if (existingParticipant) {
            console.log('📝 UPDATING existing participant...');
            const { error } = await supabase
                .from('participants')
                .update({
                    gomining_user_id: gominingId,
                    is_active: isActive,
                    activated_at: isActive ? new Date().toISOString() : null
                })
                .eq('id', currentEditUserId);
                // REMOVED .select() - we don't need the data back
            
            console.log('Update result:', { error });
            participantError = error;
        } else {
            console.log('➕ INSERTING new participant...');
            const { error } = await supabase
                .from('participants')
                .insert({
                    id: currentEditUserId,
                    gomining_user_id: gominingId,
                    is_active: isActive,
                    activated_at: isActive ? new Date().toISOString() : null,
                    created_at: new Date().toISOString()
                });
                // REMOVED .select() - we don't need the data back
            
            console.log('Insert result:', { error });
            participantError = error;
        }
        
        if (participantError) {
            console.error('❌ Participant error:', participantError);
            throw participantError;
        }
        
        // Check if tickets exist
        const { data: existingTickets, error: ticketsCheckError } = await supabase
            .from('tickets')
            .select('user_id, tickets')
            .eq('user_id', currentEditUserId)
            .maybeSingle();
        
        console.log('Existing tickets check:', { existingTickets, ticketsCheckError });
        
        // Update or insert tickets
        let ticketsError;
        if (existingTickets) {
            console.log('📝 UPDATING existing tickets...');
            const { error } = await supabase
                .from('tickets')
                .update({ 
                    tickets: tickets,
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', currentEditUserId);
                // REMOVED .select()
            
            console.log('Tickets update result:', { error });
            ticketsError = error;
        } else {
            console.log('➕ INSERTING new tickets...');
            const { error } = await supabase
                .from('tickets')
                .insert({
                    user_id: currentEditUserId,
                    tickets: tickets,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                });
                // REMOVED .select()
            
            console.log('Tickets insert result:', { error });
            ticketsError = error;
        }
        
        if (ticketsError) {
            console.error('❌ Tickets error:', ticketsError);
            throw ticketsError;
        }
        
        // Log action
        const user = allUsers.find(u => u.id === currentEditUserId);
        await logAdminAction(
            'edit_user', 
            currentEditUserId, 
            `Updated ${user.email}: GoMining=${gominingId}, Tickets=${tickets}, Active=${isActive}. Reason: ${reason || 'N/A'}`
        );
        
        console.log('✅ All changes saved successfully!');
        messageDiv.innerHTML = '<p style="color: #10b981;">✅ Changes saved!</p>';
        
        setTimeout(() => {
            closeEditModal();
            loadAllData();
        }, 1500);
        
    } catch (error) {
        console.error('❌ Error saving changes:', error);
        messageDiv.innerHTML = `<p style="color: #ef4444;">❌ Error: ${error.message}</p>`;
    }
}


// ========== ADMIN ACTIONS LOG ==========
async function logAdminAction(action, targetUserId, details) {
    try {
        // Get current admin user
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
            console.warn('Cannot log action - no admin user found');
            return;
        }
        
        const { error } = await supabase
            .from('admin_actions')
            .insert({
                action: action,
                details: {
                    target_user_id: targetUserId,
                    description: details,
                    timestamp: new Date().toISOString()
                },
                performed_by: user.id,  // UUID statt email
                created_at: new Date().toISOString()
            });
        
        if (error) {
            console.error('Error logging admin action:', error);
            // Don't throw - logging should not break the main action
        } else {
            console.log('✅ Admin action logged:', action);
        }
    } catch (error) {
        console.error('Exception logging admin action:', error);
        // Don't throw - logging should not break the main action
    }
}
