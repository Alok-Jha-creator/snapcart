'use client'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import axios from 'axios'
import dynamic from 'next/dynamic'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { motion } from 'motion/react'
import {
  AlertCircle, ArrowLeft, CheckCircle2, Clock, CreditCard, MapPin, Package, Phone, Route, Truck, UserCheck, Wallet,
} from 'lucide-react'

const LiveMap = dynamic(() => import('@/components/LiveMap'), {
  ssr: false,
  loading: () => <div className='h-80 rounded-2xl bg-gray-100 animate-pulse' />,
})

/* ----------------------------- settings ----------------------------- */
const POLL_MS = 6000          // ask for the latest position every 6 seconds
const AVG_SPEED_KMH = 20      // used for the time estimate
const STALE_AFTER_S = 120     // the position is "old" after 2 minutes

/* ------------------------------ types ------------------------------- */
type Stage = 'placed' | 'assigned' | 'accepted' | 'on_the_way' | 'delivered' | 'failed'

interface Tracking {
  stage: Stage
  order: {
    _id: string
    totalAmount: number
    paymentMethod: 'cod' | 'online'
    isPaid: boolean
    createdAt: string
    items: { name: string; quantity: number; unit: string }[]
    address: { fullName: string; mobile?: string; fullAddress: string; city: string; state: string; latitude?: number; longitude?: number }
  }
  boy: null | { name: string; image: string; phone?: string }
  times: { placedAt: string; assignedAt: string | null; pickedUpAt: string | null; deliveredAt: string | null }
  boyLocation: null | { lat: number; lng: number; at: string | null }
}

/* ----------------------------- helpers ------------------------------ */
const haversineKm = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const R = 6371
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(s))
}

const clock = (iso: string | null) =>
  iso ? new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : ''

const errorText = (error: unknown, fallback: string) =>
  (axios.isAxiosError(error) && error.response?.data?.message) || fallback

// the four steps the customer follows
const STEPS = [
  { label: 'Order placed', icon: Package },
  { label: 'Delivery partner assigned', icon: UserCheck },
  { label: 'On the way', icon: Truck },
  { label: 'Delivered', icon: CheckCircle2 },
]
const stepOf: Record<Stage, number> = { placed: 0, assigned: 1, accepted: 1, on_the_way: 2, delivered: 3, failed: 1 }

const headline = (stage: Stage, boyName?: string) => {
  switch (stage) {
    case 'placed': return { title: 'Order placed', text: 'We are finding a delivery partner for your order.' }
    case 'assigned': return { title: 'Delivery partner assigned', text: boyName ? `Waiting for ${boyName} to confirm.` : 'Waiting for the delivery partner to confirm.' }
    case 'accepted': return { title: 'Partner confirmed', text: boyName ? `${boyName} will pick up your order soon.` : 'Your order will be picked up soon.' }
    case 'on_the_way': return { title: 'On the way', text: boyName ? `${boyName} is bringing your order.` : 'Your order is on its way.' }
    case 'delivered': return { title: 'Delivered', text: 'Your order was delivered.' }
    case 'failed': return { title: 'Delivery problem', text: 'We could not deliver this time. We are arranging it again.' }
  }
}

const pillColor: Record<Stage, string> = {
  placed: 'bg-amber-100 text-amber-700',
  assigned: 'bg-amber-100 text-amber-700',
  accepted: 'bg-blue-100 text-blue-700',
  on_the_way: 'bg-blue-100 text-blue-700',
  delivered: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-600',
}

/* ------------------------------ page -------------------------------- */
const TrackOrder = ({ orderId }: { orderId: string }) => {
  const router = useRouter()
  const [data, setData] = useState<Tracking | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [now, setNow] = useState(Date.now())
  const stageRef = useRef<Stage | null>(null)
  stageRef.current = data?.stage ?? null

  const load = useCallback(async () => {
    try {
      const res = await axios.get<Tracking>(`/api/user/track/${orderId}`)
      setData(res.data)
      setError('')
    } catch (e) {
      // keep showing the last good data if a refresh fails; only the first load shows a full error
      setError(errorText(e, 'Could not load the tracking details.'))
    } finally {
      setLoading(false)
    }
  }, [orderId])

  useEffect(() => {
    load()
    const t = setInterval(() => { if (stageRef.current !== 'delivered') load() }, POLL_MS)
    return () => clearInterval(t)
  }, [load])

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 5000)
    return () => clearInterval(t)
  }, [])

  const back = (
    <button onClick={() => router.push('/user/my-orders')} className='inline-flex items-center gap-1.5 text-sm font-medium text-green-700 hover:text-green-800 mb-4'>
      <ArrowLeft size={16} /> My orders
    </button>
  )

  const shell = (children: React.ReactNode) => (
    <div className='w-[94%] md:w-[90%] max-w-4xl mx-auto pt-28 sm:pt-32 pb-12'>{children}</div>
  )

  if (loading) {
    return shell(
      <div className='space-y-4'>
        <div className='h-24 bg-gray-100 rounded-2xl animate-pulse' />
        <div className='h-80 bg-gray-100 rounded-2xl animate-pulse' />
      </div>
    )
  }

  if (!data) {
    return shell(
      <>
        {back}
        <div className='text-center py-14 bg-white border border-gray-100 shadow-sm rounded-2xl'>
          <AlertCircle className='w-12 h-12 text-gray-300 mx-auto mb-3' />
          <p className='text-gray-800 font-medium'>{error || 'We could not find this order.'}</p>
        </div>
      </>
    )
  }

  const { stage, order, boy, times, boyLocation } = data
  const head = headline(stage, boy?.name)
  const step = stepOf[stage]
  const stepTime = [clock(times.placedAt), clock(times.assignedAt), clock(times.pickedUpAt), clock(times.deliveredAt)]

  const dest = order.address.latitude != null && order.address.longitude != null
    ? { lat: Number(order.address.latitude), lng: Number(order.address.longitude) }
    : null
  const boyPos = boyLocation ? { lat: boyLocation.lat, lng: boyLocation.lng } : null
  const km = boyPos && dest ? haversineKm(boyPos, dest) : null
  const eta = km != null ? Math.max(1, Math.round((km / AVG_SPEED_KMH) * 60)) : null
  const secondsOld = boyLocation?.at ? Math.max(0, Math.floor((now - new Date(boyLocation.at).getTime()) / 1000)) : null
  const stale = secondsOld != null && secondsOld > STALE_AFTER_S
  const address = [order.address.fullAddress, order.address.city, order.address.state].filter(Boolean).join(', ')

  return shell(
    <>
      {back}

      {/* status */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className='bg-white rounded-2xl border border-gray-100 shadow-sm p-5'>
        <div className='flex flex-wrap items-start justify-between gap-3'>
          <div>
            <p className='text-xs text-gray-500'>Order #{order._id.slice(-6)}</p>
            <h1 className='text-2xl font-bold text-[#0b5c3b] mt-0.5'>{head.title}</h1>
            <p className='text-sm text-gray-600 mt-1'>{head.text}</p>
          </div>
          <span className={`text-xs font-medium px-3 py-1 rounded-full ${pillColor[stage]}`}>{head.title}</span>
        </div>

        {/* steps */}
        <ol className='mt-6 grid grid-cols-4 gap-2'>
          {STEPS.map((s, i) => {
            const done = i <= step && stage !== 'failed'
            const current = i === step
            return (
              <li key={s.label} className='flex flex-col items-center text-center'>
                <div className='flex items-center w-full'>
                  <span className={`flex-1 h-0.5 ${i === 0 ? 'opacity-0' : i <= step && stage !== 'failed' ? 'bg-green-500' : 'bg-gray-200'}`} />
                  <span className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${done ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-400'} ${current && stage === 'on_the_way' ? 'ring-4 ring-green-200 animate-pulse' : ''}`}>
                    <s.icon size={18} />
                  </span>
                  <span className={`flex-1 h-0.5 ${i === STEPS.length - 1 ? 'opacity-0' : i < step && stage !== 'failed' ? 'bg-green-500' : 'bg-gray-200'}`} />
                </div>
                <p className={`mt-2 text-[11px] sm:text-xs font-medium leading-4 ${done ? 'text-gray-800' : 'text-gray-400'}`}>{s.label}</p>
                <p className='text-[11px] text-gray-400 h-4'>{done ? stepTime[i] : ''}</p>
              </li>
            )
          })}
        </ol>

        {stage === 'failed' && (
          <p className='mt-4 flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-4 py-3'>
            <AlertCircle size={16} className='mt-0.5 shrink-0' /> We could not deliver your order this time. We will assign a delivery partner again.
          </p>
        )}
      </motion.div>

      {/* delivery partner */}
      {boy && (
        <div className='mt-4 bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4'>
          <span className='relative w-14 h-14 rounded-full overflow-hidden bg-green-600 text-white text-xl font-semibold flex items-center justify-center shrink-0'>
            {boy.image ? <Image src={boy.image} alt={boy.name} fill sizes='56px' className='object-cover' /> : boy.name[0]?.toUpperCase()}
          </span>
          <div className='min-w-0 flex-1'>
            <p className='text-xs text-gray-500'>Your delivery partner</p>
            <p className='font-semibold text-gray-800 truncate'>{boy.name}</p>
            {stage === 'on_the_way' && km != null && (
              <p className='mt-1 inline-flex items-center gap-1 text-xs font-medium text-blue-700'>
                <Route size={13} /> {km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`} away · about {eta} min
              </p>
            )}
          </div>
          {boy.phone && (
            <a href={`tel:${boy.phone}`} className='flex items-center gap-2 rounded-xl bg-green-50 text-green-700 text-sm font-semibold px-4 py-2.5 hover:bg-green-100'>
              <Phone size={16} /> Call
            </a>
          )}
        </div>
      )}

      {/* live map */}
      {stage === 'on_the_way' && (
        <div className='mt-4 bg-white rounded-2xl border border-gray-100 shadow-sm p-4'>
          <div className='flex items-center justify-between gap-3 mb-3'>
            <h2 className='text-lg font-semibold text-[#0b5c3b]'>Live location</h2>
            {secondsOld != null && !stale && (
              <span className='inline-flex items-center gap-1.5 text-xs text-gray-500'>
                <span className='w-2 h-2 rounded-full bg-green-500 animate-pulse' /> Updated {secondsOld < 5 ? 'just now' : `${secondsOld}s ago`}
              </span>
            )}
          </div>
          <LiveMap boy={boyPos} boyLabel={boy ? `${boy.name} (delivery partner)` : 'Delivery partner'} dest={dest} destLabel='Your delivery address' height={340} />
          {!boyPos && (
            <p className='mt-3 flex items-center gap-2 text-sm text-gray-500'><Clock size={15} /> Waiting for the delivery partner&apos;s location...</p>
          )}
          {stale && (
            <p className='mt-3 flex items-start gap-2 text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-xl px-3.5 py-2.5'>
              <AlertCircle size={16} className='mt-0.5 shrink-0' /> The location has not updated for a while. The delivery partner may have a weak signal.
            </p>
          )}
        </div>
      )}

      {/* order details */}
      <div className='mt-4 bg-white rounded-2xl border border-gray-100 shadow-sm p-5'>
        <h2 className='text-lg font-semibold text-[#0b5c3b] mb-3'>Order details</h2>
        <p className='flex items-start gap-2 text-sm text-gray-600'>
          <MapPin size={15} className='text-green-600 mt-0.5 shrink-0' />
          <span><span className='font-medium text-gray-800'>{order.address.fullName}</span><br />{address}</span>
        </p>
        <ul className='mt-4 space-y-1.5 border-t border-gray-100 pt-4'>
          {order.items.map((it, i) => (
            <li key={i} className='flex justify-between text-sm text-gray-600'>
              <span className='truncate'>{it.name}</span>
              <span className='shrink-0 ml-3'>{it.quantity} {it.unit}</span>
            </li>
          ))}
        </ul>
        <div className='mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-sm'>
          <span className='inline-flex items-center gap-1.5 text-gray-500'>
            {order.paymentMethod === 'cod' ? <Wallet size={15} /> : <CreditCard size={15} />}
            {order.paymentMethod === 'cod' ? 'Cash on delivery' : 'Online payment'} · {order.isPaid ? 'Paid' : 'Unpaid'}
          </span>
          <span className='font-semibold text-gray-800'>Rs {order.totalAmount}</span>
        </div>
      </div>
    </>
  )
}

export default TrackOrder
