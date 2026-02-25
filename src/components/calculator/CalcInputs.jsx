import React, { useState } from "react";

export function NI({ value, onChange, min = 0, max = 99999999, step = 1000, style: sx = {}, inpS }) {
  const [local, setLocal] = useState(String(value));
  const [focused, setFocused] = useState(false);
  if (!focused && local !== String(value)) setLocal(String(value));
  return (
    <input
      type="number"
      value={focused ? local : value}
      min={min}
      max={max}
      step={step}
      onChange={e => {
        setLocal(e.target.value);
        if (e.target.value !== '' && e.target.value !== '-') {
          const n = parseFloat(e.target.value);
          if (!isNaN(n)) onChange(n);
        }
      }}
      onFocus={e => { setFocused(true); setLocal(String(value)); e.target.select(); }}
      onBlur={() => { setFocused(false); const n = parseFloat(local); if (!isNaN(n)) onChange(Math.max(min, Math.min(max, n))); else onChange(value); }}
      onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); }}
      style={{ ...inpS, ...sx }}
    />
  );
}

export function AmountInputC({ value, onChange, style: sx = {}, inpS }) {
  const toFmt = v => { const n = parseInt(String(v).replace(/[^\d]/g, '')) || 0; return n === 0 ? '' : n.toLocaleString("he-IL"); };
  const [txt, setTxt] = useState(toFmt(value));
  const [focused, setFocused] = useState(false);
  if (!focused && txt !== toFmt(value)) setTxt(toFmt(value));
  return (
    <input
      type="text"
      value={txt}
      onChange={e => {
        const raw = e.target.value.replace(/[^\d]/g, '');
        const n = parseInt(raw) || 0;
        setTxt(n === 0 ? '' : n.toLocaleString("he-IL"));
        onChange(n);
      }}
      onFocus={e => { setFocused(true); e.target.select(); }}
      onBlur={() => { setFocused(false); setTxt(toFmt(value)); }}
      style={{ ...inpS, ...sx }}
    />
  );
}