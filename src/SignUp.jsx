import { useState } from "react";
import { supabase } from "./supabaseClient";

// Sign Up — email/password via Supabase Auth.
export default function SignUp() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleSignUp(e) {
    e.preventDefault();
    setError("");

    const { error } = await supabase.auth.signUp({ email, password });

    if (error) {
      setError(error.message); // show Supabase error under the form
      return;
    }

    // Do NOT auto-login. Send the user to Sign In, passing the email (and a
    // "signup" flag) via the query string so Sign In can pre-fill + greet them.
    window.location.assign("/login?signup=1&email=" + encodeURIComponent(email));
  }

  // Google OAuth — Supabase opens the Google consent screen, then redirects back.
  async function handleGoogle() {
    setError("");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin + "/" }, // return to Home after auth
    });
    if (error) setError(error.message);
  }

  return (
    <form onSubmit={handleSignUp}>
      <h1>Sign Up</h1>

      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />

      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />

      <button type="submit">Sign Up</button>

      {/* OAuth — added because there was no existing Google button */}
      <button type="button" onClick={handleGoogle}>Continue with Google</button>

      {/* small error message under the form */}
      {error && <p style={{ color: "red", fontSize: 13, marginTop: 8 }}>{error}</p>}
    </form>
  );
}
