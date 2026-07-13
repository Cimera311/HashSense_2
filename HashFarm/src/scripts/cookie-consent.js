// Cookie Consent Banner
function initCookieConsent() {
    // Check if user already made a choice
    const consent = localStorage.getItem('cookie_consent');
    
    if (!consent) {
        showCookieBanner();
    } else if (consent === 'accepted') {
        loadAnalytics();
    }
}

function showCookieBanner() {
    const banner = document.createElement('div');
    banner.id = 'cookie-banner';
    banner.innerHTML = `
        <div style="position: fixed; bottom: 0; left: 0; right: 0; background: linear-gradient(135deg, #1f2937 0%, #111827 100%); border-top: 2px solid #6366f1; padding: 1rem 1.5rem; z-index: 9999; box-shadow: 0 -4px 12px rgba(0,0,0,0.3);">
            <div style="max-width: 1200px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; gap: 1.5rem; flex-wrap: wrap;">
                <div style="flex: 1; min-width: 300px;">
                    <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.5rem;">
                        <span style="font-size: 1.5rem;">🍪</span>
                        <p style="color: #fff; font-weight: 600; margin: 0; font-size: 1rem;">We use cookies</p>
                    </div>
                    <p style="color: #9ca3af; margin: 0; font-size: 0.875rem; line-height: 1.4;">
                        We use Google Analytics to understand how you use our tools and improve your experience. No personal data is collected.
                    </p>
                </div>
                <div style="display: flex; gap: 0.75rem; align-items: center; flex-shrink: 0;">
                    <button onclick="rejectCookies()" style="background: transparent; color: #9ca3af; border: 1px solid #374151; padding: 0.625rem 1.25rem; border-radius: 0.5rem; font-weight: 500; cursor: pointer; transition: all 0.2s; font-size: 0.875rem;">
                        Reject
                    </button>
                    <button onclick="acceptCookies()" style="background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%); color: #fff; border: none; padding: 0.625rem 1.5rem; border-radius: 0.5rem; font-weight: 600; cursor: pointer; transition: all 0.2s; box-shadow: 0 2px 8px rgba(139, 92, 246, 0.4); font-size: 0.875rem;">
                        Accept
                    </button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(banner);
}

function acceptCookies() {
    localStorage.setItem('cookie_consent', 'accepted');
    hideCookieBanner();
    loadAnalytics();
    
    // Track consent acceptance
    if (typeof gtag !== 'undefined') {
        gtag('event', 'cookie_consent_accepted', {
            'event_category': 'Cookie Consent',
            'event_label': 'User Accepted Cookies',
            'value': 1
        });
    }
}

function rejectCookies() {
    localStorage.setItem('cookie_consent', 'rejected');
    hideCookieBanner();
    
    // Disable GA if already loaded
    if (typeof gtag !== 'undefined') {
        window['ga-disable-G-VQ2RT4JL4L'] = true;
    }
}

function hideCookieBanner() {
    const banner = document.getElementById('cookie-banner');
    if (banner) {
        banner.style.animation = 'slideDown 0.3s ease-out';
        setTimeout(() => banner.remove(), 300);
    }
}

function loadAnalytics() {
    // GA4 is already loaded in HTML, just enable it
    if (typeof gtag !== 'undefined') {
        window['ga-disable-G-VQ2RT4JL4L'] = false;
        gtag('consent', 'update', {
            'analytics_storage': 'granted'
        });
    }
}

// Add slide animation
const style = document.createElement('style');
style.textContent = `
    @keyframes slideDown {
        from { transform: translateY(0); opacity: 1; }
        to { transform: translateY(100%); opacity: 0; }
    }
    
    #cookie-banner button:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(139, 92, 246, 0.6);
    }
    
    #cookie-banner button:first-of-type:hover {
        background: #1f2937;
        border-color: #6366f1;
        color: #fff;
    }
`;
document.head.appendChild(style);

// Initialize on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCookieConsent);
} else {
    initCookieConsent();
}
