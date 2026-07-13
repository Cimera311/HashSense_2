/**
 * Berechnet die Effizienz (Watt pro TH) des Rests der Farm, wenn Target- und Greedy-Anteile
 * mit bekannten Watt/TH-Werten gegeben sind.
 *
 * Rechnung: totalWatts = farmTH * farmEfficiencyWPerTH
 *           restWatts = totalWatts - targetTH*targetWPerTH - greedyTH*greedyWPerTH
 *           restEfficiencyWPerTH = restWatts / restTH
 *
 * Alle Effizienzen sind in W/TH.
 *
 * @param {number} farmTH - Gesamt-TH der Farm (inkl. target + greedy)
 * @param {number} farmEfficiencyWPerTH - gewichtete Farm-Effizienz in W/TH (gesamt)
 * @param {number} targetTH - TH des Target-Miners
 * @param {number} targetEfficiencyWPerTH - Effizienz des Target (W/TH)
 * @param {number} greedyTH - TH des Greedy
 * @param {number} greedyEfficiencyWPerTH - Effizienz des Greedy (W/TH)
 * @returns {{
 *   restTH:number,
 *   restEfficiencyWPerTH:number,
 *   farmWithoutTargetAndGreedyTH:number,
 *   farmWithoutTargetAndGreedyEfficiencyWPerTH:number,
 *   diagnostics:object
 * }}
 */
function computeRestEfficiencyWPerTH(farmTH, farmEfficiencyWPerTH, targetTH, targetEfficiencyWPerTH, greedyTH, greedyEfficiencyWPerTH) {
  farmTH = Math.max(0, Number(farmTH) || 0);
  farmEfficiencyWPerTH = Number(farmEfficiencyWPerTH) || 0;
  targetTH = Math.max(0, Number(targetTH) || 0);
  greedyTH = Math.max(0, Number(greedyTH) || 0);
  targetEfficiencyWPerTH = Number(targetEfficiencyWPerTH) || 0;
  greedyEfficiencyWPerTH = Number(greedyEfficiencyWPerTH) || 0;

  // Gesamte Watt-Leistung der Farm (W)
  const totalWatts = farmTH * farmEfficiencyWPerTH;

  // Watt-Anteile von Target und Greedy (W)
  const targetWatts = targetTH * targetEfficiencyWPerTH;
  const greedyWatts = greedyTH * greedyEfficiencyWPerTH;

  // TH und Watt des "Rests"
  const restTH = Math.max(0, farmTH - targetTH - greedyTH);
  let restWatts = totalWatts - targetWatts - greedyWatts;

  // Numerische Rundungsabweichungen abfangen
  if (restWatts < 0 && restWatts > -1e-12) restWatts = 0;

  const restEfficiencyWPerTH = restTH > 0 ? (restWatts / restTH) : 0;

  return {
    restTH,
    restEfficiencyWPerTH,
    farmWithoutTargetAndGreedyTH: restTH,
    farmWithoutTargetAndGreedyEfficiencyWPerTH: restEfficiencyWPerTH,
    diagnostics: {
      totalWatts,
      targetWatts,
      greedyWatts,
      restWatts
    }
  };
}
/**
 * Wendet das Greedy-Wachstum an (Dienstagsszenario), wenn Greedy Teil der Farm ist.
 *
 * state: {
 *   farmTH,
 *   farmEfficiencyWPerTH,
 *   targetTH,               // optional (0 wenn nicht vorhanden)
 *   targetEfficiencyWPerTH, // optional
 *   greedyTH,
 *   greedyEfficiencyWPerTH  // optional; wenn nicht gegeben, wird angenommen, dass greedy vorher die gleiche W/TH hatte wie geschätzt
 * }
 *
 * options: {
 *   greedyGrowthRate, // in Prozent, z.B. 0.12
 *   maxGreedyTH,      // optional Cap für greedyTH nach Wachstum
 *   useGreedyEfficiencyIfProvided: true/false (default true)
 * }
 *
 * Rückgabe: { newGreedyTH, growthAmount, newFarmTH, newFarmEfficiencyWPerTH, diagnostics }
 */
function applyGreedyGrowthToFarmDay(state = {}, options = {}) {
  const farmTH = Math.max(0, Number(state.farmTH) || 0);
  const farmEfficiencyWPerTH = Number(state.farmEfficiencyWPerTH) || 0;
  const targetTH = Math.max(0, Number(state.targetTH) || 0);
  const targetEfficiencyWPerTH = Number(state.targetEfficiencyWPerTH) || 0;
  let greedyTH = Math.max(0, Number(state.greedyTH) || 0);
  const greedyEfficiencyProvided = Number(state.greedyEfficiencyWPerTH) || undefined;

  const rate = Number(options.greedyGrowthRate) || 0;
  const maxGreedyTH = (typeof options.maxGreedyTH === 'number') ? options.maxGreedyTH : Infinity;
  const useProvidedGreedyEff = (options.useGreedyEfficiencyIfProvided !== false);

  // 1) Ermitteln der Rest-Effizienz (ohne Target+Greedy) anhand der aktuellen farm-W/TH
  const restInfo = computeRestEfficiencyWPerTH(
    farmTH,
    farmEfficiencyWPerTH,
    targetTH,
    targetEfficiencyWPerTH,
    greedyTH,
    greedyEfficiencyProvided || farmEfficiencyWPerTH // wenn keine greedyEff gegeben, verwenden wir farmEff temporär
  );

  const restTH = restInfo.restTH;
  const restEfficiencyWPerTH = restInfo.restEfficiencyWPerTH;

  // 2) Remove greedy from farm (logisch): farmWithoutGreedyTH = restTH + targetTH
  const farmWithoutGreedyTH = restTH + targetTH;
  // farmWithoutGreedyWatt = restTH*restEff + targetTH*targetEff
  const farmWithoutGreedyWatts = (restTH * restEfficiencyWPerTH) + (targetTH * targetEfficiencyWPerTH);

  // 3) Bestimme alte Greedy-Effizienz (falls nicht explizit gegeben, nehmen wir vorh. Anteil)
  const greedyOldEfficiencyWPerTH = (typeof greedyEfficiencyProvided === 'number' && useProvidedGreedyEff)
    ? greedyEfficiencyProvided
    : (greedyTH > 0 ? ((farmTH * farmEfficiencyWPerTH) - ((restTH + targetTH) * restEfficiencyWPerTH) ) / greedyTH : 0);

  // Fallback: falls obige Rechnung NaN/Inf ergibt, setze auf farmEfficiencyWPerTH
  if (!isFinite(greedyOldEfficiencyWPerTH) || greedyOldEfficiencyWPerTH <= 0) {
    // sichere Annahme
    // eslint-disable-next-line no-self-assign
    // (keine Änderung, nur Sicherung)
  }

  // 4) Wachstum anwenden
  let newGreedyTH = greedyTH * (1 + rate / 100);
  if (newGreedyTH > maxGreedyTH) newGreedyTH = maxGreedyTH;
  const growthAmount = newGreedyTH - greedyTH;

  // 5) Bestimme welche Efficiency der Greedy nach Wachstum haben soll
  //    Standard: gleiche Effizienz wie vorher (greedyOldEfficiencyWPerTH) oder falls provided genutzt wird, diese
  const newGreedyEfficiencyWPerTH = (typeof greedyEfficiencyProvided === 'number' && useProvidedGreedyEff)
    ? greedyEfficiencyProvided
    : (greedyOldEfficiencyWPerTH || restEfficiencyWPerTH || farmEfficiencyWPerTH);

  // 6) Neue Farm-Watts und -TH berechnen (farmWithoutGreedyWatts + newGreedyTH * newGreedyEfficiency)
  const newFarmWatts = farmWithoutGreedyWatts + (newGreedyTH * newGreedyEfficiencyWPerTH);
  const newFarmTH = farmWithoutGreedyTH + newGreedyTH;
  const newFarmEfficiencyWPerTH = newFarmTH > 0 ? (newFarmWatts / newFarmTH) : 0;

  return {
    newGreedyTH,
    growthAmount,
    newGreedyEfficiencyWPerTH,
    newFarmTH,
    newFarmEfficiencyWPerTH,
    diagnostics: {
      farmTH,
      farmEfficiencyWPerTH,
      targetTH,
      targetEfficiencyWPerTH,
      greedyTHBefore: greedyTH,
      greedyOldEfficiencyWPerTH,
      farmWithoutGreedyTH,
      farmWithoutGreedyWatts,
      restTH,
      restEfficiencyWPerTH,
      newFarmWatts
    }
  };
}
/**
 * Fall: Greedy IST der Target-Miner. Erhöht am Dienstag den Target-TH um die growthRate.
 *
 * state: {
 *   farmTH,
 *   farmEfficiencyWPerTH,
 *   targetTH,               // der Target (gleich Greedy)
 *   targetEfficiencyWPerTH  // W/TH des Target
 * }
 *
 * options: {
 *   greedyGrowthRate, // in Prozent, z.B. 0.12
 *   maxTargetTH       // optional Cap für targetTH nach Wachstum
 * }
 *
 * Rückgabe: { newTargetTH, growthAmount, newFarmTH, newFarmEfficiencyWPerTH, diagnostics }
 */
function applyGreedyGrowthWhenTargetIsGreedy(state = {}, options = {}) {
  const farmTH = Math.max(0, Number(state.farmTH) || 0);
  const farmEfficiencyWPerTH = Number(state.farmEfficiencyWPerTH) || 0;
  const targetTH = Math.max(0, Number(state.targetTH) || 0);
  const targetEfficiencyWPerTH = Number(state.targetEfficiencyWPerTH) || 0;

  const rate = Number(options.greedyGrowthRate) || 0;
  const maxTargetTH = (typeof options.maxTargetTH === 'number') ? options.maxTargetTH : Infinity;

  // Gesamtwatt der Farm aktuell
  const totalWatts = farmTH * farmEfficiencyWPerTH;

  // Watt-Anteil des Targets (Greedy)
  const targetWatts = targetTH * targetEfficiencyWPerTH;

  // Rest der Farm (ohne Target)
  const restTH = Math.max(0, farmTH - targetTH);
  let restWatts = totalWatts - targetWatts;
  if (restWatts < 0 && restWatts > -1e-12) restWatts = 0;

  // Falls restTH == 0, setzen wir restEfficiency so, dass keine Division durch 0 passiert
  const restEfficiencyWPerTH = restTH > 0 ? (restWatts / restTH) : farmEfficiencyWPerTH;

  // Wachstum des Targets
  let newTargetTH = targetTH * (1 + rate / 100);
  if (newTargetTH > maxTargetTH) newTargetTH = maxTargetTH;
  const growthAmount = newTargetTH - targetTH;

  // Neue Farm-TH und -Watt (Target liefert neueTargetTH * targetEfficiency)
  const newFarmTH = restTH + newTargetTH;
  const newFarmWatts = restWatts + (newTargetTH * targetEfficiencyWPerTH);
  const newFarmEfficiencyWPerTH = newFarmTH > 0 ? (newFarmWatts / newFarmTH) : 0;

  return {
    newTargetTH,
    growthAmount,
    newFarmTH,
    newFarmEfficiencyWPerTH,
    diagnostics: {
      farmTH,
      farmEfficiencyWPerTH,
      targetTHBefore: targetTH,
      targetEfficiencyWPerTH,
      restTH,
      restEfficiencyWPerTH,
      restWatts,
      totalWatts,
      newFarmWatts
    }
  };
}