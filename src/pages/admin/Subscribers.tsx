import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function Subscribers() {
  const { data: subscribers, isLoading } = useQuery({
    queryKey: ["newsletter-subscribers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("newsletter_subscribers" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold flex items-center gap-2">
          <Users className="h-6 w-6 text-primary" /> Newsletter Subscribers
        </h1>
        <p className="text-sm text-muted-foreground">Users who subscribed via the Marketing Analysis page</p>
      </div>

      <div className="bg-card border border-border rounded-lg p-4 shadow-card inline-block">
        <p className="text-2xl font-display font-bold">{subscribers?.length ?? 0}</p>
        <p className="text-xs text-muted-foreground">Total Subscribers</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-card">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left text-xs font-medium text-muted-foreground p-3">Name</th>
                <th className="text-left text-xs font-medium text-muted-foreground p-3">Email</th>
                <th className="text-left text-xs font-medium text-muted-foreground p-3">Subscribed</th>
              </tr>
            </thead>
            <tbody>
              {subscribers?.map((s: any) => (
                <tr key={s.id} className="border-b border-border/50 hover:bg-muted/30">
                  <td className="p-3 text-sm font-medium">{s.full_name}</td>
                  <td className="p-3 text-sm text-muted-foreground">{s.email}</td>
                  <td className="p-3 text-xs text-muted-foreground">{new Date(s.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
              {!subscribers?.length && (
                <tr><td colSpan={3} className="p-8 text-center text-muted-foreground">No subscribers yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
