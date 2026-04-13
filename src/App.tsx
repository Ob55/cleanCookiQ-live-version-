import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";

import PublicLayout from "@/components/layouts/PublicLayout";
import AdminLayout from "@/components/layouts/AdminLayout";
import InstitutionLayout from "@/components/layouts/InstitutionLayout";
import SupplierLayout from "@/components/layouts/SupplierLayout";
import FunderLayout from "@/components/layouts/FunderLayout";

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
import ProviderManagement from "@/pages/admin/ProviderManagement";
import ProviderDetail from "@/pages/admin/ProviderDetail";
import AssessmentQueue from "@/pages/admin/AssessmentQueue";
import OpportunityManagement from "@/pages/admin/OpportunityManagement";
import BDDashboard from "@/pages/admin/BDDashboard";
import ScoringConfig from "@/pages/admin/ScoringConfig";
import CostConfig from "@/pages/admin/CostConfig";
import AuditLog from "@/pages/admin/AuditLog";
import PortfolioManagement from "@/pages/admin/PortfolioManagement";
import ProgramManagement from "@/pages/admin/ProgramManagement";

import TADashboard from "@/pages/ta/TADashboard";
import FinancingPage from "@/pages/FinancingPage";

import InstitutionSetup from "@/pages/institution/InstitutionSetup";
import InstitutionDashboard from "@/pages/institution/InstitutionDashboard";
import InstitutionProfile from "@/pages/institution/InstitutionProfile";
import CookingAlchemy from "@/pages/institution/CookingAlchemy";
import InstitutionDocuments from "@/pages/institution/InstitutionDocuments";
import InstitutionSupport from "@/pages/institution/InstitutionSupport";

import SupplierSetup from "@/pages/supplier/SupplierSetup";
import SupplierDashboard from "@/pages/supplier/SupplierDashboard";
import SupplierProducts from "@/pages/supplier/SupplierProducts";
import SupplierServices from "@/pages/supplier/SupplierServices";
import SupplierDocuments from "@/pages/supplier/SupplierDocuments";
import FunderDashboard from "@/pages/funder/FunderDashboard";
import FunderInstitutionDetail from "@/pages/funder/FunderInstitutionDetail";

import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
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

            {/* Auth pages */}
            <Route path="/auth/login" element={<LoginPage />} />
            <Route path="/auth/register" element={<RegisterPage />} />
            <Route path="/auth/verify-email" element={<VerifyEmailPage />} />
            <Route path="/auth/pending" element={<PendingApprovalPage />} />
            <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />

            {/* TA Dashboard */}
            <Route path="/ta/dashboard" element={
              <ProtectedRoute><TADashboard /></ProtectedRoute>
            } />

            {/* Financing */}
            <Route path="/financing" element={
              <ProtectedRoute><FinancingPage /></ProtectedRoute>
            } />

            {/* Institution Setup (no sidebar) */}
            <Route path="/institution/setup" element={
              <ProtectedRoute><InstitutionSetup /></ProtectedRoute>
            } />

            {/* Institution pages (with sidebar) */}
            <Route element={<ProtectedRoute><InstitutionLayout /></ProtectedRoute>}>
              <Route path="/institution/dashboard" element={<InstitutionDashboard />} />
              <Route path="/institution/profile" element={<InstitutionProfile />} />
              <Route path="/institution/alchemy" element={<CookingAlchemy />} />
              <Route path="/institution/documents" element={<InstitutionDocuments />} />
              <Route path="/institution/support" element={<InstitutionSupport />} />
            </Route>

            {/* Supplier Setup (no sidebar) */}
            <Route path="/supplier/setup" element={
              <ProtectedRoute><SupplierSetup /></ProtectedRoute>
            } />

            {/* Supplier pages (with sidebar) */}
            <Route element={<ProtectedRoute><SupplierLayout /></ProtectedRoute>}>
              <Route path="/supplier/dashboard" element={<SupplierDashboard />} />
              <Route path="/supplier/products" element={<SupplierProducts />} />
              <Route path="/supplier/services" element={<SupplierServices />} />
              <Route path="/supplier/documents" element={<SupplierDocuments />} />
            </Route>

            {/* Funder pages (with sidebar) */}
            <Route element={<ProtectedRoute><FunderLayout /></ProtectedRoute>}>
              <Route path="/funder/dashboard" element={<FunderDashboard />} />
              <Route path="/funder/institution/:id" element={<FunderInstitutionDetail />} />
            </Route>

            {/* Admin pages (protected) */}
            <Route element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
              <Route path="/admin/pipeline" element={<PipelineDashboard />} />
              <Route path="/admin/institutions" element={<InstitutionManagement />} />
              <Route path="/admin/institutions/:id" element={<InstitutionDetail />} />
              <Route path="/admin/providers" element={<ProviderManagement />} />
              <Route path="/admin/providers/:id" element={<ProviderDetail />} />
              <Route path="/admin/assessments" element={<AssessmentQueue />} />
              <Route path="/admin/opportunities" element={<OpportunityManagement />} />
              <Route path="/admin/bd" element={<BDDashboard />} />
              <Route path="/admin/portfolio" element={<PortfolioManagement />} />
              <Route path="/admin/programs" element={<ProgramManagement />} />
              <Route path="/admin/users" element={<UserManagement />} />
              <Route path="/admin/scoring/config" element={<ScoringConfig />} />
              <Route path="/admin/engine/costs" element={<CostConfig />} />
              <Route path="/admin/audit" element={<AuditLog />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
