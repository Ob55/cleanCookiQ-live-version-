import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Library, Download, ExternalLink, FileText, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useResources, useLogResourceDownload } from "@/hooks/useKnowledge";
import {
  applyResourceFilters,
  formatFileSize,
  resourceTypeLabel,
  type Resource,
  type ResourceType,
} from "@/lib/knowledge";
import { useAuth } from "@/contexts/AuthContext";
import { DownloadReportButton, listColumn, dateColumn } from "@/components/admin/DownloadReportButton";

const TYPES: ResourceType[] = [
  "guide", "standard", "template", "report", "case_study",
  "training_module", "toolkit", "dataset", "presentation", "other",
];

export default function ResourcesPage() {
  const { data, isLoading } = useResources();
  const [type, setType] = useState<ResourceType | "">("");
  const [search, setSearch] = useState("");

  const filtered = useMemo(
    () =>
      applyResourceFilters(data ?? [], {
        type: type || null,
        search: search || null,
      }),
    [data, type, search],
  );

  return (
    <div className="container py-10 space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-3xl font-display font-bold flex items-center gap-2">
            <Library className="h-7 w-7 text-primary" /> Resource Library
          </h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">
            Guides, standards, templates, reports, and training modules for institutions,
            suppliers, funders, and researchers in Kenya's clean cooking sector.
          </p>
        </div>
        <DownloadReportButton
          rows={filtered}
          columns={[
            { key: "title", label: "Title" },
            { key: "resource_type", label: "Type", format: (r: Resource) => resourceTypeLabel(r.resource_type) },
            { key: "description", label: "Description" },
            listColumn("audience", "Audience"),
            { key: "file_url", label: "File URL" },
            { key: "external_url", label: "External URL" },
            { key: "view_count", label: "Views" },
            { key: "download_count", label: "Downloads" },
            listColumn("tags", "Tags"),
            dateColumn("published_at", "Published"),
          ]}
          title="Resource Library"
          filename="resources"
          subtitle={`Filters — type: ${type || "all"}, search: "${search || "—"}"`}
        />
      </div>

      <Card>
        <CardContent className="pt-6 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search resources..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setType("")}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                type === ""
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-muted-foreground border-border hover:border-primary/40"
              }`}
            >
              All types
            </button>
            {TYPES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  type === t
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-muted-foreground border-border hover:border-primary/40"
                }`}
              >
                {resourceTypeLabel(t)}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No resources match your filters yet.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((r) => (
            <ResourceCard key={r.id} resource={r} />
          ))}
        </div>
      )}
    </div>
  );
}

function ResourceCard({ resource }: { resource: Resource }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const log = useLogResourceDownload();

  const url = resource.file_url || resource.external_url;
  const requiresSignIn = resource.requires_signin && !user;

  const handleDownload = (e: React.MouseEvent) => {
    if (requiresSignIn) {
      e.preventDefault();
      navigate(`/auth/register?redirect=/resources`);
      return;
    }
    if (url) {
      log.mutate({ resourceId: resource.id, userId: user?.id ?? null });
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base leading-tight">{resource.title}</CardTitle>
          <Badge variant="outline" className="text-xs shrink-0">
            {resourceTypeLabel(resource.resource_type)}
          </Badge>
        </div>
        {resource.description && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-3">{resource.description}</p>
        )}
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-end gap-2">
        <div className="text-xs text-muted-foreground flex items-center gap-2">
          <FileText className="h-3 w-3" />
          {formatFileSize(resource.file_size_bytes)}
          {resource.page_count ? ` · ${resource.page_count} pp` : ""}
        </div>
        {resource.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {resource.tags.slice(0, 3).map((t) => (
              <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>
            ))}
          </div>
        )}
        {url ? (
          <Button
            asChild={!requiresSignIn}
            size="sm"
            className="w-full"
            onClick={requiresSignIn ? handleDownload : undefined}
          >
            {requiresSignIn ? (
              <span>Sign up to download</span>
            ) : (
              <a href={url} target="_blank" rel="noopener noreferrer" onClick={handleDownload}>
                {resource.external_url ? (
                  <>Open <ExternalLink className="h-3 w-3 ml-1" /></>
                ) : (
                  <>Download <Download className="h-3 w-3 ml-1" /></>
                )}
              </a>
            )}
          </Button>
        ) : (
          <Button size="sm" variant="outline" disabled className="w-full">Coming soon</Button>
        )}
      </CardContent>
    </Card>
  );
}
