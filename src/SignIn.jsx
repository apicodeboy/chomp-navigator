import { useState } from "react";
import { supabase } from "./supabaseClient";
import AuthLayout, { GoogleButton, AppleButton, Divider, styles } from "./AuthLayout.jsx";

function getSignupParams() {
  const p = new URLSearchParams(window.location.search);
  return { email: p.get("email") || "", justSignedUp: p.get("signup") === "1" };
}

export default function SignIn() {
  const initial = getSignupParams();

  const [email, setEmail] = useState(initial.email);
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [notice] = useState(
    initial.justSignedUp
      ? "Account created! Check your email to verify your address before signing in."
      : ""
  );

  async function handleSignIn(e) {
    e.preventDefault();
    setError("");

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setError(error.message); return; }

    if (!data.session) {
      setError("Check your email and confirm your account before signing in.");
      return;
    }
    window.location.assign("/");
  }

  async function handleOAuth(provider) {
    setError("");
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: window.location.origin + "/" },
    });
    if (error) setError(error.message);
  }

  return (
    <AuthLayout
      mode="login"
      heading="Welcome back"
      sub="Please enter your details to sign in."
    >
      {notice && <p style={styles.notice}>{notice}</p>}

      <GoogleButton onClick={() => handleOAuth("google")} />
      <AppleButton onClick={() => handleOAuth("apple")} />

      <Divider />

      <form onSubmit={handleSignIn}>
        <label style={{ ...styles.label, marginTop: 0 }}>Email address</label>
        <input
          className="mw-input"
          style={styles.input}
          type="email"
          placeholder="Enter your email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <label style={styles.label}>Password</label>
        <div style={{ position: "relative" }}>
          <input
            className="mw-input"
            style={{ ...styles.input, paddingRight: 44 }}
            type={showPw ? "text" : "password"}
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button
            type="button"
            onClick={() => setShowPw((v) => !v)}
            style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", border: "none", background: "none", cursor: "pointer", color: "#9ca3af", fontSize: 13 }}
          >
            {showPw ? "Hide" : "Show"}
          </button>
        </div>

        <button type="submit" className="mw-primary" style={styles.primary}>
          Sign in
        </button>

        {error && <p style={styles.error}>{error}</p>}
      </form>

      <p style={styles.footer}>
        Don&apos;t have an account?{" "}
        <span style={styles.footerLink} onClick={() => window.location.assign("/signup")}>
          Sign up
        </span>
      </p>
    </AuthLayout>
  );
}
