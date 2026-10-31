'use client'
import React, { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet'
import { LocateFixed } from 'lucide-react'

// Used by the customer's tracking page and by the delivery boy's dashboard.
// Load it with next/dynamic and ssr:false (Leaflet needs the browser).
export type LatLng = { lat: number; lng: number }

const KATHMANDU: LatLng = { lat: 27.7172, lng: 85.324 }

// Round emoji pins, so no marker image files are needed
const pin = (emoji: string, color: string) =>
  L.divIcon({
    className: '',
    html: `<div style="width:40px;height:40px;border-radius:9999px;background:${color};border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;font-size:20px;line-height:1">${emoji}</div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -18],
  })

const boyIcon = pin('🛵', '#16a34a')
const homeIcon = pin('🏠', '#2563eb')

// Zooms the map so every pin is visible. It does this when the pins first appear (or a new one
// shows up) and when "Recenter" is pressed, but not on every move, so the person can still pan around.
const Fit = ({ points, recenter }: { points: LatLng[]; recenter: number }) => {
  const map = useMap()
  const seen = useRef({ count: 0, recenter: 0 })

  useEffect(() => {
    if (points.length === 0) return
    if (seen.current.count === points.length && seen.current.recenter === recenter) return
    seen.current = { count: points.length, recenter }
    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 15)
    } else {
      map.fitBounds(L.latLngBounds(points.map((p) => [p.lat, p.lng] as [number, number])), { padding: [48, 48], maxZoom: 17 })
    }
  }, [points, recenter, map])

  return null
}

interface Props {
  boy?: LatLng | null // where the delivery boy is
  boyLabel?: string
  dest?: LatLng | null // where the order has to go
  destLabel?: string
  height?: number
}

const LiveMap = ({ boy, boyLabel = 'Delivery partner', dest, destLabel = 'Delivery address', height = 320 }: Props) => {
  const [recenter, setRecenter] = useState(0)
  const points = [boy, dest].filter((p): p is LatLng => !!p)
  const start = boy ?? dest ?? KATHMANDU

  return (
    <div className='relative overflow-hidden rounded-2xl border border-gray-200' style={{ height }}>
      <MapContainer center={[start.lat, start.lng]} zoom={14} scrollWheelZoom style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
        />
        {boy && dest && (
          <Polyline positions={[[boy.lat, boy.lng], [dest.lat, dest.lng]]} pathOptions={{ color: '#16a34a', weight: 4, dashArray: '8 10' }} />
        )}
        {dest && (
          <Marker position={[dest.lat, dest.lng]} icon={homeIcon}>
            <Popup>{destLabel}</Popup>
          </Marker>
        )}
        {boy && (
          <Marker position={[boy.lat, boy.lng]} icon={boyIcon}>
            <Popup>{boyLabel}</Popup>
          </Marker>
        )}
        <Fit points={points} recenter={recenter} />
      </MapContainer>

      <button
        type='button'
        onClick={() => setRecenter((n) => n + 1)}
        aria-label='Show both places on the map'
        className='absolute bottom-3 right-3 z-1000 w-10 h-10 rounded-full bg-white shadow-md border border-gray-200 flex items-center justify-center text-gray-700 hover:bg-gray-50'
      >
        <LocateFixed size={18} />
      </button>
    </div>
  )
}

export default LiveMap
