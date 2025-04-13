// Funktion zum Laden der Inhaltsseiten (Farm oder Calculator)
function loadPage(page) {
    fetch(page)
        .then(response => response.text())
        .then(html => {
            document.getElementById('page-content').innerHTML = html;
        })
        .catch(error => {
            console.error('Error loading page:', error);
            document.getElementById('page-content').innerHTML = "<p style='color: red;'>Error loading page.</p>";
        });
}

// Funktion zum Laden des Headers
function loadHeader() {
    fetch('header.html')
        .then(response => response.text())
        .then(html => {
            document.getElementById('header').innerHTML = html;
        })
        .catch(error => {
            console.error('Error loading header:', error);
        });
}

// Beim Start beides laden
document.addEventListener("DOMContentLoaded", function() {
    loadHeader();
    loadPage('farm2.html'); // Standardmäßig Farm laden
});
