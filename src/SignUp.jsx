import { useState } from "react";
import { supabase } from "./supabaseClient";
import AuthLayout, { GoogleButton, AppleButton, Divider, styles } from "./AuthLayout.jsx";

export default function SignUp() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");

  async function handleSignUp(e) {
    e.preventDefault();
    setError("");

    const { error } = await supabase.auth.signUp({ email, password });
    if (error) { setError(error.message); return; }

    // Don't auto-login — send to Sign In with the email pre-filled.
    window.location.assign("/login?signup=1&email=" + encodeURIComponent(email));
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
      mode="signup"
      heading="Create an account"
      sub="Please enter your details to create an account."
    >
      <GoogleButton onClick={() => handleOAuth("google")} />
      <AppleButton onClick={() => handleOAuth("apple")} />

      <Divider />

      <form onSubmit={handleSignUp}>
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
          Create an account
        </button>

        <label style={styles.checkRow}>
          <input type="checkbox" style={{ marginTop: 2 }} />
          <span style={styles.checkText}>
            Please keep me updated by email with the latest news, route features, reward programs, and event updates.
          </span>
        </label>

        {error && <p style={styles.error}>{error}</p>}
      </form>

      <p style={styles.footer}>
        Already have an account?{" "}
        <span style={styles.footerLink} onClick={() => window.location.assign("/login")}>
          Sign in
        </span>
      </p>
    </AuthLayout>
  );
}
