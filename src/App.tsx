import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import BrandedLoader from "@/components/BrandedLoader";
import IdleLogoutGuard from "@/components/IdleLogoutGuard";
import { lazy, Suspense } from "react";

const PageLoader = () => <BrandedLoader />;

// Eagerly loaded (needed on first paint)
import PublicLayout from "@/components/layouts/PublicLayout";
import HomePage from "@/pages/HomePage";
import LoginPage from "@/pages/auth/LoginPage";

// Lazy loaded layouts
const AdminLayout = lazy(() => import("@/components/layouts/AdminLayout"));
const InstitutionLayout = lazy(() => import("@/components/layouts/InstitutionLayout"));
const SupplierLayout = lazy(() => import("@/components/layouts/SupplierLayout"));
const FunderLayout = lazy(() => import("@/components/layouts/FunderLayout"));
const ResearcherLayout = lazy(() => import("@/components/layouts/ResearcherLayout"));

// Lazy loaded public pages
const MapPage = lazy(() => import("@/pages/MapPage"));
const IntelligencePage = lazy(() => import("@/pages/IntelligencePage"));
const ProvidersPage = lazy(() => import("@/pages/ProvidersPage"));
const BookDemoPage = lazy(() => import("@/pages/BookDemoPage"));
const MarketingAnalysis = lazy(() => import("@/pages/MarketingAnalysis"));
const CountiesIndexPage = lazy(() => import("@/pages/CountiesIndexPage"));
const CountyDetailPage = lazy(() => import("@/pages/CountyDetailPage"));
const MarketplacePage = lazy(() => import("@/pages/MarketplacePage"));
const ProductDetailPage = lazy(() => import("@/pages/ProductDetailPage"));
const SupplierStorefrontPage = lazy(() => import("@/pages/SupplierStorefrontPage"));

// Lazy loaded auth pages
const RegisterPage = lazy(() => import("@/pages/auth/RegisterPage"));
const VerifyEmailPage = lazy(() => import("@/pages/auth/VerifyEmailPage"));
const PendingApprovalPage = lazy(() => import("@/pages/auth/PendingApprovalPage"));
const ForgotPasswordPage = lazy(() => import("@/pages/auth/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("@/pages/auth/ResetPasswordPage"));

// Lazy loaded admin pages
const PipelineDashboard = lazy(() => import("@/pages/admin/PipelineDashboard"));
const InstitutionManagement = lazy(() => import("@/pages/admin/InstitutionManagement"));
const InstitutionDetail = lazy(() => import("@/pages/admin/InstitutionDetail"));
const UserManagement = lazy(() => import("@/pages/admin/UserManagement"));
const ProviderManagement = lazy(() => import("@/pages/admin/ProviderManagement"));
const ProviderDetail = lazy(() => import("@/pages/admin/ProviderDetail"));
const AssessmentQueue = lazy(() => import("@/pages/admin/AssessmentQueue"));
const OpportunityManagement = lazy(() => import("@/pages/admin/OpportunityManagement"));
const BDDashboard = lazy(() => import("@/pages/admin/BDDashboard"));
const PortfolioManagement = lazy(() => import("@/pages/admin/PortfolioManagement"));
const PortfolioAggregation = lazy(() => import("@/pages/admin/PortfolioAggregation"));
const AdminTickets = lazy(() => import("@/pages/admin/AdminTickets"));
const Subscribers = lazy(() => import("@/pages/admin/Subscribers"));
const InstitutionImport = lazy(() => import("@/pages/admin/InstitutionImport"));

// Lazy loaded role pages
const TADashboard = lazy(() => import("@/pages/ta/TADashboard"));
const FinancingPage = lazy(() => import("@/pages/FinancingPage"));

const InstitutionSetup = lazy(() => import("@/pages/institution/InstitutionSetup"));
const InstitutionDashboard = lazy(() => import("@/pages/institution/InstitutionDashboard"));
const InstitutionProfile = lazy(() => import("@/pages/institution/InstitutionProfile"));
const CookingAlchemy = lazy(() => import("@/pages/institution/CookingAlchemy"));
const InstitutionDocuments = lazy(() => import("@/pages/institution/InstitutionDocuments"));
const InstitutionIPA = lazy(() => import("@/pages/institution/InstitutionIPA"));

const SupplierSetup = lazy(() => import("@/pages/supplier/SupplierSetup"));
const SupplierDashboard = lazy(() => import("@/pages/supplier/SupplierDashboard"));
const SupplierProducts = lazy(() => import("@/pages/supplier/SupplierProducts"));
const SupplierServices = lazy(() => import("@/pages/supplier/SupplierServices"));
const SupplierDocuments = lazy(() => import("@/pages/supplier/SupplierDocuments"));
const SupplierOpportunities = lazy(() => import("@/pages/supplier/SupplierOpportunities"));
const SupplierMOU = lazy(() => import("@/pages/supplier/SupplierMOU"));

const FunderDashboard = lazy(() => import("@/pages/funder/FunderDashboard"));
const FunderInstitutionDetail = lazy(() => import("@/pages/funder/FunderInstitutionDetail"));
const FunderDocuments = lazy(() => import("@/pages/funder/FunderDocuments"));

const ResearcherDashboard = lazy(() => import("@/pages/researcher/ResearcherDashboard"));
const ResearcherInstitutionDetail = lazy(() => import("@/pages/researcher/ResearcherInstitutionDetail"));
const AdminResearchers = lazy(() => import("@/pages/admin/AdminResearchers"));
const AdminOthers = lazy(() => import("@/pages/admin/AdminOthers"));
const AdminMOUIPA = lazy(() => import("@/pages/admin/AdminMOUIPA"));

const TicketsPage = lazy(() => import("@/pages/shared/TicketsPage"));
const NotFound = lazy(() => import("@/pages/NotFound"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <IdleLogoutGuard />
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Public pages */}
              <Route element={<PublicLayout />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/map" element={<MapPage />} />
                <Route path="/intelligence" element={<IntelligencePage />} />
                <Route path="/providers" element={<ProvidersPage />} />
                <Route path="/marketing" element={<MarketingAnalysis />} />
                <Route path="/counties" element={<CountiesIndexPage />} />
                <Route path="/counties/:slug" element={<CountyDetailPage />} />
                <Route path="/marketplace" element={<MarketplacePage />} />
                <Route path="/products/:id" element={<ProductDetailPage />} />
                <Route path="/suppliers/:id" element={<SupplierStorefrontPage />} />
                <Route path="/book-demo" element={<BookDemoPage />} />
              </Route>

              {/* Auth pages */}
              <Route path="/auth/login" element={<LoginPage />} />
              <Route path="/auth/register" element={<RegisterPage />} />
              <Route path="/auth/verify-email" element={<VerifyEmailPage />} />
              <Route path="/auth/pending" element={<PendingApprovalPage />} />
              <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />

              {/* TA Dashboard */}
              <Route path="/ta/dashboard" element={
                <ProtectedRoute allowedRoles={["ta_provider"]} allowedOrgTypes={["supplier"]}>
                  <TADashboard />
                </ProtectedRoute>
              } />

              {/* Financing */}
              <Route path="/financing" element={
                <ProtectedRoute allowedRoles={["financing_partner"]} allowedOrgTypes={["funder"]}>
                  <FinancingPage />
                </ProtectedRoute>
              } />

              {/* Institution Setup (no sidebar) */}
              <Route path="/institution/setup" element={
                <ProtectedRoute allowedRoles={["institution_admin", "institution_user"]} allowedOrgTypes={["institution"]}>
                  <InstitutionSetup />
                </ProtectedRoute>
              } />

              {/* Institution pages (with sidebar) */}
              <Route element={
                <ProtectedRoute allowedRoles={["institution_admin", "institution_user"]} allowedOrgTypes={["institution"]}>
                  <InstitutionLayout />
                </ProtectedRoute>
              }>
                <Route path="/institution/dashboard" element={<InstitutionDashboard />} />
                <Route path="/institution/profile" element={<InstitutionProfile />} />
                <Route path="/institution/alchemy" element={<CookingAlchemy />} />
                <Route path="/institution/documents" element={<InstitutionDocuments />} />
                <Route path="/institution/ipa" element={<InstitutionIPA />} />
                <Route path="/institution/support" element={<TicketsPage />} />
              </Route>

              {/* Supplier Setup (no sidebar) */}
              <Route path="/supplier/setup" element={
                <ProtectedRoute allowedRoles={["ta_provider"]} allowedOrgTypes={["supplier"]}>
                  <SupplierSetup />
                </ProtectedRoute>
              } />

              {/* Supplier pages (with sidebar) */}
              <Route element={
                <ProtectedRoute allowedRoles={["ta_provider"]} allowedOrgTypes={["supplier"]}>
                  <SupplierLayout />
                </ProtectedRoute>
              }>
                <Route path="/supplier/dashboard" element={<SupplierDashboard />} />
                <Route path="/supplier/products" element={<SupplierProducts />} />
                <Route path="/supplier/services" element={<SupplierServices />} />
                <Route path="/supplier/documents" element={<SupplierDocuments />} />
                <Route path="/supplier/opportunities" element={<SupplierOpportunities />} />
                <Route path="/supplier/mou" element={<SupplierMOU />} />
                <Route path="/supplier/support" element={<TicketsPage />} />
              </Route>

              {/* Funder pages (with sidebar) */}
              <Route element={
                <ProtectedRoute allowedRoles={["financing_partner"]} allowedOrgTypes={["funder"]}>
                  <FunderLayout />
                </ProtectedRoute>
              }>
                <Route path="/funder/dashboard" element={<FunderDashboard />} />
                <Route path="/funder/institution/:id" element={<FunderInstitutionDetail />} />
                <Route path="/funder/documents" element={<FunderDocuments />} />
                <Route path="/funder/support" element={<TicketsPage />} />
              </Route>

              {/* Researcher pages (with sidebar) */}
              <Route element={
                <ProtectedRoute allowedOrgTypes={["researcher"]}>
                  <ResearcherLayout />
                </ProtectedRoute>
              }>
                <Route path="/researcher/dashboard" element={<ResearcherDashboard />} />
                <Route path="/researcher/institution/:id" element={<ResearcherInstitutionDetail />} />
                <Route path="/researcher/support" element={<TicketsPage />} />
              </Route>

              {/* Admin pages (protected) */}
              <Route element={<ProtectedRoute requireAdmin><AdminLayout /></ProtectedRoute>}>
                <Route path="/admin/pipeline" element={<PipelineDashboard />} />
                <Route path="/admin/institutions" element={<InstitutionManagement />} />
                <Route path="/admin/institutions/import" element={<InstitutionImport />} />
                <Route path="/admin/institutions/:id" element={<InstitutionDetail />} />
                <Route path="/admin/providers" element={<ProviderManagement />} />
                <Route path="/admin/providers/:id" element={<ProviderDetail />} />
                <Route path="/admin/assessments" element={<AssessmentQueue />} />
                <Route path="/admin/opportunities" element={<OpportunityManagement />} />
                <Route path="/admin/bd" element={<BDDashboard />} />
                <Route path="/admin/portfolio" element={<PortfolioManagement />} />
                <Route path="/admin/portfolio-aggregation" element={<PortfolioAggregation />} />
                <Route path="/admin/researchers" element={<AdminResearchers />} />
                <Route path="/admin/others" element={<AdminOthers />} />
                <Route path="/admin/mou-ipa" element={<AdminMOUIPA />} />
                <Route path="/admin/tickets" element={<AdminTickets />} />
                <Route path="/admin/subscribers" element={<Subscribers />} />
                <Route path="/admin/users" element={<UserManagement />} />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
