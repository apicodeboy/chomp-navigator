import { useState } from "react";
import { supabase } from "./supabaseClient";

// Sign Up — email/password via Supabase Auth.
export default function SignUp() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function handleSignUp(e) {
    e.preventDefault();
    setError("");
    setMessage("");

    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error) {
      setError(error.message); // show Supabase error under the form
      return;
    }

    // With email confirmation on, signUp returns no session yet — don't redirect.
    if (!data.session) {
      setMessage("Check your email and confirm your account before logging in.");
      return;
    }

    // Only redirect when a real session exists.
    window.location.assign("/");
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

      {/* small messages under the form */}
      {error && <p style={{ color: "red", fontSize: 13, marginTop: 8 }}>{error}</p>}
      {message && <p style={{ color: "green", fontSize: 13, marginTop: 8 }}>{message}</p>}
    </form>
  );
}
