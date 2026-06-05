"use client";

const CSS = `
.cl-root *{box-sizing:border-box}
.cl-root{
  position:fixed; inset:0; z-index:9999;
  background:#ffffff;
  color:#0a0a0a;
  font-family:"Inter", system-ui, sans-serif;
  display:flex;
  flex-direction:column;
  align-items:center;
  justify-content:center;
  overflow:hidden;
}

.cl-label{
  font-size:11px;
  letter-spacing:.4em;
  color:#1f9d5a;
  margin-bottom:26px;
  text-transform:uppercase;
}

.cl-row{
  display:flex;
  align-items:center;
  font-family:"JetBrains Mono", ui-monospace, monospace;
  font-size:96px;
  font-weight:600;
  letter-spacing:-0.02em;
  line-height:1;
  font-variant-numeric:tabular-nums;
}
.cl-dollar{ color:#1f9d5a; margin-right:18px; }
.cl-comma{  color:#bdbdbd; padding:0 4px; }

.cl-reel{
  position:relative;
  display:inline-block;
  width:62px;
  height:110px;
  overflow:hidden;
  margin:0 1px;
  border-radius:8px;
  background:linear-gradient(180deg,#f5f5f5,#ffffff);
  border:1px solid #e2e2e2;
  box-shadow:inset 0 8px 16px rgba(0,0,0,.06), inset 0 -8px 16px rgba(0,0,0,.06);
}
.cl-reel::before, .cl-reel::after{
  content:""; position:absolute; left:0; right:0; height:24px; pointer-events:none;
}
.cl-reel::before{ top:0; background:linear-gradient(180deg, #fff, rgba(255,255,255,0)); }
.cl-reel::after { bottom:0; background:linear-gradient(0deg,   #fff, rgba(255,255,255,0)); }

.cl-strip{
  display:flex;
  flex-direction:column;
  align-items:center;
  animation: cl-roll 1.4s cubic-bezier(.33,0,.2,1) infinite;
}
.cl-strip span{
  height:110px;
  display:flex;
  align-items:center;
  justify-content:center;
  color:#bdbdbd;
}
.cl-strip span.cl-final{ color:#0a0a0a; }

.cl-reel.cl-s2 .cl-strip{ animation-duration:1.7s; }
.cl-reel.cl-s3 .cl-strip{ animation-duration:2.0s; }
.cl-reel.cl-s4 .cl-strip{ animation-duration:2.3s; }
.cl-reel.cl-s5 .cl-strip{ animation-duration:2.6s; }
.cl-reel.cl-s6 .cl-strip{ animation-duration:2.9s; }

@keyframes cl-roll    { 0%{transform:translateY(0)} 100%{transform:translateY(-90%)} }
@keyframes cl-barfill { 0%{width:0} 100%{width:100%} }
@keyframes cl-blink   { 0%,49%{opacity:1} 50%,100%{opacity:.2} }

.cl-progress{
  margin-top:36px;
  width:min(480px, 70vw);
}
.cl-track{
  height:6px;
  background:#eeeeee;
  border-radius:3px;
  overflow:hidden;
}
.cl-bar{
  height:100%;
  width:0;
  background:linear-gradient(90deg,#1f9d5a,#3ec47a);
  animation: cl-barfill 2.6s cubic-bezier(.33,0,.2,1) forwards;
}
.cl-meta{
  display:flex;
  justify-content:space-between;
  margin-top:10px;
  font-family:"JetBrains Mono", ui-monospace, monospace;
  font-size:10px;
  color:#888;
  letter-spacing:.15em;
}
.cl-live{ color:#1f9d5a; }
.cl-live .cl-dot{ animation: cl-blink 1s infinite; }

@media (max-width: 720px){
  .cl-row{ font-size:56px; }
  .cl-reel{ width:38px; height:68px; }
  .cl-reel::before,.cl-reel::after{ height:14px; }
  .cl-strip span{ height:68px; }
}
`;

/* digit-reel definitions: stagger class + final digit
   Final value: $00,284,420 (8 digit reels + 2 commas) */
const REELS = [
  { stagger: "cl-s1", final: "0" },
  { stagger: "cl-s2", final: "0" },
  { comma: true },
  { stagger: "cl-s3", final: "2" },
  { stagger: "cl-s4", final: "8" },
  { stagger: "cl-s5", final: "4" },
  { comma: true },
  { stagger: "cl-s6", final: "4" },
  { stagger: "cl-s1", final: "2" },
  { stagger: "cl-s2", final: "0" },
];

function Reel({ stagger, final }) {
  return (
    <span className={`cl-reel ${stagger}`}>
      <span className="cl-strip">
        {["0","1","2","3","4","5","6","7","8","9"].map(d => (
          <span key={d}>{d}</span>
        ))}
        <span className="cl-final">{final}</span>
      </span>
    </span>
  );
}

export default function CounterLoader() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="cl-root">
        <div className="cl-label">Payment Receipts</div>

        <div
          className="cl-row"
          aria-label="Counting up to two hundred eighty four thousand four hundred twenty dollars"
        >
          <span className="cl-dollar">$</span>
          {REELS.map((r, i) =>
            r.comma
              ? <span key={`c${i}`} className="cl-comma">,</span>
              : <Reel key={i} stagger={r.stagger} final={r.final} />
          )}
        </div>

        <div className="cl-progress">
          <div className="cl-track"><div className="cl-bar" /></div>
          <div className="cl-meta">
            <span>Reading ledger…</span>
            <span className="cl-live"><span className="cl-dot">●</span> LIVE</span>
          </div>
        </div>
      </div>
    </>
  );
}
