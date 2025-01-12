// Supabase-Client initialisieren
const supabaseUrl = "https://umlgbacgghrvzwfvirro.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVtbGdiYWNnZ2hydnp3ZnZpcnJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY1MTAzMjQsImV4cCI6MjA1MjA4NjMyNH0.Hv0X4Wy4PtbSJ4yEN-CFszdX4zEoW4CMEHrbRBbX1Ug";
const supabase = supabase.createClient(supabaseUrl, supabaseKey);

// Teste die Verbindung
async function testConnection() {
  const { data, error } = await supabase.from('UserDB').select('*');
  if (error) {
    console.error('Verbindung fehlgeschlagen:', error.message);
  } else {
    console.log('Verbindung erfolgreich! Daten:', data);
  }
}

testConnection();
