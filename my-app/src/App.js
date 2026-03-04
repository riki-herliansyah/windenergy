import { useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area, ReferenceLine, Label,
  BarChart, Bar, Legend, Cell
} from "recharts";

// ── palette (restored original) ───────────────────────────────────────────────
const C = {
  bg:      "#0a0f1e",
  panel:   "#0f1829",
  border:  "#1e3a5f",
  accent:  "#00c9ff",
  accent2: "#7b2ff7",
  green:   "#00e5a0",
  amber:   "#f59e0b",
  red:     "#ef4444",
  text:    "#e2e8f0",   // main body — light grey/white, high contrast on dark bg
  muted:   "#94a3b8",   // secondary — slate-400, still readable
  card:    "#111d35",
};

// ── math helpers ──────────────────────────────────────────────────────────────
const windPower  = (rho, A, v) => 0.5 * rho * A * Math.pow(v, 3);
const weibullPDF = (v, k, c)   => v > 0 ? (k/c)*Math.pow(v/c,k-1)*Math.exp(-Math.pow(v/c,k)) : 0;
const windShear  = (vref, href, h, alpha) => vref * Math.pow(h / href, alpha);
const arithMean  = (arr) => arr.reduce((a,b)=>a+b,0) / arr.length;
// Corrected "geometric" mean for wind power: (1/n · Σv²)^(1/3)
const energyMean = (arr) => Math.pow(arr.reduce((s,v)=>s+v*v,0)/arr.length, 1/3);
const fmt        = (n, d=2) => Number(n).toLocaleString("id-ID", { maximumFractionDigits: d });

// ── shared text styles ────────────────────────────────────────────────────────
const bodyStyle  = { fontSize:14, color:"#e2e8f0", lineHeight:1.75, marginTop:0 };
const mutedStyle = { fontSize:13, color:"#94a3b8", lineHeight:1.7 };

// ── reusable components ───────────────────────────────────────────────────────
function Formula({ children, size=22 }) {
  return (
    <span style={{
      fontFamily:"'STIX Two Math','Latin Modern Math',Georgia,serif",
      fontSize:size, color:C.accent, letterSpacing:"0.02em", lineHeight:1.6,
    }}>{children}</span>
  );
}

function FormulaBlock({ children, highlight }) {
  return (
    <div style={{
      margin:"16px 0", padding:"18px 24px",
      background: highlight ? "linear-gradient(135deg,#0a1f3c,#0f1829)" : "#080e1c",
      borderRadius:12,
      border:`1px solid ${highlight ? C.accent+"60" : C.border}`,
      borderLeft:`4px solid ${highlight ? C.accent : C.border}`,
      display:"flex", alignItems:"center", justifyContent:"center",
    }}>
      <Formula size={22}>{children}</Formula>
    </div>
  );
}

function Section({ num, title, children }) {
  return (
    <div style={{ marginBottom:40, borderRadius:16, overflow:"hidden", border:`1px solid ${C.border}`, background:C.panel }}>
      <div style={{
        padding:"18px 28px",
        background:"linear-gradient(135deg,#0d1f3c,#0a1628)",
        borderBottom:`1px solid ${C.border}`,
        display:"flex", alignItems:"center", gap:14,
      }}>
        <div style={{
          width:36, height:36, borderRadius:"50%",
          background:`linear-gradient(135deg,${C.accent},${C.accent2})`,
          display:"flex", alignItems:"center", justifyContent:"center",
          fontFamily:"monospace", fontSize:14, fontWeight:800, color:"#fff", flexShrink:0,
        }}>{num}</div>
        <h2 style={{ margin:0, fontSize:18, fontWeight:700, color:"#ffffff", letterSpacing:"-0.01em" }}>{title}</h2>
      </div>
      <div style={{ padding:"24px 28px" }}>{children}</div>
    </div>
  );
}

function Callout({ icon, title, children, color=C.amber }) {
  return (
    <div style={{
      marginTop:16, padding:"14px 18px",
      background:color+"15", border:`1px solid ${color}50`,
      borderRadius:10, borderLeft:`4px solid ${color}`,
    }}>
      <div style={{ fontSize:13, fontWeight:700, color, marginBottom:4 }}>{icon} {title}</div>
      <div style={{ fontSize:13, color:C.text, lineHeight:1.7 }}>{children}</div>
    </div>
  );
}

function Slider({ label, value, min, max, step, unit, onChange, color=C.accent }) {
  return (
    <div style={{ marginBottom:16 }}>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
        <span style={{ fontSize:13, color:C.muted, fontFamily:"monospace" }}>{label}</span>
        <span style={{
          fontSize:14, fontWeight:700, color, fontFamily:"monospace",
          background:"#080e1c", padding:"2px 10px", borderRadius:6, border:`1px solid ${color}40`,
        }}>{value}{unit}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e=>onChange(Number(e.target.value))}
        style={{
          width:"100%", height:6, appearance:"none",
          background:`linear-gradient(to right,${color} ${((value-min)/(max-min))*100}%,#1e3a5f ${((value-min)/(max-min))*100}%)`,
          borderRadius:3, cursor:"pointer", outline:"none",
        }}
      />
    </div>
  );
}

function VarRow({ sym, desc, val }) {
  return (
    <div style={{ display:"flex", alignItems:"baseline", gap:12, padding:"7px 0", borderBottom:`1px solid ${C.border}30` }}>
      <span style={{ minWidth:90, fontFamily:"serif", fontSize:15, color:C.accent, fontStyle:"italic" }}>{sym}</span>
      <span style={{ fontSize:13, color:C.muted, flex:1 }}>{desc}</span>
      {val && <span style={{ fontSize:13, color:C.green, fontFamily:"monospace" }}>{val}</span>}
    </div>
  );
}

// ── INTRO SLIDES ──────────────────────────────────────────────────────────────
function IntroSlides() {
  const [slide, setSlide] = useState(0);

  const windRegions = [
    { region:"NTT / Kupang",           v:7.0, color:"#00e5a0" },
    { region:"NTB / Lombok",           v:6.3, color:"#00e5a0" },
    { region:"Sulawesi Selatan",       v:5.8, color:C.accent  },
    { region:"Jawa Tengah (pesisir)",  v:5.2, color:C.accent  },
    { region:"Kalimantan Timur",       v:4.5, color:C.amber   },
    { region:"Sumatera Utara",         v:4.1, color:C.amber   },
    { region:"Papua Barat",            v:3.9, color:C.amber   },
  ];

  const slides = [
    // Slide 0 ─ Pengantar Energi Angin
    <div key="s0">
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:24 }}>
        <div>
          <p style={bodyStyle}>
            Energi angin adalah energi kinetik massa udara yang bergerak. Termasuk kelompok{" "}
            <strong style={{color:C.accent}}>energi terbarukan</strong> karena sumbernya —
            pergerakan atmosfer yang ditenagai panas matahari — tidak akan habis dalam skala
            waktu manusia.
          </p>
          <p style={bodyStyle}>
            Turbin angin mengonversi energi kinetik menjadi energi mekanik (putaran rotor),
            lalu menjadi listrik melalui generator. Kapasitas terpasang dunia melampaui{" "}
            <strong style={{color:C.green}}>1.000 GW</strong> pada 2023 dan tumbuh ~10%/tahun.
          </p>
          <p style={bodyStyle}>
            Indonesia memiliki potensi angin signifikan di kawasan timur, menjadikan PLTA angin
            relevan untuk elektrifikasi daerah terpencil yang bergantung pada diesel berbiaya tinggi.
          </p>
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {[
            { icon:"🌀", title:"Sumber terbarukan",  desc:"Tidak menghasilkan emisi karbon saat operasi" },
            { icon:"📐", title:"Skalabel",            desc:"Dari 1 kW (rumah) hingga 15 MW (offshore)" },
            { icon:"💰", title:"LCOE kompetitif",     desc:"Di bawah Rp 1.000/kWh di lokasi yang tepat" },
            { icon:"🏝️", title:"Relevan untuk RI",    desc:"Ideal untuk pulau terpencil Indonesia Timur" },
          ].map(item=>(
            <div key={item.title} style={{
              display:"flex", gap:12, padding:"10px 14px",
              background:"#080e1c", borderRadius:10, border:`1px solid ${C.border}`,
            }}>
              <span style={{ fontSize:20 }}>{item.icon}</span>
              <div>
                <div style={{ fontSize:13, fontWeight:700, color:C.text, marginBottom:2 }}>{item.title}</div>
                <div style={{ fontSize:12, color:C.muted }}>{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ marginTop:20, padding:"16px 20px", background:"#080e1c", borderRadius:12, border:`1px solid ${C.border}` }}>
        <div style={{ fontSize:12, color:C.accent, fontWeight:700, marginBottom:12, letterSpacing:"0.08em", textTransform:"uppercase" }}>
          Alur Konversi Energi
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
          {[
            { label:"Energi Kinetik",  sub:"½mv²",                   color:C.accent  },
            "→",
            { label:"Rotor Berputar",  sub:"Torsi mekanik",           color:C.accent2 },
            "→",
            { label:"Gearbox",         sub:"Penyesuai RPM",           color:C.amber   },
            "→",
            { label:"Generator",       sub:"Induksi elektromagnetik", color:C.green   },
            "→",
            { label:"Listrik AC",      sub:"Grid / Baterai",          color:C.text    },
          ].map((item,i)=> typeof item==="string"
            ? <span key={i} style={{ color:C.muted, fontSize:18 }}>{item}</span>
            : (
              <div key={i} style={{
                padding:"8px 12px", borderRadius:8, textAlign:"center", minWidth:90,
                background:item.color+"15", border:`1px solid ${item.color}50`,
              }}>
                <div style={{ fontSize:11, fontWeight:700, color:item.color }}>{item.label}</div>
                <div style={{ fontSize:10, color:C.muted, marginTop:2 }}>{item.sub}</div>
              </div>
            )
          )}
        </div>
      </div>
    </div>,

    // Slide 1 ─ Angin di Indonesia
    <div key="s1">
      <p style={bodyStyle}>
        Indonesia berada di zona khatulistiwa dengan pola angin dipengaruhi monsun barat dan timur.
        Kawasan <strong style={{color:C.accent}}>Nusa Tenggara, Sulawesi Selatan, dan pesisir
        selatan Jawa</strong> mencatat kecepatan rata-rata {">"} 5 m/s pada 80 m — ambang minimum
        turbin skala utilitas.
      </p>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:24 }}>
        <div>
          <div style={{ fontSize:12, color:C.accent, fontWeight:700, marginBottom:10, letterSpacing:"0.08em", textTransform:"uppercase" }}>
            Kecepatan Rata-rata per Wilayah (80 m)
          </div>
          <div style={{ height:240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={windRegions} layout="vertical" margin={{top:0,right:40,bottom:0,left:10}}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                <XAxis type="number" domain={[0,9]} stroke={C.muted} tick={{fontSize:10}} unit=" m/s" />
                <YAxis type="category" dataKey="region" stroke={C.muted} tick={{fontSize:9, fill:C.text}} width={135} />
                <Tooltip contentStyle={{background:C.card,border:`1px solid ${C.border}`,borderRadius:8,fontSize:12}} formatter={v=>[`${v} m/s`,"Kecepatan"]} />
                <ReferenceLine x={5} stroke={C.amber} strokeDasharray="4 4" label={{value:"≥5 m/s",fill:C.amber,fontSize:10}} />
                <Bar dataKey="v" radius={[0,4,4,0]}>
                  {windRegions.map((r,i)=><Cell key={i} fill={r.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div style={{ fontSize:11, color:C.muted, marginTop:6, fontStyle:"italic" }}>
            * Estimasi berdasarkan data BMKG & Global Wind Atlas
          </div>
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {[
            { stat:"60,6 GW", desc:"Potensi teknis energi angin Indonesia (ESDM 2023)",          color:C.green  },
            { stat:"154 MW",  desc:"Kapasitas terpasang 2023 — baru 0,25% dari potensi",         color:C.accent },
            { stat:"4–7 m/s", desc:"Rentang kecepatan rata-rata tahunan sebagian besar wilayah", color:C.text   },
            { stat:"75 MW",   desc:"PLTB Sidrap, Sulsel — proyek komersial pertama (2018)",      color:C.amber  },
          ].map(item=>(
            <div key={item.stat} style={{
              padding:"12px 16px", background:"#080e1c",
              borderRadius:10, border:`1px solid ${C.border}`,
              borderLeft:`3px solid ${item.color}`,
            }}>
              <div style={{ fontSize:20, fontWeight:800, color:item.color, fontFamily:"monospace" }}>{item.stat}</div>
              <div style={{ fontSize:12, color:C.muted, marginTop:3 }}>{item.desc}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ marginTop:16, padding:"14px 18px", background:"#080e1c", borderRadius:10, border:`1px solid ${C.border}`, borderLeft:`4px solid ${C.amber}` }}>
        <div style={{ fontSize:13, fontWeight:700, color:C.amber, marginBottom:8 }}>⚠️ Tantangan Pengembangan di Indonesia</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
          {[
            "Kecepatan angin relatif rendah (4–7 vs 8–11 m/s di Eropa)",
            "Infrastruktur transmisi terbatas di wilayah potensi tinggi (NTT, NTB)",
            "Topografi berbukit meningkatkan turbulensi dan kompleksitas site assessment",
          ].map(t=>(
            <div key={t} style={{ fontSize:12, color:C.text, lineHeight:1.6 }}>• {t}</div>
          ))}
        </div>
      </div>
    </div>,
  ];

  return (
    <Section num="★" title={slide===0 ? "Pengantar: Energi Angin" : "Kecepatan Angin di Indonesia"}>
      {slides[slide]}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:24 }}>
        <button onClick={()=>setSlide(s=>Math.max(0,s-1))} disabled={slide===0} style={{
          padding:"8px 20px", borderRadius:8, border:`1px solid ${C.border}`,
          background: slide===0 ? "#080e1c" : C.accent+"20",
          color: slide===0 ? C.muted : C.accent,
          cursor: slide===0 ? "default" : "pointer", fontSize:13, fontWeight:600,
        }}>← Sebelumnya</button>
        <div style={{ display:"flex", gap:8 }}>
          {[0,1].map(i=>(
            <div key={i} onClick={()=>setSlide(i)} style={{
              width: slide===i ? 24 : 8, height:8, borderRadius:4,
              background: slide===i ? C.accent : C.border,
              cursor:"pointer", transition:"width 0.2s",
            }} />
          ))}
        </div>
        <button onClick={()=>setSlide(s=>Math.min(1,s+1))} disabled={slide===1} style={{
          padding:"8px 20px", borderRadius:8, border:`1px solid ${C.border}`,
          background: slide===1 ? "#080e1c" : C.accent+"20",
          color: slide===1 ? C.muted : C.accent,
          cursor: slide===1 ? "default" : "pointer", fontSize:13, fontWeight:600,
        }}>Selanjutnya →</button>
      </div>
    </Section>
  );
}

// ── MEAN COMPARISON ───────────────────────────────────────────────────────────
function MeanSection() {
  const [speeds, setSpeeds] = useState([4, 6, 5, 9, 3, 8]);
  const upd = (i, v) => { const s=[...speeds]; s[i]=v; setSpeeds(s); };

  const rho = 1.225, A = Math.PI * 40 * 40;
  const am    = arithMean(speeds);                     // standard arithmetic mean
  const em    = energyMean(speeds);                    // (1/n · Σv²)^(1/3)
  const P_am  = 0.5 * rho * A * Math.pow(am, 3);
  const P_em  = 0.5 * rho * A * Math.pow(em, 3);      // ½ρA · [(1/n·Σv²)^(1/3)]³ = ½ρA · (1/n·Σv²)
  const P_true = speeds.reduce((s,v)=>s + 0.5*rho*A*Math.pow(v,3), 0) / speeds.length;

  // Note: (1/n·Σv²)^(1/3) cubed = 1/n·Σv², so P_em = ½ρA·(1/n·Σv²)
  const err_am = (P_am  - P_true) / P_true * 100;
  const err_em = (P_em  - P_true) / P_true * 100;

  const chartData = speeds.map((v,i)=>({
    name:`v${i+1}=${v}`,
    "P aktual":   +(0.5*rho*A*Math.pow(v,3)/1000).toFixed(1),
    "P dari AM":  +(P_am /1000).toFixed(1),
    "P dari EM":  +(P_em /1000).toFixed(1),
  }));

  return (
    <Section num="0" title="Rata-rata Aritmetik vs Energy-Mean dalam Estimasi Daya Angin">
      <p style={bodyStyle}>
        Karena daya angin ∝ <strong style={{color:C.accent}}>v³</strong>, pilihan metode rata-rata
        untuk merepresentasikan kecepatan angin sangat mempengaruhi akurasi estimasi. Dua
        pendekatan yang dibandingkan di sini:
      </p>

      {/* Definition cards */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:20 }}>
        <div style={{ padding:"16px", background:"#080e1c", borderRadius:12, border:`1px solid ${C.accent}40`, borderTop:`3px solid ${C.accent}` }}>
          <div style={{ fontSize:13, fontWeight:700, color:C.accent, marginBottom:10 }}>📊 Rata-rata Aritmetik</div>
          <div style={{ textAlign:"center", marginBottom:10 }}>
            <Formula size={17}>v̄_AM = (1/n) · Σ vᵢ</Formula>
          </div>
          <p style={{ fontSize:12, color:C.muted, margin:0, lineHeight:1.65 }}>
            Jumlah seluruh nilai dibagi banyak data. Familiar dan mudah dihitung.
            Cocok untuk hubungan <strong style={{color:C.text}}>linier</strong> — kurang tepat untuk v³.
          </p>
        </div>
        <div style={{ padding:"16px", background:"#080e1c", borderRadius:12, border:`1px solid ${C.green}40`, borderTop:`3px solid ${C.green}` }}>
          <div style={{ fontSize:13, fontWeight:700, color:C.green, marginBottom:10 }}>📐 Energy-Mean (Rata-rata Kuadratik Kubik)</div>
          <div style={{ textAlign:"center", marginBottom:10 }}>
            <Formula size={17}>v̄_EM = [ (1/n) · Σ v² ]^(1/3)</Formula>
          </div>
          <p style={{ fontSize:12, color:C.muted, margin:0, lineHeight:1.65 }}>
            Akar kubik dari rata-rata kuadrat kecepatan. Lebih tepat karena mempertimbangkan
            bobot <strong style={{color:C.text}}>v² dalam perhitungan daya</strong>. Meminimalkan
            bias pada distribusi kecepatan tidak merata.
          </p>
        </div>
      </div>

      {/* Why it matters */}
      <div style={{ padding:"16px 20px", background:"linear-gradient(135deg,#0a1f3c,#0f1829)", borderRadius:12, border:`1px solid ${C.accent}40`, marginBottom:20 }}>
        <div style={{ fontSize:13, fontWeight:700, color:C.accent, marginBottom:12 }}>
          🔑 Mengapa pilihan rata-rata penting? — Hubungan dengan Persamaan Daya
        </div>
        <p style={{ fontSize:13, color:C.text, margin:"0 0 14px", lineHeight:1.7 }}>
          Daya turbin adalah <Formula size={14}>P = ½ρAv³</Formula>. Jika kita mensubstitusi
          v̄_EM ke dalam persamaan daya:
        </p>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
          <div style={{ padding:"12px 16px", background:"#050b18", borderRadius:8, border:`1px solid ${C.border}` }}>
            <div style={{ fontSize:11, color:C.muted, marginBottom:6 }}>Substitusi v̄_EM → daya:</div>
            <Formula size={14}>P(v̄_EM) = ½ρA · [( (1/n)·Σv² )^(1/3)]³</Formula>
            <div style={{ marginTop:8 }}>
              <Formula size={14}>= ½ρA · (1/n) · Σv²</Formula>
            </div>
          </div>
          <div style={{ padding:"12px 16px", background:"#050b18", borderRadius:8, border:`1px solid ${C.border}` }}>
            <div style={{ fontSize:11, color:C.muted, marginBottom:6 }}>Rata-rata daya "benar":</div>
            <Formula size={14}>P̄_aktual = (1/n) · Σ P(vᵢ)</Formula>
            <div style={{ marginTop:8 }}>
              <Formula size={14}>= ½ρA · (1/n) · Σv³</Formula>
            </div>
          </div>
        </div>
        <div style={{ marginTop:14, padding:"10px 14px", background:"#050b18", borderRadius:8, border:`1px solid ${C.amber}40` }}>
          <div style={{ fontSize:12, color:C.amber, fontWeight:600, marginBottom:4 }}>⚠️ Catatan penting</div>
          <div style={{ fontSize:13, color:C.text, lineHeight:1.7 }}>
            Secara matematis, v̄_EM menghasilkan <Formula size={13}>½ρA·(Σv²/n)</Formula> bukan{" "}
            <Formula size={13}>½ρA·(Σv³/n)</Formula>. Keduanya masih merupakan <em>aproksimasi</em>.
            Cara paling akurat tetap menghitung{" "}
            <Formula size={13}>P̄ = (1/n)·Σ½ρAvᵢ³</Formula> langsung,
            atau menggunakan distribusi Weibull untuk integrasi kontinu.
          </div>
        </div>
      </div>

      {/* Interactive sliders */}
      <div style={{ fontSize:12, color:C.accent, fontWeight:700, marginBottom:12, letterSpacing:"0.08em", textTransform:"uppercase" }}>
        Eksplorasi Interaktif — Atur 6 Sampel Kecepatan Angin
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, marginBottom:20 }}>
        {speeds.map((v,i)=>(
          <Slider key={i} label={`v${i+1}`} value={v} min={1} max={15} step={0.5} unit=" m/s"
            onChange={val=>upd(i,val)} color={i%2===0?C.accent:C.accent2} />
        ))}
      </div>

      {/* Result cards */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:14, marginBottom:24 }}>
        {[
          {
            label:"Rata-rata Aritmetik",
            badge:"v̄_AM",
            mean:`= ${fmt(am,2)} m/s`,
            power: P_am,
            err: err_am,
            color: C.accent,
            note:"P(v̄_AM) — ½ρA·v̄³",
          },
          {
            label:"Energy-Mean",
            badge:"v̄_EM",
            mean:`= ${fmt(em,2)} m/s`,
            power: P_em,
            err: err_em,
            color: C.green,
            note:"P(v̄_EM) = ½ρA·(Σv²/n)",
          },
          {
            label:"Rata-rata Daya Aktual",
            badge:"P̄",
            mean:`= Σ P(vᵢ)/n`,
            power: P_true,
            err: 0,
            color: C.amber,
            note:"Nilai referensi paling akurat",
          },
        ].map(item=>(
          <div key={item.label} style={{
            padding:"16px", background:"#080e1c", borderRadius:12,
            border:`1px solid ${item.color}50`, borderTop:`3px solid ${item.color}`,
          }}>
            <div style={{ fontSize:12, fontWeight:700, color:item.color, marginBottom:4 }}>{item.label}</div>
            <div style={{ fontSize:12, color:C.muted, fontFamily:"monospace", marginBottom:8 }}>
              <span style={{color:C.accent}}>{item.badge}</span> {item.mean}
            </div>
            <div style={{ fontSize:26, fontWeight:800, color:item.color, fontFamily:"monospace", lineHeight:1 }}>
              {fmt(item.power/1000,2)} kW
            </div>
            <div style={{ marginTop:8, fontSize:12, color: item.err===0?C.amber : item.err<-0.1?C.red:C.green }}>
              {item.err===0
                ? "✓ Referensi"
                : item.err<0
                  ? `▼ ${fmt(Math.abs(item.err),1)}% terlalu rendah`
                  : `▲ ${fmt(item.err,1)}% terlalu tinggi`}
            </div>
            <div style={{ fontSize:11, color:C.muted, marginTop:4 }}>{item.note}</div>
          </div>
        ))}
      </div>

      {/* Bar chart */}
      <div style={{ height:240, marginBottom:20 }}>
        <div style={{ fontSize:13, color:C.muted, marginBottom:8 }}>
          <strong style={{color:C.text}}>P(vᵢ) Aktual vs Estimasi dari Rata-rata</strong>
          <span style={{ marginLeft:8 }}>— batang horizontal = estimasi dari 1 nilai mean</span>
        </div>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{top:5,right:20,bottom:20,left:20}}>
            <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
            <XAxis dataKey="name" stroke={C.muted} tick={{fontSize:10, fill:C.text}} />
            <YAxis stroke={C.muted} tick={{fontSize:10, fill:C.text}}>
              <Label value="Daya (kW)" angle={-90} position="insideLeft" offset={10} fill={C.muted} fontSize={11} />
            </YAxis>
            <Tooltip contentStyle={{background:C.card,border:`1px solid ${C.border}`,borderRadius:8,fontSize:12}} />
            <Legend wrapperStyle={{fontSize:12, color:C.muted}} />
            <Bar dataKey="P aktual"  fill={C.amber}  radius={[4,4,0,0]} />
            <Bar dataKey="P dari AM" fill={C.accent}  radius={[4,4,0,0]} opacity={0.75} />
            <Bar dataKey="P dari EM" fill={C.green}   radius={[4,4,0,0]} opacity={0.75} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Summary table */}
      <div style={{ padding:"16px", background:"#080e1c", borderRadius:12, border:`1px solid ${C.border}`, marginBottom:8 }}>
        <div style={{ fontSize:13, fontWeight:700, color:C.text, marginBottom:12 }}>
          Ringkasan Numerik — ρ = 1.225 kg/m³, r = 40 m → A = {fmt(Math.PI*1600,0)} m²
        </div>
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
          <thead>
            <tr>
              {["Metode","Formula kec. efektif","Kec. efektif","Daya estimasi","Selisih vs aktual"].map(h=>(
                <th key={h} style={{ padding:"8px 12px", background:`${C.border}40`, color:C.accent, textAlign:"left", borderBottom:`1px solid ${C.border}` }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              { m:"Aritmetik",      f:"(Σvᵢ)/n",            sp:fmt(am,2)+" m/s",  pw:fmt(P_am/1000,2)+" kW",   e:err_am },
              { m:"Energy-Mean",    f:"[(1/n)·Σv²]^(1/3)",  sp:fmt(em,2)+" m/s",  pw:fmt(P_em/1000,2)+" kW",   e:err_em },
              { m:"Aktual (benar)", f:"—",                   sp:"—",               pw:fmt(P_true/1000,2)+" kW", e:0 },
            ].map((row,i)=>{
              const ec = row.e===0 ? C.amber : Math.abs(row.e) < Math.abs(err_am) ? C.green : C.accent;
              return (
                <tr key={i} style={{ background: i%2===0?"#080e1c":"#060b16" }}>
                  <td style={{ padding:"8px 12px", color:C.text, fontWeight:600 }}>{row.m}</td>
                  <td style={{ padding:"8px 12px", color:C.muted, fontFamily:"monospace" }}>{row.f}</td>
                  <td style={{ padding:"8px 12px", color:C.accent, fontFamily:"monospace" }}>{row.sp}</td>
                  <td style={{ padding:"8px 12px", color:C.green, fontFamily:"monospace", fontWeight:700 }}>{row.pw}</td>
                  <td style={{ padding:"8px 12px", color:ec, fontFamily:"monospace", fontWeight:700 }}>
                    {row.e===0 ? "0% ✓" : `${row.e>=0?"+":""}${fmt(row.e,1)}%`}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Callout icon="✅" title="Kesimpulan Praktis" color={C.green}>
        <ul style={{ margin:"4px 0", paddingLeft:20, lineHeight:2.0 }}>
          <li>
            <strong>Aritmetik (Σvᵢ/n)</strong>: selalu <em>mengecilkan</em> daya karena tidak
            memperhitungkan dominasi v³ dari kecepatan tinggi.
          </li>
          <li>
            <strong>Energy-Mean [(1/n·Σv²)^(1/3)]</strong>: lebih tepat secara fisika —
            mewakili kecepatan efektif yang menghasilkan daya rata-rata setara dengan Σv²/n.
          </li>
          <li>
            <strong>Cara terbaik</strong>: hitung P(vᵢ) untuk setiap data lalu rata-ratakan,
            atau gunakan distribusi Weibull untuk integrasi kontinu (Bagian 3 & 5).
          </li>
        </ul>
      </Callout>
    </Section>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
export default function WindPowerApp() {
  const [rho,     setRho]     = useState(1.225);
  const [radius,  setRadius]  = useState(40);
  const [v1,      setV1]      = useState(10);
  const [cp,      setCp]      = useState(0.40);
  const [wk,      setWk]      = useState(2.0);
  const [wc,      setWc]      = useState(7.0);
  const [vref,    setVref]    = useState(6.0);
  const [href,    setHref]    = useState(10);
  const [htarget, setHtarget] = useState(100);
  const [alpha,   setAlpha]   = useState(0.14);

  const A      = Math.PI * radius * radius;
  const P_raw  = windPower(rho, A, v1);
  const P_betz = cp * P_raw;
  const vh     = windShear(vref, href, htarget, alpha);

  const powerCurveData = Array.from({length:30},(_,i)=>{
    const s=i*0.7+1;
    return { v:+s.toFixed(1), P_raw:+(0.5*rho*A*Math.pow(s,3)/1000).toFixed(1) };
  });
  const weibullData = Array.from({length:50},(_,i)=>{
    const s=i*0.5;
    return { v:+s.toFixed(1), pdf:+weibullPDF(s,wk,wc).toFixed(4) };
  });
  const shearData = Array.from({length:20},(_,i)=>{
    const h=10+i*12;
    return { h, v:+windShear(vref,href,h,alpha).toFixed(2) };
  });

  return (
    <div style={{
      minHeight:"100vh", background:C.bg, color:C.text,
      fontFamily:"'IBM Plex Sans','Segoe UI',system-ui,sans-serif",
      padding:"32px 24px", maxWidth:960, margin:"0 auto",
    }}>

      {/* HEADER */}
      <div style={{
        textAlign:"center", marginBottom:48, padding:"40px 32px",
        background:"radial-gradient(ellipse at 50% 0%,#0d2a4a,#0a0f1e 70%)",
        borderRadius:20, border:`1px solid ${C.border}`,
      }}>
        <div style={{
          display:"inline-block", padding:"4px 14px",
          background:C.accent+"20", border:`1px solid ${C.accent}50`,
          borderRadius:20, fontSize:12, color:C.accent,
          fontWeight:600, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:16,
        }}>Fisika Energi Angin — Interactive Learning</div>
        <h1 style={{
          margin:"0 0 12px",
          fontSize:"clamp(24px,4vw,38px)", fontWeight:800,
          background:`linear-gradient(135deg,#ffffff 30%,${C.accent} 100%)`,
          WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
          letterSpacing:"-0.02em", lineHeight:1.2,
        }}>Pemodelan Matematis Energi Angin</h1>
        <p style={{ margin:0, color:C.muted, fontSize:15, lineHeight:1.6 }}>
          Eksplorasi interaktif — ubah parameter dan lihat visualisasi berubah secara real-time.
        </p>
      </div>

      {/* INTRO SLIDES */}
      <IntroSlides />

      {/* MEAN COMPARISON */}
      <MeanSection />

      {/* SECTION 1 */}
      <Section num="1" title="Persamaan Dasar Daya Angin">
        <p style={bodyStyle}>Daya yang terkandung dalam angin yang bergerak melalui area sapuan rotor:</p>
        <FormulaBlock highlight>P = ½ · ρ · A · v³</FormulaBlock>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:24, marginTop:20 }}>
          <div>
            <div style={{ marginBottom:16, paddingBottom:8, borderBottom:`1px solid ${C.border}` }}>
              <span style={{ fontSize:12, color:C.accent, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase" }}>Keterangan Variabel</span>
            </div>
            <VarRow sym="P"        desc="Daya yang dihasilkan"  val="Watt (W)"      />
            <VarRow sym="ρ (rho)"  desc="Massa jenis udara"      val={`${rho} kg/m³`} />
            <VarRow sym="A = π·r²" desc="Luas sapuan rotor"      val={`${fmt(A,0)} m²`} />
            <VarRow sym="v"        desc="Kecepatan angin"        val={`${v1} m/s`}  />
          </div>
          <div>
            <div style={{ marginBottom:8, paddingBottom:8, borderBottom:`1px solid ${C.border}` }}>
              <span style={{ fontSize:12, color:C.accent, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase" }}>Parameter Interaktif</span>
            </div>
            <Slider label="ρ — Massa jenis udara" value={rho}    min={0.9} max={1.4}  step={0.005} unit=" kg/m³" onChange={setRho}    color={C.accent}  />
            <Slider label="r — Jari-jari rotor"   value={radius} min={10}  max={80}   step={1}     unit=" m"     onChange={setRadius} color={C.accent2} />
            <Slider label="v — Kecepatan angin"   value={v1}     min={1}   max={20}   step={0.5}   unit=" m/s"   onChange={setV1}     color={C.green}   />
            <div style={{ marginTop:8, padding:"14px 18px", background:"#080e1c", borderRadius:10, border:`1px solid ${C.green}40` }}>
              <div style={{ fontSize:11, color:C.muted }}>Daya terhitung (P)</div>
              <div style={{ fontSize:28, fontWeight:800, color:C.green, fontFamily:"monospace" }}>
                {P_raw>=1e6?fmt(P_raw/1e6,3)+" MW":P_raw>=1000?fmt(P_raw/1000,2)+" kW":fmt(P_raw,0)+" W"}
              </div>
            </div>
          </div>
        </div>
        <div style={{ marginTop:24, height:210 }}>
          <div style={{...mutedStyle, marginBottom:8}}>
            <strong style={{color:C.text}}>Kurva Daya vs Kecepatan</strong> — perhatikan pertumbuhan kubik
          </div>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={powerCurveData} margin={{top:5,right:20,bottom:20,left:20}}>
              <defs>
                <linearGradient id="gpR" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={C.accent} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={C.accent} stopOpacity={0}   />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
              <XAxis dataKey="v" stroke={C.muted} tick={{fontSize:11, fill:C.text}}>
                <Label value="v (m/s)" position="insideBottom" offset={-14} fill={C.muted} fontSize={12} />
              </XAxis>
              <YAxis stroke={C.muted} tick={{fontSize:11, fill:C.text}}>
                <Label value="Daya (kW)" angle={-90} position="insideLeft" offset={10} fill={C.muted} fontSize={12} />
              </YAxis>
              <Tooltip contentStyle={{background:C.card,border:`1px solid ${C.border}`,borderRadius:8,fontSize:12}} labelFormatter={v=>`v = ${v} m/s`} />
              <ReferenceLine x={v1} stroke={C.green} strokeDasharray="4 4" label={{value:`v=${v1}`,fill:C.green,fontSize:11}} />
              <Area type="monotone" dataKey="P_raw" stroke={C.accent} fill="url(#gpR)" strokeWidth={2} dot={false} name="P (kW)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <Callout icon="⚡" title="Poin Kritis: Hubungan v³" color={C.amber}>
          Jika kecepatan naik 2×, daya naik <strong>8 kali lipat</strong>. 
          v = {v1} m/s → v = {v1*2} m/s: {fmt(P_raw/1000,2)} kW menjadi{" "}
          <strong style={{color:C.amber}}>{fmt(P_raw*8/1000,1)} kW</strong>.
        </Callout>
      </Section>

      {/* SECTION 2 */}
      <Section num="2" title="Batas Betz — Efisiensi Teoretis Maksimum">
        <p style={bodyStyle}>Angin harus tetap bergerak setelah melewati turbin. Albert Betz membuktikan efisiensi maksimum ≈ 59,3%.</p>
        <FormulaBlock highlight>P_aktual = C_p · ½ · ρ · A · v³</FormulaBlock>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:24, marginTop:16 }}>
          <div>
            <VarRow sym="C_p"         desc="Koefisien daya"  val=""          />
            <VarRow sym="C_p,max"     desc="Batas Betz"      val="≈ 0.593"   />
            <VarRow sym="C_p,praktis" desc="Turbin modern"   val="0.35–0.45" />
            <div style={{ marginTop:20, padding:"14px", background:"#080e1c", borderRadius:12, border:`1px solid ${C.border}` }}>
              <div style={{ fontSize:12, color:C.muted, marginBottom:10, textAlign:"center" }}>Posisi C_p saat ini</div>
              <div style={{ position:"relative", height:18, background:"#1a2a40", borderRadius:9, overflow:"hidden" }}>
                <div style={{ position:"absolute", left:"59.3%", top:0, bottom:0, width:2, background:C.red, zIndex:3 }} />
                <div style={{ position:"absolute", left:0, top:0, bottom:0, width:`${cp*100}%`, background:`linear-gradient(90deg,${C.accent2},${C.accent})`, borderRadius:9, transition:"width 0.2s", zIndex:2 }} />
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", marginTop:5 }}>
                <span style={{fontSize:11,color:C.muted}}>0</span>
                <span style={{fontSize:11,color:C.red}}>Betz 0.593</span>
                <span style={{fontSize:11,color:C.muted}}>1.0</span>
              </div>
            </div>
          </div>
          <div>
            <Slider label="C_p" value={cp} min={0.1} max={0.59} step={0.01} unit="" onChange={setCp} color={C.accent2} />
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginTop:8 }}>
              <div style={{ padding:"12px 14px", background:"#080e1c", borderRadius:10, border:`1px solid ${C.accent}40` }}>
                <div style={{ fontSize:11, color:C.muted }}>P total</div>
                <div style={{ fontSize:16, fontWeight:700, color:C.accent, fontFamily:"monospace" }}>{fmt(P_raw/1000,2)} kW</div>
              </div>
              <div style={{ padding:"12px 14px", background:"#080e1c", borderRadius:10, border:`1px solid ${C.accent2}40` }}>
                <div style={{ fontSize:11, color:C.muted }}>P aktual (C_p·P)</div>
                <div style={{ fontSize:16, fontWeight:700, color:C.accent2, fontFamily:"monospace" }}>{fmt(P_betz/1000,2)} kW</div>
              </div>
            </div>
          </div>
        </div>
        <Callout icon="🔬" title="Mengapa tidak bisa 100%?" color={C.accent}>
          Jika turbin menyerap 100% energi, udara berhenti menghalangi angin baru.
          Rasio optimal v₂/v₁ = ⅓ menghasilkan C_p,max = <strong>16/27 ≈ 0.593</strong>.
        </Callout>
      </Section>

      {/* SECTION 3 */}
      <Section num="3" title="Distribusi Weibull — Probabilitas Kecepatan Angin">
        <p style={bodyStyle}>Angin tidak bertiup konstan. Distribusi Weibull memetakan probabilitas kecepatan angin:</p>
        <FormulaBlock highlight>f(v) = (k/c) · (v/c)^(k−1) · exp[−(v/c)^k]</FormulaBlock>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:24, marginTop:16 }}>
          <div>
            <VarRow sym="v" desc="Kecepatan angin"   val="m/s"      />
            <VarRow sym="c" desc="Parameter skala"   val={`${wc} m/s`} />
            <VarRow sym="k" desc="Parameter bentuk"  val={`${wk}`}  />
            <div style={{ marginTop:14 }}>
              {[
                {r:"k < 1.5",d:"Angin tidak menentu",  c:C.red   },
                {r:"k ≈ 2",  d:"Moderat (paling umum)", c:C.amber },
                {r:"k > 3",  d:"Stabil / konsisten",    c:C.green },
              ].map(i=>(
                <div key={i.r} style={{ display:"flex", gap:8, alignItems:"center", marginBottom:6 }}>
                  <div style={{ width:8, height:8, borderRadius:"50%", background:i.c, flexShrink:0 }} />
                  <span style={{ fontSize:12, color:i.c, fontFamily:"monospace", minWidth:72 }}>{i.r}</span>
                  <span style={{ fontSize:12, color:C.muted }}>{i.d}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <Slider label="k — bentuk" value={wk} min={1} max={4}  step={0.1} unit=""    onChange={setWk} color={C.accent}  />
            <Slider label="c — skala"  value={wc} min={3} max={15} step={0.5} unit=" m/s" onChange={setWc} color={C.accent2} />
          </div>
        </div>
        <div style={{ marginTop:20, height:210 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={weibullData} margin={{top:5,right:20,bottom:20,left:20}}>
              <defs>
                <linearGradient id="gpW" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={C.accent2} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={C.accent2} stopOpacity={0}   />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
              <XAxis dataKey="v" stroke={C.muted} tick={{fontSize:11, fill:C.text}}>
                <Label value="v (m/s)" position="insideBottom" offset={-14} fill={C.muted} fontSize={12} />
              </XAxis>
              <YAxis stroke={C.muted} tick={{fontSize:11, fill:C.text}}>
                <Label value="Probabilitas f(v)" angle={-90} position="insideLeft" offset={10} fill={C.muted} fontSize={12} />
              </YAxis>
              <Tooltip contentStyle={{background:C.card,border:`1px solid ${C.border}`,borderRadius:8,fontSize:12}} labelFormatter={v=>`v = ${v} m/s`} formatter={v=>[v.toFixed(4),"f(v)"]} />
              <ReferenceLine x={wc} stroke={C.amber} strokeDasharray="4 4" label={{value:`c=${wc}`,fill:C.amber,fontSize:11}} />
              <Area type="monotone" dataKey="pdf" stroke={C.accent2} fill="url(#gpW)" strokeWidth={2.5} dot={false} name="f(v)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Section>

      {/* SECTION 4 */}
      <Section num="4" title="Ekstrapolasi Ketinggian — Wind Shear (Power Law)">
        <p style={bodyStyle}>Data angin diukur di 10 m, turbin dipasang di 80–120 m. Power Law mengekstrapolasi kecepatan:</p>
        <FormulaBlock highlight>v_h = v_ref · (h / h_ref)^α</FormulaBlock>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:24, marginTop:16 }}>
          <div>
            <VarRow sym="v_h"   desc="Kecepatan pada h"        val={`${fmt(vh,2)} m/s`}        />
            <VarRow sym="v_ref" desc="Kecepatan referensi"     val={`${vref} m/s @ ${href} m`} />
            <VarRow sym="α"     desc="Eksponen Hellmann"        val={alpha}                      />
            <div style={{ marginTop:14 }}>
              {[
                {t:"Laut / flat",    a:"0.10–0.13"},
                {t:"Padang rumput",  a:"0.14–0.16"},
                {t:"Pedesaan",       a:"0.20–0.25"},
                {t:"Hutan / kota",   a:"0.28–0.40"},
              ].map(i=>(
                <div key={i.t} style={{ display:"flex", justifyContent:"space-between", padding:"5px 0", borderBottom:`1px solid ${C.border}20` }}>
                  <span style={{ fontSize:12, color:C.muted }}>{i.t}</span>
                  <span style={{ fontSize:12, color:C.accent, fontFamily:"monospace" }}>α = {i.a}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <Slider label="v_ref"      value={vref}    min={2}   max={15}  step={0.5} unit=" m/s" onChange={setVref}    color={C.accent}  />
            <Slider label="h_ref"      value={href}    min={5}   max={30}  step={1}   unit=" m"   onChange={setHref}    color={C.muted}   />
            <Slider label="h (hub)"    value={htarget} min={20}  max={200} step={5}   unit=" m"   onChange={setHtarget} color={C.accent2} />
            <Slider label="α Hellmann" value={alpha}   min={0.05} max={0.45} step={0.01} unit="" onChange={setAlpha}  color={C.amber}   />
            <div style={{ padding:"14px", background:"#080e1c", borderRadius:10, border:`1px solid ${C.green}40` }}>
              <div style={{ fontSize:11, color:C.muted }}>Kecepatan pada {htarget} m</div>
              <div style={{ fontSize:26, fontWeight:800, color:C.green, fontFamily:"monospace" }}>{fmt(vh,2)} m/s</div>
              <div style={{ fontSize:12, color:C.muted, marginTop:2 }}>↑ {fmt(((vh-vref)/vref)*100,1)}% dari referensi</div>
            </div>
          </div>
        </div>
        <div style={{ marginTop:24, height:210 }}>
          <div style={{...mutedStyle, marginBottom:8, fontSize:13}}>
            <strong style={{color:C.text}}>Profil Kecepatan Vertikal</strong>
          </div>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={shearData} layout="vertical" margin={{top:5,right:30,bottom:20,left:30}}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
              <XAxis type="number" dataKey="v" stroke={C.muted} tick={{fontSize:11, fill:C.text}}>
                <Label value="Kecepatan (m/s)" position="insideBottom" offset={-14} fill={C.muted} fontSize={12} />
              </XAxis>
              <YAxis type="number" dataKey="h" stroke={C.muted} tick={{fontSize:11, fill:C.text}}>
                <Label value="Ketinggian (m)" angle={-90} position="insideLeft" offset={10} fill={C.muted} fontSize={12} />
              </YAxis>
              <Tooltip contentStyle={{background:C.card,border:`1px solid ${C.border}`,borderRadius:8,fontSize:12}} formatter={v=>[`${v} m/s`,"Kecepatan"]} labelFormatter={v=>`h = ${v} m`} />
              <ReferenceLine y={htarget} stroke={C.accent2} strokeDasharray="4 4" label={{value:`hub ${htarget}m`,fill:C.accent2,fontSize:11}} />
              <ReferenceLine y={href}    stroke={C.amber}   strokeDasharray="4 4" label={{value:`ref ${href}m`,  fill:C.amber,  fontSize:11}} />
              <Line type="monotone" dataKey="v" stroke={C.accent} strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Section>

      {/* SECTION 5 */}
      <Section num="5" title="Estimasi Energi Tahunan (AEP)">
        <p style={bodyStyle}>Annual Energy Production — total energi setahun dengan mempertimbangkan distribusi kecepatan angin:</p>
        <FormulaBlock highlight>E_annual = Σ [ P(v) · f(v) · 8760 ]</FormulaBlock>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20, marginTop:16 }}>
          <div>
            <VarRow sym="E_annual" desc="Energi tahunan total"    val="Wh/tahun" />
            <VarRow sym="P(v)"     desc="Daya pada kecepatan v"   val=""         />
            <VarRow sym="f(v)"     desc="Probabilitas Weibull"    val=""         />
            <VarRow sym="8760"     desc="Jam dalam 1 tahun"       val="jam"      />
          </div>
          <div>
            {(()=>{
              let aep=0;
              for(let v=0.5;v<=25;v+=0.5){ aep+=cp*0.5*rho*A*Math.pow(v,3)*weibullPDF(v,wk,wc)*8760*0.5; }
              const mwh=aep/1e6;
              return (
                <div style={{ padding:"16px", background:"#080e1c", borderRadius:12, border:`1px solid ${C.green}50` }}>
                  <div style={{ fontSize:11, color:C.muted, marginBottom:4, textTransform:"uppercase", letterSpacing:"0.08em" }}>AEP Estimasi</div>
                  <div style={{ fontSize:32, fontWeight:800, color:C.green, fontFamily:"monospace", lineHeight:1 }}>{fmt(mwh,1)} MWh</div>
                  <div style={{ fontSize:12, color:C.muted, marginTop:6 }}>≈ {fmt(mwh*1000,0)} kWh / tahun</div>
                  <div style={{ fontSize:11, color:C.muted, marginTop:4, fontStyle:"italic" }}>
                    ρ={rho} · A={fmt(A,0)} m² · C_p={cp} · k={wk} · c={wc}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
        {(()=>{
          const aepData=Array.from({length:20},(_,i)=>{
            const v=i+0.5;
            return { v:+v.toFixed(1), contribution:+(cp*0.5*rho*A*Math.pow(v,3)/1000*weibullPDF(v,wk,wc)*8760).toFixed(0) };
          });
          return (
            <div style={{ marginTop:24, height:210 }}>
              <div style={{...mutedStyle, marginBottom:8}}>
                <strong style={{color:C.text}}>Kontribusi Energi per Kecepatan</strong> — P(v)·f(v)·8760
              </div>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={aepData} margin={{top:5,right:20,bottom:20,left:20}}>
                  <defs>
                    <linearGradient id="gpAep" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={C.green} stopOpacity={0.4} />
                      <stop offset="95%" stopColor={C.green} stopOpacity={0}   />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                  <XAxis dataKey="v" stroke={C.muted} tick={{fontSize:11, fill:C.text}}>
                    <Label value="v (m/s)" position="insideBottom" offset={-14} fill={C.muted} fontSize={12} />
                  </XAxis>
                  <YAxis stroke={C.muted} tick={{fontSize:11, fill:C.text}}>
                    <Label value="Kontribusi (kWh)" angle={-90} position="insideLeft" offset={10} fill={C.muted} fontSize={12} />
                  </YAxis>
                  <Tooltip contentStyle={{background:C.card,border:`1px solid ${C.border}`,borderRadius:8,fontSize:12}} labelFormatter={v=>`v = ${v} m/s`} formatter={v=>[fmt(v,0)+" kWh","Kontribusi"]} />
                  <Area type="monotone" dataKey="contribution" stroke={C.green} fill="url(#gpAep)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          );
        })()}
        <Callout icon="💡" title="Kaitan dengan Bagian 0 (Rata-rata)" color={C.green}>
          AEP bukan P(v̄)×8760. Ini adalah implementasi nyata dari prinsip Bagian 0: distribusi
          Weibull + integrasi adalah cara paling tepat untuk menghindari bias rata-rata
          aritmetik maupun energy-mean dalam estimasi produksi energi tahunan.
        </Callout>
      </Section>

      {/* Footer */}
      <div style={{ textAlign:"center", padding:"24px", color:C.muted, fontSize:12, borderTop:`1px solid ${C.border}` }}>
        Pemodelan Matematis Energi Angin — Interactive Learning Tool
        <br /><span style={{fontSize:11, opacity:0.7}}>Semua kalkulasi real-time berdasarkan parameter yang Anda atur</span>
      </div>
    </div>
  );
}