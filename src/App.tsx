import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useApp } from "./context/AppContext";

import Landing from "./pages/Landing";
import SignIn from "./pages/SignIn";
import Register from "./pages/Register";

// Hospital
import HospitalDashboard from "./pages/hospital/Dashboard";
import HospitalRequests from "./pages/hospital/Requests";
import HospitalMatches from "./pages/hospital/Matches";
import HospitalNetwork from "./pages/hospital/Network";
import HospitalMessages from "./pages/hospital/Messages";
import HospitalNotifications from "./pages/hospital/Notifications";
import HospitalHistory from "./pages/hospital/History";
import HospitalProfile from "./pages/hospital/Profile";

// NGO
import NGODashboard from "./pages/ngo/Dashboard";
import NGODonors from "./pages/ngo/Donors";
import NGORequests from "./pages/ngo/Requests";
import NGOVerification from "./pages/ngo/Verification";
import NGOMatching from "./pages/ngo/Matching";
import NGOAnalytics from "./pages/ngo/Analytics";
import NGOPartners from "./pages/ngo/Partners";
import NGODonorCapacity from "./pages/ngo/DonorCapacity";
import OutreachProtection from "./pages/ngo/OutreachProtection";
import NGOCommunication from "./pages/ngo/Communication";
import NGOCampaigns from "./pages/ngo/Campaigns";
import NGOProfile from "./pages/ngo/Profile";

// Donor
import DonorDashboard from "./pages/donor/Dashboard";
import DonorRequests from "./pages/donor/Requests";
import DonorAvailability from "./pages/donor/Availability";
import DonorHistory from "./pages/donor/History";
import DonorImpact from "./pages/donor/Impact";
import DonorNotifications from "./pages/donor/Notifications";
import DonorProfile from "./pages/donor/Profile";
import DonorPrivacy from "./pages/donor/Privacy";

function ProtectedRoute({ role, children }: { role: "hospital" | "ngo" | "donor"; children: React.ReactNode }) {
  const { role: currentRole } = useApp();
  if (!currentRole) return <Navigate to="/signin" replace />;
  if (currentRole !== role) return <Navigate to={`/${currentRole}/dashboard`} replace />;
  return <>{children}</>;
}

function AppRoutes() {
  const { authLoading } = useApp();
  if (authLoading) return null;
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/signin" element={<SignIn />} />
      <Route path="/register" element={<Register />} />

      {/* Hospital */}
      <Route path="/hospital/dashboard" element={<ProtectedRoute role="hospital"><HospitalDashboard /></ProtectedRoute>} />
      <Route path="/hospital/requests" element={<ProtectedRoute role="hospital"><HospitalRequests /></ProtectedRoute>} />
      <Route path="/hospital/requests/create" element={<ProtectedRoute role="hospital"><HospitalRequests /></ProtectedRoute>} />
      <Route path="/hospital/matches" element={<ProtectedRoute role="hospital"><HospitalMatches /></ProtectedRoute>} />
      <Route path="/hospital/network" element={<ProtectedRoute role="hospital"><HospitalNetwork /></ProtectedRoute>} />
      <Route path="/hospital/messages" element={<ProtectedRoute role="hospital"><HospitalMessages /></ProtectedRoute>} />
      <Route path="/hospital/notifications" element={<ProtectedRoute role="hospital"><HospitalNotifications /></ProtectedRoute>} />
      <Route path="/hospital/history" element={<ProtectedRoute role="hospital"><HospitalHistory /></ProtectedRoute>} />
      <Route path="/hospital/profile" element={<ProtectedRoute role="hospital"><HospitalProfile /></ProtectedRoute>} />

      {/* NGO */}
      <Route path="/ngo/dashboard" element={<ProtectedRoute role="ngo"><NGODashboard /></ProtectedRoute>} />
      <Route path="/ngo/donors" element={<ProtectedRoute role="ngo"><NGODonors /></ProtectedRoute>} />
      <Route path="/ngo/requests" element={<ProtectedRoute role="ngo"><NGORequests /></ProtectedRoute>} />
      <Route path="/ngo/verification" element={<ProtectedRoute role="ngo"><NGOVerification /></ProtectedRoute>} />
      <Route path="/ngo/matching" element={<ProtectedRoute role="ngo"><NGOMatching /></ProtectedRoute>} />
      <Route path="/ngo/analytics" element={<ProtectedRoute role="ngo"><NGOAnalytics /></ProtectedRoute>} />
      <Route path="/ngo/partners" element={<ProtectedRoute role="ngo"><NGOPartners /></ProtectedRoute>} />
      <Route path="/ngo/capacity" element={<ProtectedRoute role="ngo"><NGODonorCapacity /></ProtectedRoute>} />
      <Route path="/ngo/outreach" element={<ProtectedRoute role="ngo"><OutreachProtection /></ProtectedRoute>} />
      <Route path="/ngo/communication" element={<ProtectedRoute role="ngo"><NGOCommunication /></ProtectedRoute>} />
      <Route path="/ngo/campaigns" element={<ProtectedRoute role="ngo"><NGOCampaigns /></ProtectedRoute>} />
      <Route path="/ngo/profile" element={<ProtectedRoute role="ngo"><NGOProfile /></ProtectedRoute>} />

      {/* Donor */}
      <Route path="/donor/dashboard" element={<ProtectedRoute role="donor"><DonorDashboard /></ProtectedRoute>} />
      <Route path="/donor/requests" element={<ProtectedRoute role="donor"><DonorRequests /></ProtectedRoute>} />
      <Route path="/donor/availability" element={<ProtectedRoute role="donor"><DonorAvailability /></ProtectedRoute>} />
      <Route path="/donor/history" element={<ProtectedRoute role="donor"><DonorHistory /></ProtectedRoute>} />
      <Route path="/donor/impact" element={<ProtectedRoute role="donor"><DonorImpact /></ProtectedRoute>} />
      <Route path="/donor/notifications" element={<ProtectedRoute role="donor"><DonorNotifications /></ProtectedRoute>} />
      <Route path="/donor/profile" element={<ProtectedRoute role="donor"><DonorProfile /></ProtectedRoute>} />
      <Route path="/donor/privacy" element={<ProtectedRoute role="donor"><DonorPrivacy /></ProtectedRoute>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
