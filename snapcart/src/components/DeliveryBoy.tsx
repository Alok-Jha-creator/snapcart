'use client'
import React, { useCallback, useEffect, useState } from 'react'
import axios from 'axios'
import { useSelector } from 'react-redux'
import { RootState } from '@/redux/store'
import { BellRing, CheckCircle2, CreditCard, MapPin, Navigation, Package, PackageCheck, Phone, Truck, Wallet } from 'lucide-react'

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
  updatedAt: string
}

type Tab = "available" | "mine" | "completed"

const DeliveryBoyDashboard = () => {
  const { userData } = useSelector((state: RootState) => state.user)
  const [available, setAvailable] = useState<IAssignment[]>([])
  const [mine, setMine] = useState<IAssignment[]>([])
  const [completed, setCompleted] = useState<IAssignment[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>("available")
  const [error, setError] = useState("")

  const load = useCallback(async () => {
    try {
      const { data } = await axios.get('/api/delivery/assignments')
      setAvailable(data.available)
      setMine(data.mine)
      setCompleted(data.completed)
    } catch (e) {
      console.log('Failed to load assignments', e)
    } finally {
      setLoading(false)
    }
  }, [])

  // Naya order aaye ko thaha pauna har 15 second ma refresh
  useEffect(() => {
    load()
    const t = setInterval(load, 15000)
    return () => clearInterval(t)
  }, [load])

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

  const today = new Date().toDateString()
  const deliveredToday = completed.filter((c) => new Date(c.updatedAt).toDateString() === today).length
  const firstName = userData?.name?.split(" ")[0]

  const stats = [
    { label: "New requests", value: available.length, icon: BellRing, tint: "bg-yellow-100 text-yellow-700" },
    { label: "On the way", value: mine.length, icon: Truck, tint: "bg-blue-100 text-blue-600" },
    { label: "Delivered today", value: deliveredToday, icon: PackageCheck, tint: "bg-green-100 text-green-700" },
    { label: "Total delivered", value: completed.length, icon: CheckCircle2, tint: "bg-purple-100 text-purple-600" },
  ]

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "available", label: "New requests", count: available.length },
    { key: "mine", label: "My deliveries", count: mine.length },
    { key: "completed", label: "History", count: completed.length },
  ]

  const list = tab === "available" ? available : tab === "mine" ? mine : completed

  const OrderCard = ({ a }: { a: IAssignment }) => {
    const o = a.order
    if (!o) return null
    const itemCount = o.items.reduce((n, it) => n + it.quantity, 0)
    const hasCoords = o.address.latitude != null && o.address.longitude != null
    const mapUrl = hasCoords
      ? `https://www.google.com/maps/dir/?api=1&destination=${o.address.latitude},${o.address.longitude}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${o.address.fullAddress}, ${o.address.city}`)}`
    const collectCash = o.paymentMethod === "cod" && !o.isPaid

    return (
      <div className='bg-white rounded-xl border border-gray-100 shadow-sm p-4 sm:p-5 min-w-0'>
        <div className='flex items-start justify-between gap-2'>
          <div className='flex items-center gap-2 min-w-0'>
            <span className='w-9 h-9 rounded-full bg-green-100 flex items-center justify-center shrink-0'>
              <Package size={18} className='text-green-700' />
            </span>
            <div className='min-w-0'>
              <p className='text-sm font-semibold text-gray-800'>Order #{o._id.slice(-6)}</p>
              <p className='text-xs text-gray-500'>
                {new Date(o.createdAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
          <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full shrink-0 ${collectCash ? "bg-yellow-100 text-yellow-700" : "bg-green-100 text-green-700"}`}>
            {o.paymentMethod === "cod" ? <Wallet size={12} /> : <CreditCard size={12} />}
            {collectCash ? "Collect cash" : o.paymentMethod === "cod" ? "Cash collected" : "Paid online"}
          </span>
        </div>

        <div className='mt-3 space-y-1.5 text-sm text-gray-600'>
          <p className='font-medium text-gray-800'>{o.address.fullName}</p>
          {o.address.mobile && (
            <a href={`tel:${o.address.mobile}`} className='flex items-center gap-2 text-green-700 font-medium'>
              <Phone size={14} /> {o.address.mobile}
            </a>
          )}
          <p className='flex items-start gap-2'>
            <MapPin size={14} className='text-green-600 mt-0.5 shrink-0' />
            <span className='wrap-break-word min-w-0'>
              {[o.address.fullAddress, o.address.city, o.address.state].filter(Boolean).join(', ')}
            </span>
          </p>
        </div>

        <div className='mt-3 rounded-lg bg-gray-50 px-3 py-2'>
          <p className='text-xs font-medium text-gray-600 mb-1'>{itemCount} {itemCount === 1 ? 'item' : 'items'}</p>
          <ul className='space-y-0.5'>
            {o.items.map((it, i) => (
              <li key={i} className='flex justify-between text-xs text-gray-600'>
                <span className='truncate'>{it.name}</span>
                <span className='shrink-0 ml-2'>{it.quantity} {it.unit}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className='mt-3 pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3'>
          <div>
            <p className='text-[11px] text-gray-400'>{collectCash ? "Collect from customer" : "Order total"}</p>
            <p className='text-base font-bold text-gray-800'>Rs {o.totalAmount}</p>
          </div>

          <div className='flex flex-wrap gap-2 w-full sm:w-auto'>
            {a.status === "broadcasted" && (
              <button
                onClick={() => act(a._id, "accept")}
                disabled={busyId === a._id}
                className='flex-1 sm:flex-none bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-5 py-2 rounded-lg disabled:opacity-60 transition-colors'
              >
                {busyId === a._id ? "Accepting..." : "Accept order"}
              </button>
            )}
            {a.status === "assigned" && (
              <>
                <a
                  href={mapUrl}
                  target='_blank'
                  rel='noreferrer'
                  className='flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 border border-green-600 text-green-700 hover:bg-green-50 text-sm font-medium px-4 py-2 rounded-lg transition-colors'
                >
                  <Navigation size={15} /> Navigate
                </a>
                <button
                  onClick={() => act(a._id, "complete")}
                  disabled={busyId === a._id}
                  className='flex-1 sm:flex-none bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2 rounded-lg disabled:opacity-60 transition-colors'
                >
                  {busyId === a._id ? "Saving..." : "Mark delivered"}
                </button>
              </>
            )}
            {a.status === "completed" && (
              <span className='inline-flex items-center gap-1 text-sm font-medium text-green-700'>
                <CheckCircle2 size={16} /> Delivered
              </span>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className='w-[94%] md:w-[90%] max-w-6xl mx-auto pt-32 pb-12'>
      <div className='mb-6'>
        <h1 className='text-2xl sm:text-3xl font-bold text-green-700'>
          Hello{firstName ? `, ${firstName}` : ""}
        </h1>
        <p className='text-sm text-gray-500 mt-1'>
          {available.length > 0
            ? `${available.length} new delivery ${available.length === 1 ? 'request is' : 'requests are'} waiting`
            : "No new requests right now"}
        </p>
      </div>

      {error && (
        <div className='mb-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-2.5'>{error}</div>
      )}

      {/* Stats */}
      <div className='grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6'>
        {stats.map((s) => (
          <div key={s.label} className='bg-white rounded-xl border border-gray-100 shadow-sm p-4'>
            <div className='flex items-center justify-between'>
              <p className='text-xs sm:text-sm text-gray-500'>{s.label}</p>
              <span className={`w-8 h-8 rounded-full flex items-center justify-center ${s.tint}`}>
                <s.icon size={16} />
              </span>
            </div>
            <p className='mt-2 text-xl sm:text-2xl font-bold text-gray-800'>
              {loading ? <span className='inline-block h-7 w-10 bg-gray-100 rounded animate-pulse' /> : s.value}
            </p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className='flex gap-2 overflow-x-auto pb-1 mb-4'>
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`shrink-0 text-sm font-medium px-4 py-2 rounded-full border transition-colors ${
              tab === t.key ? "bg-green-600 text-white border-green-600" : "bg-white text-gray-600 border-gray-200 hover:border-green-300"
            }`}
          >
            {t.label} <span className={tab === t.key ? "opacity-90" : "text-gray-400"}>({t.count})</span>
          </button>
        ))}
      </div>

      {/* List: 1 column phone/tablet, 2 columns large screens */}
      {loading ? (
        <div className='grid grid-cols-1 xl:grid-cols-2 gap-4'>
          {[0, 1].map((i) => (
            <div key={i} className='bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-3'>
              <div className='h-4 w-40 bg-gray-100 rounded animate-pulse' />
              <div className='h-3 w-56 bg-gray-100 rounded animate-pulse' />
              <div className='h-3 w-32 bg-gray-100 rounded animate-pulse' />
            </div>
          ))}
        </div>
      ) : list.length === 0 ? (
        <div className='text-center py-16 bg-white border border-gray-100 rounded-xl'>
          <Package className='w-12 h-12 text-gray-300 mx-auto mb-3' />
          <p className='text-gray-700 font-medium'>
            {tab === "available" ? "No new requests" : tab === "mine" ? "No active deliveries" : "No deliveries yet"}
          </p>
          {tab === "available" && <p className='text-sm text-gray-500 mt-1'>New orders appear here automatically.</p>}
        </div>
      ) : (
        <div className='grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-5 items-start'>
          {list.map((a) => <OrderCard key={a._id} a={a} />)}
        </div>
      )}
    </div>
  )
}

export default DeliveryBoyDashboard