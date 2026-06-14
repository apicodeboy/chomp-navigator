import { useState } from "react";

// Clean, modern split auth shell: editorial image + testimonial on the left,
// the form column on the right. Matches the MAP WRLDS account design.

const TESTIMONIALS = [
  {
    quote:
      "MAP WRLDS makes getting anywhere feel like a game. Turn-by-turn is crisp, the character following my route is genuinely fun, and I actually look forward to my commute now.",
    name: "Isabella Garcia",
    title: "Daily Commuter",
    org: "San Francisco, CA",
  },
  {
    quote:
      "I switched from the default navigation app and never looked back. The live traffic routing is accurate and the whole thing just feels fast and modern.",
    name: "Marcus Lee",
    title: "Rideshare Driver",
    org: "Austin, TX",
  },
  {
    quote:
      "Earning tickets while I drive and unlocking new characters keeps my kids entertained on every road trip. Brilliant little touch.",
    name: "Priya Nair",
    title: "Road-trip Regular",
    org: "Seattle, WA",
  },
];

const c = {
  ink: "#0d0d12",
  muted: "#6b7280",
  line: "#e5e7eb",
  field: "#d1d5db",
  bg: "#f3f4f6",
};

const styles = {
  page: {
    minHeight: "100vh",
    background: c.bg,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    fontFamily: "'Barlow', -apple-system, BlinkMacSystemFont, sans-serif",
    color: c.ink,
  },
  card: {
    width: "100%",
    maxWidth: 1120,
    background: "#fff",
    borderRadius: 24,
    border: `1px solid ${c.line}`,
    boxShadow: "0 20px 60px rgba(15,23,42,0.08)",
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    overflow: "hidden",
    minHeight: 720,
  },
  // ---- left (image + testimonial) ----
  imagePane: {
    position: "relative",
    margin: 14,
    borderRadius: 18,
    overflow: "hidden",
    background:
      "linear-gradient(160deg, #1f3a5f 0%, #2c5d7c 35%, #3f8a8f 70%, #4aa39a 100%)",
    minHeight: 640,
  },
  imageGrid: {
    position: "absolute",
    inset: 0,
    opacity: 0.5,
    pointerEvents: "none",
  },
  imageGlow: {
    position: "absolute",
    inset: 0,
    background:
      "radial-gradient(120% 80% at 20% 10%, rgba(255,255,255,0.18), transparent 60%)",
    pointerEvents: "none",
  },
  brand: {
    position: "absolute",
    top: 24,
    left: 26,
    display: "flex",
    alignItems: "center",
    gap: 9,
    color: "#fff",
    fontWeight: 700,
    fontSize: 16,
    letterSpacing: "0.3px",
    zIndex: 2,
  },
  quoteCard: {
    position: "absolute",
    left: 20,
    right: 20,
    bottom: 20,
    background: "rgba(20,28,38,0.45)",
    backdropFilter: "blur(14px)",
    WebkitBackdropFilter: "blur(14px)",
    border: "1px solid rgba(255,255,255,0.18)",
    borderRadius: 16,
    padding: "26px 26px 22px",
    color: "#fff",
  },
  quote: { fontSize: 18, lineHeight: 1.5, fontWeight: 500, marginBottom: 22 },
  quoteName: { fontSize: 17, fontWeight: 700 },
  quoteTitle: { fontSize: 13, opacity: 0.85, marginTop: 6 },
  quoteOrg: { fontSize: 13, opacity: 0.7, marginTop: 2 },
  arrows: { position: "absolute", right: 24, bottom: 26, display: "flex", gap: 10 },
  arrow: {
    width: 38,
    height: 38,
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.3)",
    background: "rgba(255,255,255,0.08)",
    color: "#fff",
    fontSize: 17,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  // ---- right (form) ----
  formPane: {
    padding: "44px 8% 40px",
    display: "flex",
    flexDirection: "column",
  },
  toggleWrap: { display: "flex", justifyContent: "center", marginBottom: 22 },
  toggle: {
    display: "inline-flex",
    background: "#f3f4f6",
    border: `1px solid ${c.line}`,
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  toggleBtn: (active) => ({
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "8px 18px",
    borderRadius: 9,
    border: "none",
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 600,
    fontFamily: "inherit",
    background: active ? "#fff" : "transparent",
    color: active ? c.ink : c.muted,
    boxShadow: active ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
  }),
  formInner: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    maxWidth: 400,
    width: "100%",
    margin: "0 auto",
  },
  heading: { fontSize: 30, fontWeight: 700, textAlign: "center", letterSpacing: "-0.5px" },
  sub: { fontSize: 15, color: c.muted, textAlign: "center", marginTop: 8, marginBottom: 26 },
  social: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    width: "100%",
    padding: "12px",
    border: `1px solid ${c.field}`,
    borderRadius: 10,
    background: "#fff",
    fontFamily: "inherit",
    fontSize: 14,
    fontWeight: 600,
    color: c.ink,
    cursor: "pointer",
    marginBottom: 10,
  },
  divider: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    color: c.muted,
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: "1px",
    margin: "16px 0",
  },
  dividerLine: { flex: 1, height: 1, background: c.line },
  label: { display: "block", fontSize: 13, fontWeight: 600, marginBottom: 7, marginTop: 14 },
  input: {
    display: "block",
    width: "100%",
    padding: "12px 14px",
    border: `1px solid ${c.field}`,
    borderRadius: 10,
    fontFamily: "inherit",
    fontSize: 14,
    color: c.ink,
    outline: "none",
    background: "#fff",
  },
  primary: {
    width: "100%",
    padding: "14px",
    border: "none",
    borderRadius: 10,
    background: c.ink,
    color: "#fff",
    fontFamily: "inherit",
    fontSize: 15,
    fontWeight: 600,
    cursor: "pointer",
    marginTop: 22,
  },
  checkRow: { display: "flex", gap: 9, marginTop: 16, alignItems: "flex-start" },
  checkText: { fontSize: 12.5, color: c.muted, lineHeight: 1.45 },
  footer: { textAlign: "center", fontSize: 14, color: c.muted, marginTop: 24 },
  footerLink: { color: c.ink, fontWeight: 700, textDecoration: "underline", cursor: "pointer" },
  notice: {
    fontSize: 13,
    color: "#166534",
    background: "#f0fdf4",
    border: "1px solid #bbf7d0",
    borderRadius: 9,
    padding: "10px 12px",
    marginBottom: 14,
    lineHeight: 1.45,
  },
  error: {
    fontSize: 13,
    color: "#b91c1c",
    background: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: 9,
    padding: "10px 12px",
    marginTop: 14,
    lineHeight: 1.45,
  },
};

function MapGrid() {
  // Subtle perspective map-grid so the image pane reads as "navigation".
  return (
    <svg style={styles.imageGrid} viewBox="0 0 400 600" preserveAspectRatio="none">
      <defs>
        <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0.04" />
        </linearGradient>
      </defs>
      {Array.from({ length: 13 }).map((_, i) => (
        <line key={`v${i}`} x1={i * 33.3} y1="0" x2={i * 33.3} y2="600" stroke="url(#fade)" strokeWidth="1" />
      ))}
      {Array.from({ length: 19 }).map((_, i) => (
        <line key={`h${i}`} x1="0" y1={i * 33.3} x2="400" y2={i * 33.3} stroke="url(#fade)" strokeWidth="1" />
      ))}
      {/* a route line for flavor */}
      <path d="M40 560 L120 420 L110 300 L210 230 L300 120 L360 40" fill="none" stroke="#ffd400" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
      <circle cx="40" cy="560" r="7" fill="#ffd400" />
      <circle cx="360" cy="40" r="7" fill="#fff" />
    </svg>
  );
}

/**
 * @param mode "login" | "signup" — drives the toggle highlight.
 * @param heading / sub — form copy.
 * @param children — the form body.
 */
export default function AuthLayout({ mode, heading, sub, children }) {
  const [idx, setIdx] = useState(0);
  const t = TESTIMONIALS[idx];
  const move = (d) => setIdx((i) => (i + d + TESTIMONIALS.length) % TESTIMONIALS.length);

  return (
    <div style={styles.page}>
      <style>{`
        .mw-input:focus { border-color:${c.ink}; box-shadow:0 0 0 3px rgba(13,13,18,0.08); }
        .mw-social:hover { background:#f9fafb; }
        .mw-primary:hover { background:#000; }
        .mw-arrow:hover { background:rgba(255,255,255,0.2); }
        @media (max-width: 860px){ .mw-card{ grid-template-columns:1fr !important; } .mw-image{ display:none !important; } }
      `}</style>

      <div style={styles.card} className="mw-card">
        {/* LEFT — image + testimonial */}
        <div style={styles.imagePane} className="mw-image">
          <MapGrid />
          <div style={styles.imageGlow} />
          <div style={styles.brand}>
            <span style={{ fontSize: 18 }}>✦</span> MAP WRLDS
          </div>

          <div style={styles.quoteCard}>
            <div style={styles.quote}>“{t.quote}”</div>
            <div style={styles.quoteName}>{t.name}</div>
            <div style={styles.quoteTitle}>{t.title}</div>
            <div style={styles.quoteOrg}>{t.org}</div>
          </div>
          <div style={styles.arrows}>
            <button className="mw-arrow" style={styles.arrow} onClick={() => move(-1)} aria-label="Previous">←</button>
            <button className="mw-arrow" style={styles.arrow} onClick={() => move(1)} aria-label="Next">→</button>
          </div>
        </div>

        {/* RIGHT — form */}
        <div style={styles.formPane}>
          <div style={styles.toggleWrap}>
            <div style={styles.toggle}>
              <button
                style={styles.toggleBtn(mode === "login")}
                onClick={() => mode !== "login" && window.location.assign("/login")}
              >
                ⊟ Login
              </button>
              <button
                style={styles.toggleBtn(mode === "signup")}
                onClick={() => mode !== "signup" && window.location.assign("/signup")}
              >
                ⊞ Sign Up
              </button>
            </div>
          </div>

          <div style={styles.formInner}>
            <h1 style={styles.heading}>{heading}</h1>
            <p style={styles.sub}>{sub}</p>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

// Reusable building blocks for the two pages.
export function GoogleButton({ onClick }) {
  return (
    <button type="button" className="mw-social" style={styles.social} onClick={onClick}>
      <svg width="18" height="18" viewBox="0 0 48 48">
        <path fill="#EA4335" d="M24 9.5c3.5 0 6.5 1.2 8.9 3.2l6.6-6.6C35.5 2.5 30.1 0 24 0 14.7 0 6.7 5.4 2.7 13.3l7.7 6C12.1 13 17.6 9.5 24 9.5z" />
        <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4 6.9-10 6.9-17z" />
        <path fill="#FBBC05" d="M10.4 28.7A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.8-4.7l-7.7-6A23.9 23.9 0 0 0 0 24c0 3.9.9 7.5 2.7 10.7l7.7-6z" />
        <path fill="#34A853" d="M24 48c6.1 0 11.2-2 14.9-5.5l-7.5-5.8c-2 1.4-4.6 2.2-7.4 2.2-6.4 0-11.9-4.3-13.8-10.2l-7.7 6C6.7 42.6 14.7 48 24 48z" />
      </svg>
      Continue with Google
    </button>
  );
}

export function AppleButton({ onClick }) {
  return (
    <button type="button" className="mw-social" style={styles.social} onClick={onClick}>
      <svg width="16" height="18" viewBox="0 0 384 512" fill="#0d0d12">
        <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C73.3 141.6 24 184.8 24 270.2c0 25.2 4.6 51.2 13.8 78 12.3 35.1 56.7 121.2 103 119.8 24.2-.6 41.3-17.2 72.8-17.2 30.6 0 46.4 17.2 73.4 17.2 46.7-.7 86.9-78.9 98.6-114.1-62.7-29.6-60.9-86.8-60.9-88.2zm-56.4-164.2c27.2-32.3 24.7-61.7 23.9-72.3-23.5 1.4-50.7 16-66.2 34-17.1 19.3-27.2 43.2-25 71.8 25.4 2 48.6-11.1 67.3-33.5z" />
      </svg>
      Continue with Apple
    </button>
  );
}

export function Divider() {
  return (
    <div style={styles.divider}>
      <span style={styles.dividerLine} />OR<span style={styles.dividerLine} />
    </div>
  );
}

export { styles };
