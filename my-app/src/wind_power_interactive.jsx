import { useState, useEffect, useRef, useCallback } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, ReferenceLine, Label } from "recharts";

// ── color palette ──────────────────────────────────────────────────────────
const C = {
  bg: "#0a0f1e",
  panel: "#0f1829",
  border: "#1e3a5f",
  accent: "#00c9ff",
  accent2: "#7b2ff7",
  green: "#00e5a0",
  amber: "#f59e0b",
  red: "#ef4444",
  text: "#e2e8f0",
  muted: "#64748b",
  card: "#111d35",
};

// ── math helpers ───────────────────────────────────────────────────────────
const windPower = (rho, A, v) => 0.5 * rho * A * Math.pow(v, 3);
const weibullPDF = (v, k, c) => v > 0
  ? (k / c) * Math.pow(v / c, k - 1) * Math.exp(-Math.pow(v / c, k))
  : 0;
const windShear = (vref, href, h, alpha) =>
  vref * Math.pow(h / href, alpha);

// ── KaTeX-style formula renderer (inline SVG text approach) ───────────────
function Formula({ children, size = 16, color = C.accent }) {
  return (
    <span style={{
      fontFamily: "'STIX Two Math', 'Latin Modern Math', 'Computer Modern', Georgia, serif",
      fontSize: size,
      color,
      letterSpacing: "0.02em",
      lineHeight: 1.6,
    }}>
      {children}
    </span>
  );
}

// ── Section wrapper ────────────────────────────────────────────────────────
function Section({ num, title, children }) {
  return (
    <div style={{
      marginBottom: 40,
      borderRadius: 16,
      overflow: "hidden",
      border: `1px solid ${C.border}`,
      background: C.panel,
    }}>
      <div style={{
        padding: "18px 28px",
        background: `linear-gradient(135deg, #0d1f3c 0%, #0a1628 100%)`,
        borderBottom: `1px solid ${C.border}`,
        display: "flex", alignItems: "center", gap: 14,
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: "50%",
          background: `linear-gradient(135deg, ${C.accent}, ${C.accent2})`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: "monospace", fontSize: 14, fontWeight: 800, color: "#fff",
          flexShrink: 0,
        }}>{num}</div>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: C.text, letterSpacing: "-0.01em" }}>
          {title}
        </h2>
      </div>
      <div style={{ padding: "24px 28px" }}>{children}</div>
    </div>
  );
}

// ── Formula block ──────────────────────────────────────────────────────────
function FormulaBlock({ children, highlight }) {
  return (
    <div style={{
      margin: "16px 0",
      padding: "18px 24px",
      background: highlight ? `linear-gradient(135deg, #0a1f3c 0%, #0f1829 100%)` : "#080e1c",
      borderRadius: 12,
      border: `1px solid ${highlight ? C.accent + "60" : C.border}`,
      borderLeft: `4px solid ${highlight ? C.accent : C.border}`,
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <Formula size={22} color={C.accent}>{children}</Formula>
    </div>
  );
}

// ── Slider control ─────────────────────────────────────────────────────────
function Slider({ label, value, min, max, step, unit, onChange, color = C.accent }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontSize: 13, color: C.muted, fontFamily: "monospace" }}>{label}</span>
        <span style={{
          fontSize: 14, fontWeight: 700, color,
          fontFamily: "monospace", background: "#080e1c",
          padding: "2px 10px", borderRadius: 6, border: `1px solid ${color}40`,
        }}>{value}{unit}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{
          width: "100%", height: 6, appearance: "none",
          background: `linear-gradient(to right, ${color} 0%, ${color} ${((value - min) / (max - min)) * 100}%, #1e3a5f ${((value - min) / (max - min)) * 100}%, #1e3a5f 100%)`,
          borderRadius: 3, cursor: "pointer", outline: "none",
        }}
      />
    </div>
  );
}

// ── Callout ────────────────────────────────────────────────────────────────
function Callout({ icon, title, children, color = C.amber }) {
  return (
    <div style={{
      marginTop: 16, padding: "14px 18px",
      background: color + "10", border: `1px solid ${color}40`,
      borderRadius: 10, borderLeft: `4px solid ${color}`,
    }}>
      <div style={{ fontSize: 13, fontWeight: 700, color, marginBottom: 4 }}>{icon} {title}</div>
      <div style={{ fontSize: 13, color: C.text, lineHeight: 1.6 }}>{children}</div>
    </div>
  );
}

// ── Variable legend ────────────────────────────────────────────────────────
function VarRow({ sym, desc, val }) {
  return (
    <div style={{
      display: "flex", alignItems: "baseline", gap: 12,
      padding: "7px 0", borderBottom: `1px solid ${C.border}30`,
    }}>
      <span style={{
        minWidth: 90, fontFamily: "serif", fontSize: 15,
        color: C.accent, fontStyle: "italic",
      }}>{sym}</span>
      <span style={{ fontSize: 13, color: C.muted, flex: 1 }}>{desc}</span>
      {val && <span style={{ fontSize: 13, color: C.green, fontFamily: "monospace", fontStyle: "italic" }}>{val}</span>}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
export default function WindPowerApp() {
  // Section 1 params
  const [rho, setRho] = useState(1.225);
  const [radius, setRadius] = useState(40);
  const [v1, setV1] = useState(10);

  // Section 2 params
  const [cp, setCp] = useState(0.40);

  // Section 3 params (Weibull)
  const [wk, setWk] = useState(2.0);
  const [wc, setWc] = useState(7.0);

  // Section 4 params (Wind shear)
  const [vref, setVref] = useState(6.0);
  const [href, setHref] = useState(10);
  const [htarget, setHtarget] = useState(100);
  const [alpha, setAlpha] = useState(0.14);

  // Derived
  const A = Math.PI * radius * radius;
  const P_raw = windPower(rho, A, v1);
  const P_betz = cp * P_raw;
  const vh = windShear(vref, href, htarget, alpha);

  // Chart data: power vs wind speed
  const powerCurveData = Array.from({ length: 30 }, (_, i) => {
    const spd = i * 0.7 + 1;
    return {
      v: +spd.toFixed(1),
      P_raw: +(0.5 * rho * A * Math.pow(spd, 3) / 1000).toFixed(1),
      P_betz: +(cp * 0.5 * rho * A * Math.pow(spd, 3) / 1000).toFixed(1),
    };
  });

  // Chart data: Weibull
  const weibullData = Array.from({ length: 50 }, (_, i) => {
    const spd = i * 0.5;
    return {
      v: +spd.toFixed(1),
      pdf: +weibullPDF(spd, wk, wc).toFixed(4),
    };
  });

  // Chart data: wind shear profile
  const shearData = Array.from({ length: 20 }, (_, i) => {
    const h = 10 + i * 12;
    return {
      h: h,
      v: +windShear(vref, href, h, alpha).toFixed(2),
    };
  });

  // Chart: v^3 sensitivity
  const v3Data = Array.from({ length: 20 }, (_, i) => {
    const vx = i * 1.0 + 1;
    return {
      v: vx,
      ratio: +(Math.pow(vx / v1, 3)).toFixed(2),
    };
  });

  // Weibull mean speed
  const weibullMean = wc * Math.exp(0) * (Math.sqrt(Math.PI) / (2 * Math.pow(wk, 1)));

  const fmt = (n, d = 2) => n.toLocaleString("id-ID", { maximumFractionDigits: d });

  return (
    <div style={{
      minHeight: "100vh",
      background: C.bg,
      color: C.text,
      fontFamily: "'IBM Plex Sans', 'Segoe UI', system-ui, sans-serif",
      padding: "32px 24px",
      maxWidth: 960,
      margin: "0 auto",
    }}>
      {/* Header */}
      <div style={{
        textAlign: "center", marginBottom: 48,
        padding: "40px 32px",
        background: `radial-gradient(ellipse at 50% 0%, #0d2a4a 0%, ${C.bg} 70%)`,
        borderRadius: 20,
        border: `1px solid ${C.border}`,
        position: "relative", overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", top: -40, left: "50%", transform: "translateX(-50%)",
          width: 300, height: 200,
          background: `radial-gradient(ellipse, ${C.accent}15 0%, transparent 70%)`,
          pointerEvents: "none",
        }} />
        <div style={{
          display: "inline-block", padding: "4px 14px",
          background: C.accent + "20", border: `1px solid ${C.accent}50`,
          borderRadius: 20, fontSize: 12, color: C.accent,
          fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase",
          marginBottom: 16,
        }}>Fisika Energi Angin — Interactive Learning</div>
        <h1 style={{
          margin: "0 0 12px",
          fontSize: "clamp(24px, 4vw, 38px)",
          fontWeight: 800,
          background: `linear-gradient(135deg, ${C.text} 30%, ${C.accent} 100%)`,
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          letterSpacing: "-0.02em", lineHeight: 1.2,
        }}>Pemodelan Matematis Energi Angin</h1>
        <p style={{ margin: 0, color: C.muted, fontSize: 15, lineHeight: 1.6 }}>
          Eksplorasi interaktif: ubah parameter di setiap bagian dan lihat visualisasi berubah secara real-time.
        </p>
      </div>

      {/* ── SECTION 1: PERSAMAAN DASAR ──────────────────────────────────── */}
      <Section num="1" title="Persamaan Dasar Daya Angin">
        <p style={{ color: C.muted, fontSize: 14, lineHeight: 1.7, marginTop: 0 }}>
          Daya yang terkandung dalam angin yang bergerak melalui area sapuan rotor turbin dinyatakan dengan:
        </p>
        <FormulaBlock highlight>
          P = ½ · ρ · A · v³
        </FormulaBlock>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginTop: 20 }}>
          <div>
            <div style={{ marginBottom: 16, paddingBottom: 8, borderBottom: `1px solid ${C.border}` }}>
              <span style={{ fontSize: 12, color: C.accent, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>Keterangan Variabel</span>
            </div>
            <VarRow sym="P" desc="Daya yang dihasilkan" val="Watt (W)" />
            <VarRow sym="ρ (rho)" desc="Massa jenis udara" val={`${rho} kg/m³`} />
            <VarRow sym="A = π·r²" desc="Luas sapuan rotor" val={`${fmt(A, 0)} m²`} />
            <VarRow sym="v" desc="Kecepatan angin" val={`${v1} m/s`} />
          </div>

          <div>
            <div style={{ marginBottom: 8, paddingBottom: 8, borderBottom: `1px solid ${C.border}` }}>
              <span style={{ fontSize: 12, color: C.accent, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>Parameter Interaktif</span>
            </div>
            <Slider label="ρ — Massa jenis udara" value={rho} min={0.9} max={1.4} step={0.005} unit=" kg/m³" onChange={setRho} color={C.accent} />
            <Slider label="r — Jari-jari rotor" value={radius} min={10} max={80} step={1} unit=" m" onChange={setRadius} color={C.accent2} />
            <Slider label="v — Kecepatan angin" value={v1} min={1} max={20} step={0.5} unit=" m/s" onChange={setV1} color={C.green} />

            {/* result card */}
            <div style={{
              marginTop: 8, padding: "14px 18px",
              background: "#080e1c", borderRadius: 10,
              border: `1px solid ${C.green}40`,
              display: "flex", flexDirection: "column", gap: 4,
            }}>
              <span style={{ fontSize: 11, color: C.muted, letterSpacing: "0.08em", textTransform: "uppercase" }}>Daya terhitung (P)</span>
              <span style={{ fontSize: 28, fontWeight: 800, color: C.green, fontFamily: "monospace" }}>
                {P_raw >= 1e6 ? fmt(P_raw / 1e6, 3) + " MW" : P_raw >= 1000 ? fmt(P_raw / 1000, 2) + " kW" : fmt(P_raw, 0) + " W"}
              </span>
            </div>
          </div>
        </div>

        {/* Power curve chart */}
        <div style={{ marginTop: 28 }}>
          <div style={{ fontSize: 13, color: C.muted, marginBottom: 12 }}>
            <strong style={{ color: C.text }}>Kurva Daya vs Kecepatan Angin</strong>
            <span style={{ marginLeft: 8 }}>— Pengaruh v³ sangat dominan</span>
          </div>
          <div style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={powerCurveData} margin={{ top: 5, right: 20, bottom: 20, left: 20 }}>
                <defs>
                  <linearGradient id="gpRaw" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={C.accent} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={C.accent} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                <XAxis dataKey="v" stroke={C.muted} tick={{ fontSize: 11 }}>
                  <Label value="Kecepatan angin v (m/s)" position="insideBottom" offset={-14} fill={C.muted} fontSize={12} />
                </XAxis>
                <YAxis stroke={C.muted} tick={{ fontSize: 11 }}>
                  <Label value="Daya (kW)" angle={-90} position="insideLeft" offset={10} fill={C.muted} fontSize={12} />
                </YAxis>
                <Tooltip
                  contentStyle={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12 }}
                  labelFormatter={v => `v = ${v} m/s`}
                />
                <ReferenceLine x={v1} stroke={C.green} strokeDasharray="4 4" label={{ value: `v=${v1}`, fill: C.green, fontSize: 11 }} />
                <Area type="monotone" dataKey="P_raw" stroke={C.accent} fill="url(#gpRaw)" strokeWidth={2} dot={false} name="P total (kW)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <Callout icon="⚡" title="Poin Kritis: Hubungan v³" color={C.amber}>
          Daya berbanding lurus dengan <strong>pangkat tiga kecepatan angin</strong>. Jika kecepatan angin naik 2×, daya naik <strong>2³ = 8 kali lipat</strong>.
          Pada v = {v1} m/s, jika kecepatan menjadi {v1 * 2} m/s, daya akan menjadi&nbsp;
          <strong style={{ color: C.amber }}>{fmt((P_raw * 8) / 1000, 1)} kW</strong> (dari {fmt(P_raw / 1000, 2)} kW).
          Inilah mengapa akurasi pemetaan kecepatan angin sangat krusial.
        </Callout>
      </Section>

      {/* ── SECTION 2: BETZ LIMIT ────────────────────────────────────────── */}
      <Section num="2" title="Batas Betz — Efisiensi Teoretis Maksimum">
        <p style={{ color: C.muted, fontSize: 14, lineHeight: 1.7, marginTop: 0 }}>
          Angin <em>harus tetap bergerak</em> setelah melewati turbin. Fisikawan Albert Betz membuktikan bahwa efisiensi
          maksimum teoretis sebuah turbin angin adalah:
        </p>
        <FormulaBlock highlight>
          P_aktual = C_p · ½ · ρ · A · v³
        </FormulaBlock>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginTop: 16 }}>
          <div>
            <VarRow sym="C_p" desc="Koefisien daya (Power Coefficient)" val="" />
            <VarRow sym="C_p,max" desc="Batas Betz (teoretis)" val="≈ 0.593" />
            <VarRow sym="C_p,praktis" desc="Turbin modern" val="0.35 – 0.45" />

            {/* Gauge visualization */}
            <div style={{ marginTop: 20, padding: "16px", background: "#080e1c", borderRadius: 12, border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 12, color: C.muted, marginBottom: 12, textAlign: "center" }}>Efisiensi C_p</div>
              <div style={{ position: "relative", height: 20, background: "#1a2a40", borderRadius: 10, overflow: "hidden" }}>
                {/* Betz max marker */}
                <div style={{
                  position: "absolute", left: "59.3%", top: 0, bottom: 0,
                  width: 2, background: C.red, zIndex: 3,
                }} />
                {/* Current Cp bar */}
                <div style={{
                  position: "absolute", left: 0, top: 0, bottom: 0,
                  width: `${cp * 100}%`,
                  background: `linear-gradient(90deg, ${C.accent2}, ${C.accent})`,
                  borderRadius: 10, transition: "width 0.2s",
                  zIndex: 2,
                }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                <span style={{ fontSize: 11, color: C.muted }}>0</span>
                <span style={{ fontSize: 11, color: C.red }}>Betz 0.593</span>
                <span style={{ fontSize: 11, color: C.muted }}>1.0</span>
              </div>
            </div>
          </div>

          <div>
            <Slider label="C_p — Koefisien daya" value={cp} min={0.1} max={0.59} step={0.01} unit="" onChange={setCp} color={C.accent2} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 8 }}>
              <div style={{ padding: "12px 14px", background: "#080e1c", borderRadius: 10, border: `1px solid ${C.accent}40` }}>
                <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>Daya total (P_raw)</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: C.accent, fontFamily: "monospace" }}>
                  {fmt(P_raw / 1000, 2)} kW
                </div>
              </div>
              <div style={{ padding: "12px 14px", background: "#080e1c", borderRadius: 10, border: `1px solid ${C.accent2}40` }}>
                <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>Daya aktual (C_p·P)</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: C.accent2, fontFamily: "monospace" }}>
                  {fmt(P_betz / 1000, 2)} kW
                </div>
              </div>
            </div>
            <div style={{ marginTop: 10, padding: "12px 14px", background: "#080e1c", borderRadius: 10, border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>Energi yang "terbuang" (angin tetap bergerak)</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: C.amber, fontFamily: "monospace" }}>
                {fmt((P_raw - P_betz) / 1000, 2)} kW ({fmt((1 - cp) * 100, 1)}%)
              </div>
            </div>
          </div>
        </div>

        <Callout icon="🔬" title="Mengapa tidak bisa 100%?" color={C.accent}>
          Jika turbin menyerap 100% energi angin, udara akan <strong>berhenti</strong> di depan rotor — menghalangi angin
          baru masuk. Betz membuktikan bahwa rasio kecepatan optimal adalah v₂/v₁ = ⅓ (kecepatan angin setelah turbin
          = sepertiga kecepatan sebelumnya), menghasilkan C_p,max = <strong>16/27 ≈ 0.593</strong>.
        </Callout>
      </Section>

      {/* ── SECTION 3: WEIBULL ───────────────────────────────────────────── */}
      <Section num="3" title="Distribusi Weibull — Probabilitas Kecepatan Angin">
        <p style={{ color: C.muted, fontSize: 14, lineHeight: 1.7, marginTop: 0 }}>
          Angin tidak bertiup konstan. Distribusi Weibull menggambarkan probabilitas angin bertiup pada kecepatan tertentu:
        </p>
        <FormulaBlock highlight>
          f(v) = (k/c) · (v/c)^(k-1) · exp[−(v/c)^k]
        </FormulaBlock>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginTop: 16 }}>
          <div>
            <VarRow sym="v" desc="Kecepatan angin" val="m/s" />
            <VarRow sym="c" desc="Parameter skala (≈ kecepatan rata-rata)" val={`${wc} m/s`} />
            <VarRow sym="k" desc="Parameter bentuk (variabilitas)" val={`${wk}`} />

            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 12, color: C.muted, marginBottom: 8 }}>Interpretasi parameter k:</div>
              {[
                { range: "k < 1.5", desc: "Angin sangat tidak menentu (gurun)", color: C.red },
                { range: "k ≈ 2", desc: "Angin moderat (paling umum)", color: C.amber },
                { range: "k > 3", desc: "Angin sangat stabil/konsisten", color: C.green },
              ].map(item => (
                <div key={item.range} style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: item.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: item.color, fontFamily: "monospace", minWidth: 80 }}>{item.range}</span>
                  <span style={{ fontSize: 12, color: C.muted }}>{item.desc}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <Slider label="k — Parameter bentuk" value={wk} min={1} max={4} step={0.1} unit="" onChange={setWk} color={C.accent} />
            <Slider label="c — Parameter skala" value={wc} min={3} max={15} step={0.5} unit=" m/s" onChange={setWc} color={C.accent2} />
            <div style={{ padding: "14px", background: "#080e1c", borderRadius: 10, border: `1px solid ${C.border}`, marginTop: 8 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <div style={{ fontSize: 11, color: C.muted }}>Mode (paling sering)</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: C.accent, fontFamily: "monospace" }}>
                    {wk > 1 ? fmt(wc * Math.pow((wk - 1) / wk, 1 / wk), 2) : "0"} m/s
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: C.muted }}>Skala c</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: C.accent2, fontFamily: "monospace" }}>
                    {wc} m/s
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 24, height: 220 }}>
          <div style={{ fontSize: 13, color: C.muted, marginBottom: 8 }}>
            <strong style={{ color: C.text }}>Distribusi Weibull</strong>
            <span style={{ marginLeft: 8 }}>— f(v): probabilitas kecepatan angin</span>
          </div>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={weibullData} margin={{ top: 5, right: 20, bottom: 20, left: 20 }}>
              <defs>
                <linearGradient id="gpWeibull" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={C.accent2} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={C.accent2} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
              <XAxis dataKey="v" stroke={C.muted} tick={{ fontSize: 11 }}>
                <Label value="Kecepatan angin v (m/s)" position="insideBottom" offset={-14} fill={C.muted} fontSize={12} />
              </XAxis>
              <YAxis stroke={C.muted} tick={{ fontSize: 11 }}>
                <Label value="Probabilitas f(v)" angle={-90} position="insideLeft" offset={10} fill={C.muted} fontSize={12} />
              </YAxis>
              <Tooltip
                contentStyle={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12 }}
                labelFormatter={v => `v = ${v} m/s`}
                formatter={val => [val.toFixed(4), "f(v)"]}
              />
              <ReferenceLine x={wc} stroke={C.amber} strokeDasharray="4 4" label={{ value: `c=${wc}`, fill: C.amber, fontSize: 11 }} />
              <Area type="monotone" dataKey="pdf" stroke={C.accent2} fill="url(#gpWeibull)" strokeWidth={2.5} dot={false} name="f(v)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Section>

      {/* ── SECTION 4: WIND SHEAR ────────────────────────────────────────── */}
      <Section num="4" title="Ekstrapolasi Ketinggian — Wind Shear (Power Law)">
        <p style={{ color: C.muted, fontSize: 14, lineHeight: 1.7, marginTop: 0 }}>
          Data angin diukur di ketinggian rendah (10 m), namun turbin dipasang di 80–120 m. Power Law mengekstrapolasi:
        </p>
        <FormulaBlock highlight>
          v_h = v_ref · (h / h_ref)^α
        </FormulaBlock>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginTop: 16 }}>
          <div>
            <VarRow sym="v_h" desc="Kecepatan pada ketinggian h" val={`${fmt(vh, 2)} m/s`} />
            <VarRow sym="v_ref" desc="Kecepatan referensi terukur" val={`${vref} m/s @ ${href}m`} />
            <VarRow sym="α" desc="Eksponen Hellmann (kekasaran permukaan)" val={alpha} />
            <div style={{ marginTop: 14 }}>
              {[
                { terrain: "Permukaan laut / flat", alpha: "0.10–0.13" },
                { terrain: "Padang rumput terbuka", alpha: "0.14–0.16" },
                { terrain: "Pedesaan / semak", alpha: "0.20–0.25" },
                { terrain: "Hutan / perkotaan", alpha: "0.28–0.40" },
              ].map(t => (
                <div key={t.terrain} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: `1px solid ${C.border}20` }}>
                  <span style={{ fontSize: 12, color: C.muted }}>{t.terrain}</span>
                  <span style={{ fontSize: 12, color: C.accent, fontFamily: "monospace" }}>α = {t.alpha}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <Slider label="v_ref — Kec. referensi" value={vref} min={2} max={15} step={0.5} unit=" m/s" onChange={setVref} color={C.accent} />
            <Slider label="h_ref — Ketinggian referensi" value={href} min={5} max={30} step={1} unit=" m" onChange={setHref} color={C.muted} />
            <Slider label="h — Ketinggian target (hub)" value={htarget} min={20} max={200} step={5} unit=" m" onChange={setHtarget} color={C.accent2} />
            <Slider label="α — Eksponen Hellmann" value={alpha} min={0.05} max={0.45} step={0.01} unit="" onChange={setAlpha} color={C.amber} />
            <div style={{ padding: "14px", background: "#080e1c", borderRadius: 10, border: `1px solid ${C.green}40`, marginTop: 4 }}>
              <div style={{ fontSize: 11, color: C.muted }}>Kecepatan pada ketinggian {htarget} m</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: C.green, fontFamily: "monospace" }}>
                {fmt(vh, 2)} m/s
              </div>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
                ↑ {fmt(((vh - vref) / vref) * 100, 1)}% lebih tinggi dari referensi {vref} m/s
              </div>
            </div>
          </div>
        </div>

        {/* Shear profile chart */}
        <div style={{ marginTop: 24, height: 220 }}>
          <div style={{ fontSize: 13, color: C.muted, marginBottom: 8 }}>
            <strong style={{ color: C.text }}>Profil Kecepatan Vertikal</strong>
            <span style={{ marginLeft: 8 }}>— kecepatan meningkat dengan ketinggian</span>
          </div>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={shearData} layout="vertical" margin={{ top: 5, right: 30, bottom: 20, left: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
              <XAxis type="number" dataKey="v" stroke={C.muted} tick={{ fontSize: 11 }}>
                <Label value="Kecepatan (m/s)" position="insideBottom" offset={-14} fill={C.muted} fontSize={12} />
              </XAxis>
              <YAxis type="number" dataKey="h" stroke={C.muted} tick={{ fontSize: 11 }}>
                <Label value="Ketinggian (m)" angle={-90} position="insideLeft" offset={10} fill={C.muted} fontSize={12} />
              </YAxis>
              <Tooltip
                contentStyle={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12 }}
                formatter={(val, name) => [`${val} m/s`, "Kecepatan"]}
                labelFormatter={v => `h = ${v} m`}
              />
              <ReferenceLine y={htarget} stroke={C.accent2} strokeDasharray="4 4" label={{ value: `hub ${htarget}m`, fill: C.accent2, fontSize: 11 }} />
              <ReferenceLine y={href} stroke={C.amber} strokeDasharray="4 4" label={{ value: `ref ${href}m`, fill: C.amber, fontSize: 11 }} />
              <Line type="monotone" dataKey="v" stroke={C.accent} strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Section>

      {/* ── SECTION 5: AEP ───────────────────────────────────────────────── */}
      <Section num="5" title="Estimasi Energi Tahunan (Annual Energy Production — AEP)">
        <p style={{ color: C.muted, fontSize: 14, lineHeight: 1.7, marginTop: 0 }}>
          Nilai ekonomi pembangkit angin dihitung melalui <strong style={{ color: C.text }}>AEP</strong> — total energi yang
          dihasilkan dalam satu tahun dengan mempertimbangkan distribusi kecepatan angin:
        </p>
        <FormulaBlock highlight>
          E_annual = Σ [ P(v) · f(v) · 8760 ]
        </FormulaBlock>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginTop: 16 }}>
          <div>
            <VarRow sym="E_annual" desc="Energi tahunan total" val="Wh/tahun" />
            <VarRow sym="P(v)" desc="Daya pada kecepatan v (Power Curve)" val="" />
            <VarRow sym="f(v)" desc="Probabilitas Weibull pada kecepatan v" val="" />
            <VarRow sym="8760" desc="Jumlah jam dalam 1 tahun" val="jam" />
          </div>

          <div>
            {/* AEP estimate */}
            {(() => {
              const dv = 0.5;
              let aep = 0;
              for (let v = 0.5; v <= 25; v += dv) {
                const p = cp * 0.5 * rho * A * Math.pow(v, 3);
                const fv = weibullPDF(v, wk, wc);
                aep += p * fv * 8760 * dv;
              }
              const aepMWh = aep / 1e6;
              const capacityFactor = (aepMWh / (cp * 0.5 * rho * A * Math.pow(wc, 3) * 8760 / 1e6)) * 100;

              return (
                <>
                  <div style={{ padding: "16px", background: "#080e1c", borderRadius: 12, border: `1px solid ${C.green}50` }}>
                    <div style={{ fontSize: 11, color: C.muted, marginBottom: 4, letterSpacing: "0.08em", textTransform: "uppercase" }}>AEP Estimasi (dengan parameter saat ini)</div>
                    <div style={{ fontSize: 32, fontWeight: 800, color: C.green, fontFamily: "monospace", lineHeight: 1 }}>
                      {fmt(aepMWh, 1)} MWh
                    </div>
                    <div style={{ fontSize: 12, color: C.muted, marginTop: 6 }}>
                      ≈ {fmt(aepMWh * 1000, 0)} kWh / tahun
                    </div>
                  </div>
                  <div style={{ marginTop: 10, padding: "14px", background: "#080e1c", borderRadius: 10, border: `1px solid ${C.border}` }}>
                    <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>Parameter yang digunakan</div>
                    <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.8, fontFamily: "monospace" }}>
                      ρ = {rho} · A = {fmt(A, 0)} m² · C_p = {cp}<br />
                      k = {wk} · c = {wc} m/s (Weibull)
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>

        {/* AEP breakdown chart */}
        {(() => {
          const aepData = Array.from({ length: 20 }, (_, i) => {
            const v = i * 1.0 + 0.5;
            const pKw = cp * 0.5 * rho * A * Math.pow(v, 3) / 1000;
            const fv = weibullPDF(v, wk, wc);
            const contrib = pKw * fv * 8760;
            return { v: +v.toFixed(1), contribution: +contrib.toFixed(0), pdf: +(fv * 100).toFixed(3) };
          });

          return (
            <div style={{ marginTop: 24 }}>
              <div style={{ fontSize: 13, color: C.muted, marginBottom: 8 }}>
                <strong style={{ color: C.text }}>Kontribusi Energi per Kecepatan Angin</strong>
                <span style={{ marginLeft: 8 }}>— P(v) × f(v) × 8760</span>
              </div>
              <div style={{ height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={aepData} margin={{ top: 5, right: 20, bottom: 20, left: 20 }}>
                    <defs>
                      <linearGradient id="gpAep" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={C.green} stopOpacity={0.4} />
                        <stop offset="95%" stopColor={C.green} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                    <XAxis dataKey="v" stroke={C.muted} tick={{ fontSize: 11 }}>
                      <Label value="Kecepatan angin v (m/s)" position="insideBottom" offset={-14} fill={C.muted} fontSize={12} />
                    </XAxis>
                    <YAxis stroke={C.muted} tick={{ fontSize: 11 }}>
                      <Label value="Kontribusi Energi (kWh)" angle={-90} position="insideLeft" offset={10} fill={C.muted} fontSize={12} />
                    </YAxis>
                    <Tooltip
                      contentStyle={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12 }}
                      labelFormatter={v => `v = ${v} m/s`}
                      formatter={(val, name) => [fmt(val, 0) + " kWh", "Kontribusi"]}
                    />
                    <Area type="monotone" dataKey="contribution" stroke={C.green} fill="url(#gpAep)" strokeWidth={2} dot={false} name="Kontribusi (kWh)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          );
        })()}

        <Callout icon="💡" title="Mengapa integrasi diperlukan?" color={C.green}>
          AEP bukan sekadar P(v_rata²) × 8760. Karena distribusi kecepatan angin <strong>tidak merata</strong> (mengikuti Weibull),
          dan daya berhubungan dengan v³, kita perlu menjumlahkan kontribusi di setiap interval kecepatan. Kecepatan angin di sekitar
          nilai <em>c</em> (skala Weibull) memberikan kontribusi terbesar terhadap AEP total.
        </Callout>
      </Section>

      {/* Footer */}
      <div style={{
        textAlign: "center", padding: "24px",
        color: C.muted, fontSize: 12,
        borderTop: `1px solid ${C.border}`,
        marginTop: 8,
      }}>
        Pemodelan Matematis Energi Angin — Interactive Learning Tool
        <br /><span style={{ fontSize: 11, opacity: 0.6 }}>Semua kalkulasi dilakukan real-time berdasarkan parameter yang Anda atur</span>
      </div>
    </div>
  );
}
