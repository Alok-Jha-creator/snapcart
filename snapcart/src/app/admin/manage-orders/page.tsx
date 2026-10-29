'use client'
import axios from 'axios'
import { motion, AnimatePresence } from 'motion/react'
import {
  AlertCircle, ChevronDown, ChevronLeft, ChevronRight, CreditCard, Mail, MapPin, Package,
  Phone, SearchX, Truck, User, Wallet, X,
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import React, { useEffect, useMemo, useState } from 'react'
import AdminShell from '@/components/AdminShell'

interface IOrderItem {
  grocery: string
  name: string
  price: string
  unit: string
  image: string
  quantity: number
}

type Status = "pending" | "out of delivery" | "delivered"

interface IOrder {
  _id: string
  user: {
    _id: string
    name: string
    email: string
    mobile: string
  }
  items: IOrderItem[]
  totalAmount: number
  paymentMethod: "cod" | "online"
  isPaid: boolean
  status: Status
  address: {
    fullName: string
    mobile: string
    fullAddress: string
    city: string
    state: string
    pincode: string
  }
  createdAt: string
}

type Filter = "all" | Status

const PAGE_SIZE = 8

const statusLabel: Record<Status, string> = {
  pending: "Pending",
  "out of delivery": "Out for delivery",
  delivered: "Delivered",
}

// colours for the status dropdown (it also works as the status badge)
const statusSelect: Record<Status, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-200 focus:ring-amber-300",
  "out of delivery": "bg-blue-50 text-blue-700 border-blue-200 focus:ring-blue-300",
  delivered: "bg-green-50 text-green-700 border-green-200 focus:ring-green-300",
}

const statusDot: Record<Status, string> = {
  pending: "bg-amber-400",
  "out of delivery": "bg-blue-500",
  delivered: "bg-green-500",
}

const formatDateTime = (d: string) =>
  new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

/* ------------------------------ small pieces ------------------------------ */

const StatusSelect = ({
  order, disabled, onChange,
}: { order: IOrder; disabled: boolean; onChange: (status: Status) => void }) => (
  <select
    value={order.status}
    disabled={disabled}
    onChange={(e) => onChange(e.target.value as Status)}
    aria-label={`Status of order ${order._id.slice(-6)}`}
    onClick={(e) => e.stopPropagation()}
    className={`text-xs font-semibold border rounded-full px-3 py-1.5 outline-none focus:ring-2 disabled:opacity-50 cursor-pointer ${statusSelect[order.status]}`}
  >
    <option value="pending">Pending</option>
    <option value="out of delivery">Out for delivery</option>
    <option value="delivered">Delivered</option>
  </select>
)

const PaymentInfo = ({ order }: { order: IOrder }) => (
  <div className='flex flex-col gap-1'>
    <span className='flex items-center gap-1.5 text-sm text-gray-700'>
      {order.paymentMethod === "cod" ? <Wallet size={14} className='text-gray-400' /> : <CreditCard size={14} className='text-gray-400' />}
      {order.paymentMethod === "cod" ? "Cash on Delivery" : "Online Payment"}
    </span>
    <span className={`w-fit text-[11px] font-medium px-2.5 py-0.5 rounded-full ${order.isPaid ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
      {order.isPaid ? "Paid" : "Unpaid"}
    </span>
  </div>
)

const OrderDetails = ({ order }: { order: IOrder }) => {
  const address = [order.address.fullAddress, order.address.city, order.address.state, order.address.pincode].filter(Boolean).join(', ')
  return (
    <div className='grid grid-cols-1 lg:grid-cols-2 gap-5 bg-gray-50/70 rounded-xl p-4'>
      <div className='space-y-2.5 text-sm text-gray-600 min-w-0'>
        <p className='text-xs font-semibold text-[#0b5c3b]'>Delivery details</p>
        <p className='flex items-center gap-2'><User size={14} className='text-green-600 shrink-0' /><span className='truncate'>{order.address.fullName}</span></p>
        <p className='flex items-center gap-2'><Phone size={14} className='text-green-600 shrink-0' />{order.address.mobile}</p>
        {order.user?.email && (
          <p className='flex items-center gap-2 min-w-0'><Mail size={14} className='text-green-600 shrink-0' /><span className='truncate'>{order.user.email}</span></p>
        )}
        <p className='flex items-start gap-2'><MapPin size={14} className='text-green-600 shrink-0 mt-0.5' /><span className='wrap-break-word min-w-0'>{address}</span></p>
      </div>

      <div className='min-w-0'>
        <p className='text-xs font-semibold text-[#0b5c3b] mb-2.5'>
          {order.items.length} {order.items.length === 1 ? 'item' : 'items'}
        </p>
        <div className='space-y-2.5'>
          {order.items.map((item, idx) => (
            <div key={idx} className='flex items-center gap-3 text-sm'>
              <div className='relative w-10 h-10 rounded-lg overflow-hidden bg-white border border-gray-100 shrink-0'>
                <Image src={item.image} alt={item.name} fill sizes='40px' className='object-contain p-1' />
              </div>
              <div className='flex-1 min-w-0'>
                <p className='text-gray-800 truncate'>{item.name}</p>
                <p className='text-xs text-gray-400'>{item.quantity} {item.unit} × Rs {item.price}</p>
              </div>
              <p className='font-medium text-gray-700 shrink-0'>Rs {Number(item.price) * item.quantity}</p>
            </div>
          ))}
        </div>
        <div className='flex items-center justify-between mt-3 pt-3 border-t border-gray-200 text-sm'>
          <span className='flex items-center gap-1.5 text-gray-600'>
            <Truck size={14} className='text-green-600' /> {statusLabel[order.status]}
          </span>
          <span className='font-semibold text-gray-800'>Total: Rs {order.totalAmount}</span>
        </div>
      </div>
    </div>
  )
}

/* -------------------------------- component ------------------------------- */

const ManageOrders = () => {
  const [orders, setOrders] = useState<IOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({})
  const [filter, setFilter] = useState<Filter>("all")
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [error, setError] = useState("")

  useEffect(() => {
    const getOrders = async () => {
      try {
        const result = await axios.get('/api/admin/get-orders')
        setOrders(result.data)
      } catch (err) {
        console.log('Failed to fetch orders', err)
        setError("Could not load orders. Please refresh the page.")
      } finally {
        setLoading(false)
      }
    }
    getOrders()
  }, [])

  useEffect(() => {
    setPage(1)
  }, [filter, search])

  // Online payment orders are hidden until they are paid (the payment can be cancelled or fail)
  const validOrders = useMemo(
    () =>
      orders
        .filter((o) => o.paymentMethod === "cod" || o.isPaid)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [orders]
  )

  const counts = useMemo(() => ({
    all: validOrders.length,
    pending: validOrders.filter((o) => o.status === "pending").length,
    "out of delivery": validOrders.filter((o) => o.status === "out of delivery").length,
    delivered: validOrders.filter((o) => o.status === "delivered").length,
  }), [validOrders])

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return validOrders.filter((o) =>
      (filter === "all" || o.status === filter) &&
      (q === "" ||
        [o._id.slice(-6), o.user?.name, o.address.fullName, o.address.mobile, o.address.city]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q)))
    )
  }, [validOrders, filter, search])

  const totalPages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageItems = visible.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)
  const from = visible.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1
  const to = Math.min(safePage * PAGE_SIZE, visible.length)

  const handleStatusChange = async (orderId: string, status: Status) => {
    setUpdatingId(orderId)
    setError("")
    try {
      const result = await axios.post(`/api/admin/update-order-status/${orderId}`, { status })
      setOrders((prev) => prev.map((o) => (o._id === orderId ? { ...o, status: result.data.status } : o)))
    } catch (err) {
      console.log('Failed to update order status', err)
      setError("Could not update the order status. Please try again.")
    } finally {
      setUpdatingId(null)
    }
  }

  const toggleExpand = (orderId: string) => {
    setExpandedIds((prev) => ({ ...prev, [orderId]: !prev[orderId] }))
  }

  const tabs: { key: Filter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "pending", label: "Pending" },
    { key: "out of delivery", label: "Out for delivery" },
    { key: "delivered", label: "Delivered" },
  ]

  return (
    <AdminShell
      pendingCount={counts.pending}
      search={{ value: search, onChange: setSearch, placeholder: 'Search by order, customer, mobile or city...' }}
    >
      {/* title + breadcrumb */}
      <div className='flex flex-wrap items-center justify-between gap-3 mb-6'>
        <h1 className='text-3xl font-bold text-[#0b5c3b]'>Manage Orders</h1>
        <nav aria-label='Breadcrumb' className='flex items-center gap-1.5 text-sm text-gray-500'>
          <Link href='/' className='hover:text-green-700'>Dashboard</Link>
          <ChevronRight size={14} />
          <span>Orders</span>
          <ChevronRight size={14} />
          <span className='text-gray-800 font-medium'>Manage Orders</span>
        </nav>
      </div>

      {error && (
        <div role='alert' className='mb-5 flex items-start gap-2.5 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600'>
          <AlertCircle size={18} className='mt-0.5 shrink-0' />
          <p className='flex-1'>{error}</p>
          <button onClick={() => setError("")} aria-label='Dismiss' className='text-red-400 hover:text-red-600'><X size={16} /></button>
        </div>
      )}

      <section className='bg-white rounded-2xl border border-gray-100 shadow-sm'>
        <div className='px-5 py-4'>
          <h2 className='text-lg font-semibold text-[#0b5c3b]'>All orders</h2>
          <p className='text-xs text-gray-500 mt-0.5'>Update the delivery status as each order moves along.</p>
        </div>

        {/* status tabs */}
        <div className='flex gap-2 overflow-x-auto px-5 pb-4'>
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setFilter(t.key)}
              className={`shrink-0 text-xs font-medium px-3.5 py-1.5 rounded-full border transition-colors ${
                filter === t.key
                  ? 'bg-green-600 border-green-600 text-white'
                  : 'bg-white border-gray-200 text-gray-600 hover:bg-green-50 hover:border-green-200'
              }`}
            >
              {t.label} <span className={filter === t.key ? 'text-green-100' : 'text-gray-400'}>({counts[t.key]})</span>
            </button>
          ))}
        </div>

        {loading ? (
          <div className='border-t border-gray-100 divide-y divide-gray-100'>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className='flex items-center gap-4 px-5 py-4'>
                <div className='w-11 h-11 rounded-full bg-gray-100 animate-pulse' />
                <div className='flex-1 space-y-2'>
                  <div className='h-4 w-40 bg-gray-100 rounded animate-pulse' />
                  <div className='h-3 w-56 bg-gray-100 rounded animate-pulse' />
                </div>
              </div>
            ))}
          </div>
        ) : validOrders.length === 0 ? (
          <div className='border-t border-gray-100 text-center py-16 px-4'>
            <Package className='w-14 h-14 text-gray-300 mx-auto mb-4' />
            <p className='text-gray-800 font-medium'>No orders yet</p>
            <p className='text-gray-500 text-sm mt-1'>New orders will show up here.</p>
          </div>
        ) : visible.length === 0 ? (
          <div className='border-t border-gray-100 text-center py-16 px-4'>
            <SearchX className='w-14 h-14 text-gray-300 mx-auto mb-4' />
            <p className='text-gray-800 font-medium'>No orders match your search</p>
            <button onClick={() => { setFilter("all"); setSearch("") }} className='mt-3 text-green-700 hover:text-green-800 text-sm font-medium'>
              Clear filters
            </button>
          </div>
        ) : (
          <>
            {/* tablet and desktop: table */}
            <div className='hidden md:block overflow-x-auto border-t border-gray-100'>
              <table className='w-full text-sm'>
                <thead className='bg-gray-50/70 text-left text-xs text-gray-500'>
                  <tr>
                    <th className='px-5 py-3 font-medium'>Order</th>
                    <th className='px-3 py-3 font-medium'>Customer</th>
                    <th className='px-3 py-3 font-medium'>Payment</th>
                    <th className='px-3 py-3 font-medium'>Total</th>
                    <th className='px-3 py-3 font-medium'>Status</th>
                    <th className='px-5 py-3 font-medium text-right'>Details</th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-gray-100'>
                  {pageItems.map((order) => {
                    const isExpanded = !!expandedIds[order._id]
                    return (
                      <React.Fragment key={order._id}>
                        <tr className='hover:bg-gray-50/70 transition-colors'>
                          <td className='px-5 py-3'>
                            <div className='flex items-center gap-3'>
                              <span className='w-10 h-10 rounded-full bg-green-100 text-green-700 flex items-center justify-center shrink-0'>
                                <Package size={18} />
                              </span>
                              <div>
                                <p className='font-semibold text-gray-800'>Order #{order._id.slice(-6)}</p>
                                <p className='text-xs text-gray-400 whitespace-nowrap'>{formatDateTime(order.createdAt)}</p>
                              </div>
                            </div>
                          </td>
                          <td className='px-3 py-3'>
                            <p className='font-medium text-gray-800 truncate max-w-40'>{order.user?.name || order.address.fullName}</p>
                            <p className='text-xs text-gray-500'>{order.address.mobile}</p>
                          </td>
                          <td className='px-3 py-3'><PaymentInfo order={order} /></td>
                          <td className='px-3 py-3 whitespace-nowrap font-semibold text-gray-800'>Rs {order.totalAmount}</td>
                          <td className='px-3 py-3'>
                            <StatusSelect order={order} disabled={updatingId === order._id} onChange={(s) => handleStatusChange(order._id, s)} />
                          </td>
                          <td className='px-5 py-3'>
                            <div className='flex justify-end'>
                              <button
                                onClick={() => toggleExpand(order._id)}
                                aria-expanded={isExpanded}
                                aria-label={isExpanded ? 'Hide order details' : 'Show order details'}
                                className='w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50'
                              >
                                <motion.span animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
                                  <ChevronDown size={16} />
                                </motion.span>
                              </button>
                            </div>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr>
                            <td colSpan={6} className='px-5 pb-4 pt-0'>
                              <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
                                <OrderDetails order={order} />
                              </motion.div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* phones: cards */}
            <div className='md:hidden border-t border-gray-100 divide-y divide-gray-100'>
              {pageItems.map((order) => {
                const isExpanded = !!expandedIds[order._id]
                return (
                  <div key={order._id} className='p-4'>
                    <div className='flex items-start justify-between gap-3'>
                      <div className='flex items-center gap-3 min-w-0'>
                        <span className='w-10 h-10 rounded-full bg-green-100 text-green-700 flex items-center justify-center shrink-0'>
                          <Package size={18} />
                        </span>
                        <div className='min-w-0'>
                          <p className='font-semibold text-gray-800'>Order #{order._id.slice(-6)}</p>
                          <p className='text-xs text-gray-400'>{formatDateTime(order.createdAt)}</p>
                        </div>
                      </div>
                      <span className={`w-2.5 h-2.5 rounded-full mt-2 shrink-0 ${statusDot[order.status]}`} aria-hidden />
                    </div>

                    <div className='mt-3 flex items-center justify-between gap-3'>
                      <div className='min-w-0'>
                        <p className='font-medium text-gray-800 truncate'>{order.user?.name || order.address.fullName}</p>
                        <p className='text-xs text-gray-500'>{order.address.mobile}</p>
                      </div>
                      <p className='font-semibold text-gray-800 shrink-0'>Rs {order.totalAmount}</p>
                    </div>

                    <div className='mt-3 flex items-center justify-between gap-3'>
                      <PaymentInfo order={order} />
                      <StatusSelect order={order} disabled={updatingId === order._id} onChange={(s) => handleStatusChange(order._id, s)} />
                    </div>

                    <button
                      onClick={() => toggleExpand(order._id)}
                      aria-expanded={isExpanded}
                      className='flex items-center justify-between w-full mt-3 pt-3 border-t border-gray-100 text-sm text-gray-600'
                    >
                      <span>View {order.items.length} {order.items.length === 1 ? 'item' : 'items'} and address</span>
                      <motion.span animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
                        <ChevronDown size={16} />
                      </motion.span>
                    </button>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className='overflow-hidden'
                        >
                          <div className='pt-3'>
                            <OrderDetails order={order} />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )
              })}
            </div>

            {/* footer: count + pagination */}
            <div className='flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 px-5 py-3'>
              <p className='text-xs text-gray-500'>Showing {from}-{to} of {visible.length}</p>
              {totalPages > 1 && (
                <div className='flex items-center gap-2'>
                  <button
                    onClick={() => setPage(safePage - 1)}
                    disabled={safePage === 1}
                    aria-label='Previous page'
                    className='w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-transparent'
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className='text-sm text-gray-600 px-1'>Page {safePage} of {totalPages}</span>
                  <button
                    onClick={() => setPage(safePage + 1)}
                    disabled={safePage === totalPages}
                    aria-label='Next page'
                    className='w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-transparent'
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </section>
    </AdminShell>
  )
}

export default ManageOrders