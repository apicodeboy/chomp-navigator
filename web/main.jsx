import { createRoot } from "react-dom/client";
import SignIn from "../src/SignIn.jsx";
import SignUp from "../src/SignUp.jsx";
import Home from "../src/Home.jsx";

function App() {
  const path = window.location.pathname;
  if (path === "/login") return <SignIn />;
  if (path === "/signup") return <SignUp />;
  return <Home />;
}

createRoot(document.getElementById("root")).render(<App />);
