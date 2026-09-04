import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
// Marker clustering keeps dense rosters (e.g. the ~900-institution Makueni
// programme) legible: nearby pins collapse into a count bubble that expands on
// zoom, instead of hundreds of overlapping markers.
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import {
  makeMarkerIcon, institutionPopupHtml, institutionTypeColors, type MapInstitution,
} from "@/lib/mapMarkers";

// Shared Leaflet map + institution markers, used by both the national map
// (src/pages/MapPage.tsx) and the per-programme Map tab
// (src/pages/admin/ProgrammeDetail.tsx). Given a list of institutions it draws
// one type-coloured pin each and a popup; the caller owns any filtering. Marker
// helpers live in src/lib/mapMarkers.ts.

// National fallback view (roughly the centre of Kenya) when there is nothing
// to fit bounds to.
const KENYA_CENTER: [number, number] = [-0.0236, 37.9062];
const KENYA_ZOOM = 6;

export interface InstitutionMapProps {
  institutions: MapInstitution[];
  className?: string;
  // When true (default) the map zooms to fit the given institutions. Pass
  // false to keep the national default view (used by the national map page).
  fitToBounds?: boolean;
}

export default function InstitutionMap({ institutions, className, fitToBounds = true }: InstitutionMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<L.Map | null>(null);
  const markersRef = useRef<L.MarkerClusterGroup | null>(null);

  useEffect(() => {
    if (!mapRef.current || leafletMap.current) return;
    leafletMap.current = L.map(mapRef.current).setView(KENYA_CENTER, KENYA_ZOOM);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
    }).addTo(leafletMap.current);
    markersRef.current = L.markerClusterGroup({
      chunkedLoading: true,        // stream large rosters in without blocking
      showCoverageOnHover: false,
      maxClusterRadius: 55,
      spiderfyOnMaxZoom: true,
    }).addTo(leafletMap.current);
  }, []);

  useEffect(() => {
    const map = leafletMap.current;
    const group = markersRef.current;
    if (!map || !group) return;
    group.clearLayers();

    const geo = institutions.filter((i) => i.latitude != null && i.longitude != null);
    const markers: L.Marker[] = [];
    geo.forEach((inst) => {
      const color = institutionTypeColors[inst.institution_type] || "#64748b";
      const marker = L.marker([inst.latitude!, inst.longitude!], {
        icon: makeMarkerIcon(inst.institution_type, color),
      });
      marker.bindPopup(institutionPopupHtml(inst));
      markers.push(marker);
    });
    group.addLayers(markers); // bulk add — clusters compute once

    if (fitToBounds && markers.length) {
      map.fitBounds(group.getBounds().pad(0.15));
    }
  }, [institutions, fitToBounds]);

  return <div ref={mapRef} className={className ?? "h-full min-h-[70vh] w-full"} />;
}
