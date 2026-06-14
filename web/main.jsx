import { createRoot } from "react-dom/client";
import SignIn from "../src/SignIn.jsx";
import SignUp from "../src/SignUp.jsx";
import Home from "../src/Home.jsx";

function App() {
  const path = window.location.pathname;
  if (path === "/login") return <SignIn />;
  if (path === "/signup") return <SignUp />;
  // OAuth (Google/Apple) returns here; if it started from the native app, bounce
  // straight back into it instead of showing the web Home page.
  if (new URLSearchParams(window.location.search).get("return") === "app") {
    window.location.assign("mapwrlds://");
    return null;
  }
  return <Home />;
}

createRoot(document.getElementById("root")).render(<App />);
