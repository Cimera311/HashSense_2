// Funktion zum Laden von Seiten (z.B. Farm2 oder Calculator)
function loadPage(page) {
    fetch(page)
        .then(response => response.text())
        .then(async (html) => {
            document.getElementById('page-content').innerHTML = html;
        })
        .catch(error => {
            console.error('Error loading page:', error);
            document.getElementById('page-content').innerHTML = "<p style='color: red;'>Error loading page.</p>";
        });
}
window.loadPage = loadPage;

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

// Beim Start
document.addEventListener("DOMContentLoaded", async function() {
    await loadHeader();
    fetchBTCPrice();
    fetchGMTPrice();

    loadPage('HashSense.html');
});
