import { useState } from "react";
import { supabase } from "./supabaseClient";

// Read the email + "just signed up" flag passed from Sign Up via the query string.
function getSignupParams() {
  const p = new URLSearchParams(window.location.search);
  return { email: p.get("email") || "", justSignedUp: p.get("signup") === "1" };
}

// Sign In — email/password via Supabase Auth.
export default function SignIn() {
  const initial = getSignupParams();

  const [email, setEmail] = useState(initial.email); // pre-filled if coming from signup
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice] = useState(
    initial.justSignedUp
      ? "Your account has been created. Please check your email and verify your address before logging in."
      : ""
  );

  async function handleSignIn(e) {
    e.preventDefault();
    setError("");

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message); // show Supabase error under the form
      return;
    }

    // Only redirect when a real session actually exists.
    if (!data.session) {
      setError("Check your email and confirm your account before logging in.");
      return;
    }

    window.location.assign("/"); // success → redirect to Home
  }

  return (
    <form onSubmit={handleSignIn}>
      <h1>Sign In</h1>

      {/* success message shown above the form when arriving from signup */}
      {notice && <p style={{ color: "green", fontSize: 13, marginBottom: 12 }}>{notice}</p>}

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

      <button type="submit">Sign In</button>

      {/* small error message under the form */}
      {error && <p style={{ color: "red", fontSize: 13, marginTop: 8 }}>{error}</p>}
    </form>
  );
}
