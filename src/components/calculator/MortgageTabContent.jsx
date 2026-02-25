import React from "react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, AreaChart, Area, ReferenceLine, ComposedChart,
  PieChart, Pie, Cell,
} from "recharts";
import { genAmortization, exportAmortCSV, fmt, calcFirstPayment, BOI_RATE, PRIME_BASE, ASSUMED_CPI, trackColors_arr, INTEREST_TYPES, mkTrack } from "./mortgageEngine";
import { User, X } from "lucide-react";

export default function MortgageTabContent({ ctx }) {
  const {
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
    caseContacts = [],
  } = ctx;

  return (
    <>
      {tab === "sim" && <>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(6,1fr)", gap:10, background:K.bgCard, padding:"18px 16px", margin:"0 16px", borderTop:`1px solid ${K.border}` }}>
          {summCards.map((c,i)=><div key={i} style={{ background:`linear-gradient(145deg, ${c.color}${isDark?"15":"12"}, ${c.color}${isDark?"08":"05"})`, border:c.warn?`1.5px solid ${K.red}50`:`1px solid ${c.color}25`, borderRadius:12, padding:"16px 8px", textAlign:"center", position:"relative", overflow:"hidden" }}>
            <div style={{ position:"absolute", top:-8, left:-8, width:36, height:36, borderRadius:"50%", background:`${c.color}08` }}/>
            <div style={{ fontSize:10, color:K.textSoft, marginBottom:10, lineHeight:1.3, fontWeight:500, minHeight:28, display:"flex", alignItems:"center", justifyContent:"center", whiteSpace:"pre-line" }}>{c.label}</div>
            <div style={{ fontSize:20, fontWeight:800, color:c.warn?K.red:c.color }}>{c.value}</div>
          </div>)}
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"3fr 1fr 1fr", gap:12, margin:"12px 16px 22px" }}>
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <div style={{ display:"grid", gridTemplateColumns:"1fr", gap:8 }}>
              <div style={{ background:K.cardGrad(), borderRadius:12, overflow:"hidden", border:`1px solid ${K.border}` }}>
                <div style={{ background:K.headerBg2, color:isDark?K.goldLight:"#fff", padding:"11px 14px", fontWeight:700, fontSize:13, textAlign:"center", borderBottom:`2px solid ${isDark?K.gold+"40":"#ffffff30"}` }}>נתוני תמהיל</div>
                <div style={{ overflowX:"auto" }}>
                <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11 }}>
                  {tabCompareOpen && portfolios.length > 1 && <thead><tr style={{ background:K.bgCard2 }}>
                    <th style={{ padding:"7px 8px", textAlign:"right", fontSize:10, color:K.textMuted, borderBottom:`1px solid ${K.border}`, fontWeight:600 }}>מדד</th>
                    {comparisonData.map(p=><th key={p.id} style={{ padding:"7px 8px", textAlign:"center", fontSize:10, fontWeight:700, color:p.id===activeId?accent:K.text, background:p.id===activeId?`${accent2}10`:"transparent", borderBottom:`1px solid ${K.border}`, whiteSpace:"nowrap" }}>
                      {p.id===activeId && <span style={{ fontSize:8, background:accent2, color:isDark?K.bg:"#fff", borderRadius:6, padding:"1px 4px", marginLeft:3 }}>נוכחי</span>}{p.name}
                    </th>)}
                  </tr></thead>}
                  <tbody>{mergedRows.map((r,i)=>{
                    const activeP = comparisonData.find(p=>p.id===activeId);
                    const singleVal = activeP ? (r.key ? (r.fmtV?r.fmtV(activeP[r.key]):String(activeP[r.key])) : r.keyFn ? r.keyFn(activeP) : "—") : "—";
                    const vals = tabCompareOpen && portfolios.length>1 ? comparisonData.map(p=>r.key?parseFloat(p[r.key])||0:null) : [];
                    const bestVal = r.best && vals.length ? (r.best==="min"?Math.min(...vals.filter(v=>v!==null)):Math.max(...vals.filter(v=>v!==null))) : null;
                    return <tr key={i} style={{ background:i%2?K.bgCard2:K.bgCard, borderBottom:`1px solid ${K.border}` }}>
                      <td style={{ padding:"6px 8px", textAlign:"right", color:K.textSoft, fontWeight:500, whiteSpace:"nowrap", fontSize:10 }}>{r.label}</td>
                      {tabCompareOpen && portfolios.length>1 ? comparisonData.map((p,j)=>{
                        let dispVal;
                        if (r.key) { const raw=p[r.key]; dispVal=r.fmtV?r.fmtV(raw):String(raw); }
                        else if (r.keyFn) { dispVal=r.keyFn(p); }
                        else { dispVal="—"; }
                        const numV = r.key?parseFloat(p[r.key])||0:null;
                        const isBest = bestVal!==null && numV===bestVal;
                        return <td key={p.id} style={{ padding:"6px 8px", textAlign:"center", fontWeight:isBest?700:p.id===activeId?600:400, color:isBest?K.green:p.id===activeId?r.color:K.text, background:isBest?`${K.green}08`:p.id===activeId?`${accent2}05`:"transparent", fontSize:10.5 }}>{dispVal}{isBest?" ★":""}</td>;
                      }) : <td style={{ padding:"6px 8px", textAlign:"center", fontWeight:700, color:r.color, fontSize:10.5 }}>{singleVal}</td>}
                    </tr>;
                  })}</tbody>
                </table>
                </div>
              </div>
            </div>
            <div style={{ background:K.cardGrad(), borderRadius:12, border:`1px solid ${K.border}`, padding:16, textAlign:"center" }}>
              <div style={{ fontSize:13, fontWeight:700, color:accent, marginBottom:10 }}>מד בריאות תמהיל</div>
              <GaugeChart score={health.score} />
              <div style={{ display:"flex", flexWrap:"wrap", gap:4, marginTop:10, justifyContent:"center" }}>
                {health.items.map((it,i)=><div key={i} style={{ fontSize:9, padding:"3px 8px", borderRadius:12, background:it.ok?`${K.green}15`:`${K.red}15`, color:it.ok?K.green:K.red, border:`1px solid ${it.ok?K.green:K.red}25` }}>{it.ok?"✓":"!"} {it.label} {it.detail}</div>)}
              </div>
            </div>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <ChartCard title="יתרת חוב" sub={compareToId?"השוואת תמהילים":"עם תחנות יציאה"} chartId="balance">
              <ResponsiveContainer width="100%" height={160}><AreaChart data={chartData} margin={{top:5,right:10,left:5,bottom:0}}>
                <defs><linearGradient id="gD" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={K.teal} stopOpacity={.35}/><stop offset="100%" stopColor={K.teal} stopOpacity={.02}/></linearGradient><linearGradient id="gD2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={K.amber} stopOpacity={.2}/><stop offset="100%" stopColor={K.amber} stopOpacity={.01}/></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" stroke={`${K.border}50`}/><XAxis dataKey="year" fontSize={10} tickLine={false} axisLine={{stroke:K.border}} tick={{fill:K.textMuted}}/><YAxis fontSize={9} tickLine={false} axisLine={{stroke:K.border}} width={52} tickFormatter={v=>v===0?"0":(v/1000).toFixed(0)+"K"} tick={{fill:K.textMuted}}/><Tooltip content={<CTooltipC/>}/>
                {compareToId && <Legend wrapperStyle={{fontSize:9,paddingTop:2}} iconSize={8}/>}
                <Area type="monotone" dataKey="balance" stroke={K.teal} strokeWidth={2.5} fill="url(#gD)" dot={false} name={compareToId?activePortfolio.name:"יתרה"}/>
                {compareToId && <Area type="monotone" dataKey="balance_b" stroke={K.amber} strokeWidth={2} fill="url(#gD2)" dot={false} strokeDasharray="6 3" name={cmpName}/>}
                {!compareToId && exitYears.map(ey=><ReferenceLine key={ey} x={ey} stroke={K.orange} strokeDasharray="4 3" strokeWidth={1}/>)}
              </AreaChart></ResponsiveContainer>
            </ChartCard>
            <ChartCard title="ריבית משוקללת" sub="לפי יתרות" chartId="wRate">
              <ResponsiveContainer width="100%" height={160}><LineChart data={chartData} margin={{top:5,right:10,left:5,bottom:0}}>
                <CartesianGrid strokeDasharray="3 3" stroke={`${K.border}50`}/><XAxis dataKey="year" fontSize={10} tickLine={false} axisLine={{stroke:K.border}} tick={{fill:K.textMuted}}/><YAxis fontSize={10} domain={['auto','auto']} width={32} tickLine={false} axisLine={{stroke:K.border}} tickFormatter={v=>v.toFixed(1)+"%"} tick={{fill:K.textMuted}}/><Tooltip content={<CTooltipC suffix="%"/>}/>
                {compareToId && <Legend wrapperStyle={{fontSize:9,paddingTop:2}} iconSize={8}/>}
                <Line type="stepAfter" dataKey="weightedRate" stroke={K.amber} strokeWidth={2.5} dot={{r:3,fill:K.amber,stroke:K.bgCard,strokeWidth:2}} name={compareToId?activePortfolio.name:"ריבית"}/>
                {compareToId && <Line type="stepAfter" dataKey="weightedRate_b" stroke={K.violet} strokeWidth={2} dot={{r:2.5,fill:K.violet,stroke:K.bgCard,strokeWidth:2}} strokeDasharray="6 3" name={cmpName}/>}
              </LineChart></ResponsiveContainer>
            </ChartCard>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <ChartCard title="החזר חודשי ממוצע" sub={compareToId?"השוואת תמהילים":"שינוי לאורך השנים"} chartId="monthly">
              <ResponsiveContainer width="100%" height={160}><LineChart data={chartData} margin={{top:5,right:10,left:5,bottom:0}}>
                <CartesianGrid strokeDasharray="3 3" stroke={`${K.border}50`}/><XAxis dataKey="year" fontSize={10} tickLine={false} axisLine={{stroke:K.border}} tick={{fill:K.textMuted}}/><YAxis fontSize={9} tickLine={false} axisLine={{stroke:K.border}} width={42} tickFormatter={v=>fmt(v)} tick={{fill:K.textMuted}}/><Tooltip content={<CTooltipC/>}/>
                {compareToId && <Legend wrapperStyle={{fontSize:9,paddingTop:2}} iconSize={8}/>}
                <Line type="monotone" dataKey="monthlyAvg" stroke={K.purple} strokeWidth={2.5} dot={{r:2.5,fill:K.purple,stroke:K.bgCard,strokeWidth:2}} name={compareToId?activePortfolio.name:"החזר"}/>
                {compareToId && <Line type="monotone" dataKey="monthlyAvg_b" stroke={K.coral} strokeWidth={2} dot={{r:2,fill:K.coral,stroke:K.bgCard,strokeWidth:2}} strokeDasharray="6 3" name={cmpName}/>}
              </LineChart></ResponsiveContainer>
            </ChartCard>
            <ChartCard title="חלוקת תשלום שנתי" sub={compareToId?"עם השוואה":"קרן, ריבית והצמדה"} chartId="annual">
              <ResponsiveContainer width="100%" height={160}><ComposedChart data={chartData} margin={{top:5,right:10,left:5,bottom:0}}>
                <CartesianGrid strokeDasharray="3 3" stroke={`${K.border}50`}/><XAxis dataKey="year" fontSize={10} tickLine={false} axisLine={{stroke:K.border}} tick={{fill:K.textMuted}}/><YAxis fontSize={9} tickLine={false} axisLine={{stroke:K.border}} width={42} tickFormatter={v=>v===0?"0":(v/1000).toFixed(0)+"K"} tick={{fill:K.textMuted}}/><Tooltip content={<CTooltipC/>}/>
                <Legend wrapperStyle={{fontSize:9,paddingTop:2}} iconSize={8}/>
                <Bar dataKey="principal" stackId="a" fill={K.sky} name="קרן"/><Bar dataKey="interest" stackId="a" fill={K.coral} name="ריבית"/><Bar dataKey="indexation" stackId="a" fill={K.amber} name="הצמדה" radius={[3,3,0,0]}/>
                {compareToId && <Line type="monotone" dataKey="total_b" stroke={K.violet} strokeWidth={2.5} dot={{r:2.5,fill:K.violet,stroke:K.bgCard,strokeWidth:2}} strokeDasharray="6 3" name={cmpName+" סה״כ"}/>}
              </ComposedChart></ResponsiveContainer>
            </ChartCard>
          </div>
        </div>

        {/* Second row: charts */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, margin:"10px 16px 22px" }}>
          <ChartCard title="עוגת עלות" sub="קרן ו-ריבית לכל מסלול" chartId="donut">
            <ResponsiveContainer width="100%" height={160}>
              <PieChart><Pie data={costDonutData} cx="50%" cy="50%" innerRadius={38} outerRadius={62} paddingAngle={2} dataKey="value">
                {costDonutData.map((entry,i)=><Cell key={i} fill={entry.color}/>)}
              </Pie><Tooltip formatter={v=>"₪ "+fmt(v)}/><Legend iconSize={8} wrapperStyle={{fontSize:8}}/></PieChart>
            </ResponsiveContainer>
          </ChartCard>
          <ChartCard title="עלות ריבית אפקטיבית" sub="לכל מסלול" chartId="eff">
            {effData.length > 0 ? <ResponsiveContainer width="100%" height={160}><ComposedChart data={effData} margin={{top:5,right:5,left:0,bottom:0}}>
              <CartesianGrid strokeDasharray="3 3" stroke={`${K.border}50`}/><XAxis dataKey="name" fontSize={9} tickLine={false} tick={{fill:K.textMuted}}/><YAxis yAxisId="left" fontSize={9} tickLine={false} width={34} tickFormatter={v=>v+"%"} tick={{fill:K.textMuted}}/><YAxis yAxisId="right" orientation="left" hide/>
              <Tooltip formatter={(v,n)=>[v+"%", n]}/><Legend iconSize={8} wrapperStyle={{fontSize:8}}/>
              <Bar yAxisId="left" dataKey="עלות_כוללת_pct" name="עלות כוללת %" radius={[4,4,0,0]}>
                {effData.map((e,i)=><Cell key={i} fill={e.color}/>)}
              </Bar>
              <Line yAxisId="left" type="monotone" dataKey="עלות_שנתית_pct" name="עלות שנתית %" stroke={K.gold} strokeWidth={2} dot={{r:4,fill:K.gold}}/>
            </ComposedChart></ResponsiveContainer> : <div style={{ color:K.textMuted, fontSize:10, textAlign:"center", paddingTop:60 }}>אין נתונים</div>}
          </ChartCard>
        </div>

        {/* Expand Chart Modal */}
        {expandedChart && (
          <div onClick={()=>setExpandedChart(null)} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center" }}>
            <div onClick={e=>e.stopPropagation()} style={{ background:K.bgCard, border:`1px solid ${K.border}`, borderRadius:16, width:"85vw", maxWidth:900, maxHeight:"85vh", display:"flex", flexDirection:"column", boxShadow:"0 20px 60px rgba(0,0,0,0.5)" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"14px 20px", borderBottom:`1px solid ${K.border}`, flexShrink:0 }}>
                <span style={{ fontWeight:700, fontSize:15, color:isDark?K.goldLight:K.purple }}>{expandedChart.title}</span>
                {expandedChart.sub && <span style={{ fontSize:11, color:K.textMuted }}>{expandedChart.sub}</span>}
                <button onClick={()=>setExpandedChart(null)} style={{ background:"none", border:"none", fontSize:20, cursor:"pointer", color:K.textMuted, lineHeight:1 }}>×</button>
              </div>
              <div style={{ padding:"16px 20px", flexShrink:0 }}>
                {expandedChart.chartId==="balance" && <ResponsiveContainer width="100%" height={300}><AreaChart data={chartData} margin={{top:5,right:10,left:5,bottom:0}}><defs><linearGradient id="gDE" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={K.teal} stopOpacity={.35}/><stop offset="100%" stopColor={K.teal} stopOpacity={.02}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" stroke={`${K.border}50`}/><XAxis dataKey="year" fontSize={10} tick={{fill:K.textMuted}}/><YAxis fontSize={9} width={60} tickFormatter={v=>(v/1000).toFixed(0)+"K"} tick={{fill:K.textMuted}}/><Tooltip content={<CTooltipC/>}/><Area type="monotone" dataKey="balance" stroke={K.teal} strokeWidth={2.5} fill="url(#gDE)" dot={false} name="יתרה"/></AreaChart></ResponsiveContainer>}
                {expandedChart.chartId==="wRate" && <ResponsiveContainer width="100%" height={300}><LineChart data={chartData} margin={{top:5,right:10,left:5,bottom:0}}><CartesianGrid strokeDasharray="3 3" stroke={`${K.border}50`}/><XAxis dataKey="year" fontSize={10} tick={{fill:K.textMuted}}/><YAxis fontSize={9} width={40} tickFormatter={v=>v+"%"} tick={{fill:K.textMuted}}/><Tooltip content={<CTooltipC suffix="%"/>}/><Line type="stepAfter" dataKey="weightedRate" stroke={K.amber} strokeWidth={2.5} dot={{r:3}} name="ריבית"/></LineChart></ResponsiveContainer>}
                {expandedChart.chartId==="monthly" && <ResponsiveContainer width="100%" height={300}><LineChart data={chartData} margin={{top:5,right:10,left:5,bottom:0}}><CartesianGrid strokeDasharray="3 3" stroke={`${K.border}50`}/><XAxis dataKey="year" fontSize={10} tick={{fill:K.textMuted}}/><YAxis fontSize={9} width={52} tickFormatter={v=>fmt(v)} tick={{fill:K.textMuted}}/><Tooltip content={<CTooltipC/>}/><Line type="monotone" dataKey="monthlyAvg" stroke={K.purple} strokeWidth={2.5} dot={{r:3}} name="החזר"/></LineChart></ResponsiveContainer>}
                {expandedChart.chartId==="annual" && <ResponsiveContainer width="100%" height={300}><ComposedChart data={chartData} margin={{top:5,right:10,left:5,bottom:0}}><CartesianGrid strokeDasharray="3 3" stroke={`${K.border}50`}/><XAxis dataKey="year" fontSize={10} tick={{fill:K.textMuted}}/><YAxis fontSize={9} width={52} tickFormatter={v=>(v/1000).toFixed(0)+"K"} tick={{fill:K.textMuted}}/><Tooltip content={<CTooltipC/>}/><Legend iconSize={8}/><Bar dataKey="principal" stackId="a" fill={K.sky} name="קרן"/><Bar dataKey="interest" stackId="a" fill={K.coral} name="ריבית"/><Bar dataKey="indexation" stackId="a" fill={K.amber} name="הצמדה" radius={[3,3,0,0]}/></ComposedChart></ResponsiveContainer>}
                {expandedChart.chartId==="donut" && <ResponsiveContainer width="100%" height={300}><PieChart><Pie data={costDonutData} cx="50%" cy="50%" innerRadius={70} outerRadius={120} paddingAngle={2} dataKey="value">{costDonutData.map((entry,i)=><Cell key={i} fill={entry.color}/>)}</Pie><Tooltip formatter={v=>"₪ "+fmt(v)}/><Legend iconSize={10} wrapperStyle={{fontSize:10}}/></PieChart></ResponsiveContainer>}
                {expandedChart.chartId==="eff" && <ResponsiveContainer width="100%" height={300}><ComposedChart data={effData} margin={{top:5,right:10,left:5,bottom:0}}><CartesianGrid strokeDasharray="3 3" stroke={`${K.border}50`}/><XAxis dataKey="name" fontSize={10} tick={{fill:K.textMuted}}/><YAxis fontSize={9} width={40} tickFormatter={v=>v+"%"} tick={{fill:K.textMuted}}/><Tooltip formatter={(v,n)=>[v+"%", n]}/><Legend iconSize={10}/><Bar dataKey="עלות_כוללת_pct" name="עלות כוללת %" radius={[4,4,0,0]}>{effData.map((e,i)=><Cell key={i} fill={e.color}/>)}</Bar><Line type="monotone" dataKey="עלות_שנתית_pct" name="עלות שנתית %" stroke={K.gold} strokeWidth={2.5} dot={{r:5,fill:K.gold}}/></ComposedChart></ResponsiveContainer>}
              </div>
              <div style={{ overflowY:"auto", padding:"0 20px 20px" }}>
                <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11 }}>
                  <thead><tr style={{ background:K.bgCard2 }}>
                    <th style={{ padding:"8px 6px", textAlign:"right", borderBottom:`2px solid ${accent2}25`, color:accent, fontWeight:600 }}>מסלול</th>
                    <th style={{ padding:"8px 6px", textAlign:"center", borderBottom:`2px solid ${accent2}25`, color:accent, fontWeight:600 }}>סכום</th>
                    <th style={{ padding:"8px 6px", textAlign:"center", borderBottom:`2px solid ${accent2}25`, color:accent, fontWeight:600 }}>ריבית</th>
                    <th style={{ padding:"8px 6px", textAlign:"center", borderBottom:`2px solid ${accent2}25`, color:accent, fontWeight:600 }}>תקופה</th>
                    <th style={{ padding:"8px 6px", textAlign:"center", borderBottom:`2px solid ${accent2}25`, color:accent, fontWeight:600 }}>עלות כוללת</th>
                    <th style={{ padding:"8px 6px", textAlign:"center", borderBottom:`2px solid ${accent2}25`, color:accent, fontWeight:600 }}>החזר ראשון</th>
                  </tr></thead>
                  <tbody>{tracks.map((t,i)=>{
                    const sched=genAmortization(t); const totI=sched.reduce((s,r)=>s+r.interest+r.indexation,0);
                    return <tr key={t.id} style={{ background:i%2?K.bgCard2:K.bgCard, borderBottom:`1px solid ${K.border}` }}>
                      <td style={{ padding:"8px 6px", fontWeight:700, color:trackColors_arr[i%trackColors_arr.length] }}>{t.interestType} ({t.repaymentType})</td>
                      <td style={{ padding:"8px 6px", textAlign:"center" }}>₪ {fmt(t.amount)}</td>
                      <td style={{ padding:"8px 6px", textAlign:"center" }}>{t.rate}%</td>
                      <td style={{ padding:"8px 6px", textAlign:"center" }}>{t.periodMonths} חודשים</td>
                      <td style={{ padding:"8px 6px", textAlign:"center", color:K.coral }}>₪ {fmt(t.amount+Math.round(totI))}</td>
                      <td style={{ padding:"8px 6px", textAlign:"center", fontWeight:700, color:accent }}>₪ {fmt(calcFirstPayment(t))}</td>
                    </tr>;
                  })}</tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </>}

      {/* TAB: PROFILE */}
      {tab === "profile" && <div style={{ background:K.cardGrad(), margin:"0 16px", borderRadius:"0 0 12px 12px", border:`1px solid ${K.border}`, padding:20 }}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
          <div style={{ background:K.bgCard, borderRadius:12, overflow:"hidden", border:`1px solid ${K.border}` }}>
            <SectionTitle icon="📝">פרופיל בקשה</SectionTitle>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11 }}><tbody>{requestRows.map((r,i)=>r.sep?<tr key={i}><td colSpan={2} style={{ padding:0, borderBottom:`2px solid ${isDark?K.gold+"25":K.purple+"25"}` }}></td></tr>:<tr key={i} style={{ background:i%2?K.bgCard2:K.bgCard }}><td style={{ padding:"8px 10px", textAlign:"right", borderBottom:`1px solid ${K.border}`, color:K.textSoft, fontWeight:500, whiteSpace:"nowrap", fontSize:11 }}>{r.label}</td><td style={{ padding:"8px 10px", textAlign:"center", borderBottom:`1px solid ${K.border}`, fontWeight:700, color:r.color, fontSize:11 }}>{r.input?r.el:r.val}</td></tr>)}</tbody></table>
          </div>
          <div style={{ background:K.bgCard, borderRadius:12, overflow:"hidden", border:`1px solid ${K.border}` }}>
            <SectionTitle icon="👤">פרופיל לווה</SectionTitle>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11 }}><tbody>{profileRows.map((r,i)=>r.sep?<tr key={i}><td colSpan={2} style={{ padding:0, borderBottom:`2px solid ${isDark?K.gold+"25":K.purple+"25"}` }}></td></tr>:<tr key={i} style={{ background:i%2?K.bgCard2:K.bgCard }}><td style={{ padding:"8px 10px", textAlign:"right", borderBottom:`1px solid ${K.border}`, color:K.textSoft, fontWeight:500, whiteSpace:"nowrap", fontSize:11 }}>{r.label}</td><td style={{ padding:"8px 10px", textAlign:"center", borderBottom:`1px solid ${K.border}`, fontWeight:700, color:r.color, fontSize:11 }}>{r.input?r.el:r.val}</td></tr>)}</tbody></table>
          </div>
        </div>
      </div>}

      {/* TAB: FINANCIAL DATA */}
      {tab === "financial" && <div style={{ background:K.cardGrad(), margin:"0 16px", borderRadius:"0 0 12px 12px", border:`1px solid ${K.border}`, padding:20 }}>
        <SectionTitle icon="💹">נתונים כלכליים</SectionTitle>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:16, marginTop:16 }}>
          {/* Summary Cards */}
          {[
            {label:"סכום הלוואה כולל",value:"₪ "+fmt(totalAmount),color:K.teal,icon:"🏦"},
            {label:"שווי נכס",value:"₪ "+fmt(propValue),color:K.sky,icon:"🏠"},
            {label:"LTV",value:(ltv*100).toFixed(1)+"%",color:ltv<=0.75?K.green:K.red,icon:"📐"},
            {label:"הכנסה חודשית",value:"₪ "+fmt(income),color:K.emerald,icon:"💰"},
            {label:"החזר ראשון",value:"₪ "+fmt(totals.firstPmt),color:K.purple,icon:"📆"},
            {label:"PTI",value:(comp.pti*100).toFixed(1)+"%",color:comp.ptiOk?K.green:K.red,icon:"⚖️"},
          ].map((c,i) => (
            <div key={i} style={{ background:`linear-gradient(145deg, ${c.color}${isDark?"15":"12"}, ${c.color}${isDark?"08":"05"})`, border:`1px solid ${c.color}25`, borderRadius:12, padding:"18px 14px", textAlign:"center" }}>
              <div style={{ fontSize:20, marginBottom:6 }}>{c.icon}</div>
              <div style={{ fontSize:10, color:K.textSoft, marginBottom:8, fontWeight:500 }}>{c.label}</div>
              <div style={{ fontSize:22, fontWeight:800, color:c.color }}>{c.value}</div>
            </div>
          ))}
        </div>

        {/* Detailed Financial Table */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginTop:20 }}>
          <div style={{ background:K.bgCard, borderRadius:12, overflow:"hidden", border:`1px solid ${K.border}` }}>
            <div style={{ background:K.headerBg2, color:isDark?K.goldLight:"#fff", padding:"11px 14px", fontWeight:700, fontSize:13, textAlign:"center", borderBottom:`2px solid ${isDark?K.gold+"40":"#ffffff30"}` }}>עלויות ותשלומים</div>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11 }}>
              <tbody>
                {[
                  {label:"עלות כוללת",val:"₪ "+fmt(totals.totalPay),color:isDark?K.goldLight:K.purple},
                  {label:"סה״כ ריבית",val:"₪ "+fmt(totals.totI),color:K.coral},
                  {label:"סה״כ הצמדה",val:"₪ "+fmt(totals.totIdx),color:K.amber},
                  {label:"ריבית + הצמדה",val:"₪ "+fmt((totals.totI||0)+(totals.totIdx||0)),color:K.orange},
                  {label:"החזר שיא",val:"₪ "+fmt(totals.maxPmt)+(totals.maxPmtY?" (שנה "+totals.maxPmtY+")":""),color:K.pink},
                  {label:"החזר לשקל",val:metrics.pps,color:parseFloat(metrics.pps||0)<1.8?K.green:K.red},
                  {label:'שת"פ (IRR)',val:metrics.irr+"%",color:K.violet},
                ].map((r,i) => (
                  <tr key={i} style={{ background:i%2?K.bgCard2:K.bgCard }}>
                    <td style={{ padding:"9px 12px", textAlign:"right", borderBottom:`1px solid ${K.border}`, color:K.textSoft, fontWeight:500, fontSize:11 }}>{r.label}</td>
                    <td style={{ padding:"9px 12px", textAlign:"center", borderBottom:`1px solid ${K.border}`, fontWeight:700, color:r.color, fontSize:12 }}>{r.val}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ background:K.bgCard, borderRadius:12, overflow:"hidden", border:`1px solid ${K.border}` }}>
            <div style={{ background:K.headerBg2, color:isDark?K.goldLight:"#fff", padding:"11px 14px", fontWeight:700, fontSize:13, textAlign:"center", borderBottom:`2px solid ${isDark?K.gold+"40":"#ffffff30"}` }}>פירוט מסלולים</div>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11 }}>
              <thead>
                <tr style={{ background:K.bgCard2 }}>
                  {["מסלול","סכום","ריבית","תקופה","החזר ראשון","משקל"].map((h,i) => (
                    <th key={i} style={{ padding:"8px 4px", textAlign:"center", fontSize:10, fontWeight:600, color:isDark?K.goldLight:K.purple, borderBottom:`2px solid ${accent2}25` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tracks.map((t,i) => {
                  const fp = calcFirstPayment(t);
                  const w = totalAmount > 0 ? (t.amount / totalAmount * 100).toFixed(1) : "0";
                  const sched = genAmortization(t);
                  const tc = trackColors_arr[i % trackColors_arr.length];
                  return (
                    <tr key={t.id} style={{ background:i%2?K.bgCard2:K.bgCard, borderBottom:`1px solid ${K.border}`, borderRight:`3px solid ${tc}` }}>
                      <td style={{ padding:"8px 6px", fontWeight:700, color:tc, textAlign:"center", fontSize:10 }}>{t.interestType}</td>
                      <td style={{ padding:"8px 6px", textAlign:"center", fontWeight:600 }}>₪ {fmt(t.amount)}</td>
                      <td style={{ padding:"8px 6px", textAlign:"center", color:K.amber, fontWeight:600 }}>{t.rate}%</td>
                      <td style={{ padding:"8px 6px", textAlign:"center", fontSize:10 }}>{(t.periodMonths/12).toFixed(1)} שנה</td>
                      <td style={{ padding:"8px 6px", textAlign:"center", fontWeight:700, color:accent }}>₪ {fmt(fp)}</td>
                      <td style={{ padding:"8px 6px", textAlign:"center", fontSize:10 }}>{w}%</td>
                    </tr>
                  );
                })}
                <tr style={{ background:K.totalBg, borderTop:`2px solid ${accent2}40` }}>
                  <td style={{ padding:"8px 6px", textAlign:"center", fontWeight:700, color:accent }}>סה״כ</td>
                  <td style={{ padding:"8px 6px", textAlign:"center", fontWeight:800, color:accent }}>₪ {fmt(totalAmount)}</td>
                  <td style={{ padding:"8px 6px", textAlign:"center", fontWeight:700, color:K.amber }}>{metrics.wRate}%</td>
                  <td style={{ padding:"8px 6px", textAlign:"center", fontSize:10 }}>{metrics.maxY} שנה</td>
                  <td style={{ padding:"8px 6px", textAlign:"center", fontWeight:800, color:accent }}>₪ {fmt(totals.firstPmt)}</td>
                  <td style={{ padding:"8px 6px", textAlign:"center" }}>100%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Compliance & Risk */}
        <div style={{ marginTop:20, background:K.bgCard, borderRadius:12, overflow:"hidden", border:`1px solid ${K.border}` }}>
          <div style={{ background:K.headerBg2, color:isDark?K.goldLight:"#fff", padding:"11px 14px", fontWeight:700, fontSize:13, textAlign:"center", borderBottom:`2px solid ${isDark?K.gold+"40":"#ffffff30"}` }}>תאימות ובקרת סיכונים</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(5, 1fr)", gap:0 }}>
            {[
              {label:"PTI (יחס החזר)",val:(comp.pti*100).toFixed(1)+"%",ok:comp.ptiOk,detail:comp.ptiOk?"תקין":"חריגה!"},
              {label:"LTV",val:(ltv*100).toFixed(1)+"%",ok:ltv<=0.75,detail:ltv<=0.75?"תקין":"חריגה!"},
              {label:"% ריבית קבועה",val:(comp.fixedR*100).toFixed(0)+"%",ok:comp.fixedR>=0.33,detail:comp.fixedR>=0.33?"✓ מעל שליש":"⚠ פחות משליש"},
              {label:"תקופה מקסימלית",val:metrics.maxY+" שנה",ok:parseFloat(metrics.maxY)<=30,detail:parseFloat(metrics.maxY)<=30?"תקין":"חריגה!"},
              {label:"החזר לשקל",val:metrics.pps,ok:parseFloat(metrics.pps)<1.8,detail:parseFloat(metrics.pps)<1.8?"סביר":"גבוה"},
            ].map((c,i) => (
              <div key={i} style={{ textAlign:"center", padding:"16px 8px", borderLeft:i>0?`1px solid ${K.border}`:"none" }}>
                <div style={{ fontSize:10, color:K.textMuted, marginBottom:6 }}>{c.label}</div>
                <div style={{ fontSize:18, fontWeight:800, color:c.ok?K.green:K.red }}>{c.val}</div>
                <div style={{ fontSize:10, marginTop:4, color:c.ok?K.green:K.red, fontWeight:600 }}>{c.detail}</div>
              </div>
            ))}
          </div>
        </div>
      </div>}

      {/* TAB: STRESS TEST */}
      {tab === "stress" && <div style={{ background:K.cardGrad(), margin:"0 16px", borderRadius:"0 0 12px 12px", border:`1px solid ${K.border}` }}>
        <SectionTitle icon="⚡">Stress Test — מבחן לחץ</SectionTitle>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:0 }}>
          <div style={{ padding:16, borderLeft:`1px solid ${K.border}` }}>
            <div style={{ fontWeight:700, fontSize:12, color:K.coral, marginBottom:4 }}>📈 תרחישי עליית ריבית</div>
            <div style={{ fontSize:10, color:K.textMuted, marginBottom:10 }}>משפיע רק על מסלולים משתנים (פריים, מל"צ, מ"צ). קבועות לא מושפעות.</div>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11 }}>
              <thead><tr style={{ background:K.bgCard2 }}>{["תרחיש","החזר ראשון","שינוי","PTI","עלות כוללת"].map((h,i)=><th key={i} style={{ padding:"8px 4px", textAlign:"center", fontSize:10, fontWeight:600, color:accent, borderBottom:`2px solid ${accent2}25` }}>{h}</th>)}</tr></thead>
              <tbody>{stressData.rate.map((sc,i) => { const fpDiff=sc.firstPmt-baseFP;const fpPct=baseFP>0?((fpDiff/baseFP)*100).toFixed(1):"0";
                return (<tr key={i} style={{ background:i===0?`${K.teal}10`:i%2?K.bgCard2:K.bgCard, borderBottom:`1px solid ${K.border}` }}>
                  <td style={{ padding:"8px 4px", textAlign:"center", fontWeight:700, color:sc.color }}>{sc.name}</td>
                  <td style={{ padding:"8px 4px", textAlign:"center", fontWeight:700, color:accent }}>₪ {fmt(sc.firstPmt)}</td>
                  <td style={{ padding:"8px 4px", textAlign:"center", color:fpDiff>0?K.red:fpDiff<0?K.green:K.textMuted, fontWeight:600, fontSize:10 }}>{i===0?"—":(fpDiff>0?"+":"")+fmt(fpDiff)+" ("+fpPct+"%)"}</td>
                  <td style={{ padding:"8px 4px", textAlign:"center", fontWeight:700, color:sc.pti>0.5?K.red:sc.pti>0.4?K.orange:K.green }}>{(sc.pti*100).toFixed(1)}%</td>
                  <td style={{ padding:"8px 4px", textAlign:"center", fontWeight:600 }}>₪ {fmt(sc.totalPay)}</td>
                </tr>);})}</tbody>
            </table>
            <div style={{ marginTop:14 }}>
              <ChartCard title="החזר ראשון לפי תרחיש ריבית"><ResponsiveContainer width="100%" height={160}><BarChart data={stressData.rate} margin={{top:10,right:5,left:5,bottom:0}}><CartesianGrid strokeDasharray="3 3" stroke={`${K.border}50`}/><XAxis dataKey="name" fontSize={9} tickLine={false} tick={{fill:K.textMuted}}/><YAxis fontSize={9} tickLine={false} width={48} tickFormatter={v=>fmt(v)} tick={{fill:K.textMuted}}/><Tooltip formatter={v=>"₪ "+fmt(v)}/><Bar dataKey="firstPmt" name="החזר ראשון" fill={K.teal} radius={[6,6,0,0]}/></BarChart></ResponsiveContainer></ChartCard>
            </div>
          </div>
          <div style={{ padding:16 }}>
            <div style={{ fontWeight:700, fontSize:12, color:K.violet, marginBottom:4 }}>📊 תרחישי אינפלציה (CPI)</div>
            <div style={{ fontSize:10, color:K.textMuted, marginBottom:10 }}>משפיע רק על מסלולים צמודים למדד (ק"צ, מ"צ). לא-צמודות לא מושפעות.</div>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11 }}>
              <thead><tr style={{ background:K.bgCard2 }}>{["תרחיש","עלות הצמדה","עלות כוללת","החזר לשקל"].map((h,i)=><th key={i} style={{ padding:"8px 4px", textAlign:"center", fontSize:10, fontWeight:600, color:accent, borderBottom:`2px solid ${accent2}25` }}>{h}</th>)}</tr></thead>
              <tbody>{stressData.cpi.map((sc,i) => (
                <tr key={i} style={{ background:sc.cpi>4?`${K.orange}10`:i%2?K.bgCard2:K.bgCard, borderBottom:`1px solid ${K.border}` }}>
                  <td style={{ padding:"8px 4px", textAlign:"center", fontWeight:700, color:sc.color }}>{sc.name}</td>
                  <td style={{ padding:"8px 4px", textAlign:"center", color:K.amber, fontWeight:600 }}>₪ {fmt(sc.totalIdx)}</td>
                  <td style={{ padding:"8px 4px", textAlign:"center", fontWeight:600 }}>₪ {fmt(sc.totalPay)}</td>
                  <td style={{ padding:"8px 4px", textAlign:"center", fontWeight:700, color:parseFloat(sc.pps)>1.8?K.red:K.green }}>{sc.pps}</td>
                </tr>))}</tbody>
            </table>
            <div style={{ marginTop:14 }}>
              <ChartCard title="עלות כוללת לפי תרחיש מדד"><ResponsiveContainer width="100%" height={160}><BarChart data={stressData.cpi} margin={{top:10,right:5,left:5,bottom:0}}><CartesianGrid strokeDasharray="3 3" stroke={`${K.border}50`}/><XAxis dataKey="name" fontSize={9} tickLine={false} tick={{fill:K.textMuted}}/><YAxis fontSize={9} tickLine={false} width={48} tickFormatter={v=>(v/1000000).toFixed(1)+"M"} tick={{fill:K.textMuted}}/><Tooltip formatter={v=>"₪ "+fmt(v)}/><Bar dataKey="totalPay" name="עלות כוללת" fill={K.violet} radius={[6,6,0,0]}/></BarChart></ResponsiveContainer></ChartCard>
            </div>
          </div>
        </div>
      </div>}

      {/* TAB: AMORTIZATION */}
      {tab === "amort" && <div style={{ background:K.cardGrad(), margin:"0 16px", borderRadius:"0 0 12px 12px", border:`1px solid ${K.border}` }}>
        <SectionTitle icon="📋">לוח סילוקין</SectionTitle>
        <div style={{ padding:"12px 16px", display:"flex", gap:10, alignItems:"center", borderBottom:`1px solid ${K.border}`, flexWrap:"wrap" }}>
          <Pill active={amortView==="yearly"} onClick={()=>setAmortView("yearly")}>שנתי</Pill>
          <Pill active={amortView==="monthly"} onClick={()=>setAmortView("monthly")}>חודשי</Pill>
          <div style={{ flex:1 }}/>
          <button onClick={()=>exportAmortCSV(monthlyData)} style={{ padding:"5px 14px", background:`${K.green}18`, border:`1px solid ${K.green}40`, borderRadius:6, fontSize:11, cursor:"pointer", color:K.green, fontWeight:600, fontFamily:"inherit" }}>📥 ייצוא CSV</button>
          <select value={amortTrack} onChange={e=>setAmortTrack(e.target.value)} style={{ ...inpS, width:"auto", padding:"5px 10px" }}><option value="all">כל המסלולים</option>{tracks.map((t,i)=><option key={t.id} value={t.id}>מסלול {i+1} — {t.interestType}</option>)}</select>
        </div>
        {(() => {
          let data, filtTotals;
          if (amortTrack === "all") {
            data = amortView==="yearly"?yearlyData:monthlyData;
            filtTotals = totals;
          } else {
            const selTrack = tracks.find(t=>String(t.id)===String(amortTrack));
            if (!selTrack) { data = []; filtTotals = {totalPay:0,totI:0,totIdx:0,maxPmt:0,firstPmt:0}; }
            else {
              const sched = genAmortization(selTrack);
              const trackMonthly = sched.map((r,i)=>({month:i+1,payment:Math.round(r.payment),principal:Math.round(r.principal),interest:Math.round(r.interest),indexation:Math.round(r.indexation),balance:Math.round(r.balance)}));
              if (amortView==="monthly") {
                data = trackMonthly;
              } else {
                const maxY = Math.ceil(sched.length/12);
                data = Array.from({length:maxY},(_,y)=>{
                  let yPmt=0,yPrin=0,yInt=0,yIx=0,yBal=0;
                  for(let m=0;m<12;m++){const mi=y*12+m; if(mi<sched.length){yPmt+=sched[mi].payment;yPrin+=sched[mi].principal;yInt+=sched[mi].interest;yIx+=sched[mi].indexation;yBal=sched[mi].balance;}}
                  return {year:y+1,monthlyAvg:Math.round(yPmt/12),principal:Math.round(yPrin),interest:Math.round(yInt),indexation:Math.round(yIx),balance:Math.round(yBal)};
                });
              }
              const totI=sched.reduce((s,r)=>s+r.interest,0); const totIdx=sched.reduce((s,r)=>s+r.indexation,0);
              filtTotals = {totalPay:Math.round(selTrack.amount+totI+totIdx),totI:Math.round(totI),totIdx:Math.round(totIdx),maxPmt:Math.round(Math.max(...sched.map(r=>r.payment))),firstPmt:Math.round(sched[0]?.payment||0)};
            }
          }
          const maxPmtVal = data.length>0?Math.max(...data.map(r=>amortView==="yearly"?r.monthlyAvg:r.payment)):0;
          return (<>
        <div style={{ maxHeight:420, overflowY:"auto", padding:"0 4px" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11 }}>
            <thead><tr style={{ background:K.bgCard2, position:"sticky", top:0, zIndex:1 }}>{[amortView==="yearly"?"שנה":"חודש","תשלום","קרן","ריבית","הצמדה","יתרה"].map((h,i)=><th key={i} style={{ padding:"10px 6px", textAlign:"center", fontSize:10, fontWeight:600, color:accent, borderBottom:`2px solid ${accent2}25` }}>{h}</th>)}</tr></thead>
            <tbody>{data.map((r,i)=>{ const isExit=amortView==="yearly"&&exitYears.includes(r.year); const pmtVal=amortView==="yearly"?r.monthlyAvg:r.payment; const isPeak=pmtVal===maxPmtVal&&maxPmtVal>0; return <tr key={i} style={{ background:isPeak?`${K.orange}12`:isExit?`${K.orange}08`:i%2?K.bgCard2:K.bgCard, borderBottom:`1px solid ${K.border}`, borderRight:isPeak?`3px solid ${K.orange}`:"3px solid transparent" }}>
              <td style={{ padding:"7px", textAlign:"center", fontWeight:600, color:isExit?K.orange:K.text }}>{amortView==="yearly"?r.year:r.month}{isExit?" 🚪":""}{isPeak?" 🔺":""}</td>
              <td style={{ padding:"7px", textAlign:"center", color:isPeak?K.orange:accent, fontWeight:isPeak?800:600 }}>₪ {fmt(pmtVal)}</td>
              <td style={{ padding:"7px", textAlign:"center", color:K.sky }}>₪ {fmt(r.principal)}</td>
              <td style={{ padding:"7px", textAlign:"center", color:K.coral }}>₪ {fmt(r.interest)}</td>
              <td style={{ padding:"7px", textAlign:"center", color:K.amber }}>₪ {fmt(r.indexation)}</td>
              <td style={{ padding:"7px", textAlign:"center", fontWeight:700 }}>₪ {fmt(r.balance)}</td>
            </tr>})}</tbody>
          </table>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr 1fr", gap:0, borderTop:`2px solid ${accent2}30`, background:K.totalBg }}>
          {[{label:"סה״כ תשלומים",val:"₪ "+fmt(filtTotals.totalPay),color:accent},{label:"סה״כ ריבית",val:"₪ "+fmt(filtTotals.totI),color:K.coral},{label:"סה״כ הצמדה",val:"₪ "+fmt(filtTotals.totIdx),color:K.amber},{label:"החזר שיא",val:"₪ "+fmt(filtTotals.maxPmt),color:K.orange},{label:"החזר ראשון",val:"₪ "+fmt(filtTotals.firstPmt),color:K.teal}].map((c,i)=><div key={i} style={{ textAlign:"center", padding:"12px 8px", borderLeft:i>0?`1px solid ${K.border}`:"none" }}>
            <div style={{ fontSize:10, color:K.textMuted, marginBottom:4 }}>{c.label}</div>
            <div style={{ fontSize:14, fontWeight:700, color:c.color }}>{c.val}</div>
          </div>)}
        </div>
        </>); })()}
      </div>}

      {/* TAB: EARLY REPAYMENT */}
      {tab === "prepay" && <div style={{ background:K.cardGrad(), margin:"0 16px", borderRadius:"0 0 12px 12px", border:`1px solid ${K.border}` }}>
        <SectionTitle icon="💰">מחשבון עמלת פירעון מוקדם</SectionTitle>
        <div style={{ padding:"12px 16px", display:"flex", gap:16, alignItems:"center", borderBottom:`1px solid ${K.border}`, flexWrap:"wrap" }}>
          <div style={{ display:"flex", alignItems:"center", gap:6 }}><span style={{ fontSize:11, color:K.textSoft }}>שנות ותק</span><NI inpS={inpS} value={prepYears} onChange={setPrepYears} min={0} max={30} step={1} style={{width:60}}/></div>
          <div style={{ display:"flex", alignItems:"center", gap:6 }}><span style={{ fontSize:11, color:K.textSoft }}>ריבית ממוצעת %</span><NI inpS={inpS} value={prepAvgRate} onChange={setPrepAvgRate} min={0} max={15} step={0.1} style={{width:60}}/></div>
          <div style={{ display:"flex", alignItems:"center", gap:6 }}><span style={{ fontSize:11, color:K.textSoft }}>יום בחודש</span><NI inpS={inpS} value={prepDay} onChange={setPrepDay} min={1} max={31} step={1} style={{width:50}}/></div>
          <label style={{ display:"flex", alignItems:"center", gap:5, fontSize:11, color:K.textSoft, cursor:"pointer" }}>
            <input type="checkbox" checked={prepNotice} onChange={e=>setPrepNotice(e.target.checked)} style={{ accentColor: K.green }} />
            הודעה מוקדמת (10 ימים)
          </label>
          <div style={{ fontSize:10, color:K.textMuted }}>הנחת ותק: <b style={{color:K.green}}>{prepYears>=7?"40%":prepYears>=5?"30%":prepYears>=3?"20%":prepYears>=1?"10%":"0%"}</b></div>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:`repeat(${tracks.length}, 1fr)`, gap:0 }}>
          {prepAllFees.map((pf,i) => {
            const meta = INTEREST_TYPES[pf.track.interestType]; const isPrime = pf.track.interestType === 'פריים'; const tc = trackColors_arr[i % trackColors_arr.length];
            return (
              <div key={pf.track.id} style={{ padding:14, borderLeft:i>0?`1px solid ${K.border}`:"none", borderTop:`3px solid ${tc}` }}>
                <div style={{ fontWeight:700, fontSize:11, color:tc, marginBottom:8 }}>{meta?.label} — ₪{fmt(pf.track.amount)}</div>
                <div style={{ fontSize:10, color:K.textSoft, marginBottom:8 }}>יתרה: <b style={{color:accent}}>₪ {fmt(pf.balance)}</b> | ריבית: {pf.track.rate}%</div>
                {isPrime ? (
                  <div style={{ textAlign:"center", padding:"18px 10px", background:`${K.green}12`, borderRadius:8, border:`1px solid ${K.green}25` }}>
                    <div style={{ fontSize:22 }}>✅</div>
                    <div style={{ fontWeight:700, color:K.green, fontSize:12, marginTop:4 }}>פטור מעמלת פירעון</div>
                    <div style={{ fontSize:10, color:K.textMuted, marginTop:2 }}>מסלול פריים — פטור מלא</div>
                  </div>
                ) : (
                  <div style={{ border:`1px solid ${K.border}`, borderRadius:8, overflow:"hidden" }}>
                    {[{label:"תפעולית",val:pf.operational},{label:"אי-הודעה",val:pf.noNotice,warn:pf.noNotice>0},{label:"היוון",val:pf.capitalization},{label:"הנחת ותק ("+pf.senPct+"%)",val:-pf.discount,green:true},{label:"מדד ממוצע",val:pf.indexAvg}].map((r,j)=><div key={j} style={{display:"flex",justifyContent:"space-between",padding:"7px 10px",borderBottom:`1px solid ${K.border}`,background:j%2?K.bgCard2:K.bgCard,fontSize:10.5}}>
                      <span style={{color:K.textSoft}}>{r.label}</span>
                      <span style={{fontWeight:600,color:r.green?K.green:r.warn?K.orange:r.val>0?K.text:K.textMuted}}>₪ {fmt(Math.abs(r.val))}</span>
                    </div>)}
                    <div style={{ display:"flex", justifyContent:"space-between", padding:"10px", background:K.totalBg, borderTop:`2px solid ${tc}40` }}>
                      <span style={{ fontWeight:700, fontSize:11, color:tc }}>סה״כ</span>
                      <span style={{ fontWeight:800, fontSize:14, color:tc }}>₪ {fmt(pf.total)}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div style={{ display:"flex", justifyContent:"space-between", padding:"12px 16px", background:K.totalBg, borderTop:`2px solid ${accent2}40` }}>
          <div><div style={{ fontSize:12, fontWeight:700, color:accent }}>סה״כ עמלת פירעון מוקדם</div><div style={{ fontSize:10, color:K.textMuted, marginTop:2 }}>אופטימלי (עם הודעה): ₪ {fmt(prepAllFees.reduce((s,f)=>s+f.optimized,0))}</div></div>
          <span style={{ fontWeight:800, fontSize:22, color:accent }}>₪ {fmt(prepAllFees.reduce((s,f)=>s+f.total,0))}</span>
        </div>
      </div>}

      {/* TAB: REVERSE CALCULATOR */}
      {tab === "reverse" && <div style={{ background:K.cardGrad(), margin:"0 16px", borderRadius:"0 0 12px 12px", border:`1px solid ${K.border}` }}>
        <SectionTitle icon="🔄">מחשבון הפוך</SectionTitle>
        <div style={{ padding:"12px 16px", display:"flex", gap:10, borderBottom:`1px solid ${K.border}` }}>
          <Pill active={reverseMode==="pmt2amount"} onClick={()=>setReverseMode("pmt2amount")}>החזר → סכום</Pill>
          <Pill active={reverseMode==="income2amount"} onClick={()=>setReverseMode("income2amount")}>הכנסה → סכום</Pill>
          <Pill active={reverseMode==="price2equity"} onClick={()=>setReverseMode("price2equity")}>מחיר → הון עצמי</Pill>
        </div>
        <div style={{ padding:24, display:"grid", gridTemplateColumns:"1fr 1fr", gap:28 }}>
          <div style={{ display:"grid", gap:14 }}>
            {reverseMode==="pmt2amount"&&[{l:"החזר חודשי רצוי",el:<AmountInputC inpS={inpS} value={revPmt} onChange={setRevPmt} style={{width:128}}/>},{l:"ריבית %",el:<NI inpS={inpS} value={revRate} onChange={setRevRate} min={0} max={15} step={0.1} style={{width:88}}/>},{l:"תקופה (שנים)",el:<NI inpS={inpS} value={revYears} onChange={setRevYears} min={1} max={30} step={1} style={{width:88}}/>}].map((r,i)=><div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontSize:11,color:K.textSoft}}>{r.l}</span>{r.el}</div>)}
            {reverseMode==="income2amount"&&[{l:"הכנסה נטו",el:<AmountInputC inpS={inpS} value={revIncome} onChange={setRevIncome} style={{width:128}}/>},{l:"PTI מקסימלי %",el:<NI inpS={inpS} value={revPti} onChange={setRevPti} min={10} max={50} step={1} style={{width:88}}/>},{l:"ריבית %",el:<NI inpS={inpS} value={revRate} onChange={setRevRate} min={0} max={15} step={0.1} style={{width:88}}/>},{l:"תקופה (שנים)",el:<NI inpS={inpS} value={revYears} onChange={setRevYears} min={1} max={30} step={1} style={{width:88}}/>}].map((r,i)=><div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontSize:11,color:K.textSoft}}>{r.l}</span>{r.el}</div>)}
            {reverseMode==="price2equity"&&<><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontSize:11,color:K.textSoft}}>מחיר דירה</span><AmountInputC inpS={inpS} value={revPrice} onChange={setRevPrice} style={{width:148}}/></div><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontSize:11,color:K.textSoft}}>סוג עסקה</span><select value={revDealType} onChange={e=>setRevDealType(e.target.value)} style={{...inpS,width:128,cursor:"pointer"}}><option value="first">דירה ראשונה (75%)</option><option value="upgrade">דירה חליפית (70%)</option><option value="invest">השקעה (50%)</option></select></div></>}
          </div>
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", background:K.headerBg2, borderRadius:16, padding:30, border:`1px solid ${accent2}25`, position:"relative", overflow:"hidden" }}>
            <div style={{ position:"absolute", top:-20, right:-20, width:80, height:80, borderRadius:"50%", background:`${accent2}06` }}/>
            <div style={{ fontSize:11, color:K.textMuted, marginBottom:10 }}>{reverseResult.label}</div>
            <div style={{ fontSize:38, fontWeight:800, color:isDark?K.goldLight:"#fff" }}>₪ {fmt(reverseResult.amount)}</div>
            {reverseResult.maxPmt && <div style={{ fontSize:12, color:isDark?K.textSoft:"#ffffffcc", marginTop:10 }}>החזר חודשי מקסימלי: <span style={{ color:K.teal, fontWeight:700 }}>₪ {fmt(reverseResult.maxPmt)}</span></div>}
            {reverseResult.equity !== undefined && <div style={{ marginTop:10, fontSize:14, color:K.coral, fontWeight:700 }}>הון עצמי נדרש: ₪ {fmt(reverseResult.equity)}</div>}
            {reverseResult.maxLtv !== undefined && <div style={{ fontSize:11, color:isDark?K.textMuted:"#ffffffaa", marginTop:4 }}>LTV מקסימלי: {(reverseResult.maxLtv*100)}%</div>}
            <button onClick={()=>{ if (setTracks && setTab) { setTracks([{...mkTrack(), amount: reverseResult.amount}]); setTab("sim"); } }} style={{ marginTop:18, padding:"10px 26px", background:isDark?`linear-gradient(135deg, ${K.gold}, ${K.goldLight})`:`linear-gradient(135deg, #fff, #eee)`, color:isDark?K.bg:K.purple, border:"none", borderRadius:8, fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>העבר לסימולטור →</button>
          </div>
        </div>
      </div>}

      <div style={{ textAlign:"center", padding:"16px 16px 22px", fontSize:10, color:K.textMuted }}>
        סימולציה בלבד — אינה מהווה ייעוץ פיננסי | בנק ישראל {BOI_RATE}% | פריים {PRIME_BASE}% | הנחת מדד {ASSUMED_CPI}%
      </div>
    </>
  );
}