import { useEffect, useRef } from "react"

import L, { type Map as LeafletMap } from "leaflet"
import "leaflet/dist/leaflet.css"
import "leaflet.markercluster"
import "leaflet.markercluster/dist/MarkerCluster.css"
import "leaflet.markercluster/dist/MarkerCluster.Default.css"

import type { HospitalDirectoryEntry } from "../../data/hospitalNetwork"
import type { Coordinates } from "./InteractiveMap"

type HospitalDirectoryMapProps = {
  hospitals: HospitalDirectoryEntry[]
  hospitalLocation: Coordinates
  selectedHospitalId: string | null
  onSelectHospital: (hospitalId: string) => void
}

function markerIcon(isCurrentHospital: boolean) {
  return L.divIcon({
    className: "",
    html: `<span style="display:grid;place-items:center;width:34px;height:34px;border:3px solid white;border-radius:50%;background:${isCurrentHospital ? "#102A43" : "#0F766E"};box-shadow:0 2px 8px #0f172a55;color:white;font-weight:700;font-size:14px">${isCurrentHospital ? "Y" : "H"}</span>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  })
}

export default function HospitalDirectoryMap({
  hospitals,
  hospitalLocation,
  selectedHospitalId,
  onSelectHospital,
}: HospitalDirectoryMapProps) {
  const mapElement = useRef<HTMLDivElement>(null)
  const mapRef = useRef<LeafletMap | null>(null)
  const markerLayer = useRef<L.MarkerClusterGroup | null>(null)

  useEffect(() => {
    if (!mapElement.current || mapRef.current) return

    const map = L.map(mapElement.current, {
      scrollWheelZoom: false,
    }).setView(
      [hospitalLocation.latitude, hospitalLocation.longitude],
      11,
    )

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(map)

    markerLayer.current = L.markerClusterGroup({
      showCoverageOnHover: false,
      maxClusterRadius: 48,
    }).addTo(map)

    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
      markerLayer.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    const layer = markerLayer.current
    if (!map || !layer) return

    layer.clearLayers()

    const currentMarker = L.marker(
      [hospitalLocation.latitude, hospitalLocation.longitude],
      { icon: markerIcon(true), zIndexOffset: 1000 },
    )
    const currentLabel = document.createElement("span")
    currentLabel.textContent = "Your hospital"
    currentMarker.bindTooltip(currentLabel).addTo(map)

    const bounds = L.latLngBounds([
      [hospitalLocation.latitude, hospitalLocation.longitude],
    ])

    hospitals.forEach((hospital) => {
      const marker = L.marker([hospital.latitude, hospital.longitude], {
        icon: markerIcon(false),
      })
      const label = document.createElement("span")
      label.textContent = hospital.hospital_name
      marker.bindTooltip(label)
      marker.on("click", () => onSelectHospital(hospital.hospital_id))
      marker.addTo(layer)
      bounds.extend([hospital.latitude, hospital.longitude])
    })

    if (selectedHospitalId) {
      const selected = hospitals.find(
        (hospital) => hospital.hospital_id === selectedHospitalId,
      )
      if (selected)
        map.panTo([selected.latitude, selected.longitude], { animate: true })
    } else if (hospitals.length > 0) {
      map.fitBounds(bounds, { padding: [28, 28], maxZoom: 12 })
    } else {
      map.setView([hospitalLocation.latitude, hospitalLocation.longitude], 11)
    }
  }, [hospitals, hospitalLocation, selectedHospitalId, onSelectHospital])

  return (
    <div
      ref={mapElement}
      role="application"
      aria-label="Map of nearby hospitals"
      className="h-[420px] overflow-hidden rounded-xl border border-slate-200 sm:h-[520px]"
    />
  )
}
