// ════════════════════════ MAIN APP ════════════════════════════════════
export default function App(){
  return(
    <div style={{minHeight:"100vh",background:"#0a0f1e",color:"#e2e8f0",
      fontFamily:"'IBM Plex Sans','Segoe UI',system-ui,sans-serif",padding:"32px 24px",maxWidth:980,margin:"0 auto"}}>

      {/* ─── HEADER ─── */}
      <div style={{textAlign:"center",marginBottom:44,padding:"40px 32px",
        background:"radial-gradient(ellipse at 50% 0%,#0d2a4a,#0a0f1e 70%)",
        borderRadius:20,border:"1px solid #1e3a5f"}}>
        <div style={{display:"inline-block",padding:"4px 14px",background:"#00c9ff20",
          border:"1px solid #00c9ff50",borderRadius:20,fontSize:12,color:"#00c9ff",
          fontWeight:600,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:14}}>
          Fisika Energi Angin — Interactive Learning
        </div>
        <h1 style={{margin:"0 0 10px",fontSize:"clamp(22px,4vw,36px)",fontWeight:800,lineHeight:1.2,
          background:"linear-gradient(135deg,#ffffff 30%,#00c9ff 100%)",
          WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",letterSpacing:"-0.02em"}}>
          Pemodelan Matematis Energi Angin
        </h1>
        <p style={{margin:0,color:"#94a3b8",fontSize:14,lineHeight:1.6}}>
          Studi kasus data BMKG Balikpapan 2023 · Eksplorasi interaktif real-time
        </p>
      </div>

      {/* ─── TEST CONTENT ─── */}
      <div style={{padding:"20px",background:"#0f1829",borderRadius:12,border:"1px solid #1e3a5f",marginBottom:20}}>
        <h2 style={{color:"#00c9ff",margin:"0 0 10px"}}>✅ Aplikasi Berfungsi!</h2>
        <p style={{color:"#e2e8f0",margin:0}}>Jika Anda melihat ini, aplikasi App_2.jsx sudah berjalan dengan baik!</p>
        <p style={{color:"#94a3b8",fontSize:14,margin:"10px 0 0"}}>Slide lainnya akan ditambahkan setelah debugging selesai.</p>
      </div>

      <div style={{textAlign:"center",padding:"24px",color:"#94a3b8",fontSize:12,borderTop:"1px solid #1e3a5f"}}>
        Pemodelan Matematis Energi Angin — Interactive Learning Tool
        <br/><span style={{fontSize:11,opacity:0.7}}>Data BMKG Balikpapan 2023 · 8.760 jam pengukuran · Semua kalkulasi real-time</span>
      </div>
    </div>
  );
}