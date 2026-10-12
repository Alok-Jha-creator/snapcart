'use client'
import React, { useEffect, useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { ArrowRight, Banknote, Boxes, CheckCircle2, Clipboard, Clock, Package, PlusCircle } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import axios from 'axios'
import { useSelector } from 'react-redux'
import { RootState } from '@/redux/store'

interface IOrder {
    _id: string
    user?: { name?: string }
    items: { quantity: number }[]
    totalAmount: number
    paymentMethod: "cod" | "online"
    isPaid: boolean
    status: "pending" | "out of delivery" | "delivered"
    address: { fullName: string }
    createdAt: string
}

interface IGrocery {
    _id: string
    name: string
    price: string
    unit: string
    image: string
}

const timeAgo = (dateStr: string) => {
    const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000)
    if (mins < 1) return "just now"
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    return `${Math.floor(hrs / 24)}d ago`
}

const quickActions = [
    { href: "/admin/add-grocery", title: "Add Grocery", subtitle: "Add a new product", icon: PlusCircle },
    { href: "/admin/view-grocery", title: "View Grocery", subtitle: "Edit or remove products", icon: Boxes },
    { href: "/admin/manage-orders", title: "Manage Orders", subtitle: "Update delivery status", icon: Clipboard },
]

const AdminDashboard = () => {
    const { userData } = useSelector((state: RootState) => state.user)
    const [orders, setOrders] = useState<IOrder[]>([])
    const [groceries, setGroceries] = useState<IGrocery[]>([])
    const [loading, setLoading] = useState(true)
    const [loadFailed, setLoadFailed] = useState(false)
    const [now, setNow] = useState<Date | null>(null)

    // Date/greeting are set after mount so server and browser time zones can't cause a hydration mismatch
    useEffect(() => {
        setNow(new Date())
    }, [])

    useEffect(() => {
        const load = async () => {
            const [ordersRes, groceriesRes] = await Promise.allSettled([
                axios.get('/api/admin/get-orders'),
                axios.get('/api/admin/get-groceries'),
            ])
            let failed = false
            if (ordersRes.status === "fulfilled") setOrders(ordersRes.value.data)
            else { failed = true; console.log('Failed to fetch orders', ordersRes.reason) }
            if (groceriesRes.status === "fulfilled") setGroceries(groceriesRes.value.data)
            else { failed = true; console.log('Failed to fetch groceries', groceriesRes.reason) }
            setLoadFailed(failed)
            setLoading(false)
        }
        load()
    }, [])

    const pendingOrders = orders
        .filter((o) => o.status === "pending")
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    const revenue = orders
        .filter((o) => o.isPaid || o.status === "delivered")
        .reduce((sum, o) => sum + Number(o.totalAmount), 0)

    // Orders per day for the last 7 days (today is the last bar)
    const weekData = useMemo(() => {
        const base = now ?? new Date()
        return Array.from({ length: 7 }, (_, idx) => {
            const d = new Date(base)
            d.setDate(d.getDate() - (6 - idx))
            const count = orders.filter((o) => new Date(o.createdAt).toDateString() === d.toDateString()).length
            return {
                label: idx === 6 ? "Today" : d.toLocaleDateString('en-GB', { weekday: 'short' }),
                full: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
                count,
                isToday: idx === 6,
            }
        })
    }, [orders, now])
    const weekTotal = weekData.reduce((sum, d) => sum + d.count, 0)
    const maxCount = Math.max(1, ...weekData.map((d) => d.count))

    const hour = now ? now.getHours() : 12
    const greeting = !now ? "Welcome back" : hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"
    const firstName = userData?.name?.split(" ")[0]
    const dateLabel = now
        ? now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
        : ""

    const stats = [
        { label: "Total orders", value: orders.length, hint: "All time", icon: Package, tint: "bg-blue-100 text-blue-600" },
        { label: "Pending orders", value: pendingOrders.length, hint: "Waiting for you", icon: Clock, tint: "bg-yellow-100 text-yellow-700" },
        { label: "Revenue", value: `Rs ${revenue.toLocaleString('en-IN')}`, hint: "Paid or delivered", icon: Banknote, tint: "bg-green-100 text-green-700" },
        { label: "Products", value: groceries.length, hint: "In your store", icon: Boxes, tint: "bg-purple-100 text-purple-600" },
    ]

    return (
        <div className='w-[94%] md:w-[90%] max-w-6xl mx-auto pt-28 pb-12'>
            {/* Greeting */}
            <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className='mb-6'
            >
                <h1 className='text-2xl sm:text-3xl font-bold text-green-700'>
                    {greeting}{firstName ? `, ${firstName}` : ""}
                </h1>
                <p className='text-sm text-gray-500 mt-1 min-h-5'>
                    {dateLabel}
                    {!loading && dateLabel && (
                        <span>
                            {" • "}
                            {pendingOrders.length > 0
                                ? `${pendingOrders.length} ${pendingOrders.length === 1 ? 'order is' : 'orders are'} waiting for you`
                                : "No pending orders right now"}
                        </span>
                    )}
                </p>
            </motion.div>

            {loadFailed && (
                <div className='mb-5 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-2.5'>
                    Some data could not be loaded. Please refresh the page.
                </div>
            )}

            {/* Stats */}
            <div className='grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6'>
                {stats.map((s, i) => (
                    <motion.div
                        key={s.label}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: i * 0.05 }}
                        className='bg-white rounded-xl border border-gray-100 shadow-sm p-4'
                    >
                        <div className='flex items-center justify-between'>
                            <p className='text-xs sm:text-sm text-gray-500'>{s.label}</p>
                            <span className={`w-8 h-8 rounded-full flex items-center justify-center ${s.tint}`}>
                                <s.icon size={16} />
                            </span>
                        </div>
                        <div className='mt-2 text-xl sm:text-2xl font-bold text-gray-800'>
                            {loading ? (
                                <span className='inline-block h-7 w-16 bg-gray-100 rounded animate-pulse' />
                            ) : (
                                s.value
                            )}
                        </div>
                        <p className='text-[11px] sm:text-xs text-gray-400 mt-1'>{s.hint}</p>
                    </motion.div>
                ))}
            </div>

            <div className='grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6'>
                {/* Quick actions — first on phones/tablets (the mobile menu has no links), right column on desktop */}
                <div className='lg:order-2'>
                    <h2 className='text-base font-semibold text-gray-800 mb-3'>Quick actions</h2>
                    <div className='grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-3'>
                        {quickActions.map((a) => (
                            <Link
                                key={a.href}
                                href={a.href}
                                className='group flex items-center gap-3 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-green-200 p-4 transition-all'
                            >
                                <span className='w-10 h-10 rounded-full bg-green-100 flex items-center justify-center shrink-0'>
                                    <a.icon size={20} className='text-green-700' />
                                </span>
                                <div className='flex-1 min-w-0'>
                                    <p className='text-sm font-semibold text-gray-800'>{a.title}</p>
                                    <p className='text-xs text-gray-500 truncate'>{a.subtitle}</p>
                                </div>
                                <ArrowRight size={16} className='text-gray-300 group-hover:text-green-600 group-hover:translate-x-0.5 transition-all shrink-0' />
                            </Link>
                        ))}
                    </div>
                </div>

                {/* Pending orders */}
                <div className='lg:col-span-2 lg:order-1'>
                    <div className='flex items-center justify-between mb-3'>
                        <h2 className='text-base font-semibold text-gray-800'>Pending orders</h2>
                        <Link href='/admin/manage-orders' className='text-sm font-medium text-green-700 hover:text-green-800'>
                            View all
                        </Link>
                    </div>
                    <div className='bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden'>
                        {loading ? (
                            <div className='divide-y divide-gray-100'>
                                {[0, 1, 2].map((i) => (
                                    <div key={i} className='flex items-center gap-3 px-4 sm:px-5 py-4'>
                                        <div className='w-10 h-10 rounded-full bg-gray-100 animate-pulse shrink-0' />
                                        <div className='flex-1 space-y-2'>
                                            <div className='h-3.5 w-32 bg-gray-100 rounded animate-pulse' />
                                            <div className='h-3 w-24 bg-gray-100 rounded animate-pulse' />
                                        </div>
                                        <div className='h-4 w-14 bg-gray-100 rounded animate-pulse' />
                                    </div>
                                ))}
                            </div>
                        ) : pendingOrders.length === 0 ? (
                            <div className='text-center py-12 px-4'>
                                <CheckCircle2 className='w-12 h-12 text-green-500 mx-auto mb-3' />
                                <p className='text-gray-800 font-medium'>All caught up</p>
                                <p className='text-sm text-gray-500 mt-1'>No orders are waiting for you right now.</p>
                            </div>
                        ) : (
                            <div className='divide-y divide-gray-100'>
                                {pendingOrders.slice(0, 5).map((o) => {
                                    const itemCount = o.items.reduce((n, it) => n + it.quantity, 0)
                                    return (
                                        <Link
                                            key={o._id}
                                            href='/admin/manage-orders'
                                            className='flex items-center gap-3 px-4 sm:px-5 py-3.5 hover:bg-gray-50 transition-colors'
                                        >
                                            <span className='w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center shrink-0'>
                                                <Package size={18} className='text-yellow-700' />
                                            </span>
                                            <div className='flex-1 min-w-0'>
                                                <p className='text-sm font-medium text-gray-800 truncate'>
                                                    {o.user?.name || o.address.fullName}
                                                </p>
                                                <p className='text-xs text-gray-500 truncate'>
                                                    #{o._id.slice(-6)} • {itemCount} {itemCount === 1 ? 'item' : 'items'} • {timeAgo(o.createdAt)}
                                                </p>
                                            </div>
                                            <div className='text-right shrink-0'>
                                                <p className='text-sm font-semibold text-gray-800'>Rs {o.totalAmount}</p>
                                                <span
                                                    className={`inline-block mt-0.5 text-[11px] font-medium px-2 py-0.5 rounded-full ${
                                                        o.paymentMethod === "cod"
                                                            ? "bg-gray-100 text-gray-600"
                                                            : o.isPaid
                                                                ? "bg-green-100 text-green-700"
                                                                : "bg-red-100 text-red-600"
                                                    }`}
                                                >
                                                    {o.paymentMethod === "cod" ? "COD" : o.isPaid ? "Paid" : "Unpaid"}
                                                </span>
                                            </div>
                                        </Link>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className='grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mt-6'>
                {/* Orders — last 7 days */}
                <div className='lg:col-span-2'>
                    <div className='flex items-center justify-between mb-3'>
                        <h2 className='text-base font-semibold text-gray-800'>Orders in the last 7 days</h2>
                        {!loading && (
                            <span className='text-xs font-medium text-green-700 bg-green-100 px-2.5 py-1 rounded-full'>
                                {weekTotal} {weekTotal === 1 ? 'order' : 'orders'}
                            </span>
                        )}
                    </div>
                    <div className='bg-white rounded-xl border border-gray-100 shadow-sm p-4 sm:p-5'>
                        {loading ? (
                            <div className='h-44 bg-gray-50 rounded-lg animate-pulse' />
                        ) : (
                            <>
                                <div className='flex items-end justify-between gap-2 sm:gap-4 h-44'>
                                    {weekData.map((d, i) => (
                                        <div
                                            key={i}
                                            title={`${d.full}: ${d.count} ${d.count === 1 ? 'order' : 'orders'}`}
                                            className='flex-1 flex flex-col items-center justify-end h-full'
                                        >
                                            <span className={`text-xs font-medium mb-1 ${d.count > 0 ? 'text-gray-700' : 'text-gray-300'}`}>
                                                {d.count}
                                            </span>
                                            <motion.div
                                                initial={{ height: 0 }}
                                                animate={{ height: d.count === 0 ? 4 : Math.max(8, (d.count / maxCount) * 112) }}
                                                transition={{ duration: 0.5, delay: i * 0.05 }}
                                                className={`w-full max-w-10 rounded-t-md ${
                                                    d.count === 0 ? "bg-gray-200" : d.isToday ? "bg-green-600" : "bg-green-300"
                                                }`}
                                            />
                                            <span className={`text-[11px] sm:text-xs mt-2 ${d.isToday ? 'font-semibold text-green-700' : 'text-gray-500'}`}>
                                                {d.label}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                                {weekTotal === 0 && (
                                    <p className='text-center text-xs text-gray-400 mt-4'>No orders in the last 7 days.</p>
                                )}
                            </>
                        )}
                    </div>
                </div>

                {/* Recently added products */}
                <div>
                    <div className='flex items-center justify-between mb-3'>
                        <h2 className='text-base font-semibold text-gray-800'>Recently added</h2>
                        <Link href='/admin/view-grocery' className='text-sm font-medium text-green-700 hover:text-green-800'>
                            View all
                        </Link>
                    </div>
                    <div className='bg-white rounded-xl border border-gray-100 shadow-sm p-4'>
                        {loading ? (
                            <div className='grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-3'>
                                {[0, 1, 2, 3].map((i) => (
                                    <div key={i}>
                                        <div className='aspect-square rounded-lg bg-gray-100 animate-pulse' />
                                        <div className='h-3.5 w-20 bg-gray-100 rounded animate-pulse mt-2' />
                                    </div>
                                ))}
                            </div>
                        ) : groceries.length === 0 ? (
                            <div className='text-center py-8'>
                                <Boxes className='w-10 h-10 text-gray-300 mx-auto mb-2' />
                                <p className='text-sm text-gray-500 mb-3'>No products yet</p>
                                <Link href='/admin/add-grocery' className='text-sm font-medium text-green-700 hover:text-green-800'>
                                    Add your first grocery
                                </Link>
                            </div>
                        ) : (
                            <div className='grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-3'>
                                {groceries.slice(0, 4).map((g) => (
                                    <Link key={g._id} href='/admin/view-grocery' className='group block'>
                                        <div className='relative aspect-square rounded-lg bg-gray-50 border border-gray-100 overflow-hidden'>
                                            <Image
                                                src={g.image}
                                                alt={g.name}
                                                fill
                                                sizes='(max-width:640px) 45vw, 160px'
                                                className='object-contain p-2 transition-transform duration-300 group-hover:scale-105'
                                            />
                                        </div>
                                        <p className='text-sm font-medium text-gray-800 truncate mt-2'>{g.name}</p>
                                        <p className='text-xs text-gray-500'>
                                            <span className='text-green-700 font-semibold'>Rs {g.price}</span> / {g.unit}
                                        </p>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default AdminDashboard