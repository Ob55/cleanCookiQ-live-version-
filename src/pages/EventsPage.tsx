import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar, Clock, MapPin, Video, Download, Users } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useEvents, useRegisterEvent } from "@/hooks/useKnowledge";
import { eventToIcs, partitionEvents, type EventSummary } from "@/lib/knowledge";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export default function EventsPage() {
  const { data, isLoading } = useEvents();
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");

  const partitioned = partitionEvents(data ?? []);
  const list = tab === "upcoming" ? partitioned.upcoming : partitioned.past;

  return (
    <div className="container py-10 space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold flex items-center gap-2">
          <Calendar className="h-7 w-7 text-primary" /> Events
        </h1>
        <p className="text-muted-foreground mt-2 max-w-2xl">
          Summits, webinars, workshops, and trainings across Kenya's clean cooking sector.
        </p>
      </div>

      <div className="flex gap-2 border-b">
        {(["upcoming", "past"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t === "upcoming" ? `Upcoming (${partitioned.upcoming.length})` : `Past (${partitioned.past.length})`}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No {tab} events.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {list.map((e) => (
            <EventCard key={e.id} event={e} isPast={tab === "past"} />
          ))}
        </div>
      )}
    </div>
  );
}

function EventCard({ event, isPast }: { event: EventSummary; isPast: boolean }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const register = useRegisterEvent();
  const [registering, setRegistering] = useState(false);

  const start = new Date(event.start_at);
  const startLabel = start.toLocaleString("en-KE", {
    weekday: "short", month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit",
  });

  const handleRegister = async () => {
    if (!user) {
      navigate(`/auth/register?redirect=/events`);
      return;
    }
    if (!event.registration_required) return;
    setRegistering(true);
    try {
      await register.mutateAsync({
        eventId: event.id,
        userId: user.id,
        fullName: user.user_metadata?.full_name ?? user.email ?? "Attendee",
        email: user.email ?? "",
      });
      toast.success("You're registered. A calendar invite is below.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Could not register.";
      toast.error(msg);
    } finally {
      setRegistering(false);
    }
  };

  const handleDownloadIcs = () => {
    const ics = eventToIcs(event, window.location.origin);
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${event.slug || "event"}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div>
            <CardTitle className="text-lg">{event.title}</CardTitle>
            <CardDescription className="capitalize">{event.event_type}</CardDescription>
          </div>
          <div className="flex flex-wrap gap-1">
            <Badge variant="outline" className="capitalize">{event.location_type.replace("_", " ")}</Badge>
            {event.status === "cancelled" && <Badge variant="destructive">Cancelled</Badge>}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {event.description && <p className="text-muted-foreground">{event.description}</p>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" /> {startLabel}
          </div>
          {event.venue_name && (
            <div className="flex items-center gap-1">
              <MapPin className="h-3 w-3" /> {event.venue_name}{event.county_name ? ` · ${event.county_name}` : ""}
            </div>
          )}
          {event.virtual_url && !isPast && (
            <div className="flex items-center gap-1">
              <Video className="h-3 w-3" />
              <a href={event.virtual_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Join virtually</a>
            </div>
          )}
          {event.capacity != null && (
            <div className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {event.registration_count} registered
              {event.seats_remaining != null ? ` · ${event.seats_remaining} seats left` : ""}
            </div>
          )}
        </div>

        {isPast && event.recording_url && (
          <a
            href={event.recording_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
          >
            <Video className="h-4 w-4" /> Watch recording
          </a>
        )}

        {!isPast && (
          <div className="flex gap-2">
            {event.registration_required && (
              <Button size="sm" onClick={handleRegister} disabled={registering || event.status === "cancelled"}>
                {!user ? "Sign up to register" : registering ? "Registering..." : "Register"}
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={handleDownloadIcs}>
              <Download className="h-3 w-3 mr-1" /> Add to calendar
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
