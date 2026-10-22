'use client'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import axios from 'axios'
import { useSelector } from 'react-redux'
import { RootState } from '@/redux/store'
import { motion, AnimatePresence } from 'motion/react'
import {
  Banknote, BellRing, CheckCircle2, ChevronRight, Clock, Copy, CreditCard, History, Inbox,
  MapPin, MessageCircle, Navigation, Package, PackageCheck, Phone, RefreshCw, Route,
  Truck, Volume2, VolumeX, Wallet,
} from 'lucide-react'

/* ----------------------------- settings ----------------------------- */
const DELIVERY_FEE = 40        // Rs per delivery (yo badalera afnai rate rakhnus)
const AVG_SPEED_KMH = 20       // ETA hisab ko lagi
const POLL_MS = 15000          // har 15 second ma refresh

/* ------------------------------ types ------------------------------- */
interface IOrder {
  _id: string
  items: { name: string; quantity: number; unit: string; price: string }[]
  totalAmount: number
  paymentMethod: "cod" | "online"
  isPaid: boolean
  address: {
    fullName: string
    mobile?: string
    fullAddress: string
    city: string
    state: string
    latitude?: number
    longitude?: number
  }
  createdAt: string
}

interface IAssignment {
  _id: string
  order: IOrder | null
  status: "broadcasted" | "assigned" | "completed"
  acceptedAt?: string
  createdAt: string
  updatedAt: string
}

type Tab = "available" | "mine" | "completed"
type Coords = { lat: number; lng: number }

/* ----------------------------- helpers ------------------------------ */
const haversineKm = (a: Coords, b: Coords) => {
  const R = 6371
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(s))
}

const minsSince = (iso: string | undefined, now: number) =>
  iso ? Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60000)) : 0

const ago = (iso: string, now: number) => {
  const m = minsSince(iso, now)
  if (m < 1) return "just now"
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  return h < 24 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`
}

const orderCoords = (o: IOrder): Coords | null =>
  o.address.latitude != null && o.address.longitude != null
    ? { lat: Number(o.address.latitude), lng: Number(o.address.longitude) }
    : null

const mapLink = (o: IOrder) => {
  const c = orderCoords(o)
  return c
    ? `https://www.google.com/maps/dir/?api=1&destination=${c.lat},${c.lng}&travelmode=driving`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${o.address.fullAddress}, ${o.address.city}`)}`
}

const waLink = (mobile?: string) => {
  if (!mobile) return ""
  const digits = mobile.replace(/\D/g, "")
  return `https://wa.me/${digits.length === 10 ? `977${digits}` : digits}`
}

const beep = () => {
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext
    const ctx = new Ctx()
    ;[0, 0.25].forEach((t) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.frequency.value = 880
      gain.gain.setValueAtTime(0.15, ctx.currentTime + t)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.2)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(ctx.currentTime + t)
      osc.stop(ctx.currentTime + t + 0.2)
    })
  } catch { /* browser le block garyo bhane chhaddine */ }
}

/* --------------------------- order card ----------------------------- */
interface CardProps {
  a: IAssignment
  coords: Coords | null
  now: number
  busy: boolean
  onAccept: (id: string) => void
  onComplete: (id: string) => void
}

const OrderCard = ({ a, coords, now, busy, onAccept, onComplete }: CardProps) => {
  const o = a.order
  const [showItems, setShowItems] = useState(a.status === "assigned")
  const [copied, setCopied] = useState(false)
  if (!o) return null

  const itemCount = o.items.reduce((n, it) => n + it.quantity, 0)
  const dest = orderCoords(o)
  const km = coords && dest ? haversineKm(coords, dest) : null
  const eta = km != null ? Math.max(1, Math.round((km / AVG_SPEED_KMH) * 60)) : null
  const collectCash = o.paymentMethod === "cod" && !o.isPaid && a.status !== "completed"
  const fullAddress = [o.address.fullAddress, o.address.city, o.address.state].filter(Boolean).join(', ')
  const isActive = a.status === "assigned"

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(fullAddress)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch { /* ignore */ }
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.2 }}
      className={`bg-white rounded-2xl border shadow-sm p-4 sm:p-5 min-w-0 ${isActive ? "border-green-300 ring-1 ring-green-200" : "border-gray-100"}`}
    >
      {/* header */}
      <div className='flex items-start justify-between gap-2'>
        <div className='flex items-center gap-2.5 min-w-0'>
          <span className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isActive ? "bg-green-600 text-white" : "bg-green-100 text-green-700"}`}>
            {isActive ? <Truck size={18} /> : <Package size={18} />}
          </span>
          <div className='min-w-0'>
            <p className='text-sm font-semibold text-gray-800'>Order #{o._id.slice(-6)}</p>
            <p className='text-xs text-gray-500'>
              {a.status === "broadcasted" && `Requested ${ago(a.createdAt, now)}`}
              {a.status === "assigned" && `Accepted ${minsSince(a.acceptedAt, now)} min ago`}
              {a.status === "completed" && `Delivered ${ago(a.updatedAt, now)}`}
            </p>
          </div>
        </div>
        <div className='text-right shrink-0'>
          <p className='text-[11px] text-gray-400'>You earn</p>
          <p className='text-base font-bold text-green-700'>Rs {DELIVERY_FEE}</p>
        </div>
      </div>

      {/* distance + payment chips */}
      <div className='mt-3 flex flex-wrap gap-2'>
        {km != null && (
          <span className='inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full bg-blue-50 text-blue-700'>
            <Route size={12} /> {km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`} away • ~{eta} min
          </span>
        )}
        <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full ${collectCash ? "bg-yellow-100 text-yellow-800" : "bg-green-100 text-green-700"}`}>
          {o.paymentMethod === "cod" ? <Wallet size={12} /> : <CreditCard size={12} />}
          {collectCash ? `Collect Rs ${o.totalAmount}` : o.paymentMethod === "cod" ? "Cash collected" : "Paid online"}
        </span>
        <span className='inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full bg-gray-100 text-gray-600'>
          <Package size={12} /> {itemCount} {itemCount === 1 ? 'item' : 'items'}
        </span>
      </div>

      {/* customer */}
      <div className='mt-3 space-y-1.5 text-sm text-gray-600'>
        <p className='font-medium text-gray-800'>{o.address.fullName}</p>
        <div className='flex items-start gap-2'>
          <MapPin size={14} className='text-green-600 mt-0.5 shrink-0' />
          <span className='wrap-break-word min-w-0 flex-1'>{fullAddress}</span>
          <button onClick={copyAddress} className='shrink-0 text-gray-400 hover:text-green-700' aria-label='Copy address'>
            {copied ? <CheckCircle2 size={14} className='text-green-600' /> : <Copy size={14} />}
          </button>
        </div>
        {a.status === "broadcasted" && (
          <p className='text-xs text-gray-400'>Customer phone will show after you accept.</p>
        )}
      </div>

      {/* items toggle */}
      <button
        onClick={() => setShowItems((s) => !s)}
        className='mt-3 w-full flex items-center justify-between text-xs font-medium text-gray-500 hover:text-gray-700'
      >
        <span>{showItems ? "Hide items" : "View items"}</span>
        <ChevronRight size={14} className={`transition-transform ${showItems ? "rotate-90" : ""}`} />
      </button>
      <AnimatePresence initial={false}>
        {showItems && (
          <motion.ul
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className='overflow-hidden mt-2 rounded-lg bg-gray-50 px-3 py-2 space-y-1'
          >
            {o.items.map((it, i) => (
              <li key={i} className='flex justify-between text-xs text-gray-600'>
                <span className='truncate'>{it.name}</span>
                <span className='shrink-0 ml-2'>{it.quantity} {it.unit}</span>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>

      {/* actions */}
      <div className='mt-4 pt-3 border-t border-gray-100'>
        {a.status === "broadcasted" && (
          <button
            onClick={() => onAccept(a._id)}
            disabled={busy}
            className='w-full bg-green-600 hover:bg-green-700 active:scale-[0.99] text-white text-sm font-semibold py-2.5 rounded-xl disabled:opacity-60 transition'
          >
            {busy ? "Accepting..." : "Accept order"}
          </button>
        )}

        {a.status === "assigned" && (
          <div className='space-y-2'>
            <div className='grid grid-cols-3 gap-2'>
              {o.address.mobile ? (
                <a href={`tel:${o.address.mobile}`} className='flex flex-col items-center gap-1 py-2 rounded-xl bg-green-50 text-green-700 text-xs font-medium hover:bg-green-100'>
                  <Phone size={16} /> Call
                </a>
              ) : <span />}
              {o.address.mobile ? (
                <a href={waLink(o.address.mobile)} target='_blank' rel='noreferrer' className='flex flex-col items-center gap-1 py-2 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-medium hover:bg-emerald-100'>
                  <MessageCircle size={16} /> WhatsApp
                </a>
              ) : <span />}
              <a href={mapLink(o)} target='_blank' rel='noreferrer' className='flex flex-col items-center gap-1 py-2 rounded-xl bg-blue-50 text-blue-700 text-xs font-medium hover:bg-blue-100'>
                <Navigation size={16} /> Navigate
              </a>
            </div>
            <button
              onClick={() => {
                const msg = collectCash
                  ? `Rs ${o.totalAmount} cash collect garnu bhayo? Delivered mark garne?`
                  : "Order deliver bhayo? Delivered mark garne?"
                if (window.confirm(msg)) onComplete(a._id)
              }}
              disabled={busy}
              className='w-full bg-green-600 hover:bg-green-700 active:scale-[0.99] text-white text-sm font-semibold py-2.5 rounded-xl disabled:opacity-60 transition'
            >
              {busy ? "Saving..." : "Mark as delivered"}
            </button>
          </div>
        )}

        {a.status === "completed" && (
          <p className='flex items-center justify-center gap-1.5 text-sm font-medium text-green-700'>
            <CheckCircle2 size={16} /> Delivered • Rs {o.totalAmount}
          </p>
        )}
      </div>
    </motion.div>
  )
}

/* ------------------------------ page -------------------------------- */
const DeliveryBoyDashboard = () => {
  const { userData } = useSelector((state: RootState) => state.user)
  const [available, setAvailable] = useState<IAssignment[]>([])
  const [mine, setMine] = useState<IAssignment[]>([])
  const [completed, setCompleted] = useState<IAssignment[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>("available")
  const [error, setError] = useState("")
  const [coords, setCoords] = useState<Coords | null>(null)
  const [sound, setSound] = useState(true)
  const [now, setNow] = useState(Date.now())
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [newAlert, setNewAlert] = useState(0)
  const knownIds = useRef<Set<string> | null>(null)
  const soundRef = useRef(true)
  soundRef.current = sound

  const load = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true)
    try {
      const { data } = await axios.get('/api/delivery/assignments')
      const incoming: IAssignment[] = data.available

      // Naya request aayo bhane sound + vibration + banner
      if (knownIds.current) {
        const fresh = incoming.filter((x) => !knownIds.current!.has(x._id))
        if (fresh.length > 0) {
          setNewAlert(fresh.length)
          if (soundRef.current) beep()
          if (navigator.vibrate) navigator.vibrate([200, 100, 200])
          setTimeout(() => setNewAlert(0), 6000)
        }
      }
      knownIds.current = new Set(incoming.map((x) => x._id))

      setAvailable(incoming)
      setMine(data.mine)
      setCompleted(data.completed)
      setLastUpdated(new Date())
    } catch (e) {
      console.log('Failed to load assignments', e)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    load()
    const t = setInterval(() => load(), POLL_MS)
    return () => clearInterval(t)
  }, [load])

  // timers (minute ago / elapsed) update garna
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000)
    return () => clearInterval(t)
  }, [])

  // delivery boy ko live location (distance dekhauna)
  useEffect(() => {
    if (!navigator.geolocation) return
    const id = navigator.geolocation.watchPosition(
      (p) => setCoords({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => { /* permission nadiye pani app chalchha */ },
      { enableHighAccuracy: true, maximumAge: 15000 }
    )
    return () => navigator.geolocation.clearWatch(id)
  }, [])

  // browser tab ko title ma request count
  useEffect(() => {
    document.title = available.length > 0 ? `(${available.length}) New delivery request` : "Snapcart Delivery"
  }, [available.length])

  const act = async (id: string, kind: "accept" | "complete") => {
    setBusyId(id)
    setError("")
    try {
      await axios.post(`/api/delivery/${kind}/${id}`)
      await load()
      if (kind === "accept") setTab("mine")
    } catch (e: any) {
      setError(e?.response?.data?.message || "Something went wrong")
      await load()
    } finally {
      setBusyId(null)
    }
  }

  /* ------------------------------ stats ------------------------------ */
  const stats = useMemo(() => {
    const today = new Date(now).toDateString()
    const doneToday = completed.filter((c) => new Date(c.updatedAt).toDateString() === today)
    const cashToday = doneToday
      .filter((c) => c.order?.paymentMethod === "cod")
      .reduce((s, c) => s + Number(c.order?.totalAmount || 0), 0)

    const week = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now)
      d.setDate(d.getDate() - (6 - i))
      const count = completed.filter((c) => new Date(c.updatedAt).toDateString() === d.toDateString()).length
      return { label: i === 6 ? "Today" : d.toLocaleDateString('en-GB', { weekday: 'short' }), count, isToday: i === 6 }
    })

    return {
      deliveredToday: doneToday.length,
      earningsToday: doneToday.length * DELIVERY_FEE,
      totalEarnings: completed.length * DELIVERY_FEE,
      cashToday,
      week,
      weekMax: Math.max(1, ...week.map((w) => w.count)),
      weekTotal: week.reduce((s, w) => s + w.count, 0),
    }
  }, [completed, now])

  const hour = new Date(now).getHours()
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"
  const firstName = userData?.name?.split(" ")[0]

  const tabs: { key: Tab; label: string; short: string; count: number; icon: React.ElementType }[] = [
    { key: "available", label: "New requests", short: "Requests", count: available.length, icon: Inbox },
    { key: "mine", label: "My deliveries", short: "Active", count: mine.length, icon: Truck },
    { key: "completed", label: "History", short: "History", count: completed.length, icon: History },
  ]
  const list = tab === "available" ? available : tab === "mine" ? mine : completed

  return (
    <div className='w-[94%] md:w-[90%] max-w-6xl mx-auto pt-28 sm:pt-32 pb-28 sm:pb-12'>
      {/* New request banner */}
      <AnimatePresence>
        {newAlert > 0 && (
          <motion.button
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            onClick={() => { setTab("available"); setNewAlert(0) }}
            className='fixed top-24 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 bg-yellow-400 text-yellow-950 font-semibold text-sm px-4 py-2.5 rounded-full shadow-lg'
          >
            <BellRing size={16} className='animate-bounce' />
            {newAlert} new delivery {newAlert === 1 ? 'request' : 'requests'}
          </motion.button>
        )}
      </AnimatePresence>

      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className='rounded-2xl bg-linear-to-br from-green-600 to-green-800 text-white p-5 sm:p-6 shadow-lg'
      >
        <div className='flex items-start justify-between gap-3'>
          <div className='min-w-0'>
            <p className='text-sm text-green-100'>{greeting}</p>
            <h1 className='text-2xl sm:text-3xl font-bold truncate'>{firstName || "Rider"}</h1>
          </div>
          <div className='flex items-center gap-2 shrink-0'>
            <button
              onClick={() => setSound((s) => !s)}
              className='w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center'
              aria-label='Toggle sound alerts'
              title={sound ? "Sound alerts on" : "Sound alerts off"}
            >
              {sound ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>
            <button
              onClick={() => load(true)}
              className='w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center'
              aria-label='Refresh'
            >
              <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        <div className='mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3'>
          {[
            { label: "Today's earnings", value: `Rs ${stats.earningsToday}`, icon: Banknote },
            { label: "Delivered today", value: stats.deliveredToday, icon: PackageCheck },
            { label: "COD cash in hand", value: `Rs ${stats.cashToday}`, icon: Wallet },
            { label: "Total earned", value: `Rs ${stats.totalEarnings}`, icon: CheckCircle2 },
          ].map((s) => (
            <div key={s.label} className='rounded-xl bg-white/10 backdrop-blur px-3.5 py-3'>
              <div className='flex items-center gap-1.5 text-[11px] sm:text-xs text-green-100'>
                <s.icon size={13} /> {s.label}
              </div>
              <p className='mt-1 text-lg sm:text-xl font-bold'>
                {loading ? <span className='inline-block h-6 w-14 bg-white/20 rounded animate-pulse' /> : s.value}
              </p>
            </div>
          ))}
        </div>

        <p className='mt-3 text-[11px] text-green-100/80'>
          {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}` : "Loading..."}
          {coords ? " • Location on" : " • Turn on location to see distance"}
        </p>
      </motion.div>

      {error && (
        <div className='mt-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-2.5'>{error}</div>
      )}

      {/* Active delivery shortcut */}
      {mine.length > 0 && tab !== "mine" && (
        <button
          onClick={() => setTab("mine")}
          className='mt-4 w-full flex items-center justify-between gap-3 bg-blue-50 border border-blue-100 text-blue-800 rounded-xl px-4 py-3 text-sm font-medium hover:bg-blue-100'
        >
          <span className='flex items-center gap-2'>
            <Truck size={16} /> You have {mine.length} active {mine.length === 1 ? 'delivery' : 'deliveries'}
          </span>
          <ChevronRight size={16} />
        </button>
      )}

      {/* Desktop/tablet tabs */}
      <div className='hidden sm:flex gap-2 mt-6 mb-4'>
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-full border transition-colors ${
              tab === t.key ? "bg-green-600 text-white border-green-600" : "bg-white text-gray-600 border-gray-200 hover:border-green-300"
            }`}
          >
            <t.icon size={15} /> {t.label}
            <span className={`text-xs px-1.5 rounded-full ${tab === t.key ? "bg-white/25" : "bg-gray-100 text-gray-500"}`}>{t.count}</span>
          </button>
        ))}
      </div>

      <h2 className='sm:hidden mt-6 mb-3 text-base font-semibold text-gray-800'>
        {tabs.find((t) => t.key === tab)?.label}
      </h2>

      {/* List */}
      {loading ? (
        <div className='grid grid-cols-1 xl:grid-cols-2 gap-4'>
          {[0, 1].map((i) => (
            <div key={i} className='bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3'>
              <div className='h-4 w-40 bg-gray-100 rounded animate-pulse' />
              <div className='h-3 w-56 bg-gray-100 rounded animate-pulse' />
              <div className='h-10 w-full bg-gray-100 rounded-xl animate-pulse' />
            </div>
          ))}
        </div>
      ) : list.length === 0 ? (
        <div className='text-center py-14 bg-white border border-gray-100 rounded-2xl'>
          <Package className='w-12 h-12 text-gray-300 mx-auto mb-3' />
          <p className='text-gray-700 font-medium'>
            {tab === "available" ? "No new requests" : tab === "mine" ? "No active deliveries" : "No deliveries yet"}
          </p>
          <p className='text-sm text-gray-500 mt-1'>
            {tab === "available" ? "Stay on this page, new orders appear automatically." : tab === "mine" ? "Accept a request to start delivering." : "Completed deliveries will show here."}
          </p>
        </div>
      ) : (
        <div className='grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-5 items-start'>
          <AnimatePresence mode='popLayout'>
            {list.map((a) => (
              <OrderCard
                key={a._id}
                a={a}
                coords={coords}
                now={now}
                busy={busyId === a._id}
                onAccept={(id) => act(id, "accept")}
                onComplete={(id) => act(id, "complete")}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Weekly chart (history tab) */}
      {tab === "completed" && !loading && (
        <div className='mt-6 bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5'>
          <div className='flex items-center justify-between mb-4'>
            <h3 className='text-base font-semibold text-gray-800'>Last 7 days</h3>
            <span className='text-xs font-medium text-green-700 bg-green-100 px-2.5 py-1 rounded-full'>
              {stats.weekTotal} deliveries • Rs {stats.weekTotal * DELIVERY_FEE}
            </span>
          </div>
          <div className='flex items-end justify-between gap-2 sm:gap-4 h-36'>
            {stats.week.map((d, i) => (
              <div key={i} className='flex-1 flex flex-col items-center justify-end h-full'>
                <span className={`text-xs font-medium mb-1 ${d.count > 0 ? 'text-gray-700' : 'text-gray-300'}`}>{d.count}</span>
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: d.count === 0 ? 4 : Math.max(8, (d.count / stats.weekMax) * 84) }}
                  transition={{ duration: 0.4, delay: i * 0.04 }}
                  className={`w-full max-w-10 rounded-t-md ${d.count === 0 ? "bg-gray-200" : d.isToday ? "bg-green-600" : "bg-green-300"}`}
                />
                <span className={`text-[11px] mt-2 ${d.isToday ? 'font-semibold text-green-700' : 'text-gray-500'}`}>{d.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mobile bottom navigation */}
      <nav className='sm:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-gray-200 pb-[env(safe-area-inset-bottom,0px)]'>
        <div className='grid grid-cols-3'>
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`relative flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium ${tab === t.key ? "text-green-700" : "text-gray-500"}`}
            >
              <span className='relative'>
                <t.icon size={20} />
                {t.count > 0 && t.key !== "completed" && (
                  <span className='absolute -top-1.5 -right-2.5 min-w-4 h-4 px-1 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center'>
                    {t.count}
                  </span>
                )}
              </span>
              {t.short}
              {tab === t.key && <span className='absolute top-0 inset-x-6 h-0.5 bg-green-600 rounded-full' />}
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}

export default DeliveryBoyDashboard