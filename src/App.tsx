import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";

import PublicLayout from "@/components/layouts/PublicLayout";
import AdminLayout from "@/components/layouts/AdminLayout";

import HomePage from "@/pages/HomePage";
import MapPage from "@/pages/MapPage";
import IntelligencePage from "@/pages/IntelligencePage";
import ProvidersPage from "@/pages/ProvidersPage";
import AboutPage from "@/pages/AboutPage";

import LoginPage from "@/pages/auth/LoginPage";
import RegisterPage from "@/pages/auth/RegisterPage";
import VerifyEmailPage from "@/pages/auth/VerifyEmailPage";
import PendingApprovalPage from "@/pages/auth/PendingApprovalPage";
import ForgotPasswordPage from "@/pages/auth/ForgotPasswordPage";
import ResetPasswordPage from "@/pages/auth/ResetPasswordPage";

import PipelineDashboard from "@/pages/admin/PipelineDashboard";
import InstitutionManagement from "@/pages/admin/InstitutionManagement";
import InstitutionDetail from "@/pages/admin/InstitutionDetail";
import UserManagement from "@/pages/admin/UserManagement";
import AdminPlaceholder from "@/pages/admin/AdminPlaceholder";

import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public pages */}
            <Route element={<PublicLayout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/map" element={<MapPage />} />
              <Route path="/intelligence" element={<IntelligencePage />} />
              <Route path="/providers" element={<ProvidersPage />} />
              <Route path="/about" element={<AboutPage />} />
            </Route>

            {/* Auth pages */}
            <Route path="/auth/login" element={<LoginPage />} />
            <Route path="/auth/register" element={<RegisterPage />} />
            <Route path="/auth/verify-email" element={<VerifyEmailPage />} />
            <Route path="/auth/pending" element={<PendingApprovalPage />} />
            <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />

            {/* Admin pages (protected) */}
            <Route element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
              <Route path="/admin/pipeline" element={<PipelineDashboard />} />
              <Route path="/admin/institutions" element={<InstitutionManagement />} />
              <Route path="/admin/institutions/:id" element={<InstitutionDetail />} />
              <Route path="/admin/providers" element={<AdminPlaceholder title="Provider Management" />} />
              <Route path="/admin/assessments" element={<AdminPlaceholder title="Assessment Review Queue" />} />
              <Route path="/admin/opportunities" element={<AdminPlaceholder title="Opportunity Management" />} />
              <Route path="/admin/bd" element={<AdminPlaceholder title="BD Dashboard" />} />
              <Route path="/admin/users" element={<UserManagement />} />
              <Route path="/admin/scoring/config" element={<AdminPlaceholder title="Scoring Weight Configuration" />} />
              <Route path="/admin/engine/costs" element={<AdminPlaceholder title="Cost Table Configuration" />} />
              <Route path="/admin/audit" element={<AdminPlaceholder title="System Audit Log" />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
