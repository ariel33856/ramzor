import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { SecureEntities } from '@/components/secureEntities';
import { Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import MortgageDashboard from '@/components/calculator/MortgageDashboard';

let _sheetId = 1000;

export default function CaseCalculator() {
  const urlParams = new URLSearchParams(window.location.search);
  const caseId = urlParams.get('id');

  const [sheets, setSheets] = useState([{ id: _sheetId++ }]);
  const [activeSheet, setActiveSheet] = useState(sheets[0].id);
  const [isDark, setIsDark] = useState(true);

  const { data: caseData, isLoading } = useQuery({
    queryKey: ['case', caseId],
    queryFn: () => SecureEntities.MortgageCase.filter({ id: caseId }).then(res => res[0]),
    enabled: !!caseId
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50/50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="min-h-screen bg-gray-50/50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900">תיק לא נמצא</h2>
          <Link to={createPageUrl('Dashboard')} className="text-blue-600 hover:underline mt-2 inline-block">
            חזרה לדשבורד
          </Link>
        </div>
      </div>
    );
  }

  const addSheet = () => {
    const s = { id: _sheetId++ };
    setSheets(prev => [...prev, s]);
    setActiveSheet(s.id);
  };

  return (
    <div style={{ direction: "rtl", background: "#111827" }}>
      {/* Sheet Tabs Bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#111827", padding: "6px 16px 0", borderBottom: "2px solid #374151" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
          {sheets.map((s, i) => (
            <div key={s.id} onClick={() => setActiveSheet(s.id)}
              style={{ padding: "7px 22px", cursor: "pointer", fontSize: 12, fontWeight: s.id === activeSheet ? 700 : 400, color: s.id === activeSheet ? "#fbbf24" : "#9ca3af", background: s.id === activeSheet ? "#1f2937" : "transparent", borderRadius: "8px 8px 0 0", borderTop: s.id === activeSheet ? "1.5px solid #fbbf2480" : "1.5px solid transparent", display: "flex", alignItems: "center", gap: 6 }}>
              📄 בקשה {i + 1}
              {sheets.length > 1 && <span onClick={e => { e.stopPropagation(); const next = sheets.filter(ss => ss.id !== s.id); setSheets(next); if (activeSheet === s.id) setActiveSheet(next[next.length - 1].id); }} style={{ color: "#6b7280", fontSize: 13, marginRight: 4, cursor: "pointer" }}>×</span>}
            </div>
          ))}
          <div onClick={addSheet} style={{ padding: "7px 14px", cursor: "pointer", fontSize: 18, color: "#6b7280", lineHeight: 1 }}>+</div>
        </div>
        {/* Theme Toggle */}
        <div onClick={() => setIsDark(!isDark)} style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 5, background: "#ffffff12", padding: "4px 12px", borderRadius: 20, border: "1px solid #ffffff20", marginBottom: 6, transition: "all .3s" }}>
          <span style={{ fontSize: 14 }}>{isDark ? "☀️" : "🌙"}</span>
          <span style={{ fontSize: 10, color: "#ccc", fontWeight: 600 }}>{isDark ? "בהיר" : "כהה"}</span>
        </div>
      </div>

      {/* Sheets */}
      {sheets.map(s => (
        <div key={s.id} style={{ display: s.id === activeSheet ? "block" : "none" }}>
          <MortgageDashboard isDark={isDark} setIsDark={setIsDark} />
        </div>
      ))}
    </div>
  );
}