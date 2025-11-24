import { useCallback, useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Property } from '../data/properties';

const icon = L.icon({
  iconUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

type PropertyMapProps = {
  properties: Property[];
  focusId?: number | null;
  activeId?: number | null;
  onMarkerClick?: (id: number) => void;
};

export function PropertyMap({ properties, focusId, activeId, onMarkerClick }: PropertyMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const markerRefs = useRef<Record<number, L.Marker>>({});

  const center = useMemo(() => {
    if (properties.length) {
      return [properties[0].latitude, properties[0].longitude] as [number, number];
    }
    return [37.7749, -122.4194] as [number, number];
  }, [properties]);

  const focusMarker = useCallback(
    (id?: number | null) => {
      if (!id || !mapRef.current) return;
      const marker = markerRefs.current[id];
      if (marker) {
        const latlng = marker.getLatLng();
        mapRef.current.flyTo(latlng, 13, { duration: 0.8 });
        marker.openPopup();
      }
    },
    []
  );

  useEffect(() => {
    focusMarker(focusId);
  }, [focusId, focusMarker]);

  useEffect(() => {
    if (!activeId || !mapRef.current) return;
    const marker = markerRefs.current[activeId];
    if (marker) {
      marker.openPopup();
    }
  }, [activeId]);

  return (
    <MapContainer
      center={center}
      zoom={12}
      className="h-[400px] rounded-2xl border border-outline/60 lg:h-[calc(100vh-6rem)] touch-manipulation"
      ref={(mapInstance) => {
        if (mapInstance) {
          mapRef.current = mapInstance;
          setTimeout(() => {
            mapInstance.invalidateSize();
            focusMarker(focusId);
          }, 150);
        }
      }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {properties.map((property) => (
        <Marker
          key={property.id}
          position={[property.latitude, property.longitude]}
          icon={icon}
          ref={(marker) => {
            if (marker) {
              markerRefs.current[property.id] = marker;
            }
          }}
          eventHandlers={{
            click: () => onMarkerClick?.(property.id)
          }}
        >
          <Popup>
            <div className="space-y-2 text-sm">
              <p className="font-semibold text-foreground">{property.title}</p>
              <p className="text-muted">{property.city}, {property.state}</p>
              <p className="text-foreground">ETH {property.price.toFixed(2)} /mo</p>
              <p className="text-xs text-muted">{`≈ $${Math.round(property.price * 3200).toLocaleString()}`}</p>
              <button
                type="button"
                onClick={() => onMarkerClick?.(property.id)}
                className="rounded-full border border-outline px-3 py-1 text-xs font-semibold text-brand"
              >
                View details
              </button>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
