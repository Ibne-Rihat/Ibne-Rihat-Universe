import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { Toaster } from "sonner";
import AnimatedBackground from "@/components/AnimatedBackground";
import CursorGlow from "@/components/CursorGlow";
import Layout from "@/components/Layout";
import Login from "@/pages/Login";
import AuthCallback from "@/pages/AuthCallback";
import Dashboard from "@/pages/Dashboard";
import GenericModule from "@/pages/GenericModule";
import Money from "@/pages/Money";
import Freelancing from "@/pages/Freelancing";
import Fitness from "@/pages/Fitness";
import Learning from "@/pages/Learning";
import Goals from "@/pages/Goals";
import Focus from "@/pages/Focus";
import Coach from "@/pages/Coach";
import Analytics from "@/pages/Analytics";
import Portfolio from "@/pages/Portfolio";
import Settings from "@/pages/Settings";

function FullLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="h-8 w-8 rounded-full border-2 border-white/10 border-t-lime-400 animate-spin" />
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading || user === null) return <FullLoader />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function GuestRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading || user === null) return <FullLoader />;
  if (user) return <Navigate to="/" replace />;
  return children;
}

function AppRouter() {
  const location = useLocation();
  // Handle Google OAuth callback (session_id in URL fragment) before anything else.
  if (location.hash?.includes("session_id=")) return <AuthCallback />;

  return (
    <Routes>
      <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/clients" element={<GenericModule resource="clients" />} />
        <Route path="/freelancing" element={<Freelancing />} />
        <Route path="/money" element={<Money />} />
        <Route path="/team" element={<GenericModule resource="team_members" />} />
        <Route path="/youtube" element={<GenericModule resource="youtube_videos" />} />
        <Route path="/content-ideas" element={<GenericModule resource="content_ideas" />} />
        <Route path="/portfolio" element={<Portfolio />} />
        <Route path="/ai-tools" element={<GenericModule resource="ai_tools" />} />
        <Route path="/goals" element={<Goals />} />
        <Route path="/learning" element={<Learning />} />
        <Route path="/fitness" element={<Fitness />} />
        <Route path="/focus" element={<Focus />} />
        <Route path="/coach" element={<Coach />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <div className="App">
      <AnimatedBackground />
      <CursorGlow />
      <BrowserRouter>
        <AuthProvider>
          <AppRouter />
        </AuthProvider>
      </BrowserRouter>
      <Toaster theme="dark" position="top-right" toastOptions={{ style: { background: "rgba(16,16,18,0.95)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" } }} />
    </div>
  );
}
