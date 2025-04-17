// Funktion zum Laden von Seiten (z.B. Farm2 oder Calculator)
function loadPage(page) {
    fetch(page)
        .then(response => response.text())
        .then(async (html) => {
            document.getElementById('page-content').innerHTML = html;

            // Wenn Farm geladen wird, lade danach skriptfarm.js
            if (page === 'farm2.html') {
                await loadFarmScript();
            }
        })
        .catch(error => {
            console.error('Error loading page:', error);
            document.getElementById('page-content').innerHTML = "<p style='color: red;'>Error loading page.</p>";
        });
}
window.loadPage = loadPage;

// Lade skriptfarm.js dynamisch
function loadFarmScript() {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'skriptfarm.js';
        script.onload = () => {
            console.log('skriptfarm.js loaded');
            resolve();
        };
        script.onerror = () => {
            console.error('Failed to load skriptfarm.js');
            reject();
        };
        document.body.appendChild(script);
    });
}

// Header laden
function loadHeader() {
    return fetch('header.html')
        .then(response => response.text())
        .then(html => {
            document.getElementById('header').innerHTML = html;
        })
        .catch(error => {
            console.error('Error loading header:', error);
        });
}

// Prüfe ob Benutzer eingeloggt ist
function checkLogin() {
    const session = JSON.parse(sessionStorage.getItem("supabaseSession"));
    return !!session;
}

// Beim Start
document.addEventListener("DOMContentLoaded", async function() {
    await loadHeader();
    fetchBTCPrice();
    fetchGMTPrice();
    
    if (checkLogin()) {
        loadPage('farm2.html');
    } else {
        loadPage('login.html');
    }
});
