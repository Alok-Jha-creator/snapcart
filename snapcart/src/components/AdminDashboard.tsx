'use client'
import React, { useEffect, useMemo, useState } from 'react'
import {
    ArrowRight, Boxes, CalendarDays, ChevronRight, Clipboard, ClipboardList,
    Clock, Eye, IndianRupee, MapPin, Package, Phone, PlusCircle,
    ShoppingBag, ShoppingCart, Zap, TrendingUp,
} from 'lucide-react'
import Link from 'next/link'
import axios from 'axios'
import { useSelector } from 'react-redux'
import { RootState } from '@/redux/store'
import AdminShell from '@/components/AdminShell'

/* ---------------------------------- types --------------------------------- */

interface IOrder {
    _id: string
    user?: { name?: string }
    items: { name?: string; quantity: number; price?: string | number }[]
    totalAmount: number
    paymentMethod: 'cod' | 'online'
    isPaid: boolean
    status: 'pending' | 'out of delivery' | 'delivered'
    address: { fullName: string; mobile?: string; city?: string; fullAddress?: string }
    createdAt: string
}

interface IGrocery {
    _id: string
    name: string
    price: string
    unit: string
    image: string
    createdAt?: string
}

/* --------------------------------- helpers -------------------------------- */

const timeAgo = (dateStr: string) => {
    const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    return `${Math.floor(hrs / 24)}d ago`
}

const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString()

/** Small area + line chart used inside the stat cards */
const Sparkline = ({ values, color, id }: { values: number[]; color: string; id: string }) => {
    const w = 96
    const h = 40
    const max = Math.max(...values)
    const min = Math.min(...values)
    const range = max - min
    const pts = values.map((v, i) => {
        const x = (i / (values.length - 1)) * w
        const y = range === 0 ? h / 2 : h - 4 - ((v - min) / range) * (h - 8)
        return [x, y] as const
    })
    const line = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
    const area = `${line} L${w},${h} L0,${h} Z`
    return (
        <svg width={64} height={27} viewBox={`0 0 ${w} ${h}`} className='shrink-0' aria-hidden>
            <defs>
                <linearGradient id={id} x1='0' x2='0' y1='0' y2='1'>
                    <stop offset='0%' stopColor={color} stopOpacity='0.25' />
                    <stop offset='100%' stopColor={color} stopOpacity='0' />
                </linearGradient>
            </defs>
            <path d={area} fill={`url(#${id})`} />
            <path d={line} fill='none' stroke={color} strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' />
        </svg>
    )
}

/* ------------------------------ static config ----------------------------- */

const orderTiles = [
    { box: 'bg-green-100 text-green-700', Icon: ClipboardList },
    { box: 'bg-blue-100 text-blue-600', Icon: Package },
    { box: 'bg-purple-100 text-purple-600', Icon: ShoppingBag },
]

const quickActions = [
    { href: '/admin/add-grocery', title: 'Add Grocery', subtitle: 'Add a new product to your store', icon: PlusCircle, card: 'bg-green-50 hover:bg-green-100/70', dot: 'bg-green-600' },
    { href: '/admin/view-grocery', title: 'View Grocery', subtitle: 'Edit or remove products', icon: Eye, card: 'bg-blue-50 hover:bg-blue-100/70', dot: 'bg-blue-500' },
    { href: '/admin/manage-orders', title: 'Manage Orders', subtitle: 'Update delivery status', icon: Clipboard, card: 'bg-orange-50 hover:bg-orange-100/70', dot: 'bg-orange-400' },
]

/* -------------------------------- component ------------------------------- */

const AdminDashboard = () => {
    const { userData } = useSelector((state: RootState) => state.user)
    const [orders, setOrders] = useState<IOrder[]>([])
    const [groceries, setGroceries] = useState<IGrocery[]>([])
    const [loading, setLoading] = useState(true)
    const [loadFailed, setLoadFailed] = useState(false)
    const [now, setNow] = useState<Date | null>(null)
    const [query, setQuery] = useState('')

    // Set after mount so server/browser time zones can't cause a hydration mismatch
    useEffect(() => {
        setNow(new Date())
        const t = setInterval(() => setNow(new Date()), 60000)
        return () => clearInterval(t)
    }, [])

    useEffect(() => {
        const load = async () => {
            const [ordersRes, groceriesRes] = await Promise.allSettled([
                axios.get('/api/admin/get-orders'),
                axios.get('/api/admin/get-groceries'),
            ])
            let failed = false
            if (ordersRes.status === 'fulfilled') setOrders(ordersRes.value.data)
            else { failed = true; console.log('Failed to fetch orders', ordersRes.reason) }
            if (groceriesRes.status === 'fulfilled') setGroceries(groceriesRes.value.data)
            else { failed = true; console.log('Failed to fetch groceries', groceriesRes.reason) }
            setLoadFailed(failed)
            setLoading(false)
        }
        load()
    }, [])

    const validOrders = useMemo(() => orders.filter((o) => o.paymentMethod === 'cod' || o.isPaid), [orders])

    const pendingOrders = useMemo(
        () =>
            validOrders
                .filter((o) => o.status === 'pending')
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
        [validOrders]
    )

    const earnedOrders = useMemo(() => validOrders.filter((o) => o.isPaid || o.status === 'delivered'), [validOrders])
    const revenue = earnedOrders.reduce((sum, o) => sum + Number(o.totalAmount), 0)

    // Last 7 days of real data -> sparklines and trend hints
    const trend = useMemo(() => {
        const base = now ?? new Date()
        const days = Array.from({ length: 7 }, (_, idx) => {
            const d = new Date(base)
            d.setDate(d.getDate() - (6 - idx))
            return d
        })
        const ordersPerDay = days.map((d) => validOrders.filter((o) => sameDay(new Date(o.createdAt), d)).length)
        const pendingPerDay = days.map((d) => pendingOrders.filter((o) => sameDay(new Date(o.createdAt), d)).length)
        const revenuePerDay = days.map((d) =>
            earnedOrders.filter((o) => sameDay(new Date(o.createdAt), d)).reduce((s, o) => s + Number(o.totalAmount), 0)
        )
        const productsPerDay = days.map((d) => {
            const end = new Date(d)
            end.setHours(23, 59, 59, 999)
            const withDates = groceries.filter((g) => g.createdAt)
            if (withDates.length === 0) return groceries.length
            return groceries.filter((g) => !g.createdAt || new Date(g.createdAt) <= end).length
        })

        const dayMs = 86400000
        const t = base.getTime()
        const inRange = (o: IOrder, from: number, to: number) => {
            const c = new Date(o.createdAt).getTime()
            return c > t - to * dayMs && c <= t - from * dayMs
        }
        const thisWeekRev = earnedOrders.filter((o) => inRange(o, 0, 7)).reduce((s, o) => s + Number(o.totalAmount), 0)
        const lastWeekRev = earnedOrders.filter((o) => inRange(o, 7, 14)).reduce((s, o) => s + Number(o.totalAmount), 0)
        const revChange = lastWeekRev > 0 ? Math.round(((thisWeekRev - lastWeekRev) / lastWeekRev) * 100) : null

        return {
            ordersPerDay,
            pendingPerDay,
            revenuePerDay,
            productsPerDay,
            ordersDiff: ordersPerDay[6] - ordersPerDay[5],
            revChange,
        }
    }, [validOrders, pendingOrders, earnedOrders, groceries, now])

    // Recent activity built from real orders + products
    const activity = useMemo(() => {
        const fromOrders = validOrders.map((o) => ({
            key: `o-${o._id}`,
            at: o.createdAt,
            node: (
                <>
                    Order <b className='font-semibold text-gray-800'>#{o._id.slice(-6)}</b> placed by{' '}
                    <b className='font-semibold text-gray-800'>{o.user?.name || o.address.fullName}</b>
                </>
            ),
        }))
        const fromProducts = groceries
            .filter((g) => g.createdAt)
            .map((g) => ({
                key: `g-${g._id}`,
                at: g.createdAt as string,
                node: (
                    <>
                        New product added: <b className='font-semibold text-gray-800'>{g.name}</b>
                    </>
                ),
            }))
        return [...fromOrders, ...fromProducts]
            .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
            .slice(0, 4)
    }, [validOrders, groceries])

    const hour = now ? now.getHours() : 12
    const greeting = !now ? 'Welcome back' : hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
    const firstName = userData?.name?.split(' ')[0]
    const dateLabel = now ? now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : ''
    const timeLabel = now ? now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : ''

    const visibleOrders = useMemo(() => {
        const q = query.trim().toLowerCase()
        if (!q) return pendingOrders
        return pendingOrders.filter((o) =>
            [o._id.slice(-6), o.user?.name, o.address.fullName, o.address.city, o.address.fullAddress, o.address.mobile]
                .filter(Boolean)
                .some((v) => String(v).toLowerCase().includes(q))
        )
    }, [pendingOrders, query])

    const stats = [
        {
            label: 'Total Orders',
            value: validOrders.length,
            icon: ShoppingCart,
            card: 'from-green-50 to-white border-green-100',
            tint: 'bg-green-500 text-white',
            color: '#16a34a',
            data: trend.ordersPerDay,
            hint:
                trend.ordersDiff === 0
                    ? 'Same as yesterday'
                    : `${Math.abs(trend.ordersDiff)} ${trend.ordersDiff > 0 ? 'more' : 'fewer'} than yesterday`,
            hintTone: trend.ordersDiff >= 0 ? 'text-green-600' : 'text-red-500',
            hintIcon: trend.ordersDiff >= 0 ? '↑' : '↓',
        },
        {
            label: 'Pending Orders',
            value: pendingOrders.length,
            icon: Clock,
            card: 'from-amber-50 to-white border-amber-100',
            tint: 'bg-amber-400 text-white',
            color: '#f59e0b',
            data: trend.pendingPerDay,
            hint: 'Waiting for you',
            hintTone: 'text-amber-600',
            hintIcon: '◔',
        },
        {
            label: 'Revenue',
            value: `Rs ${revenue.toLocaleString('en-IN')}`,
            icon: IndianRupee,
            card: 'from-blue-50 to-white border-blue-100',
            tint: 'bg-blue-500 text-white',
            color: '#3b82f6',
            data: trend.revenuePerDay,
            hint: trend.revChange === null ? 'Paid or delivered' : `${Math.abs(trend.revChange)}% ${trend.revChange >= 0 ? 'more' : 'less'} than last week`,
            hintTone: trend.revChange === null ? 'text-gray-400' : trend.revChange >= 0 ? 'text-green-600' : 'text-red-500',
            hintIcon: trend.revChange === null ? '' : trend.revChange >= 0 ? '↑' : '↓',
        },
        {
            label: 'Products',
            value: groceries.length,
            icon: Boxes,
            card: 'from-purple-50 to-white border-purple-100',
            tint: 'bg-purple-500 text-white',
            color: '#9333ea',
            data: trend.productsPerDay,
            hint: 'In your store',
            hintTone: 'text-gray-400',
            hintIcon: '',
        },
    ]

    return (
        <AdminShell
            pendingCount={pendingOrders.length}
            search={{ value: query, onChange: setQuery, placeholder: 'Search products, orders, or customers...' }}
        >
                    {/* greeting */}
                    <div className='flex flex-wrap items-start justify-between gap-3 mb-6'>
                        <div>
                            <h1 className='text-3xl font-bold text-[#0b5c3b]'>
                                {greeting}{firstName ? `, ${firstName}` : ''} <span aria-hidden>👋</span>
                            </h1>
                            <p className='text-gray-500 mt-1.5'>Here&apos;s what&apos;s happening with your store today.</p>
                        </div>
                        <div className='flex items-start gap-2 text-sm text-gray-600 min-h-10'>
                            <CalendarDays size={18} className='mt-0.5 text-gray-500' />
                            <div className='text-right'>
                                <p>{dateLabel}</p>
                                <p className='mt-1 text-gray-500'>{timeLabel}</p>
                            </div>
                        </div>
                    </div>

                    {loadFailed && (
                        <div className='mb-5 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-2.5'>
                            Some data could not be loaded. Please refresh the page.
                        </div>
                    )}

                    {/* stat cards */}
                    <div className='grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-5'>
                        {stats.map((s, i) => (
                            <div key={s.label} className={`rounded-2xl border bg-linear-to-br ${s.card} shadow-sm p-4`}>
                                <div className='flex items-start gap-3'>
                                    <span className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${s.tint}`}>
                                        <s.icon size={20} />
                                    </span>
                                    <div className='flex-1 min-w-0'>
                                        <p className='text-sm font-medium text-gray-700'>{s.label}</p>
                                        <div className='mt-1 flex items-end justify-between gap-2'>
                                            <div className='text-2xl font-bold text-gray-800 leading-8 whitespace-nowrap'>
                                                {loading ? <span className='inline-block h-8 w-16 bg-gray-200/70 rounded animate-pulse' /> : s.value}
                                            </div>
                                            {!loading && <Sparkline values={s.data} color={s.color} id={`spark-${i}`} />}
                                        </div>
                                        <p className={`mt-1.5 text-xs font-medium ${s.hintTone}`}>
                                            {s.hintIcon && <span className='mr-1'>{s.hintIcon}</span>}
                                            {s.hint}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className='grid grid-cols-1 xl:grid-cols-[minmax(0,1.75fr)_minmax(0,1fr)] gap-5 items-start'>
                        {/* pending orders */}
                        <section className='bg-white rounded-2xl border border-gray-100 shadow-sm'>
                            <div className='flex items-center justify-between px-5 py-4'>
                                <h2 className='flex items-center gap-2 text-lg font-semibold text-[#0b5c3b]'>
                                    <ClipboardList size={20} className='text-green-600 fill-green-600/20' /> Pending orders
                                </h2>
                                <Link href='/admin/manage-orders' className='flex items-center gap-1 text-sm font-medium text-green-700 hover:text-green-800'>
                                    View all <ArrowRight size={14} />
                                </Link>
                            </div>

                            {loading ? (
                                <div className='divide-y divide-gray-100 border-t border-gray-100'>
                                    {[0, 1, 2].map((i) => (
                                        <div key={i} className='flex gap-4 p-5'>
                                            <div className='w-12 h-12 rounded-full bg-gray-100 animate-pulse' />
                                            <div className='flex-1 space-y-2.5'>
                                                <div className='h-4 w-48 bg-gray-100 rounded animate-pulse' />
                                                <div className='h-3 w-32 bg-gray-100 rounded animate-pulse' />
                                                <div className='h-3 w-64 bg-gray-100 rounded animate-pulse' />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : visibleOrders.length === 0 ? (
                                <div className='border-t border-gray-100 text-center py-14 px-4'>
                                    <ClipboardList className='w-12 h-12 text-green-500 mx-auto mb-3' />
                                    <p className='font-medium'>{query ? 'No orders match your search' : 'All caught up'}</p>
                                    <p className='text-sm text-gray-500 mt-1'>
                                        {query ? 'Try a different name, order number, or city.' : 'No orders are waiting for you right now.'}
                                    </p>
                                </div>
                            ) : (
                                <div className='divide-y divide-gray-100 border-t border-gray-100'>
                                    {visibleOrders.slice(0, 4).map((o, idx) => {
                                        const itemCount = o.items.reduce((n, it) => n + it.quantity, 0)
                                        const tile = orderTiles[idx % orderTiles.length]
                                        const address = [o.address.fullAddress, o.address.city].filter(Boolean).join(', ')
                                        return (
                                            <Link
                                                key={o._id}
                                                href='/admin/manage-orders'
                                                className='group flex items-center gap-4 px-5 py-4 hover:bg-gray-50/70 transition-colors'
                                            >
                                                <span className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${tile.box}`}>
                                                    <tile.Icon size={22} />
                                                </span>
                                                <div className='flex-1 min-w-0'>
                                                    <div className='flex items-center gap-2 flex-wrap'>
                                                        <p className='font-semibold'>Order #{o._id.slice(-6)}</p>
                                                        <span className='text-xs font-medium px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-700 capitalize'>
                                                            {o.status}
                                                        </span>
                                                    </div>
                                                    <p className='text-xs text-gray-400 mt-0.5'>{timeAgo(o.createdAt)}</p>
                                                    <p className='flex items-center gap-1.5 text-sm font-medium mt-1.5'>
                                                        <Phone size={13} className='text-gray-400' />
                                                        {o.user?.name || o.address.fullName}
                                                    </p>
                                                    {address && (
                                                        <p className='flex items-start gap-1.5 text-xs text-gray-500 mt-1'>
                                                            <MapPin size={13} className='mt-0.5 shrink-0 text-gray-400' />
                                                            <span className='truncate'>{address}</span>
                                                        </p>
                                                    )}
                                                </div>
                                                <div className='text-right shrink-0'>
                                                    <p className='font-semibold'>Rs {o.totalAmount}</p>
                                                    <p className='text-xs text-gray-500 mt-0.5'>{itemCount} {itemCount === 1 ? 'item' : 'items'}</p>
                                                </div>
                                                <ChevronRight size={18} className='text-gray-400 group-hover:text-green-600 shrink-0' />
                                            </Link>
                                        )
                                    })}
                                </div>
                            )}
                        </section>

                        {/* right column */}
                        <div className='space-y-6'>
                            <section className='bg-white rounded-2xl border border-gray-100 shadow-sm p-5'>
                                <h2 className='flex items-center gap-2 text-lg font-semibold text-[#0b5c3b] mb-4'>
                                    <Zap size={20} className='text-green-600 fill-green-600' /> Quick actions
                                </h2>
                                <div className='space-y-3'>
                                    {quickActions.map((a) => (
                                        <Link key={a.href} href={a.href} className={`flex items-center gap-3 rounded-xl px-3 py-3.5 transition-colors ${a.card}`}>
                                            <span className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 text-white ${a.dot}`}>
                                                <a.icon size={20} />
                                            </span>
                                            <div className='flex-1 min-w-0'>
                                                <p className='text-sm font-semibold'>{a.title}</p>
                                                <p className='text-xs text-gray-500 truncate'>{a.subtitle}</p>
                                            </div>
                                            <ChevronRight size={18} className='text-gray-500 shrink-0' />
                                        </Link>
                                    ))}
                                </div>
                            </section>

                            <section className='bg-white rounded-2xl border border-gray-100 shadow-sm p-5'>
                                <div className='flex items-center justify-between mb-3'>
                                    <h2 className='flex items-center gap-2 text-lg font-semibold text-[#0b5c3b]'>
                                        <TrendingUp size={20} className='text-green-600' /> Recent activity
                                    </h2>
                                    <Link href='/admin/manage-orders' className='flex items-center gap-1 text-xs font-medium text-green-700 hover:text-green-800'>
                                        View all <ArrowRight size={12} />
                                    </Link>
                                </div>
                                {loading ? (
                                    <div className='space-y-4 pt-3 border-t border-gray-100'>
                                        {[0, 1, 2, 3].map((i) => <div key={i} className='h-4 bg-gray-100 rounded animate-pulse' />)}
                                    </div>
                                ) : activity.length === 0 ? (
                                    <p className='text-sm text-gray-500 pt-3 border-t border-gray-100'>Nothing has happened yet.</p>
                                ) : (
                                    <ul className='pt-3 border-t border-gray-100 space-y-4'>
                                        {activity.map((a) => (
                                            <li key={a.key} className='flex items-center gap-3 text-sm text-gray-600'>
                                                <span className='w-2 h-2 rounded-full bg-green-500 shrink-0' />
                                                <span className='flex-1 min-w-0 truncate'>{a.node}</span>
                                                <span className='text-xs text-gray-400 shrink-0'>{timeAgo(a.at)}</span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </section>
                        </div>
                    </div>
                
        </AdminShell>
    )
}

export default AdminDashboard