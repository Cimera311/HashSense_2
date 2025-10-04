// GoBox Single Page Data Extractor
function extractSingleBoxData() {
    console.log("🎲 Extrahiere Daten von aktueller Box-Seite...");
    
    // Verschiedene Selektoren für Items probieren
    const itemSelectors = [
        '.item', '.loot-item', '.reward-item', '.box-item',
        '[class*="item"]', '.reward', '.drop', '.loot',
        'tr', '.row', '.list-item'
    ];
    
    let items = [];
    
    // Probiere verschiedene Selektoren
    for (let selector of itemSelectors) {
        items = document.querySelectorAll(selector);
        if (items.length > 0) {
            console.log(`✅ Gefunden mit Selektor: ${selector} (${items.length} Items)`);
            break;
        }
    }
    
    if (items.length === 0) {
        console.log("❌ Keine Items gefunden. Versuche manuelle Selektion...");
        console.log("Verfügbare Elemente auf der Seite:");
        
        // Zeige alle möglichen Container
        const containers = document.querySelectorAll('div, section, article, ul, ol, table');
        containers.forEach((container, index) => {
            if (container.children.length > 3 && container.textContent.includes('Range')) {
                console.log(`Container ${index}:`, container.className || container.tagName, container);
            }
        });
        return null;
    }
    
    const boxData = [];
    let boxName = 'unknown';
    
    // Versuche Box-Name zu finden
    const titleSelectors = ['h1', 'h2', '.title', '.box-name', '.header'];
    for (let selector of titleSelectors) {
        const titleEl = document.querySelector(selector);
        if (titleEl && titleEl.textContent.toLowerCase().includes('box')) {
            boxName = titleEl.textContent.toLowerCase()
                .replace(/\s+box.*/, '')
                .replace(/.*\s/, '')
                .trim();
            break;
        }
    }
    
    console.log(`📦 Box Name: ${boxName}`);
    
    items.forEach((item, index) => {
        // Verschiedene Wege, um Item-Daten zu finden
        const textContent = item.textContent || '';
        
        // Item Name finden
        const nameSelectors = ['.name', '.item-name', '.title', 'h3', 'h4', 'strong', 'b'];
        let itemName = '';
        
        for (let selector of nameSelectors) {
            const nameEl = item.querySelector(selector);
            if (nameEl) {
                itemName = nameEl.textContent.trim();
                break;
            }
        }
        
        // Falls kein Name in Unterelement, nimm ersten Text
        if (!itemName) {
            itemName = textContent.split('\n')[0].split('Range')[0].trim();
        }
        
        // Range finden
        const rangeMatch = textContent.match(/(?:Range|range)[\s:]*(\d+)[\s\-–]+(\d+)/i);
        
        // Rarity finden
        const rarityMatch = textContent.match(/(LEGENDARY|RARE|UNCOMMON|COMMON|EPIC|MYTHIC)/i) ||
                           item.className.match(/(legendary|rare|uncommon|common|epic|mythic)/i);
        
        if (itemName && rangeMatch) {
            const start = parseInt(rangeMatch[1]);
            const end = parseInt(rangeMatch[2]);
            const chance = ((end - start + 1) / 10000 * 100);
            const rarity = rarityMatch ? rarityMatch[0].toLowerCase() : 'unknown';
            
            boxData.push({
                item: itemName,
                chance: parseFloat(chance.toFixed(2)),
                range: `Range ${start}-${end}`,
                rarity: rarity,
                rangeStart: start,
                rangeEnd: end
            });
            
            console.log(`✅ Item ${index + 1}: ${itemName} | ${chance.toFixed(2)}% | Rarity: ${rarity}`);
        } else {
            console.log(`❌ Item ${index + 1}: Konnte nicht parsen - "${textContent.substring(0, 100)}..."`);
        }
    });
    
    // Sortiere nach Range Start
    boxData.sort((a, b) => a.rangeStart - b.rangeStart);
    
    const totalChance = boxData.reduce((sum, item) => sum + item.chance, 0);
    
    console.log(`\n📊 ERGEBNIS für ${boxName.toUpperCase()} BOX:`);
    console.log(`Gefundene Items: ${boxData.length}`);
    console.log(`Gesamtwahrscheinlichkeit: ${totalChance.toFixed(2)}%`);
    
    // Generiere JavaScript Code
    console.log(`\n💻 JAVASCRIPT CODE für ${boxName}:`);
    console.log(`    ${boxName}: [`);
    boxData.forEach((item, index) => {
        const comma = index < boxData.length - 1 ? ',' : '';
        console.log(`        { item: "${item.item}", chance: ${item.chance}, range: "${item.range}", rarity: "${item.rarity}", icon: "⚡" }${comma}`);
    });
    console.log(`    ],`);
    
    console.log(`\n📋 ROHDATEN (JSON):`);
    console.log(JSON.stringify({[boxName]: boxData}, null, 2));
    
    return {[boxName]: boxData};
}

// Falls automatische Erkennung fehlschlägt, manuelle Hilfe
function manualExtract() {
    console.log("🔍 Manuelle Extraktion - suche alle Texte mit 'Range':");
    
    const allElements = document.querySelectorAll('*');
    const rangeElements = [];
    
    allElements.forEach(el => {
        if (el.textContent.includes('Range') && el.children.length < 3) {
            rangeElements.push(el);
        }
    });
    
    console.log(`Gefunden ${rangeElements.length} Elemente mit 'Range':`);
    rangeElements.forEach((el, index) => {
        console.log(`${index + 1}: `, el.textContent.trim(), el);
    });
    
    return rangeElements;
}

// Hauptfunktion
function extractCurrentBox() {
    const data = extractSingleBoxData();
    
    if (!data) {
        console.log("🔧 Automatische Extraktion fehlgeschlagen. Versuche manuelle Methode:");
        manualExtract();
    }
    
    return data;
}

// Starte Extraktion
extractCurrentBox();
