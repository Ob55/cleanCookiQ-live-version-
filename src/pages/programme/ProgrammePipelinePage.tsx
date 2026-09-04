import { useParams, useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useMyProgrammes, useProgramme, useProgrammeInstitutions, useProgrammeStages } from "@/hooks/usePrograms";
import BrandedLoader from "@/components/BrandedLoader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import cleancookIqLogo from "@/assets/cleancookiq-wordmark-light.png";
import { LogOut, Building2, Loader2, TrendingUp, Phone, MapPin, Utensils, Users } from "lucide-react";

// Scoped, read-only pipeline view for a single programme (tenant). This is
// the surface Taita Taveta County users land on — "limited entirely to its
// own pipeline". Access is enforced two ways: RLS filters institutions to the
// caller's programme(s), and this guard blocks the route unless the user is a
// host or a member of :id. The stage grouping is config-driven per programme
// (system_config programme_stages:<id>) — a finance programme and a deployment
// programme render the same board with different config.

export default function ProgrammePipelinePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading, isAdmin, signOut } = useAuth();
  const { data: memberships, isLoading: membershipsLoading } = useMyProgrammes();

  if (loading || membershipsLoading) return <BrandedLoader />;
  if (!user) return <Navigate to="/auth/login" replace />;

  const isMember = memberships?.some(m => m.programme_id === id);
  if (!isAdmin && !isMember) return <Navigate to="/" replace />;

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="h-14 border-b border-border bg-background/80 backdrop-blur-lg flex items-center justify-between px-4 lg:px-6 sticky top-0 z-20">
        <img src={cleancookIqLogo} alt="CleanCookIQ" className="h-7 w-auto object-contain" />
        <Button variant="ghost" size="sm" onClick={handleSignOut}>
          <LogOut className="h-4 w-4 mr-2" /> Sign out
        </Button>
      </header>
      <main className="max-w-4xl mx-auto p-4 lg:p-8">
        <PipelineBody programmeId={id!} />
      </main>
    </div>
  );
}

function PipelineBody({ programmeId }: { programmeId: string }) {
  const { data: programme } = useProgramme(programmeId);
  const { data: institutions, isLoading } = useProgrammeInstitutions(programmeId);
  const { data: stages = [] } = useProgrammeStages(programmeId);

  const total = institutions?.length ?? 0;
  const counts: Record<string, number> = {};
  institutions?.forEach(i => { counts[i.pipeline_stage] = (counts[i.pipeline_stage] || 0) + 1; });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold flex items-center gap-2">
          <TrendingUp className="h-6 w-6 text-primary" /> {programme?.name ?? "Pipeline"}
        </h1>
        <p className="text-sm text-muted-foreground">Clean-cooking transition pipeline for this programme</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stages.map(s => {
              const count = s.keys.reduce((sum, k) => sum + (counts[k] || 0), 0);
              const pct = total ? Math.round((count / total) * 100) : 0;
              return (
                <div key={s.label} className="bg-card border border-border rounded-xl p-4 shadow-card">
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className="text-xl font-display font-bold mt-1">{count}</p>
                  <p className="text-[11px] text-muted-foreground">{pct}% of {total}</p>
                </div>
              );
            })}
          </div>

          <div className="space-y-2">
            {!total ? (
              <p className="text-sm text-muted-foreground text-center py-8">No institutions in this pipeline yet.</p>
            ) : (
              institutions!.map(i => {
                const meals = i.meals_per_day ?? i.meals_served_per_day;
                const location = [i.sub_county, i.county].filter(Boolean).join(", ");
                const unit = ({ school: "students", prison: "inmates", hospital: "beds", hotel: "staff", restaurant: "staff" } as Record<string, string>)[i.institution_type] ?? "people";
                const headcount = i.number_of_students ?? i.number_of_staff;
                return (
                  <div key={i.id} className="flex items-start justify-between gap-3 bg-card border border-border rounded-lg px-4 py-3 shadow-card">
                    <div className="flex items-start gap-3 min-w-0">
                      <Building2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{i.name}</p>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground mt-0.5">
                          {location && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{location}</span>}
                          {headcount != null && <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" />{Number(headcount).toLocaleString()} {unit}</span>}
                          {meals != null && <span className="inline-flex items-center gap-1"><Utensils className="h-3 w-3" />{Number(meals).toLocaleString()} meals/day</span>}
                          {i.contact_person && <span>{i.contact_person}</span>}
                          {i.contact_phone && (
                            <a href={`tel:${i.contact_phone}`} className="inline-flex items-center gap-1 hover:text-foreground">
                              <Phone className="h-3 w-3" />{i.contact_phone}
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-xs shrink-0">{i.pipeline_stage}</Badge>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}
