import React, { useState, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SecureEntities } from '@/components/secureEntities';
import { base44 } from '@/api/base44Client';
import { Loader2, Save } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import MortgageDashboard from '@/components/calculator/MortgageDashboard';

let _sheetId = 1000;

export default function CaseCalculator() {
  const urlParams = new URLSearchParams(window.location.search);
  const caseId = urlParams.get('id');
  const queryClient = useQueryClient();

  const [sheets, setSheets] = useState([{ id: _sheetId++ }]);
  const [activeSheet, setActiveSheet] = useState(sheets[0].id);
  const [isDark, setIsDark] = useState(true);
  const [saving, setSaving] = useState(false);

  // Store getFullState callbacks per sheet
  const stateGettersRef = useRef({});

  const { data: caseData, isLoading } = useQuery({
    queryKey: ['case', caseId],
    queryFn: () => SecureEntities.MortgageCase.filter({ id: caseId }).then(res => res[0]),
    enabled: !!caseId
  });

  // Load saved requests for this case
  const { data: savedRequests = [] } = useQuery({
    queryKey: ['requests', caseId],
    queryFn: () => base44.entities.Request.filter({ case_id: caseId }),
    enabled: !!caseId
  });

  // Initialize sheets from saved data
  const sheetsInitialized = useRef(false);
  React.useEffect(() => {
    if (savedRequests.length > 0 && !sheetsInitialized.current) {
      sheetsInitialized.current = true;
      const loadedSheets = savedRequests.map((req, i) => ({
        id: _sheetId++,
        requestId: req.id,
        initialData: req.calculator_data,
        name: req.sheet_name || `בקשה ${i + 1}`
      }));
      setSheets(loadedSheets);
      setActiveSheet(loadedSheets[0].id);
    }
  }, [savedRequests]);

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const sheet of sheets) {
        const getState = stateGettersRef.current[sheet.id];
        const state = getState ? getState() : null;
        if (!state) continue;

        const totalAmount = state.portfolios.reduce((sum, p) => 
          sum + p.tracks.reduce((s, t) => s + t.amount, 0), 0
        );

        const reqData = {
          case_id: caseId,
          amount: totalAmount,
          request_type: state.requestType === 'mortgage' ? 'משכנתא' : 'הלוואה',
          calculator_data: state,
          sheet_name: sheet.name || `בקשה ${sheets.indexOf(sheet) + 1}`
        };

        if (sheet.requestId) {
          await base44.entities.Request.update(sheet.requestId, reqData);
        } else {
          const created = await base44.entities.Request.create(reqData);
          sheet.requestId = created.id;
        }
      }

      // Delete saved requests that are no longer in sheets
      const activeRequestIds = sheets.map(s => s.requestId).filter(Boolean);
      for (const req of savedRequests) {
        if (!activeRequestIds.includes(req.id)) {
          await base44.entities.Request.delete(req.id);
        }
      }

      queryClient.invalidateQueries({ queryKey: ['requests', caseId] });
    } finally {
      setSaving(false);
    }
  };

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
    const s = { id: _sheetId++, name: `בקשה ${sheets.length + 1}` };
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
              📄 {s.name || `בקשה ${i + 1}`}
              {sheets.length > 1 && <span onClick={e => { e.stopPropagation(); const next = sheets.filter(ss => ss.id !== s.id); setSheets(next); if (activeSheet === s.id) setActiveSheet(next[next.length - 1].id); }} style={{ color: "#6b7280", fontSize: 13, marginRight: 4, cursor: "pointer" }}>×</span>}
            </div>
          ))}
          <div onClick={addSheet} style={{ padding: "7px 14px", cursor: "pointer", fontSize: 18, color: "#6b7280", lineHeight: 1 }}>+</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              cursor: saving ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: 5,
              background: saving ? "#374151" : "linear-gradient(135deg, #10b981, #059669)",
              padding: "4px 14px",
              borderRadius: 20,
              border: "1px solid #059669",
              marginBottom: 6,
              transition: "all .3s",
              color: "#fff",
              fontSize: 11,
              fontWeight: 600,
              fontFamily: "inherit",
              opacity: saving ? 0.7 : 1
            }}
          >
            {saving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            <span>{saving ? "שומר..." : "שמור"}</span>
          </button>
          {/* Theme Toggle */}
          <div onClick={() => setIsDark(!isDark)} style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 5, background: "#ffffff12", padding: "4px 12px", borderRadius: 20, border: "1px solid #ffffff20", marginBottom: 6, transition: "all .3s" }}>
            <span style={{ fontSize: 14 }}>{isDark ? "☀️" : "🌙"}</span>
            <span style={{ fontSize: 10, color: "#ccc", fontWeight: 600 }}>{isDark ? "בהיר" : "כהה"}</span>
          </div>
        </div>
      </div>

      {/* Sheets */}
      {sheets.map(s => (
        <div key={s.id} style={{ display: s.id === activeSheet ? "block" : "none" }}>
          <MortgageDashboard
            isDark={isDark}
            setIsDark={setIsDark}
            startEmpty={!s.initialData}
            initialData={s.initialData || null}
            onSave={(getStateFn) => {
              stateGettersRef.current[s.id] = getStateFn;
            }}
          />
        </div>
      ))}
    </div>
  );
}