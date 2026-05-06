import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { HelpCircle, Building2, Factory, Banknote, Loader2, Mail, Phone, FileText } from "lucide-react";
import { sendEmail, emailRoleAssigned } from "@/lib/emailService";
import { DownloadReportButton, dateColumn } from "@/components/admin/DownloadReportButton";

const ROLE_OPTIONS = [
  { label: "Institution", value: "institution", role: "institution_admin", icon: Building2, color: "text-blue-600", setupUrl: "/institution/setup" },
  { label: "Provider / Supplier", value: "supplier", role: "ta_provider", icon: Factory, color: "text-orange-600", setupUrl: "/supplier/setup" },
  { label: "Funder", value: "funder", role: "financing_partner", icon: Banknote, color: "text-green-600", setupUrl: "/funder/dashboard" },
] as const;

type OtherProfile = {
  id: string;
  user_id: string;
  full_name: string | null;
  org_name: string | null;
  description: string | null;
  email: string | null;
  phone: string | null;
  approval_status: string;
  created_at: string;
};

export default function AdminOthers() {
  const [assigning, setAssigning] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: others, isLoading } = useQuery({
    queryKey: ["admin-others"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, user_id, full_name, org_name, description, email, phone, approval_status, created_at")
        .eq("org_type", "other")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as OtherProfile[];
    },
  });

  const assignMutation = useMutation({
    mutationFn: async ({ profile, newOrgType, role, label, setupUrl }: {
      profile: OtherProfile;
      newOrgType: string;
      role: string;
      label: string;
      setupUrl: string;
    }) => {
      // Update org_type and approval_status
      const { error: profileErr } = await supabase
        .from("profiles")
        .update({ org_type: newOrgType as any, approval_status: "approved" })
        .eq("user_id", profile.user_id);
      if (profileErr) throw profileErr;

      // Add role
      await supabase.from("user_roles").upsert({ user_id: profile.user_id, role: role as any }, { onConflict: "user_id,role", ignoreDuplicates: true });

      // Send approval email
      const dashboardUrl = `${import.meta.env.VITE_APP_URL || "https://cleancookiq.com"}${setupUrl}`;
      if (profile.email) {
        await sendEmail({
          to: profile.email,
          subject: `Your cleancookIQ account has been approved as ${label}`,
          html: emailRoleAssigned(profile.full_name || profile.org_name || "there", label, dashboardUrl),
        });
      }
    },
    onSuccess: (_, vars) => {
      toast.success(`${vars.profile.org_name || vars.profile.full_name} assigned as ${vars.label}`);
      queryClient.invalidateQueries({ queryKey: ["admin-others"] });
      setAssigning(null);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to assign role");
      setAssigning(null);
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <HelpCircle className="h-6 w-6 text-muted-foreground" /> Other Organisations
          </h1>
          <p className="text-sm text-muted-foreground">
            Organisations that registered as "Other" — review and assign them to an appropriate role.
          </p>
        </div>
        <DownloadReportButton
          rows={others ?? []}
          columns={[
            { key: "org_name", label: "Organisation" },
            { key: "full_name", label: "Contact" },
            { key: "email", label: "Email" },
            { key: "phone", label: "Phone" },
            { key: "description", label: "Description" },
            { key: "approval_status", label: "Status" },
            dateColumn("created_at", "Registered"),
          ]}
          title="Other Organisations"
          filename="other-organisations"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : !others?.length ? (
        <div className="text-center py-16 bg-card border border-border rounded-xl">
          <HelpCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="font-medium">No pending "Other" registrations</p>
          <p className="text-sm text-muted-foreground mt-1">New registrations will appear here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {others.map((profile) => (
            <div key={profile.id} className="bg-card border border-border rounded-xl p-5 shadow-card space-y-4">
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-sm">{profile.org_name || "(No org name)"}</p>
                  <p className="text-xs text-muted-foreground">{profile.full_name}</p>
                </div>
                <Badge variant={profile.approval_status === "approved" ? "default" : "secondary"} className="text-xs shrink-0">
                  {profile.approval_status}
                </Badge>
              </div>

              {/* Contact info */}
              <div className="space-y-1.5">
                {profile.email && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Mail className="h-3.5 w-3.5 shrink-0" />
                    <a href={`mailto:${profile.email}`} className="hover:text-foreground truncate">{profile.email}</a>
                  </div>
                )}
                {profile.phone && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Phone className="h-3.5 w-3.5 shrink-0" />
                    <span>{profile.phone}</span>
                  </div>
                )}
                {profile.description && (
                  <div className="flex items-start gap-2 text-xs text-muted-foreground">
                    <FileText className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    <p className="line-clamp-3">{profile.description}</p>
                  </div>
                )}
              </div>

              {/* Assign buttons */}
              {profile.approval_status !== "approved" && (
                <div className="pt-1 border-t border-border">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Assign as:</p>
                  <div className="flex flex-col gap-1.5">
                    {ROLE_OPTIONS.map((opt) => {
                      const isPending = assigning === profile.user_id;
                      return (
                        <Button
                          key={opt.value}
                          variant="outline"
                          size="sm"
                          className={`justify-start text-xs h-8 ${opt.color}`}
                          disabled={isPending || assignMutation.isPending}
                          onClick={() => {
                            setAssigning(profile.user_id);
                            assignMutation.mutate({
                              profile,
                              newOrgType: opt.value,
                              role: opt.role,
                              label: opt.label,
                              setupUrl: opt.setupUrl,
                            });
                          }}
                        >
                          {isPending && assignMutation.isPending ? (
                            <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                          ) : (
                            <opt.icon className="h-3.5 w-3.5 mr-2" />
                          )}
                          {opt.label}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              )}

              {profile.approval_status === "approved" && (
                <p className="text-xs text-center text-muted-foreground pt-1 border-t border-border">
                  Already assigned — check Users section for their current role.
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
