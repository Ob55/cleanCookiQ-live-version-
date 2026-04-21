import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Save, Loader2 } from "lucide-react";

interface Props {
  institutionId: string;
}

export default function TransitionNeedsSection({ institutionId }: Props) {
  const [needs, setNeeds] = useState("");
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("institutions")
        .select("transition_needs")
        .eq("id", institutionId)
        .single();
      if (data) setNeeds((data as any).transition_needs || "");
      setLoaded(true);
    })();
  }, [institutionId]);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("institutions")
      .update({ transition_needs: needs } as any)
      .eq("id", institutionId);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Transition needs saved");
  };

  if (!loaded) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">What We Need for Transitioning</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Textarea
          value={needs}
          onChange={e => setNeeds(e.target.value)}
          placeholder="Describe what you need: equipment, installation support, financing, training, or anything else..."
          rows={4}
        />
        <Button onClick={handleSave} disabled={saving} size="sm">
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
          Save
        </Button>
      </CardContent>
    </Card>
  );
}
