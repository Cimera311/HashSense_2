// Supabase-Client initialisieren
const supabaseUrl = "https://umlgbacgghrvzwfvirro.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVtbGdiYWNnZ2hydnp3ZnZpcnJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY1MTAzMjQsImV4cCI6MjA1MjA4NjMyNH0.Hv0X4Wy4PtbSJ4yEN-CFszdX4zEoW4CMEHrbRBbX1Ug";
const supabase = supabase.createClient(supabaseUrl, supabaseKey);

// Registrierung
document.getElementById("signup-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = document.getElementById("signup-username").value;
    const email = document.getElementById("signup-email").value;
    const password = document.getElementById("signup-password").value;

    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { username } },
    });

    if (error) {
        console.error("Registration failed:", error.message);
        alert("Registration failed: " + error.message);
    } else {
        console.log("Registration successful:", data);
        alert("Registration successful!");
    }
});

// Login
document.getElementById("login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("login-email").value;
    const password = document.getElementById("login-password").value;

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
        console.error("Login failed:", error.message);
        alert("Login failed: " + error.message);
    } else {
        console.log("Login successful:", data);
        alert("Login successful!");
        window.location.href = "home.html"; // Weiterleitung nach dem Login
    }
});

// Passwort zurücksetzen
document.getElementById("forgot-password-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("forgot-email").value;

    const { data, error } = await supabase.auth.resetPasswordForEmail(email);

    if (error) {
        console.error("Password reset failed:", error.message);
        alert("Password reset failed: " + error.message);
    } else {
        console.log("Password reset email sent:", data);
        alert("Password reset email sent!");
    }
});

