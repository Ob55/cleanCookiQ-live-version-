import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft, Truck, ShieldCheck, AlertCircle, MapPin, Phone,
  Calendar, CheckCircle2, Circle, Camera,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useDelivery, useCommissioningChecklist, useCommissioningTemplates } from "@/hooks/useDeliveries";
import ProjectMilestonesSection from "@/components/admin/ProjectMilestonesSection";
import {
  DELIVERY_STAGES, deliveryProgress, isReadyForSignoff, stageLabel,
  type DeliveryStage,
} from "@/lib/delivery";

export default function AdminDeliveryDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: delivery, isLoading } = useDelivery(id);
  const { data: checklist } = useCommissioningChecklist(id);
  const { data: templates } = useCommissioningTemplates();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!delivery) {
    return (
      <div className="space-y-3">
        <Link to="/admin/deliveries" className="text-primary text-sm inline-flex items-center gap-1 hover:underline">
          <ArrowLeft className="h-4 w-4" /> All deliveries
        </Link>
        <h1 className="text-2xl font-display font-bold">Delivery not found</h1>
      </div>
    );
  }

  const template = templates?.find((t) => t.id === checklist?.template_id) ?? null;
  const ready = isReadyForSignoff(delivery);
  const progress = Math.round(deliveryProgress(delivery.stage) * 100);

  return (
    <div className="space-y-6">
      <Link to="/admin/deliveries" className="text-primary text-sm inline-flex items-center gap-1 hover:underline">
        <ArrowLeft className="h-4 w-4" /> All deliveries
      </Link>

      <div>
        <h1 className="text-2xl font-display font-bold flex items-center gap-2">
          <Truck className="h-6 w-6 text-primary" /> {delivery.project_title}
        </h1>
        <p className="text-muted-foreground mt-1">
          {delivery.institution_name}{delivery.institution_county ? ` · ${delivery.institution_county}` : ""}
          {delivery.provider_name ? ` · supplied by ${delivery.provider_name}` : ""}
        </p>
      </div>

      {/* Stage timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pipeline stage</CardTitle>
          <CardDescription>
            Currently {stageLabel(delivery.stage)} — {progress}% through the delivery pipeline.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-2 text-xs">
            {DELIVERY_STAGES.map((s, i) => {
              const active = s === delivery.stage;
              const reached = DELIVERY_STAGES.indexOf(delivery.stage as DeliveryStage) >= i;
              return (
                <li key={s} className={`flex flex-col items-center gap-1 text-center ${active ? "text-primary font-medium" : reached ? "text-foreground" : "text-muted-foreground"}`}>
                  {reached ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
                  <span>{stageLabel(s)}</span>
                </li>
              );
            })}
          </ol>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Logistics */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Logistics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Field label="Carrier" value={delivery.carrier} />
            <Field label="Tracking" value={delivery.tracking_ref} />
            <Field label="Delivery county" value={delivery.delivery_county} icon={<MapPin className="h-3 w-3" />} />
            <Field label="Address" value={delivery.delivery_address} />
            <Field label="Planned dispatch" value={delivery.planned_dispatch_at} icon={<Calendar className="h-3 w-3" />} />
            <Field label="Actual dispatch" value={delivery.actual_dispatch_at} icon={<Calendar className="h-3 w-3" />} />
            <Field label="Planned arrival" value={delivery.planned_arrival_at} icon={<Calendar className="h-3 w-3" />} />
            <Field label="Actual arrival" value={delivery.actual_arrival_at} icon={<Calendar className="h-3 w-3" />} />
            <Field label="Planned install" value={delivery.planned_install_at} icon={<Calendar className="h-3 w-3" />} />
            <Field label="Acceptance due" value={delivery.acceptance_due_at} icon={<Calendar className="h-3 w-3" />} />
          </CardContent>
        </Card>

        {/* Crew */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Installation crew</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Field label="Crew" value={delivery.crew_name ?? "Not yet assigned"} />
            <Field label="Lead" value={delivery.crew_lead} />
            {delivery.crew_phone && (
              <Field label="Phone" value={
                <a href={`tel:${delivery.crew_phone}`} className="text-primary hover:underline">{delivery.crew_phone}</a>
              } icon={<Phone className="h-3 w-3" />} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Commissioning checklist */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base">Commissioning checklist</CardTitle>
              <CardDescription>
                {template ? template.name : "No template attached yet."}
              </CardDescription>
            </div>
            {checklist && (
              <Badge variant={checklist.is_complete ? "secondary" : "outline"}>
                {checklist.completed_items} / {checklist.total_items}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!template ? (
            <p className="text-sm text-muted-foreground">
              An admin needs to attach a commissioning template (e.g. {templates?.[0]?.name ?? "LPG institutional"}) to this delivery.
            </p>
          ) : (
            <ul className="space-y-2">
              {template.items.map((item) => {
                const r = checklist?.responses?.[item.id];
                const checked = r?.checked === true;
                return (
                  <li key={item.id} className="flex items-start gap-2 text-sm">
                    {checked ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                    ) : (
                      <Circle className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    )}
                    <div className="flex-1">
                      <p className={checked ? "text-foreground" : "text-muted-foreground"}>{item.requirement}</p>
                      {item.evidence_required && (
                        <p className="text-[10px] text-muted-foreground italic flex items-center gap-1 mt-0.5">
                          <Camera className="h-3 w-3" /> Evidence: {item.evidence_required}
                          {r?.evidence_url && (
                            <a href={r.evidence_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline ml-1">view</a>
                          )}
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Project milestones */}
      <ProjectMilestonesSection projectId={delivery.project_id} />

      {/* Acceptance */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" /> Acceptance signoff
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          {delivery.signed_off ? (
            <>
              <Badge variant="secondary" className="gap-1"><ShieldCheck className="h-3 w-3" /> Signed off</Badge>
              <p className="text-muted-foreground">
                {delivery.signed_off_by} on{" "}
                {delivery.signed_off_at && new Date(delivery.signed_off_at).toLocaleDateString()}
              </p>
            </>
          ) : ready ? (
            <p className="text-muted-foreground">
              <AlertCircle className="h-4 w-4 inline text-amber-600 mr-1" />
              Ready for signoff. The institution head can sign at the on-site visit; record details under
              the acceptance_signoffs table or via the field-agent flow.
            </p>
          ) : (
            <p className="text-muted-foreground">
              Signoff is gated until commissioning is complete and the delivery has reached the
              <span className="font-medium"> handover</span> stage.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, value, icon }: { label: string; value: React.ReactNode | null; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-muted-foreground flex items-center gap-1">
        {icon}{label}
      </span>
      <span className="text-right">{value ?? <span className="text-muted-foreground">—</span>}</span>
    </div>
  );
}
