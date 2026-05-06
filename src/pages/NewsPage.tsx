import { Newspaper } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useNews } from "@/hooks/useKnowledge";
import { DownloadReportButton, dateColumn, listColumn } from "@/components/admin/DownloadReportButton";

export default function NewsPage() {
  const { data, isLoading, error } = useNews();

  return (
    <div className="container py-10 space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-3xl font-display font-bold flex items-center gap-2">
            <Newspaper className="h-7 w-7 text-primary" /> News
          </h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">
            Sector developments, partner announcements, and stories from the field.
          </p>
        </div>
        <DownloadReportButton
          rows={data ?? []}
          columns={[
            { key: "title", label: "Title" },
            { key: "summary", label: "Summary" },
            { key: "author_name", label: "Author" },
            dateColumn("published_at", "Published"),
            { key: "view_count", label: "Views" },
            listColumn("tags", "Tags"),
          ]}
          title="News Articles"
          filename="news"
        />
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          Failed to load articles.
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-64 w-full" />
          ))}
        </div>
      ) : (data ?? []).length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No published articles yet.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(data ?? []).map((article) => (
            <Card key={article.id} className="overflow-hidden flex flex-col">
              {article.hero_image_url && (
                <div className="aspect-video w-full bg-muted">
                  <img
                    src={article.hero_image_url}
                    alt={article.title}
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <CardHeader className="pb-2">
                <CardTitle className="text-base leading-tight">{article.title}</CardTitle>
                <CardDescription className="text-xs">
                  {article.author_name && <>by {article.author_name} · </>}
                  {article.published_at && new Date(article.published_at).toLocaleDateString()}
                </CardDescription>
              </CardHeader>
              <CardContent className="text-sm flex-1 flex flex-col justify-between gap-2">
                {article.summary && (
                  <p className="text-muted-foreground line-clamp-3">{article.summary}</p>
                )}
                {article.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {article.tags.slice(0, 4).map((t) => (
                      <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
