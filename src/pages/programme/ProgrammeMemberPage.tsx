import { useParams, useNavigate, Navigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useMyProgrammes, useMyProgrammeList } from "@/hooks/usePrograms";
import { ProgrammeWorkspace } from "@/pages/admin/ProgrammeDetail";
import BrandedLoader from "@/components/BrandedLoader";
import AIAssistant from "@/components/assistant/AIAssistant";
import { Button } from "@/components/ui/button";
import cleancookIqLogo from "@/assets/cleancookiq-wordmark-light.png";
import { LogOut, FolderKanban } from "lucide-react";

// Project member portal. A non-host user added to a project (lead/editor/
// viewer) lands here: a minimal shell whose only nav item is their project,
// rendering the same workspace the admin sees. Capabilities come from their
// membership role — lead/editor can edit, viewer is read-only. RLS enforces
// the same rules server-side, so this is only about what controls to show.
export default function ProgrammeMemberPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading, isAdmin, signOut } = useAuth();
  const { data: memberships, isLoading } = useMyProgrammes();
  const { data: myProgrammes = [] } = useMyProgrammeList();

  if (loading || isLoading) return <BrandedLoader />;
  if (!user) return <Navigate to="/auth/login" replace />;

  const membership = memberships?.find(m => m.programme_id === id);
  if (!isAdmin && !membership) return <Navigate to="/" replace />;

  const role = membership?.role;
  const currentName = myProgrammes.find(p => p.id === id)?.name ?? "Project";
  // County pipeline viewers get the dedicated read-only pipeline screen.
  if (role === "county_pipeline_viewer") {
    return <Navigate to={`/programme/${id}/pipeline`} replace />;
  }

  const canEdit = isAdmin || role === "programme_lead" || role === "programme_editor";
  const canManageMembers = isAdmin || role === "programme_lead";

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="hidden lg:flex w-60 flex-col fixed inset-y-0 left-0 bg-sidebar border-r border-sidebar-border z-30">
        <div className="p-5 border-b border-sidebar-border">
          <img src={cleancookIqLogo} alt="CleanCookIQ" className="h-8 w-auto object-contain" />
          <p className="text-xs text-sidebar-foreground/60 mt-1">Project workspace</p>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wide text-sidebar-foreground/40">My projects</p>
          {(myProgrammes.length ? myProgrammes : [{ id: id!, name: currentName, role: role! }]).map((p) => {
            const active = p.id === id;
            return (
              <Link
                key={p.id}
                to={p.role === "county_pipeline_viewer" ? `/programme/${p.id}/pipeline` : `/programme/${p.id}`}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  active ? "bg-sidebar-accent text-sidebar-primary" : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50"
                }`}
              >
                <FolderKanban className="h-4 w-4 shrink-0" />
                <span className="truncate">{p.name}</span>
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-sidebar-border">
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors w-full"
          >
            <LogOut className="h-4 w-4" /> Sign Out
          </button>
        </div>
      </aside>

      <div className="flex-1 lg:ml-60">
        <header className="sticky top-0 z-20 h-14 border-b border-border bg-background/80 backdrop-blur-lg flex items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-2 lg:hidden">
            <img src={cleancookIqLogo} alt="CleanCookIQ" className="h-6 w-auto object-contain" />
          </div>
          <div className="flex-1" />
          <Button variant="ghost" size="sm" onClick={handleSignOut} className="lg:hidden">
            <LogOut className="h-4 w-4 mr-2" /> Sign out
          </Button>
        </header>
        <main className="p-4 lg:p-6">
          <ProgrammeWorkspace programmeId={id!} canEdit={canEdit} canManageMembers={canManageMembers} />
        </main>
      </div>

      <AIAssistant persona="other" />
    </div>
  );
}
