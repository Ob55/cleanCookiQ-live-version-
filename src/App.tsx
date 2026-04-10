import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

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

import PipelineDashboard from "@/pages/admin/PipelineDashboard";
import AdminPlaceholder from "@/pages/admin/AdminPlaceholder";

import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Public pages */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/map" element={<MapPage />} />
            <Route path="/intelligence" element={<IntelligencePage />} />
            <Route path="/providers" element={<ProvidersPage />} />
            <Route path="/about" element={<AboutPage />} />
          </Route>

          {/* Auth pages (no layout) */}
          <Route path="/auth/login" element={<LoginPage />} />
          <Route path="/auth/register" element={<RegisterPage />} />
          <Route path="/auth/verify-email" element={<VerifyEmailPage />} />
          <Route path="/auth/pending" element={<PendingApprovalPage />} />
          <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />

          {/* Admin pages */}
          <Route element={<AdminLayout />}>
            <Route path="/admin/pipeline" element={<PipelineDashboard />} />
            <Route path="/admin/institutions" element={<AdminPlaceholder title="Institution Management" />} />
            <Route path="/admin/providers" element={<AdminPlaceholder title="Provider Management" />} />
            <Route path="/admin/assessments" element={<AdminPlaceholder title="Assessment Review Queue" />} />
            <Route path="/admin/opportunities" element={<AdminPlaceholder title="Opportunity Management" />} />
            <Route path="/admin/bd" element={<AdminPlaceholder title="BD Dashboard" />} />
            <Route path="/admin/users" element={<AdminPlaceholder title="User Management" />} />
            <Route path="/admin/scoring/config" element={<AdminPlaceholder title="Scoring Weight Configuration" />} />
            <Route path="/admin/engine/costs" element={<AdminPlaceholder title="Cost Table Configuration" />} />
            <Route path="/admin/audit" element={<AdminPlaceholder title="System Audit Log" />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
