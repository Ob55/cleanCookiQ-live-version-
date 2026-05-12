import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Phone, User, ArrowLeft, Building2, Utensils } from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// ── Custom SVG icons ──────────────────────────────────────────────

// Institution icon — school/building silhouette (blue)
const institutionIcon = new L.DivIcon({
  html: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40">
    <path d="M16 0C7.16 0 0 7.16 0 16c0 12 16 24 16 24s16-12 16-24C32 7.16 24.84 0 16 0z" fill="#2563eb"/>
    <circle cx="16" cy="16" r="11" fill="#fff"/>
    <path d="M16 8l-7 4v1h14v-1L16 8zm-5 6v5h2v-3h2v3h2v-3h2v3h2v-5H11z" fill="#2563eb"/>
  </svg>`,
  iconSize: [32, 40],
  iconAnchor: [16, 40],
  popupAnchor: [0, -40],
  className: "",
});

// KPLC depot icon — lightning bolt (red/electric)
const kplcIcon = new L.DivIcon({
  html: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40">
    <path d="M16 0C7.16 0 0 7.16 0 16c0 12 16 24 16 24s16-12 16-24C32 7.16 24.84 0 16 0z" fill="#dc2626"/>
    <circle cx="16" cy="16" r="11" fill="#fff"/>
    <path d="M18 7l-6 10h4l-2 8 6-10h-4l2-8z" fill="#dc2626"/>
  </svg>`,
  iconSize: [32, 40],
  iconAnchor: [16, 40],
  popupAnchor: [0, -40],
  className: "",
});

// LPG depot icon — gas flame (amber/orange)
const lpgIcon = new L.DivIcon({
  html: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40">
    <path d="M16 0C7.16 0 0 7.16 0 16c0 12 16 24 16 24s16-12 16-24C32 7.16 24.84 0 16 0z" fill="#d97706"/>
    <circle cx="16" cy="16" r="11" fill="#fff"/>
    <path d="M16 7c0 0-5 4.5-5 8.5C11 18.5 13.5 21 16 21s5-2.5 5-5.5C21 11.5 16 7 16 7zm0 12c-1.66 0-3-1.34-3-3 0-1.31 1.16-2.93 3-4.72 1.84 1.79 3 3.41 3 4.72 0 1.66-1.34 3-3 3z" fill="#d97706"/>
  </svg>`,
  iconSize: [32, 40],
  iconAnchor: [16, 40],
  popupAnchor: [0, -40],
  className: "",
});

// ── Real, EPRA-registered LPG storage & filling facilities (Nairobi) ──
// Sources: EPRA Storage & Filling of LPG Register, BOC Kenya Wikipedia,
//          TotalEnergies Kenya, Kenya business directories
const LPG_DEPOTS = [
  // BOC Kenya Ltd — Kitui Road, Industrial Area, Nairobi
  // Coords verified via BOC Kenya Wikipedia & business listings
  { name: "BOC Kenya Ltd (Kitui Rd)", lat: -1.30499, lon: 36.85055 },
  // TotalEnergies LPG Plant — Tanga Road, Industrial Area, Nairobi
  // EPRA-registered facility; coords placed on Tanga Road within Industrial Area
  { name: "TotalEnergies LPG (Tanga Rd)", lat: -1.30280, lon: 36.83420 },
  // Alfa Gas Ltd — Enterprise Road, Embakasi South, Nairobi
  // EPRA-registered; coords on Enterprise Road, Industrial Area / Embakasi
  { name: "Alfa Gas Ltd (Enterprise Rd)", lat: -1.31200, lon: 36.86100 },
  // TEX Trading Ltd — North Airport Road, Nairobi
  // EPRA-registered
  { name: "TEX Trading Ltd (Airport Rd)", lat: -1.31950, lon: 36.87800 },
];

// ── Types ─────────────────────────────────────────────────────────

interface Institution {
  id: string;
  name: string;
  institution_type: string;
  county: string;
  sub_county: string | null;
  latitude: number | null;
  longitude: number | null;
  meals_per_day: number | null;
  number_of_students: number | null;
  current_fuel: string | null;
  contact_person: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  school_type: string | null;
  monthly_fuel_spend: number | null;
  number_of_staff: number | null;
}

// ── Helpers ───────────────────────────────────────────────────────

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function fuelLabel(fuel: string | null) {
  if (!fuel) return "Unknown";
  const map: Record<string, string> = {
    firewood: "Firewood",
    charcoal: "Charcoal",
    lpg: "LPG",
    biogas: "Biogas",
    electric: "Electric",
    other: "Other",
  };
  return map[fuel] || fuel;
}

function typeLabel(inst: Institution) {
  const parts: string[] = [];
  if (inst.school_type)
    parts.push(inst.school_type === "boarding" ? "Boarding" : "Day");
  const typeMap: Record<string, string> = {
    school: "School",
    hospital: "Hospital",
    prison: "Correctional",
    factory: "Factory",
    hotel: "Hotel",
    restaurant: "Restaurant",
    other: "Institution",
  };
  parts.push(typeMap[inst.institution_type] || inst.institution_type);
  return parts.join(" ");
}

// ── Child component that detects when map tiles are loaded ────────

function MapReadyHandler({ onReady }: { onReady: () => void }) {
  const map = useMap();
  useEffect(() => {
    const handler = () => onReady();
    map.whenReady(handler);
    // Also fire on first tileload as a fallback
    map.once("tileload", handler);
    return () => { map.off("tileload", handler); };
  }, [map, onReady]);
  return null;
}

// ── Skeleton overlay shown while map initializes ──────────────────

function MapSkeleton() {
  return (
    <div className="absolute inset-0 z-[999] rounded-xl bg-muted/80 backdrop-blur-sm flex flex-col items-center justify-center gap-4 animate-pulse pointer-events-none">
      {/* Fake markers with connecting lines */}
      <div className="relative w-48 h-48">
        {/* Institution (blue) */}
        <div className="absolute top-4 left-20 w-9 h-9 rounded-full bg-blue-300 border-2 border-blue-400 flex items-center justify-center">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="#2563eb"><path d="M12 3L4 9v1h16V9L12 3zM6 11v8h3v-5h6v5h3v-8H6z"/></svg>
        </div>
        {/* KPLC (red) */}
        <div className="absolute top-24 left-4 w-9 h-9 rounded-full bg-red-300 border-2 border-red-400 flex items-center justify-center">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="#dc2626"><path d="M13 2L5 13h5l-1 9 8-11h-5l1-9z"/></svg>
        </div>
        {/* LPG (amber) */}
        <div className="absolute top-24 right-6 w-9 h-9 rounded-full bg-amber-300 border-2 border-amber-400 flex items-center justify-center">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="#d97706"><path d="M12 2s-5 5-5 9.5S9.5 17 12 17s5-2 5-5.5S12 2 12 2zm0 13c-1.66 0-3-1.34-3-3 0-1.3 1.2-3 3-4.7 1.8 1.7 3 3.4 3 4.7 0 1.66-1.34 3-3 3z"/></svg>
        </div>
        {/* Lines */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 192 192">
          <line x1="96" y1="28" x2="28" y2="112" stroke="#ef4444" strokeWidth="2" strokeDasharray="6 4" opacity="0.5" />
          <line x1="96" y1="28" x2="152" y2="112" stroke="#d97706" strokeWidth="2" strokeDasharray="6 4" opacity="0.5" />
        </svg>
      </div>
      <p className="text-sm text-muted-foreground font-medium">Loading map...</p>
    </div>
  );
}

// ── Legend ────────────────────────────────────────────────────────

function MapLegend() {
  return (
    <div className="absolute bottom-3 left-3 z-[1000] rounded-lg bg-white/95 border border-border shadow-md px-3 py-2 text-xs space-y-1.5">
      <div className="flex items-center gap-2">
        <span className="inline-block w-3 h-3 rounded-full bg-blue-600" />
        Institution
      </div>
      <div className="flex items-center gap-2">
        <span className="inline-block w-3 h-3 rounded-full bg-red-600" />
        KPLC Depot
      </div>
      <div className="flex items-center gap-2">
        <span className="inline-block w-3 h-3 rounded-full bg-amber-600" />
        LPG Refill
      </div>
      <div className="flex items-center gap-2">
        <span className="inline-block w-2.5 border-t-2 border-dashed border-red-400" style={{ width: 16 }} />
        To KPLC
      </div>
      <div className="flex items-center gap-2">
        <span className="inline-block w-2.5 border-t-2 border-dashed border-amber-400" style={{ width: 16 }} />
        To LPG
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────

export default function KPLCInstitutions() {
  const { user } = useAuth();
  const [depot, setDepot] = useState<any>(null);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [selected, setSelected] = useState<Institution | null>(null);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: depotData } = await supabase
        .from("kplc_depots")
        .select("*")
        .eq("created_by", user.id)
        .limit(1)
        .maybeSingle();
      setDepot(depotData);

      if (depotData?.county) {
        const { data: instData } = await supabase
          .from("institutions")
          .select(
            "id, name, institution_type, county, sub_county, latitude, longitude, meals_per_day, number_of_students, current_fuel, contact_person, contact_phone, contact_email, school_type, monthly_fuel_spend, number_of_staff"
          )
          .eq("county", depotData.county)
          .order("name");
        setInstitutions(instData || []);
      }
    })();
  }, [user]);

  // Reset map state when selection changes
  useEffect(() => {
    if (selected) setMapReady(false);
  }, [selected]);

  const depotLat = depot?.latitude || -1.2921;
  const depotLon = depot?.longitude || 36.8219;

  const withDistance = useMemo(() => {
    return institutions
      .map((i) => ({
        ...i,
        distance:
          i.latitude && i.longitude
            ? haversineKm(depotLat, depotLon, i.latitude, i.longitude)
            : null,
      }))
      .sort((a, b) => (a.distance ?? 9999) - (b.distance ?? 9999));
  }, [institutions, depotLat, depotLon]);

  // Find nearest LPG depot to the selected institution
  const nearestLpg = useMemo(() => {
    if (!selected?.latitude || !selected?.longitude) return null;
    let best = { name: "", dist: Infinity, lat: 0, lon: 0 };
    for (const d of LPG_DEPOTS) {
      const dist = haversineKm(
        selected.latitude,
        selected.longitude,
        d.lat,
        d.lon
      );
      if (dist < best.dist)
        best = { name: d.name, dist, lat: d.lat, lon: d.lon };
    }
    return best.dist < Infinity ? best : null;
  }, [selected]);

  // ── Card list view ──────────────────────────────────────────────
  if (!selected) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-display font-bold">Institutions</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {institutions.length} institution
            {institutions.length !== 1 ? "s" : ""} in{" "}
            {depot?.county || "your county"}
          </p>
        </div>

        {institutions.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No institutions found in your county.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {withDistance.map((inst) => (
              <button
                key={inst.id}
                onClick={() => setSelected(inst)}
                className="text-left rounded-xl border border-border bg-card p-4 hover:border-primary/40 hover:shadow-md transition-all"
              >
                <p className="font-semibold">{inst.name}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {typeLabel(inst)} &middot;{" "}
                  {inst.number_of_students?.toLocaleString() || "?"} students
                </p>
                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Utensils className="h-3 w-3" /> {fuelLabel(inst.current_fuel)}
                  </span>
                  {inst.distance != null && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {inst.distance.toFixed(1)}{" "}
                      km
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Split detail view ───────────────────────────────────────────
  const selDist = withDistance.find((i) => i.id === selected.id)?.distance;
  const instLatLon: [number, number] | null =
    selected.latitude && selected.longitude
      ? [selected.latitude, selected.longitude]
      : null;
  const kplcLatLon: [number, number] = [depotLat, depotLon];
  const lpgLatLon: [number, number] | null = nearestLpg
    ? [nearestLpg.lat, nearestLpg.lon]
    : null;

  const mapCenter: [number, number] = instLatLon || kplcLatLon;

  return (
    <div className="space-y-4">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setSelected(null)}
        className="gap-1"
      >
        <ArrowLeft className="h-4 w-4" /> Back to institutions
      </Button>

      <div className="grid lg:grid-cols-2 gap-4 h-[calc(100vh-11rem)]">
        {/* Left: Map with skeleton overlay */}
        <div className="relative rounded-xl overflow-hidden border border-border h-full min-h-[350px]">
          {!mapReady && <MapSkeleton />}
          <MapContainer
            key={selected.id}
            center={mapCenter}
            zoom={13}
            className="h-full w-full"
            scrollWheelZoom
          >
            <MapReadyHandler onReady={() => setMapReady(true)} />
            <TileLayer
              attribution="&copy; OpenStreetMap"
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

              {/* Institution marker */}
              {instLatLon && (
                <Marker position={instLatLon} icon={institutionIcon}>
                  <Popup>
                    <strong>{selected.name}</strong>
                    <br />
                    {typeLabel(selected)}
                  </Popup>
                </Marker>
              )}

              {/* KPLC depot marker */}
              <Marker position={kplcLatLon} icon={kplcIcon}>
                <Popup>
                  <strong>{depot?.depot_name}</strong>
                  <br />
                  KPLC Depot
                  {selDist != null ? ` · ${selDist.toFixed(1)} km` : ""}
                </Popup>
              </Marker>

              {/* Nearest LPG depot marker */}
              {lpgLatLon && (
                <Marker position={lpgLatLon} icon={lpgIcon}>
                  <Popup>
                    <strong>{nearestLpg!.name}</strong>
                    <br />
                    LPG Refill · {nearestLpg!.dist.toFixed(1)} km from
                    institution
                  </Popup>
                </Marker>
              )}

              {/* Connecting line: Institution → KPLC (red dashed) */}
              {instLatLon && (
                <Polyline
                  positions={[instLatLon, kplcLatLon]}
                  pathOptions={{
                    color: "#dc2626",
                    weight: 2.5,
                    dashArray: "8 6",
                    opacity: 0.7,
                  }}
                />
              )}

              {/* Connecting line: Institution → LPG (amber dashed) */}
              {instLatLon && lpgLatLon && (
                <Polyline
                  positions={[instLatLon, lpgLatLon]}
                  pathOptions={{
                    color: "#d97706",
                    weight: 2.5,
                    dashArray: "8 6",
                    opacity: 0.7,
                  }}
                />
              )}
            </MapContainer>
          {mapReady && <MapLegend />}
        </div>

        {/* Right: Details */}
        <div className="overflow-y-auto space-y-4">
          <div>
            <h2 className="text-xl font-display font-bold uppercase tracking-wide">
              {selected.name}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {typeLabel(selected)} &middot;{" "}
              {selected.number_of_students?.toLocaleString() || "?"} students
            </p>
          </div>

          {/* Distance badges */}
          <div className="flex flex-wrap gap-2">
            {selDist != null && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 text-red-700 border border-red-200 px-3 py-1 text-xs font-medium">
                <span className="w-2 h-2 rounded-full bg-red-600" />
                KPLC Depot: {selDist.toFixed(1)} km
              </span>
            )}
            {nearestLpg && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1 text-xs font-medium">
                <span className="w-2 h-2 rounded-full bg-amber-600" />
                Nearest LPG: {nearestLpg.dist.toFixed(1)} km (
                {nearestLpg.name})
              </span>
            )}
          </div>

          {/* Energy profile */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Energy Profile</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-y-3 text-sm">
                <div className="text-muted-foreground">Cooking method</div>
                <div className="font-medium">
                  {fuelLabel(selected.current_fuel)}
                </div>

                <div className="text-muted-foreground">Meals per day</div>
                <div className="font-medium">
                  {selected.meals_per_day || "-"}
                </div>

                <div className="text-muted-foreground">Students / residents</div>
                <div className="font-medium">
                  {selected.number_of_students?.toLocaleString() || "-"}
                </div>

                <div className="text-muted-foreground">Staff</div>
                <div className="font-medium">
                  {selected.number_of_staff?.toLocaleString() || "-"}
                </div>

                <div className="text-muted-foreground">Monthly fuel spend</div>
                <div className="font-medium">
                  {selected.monthly_fuel_spend
                    ? `KSh ${selected.monthly_fuel_spend.toLocaleString()}`
                    : "-"}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact */}
          {(selected.contact_person ||
            selected.contact_phone ||
            selected.contact_email) && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Contact</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {selected.contact_person && (
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>{selected.contact_person}</span>
                  </div>
                )}
                {selected.contact_phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <a
                      href={`tel:${selected.contact_phone}`}
                      className="text-primary hover:underline"
                    >
                      {selected.contact_phone}
                    </a>
                  </div>
                )}
                {selected.contact_email && (
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <a
                      href={`mailto:${selected.contact_email}`}
                      className="text-primary hover:underline"
                    >
                      {selected.contact_email}
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
