import React, { useState, useMemo, useCallback } from "react";
import {
  BOI_RATE, PRIME_BASE, ASSUMED_CPI,
  INTEREST_TYPES, REPAYMENT_TYPES, DEFAULT_RATES,
  calcShpitzer, calcShpitzerReverse, genAmortization,
  calcIRR, calcFirstPayment, checkCompliance, getExitPoints,
  calcHealthScore, calcEarlyRepaymentFee, fmt,
  DARK, LIGHT, mkTrack, getNextId, initTracks, emptyInitTracks, trackColors_arr,
} from "./mortgageEngine";
import MortgageTabContent from "./MortgageTabContent";

let _pid = 2;

function MortgageDashboard({ isDark, setIsDark, startEmpty, initialData, onSave }) {
  const K = isDark ? DARK : LIGHT;

  const getInitialState = () => {
    if (initialData) {
      return {
        portfolios: initialData.portfolios || [{ id: 1, name: "תמהיל 1", tracks: emptyInitTracks }],
        income: initialData.income ?? 0,
        propValue: initialData.propValue ?? 0,
        dealType: initialData.dealType || "first",
        otherDebts: initialData.otherDebts ?? 0,
        borrowerAge: initialData.borrowerAge ?? 35,
        numBorrowers: initialData.numBorrowers ?? 2,
        requestType: initialData.requestType || "mortgage",
        requestAmount: initialData.requestAmount ?? 0,
      };
    }
    if (startEmpty) {
      return {
        portfolios: [{ id: 1, name: "תמהיל 1", tracks: emptyInitTracks }],
        income: 0,
        propValue: 0,
        dealType: "first",
        otherDebts: 0,
        borrowerAge: 35,
        numBorrowers: 2,
        requestType: "mortgage",
        requestAmount: 0,
      };
    }
    return {
      portfolios: [{ id: 1, name: "תמהיל 1", tracks: initTracks }],
      income: 22000,
      propValue: 2400000,
      dealType: "first",
      otherDebts: 0,
      borrowerAge: 35,
      numBorrowers: 2,
      requestType: "mortgage",
      requestAmount: 1500000,
    };
  };

  const init = React.useMemo(() => getInitialState(), []);

  const [portfolios, setPortfolios] = useState(init.portfolios);
  const [activeId, setActiveId] = useState(init.portfolios[0]?.id || 1);
  const [tab, setTab] = useState("sim");
  const [income, setIncome] = useState(init.income);
  const [propValue, setPropValue] = useState(init.propValue);
  const [amortView, setAmortView] = useState("yearly");
  const [amortTrack, setAmortTrack] = useState("all");
  const [reverseMode, setReverseMode] = useState("pmt2amount");
  const [revPmt, setRevPmt] = useState(5000);
  const [revRate, setRevRate] = useState(4.5);
  const [revYears, setRevYears] = useState(20);
  const [revIncome, setRevIncome] = useState(22000);
  const [revPti, setRevPti] = useState(35);
  const [revPrice, setRevPrice] = useState(2400000);
  const [revDealType, setRevDealType] = useState("first");
  const [prepYears, setPrepYears] = useState(3);
  const [prepAvgRate, setPrepAvgRate] = useState(4.5);
  const [prepDay, setPrepDay] = useState(20);
  const [editingName, setEditingName] = useState(null);
  const [prepNotice, setPrepNotice] = useState(true);
  const [compareToId, setCompareToId] = useState(null);
  const [tabCompareOpen, setTabCompareOpen] = useState(false);
  const [dealType, setDealType] = useState(init.dealType);
  const [otherDebts, setOtherDebts] = useState(init.otherDebts);
  const [borrowerAge, setBorrowerAge] = useState(init.borrowerAge);
  const [numBorrowers, setNumBorrowers] = useState(init.numBorrowers);
  const [requestType, setRequestType] = useState(init.requestType);
  const [requestAmount, setRequestAmount] = useState(init.requestAmount);
  const [expandedChart, setExpandedChart] = useState(null);

  const inpS = { border:`1px solid ${K.border}`, borderRadius:6, padding:"5px 6px", fontSize:11, background:K.inputBg, fontFamily:"inherit", textAlign:"center", width:"100%", color:K.text, outline:"none" };

  const NI = ({ value, onChange, min=0, max=99999999, step=1000, style:sx={} }) => {
    const [local, setLocal] = useState(String(value));
    const [focused, setFocused] = useState(false);
    if (!focused && local !== String(value)) setLocal(String(value));
    return <input type="number" value={focused ? local : value} min={min} max={max} step={step}
      onChange={e => { setLocal(e.target.value); if (e.target.value !== '' && e.target.value !== '-') { const n = parseFloat(e.target.value); if (!isNaN(n)) onChange(n); } }}
      onFocus={e => { setFocused(true); setLocal(String(value)); e.target.select(); }}
      onBlur={() => { setFocused(false); const n = parseFloat(local); if (!isNaN(n)) onChange(Math.max(min, Math.min(max, n))); else onChange(value); }}
      onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); }}
      style={{ ...inpS, ...sx }} />;
  };

  const AmountInputC = ({ value, onChange, style:sx={} }) => {
    const toFmt = v => { const n=parseInt(String(v).replace(/[^\d]/g,''))||0; return n===0?'':n.toLocaleString("he-IL"); };
    const [txt,setTxt] = useState(toFmt(value));
    const [focused,setFocused] = useState(false);
    if (!focused && txt!==toFmt(value)) setTxt(toFmt(value));
    return <input type="text" value={txt}
      onChange={e=>{ const raw=e.target.value.replace(/[^\d]/g,''); const n=parseInt(raw)||0; setTxt(n===0?'':n.toLocaleString("he-IL")); onChange(n); }}
      onFocus={e=>{setFocused(true);e.target.select()}} onBlur={()=>{setFocused(false);setTxt(toFmt(value))}}
      style={{ ...inpS, ...sx }} />;
  };

  const SectionTitle = ({children, icon}) => (
    <div style={{ background:K.headerBg2, color:isDark?K.goldLight:"#fff", padding:"13px 18px", fontWeight:700, fontSize:14, textAlign:"center", borderRadius:"12px 12px 0 0", borderBottom:`2px solid ${isDark?K.gold+"40":"#ffffff30"}`, letterSpacing:"0.3px" }}>
      {icon && <span style={{marginLeft:8}}>{icon}</span>}{children}
    </div>
  );

  const Pill = ({children, active, onClick}) => (
    <button onClick={onClick} style={{ padding:"6px 16px", border: active?`2px solid ${K.gold}`:`1px solid ${K.border}`, borderRadius:20, background:active?(isDark?`${K.gold}18`:`${K.gold}15`):K.bgCard2, fontSize:11, cursor:"pointer", color:active?(isDark?K.goldLight:K.goldLight):K.textSoft, fontWeight:active?700:400, fontFamily:"inherit", transition:"all .2s" }}>{children}</button>
  );

  const ChartCard = ({ title, sub, children, chartId }) => (
    <div style={{ background:K.cardGrad(), borderRadius:12, padding:"14px 12px 8px", border:`1px solid ${K.border}`, flex:1, display:"flex", flexDirection:"column" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8, direction:"rtl" }}>
        <div style={{ textAlign:"right" }}>
          <span style={{ fontSize:12, fontWeight:700, color:isDark?K.goldLight:K.purple }}>{title}</span>
          {sub && <div style={{ fontSize:9, color:K.textMuted, marginTop:2 }}>{sub}</div>}
        </div>
        {chartId && <button onClick={()=>setExpandedChart({chartId,title,sub})} style={{ background:"none", border:`1px solid ${K.border}`, borderRadius:6, padding:"2px 6px", cursor:"pointer", color:K.textMuted, fontSize:13, lineHeight:1 }}>⛶</button>}
      </div>
      <div style={{ flex:1 }}>{children}</div>
    </div>
  );

  const CTooltipC = ({ active, payload, label, suffix="₪" }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{ background:K.tooltipBg, border:`1px solid ${isDark?K.gold+"40":K.border}`, borderRadius:8, padding:"10px 14px", fontSize:11, boxShadow:`0 4px 20px rgba(0,0,0,${isDark?.5:.15})`, direction:"rtl" }}>
        <div style={{ fontWeight:700, marginBottom:6, color:isDark?K.goldLight:K.purple, fontSize:12 }}>שנה {label}</div>
        {payload.map((p,i)=><div key={i} style={{ display:"flex", justifyContent:"space-between", gap:16, marginBottom:2 }}><span style={{ color:K.textSoft }}>{p.name}:</span><span style={{ fontWeight:700, color:p.color }}>{suffix==="%"?parseFloat(p.value).toFixed(2):fmt(p.value)} {suffix}</span></div>)}
      </div>
    );
  };

  const GaugeChart = ({ score }) => {
    const angle = (score / 100) * 180; const rad = (angle - 180) * Math.PI / 180;
    const nx = 50 + 38 * Math.cos(rad); const ny = 52 + 38 * Math.sin(rad);
    const color = score >= 80 ? K.green : score >= 60 ? K.orange : score >= 40 ? "#ff9800" : K.red;
    const label = score >= 80 ? "מצוין" : score >= 60 ? "טוב" : score >= 40 ? "סביר" : "דורש שיפור";
    return (
      <svg viewBox="0 0 100 62" style={{ width:"100%", maxWidth:180 }}>
        <defs><linearGradient id="gg" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor={K.red}/><stop offset="35%" stopColor={K.orange}/><stop offset="65%" stopColor={K.gold}/><stop offset="100%" stopColor={K.green}/></linearGradient></defs>
        <path d="M 10 52 A 40 40 0 0 1 90 52" fill="none" stroke={K.border} strokeWidth="7" strokeLinecap="round"/>
        <path d="M 10 52 A 40 40 0 0 1 90 52" fill="none" stroke="url(#gg)" strokeWidth="7" strokeLinecap="round" strokeDasharray={`${(score/100)*125.6} 125.6`}/>
        <circle cx={nx} cy={ny} r="4" fill={color} stroke={K.bgCard} strokeWidth="2"/>
        <text x="50" y="44" textAnchor="middle" fontSize="17" fontWeight="800" fill={color}>{score}</text>
        <text x="50" y="58" textAnchor="middle" fontSize="6.5" fill={K.textSoft} fontWeight="600">{label}</text>
      </svg>
    );
  };

  // Expose save data collector
  const getFullState = useCallback(() => ({
    portfolios,
    income,
    propValue,
    dealType,
    otherDebts,
    borrowerAge,
    numBorrowers,
    requestType,
    requestAmount,
  }), [portfolios, income, propValue, dealType, otherDebts, borrowerAge, numBorrowers, requestType, requestAmount]);

  // Store ref for parent to call
  React.useEffect(() => {
    if (onSave) onSave(getFullState);
  }, [getFullState, onSave]);

  const activePortfolio = portfolios.find(p => p.id === activeId) || portfolios[0];
  const tracks = activePortfolio?.tracks || [];
  const setTracks = useCallback((updater) => { setPortfolios(prev => prev.map(p => p.id === activeId ? { ...p, tracks: typeof updater === 'function' ? updater(p.tracks) : updater } : p)); }, [activeId]);
  const updateTrack = useCallback((id, field, val) => { setTracks(prev => prev.map(t => { if (t.id !== id) return t; const u = { ...t, [field]: val }; if (field === 'interestType' && DEFAULT_RATES[val]) { u.rate = DEFAULT_RATES[val]; if (val === 'פריים') u.updateMonths = 0; } return u; })); }, [setTracks]);
  const addTrack = () => setTracks(p => [...p, mkTrack()]);
  const delTrack = id => setTracks(p => p.length > 1 ? p.filter(t => t.id !== id) : p);
  const dupPortfolio = () => { const newId = _pid++; setPortfolios(prev => [...prev, { id: newId, name: "תמהיל " + newId, tracks: tracks.map(t => ({ ...t, id: getNextId() })) }]); setActiveId(newId); };
  const delPortfolio = (pid) => { setPortfolios(prev => { if (prev.length <= 1) return prev; const next = prev.filter(p => p.id !== pid); if (activeId === pid) setActiveId(next[0].id); return next; }); if (compareToId === pid) setCompareToId(null); };
  const addPortfolio = () => { const newId = _pid++; setPortfolios(prev => [...prev, { id: newId, name: "תמהיל " + newId, tracks: [mkTrack()] }]); setActiveId(newId); };

  const totalAmount = tracks.reduce((s, t) => s + t.amount, 0);
  const ltv = propValue > 0 ? totalAmount / propValue : 0;
  const comp = checkCompliance(tracks, totalAmount, income);
  const exitPoints = useMemo(() => getExitPoints(tracks), [tracks]);

  const { yearlyData, totals, metrics, monthlyData } = useMemo(() => {
    if (tracks.length === 0) return { yearlyData: [], totals: { totalPay:0, totI:0, totIdx:0, firstPmt:0, maxPmt:0, maxPmtY:0 }, metrics: { pps:"0", irr:"0", npv:0, wRate:"0", maxY:"0" }, monthlyData: [] };
    const scheds = tracks.map(t => genAmortization(t)); const maxM = Math.max(...tracks.map(t => t.periodMonths)); const maxY = Math.ceil(maxM / 12);
    const yearly = []; let totI = 0, totIdx = 0; const allP = []; const monthly = [];
    for (let mi = 0; mi < maxM; mi++) { let mP=0,mPrin=0,mInt=0,mIdx=0,mBal=0; for (let ti=0;ti<scheds.length;ti++) { if (mi<scheds[ti].length) { const e=scheds[ti][mi]; mP+=e.payment;mPrin+=e.principal;mInt+=e.interest;mIdx+=e.indexation;mBal+=e.balance; } } allP.push(mP); monthly.push({month:mi+1,payment:Math.round(mP),principal:Math.round(mPrin),interest:Math.round(mInt),indexation:Math.round(mIdx),balance:Math.round(mBal)}); }
    for (let y=0;y<maxY;y++) { let yBal=0,yPmt=0,yPrin=0,yInt=0,yIx=0; for (let m=0;m<12;m++) { const mi=y*12+m; if (mi<allP.length) yPmt+=allP[mi]; for (let ti=0;ti<scheds.length;ti++) { if (mi<scheds[ti].length) { yPrin+=scheds[ti][mi].principal;yInt+=scheds[ti][mi].interest;yIx+=scheds[ti][mi].indexation; } } } for (let ti=0;ti<scheds.length;ti++) { const ei=Math.min((y+1)*12-1,scheds[ti].length-1); if (ei>=0) yBal+=scheds[ti][ei].balance; } totI+=yInt;totIdx+=yIx; let wR=0,aB=0; for (let ti=0;ti<tracks.length;ti++) { const li=Math.min((y+1)*12-1,scheds[ti].length-1); if (li>=0&&scheds[ti][li]?.balance>0) { wR+=tracks[ti].rate*scheds[ti][li].balance;aB+=scheds[ti][li].balance; } } wR=aB>0?wR/aB:0; yearly.push({year:y+1,balance:Math.round(yBal),monthlyAvg:Math.round(yPmt/12),principal:Math.round(yPrin),interest:Math.round(yInt),indexation:Math.round(yIx),weightedRate:parseFloat(wR.toFixed(2))}); }
    const totalPay=totI+totIdx+totalAmount; const irr=allP.length>0?calcIRR(totalAmount,allP):0; let npv=-totalAmount; const mr=5/100/12; for (let i=0;i<allP.length;i++) npv+=allP[i]/Math.pow(1+mr,i+1); const maxPmt=allP.length>0?Math.max(...allP):0; const maxPmtY=allP.length>0?Math.ceil((allP.indexOf(maxPmt)+1)/12):0;
    return { yearlyData:yearly, monthlyData:monthly, totals:{totalPay:Math.round(totalPay),totI:Math.round(totI),totIdx:Math.round(totIdx),firstPmt:Math.round(comp.firstPmt),maxPmt:Math.round(maxPmt),maxPmtY}, metrics:{pps:totalAmount>0?(totalPay/totalAmount).toFixed(2):"0",irr:irr.toFixed(2),npv:Math.round(npv),wRate:(tracks.reduce((s,t)=>s+t.rate*t.amount/totalAmount,0)).toFixed(2),maxY:(Math.max(...tracks.map(t=>t.periodMonths))/12).toFixed(1)} };
  }, [tracks, totalAmount, comp.firstPmt]);

  const cmpPortfolio = compareToId ? portfolios.find(p => p.id === compareToId) : null;
  const cmpName = cmpPortfolio?.name || "";
  const chartData = useMemo(() => {
    if (!cmpPortfolio) return yearlyData;
    const bt = cmpPortfolio.tracks; if (!bt.length) return yearlyData;
    const scheds = bt.map(t => genAmortization(t)); const maxM = Math.max(...bt.map(t => t.periodMonths)); const maxY = Math.ceil(maxM / 12);
    const bYearly = []; 
    for (let y = 0; y < maxY; y++) {
      let yBal=0,yPmt=0,yPrin=0,yInt=0,yIx=0;
      for (let m=0;m<12;m++) { const mi=y*12+m; for (let ti=0;ti<scheds.length;ti++) { if (mi<scheds[ti].length) { yPmt+=scheds[ti][mi].payment; yPrin+=scheds[ti][mi].principal; yInt+=scheds[ti][mi].interest; yIx+=scheds[ti][mi].indexation; } } }
      for (let ti=0;ti<scheds.length;ti++) { const ei=Math.min((y+1)*12-1,scheds[ti].length-1); if (ei>=0) yBal+=scheds[ti][ei].balance; }
      let wR=0,aB=0; for (let ti=0;ti<bt.length;ti++) { const li=Math.min((y+1)*12-1,scheds[ti].length-1); if (li>=0&&scheds[ti][li]?.balance>0) { wR+=bt[ti].rate*scheds[ti][li].balance; aB+=scheds[ti][li].balance; } } wR=aB>0?wR/aB:0;
      bYearly.push({year:y+1, balance_b:Math.round(yBal), monthlyAvg_b:Math.round(yPmt/12), principal_b:Math.round(yPrin), interest_b:Math.round(yInt), indexation_b:Math.round(yIx), weightedRate_b:parseFloat(wR.toFixed(2)), total_b:Math.round(yPrin+yInt+yIx)});
    }
    const maxLen = Math.max(yearlyData.length, bYearly.length);
    const merged = [];
    for (let i = 0; i < maxLen; i++) {
      merged.push({ ...(yearlyData[i] || {year:i+1,balance:0,monthlyAvg:0,principal:0,interest:0,indexation:0,weightedRate:0}), ...(bYearly[i] || {}) });
    }
    return merged;
  }, [yearlyData, cmpPortfolio]);

  const stressData = useMemo(() => {
    if (tracks.length === 0) return { rate: [], cpi: [] };
    const rateScenarios = [{ name:"בסיס",boi:BOI_RATE,color:K.teal },{ name:"ריבית +1%",boi:BOI_RATE+1,color:K.orange },{ name:"ריבית +2%",boi:BOI_RATE+2,color:K.red },{ name:"ריבית +3%",boi:BOI_RATE+3,color:"#ff1744" },{ name:"שיפור -1%",boi:BOI_RATE-1,color:K.green }];
    const cpiScenarios = [{ name:"מדד 2.5%",cpi:2.5,color:K.teal },{ name:"מדד 4.0%",cpi:4.0,color:K.orange },{ name:"מדד 6.0%",cpi:6.0,color:K.red }];
    const rate = rateScenarios.map(sc => { const fp=tracks.reduce((s,t)=>s+calcFirstPayment(t,ASSUMED_CPI,sc.boi),0); const scheds=tracks.map(t=>genAmortization(t,ASSUMED_CPI,sc.boi)); const maxM=Math.max(...tracks.map(t=>t.periodMonths)); let totalPay=0,maxPmt=0; for (let mi=0;mi<maxM;mi++) { let mP=0; for (let ti=0;ti<scheds.length;ti++) { if (mi<scheds[ti].length) mP+=scheds[ti][mi].payment; } totalPay+=mP; if (mP>maxPmt) maxPmt=mP; } const pti=income>0?fp/income:1; return {...sc,firstPmt:Math.round(fp),maxPmt:Math.round(maxPmt),totalPay:Math.round(totalPay),pti}; });
    const cpi = cpiScenarios.map(sc => { const scheds=tracks.map(t=>genAmortization(t,sc.cpi,BOI_RATE)); const maxM=Math.max(...tracks.map(t=>t.periodMonths)); let totalPay=0,totalIdx=0; for (let mi=0;mi<maxM;mi++) { for (let ti=0;ti<scheds.length;ti++) { if (mi<scheds[ti].length) { totalPay+=scheds[ti][mi].payment; totalIdx+=scheds[ti][mi].indexation; } } } return {...sc,totalPay:Math.round(totalPay),totalIdx:Math.round(totalIdx),pps:totalAmount>0?(totalPay/totalAmount).toFixed(2):"0"}; });
    return { rate, cpi };
  }, [tracks, income, totalAmount, K]);

  const baseFP = stressData.rate.length > 0 ? stressData.rate[0].firstPmt : 0;
  const health = useMemo(() => calcHealthScore(tracks, income, propValue, totalAmount, metrics.pps, comp), [tracks, income, propValue, totalAmount, metrics.pps, comp]);

  const comparisonData = useMemo(() => portfolios.map(p => {
    const t=p.tracks; const ta=t.reduce((s,tr)=>s+tr.amount,0); const c=checkCompliance(t,ta,income);
    const scheds=t.map(tr=>genAmortization(tr)); const maxM=t.length>0?Math.max(...t.map(tr=>tr.periodMonths)):0;
    let totI=0,totIdx=0; const allP=[]; let maxPmt=0,maxPmtY=0;
    for(let mi=0;mi<maxM;mi++){let mP=0;for(let ti=0;ti<scheds.length;ti++){if(mi<scheds[ti].length){mP+=scheds[ti][mi].payment;totI+=scheds[ti][mi].interest;totIdx+=scheds[ti][mi].indexation;}}allP.push(mP);if(mP>maxPmt){maxPmt=mP;maxPmtY=Math.ceil((mi+1)/12);}}
    const totalPay=totI+totIdx+ta; const pps=ta>0?(totalPay/ta).toFixed(2):"0"; const wRate=ta>0?t.reduce((s,tr)=>s+tr.rate*tr.amount/ta,0).toFixed(2):"0"; const irr=allP.length>0?calcIRR(ta,allP).toFixed(2):"0"; const npv=ta>0?allP.reduce((s,v,i)=>s+v/Math.pow(1+0.05/12,i+1),0)-ta:0; const h=calcHealthScore(t,income,propValue,ta,pps,c);
    return{id:p.id,name:p.name,totalAmount:ta,tracks:t.length,wRate,firstPmt:Math.round(c.firstPmt),pti:c.pti,totalPay:Math.round(totalPay),totI:Math.round(totI),totIdx:Math.round(totIdx),pps,fixedR:c.fixedR,health:h.score,maxY:t.length>0?Math.max(...t.map(tr=>tr.periodMonths/12)):0,maxPmt:Math.round(maxPmt),maxPmtY,irr,npv:Math.round(npv)};
  }), [portfolios, income, propValue]);

  const mergedRows = [
    {label:"סכום הלוואה",color:isDark?K.goldLight:K.purple,key:"totalAmount",fmtV:v=>"₪ "+fmt(v),best:"min"},
    {label:"שווי נכס",color:K.sky,keyFn:()=>"₪ "+fmt(propValue)},
    {label:"LTV",color:ltv<=0.75?K.green:K.red,keyFn:p=>(p.totalAmount/propValue*100).toFixed(1)+"%"},
    {label:"מסלולים",color:K.teal,key:"tracks",fmtV:v=>String(v)},
    {label:"תקופה",color:K.teal,key:"maxY",fmtV:v=>parseFloat(v).toFixed(1)+" שנה",best:"min"},
    {label:"ריבית משוקללת",color:K.amber,key:"wRate",fmtV:v=>v+"%",best:"min"},
    {label:"החזר ראשון",color:K.emerald,key:"firstPmt",fmtV:v=>"₪ "+fmt(v),best:"min"},
    {label:"PTI",color:comp.ptiOk?K.green:K.red,key:"pti",fmtV:v=>(v*100).toFixed(1)+"%",best:"min"},
    {label:"עלות כוללת",color:isDark?K.goldLight:K.purple,key:"totalPay",fmtV:v=>"₪ "+fmt(v),best:"min"},
    {label:"תשלומי ריבית",color:K.coral,key:"totI",fmtV:v=>"₪ "+fmt(v),best:"min"},
    {label:"תשלומי הצמדה",color:K.orange,key:"totIdx",fmtV:v=>"₪ "+fmt(v),best:"min"},
    {label:"% קבועה",color:K.sky,key:"fixedR",fmtV:v=>(v*100).toFixed(0)+"%"},
    {label:"החזר שיא",color:K.pink,keyFn:p=>"₪ "+fmt(p.maxPmt)+" (שנה "+p.maxPmtY+")"},
    {label:"החזר לשקל",color:K.purple,key:"pps",fmtV:v=>v,best:"min"},
    {label:'שת"פ (IRR)',color:K.violet,key:"irr",fmtV:v=>v+"%",best:"max"},
    {label:'ענ"נ (NPV)',color:K.sky,key:"npv",fmtV:v=>"₪ "+fmt(v),best:"max"},
    {label:"ציון בריאות",color:health.score>=80?K.green:health.score>=60?K.amber:K.red,key:"health",fmtV:v=>String(v),best:"max"},
  ];

  const maxLtv = dealType==="first"?0.75:dealType==="upgrade"?0.70:0.50;
  const equity = Math.max(0, propValue - totalAmount);
  const maxPeriodYears = Math.max(0, 75 - borrowerAge);
  const maxPeriodMonths = maxPeriodYears * 12;
  const currentMaxY = tracks.length > 0 ? Math.max(...tracks.map(t => t.periodMonths)) : 0;
  const periodOk = currentMaxY <= maxPeriodMonths && currentMaxY <= 360;
  const freeIncomeBeforeMortgage = Math.max(0, income - otherDebts);
  const ptiFromFree = freeIncomeBeforeMortgage > 0 ? totals.firstPmt / freeIncomeBeforeMortgage : 1;
  const ptiPerBorrower = (income / numBorrowers) > 0 ? totals.firstPmt / (income / numBorrowers) : 1;
  const debtBurden = income > 0 ? (totals.firstPmt + otherDebts) / income : 1;
  const ltvOk = ltv <= maxLtv;

  const profileRows = [
    {label:"סה״כ הכנסות",color:isDark?K.goldLight:K.purple,input:true,el:<AmountInputC value={income} onChange={setIncome} style={{width:80,fontSize:10}}/>},
    {label:"סה״כ התחייבויות קיימות",val:"₪ "+fmt(otherDebts),color:otherDebts>0?K.orange:K.textMuted,input:true,el:<AmountInputC value={otherDebts} onChange={setOtherDebts} style={{width:80,fontSize:10}}/>},
    {label:"סה״כ הכנסה פנויה",val:"₪ "+fmt(freeIncomeBeforeMortgage),color:freeIncomeBeforeMortgage>0?K.green:K.red},
    {label:"יחס החזר מהכנסה פנויה",val:(ptiFromFree*100).toFixed(1)+"%",color:ptiFromFree<=0.33?K.green:ptiFromFree<=0.4?K.amber:ptiFromFree<=0.5?K.orange:K.red},
    {label:"PTI לפי לווה",val:(ptiPerBorrower*100).toFixed(1)+"%",color:ptiPerBorrower<=0.33?K.green:ptiPerBorrower<=0.4?K.amber:ptiPerBorrower<=0.5?K.orange:K.red},
    {label:"עומס חוב",val:(debtBurden*100).toFixed(1)+"%",color:debtBurden<=0.33?K.green:debtBurden<=0.4?K.amber:debtBurden<=0.5?K.orange:K.red},
    {sep:true},
    {label:"סוג עסקה",color:K.sky,input:true,el:<select value={dealType} onChange={e=>setDealType(e.target.value)} style={{...inpS,width:90,cursor:"pointer",fontSize:10}}><option value="first">דירה ראשונה</option><option value="upgrade">דירה חליפית</option><option value="invest">השקעה</option></select>},
    {label:"מספר לווים",color:K.teal,input:true,el:<NI value={numBorrowers} onChange={setNumBorrowers} min={1} max={4} step={1} style={{width:44}}/>},
    {label:"גיל לווה",color:K.purple,input:true,el:<NI value={borrowerAge} onChange={setBorrowerAge} min={18} max={75} step={1} style={{width:44}}/>},
    {label:"תקופה מקסימלית",val:maxPeriodYears+" שנה",color:periodOk?K.green:K.red},
    {label:"LTV מקסימלי",val:(maxLtv*100)+"%",color:K.sky},
    {label:"שווי נכס",color:K.sky,input:true,el:<AmountInputC value={propValue} onChange={setPropValue} style={{width:80,fontSize:10}}/>},
    {label:"LTV בפועל",val:(ltv*100).toFixed(1)+"%",color:ltvOk?K.green:K.red},
    {label:"הון עצמי",val:"₪ "+fmt(equity),color:equity>0?K.emerald:K.red},
    {label:"סטטוס LTV",val:ltvOk?"✓ תקין":"✗ חריגה!",color:ltvOk?K.green:K.red},
  ];

  const requestRows = [
    {label:"סוג בקשה",color:K.sky,input:true,el:<select value={requestType} onChange={e=>setRequestType(e.target.value)} style={{...inpS,width:90,cursor:"pointer",fontSize:10}}><option value="mortgage">משכנתא</option><option value="loan">הלוואה</option></select>},
    {label:"סכום בקשה",color:isDark?K.goldLight:K.purple,input:true,el:<AmountInputC value={requestAmount} onChange={setRequestAmount} style={{width:80,fontSize:10}}/>},
    ...(requestAmount>0&&totalAmount!==requestAmount?[{label:"הפרש",val:(totalAmount>requestAmount?"+":"")+"₪ "+fmt(totalAmount-requestAmount),color:K.orange}]:[]),
  ];

  const summCards = [
    {label:"החזר ראשון",value:"₪ "+fmt(totals.firstPmt),ok:true,color:K.teal},{label:"הכנסה פנויה",value:"₪ "+fmt(Math.max(0,income-totals.firstPmt)),ok:comp.ptiOk,color:K.green},{label:"ריבית + הצמדה",value:"₪ "+fmt((totals.totI||0)+(totals.totIdx||0)),ok:true,color:K.coral},{label:"עלות כוללת",value:"₪ "+fmt(totals.totalPay),ok:true,color:K.gold},{label:"החזר לשקל",value:metrics.pps,ok:parseFloat(metrics.pps||0)<1.8,color:K.sky},{label:'שת"פ (IRR)',value:metrics.irr+"%",ok:true,color:K.violet},
  ];

  const COL = "34px 52px 90px 80px 74px 46px 46px 54px 58px 58px 46px 82px";
  const tabsDef = [{id:"profile",l:"פרופיל",icon:"👤"},{id:"sim",l:"סימולציה",icon:"📊"},{id:"financial",l:"נתונים כלכליים",icon:"💹"},{id:"stress",l:"Stress Test",icon:"⚡"},{id:"amort",l:"לוח סילוקין",icon:"📋"},{id:"prepay",l:"פירעון מוקדם",icon:"💰"},{id:"reverse",l:"מחשבון הפוך",icon:"🔄"}];

  const costDonutData = useMemo(() => {
    if (tracks.length === 0) return [];
    return tracks.map((t, i) => { const sched = genAmortization(t); const totI = sched.reduce((s, r) => s + r.interest + r.indexation, 0); return [{ name: t.interestType + " קרן", value: t.amount, color: trackColors_arr[i % trackColors_arr.length] },{ name: t.interestType + " ריבית", value: Math.round(totI), color: trackColors_arr[i % trackColors_arr.length] + "80" }]; }).flat();
  }, [tracks]);

  const effData = useMemo(() => {
    return tracks.map((t, i) => { const sched = genAmortization(t); const totI = sched.reduce((s, r) => s + r.interest + r.indexation, 0); const annualCost = (totI) / t.amount / (t.periodMonths / 12) * 100; return { name: t.interestType, עלות_כוללת_pct: parseFloat((totI / t.amount * 100).toFixed(1)), עלות_שנתית_pct: parseFloat(annualCost.toFixed(2)), color: trackColors_arr[i % trackColors_arr.length] }; });
  }, [tracks]);

  const reverseResult = useMemo(() => {
    if (reverseMode==="pmt2amount") return {amount:Math.round(calcShpitzerReverse(revPmt,revRate,revYears*12)),label:"סכום מקסימלי"};
    else if (reverseMode==="income2amount") { const mx=revIncome*(revPti/100); return {amount:Math.round(calcShpitzerReverse(mx,revRate,revYears*12)),maxPmt:Math.round(mx),label:"סכום מקסימלי לפי הכנסה"}; }
    else { const ml=revDealType==="first"?0.75:revDealType==="upgrade"?0.70:0.50; const mxL=Math.round(revPrice*ml); return {amount:mxL,equity:Math.round(revPrice-mxL),maxLtv:ml,label:"סכום מקסימלי / הון עצמי"}; }
  }, [reverseMode, revPmt, revRate, revYears, revIncome, revPti, revPrice, revDealType]);

  const prepAllFees = useMemo(() => {
    if (tracks.length===0) return [];
    return tracks.map(t => { const sched=genAmortization(t); const mi=Math.min(prepYears*12-1,sched.length-1); const balance=mi>=0?sched[mi].balance:t.amount; return {...calcEarlyRepaymentFee(t,Math.round(balance),prepYears,prepAvgRate,prepDay,prepNotice),balance:Math.round(balance),track:t}; });
  }, [tracks, prepYears, prepAvgRate, prepDay, prepNotice]);

  const exitYears = useMemo(() => { const s=new Set(); exitPoints.forEach(ep=>s.add(ep.year)); return Array.from(s).sort((a,b)=>a-b); }, [exitPoints]);

  const accent = isDark ? K.goldLight : K.purple;
  const accent2 = isDark ? K.gold : K.purple;

  return (
    <div style={{ fontFamily:"'Segoe UI',Tahoma,sans-serif", direction:"rtl", background:K.bg, minHeight:"100vh", color:K.text, fontSize:13, transition:"background .3s, color .3s" }}>
      <style>{`
        input[type=number]::-webkit-inner-spin-button,input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}
        input[type=number]{-moz-appearance:textfield;}
        .tbl-row:hover{background:${K.bgHover} !important}
        .stress-row:hover{background:${K.bgHover} !important}
        input:focus,select:focus{border-color:${accent2} !important;box-shadow:0 0 0 2px ${accent2}30 !important}
        select{color:${K.text};background:${K.selectBg}}
        option{background:${K.selectBg};color:${K.text}}
        ::-webkit-scrollbar{width:6px;height:6px}
        ::-webkit-scrollbar-track{background:${K.scrollTrack}}
        ::-webkit-scrollbar-thumb{background:${K.scrollThumb};border-radius:3px}
        ::-webkit-scrollbar-thumb:hover{background:${accent2}60}
      `}</style>

      {/* PORTFOLIO TABS */}
      <div style={{ display:"flex", alignItems:"flex-end", margin:"14px 16px 0", gap:3 }}>
        {portfolios.map(p => (
          <div key={p.id} onClick={()=>setActiveId(p.id)} style={{ padding:"9px 22px", display:"flex", alignItems:"center", gap:6, fontSize:12, cursor:"pointer", color:p.id===activeId?accent:K.textMuted, fontWeight:p.id===activeId?700:400, background:p.id===activeId?K.bgCard:K.bgCard2, borderRadius:"10px 10px 0 0", border:p.id===activeId?`1px solid ${K.border}`:`1px solid transparent`, borderBottom:p.id===activeId?`1px solid ${K.bgCard}`:`1px solid ${K.border}`, marginBottom:-1, position:"relative", zIndex:p.id===activeId?2:1 }}>
            {editingName === p.id ? (
              <input autoFocus defaultValue={p.name}
                onBlur={e => { setPortfolios(prev => prev.map(pp => pp.id === p.id ? {...pp, name: e.target.value || p.name} : pp)); setEditingName(null); }}
                onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); }}
                onClick={e => e.stopPropagation()}
                style={{ border:"none", background:"transparent", outline:"none", fontSize:12, fontWeight:700, width:80, textAlign:"center", borderBottom:`1.5px solid ${accent2}`, fontFamily:"inherit", color:accent }} />
            ) : (
              <span onDoubleClick={(e) => { e.stopPropagation(); setEditingName(p.id); }}>{p.name}</span>
            )}
            {portfolios.length > 1 && <span onClick={e=>{e.stopPropagation();delPortfolio(p.id)}} style={{ fontSize:11, color:K.textMuted, marginRight:6, cursor:"pointer" }}>×</span>}
          </div>
        ))}
        <div onClick={addPortfolio} style={{ padding:"9px 14px", fontSize:13, cursor:"pointer", color:K.textMuted, background:K.bgCard2, borderRadius:"10px 10px 0 0", marginBottom:-1 }}>+</div>
        <div onClick={dupPortfolio} style={{ padding:"9px 14px", fontSize:11, cursor:"pointer", color:K.textMuted, background:K.bgCard2, borderRadius:"10px 10px 0 0", marginBottom:-1 }}>שכפול</div>
        {portfolios.length > 1 && (
          <div onClick={()=>{ const next=!tabCompareOpen; setTabCompareOpen(next); if(next){ const other=portfolios.find(p=>p.id!==activeId); if(other) setCompareToId(other.id); } else { setCompareToId(null); } }} style={{ padding:"9px 14px", fontSize:11, cursor:"pointer", color:tabCompareOpen?K.green:K.violet, background:tabCompareOpen?`${K.green}15`:K.bgCard2, borderRadius:"10px 10px 0 0", fontWeight:tabCompareOpen?700:400, border:tabCompareOpen?`1px solid ${K.green}35`:"none", display:"flex", alignItems:"center", gap:4, marginBottom:-1 }}>
            ⚖️ {tabCompareOpen ? "סגור השוואה" : "השוואה"}
          </div>
        )}
      </div>

      {/* TABLE HEADER */}
      <div style={{ display:"grid", gridTemplateColumns:COL, background:K.headerBg2, color:isDark?K.goldLight:"#fff", fontSize:9.5, fontWeight:600, margin:"0 16px", padding:"0 4px", minHeight:38, alignItems:"center", borderTop:`1px solid ${K.border}`, borderBottom:`2px solid ${isDark?K.gold+"25":K.purple+"30"}` }}>
        {["","משקל","סכום","לוח סילוקין","סוג ריבית",null,null,"עדכון\n(חודשים)","ריבית %","עוגן","גרייס","החזר ראשון"].map((h,i)=>{
          if (i===5) return <div key={i} style={{ padding:"8px 2px", textAlign:"center", borderLeft:`1px solid ${isDark?K.gold+"10":"#ffffff15"}`, lineHeight:1.25, display:"flex", flexDirection:"column", justifyContent:"space-between", height:"100%" }}>
            <div style={{ fontSize:8, color:isDark?K.goldLight+"90":K.purple+"90", fontWeight:700 }}>תקופה</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:0 }}>
              <div style={{ fontSize:8.5, borderTop:`1px solid ${isDark?K.gold+"20":"#ffffff20"}`, padding:"3px 1px", textAlign:"center" }}>חודשים</div>
              <div style={{ fontSize:8.5, borderTop:`1px solid ${isDark?K.gold+"20":"#ffffff20"}`, borderRight:`1px solid ${isDark?K.gold+"10":"#ffffff15"}`, padding:"3px 1px", textAlign:"center" }}>שנים</div>
            </div>
          </div>;
          if (i===6) return null;
          return <div key={i} style={{ padding:"8px 2px", textAlign:"center", borderLeft:i>0?`1px solid ${isDark?K.gold+"10":"#ffffff15"}`:"none", lineHeight:1.25, whiteSpace:"pre-line" }}>{h}</div>;
        })}
      </div>

      {/* TABLE BODY */}
      <div style={{ margin:"0 16px", borderRadius:"0 0 10px 10px", overflow:"hidden", boxShadow:`0 4px 24px rgba(0,0,0,${isDark?.35:.08})`, background:K.bgCard }}>
        {tracks.map((t,i) => {
          const meta = INTEREST_TYPES[t.interestType]; const fp = calcFirstPayment(t); const w = totalAmount>0?t.amount/totalAmount:0;
          const cs = { padding:"6px 2px", textAlign:"center", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, minHeight:44 };
          const sl = { ...inpS, cursor:"pointer" }; const tc = trackColors_arr[i % trackColors_arr.length];
          return (
            <div key={t.id} className="tbl-row" style={{ display:"grid", gridTemplateColumns:COL, background:i%2?K.bgCard2:K.bgCard, borderBottom:`1px solid ${K.border}`, padding:"0 4px", alignItems:"center", borderRight:`3px solid ${tc}` }}>
              <div style={cs}><div onClick={()=>delTrack(t.id)} style={{ background:`${K.red}20`, borderRadius:"50%", width:24, height:24, position:"relative", cursor:"pointer", border:`1px solid ${K.red}40` }}><span style={{ position:"absolute", top:"50%", left:"50%", transform:"translate(-50%,-50%)", color:K.red, fontSize:14, lineHeight:1 }}>×</span></div></div>
              <div style={{ ...cs, fontWeight:600 }}><div style={{ position:"relative", maxWidth:46 }}><NI value={parseFloat((w*100).toFixed(1))} onChange={v=>{ const pct=Math.max(0,Math.min(99.9,v))/100; const ot=totalAmount-t.amount; const na=ot>0?Math.round(pct*ot/(1-pct)):t.amount; updateTrack(t.id,'amount',na); }} min={0} max={100} step={1} style={{ maxWidth:46, paddingLeft:14 }} /><span style={{ position:"absolute", left:4, top:"50%", transform:"translateY(-50%)", fontSize:10, color:K.textMuted, pointerEvents:"none" }}>%</span></div></div>
              <div style={cs}><AmountInputC value={t.amount} onChange={v=>updateTrack(t.id,'amount',v)} style={{ fontWeight:700, fontSize:11, maxWidth:82 }} /></div>
              <div style={cs}><select value={t.repaymentType} onChange={e=>updateTrack(t.id,'repaymentType',e.target.value)} style={{ ...sl, maxWidth:74 }}>{REPAYMENT_TYPES.map(r=><option key={r}>{r}</option>)}</select></div>
              <div style={cs}><select value={t.interestType} onChange={e=>updateTrack(t.id,'interestType',e.target.value)} style={{ ...sl, maxWidth:68 }}>{Object.keys(INTEREST_TYPES).map(k=><option key={k}>{k}</option>)}</select></div>
              <div style={cs}><NI value={t.periodMonths} onChange={v=>updateTrack(t.id,'periodMonths',Math.round(Math.max(1,Math.min(360,v))))} min={1} max={360} step={1} style={{ maxWidth:40 }} /></div>
              <div style={cs}><NI value={parseFloat((t.periodMonths/12).toFixed(2))} onChange={v=>updateTrack(t.id,'periodMonths',Math.round(v*12))} min={1} max={30} step={0.5} style={{ maxWidth:40 }} /></div>
              <div style={cs}>{meta?.fixed?<span style={{ color:K.textMuted }}>—</span>:<NI value={t.updateMonths} onChange={v=>updateTrack(t.id,'updateMonths',v)} min={0} max={120} step={12} style={{ maxWidth:44 }} />}</div>
              <div style={cs}><NI value={t.rate} onChange={v=>updateTrack(t.id,'rate',v)} min={0} max={15} step={0.05} style={{ maxWidth:50, fontWeight:700, color:t.rate>5?K.red:t.rate<3?K.green:accent }} /></div>
              <div style={{ ...cs, fontSize:8.5, color:K.textMuted }}>{meta?.anchor}</div>
              <div style={cs}><NI value={t.graceMonths} onChange={v=>updateTrack(t.id,'graceMonths',v)} min={0} max={60} step={1} style={{ maxWidth:38 }} /></div>
              <div style={{ ...cs, fontWeight:700, color:accent, fontSize:11 }}>₪ {fmt(fp)}</div>
            </div>
          );
        })}
        <div onClick={addTrack} style={{ display:"flex", alignItems:"center", padding:"9px 10px", cursor:"pointer", borderTop:`1px dashed ${K.border}` }}>
          <div style={{ width:24, height:24, borderRadius:"50%", background:`${accent2}20`, position:"relative", cursor:"pointer", marginLeft:8, border:`1.5px solid ${accent2}40` }}><span style={{ position:"absolute", top:"50%", left:"50%", transform:"translate(-50%,-50%)", color:accent, fontSize:14, lineHeight:1 }}>+</span></div>
          <span style={{ fontSize:11, color:K.textMuted }}>הוסף מסלול</span>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:COL, background:K.totalBg, borderTop:`2px solid ${accent2}40`, padding:"0 4px", alignItems:"center" }}>
          <div style={{ padding:"10px 2px", textAlign:"center", fontSize:11, fontWeight:700, color:accent }}>סה״כ</div>
          <div style={{ padding:"10px 2px", textAlign:"center", fontSize:11, fontWeight:600, color:K.textSoft }}>100%</div>
          <div style={{ padding:"10px 2px", textAlign:"center", fontSize:12, fontWeight:800, color:accent }}>₪ {fmt(totalAmount)}</div>
          <div style={{ padding:"10px 2px", textAlign:"center", fontSize:10, color:K.textMuted }}>{tracks.length} מסלולים</div>
          <div></div><div></div>
          <div style={{ padding:"10px 2px", textAlign:"center", fontSize:11, fontWeight:700, color:K.teal }}>{totalAmount>0?(tracks.reduce((s,t)=>s+(t.periodMonths/12)*t.amount,0)/totalAmount).toFixed(1):0}</div>
          <div></div>
          <div style={{ padding:"10px 2px", textAlign:"center", fontSize:11, fontWeight:700, color:K.amber }}>{metrics.wRate}%</div>
          <div></div><div></div>
          <div style={{ padding:"10px 2px", textAlign:"center", fontSize:12, fontWeight:800, color:accent }}>₪ {fmt(totals.firstPmt)}</div>
        </div>
      </div>

      {/* INLINE COMPARE PANEL */}
      {compareToId && (() => {
        const a = comparisonData.find(d=>d.id===activeId);
        const b = comparisonData.find(d=>d.id===compareToId);
        if (!a || !b) return null;
        const rows = [
          {label:"סכום",va:a.totalAmount,vb:b.totalAmount,fmt:v=>"₪ "+fmt(v),best:"min"},
          {label:"ריבית משוקללת",va:parseFloat(a.wRate),vb:parseFloat(b.wRate),fmt:v=>v.toFixed?v.toFixed(2)+"%":v+"%",best:"min"},
          {label:"החזר ראשון",va:a.firstPmt,vb:b.firstPmt,fmt:v=>"₪ "+fmt(v),best:"min"},
          {label:"PTI",va:a.pti,vb:b.pti,fmt:v=>(v*100).toFixed(1)+"%",best:"min"},
          {label:"עלות כוללת",va:a.totalPay,vb:b.totalPay,fmt:v=>"₪ "+fmt(v),best:"min"},
          {label:"החזר לשקל",va:parseFloat(a.pps),vb:parseFloat(b.pps),fmt:v=>v.toFixed(2),best:"min"},
          {label:"% קבועה",va:a.fixedR,vb:b.fixedR,fmt:v=>(v*100).toFixed(0)+"%",best:null},
          {label:"ציון בריאות",va:a.health,vb:b.health,fmt:v=>v,best:"max"},
        ];
        return (
          <div style={{ margin:"10px 16px 0", background:K.cardGrad(), borderRadius:12, border:`1px solid ${K.violet}30`, overflow:"hidden" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 16px", background:`${K.violet}12`, borderBottom:`1px solid ${K.violet}20` }}>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}><span style={{ fontSize:14 }}>⚖️</span><span style={{ fontSize:12, fontWeight:700, color:K.violet }}>השוואה מהירה</span></div>
              <div style={{ display:"flex", alignItems:"center", gap:16, fontSize:11 }}><span style={{ fontWeight:700, color:K.teal }}>{a.name}</span><span style={{ color:K.textMuted }}>vs</span><span style={{ fontWeight:700, color:K.amber }}>{b.name}</span></div>
              <span onClick={()=>setCompareToId(null)} style={{ fontSize:14, cursor:"pointer", color:K.textMuted, padding:"2px 6px" }}>×</span>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:`repeat(${rows.length}, 1fr)`, gap:0 }}>
              {rows.map((r,i) => {
                const aWin = r.best==="min"?r.va<r.vb:r.best==="max"?r.va>r.vb:false;
                const bWin = r.best==="min"?r.vb<r.va:r.best==="max"?r.vb>r.va:false;
                const tie = r.va===r.vb;
                return (
                  <div key={i} style={{ borderLeft:i>0?`1px solid ${K.border}`:"none", padding:"10px 6px", textAlign:"center" }}>
                    <div style={{ fontSize:9, color:K.textMuted, marginBottom:6, fontWeight:600 }}>{r.label}</div>
                    <div style={{ fontSize:12, fontWeight:700, color:aWin?K.green:tie?K.text:bWin?K.textSoft:K.text, marginBottom:2 }}>{r.fmt(r.va)} {aWin&&!tie?"✓":""}</div>
                    <div style={{ width:20, height:1, background:K.border, margin:"3px auto" }}/>
                    <div style={{ fontSize:12, fontWeight:700, color:bWin?K.green:tie?K.text:aWin?K.textSoft:K.text, marginTop:2 }}>{r.fmt(r.vb)} {bWin&&!tie?"✓":""}</div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* TABS */}
      <div style={{ display:"flex", justifyContent:"flex-end", margin:"18px 16px 0", gap:3 }}>
        {tabsDef.map(t=><button key={t.id} onClick={()=>setTab(t.id)} style={{ padding:"10px 18px", border:"none", fontFamily:"inherit", background:tab===t.id?K.bgCard:"transparent", color:tab===t.id?accent:K.textMuted, fontWeight:tab===t.id?700:400, fontSize:12, borderRadius:"10px 10px 0 0", cursor:"pointer", boxShadow:tab===t.id?`0 -2px 12px rgba(0,0,0,${isDark?.25:.06})`:"none", borderTop:tab===t.id?`2px solid ${accent2}`:"2px solid transparent", transition:"all .2s" }}><span style={{ marginLeft:4 }}>{t.icon}</span>{t.l}</button>)}
      </div>

      {/* TAB CONTENT */}
      <MortgageTabContent ctx={{
        tab, K, isDark, accent, accent2,
        tracks, totalAmount, income, propValue, ltv, comp, inpS,
        NI, AmountInputC, SectionTitle, Pill, ChartCard, CTooltipC, GaugeChart,
        summCards, comparisonData, activeId, mergedRows, tabCompareOpen, compareToId,
        chartData, cmpName, health, costDonutData, effData,
        expandedChart, setExpandedChart,
        requestRows, profileRows,
        stressData, baseFP,
        amortView, setAmortView, amortTrack, setAmortTrack,
        monthlyData, yearlyData, totals, metrics, exitYears,
        prepYears, setPrepYears, prepAvgRate, setPrepAvgRate,
        prepDay, setPrepDay, prepNotice, setPrepNotice, prepAllFees,
        reverseMode, setReverseMode, revPmt, setRevPmt, revRate, setRevRate,
        revYears, setRevYears, revIncome, setRevIncome, revPti, setRevPti,
        revPrice, setRevPrice, revDealType, setRevDealType, reverseResult,
        portfolios, activePortfolio,
        setTracks, setTab,
      }} />
    </div>
  );
}

export default MortgageDashboard;