// PASSE DEN SELECTOR AN DEINE SEITE AN!
const rows = document.querySelectorAll('table tr'); // ggf. anpassen

const matrix = [];
rows.forEach(tr => {
    const tds = tr.querySelectorAll('td');
    if (tds.length >= 3) {
        // 1. Spalte: Stufe (wird ignoriert), 2. Spalte: minTH, 3. Spalte: Preis
        const minTH = parseInt(tds[1].innerText.replace(/\D/g, ''));
        const pricePerTH = parseFloat(tds[2].innerText.replace(',', '.').replace(/[^\d.]/g, ''));
        if (!isNaN(minTH) && !isNaN(pricePerTH)) {
            matrix.push({ minTH, pricePerTH });
        }
    }
});

// Ausgabe im gewünschten Format für priceMatrix15.js
console.log('const priceMatrix15 = {');
console.log('  "15": [');
matrix.forEach((row, idx) => {
    const comma = idx < matrix.length - 1 ? ',' : '';
    console.log(`    { minTH: ${row.minTH}, pricePerTH: ${row.pricePerTH} }${comma}`);
});
console.log('  ]');
console.log('};');
// ...dein Extraktionscode wie gehabt...

// priceMatrix15.js als Text erzeugen
let jsText = 'const priceMatrixdatei = {\n  "15": [\n';
matrix.forEach((row, idx) => {
    const comma = idx < matrix.length - 1 ? ',' : '';
    jsText += `    { minTH: ${row.minTH}, pricePerTH: ${row.pricePerTH} }${comma}\n`;
});
jsText += '  ]\n};\n';

// Datei automatisch zum Download anbieten
const blob = new Blob([jsText], { type: 'application/javascript' });
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'priceMatrix15.js';
a.style.display = 'none';
document.body.appendChild(a);
a.click();
setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}, 1000);