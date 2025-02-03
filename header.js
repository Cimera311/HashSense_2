document.addEventListener("DOMContentLoaded", function () {
    fetch("header.html")
        .then(response => response.text())
        .then(data => {
            document.getElementById("header-container").innerHTML = data;
            loadScripts(); // Call function to load scripts after header is inserted
        })
        .catch(error => console.error("Error loading header:", error));
});

function loadScripts() {
    let script = document.createElement("script");
    script.src = "skript.js";
    script.defer = true; // Ensures it runs after the document is loaded
    document.body.appendChild(script);
}
