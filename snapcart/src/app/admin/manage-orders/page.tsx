'use client'
import axios from 'axios'
import { motion, AnimatePresence } from 'motion/react'
import { Package, User, Phone, MapPin, CreditCard, Truck, ChevronDown, ArrowLeft } from 'lucide-react'
import Image from 'next/image'
import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface IOrderItem {
  grocery: string
  name: string
  price: string
  unit: string
  image: string
  quantity: number
}

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
  status: "pending" | "out of delivery" | "delivered"
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

const statusBadge: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  "out of delivery": "bg-blue-100 text-blue-700",
  delivered: "bg-green-100 text-green-700",
}

const deliveryTextColor: Record<string, string> = {
  pending: "text-yellow-600",
  "out of delivery": "text-blue-600",
  delivered: "text-green-600",
}

const ManageOrders = () => {
  const router = useRouter()
  const [orders, setOrders] = useState<IOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const getOrders = async () => {
      try {
        const result = await axios.get('/api/admin/get-orders')
        setOrders(result.data)
      } catch (error) {
        console.log('Failed to fetch orders', error)
      } finally {
        setLoading(false)
      }
    }
    getOrders()
  }, [])

  // Online payment ko order paid nabhayesamma dekhaudaina (payment cancel/fail ho sakchha)
  const validOrders = orders.filter((o) => o.paymentMethod === "cod" || o.isPaid)

  const handleStatusChange = async (orderId: string, status: string) => {
    setUpdatingId(orderId)
    try {
      const result = await axios.post(`/api/admin/update-order-status/${orderId}`, { status })
      setOrders((prev) => prev.map((o) => (o._id === orderId ? { ...o, status: result.data.status } : o)))
    } catch (error) {
      console.log('Failed to update order status', error)
    } finally {
      setUpdatingId(null)
    }
  }

  const toggleExpand = (orderId: string) => {
    setExpandedIds((prev) => ({ ...prev, [orderId]: !prev[orderId] }))
  }

  return (
    <div className='min-h-screen bg-gray-50 w-full py-4 sm:py-6'>
      <div className='w-[94%] sm:w-[92%] lg:w-[90%] max-w-6xl mx-auto'>
        <button
          onClick={() => router.push("/")}
          className='inline-flex items-center gap-2 border-green-400 border-2 px-3 py-1 bg-amber-50 rounded-full text-green-700 hover:text-green-800 font-medium text-sm mb-5'
        >
          <ArrowLeft size={16} />
          Back
        </button>

        <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-5'>
          <h1 className='text-xl sm:text-2xl font-bold text-green-700 text-center sm:text-left'>Manage Orders</h1>
          {!loading && validOrders.length > 0 && (
            <span className='self-center sm:self-auto text-xs font-medium text-green-700 bg-green-100 px-3 py-1 rounded-full'>
              {validOrders.length} {validOrders.length === 1 ? 'order' : 'orders'}
            </span>
          )}
        </div>

        {loading ? (
          <p className='text-center text-gray-500 py-16'>Loading orders...</p>
        ) : validOrders.length === 0 ? (
          <div className='text-center py-20 border border-gray-200 rounded-xl bg-white'>
            <Package className='w-14 h-14 text-gray-300 mx-auto mb-4' />
            <p className='text-gray-700 font-medium'>No orders yet</p>
          </div>
        ) : (
          // Phone/tablet: 1 column, large laptop/PC: 2 columns
          <div className='grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-5 items-start'>
            {validOrders.map((order) => {
              const isExpanded = !!expandedIds[order._id]
              return (
                <motion.div
                  key={order._id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className='bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-5 min-w-0'
                >
                  {/* Top: order id + paid badge + date  |  status badge + dropdown */}
                  <div className='flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3'>
                    <div className='min-w-0'>
                      <div className='flex items-center gap-2 flex-wrap'>
                        <Package className='text-green-600 shrink-0' size={18} />
                        <span className='font-semibold text-gray-800'>Order #{order._id.slice(-6)}</span>
                        <span className={`text-xs px-3 py-0.5 rounded-full font-medium ${order.isPaid ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                          {order.isPaid ? "Paid" : "Unpaid"}
                        </span>
                      </div>
                      <p className='text-xs text-gray-400 mt-1.5'>
                        {new Date(order.createdAt).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>

                    <div className='flex items-center justify-between sm:flex-col sm:items-end gap-2'>
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${statusBadge[order.status]}`}>
                        {order.status}
                      </span>
                      <select
                        value={order.status}
                        disabled={updatingId === order._id}
                        onChange={(e) => handleStatusChange(order._id, e.target.value)}
                        className='text-xs font-medium border border-gray-300 text-gray-700 px-2.5 py-1.5 rounded-md bg-white outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 uppercase'
                      >
                        <option value="pending">Pending</option>
                        <option value="out of delivery">Out for delivery</option>
                        <option value="delivered">Delivered</option>
                      </select>
                    </div>
                  </div>

                  {/* Customer details: 1 column on phone, 2 columns from tablet up */}
                  <div className='mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm text-gray-600'>
                    <div className='flex items-center gap-2 min-w-0'>
                      <User size={14} className='text-green-600 shrink-0' />
                      <span className='truncate'>{order.user?.name || order.address.fullName}</span>
                    </div>
                    <div className='flex items-center gap-2 min-w-0'>
                      <Phone size={14} className='text-green-600 shrink-0' />
                      <span className='truncate'>{order.address.mobile}</span>
                    </div>
                    <div className='flex items-center gap-2 min-w-0'>
                      <CreditCard size={14} className='text-green-600 shrink-0' />
                      {order.paymentMethod === "cod" ? "Cash on Delivery" : "Online Payment"}
                    </div>
                    <div className='flex items-start gap-2 sm:col-span-2'>
                      <MapPin size={14} className='text-green-600 shrink-0 mt-0.5' />
                      <span className='wrap-break-word min-w-0'>
                        {[order.address.fullAddress, order.address.city, order.address.state].filter(Boolean).join(', ')}
                      </span>
                    </div>
                  </div>

                  {/* Collapsible items list */}
                  <button
                    onClick={() => toggleExpand(order._id)}
                    className='flex items-center justify-between w-full mt-4 pt-3 border-t border-gray-100 text-sm text-gray-600 hover:text-gray-800 transition-colors'
                  >
                    <span className='flex items-center gap-2'>
                      <Package size={14} className='text-green-600' />
                      View {order.items.length} {order.items.length === 1 ? 'item' : 'items'}
                    </span>
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
                        <div className='pt-3 space-y-2.5'>
                          {order.items.map((item, idx) => (
                            <div key={idx} className='flex items-center gap-3 text-sm'>
                              <div className='relative w-10 h-10 rounded-md overflow-hidden bg-gray-50 border border-gray-100 shrink-0'>
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
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Footer */}
                  <div className='flex flex-wrap items-center justify-between gap-2 mt-3 pt-3 border-t border-gray-100 text-sm'>
                    <span className='flex items-center gap-1.5'>
                      <Truck size={14} className={deliveryTextColor[order.status]} />
                      Delivery: <span className={`font-medium capitalize ${deliveryTextColor[order.status]}`}>{order.status}</span>
                    </span>
                    <span className='font-semibold text-gray-800'>Total: Rs {order.totalAmount}</span>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default ManageOrders