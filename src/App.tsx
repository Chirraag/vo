import React, { useState, useEffect, useCallback } from "react";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate,
  useLocation,
} from "react-router-dom";
import { supabase } from "./utils/supabaseClient";
import Navbar from "./components/Navbar";
import CampaignCreation from "./components/CampaignCreation";
import CampaignList from "./components/CampaignList";
import BulkDialing from "./components/BulkDialing";
import CampaignAnalytics from "./components/CampaignAnalytics";
import Settings from "./components/Settings";
import Auth from "./components/Auth";
import PricingPage from "./components/PricingPage";
import LandingPage from "./components/LandingPage";
import DNCList from "./components/DNCList.tsx";

// Protected Route wrapper component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isNavExpanded, setIsNavExpanded] = useState(false);

  const handleNavExpansion = useCallback((expanded: boolean) => {
    setIsNavExpanded(expanded);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <Router className="bg-white">
      <div className="min-h-screen flex">
        {session && <Navbar onExpansionChange={handleNavExpansion} />}
        <div
          className={`flex-grow ${
            session ? (isNavExpanded ? "ml-56" : "ml-14") : ""
          } transition-all duration-300`}
        >
          <Routes>
            <Route
              path="/"
              element={
                session ? <Navigate to="/campaigns" replace /> : <LandingPage />
              }
            />
            <Route
              path="/campaigns"
              element={
                <ProtectedRoute>
                  <CampaignList />
                </ProtectedRoute>
              }
            />
            <Route
              path="/create"
              element={
                <ProtectedRoute>
                  <CampaignCreation />
                </ProtectedRoute>
              }
            />
            <Route
              path="/campaign/:id"
              element={
                <ProtectedRoute>
                  <BulkDialing />
                </ProtectedRoute>
              }
            />
            <Route
              path="/campaign/:id/analytics"
              element={
                <ProtectedRoute>
                  <CampaignAnalytics />
                </ProtectedRoute>
              }
            />
            <Route
              path="/pricing"
              element={
                <ProtectedRoute>
                  <PricingPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dnc-list"
              element={
                <ProtectedRoute>
                  <DNCList />
                </ProtectedRoute>
              }
            />
            <Route
              path="/auth"
              element={
                !session ? <Auth /> : <Navigate to="/campaigns" replace />
              }
            />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
