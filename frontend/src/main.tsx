import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./styles/responsive.css";
import "./styles/dashboard-polish.css";
import "./styles/medex-brand-overrides.css";
import "./styles/dashboard-navigation.css";
import "./styles/dashboard-fixed-layout.css";
import "./styles/job-listing-card-size.css";
import "./styles/device-responsive.css";
import "./styles/job-detail-responsive.css";
import "./styles/job-detail-presentation.css";
import "./styles/job-detail-typography-polish.css";
import "./styles/homepage-mobile-stats.css";
import "./utils/dashboardNavigation";
import "./utils/jobDetailPresentation";
import "./utils/jobDetailSummaryLayout";
import { AuthProvider } from "./contexts/AuthContext.tsx";

createRoot(document.getElementById("root")!).render(
  <AuthProvider>
    <App />
  </AuthProvider>
);