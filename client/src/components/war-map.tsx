import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import type { WarEvent, Alert } from "@shared/schema";
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

interface WarMapProps {
  events: WarEvent[];
  alerts: Alert[];
}

export function WarMap({ events, alerts }: WarMapProps) {
  const { t } = useTranslation();

  const eventLabelKeys: Record<string, string> = {
    missile_launch: "events.types.missile_launch",
    missile_intercept: "events.types.missile_intercept",
    missile_hit: "events.types.missile_hit",
    drone_launch: "events.types.drone_launch",
    drone_intercept: "events.types.drone_intercept",
    air_raid_alert: "events.types.air_raid_alert",
  };

  return (
    <div className="relative w-full h-full" data-testid="war-map-container">
      <MapContainer
        center={[31.5, 45]}
        zoom={5}
        className="w-full h-full"
        zoomControl={true}
        attributionControl={false}
        minZoom={3}
        maxZoom={12}
        preferCanvas={true}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapUpdater />

        {events.map((event) => (
          <CircleMarker
            key={event.id}
            center={[event.lat, event.lng]}
            radius={event.type === "missile_hit" || event.type === "explosion" ? 10 : 7}
            pathOptions={{
              color: eventColors[event.type] || "#06b6d4",
              fillColor: eventColors[event.type] || "#06b6d4",
              fillOpacity: 0.6,
              weight: 2,
              opacity: 0.8,
            }}
          >
            <Popup>
              <div className="bg-card text-card-foreground p-2 rounded-md min-w-[200px]" style={{ background: "hsl(220, 18%, 10%)", color: "hsl(200, 20%, 92%)" }}>
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="w-2 h-2 rounded-full inline-block"
                    style={{ backgroundColor: eventColors[event.type] }}
                  />
                  <span className="text-[10px] font-bold tracking-wider uppercase" style={{ color: eventColors[event.type] }}>
                    {t(`events.types.${event.type}`, event.type)}
                  </span>
                </div>
                <p className="text-xs font-semibold mb-1">{event.title}</p>
                <p className="text-[10px] opacity-70">{event.location}</p>
                <p className="text-[10px] opacity-50 mt-1">{event.source} - {new Date(event.timestamp).toLocaleTimeString()}</p>
              </div>
            </Popup>
          </CircleMarker>
        ))}

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
              <div style={{ background: "hsl(220, 18%, 10%)", color: "hsl(200, 20%, 92%)", padding: "8px", borderRadius: "4px" }}>
                <p className="text-[10px] font-bold text-red-400 uppercase tracking-wider">{t("alerts.active", { count: 1 })}</p>
                <p className="text-xs font-semibold">{alert.area}</p>
                <p className="text-[10px] opacity-70">{alert.threat}</p>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>

      <div className="absolute top-3 left-3 z-[1000] pointer-events-none">
        <div className="bg-card/90 backdrop-blur-sm border border-border rounded-md p-2.5">
          <p className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground mb-2 font-semibold">{t("map.legend")}</p>
          <div className="space-y-1">
            {Object.keys(eventLabelKeys).map((key) => (
              <div key={key} className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: eventColors[key] }} />
                <span className="text-[9px] text-muted-foreground">{t(eventLabelKeys[key])}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="absolute bottom-3 left-3 z-[1000] pointer-events-none">
        <div className="bg-card/80 backdrop-blur-sm border border-border rounded-md px-3 py-1.5">
          <p className="text-[9px] uppercase tracking-[0.15em] text-primary font-semibold">
            {t("map.eventsTracked", { count: events.length })}
          </p>
        </div>
      </div>
    </div>
  );
}
