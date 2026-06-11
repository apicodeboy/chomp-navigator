import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import { useRequireAuth } from "./useRequireAuth";
import { getSavedPlaces, addSavedPlace, deleteSavedPlace } from "./savedPlaces";

// Home (private) — lists the signed-in user's saved places and lets them add /
// delete. Protected by useRequireAuth: no session → redirect to /login.
export default function Home() {
  const { session, loading } = useRequireAuth();

  const [places, setPlaces] = useState([]);
  const [name, setName] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [error, setError] = useState("");

  // LOAD the user's places (RLS returns only theirs).
  async function load() {
    try {
      setPlaces(await getSavedPlaces());
    } catch (e) {
      setError(e.message);
    }
  }

  useEffect(() => {
    if (session) load();
  }, [session]);

  // CREATE
  async function handleAdd(e) {
    e.preventDefault();
    setError("");
    try {
      await addSavedPlace({ name, lat: parseFloat(lat), lng: parseFloat(lng) });
      setName("");
      setLat("");
      setLng("");
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  // DELETE
  async function handleDelete(id) {
    setError("");
    try {
      await deleteSavedPlace(id);
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    window.location.assign("/login");
  }

  if (loading) return null; // guard is still checking the session

  return (
    <div>
      <h1>Saved Places</h1>
      <button onClick={signOut}>Sign out</button>

      <form onSubmit={handleAdd}>
        <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} required />
        <input placeholder="Latitude" value={lat} onChange={(e) => setLat(e.target.value)} required />
        <input placeholder="Longitude" value={lng} onChange={(e) => setLng(e.target.value)} required />
        <button type="submit">Add</button>
      </form>

      {error && <p style={{ color: "red", fontSize: 13 }}>{error}</p>}

      <ul>
        {places.map((p) => (
          <li key={p.id}>
            {p.name} ({p.lat}, {p.lng}){" "}
            <button onClick={() => handleDelete(p.id)}>Delete</button>
          </li>
        ))}
        {places.length === 0 && <li>No saved places yet.</li>}
      </ul>
    </div>
  );
}
