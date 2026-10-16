import { useEffect, useMemo, useRef, useState } from "react"

import L, { type LatLngExpression, type Map as LeafletMap } from "leaflet"

import "leaflet/dist/leaflet.css"

import "leaflet.markercluster"
import "leaflet.markercluster/dist/MarkerCluster.css"
import "leaflet.markercluster/dist/MarkerCluster.Default.css"

import { Search, LocateFixed, RefreshCw } from "lucide-react"

import { supabase } from "../../lib/supabase"

import type { BloodRequest } from "../../data/mockData"

export type Coordinates = { latitude: number; longitude: number }

export type NetworkResource = {
  resource_id: string

  resource_type: "hospital" | "donor" | "blood_bank" | "ngo"

  resource_name: string

  latitude: number

  longitude: number

  blood_groups: string[] | null

  available: boolean

  area: string | null

  is_verified: boolean

  distance_km: number
}

type NetworkMapProps = {
  hospitalId: string

  hospitalLocation: Coordinates | null

  hospitalName: string

  mode?: "network" | "requests"

  requests?: BloodRequest[]

  onViewRequest?: (requestId: string) => void

  onLocationChange?: (location: Coordinates & { address: string }) => void

  showLocationPicker?: boolean

  className?: string
}

type SearchResult = { lat: string; lon: string; display_name: string }

type MapItem = {
  id: string

  kind: string

  title: string

  subtitle: string

  latitude: number

  longitude: number

  bloodGroups: string[]

  distance: number

  color: string

  requestId?: string
}

const bloodGroups = ["O+", "A+", "B+", "AB+", "O-", "A-", "B-", "AB-"]

const fallbackCenter: Coordinates = { latitude: 20.5937, longitude: 78.9629 }

const mapFilters = [
  "All",
  "Hospitals",
  "Donors",
  "Blood Banks",
  "NGOs",
] as const

function distanceKm(from: Coordinates, to: Coordinates) {
  const radians = (degrees: number) => (degrees * Math.PI) / 180

  const dLat = radians(to.latitude - from.latitude)

  const dLng = radians(to.longitude - from.longitude)

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(radians(from.latitude)) *
      Math.cos(radians(to.latitude)) *
      Math.sin(dLng / 2) ** 2

  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function markerIcon(color: string, label: string) {
  const safeLabel = label.replace(/[&<>"']/g, "")

  return L.divIcon({
    className: "",

    html: `<span style="display:grid;place-items:center;width:34px;height:34px;border:3px solid var(--surface);border-radius:50%;background:${color};box-shadow:0 2px 8px #0f172a55;color:white;font-weight:700;font-size:14px">${safeLabel}</span>`,

    iconSize: [34, 34],

    iconAnchor: [17, 17],
  })
}

export function MapLocationPicker({
  initialLocation,

  initialAddress,

  onChange,
}: {
  initialLocation: Coordinates | null

  initialAddress: string

  onChange: (value: Coordinates & { address: string }) => void
}) {
  const mapElement = useRef<HTMLDivElement>(null)

  const mapRef = useRef<LeafletMap | null>(null)

  const markerRef = useRef<L.Marker | null>(null)

  const [query, setQuery] = useState(initialAddress)

  const [searching, setSearching] = useState(false)

  const center = initialLocation ?? fallbackCenter

  useEffect(() => {
    if (!mapElement.current || mapRef.current) return

    const map = L.map(mapElement.current, { scrollWheelZoom: false }).setView(
      [center.latitude, center.longitude],

      initialLocation ? 13 : 3,
    )

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",

      maxZoom: 19,
    }).addTo(map)

    map.on("click", (event: L.LeafletMouseEvent) => {
      const address = `${event.latlng.lat.toFixed(5)}, ${event.latlng.lng.toFixed(5)}`

      markerRef.current?.remove()

      markerRef.current = L.marker(event.latlng, {
        icon: markerIcon("var(--marker-error)", "H"),
      }).addTo(map)

      onChange({
        latitude: event.latlng.lat,
        longitude: event.latlng.lng,
        address,
      })

      setQuery(address)
    })

    mapRef.current = map

    return () => {
      map.remove()

      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!initialLocation || !mapRef.current) return

    const point: LatLngExpression = [
      initialLocation.latitude,
      initialLocation.longitude,
    ]

    mapRef.current.setView(point, 13)

    markerRef.current?.remove()

    markerRef.current = L.marker(point, {
      icon: markerIcon("#E11D48", "H"),
    }).addTo(mapRef.current)
  }, [initialLocation?.latitude, initialLocation?.longitude])

  const searchLocation = async () => {
    if (!query.trim()) return

    setSearching(true)

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(query)}`,
        { headers: { Accept: "application/json" } },
      )

      if (!response.ok) throw new Error("Location search failed.")

      const results = (await response.json()) as SearchResult[]

      if (!results.length) throw new Error("No matching location found.")

      const result = results[0]

      const location = {
        latitude: Number(result.lat),
        longitude: Number(result.lon),
        address: result.display_name,
      }

      mapRef.current?.setView([location.latitude, location.longitude], 14)

      markerRef.current?.remove()

      if (mapRef.current)
        markerRef.current = L.marker([location.latitude, location.longitude], {
          icon: markerIcon("#E11D48", "H"),
        }).addTo(mapRef.current)

      onChange(location)

      setQuery(location.address)
    } catch (error) {
      setQuery(error instanceof Error ? `${query} — ${error.message}` : query)
    } finally {
      setSearching(false)
    }
  }

  const useCurrentLocation = () => {
    if (!navigator.geolocation) return

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const location = {
          latitude: coords.latitude,
          longitude: coords.longitude,
          address: `${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`,
        }

        mapRef.current?.setView([location.latitude, location.longitude], 14)

        markerRef.current?.remove()

        if (mapRef.current)
          markerRef.current = L.marker(
            [location.latitude, location.longitude],
            { icon: markerIcon("#E11D48", "H") },
          ).addTo(mapRef.current)

        onChange(location)

        setQuery(location.address)
      },
      () =>
        setQuery(
          "Location access is disabled. You can select a location on the map.",
        ),
      { enableHighAccuracy: false, timeout: 10000 },
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          aria-label="Search hospital location"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault()
              void searchLocation()
            }
          }}
          placeholder="Search your hospital location"
          className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={() => void searchLocation()}
          disabled={searching}
          className="rounded-lg border border-slate-200 px-3 text-slate-600"
          aria-label="Search location"
        >
          <Search size={16} />
        </button>
        <button
          type="button"
          onClick={useCurrentLocation}
          className="rounded-lg border border-slate-200 px-3 text-slate-600"
          aria-label="Use current location"
        >
          <LocateFixed size={16} />
        </button>
      </div>
      <div
        ref={mapElement}
        className="h-48 overflow-hidden rounded-xl border border-slate-200"
      />
      <p className="text-[11px] text-slate-500">
        Select a point on the map, search for an address, or use your current
        location.
      </p>
    </div>
  )
}

export default function InteractiveNetworkMap({
  hospitalId,

  hospitalLocation,

  hospitalName,

  mode = "network",

  requests = [],

  onViewRequest,

  onLocationChange,

  showLocationPicker = false,

  className = "",
}: NetworkMapProps) {
  const mapElement = useRef<HTMLDivElement>(null)

  const mapRef = useRef<LeafletMap | null>(null)

  const markerLayer = useRef<L.MarkerClusterGroup | null>(null)

  const hospitalMarker = useRef<L.Marker | null>(null)

  const userMarker = useRef<L.CircleMarker | null>(null)

  const searchMarker = useRef<L.Marker | null>(null)

  const [resources, setResources] = useState<NetworkResource[]>([])

  const [loading, setLoading] = useState(false)

  const [loadError, setLoadError] = useState<string | null>(null)

  const [resourceFilter, setResourceFilter] =
    useState<typeof mapFilters[number]>("All")

  const [bloodGroup, setBloodGroup] = useState("All")

  const [radius, setRadius] = useState(10)

  const [query, setQuery] = useState("")

  const [searchResults, setSearchResults] = useState<SearchResult[]>([])

  const [searchError, setSearchError] = useState<string | null>(null)

  const [searching, setSearching] = useState(false)

  const [selected, setSelected] = useState<MapItem | null>(null)

  const [userLocation, setUserLocation] = useState<Coordinates | null>(null)

  const [retryToken, setRetryToken] = useState(0)

  const [locationMessage, setLocationMessage] = useState("")

  const center = hospitalLocation ?? fallbackCenter

  useEffect(() => {
    if (!mapElement.current || mapRef.current) return

    const map = L.map(mapElement.current, {
      zoomControl: true,
      scrollWheelZoom: true,
    }).setView(
      [center.latitude, center.longitude],

      hospitalLocation ? 12 : 3,
    )

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",

      maxZoom: 19,
    }).addTo(map)

    markerLayer.current = L.markerClusterGroup({
      showCoverageOnHover: false,
      maxClusterRadius: 50,
    }).addTo(map)

    map.on("click", (event: L.LeafletMouseEvent) => {
      if (!showLocationPicker || !onLocationChange) return

      const address = `${event.latlng.lat.toFixed(5)}, ${event.latlng.lng.toFixed(5)}`

      onLocationChange({
        latitude: event.latlng.lat,
        longitude: event.latlng.lng,
        address,
      })
    })

    mapRef.current = map

    return () => {
      map.remove()

      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!hospitalLocation || !mapRef.current) return

    mapRef.current.setView(
      [hospitalLocation.latitude, hospitalLocation.longitude],
      12,
    )
  }, [hospitalLocation?.latitude, hospitalLocation?.longitude])

  useEffect(() => {
    if (mode !== "network" || !hospitalLocation) {
      setResources([])

      setLoading(false)

      setLoadError(null)

      return
    }

    let cancelled = false

    setLoading(true)

    setLoadError(null)

    void supabase
      .rpc("hospital_nearby_network", {
        center_lat: hospitalLocation.latitude,

        center_lng: hospitalLocation.longitude,

        search_radius_km: radius,

        blood_group_filter: bloodGroup === "All" ? null : bloodGroup,
      })
      .then(
        ({ data, error }) => {
          if (cancelled) return

          if (error) {
            setLoadError(error.message)

            setResources([])
          } else {
            setResources((data ?? []) as NetworkResource[])
          }

          setLoading(false)
        },
        (error: unknown) => {
        if (cancelled) return

        setLoadError(
          error instanceof Error
            ? error.message
            : "Network locations could not be loaded.",
        )
        setResources([])
        setLoading(false)
        },
      )

    return () => {
      cancelled = true
    }
  }, [
    mode,
    hospitalId,
    hospitalLocation?.latitude,
    hospitalLocation?.longitude,
    radius,
    bloodGroup,
    retryToken,
  ])

  const mapItems = useMemo<MapItem[]>(() => {
    if (mode === "requests") {
      return requests

        .filter(
          (request) => !["Fulfilled", "Cancelled"].includes(request.status),
        )

        .filter(
          (request) => request.latitude != null && request.longitude != null,
        )

        .map((request) => ({
          id: request.id,

          kind: "request",

          title: request.id,

          subtitle: `${request.bloodGroup} · ${request.units} units · ${
            request.urgency === "CRITICAL"
              ? "Critical"
              : request.urgency === "URGENT"
                ? "High"
                : "Normal"
          }`,

          latitude: request.latitude as number,

          longitude: request.longitude as number,

          bloodGroups: [request.bloodGroup],

          distance: hospitalLocation
            ? distanceKm(hospitalLocation, {
                latitude: request.latitude as number,
                longitude: request.longitude as number,
              })
            : 0,

          color:
            request.urgency === "CRITICAL"
              ? "var(--marker-error)"
              : "var(--marker-warning)",

          requestId: request.id,
        }))
    }

    const typeMap: Record<string, typeof mapFilters[number]> = {
      hospital: "Hospitals",

      donor: "Donors",

      blood_bank: "Blood Banks",

      ngo: "NGOs",
    }

    return resources

      .filter(
        (resource) =>
          resourceFilter === "All" ||
          typeMap[resource.resource_type] === resourceFilter,
      )

      .map((resource) => ({
        id: resource.resource_id,

        kind: resource.resource_type,

        title: resource.resource_name,

        subtitle:
          resource.resource_type === "donor"
            ? `Verified donor · ${(resource.blood_groups ?? []).join(", ")} · ${
                resource.available ? "Available" : "Unavailable"
              }`
            : resource.resource_type === "hospital"
              ? `Registered hospital · ${(resource.blood_groups ?? []).join(", ") || "Blood group data unavailable"}`
              : `${resource.is_verified ? "Verified" : "Registered"} partner · ${(resource.blood_groups ?? []).join(", ") || resource.area || ""}`,

        latitude: resource.latitude,

        longitude: resource.longitude,

        bloodGroups: resource.blood_groups ?? [],

        distance: resource.distance_km,

        color:
          resource.resource_type === "hospital"
            ? "var(--marker-error)"
            : resource.resource_type === "donor"
              ? "var(--marker-success)"
              : "var(--marker-partner)",
      }))
  }, [mode, requests, resources, resourceFilter, hospitalLocation])

  useEffect(() => {
    const layer = markerLayer.current

    const map = mapRef.current

    if (!layer || !map) return

    layer.clearLayers()

    if (hospitalLocation) {
      hospitalMarker.current?.remove()

      hospitalMarker.current = L.marker(
        [hospitalLocation.latitude, hospitalLocation.longitude],
        { icon: markerIcon("#E11D48", "H"), zIndexOffset: 1000 },
      )

        .bindTooltip(`${hospitalName} · Your Hospital`)

        .addTo(map)
    }

    if (mode === "requests") {
      hospitalMarker.current?.remove()

      hospitalMarker.current = null
    }

    mapItems.forEach((item) => {
      const label =
        item.kind === "request"
          ? "R"
          : item.kind === "donor"
            ? "D"
            : item.kind === "ngo"
              ? "N"
              : item.kind === "blood_bank"
                ? "B"
                : "H"

      const marker = L.marker([item.latitude, item.longitude], {
        icon: markerIcon(item.color, label),
      })

      marker.bindTooltip(item.title)

      marker.on("click", () => setSelected(item))

      marker.addTo(layer)
    })

    if (userLocation) {
      userMarker.current?.remove()

      userMarker.current = L.circleMarker(
        [userLocation.latitude, userLocation.longitude],
        {
          radius: 8,
          color: "var(--marker-info)",
          fillColor: "var(--marker-info)",
          fillOpacity: 1,
          weight: 3,
        },
      )
        .addTo(map)

        .bindTooltip("Your current location")
    }
  }, [mapItems, hospitalLocation, hospitalName, mode, userLocation])

  const locateMe = () => {
    if (!navigator.geolocation) {
      setLocationMessage(
        "Location access is disabled. Using your registered hospital location.",
      )

      return
    }

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const position = {
          latitude: coords.latitude,
          longitude: coords.longitude,
        }

        setUserLocation(position)

        mapRef.current?.setView([position.latitude, position.longitude], 14)

        setLocationMessage(
          hospitalLocation
            ? `${distanceKm(position, hospitalLocation).toFixed(1)} km from your hospital`
            : "Your current location is shown. Add registered hospital coordinates to calculate distance.",
        )
      },
      () =>
        setLocationMessage(
          "Location access is disabled. Using your registered hospital location.",
        ),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
    )
  }

  const searchLocation = async () => {
    if (!query.trim()) return

    setSearching(true)

    setSearchError(null)

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&q=${encodeURIComponent(query)}`,
        { headers: { Accept: "application/json" } },
      )

      if (!response.ok)
        throw new Error("Location search is temporarily unavailable.")

      setSearchResults((await response.json()) as SearchResult[])
    } catch (error) {
      setSearchError(
        error instanceof Error ? error.message : "Unable to search locations.",
      )
    } finally {
      setSearching(false)
    }
  }

  const selectSearchResult = (result: SearchResult) => {
    const point = {
      latitude: Number(result.lat),
      longitude: Number(result.lon),
    }

    mapRef.current?.setView([point.latitude, point.longitude], 14)

    searchMarker.current?.remove()

    if (mapRef.current) {
      searchMarker.current = L.marker([point.latitude, point.longitude], {
        icon: markerIcon("var(--marker-info)", "S"),
      }).addTo(mapRef.current)
    }

    setSearchResults([])

    setSelected({
      id: result.display_name,
      kind: "search",
      title: result.display_name.split(",")[0],
      subtitle: result.display_name,
      ...point,
      bloodGroups: [],
      distance: hospitalLocation ? distanceKm(hospitalLocation, point) : 0,
      color: "var(--marker-info)",
    })
  }

  const counts = {
    hospitals: resources.filter((item) => item.resource_type === "hospital")
      .length,

    donors: resources.filter((item) => item.resource_type === "donor").length,

    bloodBanks: resources.filter((item) => item.resource_type === "blood_bank")
      .length,

    ngos: resources.filter((item) => item.resource_type === "ngo").length,

    criticalAvailability: requests.filter(
      (request) =>
        request.urgency === "CRITICAL" &&
        !["Fulfilled", "Cancelled"].includes(request.status) &&
        resources.some((resource) =>
          (resource.blood_groups ?? []).includes(request.bloodGroup),
        ),
    ).length,
  }

  return (
    <section
      className={`rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 ${className}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-base font-bold text-[#102A43]">
            {mode === "requests" ? "Request Locations" : "Nearby Blood Network"}
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            {mode === "requests"
              ? "Active blood requests with saved coordinates."
              : "Hospitals, donors and partners near your location."}
          </p>
        </div>
        {searchError && (
          <p role="alert" className="mt-2 text-xs text-rose-700">
            {searchError}
          </p>
        )}
        {mode === "network" && (
          <button
            onClick={locateMe}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:border-rose-200"
          >
            <LocateFixed size={14} /> Locate Me
          </button>
        )}
      </div>
      <div className="relative mt-4 flex gap-2">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault()
              void searchLocation()
            }
          }}
          placeholder="Search hospital, blood bank or location..."
          aria-label="Search map"
          className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-rose-300"
        />
        <button
          onClick={() => void searchLocation()}
          disabled={searching}
          className="rounded-lg bg-[#101A36] px-3 text-white"
          aria-label="Search map"
        >
          <Search size={16} />
        </button>
        {searchResults.length > 0 && (
          <div className="absolute left-0 right-12 top-full z-[1000] mt-1 max-h-52 overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg">
            {searchResults.map((result) => (
              <button
                key={`${result.lat}:${result.lon}`}
                onClick={() => selectSearchResult(result)}
                className="block w-full border-b border-slate-100 px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50"
              >
                {result.display_name}
              </button>
            ))}
          </div>
        )}
      </div>
      {mode === "network" && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <div className="flex max-w-full gap-1 overflow-x-auto pb-1">
            {mapFilters.map((filter) => (
              <button
                key={filter}
                onClick={() => setResourceFilter(filter)}
                className={`whitespace-nowrap rounded-full px-3 py-1.5 text-[11px] font-semibold ${
                  resourceFilter === filter
                    ? "bg-[#101A36] text-white"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
          <select
            value={bloodGroup}
            onChange={(event) => setBloodGroup(event.target.value)}
            aria-label="Filter blood group"
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs"
          >
            <option value="All">All Blood Groups</option>
            {bloodGroups.map((group) => (
              <option key={group}>{group}</option>
            ))}
          </select>
          <label className="text-xs text-slate-500">
            Within{" "}
            <select
              value={radius}
              onChange={(event) => setRadius(Number(event.target.value))}
              className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-slate-700"
            >
              {[5, 10, 25, 50].map((km) => (
                <option key={km} value={km}>
                  {km} km
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
      {locationMessage && (
        <p role="status" className="mt-2 text-xs text-slate-500">
          {locationMessage}
        </p>
      )}
      {showLocationPicker && (
        <p className="mt-2 text-xs text-slate-500">
          Choose a location by clicking the map.
        </p>
      )}
      <div
        ref={mapElement}
        className={`mt-3 h-[300px] overflow-hidden rounded-xl border border-slate-200 sm:h-[380px] ${
          showLocationPicker ? "cursor-crosshair" : ""
        }`}
      />
      {mode === "network" && (
        <div className="mt-4">
          <h3 className="text-sm font-semibold text-[#102A43]">
            Nearby Network
          </h3>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
            {[
              ["Hospitals", counts.hospitals],
              ["Verified Donors", counts.donors],
              ["Blood Banks", counts.bloodBanks],
              ["NGO Partners", counts.ngos],
              ["Critical Blood Availability", counts.criticalAvailability],
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-lg bg-slate-50 p-3">
                <p className="text-[10px] text-slate-500">{label}</p>
                <p className="mt-1 text-lg font-bold text-[#102A43]">
                  {loading ? "…" : value}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
      {loading && (
        <p className="mt-3 text-xs text-slate-500">Loading nearby network...</p>
      )}
      {loadError && (
        <div
          role="alert"
          className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-rose-50 p-3 text-xs text-rose-700"
        >
          <span>Unable to load nearby locations. {loadError}</span>
          <button
            onClick={() => setRetryToken((current) => current + 1)}
            className="inline-flex items-center gap-1 font-semibold underline"
          >
            <RefreshCw size={12} /> Retry
          </button>
        </div>
      )}
      {!loading &&
        !loadError &&
        mode === "network" &&
        hospitalLocation &&
        mapItems.length === 0 && (
          <p className="mt-3 text-xs text-slate-500">
            No nearby resources found.
          </p>
        )}
      {!loading && mode === "network" && !hospitalLocation && (
        <p className="mt-3 text-xs text-amber-700">
          Registered hospital coordinates are needed to search nearby resources.
        </p>
      )}
      {mode === "requests" && !mapItems.length && (
        <p className="mt-3 text-xs text-slate-500">
          {requests.length
            ? "No active requests have saved map coordinates yet."
            : "No active requests to show."}
        </p>
      )}
      {selected && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div>
            <p className="text-sm font-semibold text-[#102A43]">
              {selected.title}
            </p>
            <p className="mt-0.5 text-xs text-slate-600">{selected.subtitle}</p>
            <p className="mt-0.5 text-[11px] text-slate-500">
              {selected.distance.toFixed(1)} km away
              {selected.bloodGroups.length
                ? ` · ${selected.bloodGroups.join(", ")}`
                : ""}
            </p>
          </div>
          {selected.requestId && (
            <button
              onClick={() => onViewRequest?.(selected.requestId as string)}
              className="rounded-lg bg-[#E11D48] px-3 py-2 text-xs font-semibold text-white"
            >
              View Request
            </button>
          )}
        </div>
      )}
    </section>
  )
}
