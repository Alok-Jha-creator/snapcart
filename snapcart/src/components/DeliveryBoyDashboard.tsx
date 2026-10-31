'use client'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import axios from 'axios'
import { useSelector } from 'react-redux'
import { RootState } from '@/redux/store'
import { motion, AnimatePresence } from 'motion/react'
import {
  AlertCircle, Banknote, BellRing, CalendarDays, CheckCircle2, ChevronRight, Copy, CreditCard, Loader,
  MapPin, MessageCircle, Navigation, Package, PackageCheck, Phone, Route, Truck, Wallet,
} from 'lucide-react'
import DeliveryShell, { type Tab } from '@/components/DeliveryShell'
import { DELIVERY_FEE } from '@/lib/deliveryConfig'
import dynamic from 'next/dynamic'

const LiveMap = dynamic(() => import('@/components/LiveMap'), {
  ssr: false,
  loading: () => <div className='h-64 rounded-2xl bg-gray-100 animate-pulse' />,
})

/* ----------------------------- settings ----------------------------- */
const AVG_SPEED_KMH = 20       // used for the time estimate
const POLL_MS = 15000          // refresh every 15 seconds

/* ------------------------------ types ------------------------------- */
// new       = the admin assigned it, you have not answered yet
// accepted  = you said yes, you have not picked it up yet
type Stage = 'new' | 'accepted' | 'out for delivery' | 'delivered' | 'failed'
type DialogKind = 'reject' | 'complete' | 'fail'
type Action = 'accept' | 'pickup' | 'reject' | 'complete' | 'fail'

interface IOrder {
  _id: string
  items: { name: string; quantity: number; unit: string; price: string }[]
  totalAmount: number
  paymentMethod: 'cod' | 'online'
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
}

interface IDelivery {
  _id: string
  stage: Stage
  assignedAt: string
  acceptedAt: string | null
  pickedUpAt: string | null
  finishedAt: string
  fee: number
  cashCollected: number
  failReason: string
  order: IOrder | null
}

type Coords = { lat: number; lng: number }

const FAIL_REASONS = ['Customer not reachable', 'Customer refused the order', 'Address not found', 'Other']

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

const ago = (iso: string | null | undefined, now: number) => {
  if (!iso) return 'just now'
  const m = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60000))
  if (m < 1) return 'just now'
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
  if (!mobile) return ''
  const digits = mobile.replace(/\D/g, '')
  return `https://wa.me/${digits.length === 10 ? `977${digits}` : digits}`
}

const beep = () => {
  try {
    const w = window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }
    const Ctx = w.AudioContext || w.webkitAudioContext
    if (!Ctx) return
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
  } catch { /* the browser blocked the sound, ignore */ }
}

const errorText = (error: unknown, fallback: string) =>
  (axios.isAxiosError(error) && error.response?.data?.message) || fallback

// cash still has to be collected at the door
const collectsCash = (d: IDelivery) =>
  !!d.order && d.order.paymentMethod === 'cod' && !d.order.isPaid && d.stage !== 'delivered' && d.stage !== 'failed'

const primaryBtn =
  'w-full flex items-center justify-center gap-2 bg-linear-to-r from-green-500 to-green-700 text-white text-sm font-semibold py-2.5 rounded-xl shadow-sm hover:shadow-md disabled:opacity-60 transition-all'
const outlineBtn =
  'flex items-center justify-center gap-2 border border-gray-200 text-gray-700 text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-gray-50 disabled:opacity-60'

/* ------------------------------ order card -------------------------- */
interface CardProps {
  d: IDelivery
  coords: Coords | null
  now: number
  busy: boolean
  onAccept: (id: string) => void
  onStart: (id: string) => void
  onAsk: (kind: DialogKind, d: IDelivery) => void
}

const OrderCard = ({ d, coords, now, busy, onAccept, onStart, onAsk }: CardProps) => {
  const o = d.order
  const onTheWay = d.stage === 'out for delivery'
  const [showItems, setShowItems] = useState(d.stage === 'accepted' || onTheWay)
  const [copied, setCopied] = useState(false)
  const [showMap, setShowMap] = useState(false)
  if (!o) return null

  const itemCount = o.items.reduce((n, it) => n + it.quantity, 0)
  const dest = orderCoords(o)
  const km = coords && dest && !['delivered', 'failed'].includes(d.stage) ? haversineKm(coords, dest) : null
  const eta = km != null ? Math.max(1, Math.round((km / AVG_SPEED_KMH) * 60)) : null
  const cash = collectsCash(d)
  const fullAddress = [o.address.fullAddress, o.address.city, o.address.state].filter(Boolean).join(', ')
  const isActive = d.stage === 'accepted' || onTheWay
  const showPhone = isActive && !!o.address.mobile

  const subtitle =
    d.stage === 'new' ? `Assigned ${ago(d.assignedAt, now)}`
    : d.stage === 'accepted' ? `Accepted ${ago(d.acceptedAt, now)}`
    : d.stage === 'out for delivery' ? `On the way since ${ago(d.pickedUpAt || d.acceptedAt, now)}`
    : d.stage === 'delivered' ? `Delivered ${ago(d.finishedAt, now)}`
    : `Failed ${ago(d.finishedAt, now)}`

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
      className={`bg-white rounded-2xl border shadow-sm p-5 min-w-0 ${isActive ? 'border-green-300 ring-1 ring-green-200' : d.stage === 'failed' ? 'border-red-200' : 'border-gray-100'}`}
    >
      <div className='flex items-start justify-between gap-3'>
        <div className='flex items-center gap-3 min-w-0'>
          <span className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${isActive ? 'bg-green-600 text-white' : d.stage === 'failed' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'}`}>
            {isActive ? <Truck size={19} /> : d.stage === 'failed' ? <AlertCircle size={19} /> : <Package size={19} />}
          </span>
          <div className='min-w-0'>
            <p className='font-semibold text-gray-800'>Order #{o._id.slice(-6)}</p>
            <p className='text-xs text-gray-500 mt-0.5'>{subtitle}</p>
          </div>
        </div>
        {d.stage !== 'failed' && (
          <div className='text-right shrink-0'>
            <p className='text-[11px] text-gray-400'>{d.stage === 'delivered' ? 'You earned' : 'You earn'}</p>
            <p className='text-lg font-bold text-green-700 leading-5'>Rs {d.fee}</p>
          </div>
        )}
      </div>

      <div className='mt-3.5 flex flex-wrap gap-2'>
        {km != null && (
          <span className='inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full bg-blue-50 text-blue-700'>
            <Route size={12} /> {km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`} away · ~{eta} min
          </span>
        )}
        <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full ${cash ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-700'}`}>
          {o.paymentMethod === 'cod' ? <Wallet size={12} /> : <CreditCard size={12} />}
          {cash ? `Collect Rs ${o.totalAmount}` : o.paymentMethod === 'cod' ? 'Cash on delivery' : 'Paid online'}
        </span>
        <span className='inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full bg-gray-100 text-gray-600'>
          <Package size={12} /> {itemCount} {itemCount === 1 ? 'item' : 'items'}
        </span>
      </div>

      <div className='mt-3.5 space-y-1.5 text-sm text-gray-600'>
        <p className='font-medium text-gray-800'>{o.address.fullName}</p>
        {showPhone && (
          <p className='flex items-center gap-2'><Phone size={14} className='text-green-600 shrink-0' />{o.address.mobile}</p>
        )}
        <div className='flex items-start gap-2'>
          <MapPin size={14} className='text-green-600 mt-0.5 shrink-0' />
          <span className='wrap-break-word min-w-0 flex-1'>{fullAddress}</span>
          <button onClick={copyAddress} className='shrink-0 text-gray-400 hover:text-green-700' aria-label='Copy address'>
            {copied ? <CheckCircle2 size={14} className='text-green-600' /> : <Copy size={14} />}
          </button>
        </div>
        {d.stage === 'new' && <p className='text-xs text-gray-400'>Customer phone will show after you accept.</p>}
        {d.stage === 'failed' && d.failReason && <p className='text-xs text-red-600'>Reason: {d.failReason}</p>}
      </div>

      <button
        onClick={() => setShowItems((s) => !s)}
        className='mt-3.5 w-full flex items-center justify-between text-xs font-medium text-gray-500 hover:text-gray-700'
      >
        <span>{showItems ? 'Hide items' : 'View items'}</span>
        <ChevronRight size={14} className={`transition-transform ${showItems ? 'rotate-90' : ''}`} />
      </button>
      <AnimatePresence initial={false}>
        {showItems && (
          <motion.ul
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className='overflow-hidden mt-2 rounded-xl bg-gray-50/80 px-3.5 py-2.5 space-y-1'
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

      {(dest || coords) && d.stage !== 'delivered' && d.stage !== 'failed' && (
        <>
          <button
            onClick={() => setShowMap((s) => !s)}
            className='mt-2 w-full flex items-center justify-between text-xs font-medium text-gray-500 hover:text-gray-700'
          >
            <span>{showMap ? 'Hide map' : 'Show map'}</span>
            <ChevronRight size={14} className={`transition-transform ${showMap ? 'rotate-90' : ''}`} />
          </button>
          {showMap && (
            <div className='mt-2'>
              <LiveMap boy={coords} boyLabel='You are here' dest={dest} destLabel={o.address.fullName} height={260} />
              {!coords && <p className='mt-1.5 text-xs text-gray-400'>Turn on location to see where you are on the map.</p>}
              {!dest && <p className='mt-1.5 text-xs text-gray-400'>This order has no map pin. Use the address above.</p>}
            </div>
          )}
        </>
      )}

      <div className='mt-4 pt-4 border-t border-gray-100'>
        {d.stage === 'new' && (
          <div className='flex gap-2'>
            <button onClick={() => onAsk('reject', d)} disabled={busy} className={outlineBtn}>Reject</button>
            <button onClick={() => onAccept(d._id)} disabled={busy} className={`${primaryBtn} flex-1`}>
              {busy ? <><Loader className='w-4 h-4 animate-spin' /> Accepting...</> : 'Accept order'}
            </button>
          </div>
        )}

        {isActive && (
          <div className='space-y-3'>
            <div className='grid grid-cols-3 gap-2'>
              {o.address.mobile ? (
                <a href={`tel:${o.address.mobile}`} className='flex flex-col items-center gap-1 py-2.5 rounded-xl bg-green-50 text-green-700 text-xs font-medium hover:bg-green-100'>
                  <Phone size={16} /> Call
                </a>
              ) : <span />}
              {o.address.mobile ? (
                <a href={waLink(o.address.mobile)} target='_blank' rel='noreferrer' className='flex flex-col items-center gap-1 py-2.5 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-medium hover:bg-emerald-100'>
                  <MessageCircle size={16} /> WhatsApp
                </a>
              ) : <span />}
              <a href={mapLink(o)} target='_blank' rel='noreferrer' className='flex flex-col items-center gap-1 py-2.5 rounded-xl bg-blue-50 text-blue-700 text-xs font-medium hover:bg-blue-100'>
                <Navigation size={16} /> Navigate
              </a>
            </div>

            {d.stage === 'accepted' && (
              <div className='flex gap-2'>
                <button onClick={() => onAsk('reject', d)} disabled={busy} className={outlineBtn}>Reject</button>
                <button onClick={() => onStart(d._id)} disabled={busy} className={`${primaryBtn} flex-1`}>
                  {busy ? <><Loader className='w-4 h-4 animate-spin' /> Saving...</> : <><Truck size={16} /> Picked up, start delivery</>}
                </button>
              </div>
            )}

            {onTheWay && (
              <div className='flex gap-2'>
                <button onClick={() => onAsk('fail', d)} disabled={busy} className='flex items-center justify-center gap-2 border border-red-200 text-red-600 text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-red-50 disabled:opacity-60'>
                  Can&apos;t deliver
                </button>
                <button onClick={() => onAsk('complete', d)} disabled={busy} className={`${primaryBtn} flex-1`}>
                  {busy ? <><Loader className='w-4 h-4 animate-spin' /> Saving...</> : 'Mark as delivered'}
                </button>
              </div>
            )}
          </div>
        )}

        {d.stage === 'delivered' && (
          <p className='flex items-center justify-center gap-1.5 text-sm font-medium text-green-700'>
            <CheckCircle2 size={16} /> Delivered · Rs {o.totalAmount}
            {d.cashCollected > 0 && <span className='text-gray-400 font-normal'>· cash Rs {d.cashCollected}</span>}
          </p>
        )}
        {d.stage === 'failed' && (
          <p className='flex items-center justify-center gap-1.5 text-sm font-medium text-red-600'>
            <AlertCircle size={16} /> Not delivered
          </p>
        )}
      </div>
    </motion.div>
  )
}

/* ------------------------- reject / delivered / failed -------------- */
const ActionDialog = ({
  kind, d, busy, onClose, onConfirm,
}: {
  kind: DialogKind
  d: IDelivery
  busy: boolean
  onClose: () => void
  onConfirm: (body: Record<string, unknown>) => void
}) => {
  const [reason, setReason] = useState('')
  const [other, setOther] = useState('')
  const o = d.order
  if (!o) return null

  const cash = collectsCash(d)
  const orderNo = o._id.slice(-6)
  const failReason = reason === 'Other' ? other.trim() : reason
  const canConfirm = kind !== 'fail' || !!failReason

  const title = kind === 'reject' ? 'Reject this order?' : kind === 'fail' ? 'Could not deliver?' : 'Mark as delivered?'
  const text =
    kind === 'reject'
      ? `Order #${orderNo} goes back to the admin, who will give it to someone else.`
      : kind === 'fail'
        ? `Tell us what happened with order #${orderNo}. The admin will see this.`
        : cash
          ? `Have you collected Rs ${o.totalAmount} in cash for order #${orderNo}?`
          : `Order #${orderNo} was handed over to the customer?`

  const confirm = () => {
    if (kind === 'complete') onConfirm({ cashCollected: true })
    else if (kind === 'fail') onConfirm({ reason: failReason })
    else onConfirm({ reason: other.trim() })
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className='fixed inset-0 z-100 flex items-center justify-center bg-black/40 px-4'
      onClick={() => { if (!busy) onClose() }}
    >
      <motion.div
        role='alertdialog'
        aria-modal='true'
        aria-labelledby='action-title'
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.2 }}
        className='bg-white w-full max-w-sm rounded-2xl p-6 shadow-xl'
        onClick={(e) => e.stopPropagation()}
      >
        <div className='text-center'>
          <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${kind === 'complete' ? 'bg-green-50' : 'bg-red-50'}`}>
            {kind === 'complete'
              ? (cash ? <Wallet size={22} className='text-green-700' /> : <PackageCheck size={22} className='text-green-700' />)
              : <AlertCircle size={22} className='text-red-600' />}
          </div>
          <p id='action-title' className='text-lg font-semibold text-gray-800'>{title}</p>
          <p className='text-sm text-gray-500 mt-1'>{text}</p>
        </div>

        {kind === 'fail' && (
          <div className='mt-4 space-y-2'>
            {FAIL_REASONS.map((r) => (
              <button
                key={r}
                type='button'
                onClick={() => setReason(r)}
                className={`w-full text-left text-sm rounded-xl border px-3.5 py-2.5 transition-colors ${reason === r ? 'border-green-400 bg-green-50/60 text-green-800' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}
              >
                {r}
              </button>
            ))}
          </div>
        )}
        {((kind === 'fail' && reason === 'Other') || kind === 'reject') && (
          <textarea
            value={other}
            onChange={(e) => setOther(e.target.value)}
            maxLength={200}
            rows={2}
            placeholder={kind === 'reject' ? 'Reason (optional)' : 'Write the reason'}
            className='mt-3 w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-green-400 focus:ring-2 focus:ring-green-400/30 resize-none'
          />
        )}

        <div className='flex gap-3 mt-6'>
          <button
            type='button'
            autoFocus
            onClick={onClose}
            disabled={busy}
            className='flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-50 disabled:opacity-50'
          >
            {kind === 'complete' ? 'Not yet' : 'Cancel'}
          </button>
          <button
            type='button'
            onClick={confirm}
            disabled={busy || !canConfirm}
            className={`flex-1 flex items-center justify-center gap-2 text-white py-2.5 rounded-xl text-sm font-semibold disabled:opacity-60 ${kind === 'complete' ? 'bg-green-700 hover:bg-green-800' : 'bg-red-600 hover:bg-red-700'}`}
          >
            {busy
              ? <><Loader className='w-4 h-4 animate-spin' /> Saving...</>
              : kind === 'complete' ? 'Yes, delivered' : kind === 'fail' ? 'Report problem' : 'Yes, reject'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

/* ------------------------------ page -------------------------------- */
const DeliveryBoyDashboard = () => {
  const { userData } = useSelector((state: RootState) => state.user)
  const [available, setAvailable] = useState<IDelivery[]>([])
  const [mine, setMine] = useState<IDelivery[]>([])
  const [completed, setCompleted] = useState<IDelivery[]>([])
  const [totals, setTotals] = useState({ delivered: 0, earned: 0 })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('available')
  const [error, setError] = useState('')
  const [blocked, setBlocked] = useState<{ status: number; message: string } | null>(null)
  const [coords, setCoords] = useState<Coords | null>(null)
  const [sound, setSound] = useState(true)
  const [now, setNow] = useState(Date.now())
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [newAlert, setNewAlert] = useState(0)
  const [dialog, setDialog] = useState<{ kind: DialogKind; d: IDelivery } | null>(null)
  const knownIds = useRef<Set<string> | null>(null)
  const soundRef = useRef(true)
  const blockedRef = useRef(false)
  const lastSent = useRef(0)
  const fastRef = useRef(false)
  soundRef.current = sound
  blockedRef.current = !!blocked
  // every 10 seconds while a delivery is on the way (the customer sees it live), otherwise once a minute
  fastRef.current = mine.some((x) => x.stage === 'out for delivery')

  const load = useCallback(async (manual = false) => {
    if (blockedRef.current) return
    if (manual) setRefreshing(true)
    try {
      const { data } = await axios.get('/api/delivery/assignments')
      const incoming: IDelivery[] = data.available

      // new request: sound + vibration + banner
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
      setTotals(data.totals)
      setLastUpdated(new Date())
    } catch (e) {
      // logged out, or the admin deactivated this account: stop asking
      if (axios.isAxiosError(e) && (e.response?.status === 401 || e.response?.status === 403)) {
        setBlocked({ status: e.response.status, message: e.response.data?.message || 'You cannot use this page.' })
      } else {
        console.log('Failed to load deliveries', e)
      }
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

  // keep the "x min ago" labels fresh
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000)
    return () => clearInterval(t)
  }, [])

  // live location (for the distance on each card)
  useEffect(() => {
    if (!navigator.geolocation) return
    const id = navigator.geolocation.watchPosition(
      (p) => {
        const c = { lat: p.coords.latitude, lng: p.coords.longitude }
        setCoords(c)
        if (!blockedRef.current && Date.now() - lastSent.current > (fastRef.current ? 10000 : 60000)) {
          lastSent.current = Date.now()
          axios.post('/api/delivery/location', { latitude: c.lat, longitude: c.lng }).catch(() => {})
        }
      },
      () => { /* the app still works without location */ },
      { enableHighAccuracy: true, maximumAge: 15000 }
    )
    return () => navigator.geolocation.clearWatch(id)
  }, [])

  // request count in the browser tab title
  useEffect(() => {
    document.title = available.length > 0 ? `(${available.length}) New delivery request` : 'Snapcart Delivery'
  }, [available.length])

  const act = async (id: string, kind: Action, body?: Record<string, unknown>) => {
    setBusyId(id)
    setError('')
    try {
      await axios.post(`/api/delivery/${kind}/${id}`, body ?? {})
      await load()
      if (kind === 'accept' || kind === 'pickup') setTab('mine')
      setDialog(null)
    } catch (e) {
      setError(errorText(e, 'Something went wrong'))
      setDialog(null)
      await load()
    } finally {
      setBusyId(null)
    }
  }

  /* ------------------------------ stats ------------------------------ */
  const stats = useMemo(() => {
    const today = new Date(now).toDateString()
    const delivered = completed.filter((c) => c.stage === 'delivered')
    const doneToday = delivered.filter((c) => new Date(c.finishedAt).toDateString() === today)

    const week = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now)
      d.setDate(d.getDate() - (6 - i))
      const day = delivered.filter((c) => new Date(c.finishedAt).toDateString() === d.toDateString())
      return {
        label: i === 6 ? 'Today' : d.toLocaleDateString('en-GB', { weekday: 'short' }),
        count: day.length,
        earned: day.reduce((s, c) => s + c.fee, 0),
        isToday: i === 6,
      }
    })

    return {
      deliveredToday: doneToday.length,
      earningsToday: doneToday.reduce((s, c) => s + c.fee, 0),
      cashToday: doneToday.reduce((s, c) => s + c.cashCollected, 0),
      week,
      weekMax: Math.max(1, ...week.map((w) => w.count)),
      weekTotal: week.reduce((s, w) => s + w.count, 0),
      weekEarned: week.reduce((s, w) => s + w.earned, 0),
    }
  }, [completed, now])

  const hour = new Date(now).getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const firstName = userData?.name?.split(' ')[0]
  const dateLabel = new Date(now).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const timeLabel = new Date(now).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

  const cards = [
    { label: "Today's earnings", value: `Rs ${stats.earningsToday}`, hint: `Rs ${DELIVERY_FEE} per delivery`, icon: Banknote, card: 'from-green-50 to-white border-green-100', tint: 'bg-green-500 text-white' },
    { label: 'Delivered today', value: stats.deliveredToday, hint: 'Completed orders', icon: PackageCheck, card: 'from-blue-50 to-white border-blue-100', tint: 'bg-blue-500 text-white' },
    { label: 'COD cash in hand', value: `Rs ${stats.cashToday}`, hint: 'Collected today', icon: Wallet, card: 'from-amber-50 to-white border-amber-100', tint: 'bg-amber-400 text-white' },
    { label: 'Total earned', value: `Rs ${totals.earned}`, hint: `${totals.delivered} ${totals.delivered === 1 ? 'delivery' : 'deliveries'} so far`, icon: CheckCircle2, card: 'from-purple-50 to-white border-purple-100', tint: 'bg-purple-500 text-white' },
  ]

  const counts = { available: available.length, mine: mine.length, completed: completed.length }
  const tabs: { key: Tab; label: string }[] = [
    { key: 'available', label: 'New requests' },
    { key: 'mine', label: 'My deliveries' },
    { key: 'completed', label: 'History' },
  ]
  const list = tab === 'available' ? available : tab === 'mine' ? mine : completed
  const status = `${lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}` : 'Loading...'} · ${coords ? 'Location on' : 'Turn on location to see distance'}`

  return (
    <DeliveryShell
      tab={tab}
      onTab={setTab}
      counts={counts}
      sound={sound}
      onToggleSound={() => setSound((s) => !s)}
      onRefresh={() => load(true)}
      refreshing={refreshing}
      status={status}
    >
      {blocked ? (
        <div className='max-w-md mx-auto mt-16 text-center bg-white border border-gray-100 shadow-sm rounded-2xl p-8'>
          <AlertCircle className='w-12 h-12 text-red-400 mx-auto mb-3' />
          <p className='text-gray-800 font-semibold'>{blocked.status === 401 ? 'You are logged out' : 'Access stopped'}</p>
          <p className='text-sm text-gray-500 mt-1'>{blocked.message}</p>
          {blocked.status === 401 && (
            <a href='/login' className='inline-block mt-5 rounded-xl bg-green-700 hover:bg-green-800 text-white text-sm font-semibold px-5 py-2.5'>Log in</a>
          )}
        </div>
      ) : (
        <>
          {/* new request banner */}
          <AnimatePresence>
            {newAlert > 0 && (
              <motion.button
                initial={{ opacity: 0, y: -16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                onClick={() => { setTab('available'); setNewAlert(0) }}
                className='fixed top-24 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-yellow-400 text-yellow-950 font-semibold text-sm px-4 py-2.5 rounded-full shadow-lg'
              >
                <BellRing size={16} className='animate-bounce' />
                {newAlert} new delivery {newAlert === 1 ? 'request' : 'requests'}
              </motion.button>
            )}
          </AnimatePresence>

          {/* greeting */}
          <div className='flex flex-wrap items-start justify-between gap-3 mb-6'>
            <div>
              <h1 className='text-3xl font-bold text-[#0b5c3b]'>
                {greeting}{firstName ? `, ${firstName}` : ''} <span aria-hidden>👋</span>
              </h1>
              <p className='text-gray-500 mt-1.5'>Here&apos;s what&apos;s happening with your deliveries today.</p>
            </div>
            <div className='flex items-start gap-2 text-sm text-gray-600'>
              <CalendarDays size={18} className='mt-0.5 text-gray-500' />
              <div className='text-right'>
                <p>{dateLabel}</p>
                <p className='mt-1 text-gray-500'>{timeLabel}</p>
              </div>
            </div>
          </div>

          {error && (
            <div role='alert' className='mb-5 flex items-start gap-2.5 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600'>
              <AlertCircle size={18} className='mt-0.5 shrink-0' />
              <p className='flex-1'>{error}</p>
            </div>
          )}

          {/* stat cards */}
          <div className='grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 mb-5'>
            {cards.map((c) => (
              <div key={c.label} className={`rounded-2xl border bg-linear-to-br ${c.card} shadow-sm p-4`}>
                <div className='flex items-start gap-3'>
                  <span className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${c.tint}`}><c.icon size={18} /></span>
                  <div className='min-w-0 flex-1'>
                    <p className='text-sm font-medium text-gray-700'>{c.label}</p>
                    <p className='mt-1 text-2xl font-bold text-gray-800 leading-8 whitespace-nowrap'>
                      {loading ? <span className='inline-block h-7 w-16 bg-gray-200/70 rounded animate-pulse' /> : c.value}
                    </p>
                    <p className='mt-1 text-xs text-gray-400'>{c.hint}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* shortcuts */}
          {available.length > 0 && tab !== 'available' && (
            <button
              onClick={() => setTab('available')}
              className='mb-3 w-full flex items-center justify-between gap-3 bg-yellow-50 border border-yellow-200 text-yellow-900 rounded-xl px-4 py-3 text-sm font-medium hover:bg-yellow-100'
            >
              <span className='flex items-center gap-2'><BellRing size={16} /> {available.length} new {available.length === 1 ? 'request is' : 'requests are'} waiting for you</span>
              <ChevronRight size={16} />
            </button>
          )}
          {mine.length > 0 && tab !== 'mine' && (
            <button
              onClick={() => setTab('mine')}
              className='mb-5 w-full flex items-center justify-between gap-3 bg-blue-50 border border-blue-100 text-blue-800 rounded-xl px-4 py-3 text-sm font-medium hover:bg-blue-100'
            >
              <span className='flex items-center gap-2'><Truck size={16} /> You have {mine.length} active {mine.length === 1 ? 'delivery' : 'deliveries'}</span>
              <ChevronRight size={16} />
            </button>
          )}

          {/* tabs */}
          <div className='flex items-center justify-between gap-3 mb-4'>
            <h2 className='text-lg font-semibold text-[#0b5c3b]'>{tabs.find((t) => t.key === tab)?.label}</h2>
            <div className='hidden sm:flex gap-2'>
              {tabs.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`text-xs font-medium px-3.5 py-1.5 rounded-full border transition-colors ${tab === t.key ? 'bg-green-600 border-green-600 text-white' : 'bg-white border-gray-200 text-gray-600 hover:bg-green-50 hover:border-green-200'}`}
                >
                  {t.label} <span className={tab === t.key ? 'text-green-100' : 'text-gray-400'}>({counts[t.key]})</span>
                </button>
              ))}
            </div>
          </div>

          {/* list */}
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
            <div className='text-center py-14 bg-white border border-gray-100 shadow-sm rounded-2xl'>
              <Package className='w-12 h-12 text-gray-300 mx-auto mb-3' />
              <p className='text-gray-800 font-medium'>
                {tab === 'available' ? 'No new requests' : tab === 'mine' ? 'No active deliveries' : 'No deliveries yet'}
              </p>
              <p className='text-sm text-gray-500 mt-1'>
                {tab === 'available' ? 'Stay on this page. Orders the admin gives you appear here automatically.' : tab === 'mine' ? 'Accept a request to start delivering.' : 'Finished deliveries will show here.'}
              </p>
            </div>
          ) : (
            <div className='grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-5 items-start'>
              <AnimatePresence mode='popLayout'>
                {list.map((d) => (
                  <OrderCard
                    key={d._id}
                    d={d}
                    coords={coords}
                    now={now}
                    busy={busyId === d._id}
                    onAccept={(id) => act(id, 'accept')}
                    onStart={(id) => act(id, 'pickup')}
                    onAsk={(kind, target) => setDialog({ kind, d: target })}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}

          {/* weekly chart (History tab) */}
          {tab === 'completed' && !loading && (
            <div className='mt-6 bg-white rounded-2xl border border-gray-100 shadow-sm p-5'>
              <div className='flex items-center justify-between mb-4'>
                <h3 className='text-lg font-semibold text-[#0b5c3b]'>Last 7 days</h3>
                <span className='text-xs font-medium text-green-700 bg-green-100 px-2.5 py-1 rounded-full'>
                  {stats.weekTotal} deliveries · Rs {stats.weekEarned}
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
                      className={`w-full max-w-10 rounded-t-md ${d.count === 0 ? 'bg-gray-200' : d.isToday ? 'bg-green-600' : 'bg-green-300'}`}
                    />
                    <span className={`text-[11px] mt-2 ${d.isToday ? 'font-semibold text-green-700' : 'text-gray-500'}`}>{d.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* reject / delivered / could not deliver */}
          <AnimatePresence>
            {dialog && dialog.d.order && (
              <ActionDialog
                key={`${dialog.kind}-${dialog.d._id}`}
                kind={dialog.kind}
                d={dialog.d}
                busy={busyId === dialog.d._id}
                onClose={() => setDialog(null)}
                onConfirm={(body) => act(dialog.d._id, dialog.kind, body)}
              />
            )}
          </AnimatePresence>
        </>
      )}
    </DeliveryShell>
  )
}

export default DeliveryBoyDashboard
