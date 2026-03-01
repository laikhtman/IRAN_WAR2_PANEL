import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { MapContainer, TileLayer, CircleMarker, Popup, ImageOverlay, useMap } from "react-leaflet";
import { Maximize2, Home, Layers, X, Map } from "lucide-react";
import type { WarEvent, Alert, SatelliteImage } from "@shared/schema";
import "leaflet/dist/leaflet.css";

const eventColors: Record<string, string> = {
  missile_launch: "#ef4444",
  missile_intercept: "#22c55e",
  missile_hit: "#f97316",
  drone_launch: "#eab308",
  drone_intercept: "#06b6d4",
  air_raid_alert: "#ef4444",
  ceasefire: "#3b82f6",
  military_operation: "#a855f7",
  explosion: "#f97316",
  sirens: "#ef4444",
  naval_movement: "#0ea5e9",
  aircraft_tracking: "#a78bfa",
};

function MapUpdater() {
  const map = useMap();
  const hasSetView = useRef(false);

  useEffect(() => {
    if (!hasSetView.current) {
      map.setView([31.5, 45], 5);
      hasSetView.current = true;
    }
  }, [map]);

  return null;
}

const toolbarBtnClass = "w-8 h-8 rounded-md bg-card/90 backdrop-blur-sm border border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/50 transition-colors";

function FitBoundsButton({ events }: { events: WarEvent[] }) {
  const map = useMap();
  const fitBounds = useCallback(() => {
    if (events.length === 0) return;
    const lats = events.map(e => e.lat);
    const lngs = events.map(e => e.lng);
    map.fitBounds(
      [
        [Math.min(...lats), Math.min(...lngs)],
        [Math.max(...lats), Math.max(...lngs)],
      ],
      { padding: [40, 40] }
    );
  }, [events, map]);

  return (
    <button onClick={fitBounds} className={toolbarBtnClass} title="Fit all events">
      <Maximize2 className="w-4 h-4" />
    </button>
  );
}

function ResetViewButton() {
  const map = useMap();
  return (
    <button onClick={() => map.setView([31.5, 45], 5)} className={toolbarBtnClass} title="Reset view">
      <Home className="w-4 h-4" />
    </button>
  );
}

interface WarMapProps {
  events: WarEvent[];
  alerts: Alert[];
  isMobile?: boolean;
}

const TILE_LAYERS: Record<string, { url: string; label: string; attribution?: string }> = {
  dark: {
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    label: "Dark",
  },
  terrain: {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    label: "Terrain",
  },
  satellite: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    label: "Satellite",
  },
};

function getStoredMapStyle(): string {
  try { return localStorage.getItem("war-panel-map-style") || "dark"; } catch { return "dark"; }
}

export function WarMap({ events, alerts, isMobile = false }: WarMapProps) {
  const { t } = useTranslation();
  const [showSatellite, setShowSatellite] = useState(false);
  const [legendOpen, setLegendOpen] = useState(!isMobile);
  const [mapStyle, setMapStyle] = useState(getStoredMapStyle);
  const { data: satelliteImages } = useQuery<SatelliteImage[]>({
    queryKey: ["/api/satellite-images"],
    refetchInterval: 120000,
  });

  const cycleMapStyle = () => {
    const styles = Object.keys(TILE_LAYERS);
    const next = styles[(styles.indexOf(mapStyle) + 1) % styles.length];
    setMapStyle(next);
    try { localStorage.setItem("war-panel-map-style", next); } catch {}
  };

  const eventLabelKeys: Record<string, string> = {
    missile_launch: "events.types.missile_launch",
    missile_intercept: "events.types.missile_intercept",
    missile_hit: "events.types.missile_hit",
    drone_launch: "events.types.drone_launch",
    drone_intercept: "events.types.drone_intercept",
    air_raid_alert: "events.types.air_raid_alert",
    naval_movement: "events.types.naval_movement",
    aircraft_tracking: "events.types.aircraft_tracking",
  };

  return (
    <div className="relative w-full h-full" data-testid="war-map-container" role="application" aria-label="Interactive war event map">
      <MapContainer
        center={[31.5, 45]}
        zoom={5}
        className="w-full h-full"
        zoomControl={!isMobile}
        attributionControl={false}
        minZoom={3}
        maxZoom={isMobile ? 10 : 12}
        preferCanvas={true}
      >
        <TileLayer
          key={mapStyle}
          url={TILE_LAYERS[mapStyle]?.url || TILE_LAYERS.dark.url}
          {...(isMobile ? { detectRetina: false } : {})}
        />
        <MapUpdater />

        {/* Map control toolbar — bottom-right on mobile to avoid legend toggle conflict */}
        <div className={`absolute z-[1000] flex flex-col gap-1.5 ${
          isMobile ? "bottom-14 ltr:right-3 rtl:left-3" : "top-3 ltr:right-3 rtl:left-3"
        }`}>
          <FitBoundsButton events={events} />
          <ResetViewButton />
          <button onClick={cycleMapStyle} className={toolbarBtnClass} title={`Map: ${TILE_LAYERS[mapStyle]?.label || "Dark"}`}>
            <Map className="w-4 h-4" />
          </button>
        </div>

        {events.map((event) => {
          const isRecent = (Date.now() - new Date(event.timestamp).getTime()) < 300000;
          return (
            <CircleMarker
              key={event.id}
              center={[event.lat, event.lng]}
              radius={
                event.type === "missile_hit" || event.type === "explosion" ? 10 :
                event.type === "naval_movement" ? 5 :
                event.type === "aircraft_tracking" ? 4 :
                7
              }
              pathOptions={{
                color: eventColors[event.type] || "#06b6d4",
                fillColor: eventColors[event.type] || "#06b6d4",
                fillOpacity: 0.6,
                weight: 2,
                opacity: 0.8,
                className: isRecent ? "animate-pulse-glow" : "",
              }}
            >
            <Popup>
              <div className="bg-card text-card-foreground p-2 rounded-md min-w-[200px]">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="w-2 h-2 rounded-full inline-block"
                    style={{ backgroundColor: eventColors[event.type] }}
                  />
                  <span className="text-[11px] font-bold tracking-wider uppercase" style={{ color: eventColors[event.type] }}>
                    {t(`events.types.${event.type}`, event.type)}
                  </span>
                </div>
                <p className="text-xs font-semibold mb-1">{event.title}</p>
                <p className="text-[11px] opacity-70">{event.location}</p>
                <p className="text-[11px] opacity-50 mt-1">{event.source} - {new Date(event.timestamp).toLocaleTimeString()}</p>
              </div>
            </Popup>
            </CircleMarker>
          );
        })}

        {alerts.filter(a => a.active).map((alert) => (
          <CircleMarker
            key={`alert-${alert.id}`}
            center={[alert.lat, alert.lng]}
            radius={15}
            pathOptions={{
              color: "#ef4444",
              fillColor: "#ef4444",
              fillOpacity: 0.15,
              weight: 2,
              opacity: 0.5,
              dashArray: "4 4",
            }}
          >
            <Popup>
              <div className="bg-card text-card-foreground p-2 rounded">
                <p className="text-[11px] font-bold text-red-400 uppercase tracking-wider">{t("alerts.active", { count: 1 })}</p>
                <p className="text-xs font-semibold">{alert.area}</p>
                <p className="text-[11px] opacity-70">{alert.threat}</p>
              </div>
            </Popup>
          </CircleMarker>
        ))}

        {showSatellite && satelliteImages?.map((img) => (
          <ImageOverlay
            key={img.id}
            url={`/api/satellite-images/${img.id}/tile`}
            bounds={[
              [img.bboxSouth, img.bboxWest],
              [img.bboxNorth, img.bboxEast],
            ]}
            opacity={0.7}
          />
        ))}
      </MapContainer>

      {/* Legend: collapsible on mobile, always-visible on desktop */}
      {isMobile && !legendOpen && (
        <button
          onClick={() => setLegendOpen(true)}
          className="absolute top-3 ltr:left-3 rtl:right-3 z-[1000] w-8 h-8 rounded-md bg-card/90 backdrop-blur-sm border border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/50 transition-colors"
          title={t("map.legend")}
        >
          <Layers className="w-4 h-4" />
        </button>
      )}
      {legendOpen && (
        <div className="absolute top-3 ltr:left-3 rtl:right-3 z-[1000] pointer-events-none contain-layout">
          <div className="bg-card/90 backdrop-blur-sm border border-border rounded-md p-2.5 pointer-events-auto max-h-[calc(100%-80px)] overflow-y-auto">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground font-semibold">{t("map.legend")}</p>
              {isMobile && (
                <button
                  onClick={() => setLegendOpen(false)}
                  className="w-5 h-5 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors -me-1 -mt-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <div className="space-y-1">
              {Object.keys(eventLabelKeys).map((key) => (
                <div key={key} className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: eventColors[key] }} />
                  <span className="text-[11px] text-muted-foreground">{t(eventLabelKeys[key])}</span>
                </div>
              ))}
            </div>
            <div className="mt-2 pt-2 border-t border-border space-y-1">
              <button
                onClick={() => setShowSatellite(prev => !prev)}
                className="flex items-center gap-2 w-full text-left hover:bg-muted/50 rounded px-1 py-0.5 transition-colors"
              >
                <span className={`text-[11px] ${showSatellite ? "text-emerald-400" : "text-muted-foreground"}`}>
                  🛰 Sentinel Overlay
                </span>
                <span className={`w-1.5 h-1.5 rounded-full ${showSatellite ? "bg-emerald-400" : "bg-muted-foreground/30"}`} />
              </button>
              <div className="flex items-center gap-1">
                <Map className="w-3 h-3 text-muted-foreground" />
                <span className="text-[11px] text-muted-foreground">{TILE_LAYERS[mapStyle]?.label || "Dark"}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="absolute bottom-3 ltr:left-3 rtl:right-3 z-[1000] pointer-events-none contain-layout">
        <div className="bg-card/80 backdrop-blur-sm border border-border rounded-md px-3 py-1.5">
          <p className="text-[11px] uppercase tracking-[0.15em] text-primary font-semibold">
            {t("map.eventsTracked", { count: events.length })}
          </p>
        </div>
      </div>
    </div>
  );
}
