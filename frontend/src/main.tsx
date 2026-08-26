import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./styles/responsive.css";
import "./styles/dashboard-polish.css";
import "./styles/medex-brand-overrides.css";
import "./styles/dashboard-navigation.css";
import "./styles/dashboard-fixed-layout.css";
import "./utils/dashboardNavigation";
import { AuthProvider } from "./contexts/AuthContext.tsx";

createRoot(document.getElementById("root")!).render(
  <AuthProvider>
    <App />
  </AuthProvider>
);
