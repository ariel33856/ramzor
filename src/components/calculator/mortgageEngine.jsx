/* ═══════════════════════════════════════════════════════════════
   MORTGAGE DOMAIN ENGINE — Israeli mortgage regulations
   Bank of Israel Directive 329, Jan 2026
   ═══════════════════════════════════════════════════════════════ */
const BOI_RATE = 4.0;
const PRIME_BASE = BOI_RATE + 1.5;
const ASSUMED_CPI = 2.5;

const INTEREST_TYPES = {
  'קל"צ': { label:'קבועה לא צמודה', cls:'קבועה', indexed:false, fixed:true, feeOnEarly:true, anchor:'—' },
  'ק"צ':  { label:'קבועה צמודה', cls:'קבועה', indexed:true, fixed:true, feeOnEarly:true, anchor:'מדד' },
  'מל"צ': { label:'משתנה לא צמודה', cls:'משתנה', indexed:false, fixed:false, feeOnEarly:true, anchor:'אג"ח ל"צ' },
  'מ"צ':  { label:'משתנה צמודה', cls:'משתנה', indexed:true, fixed:false, feeOnEarly:true, anchor:'אג"ח צמוד' },
  'פריים': { label:'פריים', cls:'משתנה', indexed:false, fixed:false, feeOnEarly:false, anchor:'פריים ' + (BOI_RATE+1.5) + '%' },
};

const REPAYMENT_TYPES = ['שפיצר', 'קרן שווה', 'בולט'];
const DEFAULT_RATES = { 'קל"צ':4.9, 'ק"צ':2.2, 'מל"צ':4.5, 'מ"צ':2.2, 'פריים': BOI_RATE+1.5+0.25 };

function calcShpitzer(P, annualR, months) { const r = annualR / 100 / 12; if (r === 0) return P / months; const f = Math.pow(1 + r, months); return P * (r * f) / (f - 1); }
function calcShpitzerReverse(PMT, annualR, months) { const r = annualR / 100 / 12; if (r === 0) return PMT * months; const f = Math.pow(1 + r, months); return PMT * (f - 1) / (r * f); }

function genAmortization(track, overrideCPI, overrideBoiRate) {
  const sched = []; let balance = track.amount; const N = track.periodMonths;
  const meta = INTEREST_TYPES[track.interestType]; const cpi = overrideCPI !== undefined ? overrideCPI : ASSUMED_CPI;
  let rate = track.rate;
  if (overrideBoiRate !== undefined && track.interestType === 'פריים') { const spread = track.rate - PRIME_BASE; rate = overrideBoiRate + 1.5 + spread; }
  const r = rate / 100 / 12; const monthlyCPI = meta?.indexed ? Math.pow(1 + cpi / 100, 1 / 12) - 1 : 0;
  const isS = track.repaymentType === 'שפיצר'; const isK = track.repaymentType === 'קרן שווה';
  const graceM = track.graceMonths || 0; const effectiveN = N - graceM;
  let fixedPMT = 0;
  if (graceM === 0 && isS && !meta?.indexed && effectiveN > 0) fixedPMT = calcShpitzer(track.amount, rate, effectiveN);
  for (let m = 1; m <= N; m++) {
    const isGrace = m <= graceM; const intPmt = balance * r; const idxPmt = balance * monthlyCPI; let prinPmt = 0;
    if (isGrace && track.graceType === 'full') {
      balance += intPmt;
      sched.push({ month: m, payment: 0, principal: 0, interest: intPmt, indexation: idxPmt, balance });
      continue;
    } else if (isGrace) {
      sched.push({ month: m, payment: intPmt + idxPmt, principal: 0, interest: intPmt, indexation: idxPmt, balance });
      continue;
    }
    if (!isGrace && fixedPMT === 0 && isS && !meta?.indexed && effectiveN > 0) { fixedPMT = calcShpitzer(balance, rate, effectiveN); }
    if (isS) { if (meta?.indexed) { const remaining = N - m + 1; prinPmt = calcShpitzer(balance, rate, remaining) - intPmt; } else { prinPmt = fixedPMT - intPmt; } } else if (isK) { prinPmt = balance / (N - m + 1); } else { prinPmt = m === N ? balance : 0; }
    if (prinPmt > balance) prinPmt = balance; if (meta?.indexed) balance *= (1 + monthlyCPI); balance = Math.max(0, balance - prinPmt);
    let pmt = isS && !meta?.indexed ? fixedPMT : prinPmt + intPmt + idxPmt;
    sched.push({ month: m, payment: pmt, principal: prinPmt, interest: intPmt, indexation: idxPmt, balance });
  }
  return sched;
}

function calcIRR(total, flows) { let lo = -0.5, hi = 2.0; for (let i = 0; i < 80; i++) { const mid = (lo + hi) / 2; const rm = mid / 12; let npv = -total; for (let j = 0; j < flows.length; j++) npv += flows[j] / Math.pow(1 + rm, j + 1); if (npv > 0) lo = mid; else hi = mid; } return ((lo + hi) / 2) * 100; }

function calcFirstPayment(t, overrideCPI, overrideBoiRate) {
  const meta = INTEREST_TYPES[t.interestType]; const grace = t.graceMonths || 0;
  const cpi = overrideCPI !== undefined ? overrideCPI : ASSUMED_CPI; let rate = t.rate;
  if (overrideBoiRate !== undefined && t.interestType === 'פריים') { rate = overrideBoiRate + 1.5 + (t.rate - PRIME_BASE); }
  const monthlyCPI = meta?.indexed ? Math.pow(1 + cpi / 100, 1 / 12) - 1 : 0; const idxPmt = t.amount * monthlyCPI;
  if (grace > 0) return t.amount * (rate / 100 / 12) + idxPmt;
  if (t.repaymentType === 'שפיצר') return calcShpitzer(t.amount, rate, t.periodMonths) + idxPmt;
  if (t.repaymentType === 'קרן שווה') return (t.amount / t.periodMonths) + t.amount * (rate / 100 / 12) + idxPmt;
  return t.amount * rate / 100 / 12 + idxPmt;
}

function checkCompliance(tracks, total, income) {
  const fixedAmt = tracks.filter(t => INTEREST_TYPES[t.interestType]?.fixed).reduce((s, t) => s + t.amount, 0);
  const fixedR = total > 0 ? fixedAmt / total : 0; const maxP = tracks.length > 0 ? Math.max(...tracks.map(t => t.periodMonths)) : 0;
  const firstPmt = tracks.reduce((s, t) => s + calcFirstPayment(t), 0); const pti = income > 0 ? firstPmt / income : 1;
  return { fixedR, maxP, pti, ptiOk: pti <= 0.5, compOk: fixedR >= 0.3333, periodOk: maxP <= 360, firstPmt };
}

function getExitPoints(tracks) {
  const points = []; tracks.forEach(t => { const meta = INTEREST_TYPES[t.interestType]; if (t.interestType === 'פריים') return;
    if (!meta?.fixed && t.updateMonths > 0) { for (let m = t.updateMonths; m <= t.periodMonths; m += t.updateMonths) { points.push({ month: m, year: Math.ceil(m / 12), trackId: t.id, type: t.interestType }); } }
  }); return points;
}

function calcHealthScore(tracks, income, propValue, totalAmount, pps, comp) {
  if (tracks.length === 0) return { score: 0, items: [] }; const items = [];
  const ptiVal = comp.pti; const ptiScore = ptiVal <= 0.25 ? 100 : ptiVal <= 0.33 ? 80 : ptiVal <= 0.40 ? 55 : ptiVal <= 0.50 ? 30 : 0;
  items.push({ label: 'PTI', score: ptiScore, weight: 25, detail: (ptiVal * 100).toFixed(0) + '%', ok: ptiScore >= 55 });
  const ppsN = parseFloat(pps) || 0; const ppsScore = ppsN <= 1.3 ? 100 : ppsN <= 1.5 ? 75 : ppsN <= 1.8 ? 45 : 15;
  items.push({ label: 'החזר/שקל', score: ppsScore, weight: 20, detail: ppsN.toFixed(2), ok: ppsScore >= 45 });
  const fixR = comp.fixedR; const fixScore = fixR >= 0.4 && fixR <= 0.65 ? 100 : fixR >= 0.333 ? 70 : fixR >= 0.2 ? 40 : 15;
  items.push({ label: '% קבועה', score: fixScore, weight: 15, detail: (fixR * 100).toFixed(0) + '%', ok: fixScore >= 40 });
  const ltv = propValue > 0 ? totalAmount / propValue : 1; const ltvScore = ltv <= 0.5 ? 100 : ltv <= 0.6 ? 80 : ltv <= 0.70 ? 55 : ltv <= 0.75 ? 35 : 10;
  items.push({ label: 'LTV', score: ltvScore, weight: 15, detail: (ltv * 100).toFixed(0) + '%', ok: ltvScore >= 35 });
  const maxY = tracks.length > 0 ? Math.max(...tracks.map(t => t.periodMonths / 12)) : 0; const perScore = maxY <= 15 ? 100 : maxY <= 20 ? 80 : maxY <= 25 ? 50 : 20;
  items.push({ label: 'תקופה', score: perScore, weight: 10, detail: maxY.toFixed(0) + ' שנה', ok: perScore >= 50 });
  const types = new Set(tracks.map(t => t.interestType)).size; const divScore = types >= 3 ? 100 : types === 2 ? 60 : 20;
  items.push({ label: 'גיוון', score: divScore, weight: 10, detail: types + ' סוגים', ok: divScore >= 60 });
  const hasPrime = tracks.some(t => t.interestType === 'פריים'); const primeW = hasPrime ? tracks.filter(t => t.interestType === 'פריים').reduce((s, t) => s + t.amount, 0) / totalAmount : 0;
  const flexScore = primeW >= 0.25 ? 100 : primeW > 0 ? 60 : 20;
  items.push({ label: 'גמישות', score: flexScore, weight: 5, detail: hasPrime ? (primeW * 100).toFixed(0) + '% פריים' : 'אין פריים', ok: flexScore >= 60 });
  const total = items.reduce((s, it) => s + it.score * it.weight, 0) / 100; return { score: Math.round(total), items };
}

function calcEarlyRepaymentFee(track, prepayAmount, yearsInLoan, currentAvgRate, prepayDate, hasNotice) {
  const meta = INTEREST_TYPES[track.interestType]; const fees = { operational: 60, noNotice: 0, discount: 0, indexAvg: 0, total: 0 };
  fees.noNotice = hasNotice ? 0 : Math.round(prepayAmount * 0.001);
  if (meta?.indexed && prepayDate <= 15) { fees.indexAvg = Math.round(prepayAmount * (ASSUMED_CPI / 100) / 2); }
  let capitalizationFee = 0;
  if (track.interestType !== 'פריים') { const rateDiff = track.rate - currentAvgRate;
    if (rateDiff > 0) { let yearsToExit = 0;
      if (!meta?.fixed && track.updateMonths > 0) { const monthsIn = yearsInLoan * 12; const nextExit = Math.ceil(monthsIn / track.updateMonths) * track.updateMonths; yearsToExit = Math.max(0, (nextExit - monthsIn) / 12); }
      else { yearsToExit = Math.max(0, track.periodMonths / 12 - yearsInLoan); }
      capitalizationFee = Math.round(prepayAmount * (rateDiff / 100) * yearsToExit);
      let senDiscount = 0; if (yearsInLoan >= 7) senDiscount = 0.40; else if (yearsInLoan >= 5) senDiscount = 0.30; else if (yearsInLoan >= 3) senDiscount = 0.20; else if (yearsInLoan >= 1) senDiscount = 0.10;
      fees.discount = Math.round(capitalizationFee * senDiscount); capitalizationFee -= fees.discount;
    }
  }
  fees.capitalization = Math.max(0, capitalizationFee);
  fees.total = fees.operational + fees.noNotice + fees.capitalization + fees.indexAvg;
  fees.optimized = fees.operational + fees.capitalization;
  fees.senPct = track.interestType !== 'פריים' ? (yearsInLoan >= 7 ? 40 : yearsInLoan >= 5 ? 30 : yearsInLoan >= 3 ? 20 : yearsInLoan >= 1 ? 10 : 0) : 0;
  return fees;
}

const fmt = n => typeof n === "number" ? Math.round(n).toLocaleString("he-IL") : n;

function exportAmortCSV(monthlyData) {
  const headers = ['חודש', 'שנה', 'תשלום', 'קרן', 'ריבית', 'הצמדה', 'יתרה'];
  const rows = monthlyData.map(r => [r.month, Math.ceil(r.month/12), Math.round(r.payment), Math.round(r.principal), Math.round(r.interest), Math.round(r.indexation), Math.round(r.balance)]);
  const bom = '\uFEFF';
  const csv = bom + headers.join(',') + '\n' + rows.map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'amortization-schedule.csv'; a.click();
  URL.revokeObjectURL(url);
}

/* ═══════════════════════════════════════════════════════════════
   THEME DEFINITIONS
   ═══════════════════════════════════════════════════════════════ */
const DARK = {
  bg: "#0c0e16", bgCard: "#161825", bgCard2: "#1e2133", bgHover: "#242840",
  border: "#2a2e45", borderLight: "#383d5c",
  text: "#e4e6f0", textSoft: "#8b90b0", textMuted: "#555a78",
  gold: "#d4a853", goldLight: "#f0d080", goldDark: "#a07d30",
  headerBg: "linear-gradient(135deg, #141728, #1e2340, #141728)",
  headerBg2: "linear-gradient(135deg, #1e2235, #2a2f4a)",
  cardGrad: (c1, c2) => `linear-gradient(145deg, ${c1 || "#161825"}, ${c2 || "#1e2133"})`,
  totalBg: "linear-gradient(135deg, #1a1d30, #222640)",
  emerald: "#00d4aa", teal: "#4ecdc4", coral: "#ff6b6b", amber: "#ff9f43",
  violet: "#a855f7", sky: "#38bdf8", purple: "#6c63ff", pink: "#f472b6",
  green: "#00d68f", red: "#ff5a5a", orange: "#ffb347", blue: "#5b9cf6",
  scrollTrack: "#161825", scrollThumb: "#2a2e45",
  inputBg: "#1e2133", selectBg: "#1e2133",
  tooltipBg: "rgba(22,24,37,.96)", badgePro: "#d4a853",
};

const LIGHT = {
  bg: "#f0f2f5", bgCard: "#ffffff", bgCard2: "#f8f9fb", bgHover: "#eef1f6",
  border: "#d8dce6", borderLight: "#c8cdd8",
  text: "#1a1d2e", textSoft: "#5a6070", textMuted: "#8a90a0",
  gold: "#b08830", goldLight: "#8a6d20", goldDark: "#705518",
  headerBg: "linear-gradient(135deg, #1a2540, #253560, #1a2540)",
  headerBg2: "linear-gradient(135deg, #1e2840, #2a3558)",
  cardGrad: (c1, c2) => `linear-gradient(145deg, ${c1 || "#ffffff"}, ${c2 || "#f8f9fb"})`,
  totalBg: "linear-gradient(135deg, #e8edf5, #dde3ef)",
  emerald: "#009d7e", teal: "#0ea89e", coral: "#e04545", amber: "#d98020",
  violet: "#8030d0", sky: "#1890d0", purple: "#5548e0", pink: "#d04898",
  green: "#00a06a", red: "#d83838", orange: "#d08020", blue: "#3070d0",
  scrollTrack: "#f0f2f5", scrollThumb: "#c8cdd8",
  inputBg: "#ffffff", selectBg: "#ffffff",
  tooltipBg: "rgba(255,255,255,.97)", badgePro: "#b08830",
};

let _id = 10;
const mkTrack = () => ({ id: _id++, repaymentType: 'שפיצר', interestType: 'פריים', amount: 300000, periodMonths: 240, updateMonths: 0, rate: DEFAULT_RATES['פריים'], graceMonths: 0, graceType: 'none' });
const getNextId = () => _id++;
const initTracks = [
  { id:1, repaymentType:'שפיצר', interestType:'קל"צ', amount:500000, periodMonths:180, updateMonths:0, rate:4.90, graceMonths:0, graceType:'none' },
  { id:2, repaymentType:'שפיצר', interestType:'פריים', amount:500000, periodMonths:300, updateMonths:0, rate:PRIME_BASE+0.25, graceMonths:0, graceType:'none' },
  { id:3, repaymentType:'שפיצר', interestType:'מ"צ', amount:500000, periodMonths:240, updateMonths:60, rate:2.20, graceMonths:0, graceType:'none' },
];

const trackColors_arr = ["#6c63ff", "#4ecdc4", "#ff9f43", "#a855f7", "#38bdf8", "#f472b6"];

export {
  BOI_RATE, PRIME_BASE, ASSUMED_CPI,
  INTEREST_TYPES, REPAYMENT_TYPES, DEFAULT_RATES,
  calcShpitzer, calcShpitzerReverse, genAmortization,
  calcIRR, calcFirstPayment, checkCompliance, getExitPoints,
  calcHealthScore, calcEarlyRepaymentFee, exportAmortCSV, fmt,
  DARK, LIGHT, mkTrack, getNextId, initTracks, trackColors_arr,
};