import { useMemo } from "react";
import L, { DragEndEvent } from "leaflet";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { LatLng, getDefaultIndiaCenter, getTomTomRasterTileUrl } from "@/lib/tomtom";

type PinLocationMapProps = {
  center?: LatLng | null;
  marker?: LatLng | null;
  zoom?: number;
  heightClassName?: string;
  onPick: (position: LatLng) => void;
};

const markerIcon = L.divIcon({
  className: "map-pin-icon",
  html: '<div style="width:20px;height:20px;border-radius:9999px;background:#d97706;border:4px solid #fff;box-shadow:0 12px 24px rgba(15,23,42,0.28);"></div>',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

function RecenterMap({ center, zoom }: { center: LatLng; zoom: number }): null {
  const map = useMap();
  map.setView([center.lat, center.lng], zoom, { animate: true });
  return null;
}

function MapClickCapture({ onPick }: { onPick: (position: LatLng) => void }): null {
  useMapEvents({
    click(event) {
      onPick({ lat: event.latlng.lat, lng: event.latlng.lng });
    },
  });

  return null;
}

export function PinLocationMap({
  center,
  marker,
  zoom = 14,
  heightClassName = "h-[320px]",
  onPick,
}: PinLocationMapProps): JSX.Element {
  const fallbackCenter = center ?? marker ?? getDefaultIndiaCenter();
  const tileUrl = useMemo(() => getTomTomRasterTileUrl(), []);

  return (
    <div className={`overflow-hidden rounded-[28px] border border-[#eadfce] shadow-soft ${heightClassName}`}>
      <MapContainer
        center={[fallbackCenter.lat, fallbackCenter.lng]}
        zoom={zoom}
        scrollWheelZoom
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.tomtom.com/">TomTom</a>'
          url={tileUrl}
          subdomains={["a", "b", "c", "d"]}
        />
        <RecenterMap center={fallbackCenter} zoom={zoom} />
        <MapClickCapture onPick={onPick} />
        {marker ? (
          <Marker
            draggable
            position={[marker.lat, marker.lng]}
            icon={markerIcon}
            eventHandlers={{
              dragend(event) {
                const nextPosition = (event as DragEndEvent).target.getLatLng();
                onPick({ lat: nextPosition.lat, lng: nextPosition.lng });
              },
            }}
          />
        ) : null}
      </MapContainer>
    </div>
  );
}
