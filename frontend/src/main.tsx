import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./styles/homepage-mobile-stats.css";
import { AuthProvider } from "./contexts/AuthContext.tsx";

createRoot(document.getElementById("root")!).render(
  <AuthProvider>
    <App />
  </AuthProvider>
);
