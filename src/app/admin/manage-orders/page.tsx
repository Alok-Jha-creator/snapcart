'use client'
import axios from 'axios'
import { motion, AnimatePresence } from 'motion/react'
import { Package, User, Phone, MapPin, CreditCard, Truck, ChevronDown, ArrowLeft } from 'lucide-react'
import Image from 'next/image'
import React, { useEffect, useState } from 'react'
import { Router } from 'next/router'
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

  const handleStatusChange = async (orderId: string, status: string) => {
    setUpdatingId(orderId)
    try {
      const result = await axios.patch('/api/admin/update-order-status', { orderId, status })
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
    <div className='min-h-screen bg-gray-50 w-full py-10'>
      <div className='w-[94%] sm:w-[90%] md:w-[70%] mx-auto'>
        <button
          onClick={() => router.push("/")}
          className='flex items-center gap-2 text-green-700 hover:text-green-800 font-medium text-sm mb-6'
        >
          <ArrowLeft size={16} />
          Back
        </button>
        <h1 className='text-xl sm:text-2xl font-bold text-green-700 text-center mb-8'>Manage Orders</h1>

        {loading ? (
          <p className='text-center text-gray-500 py-16'>Loading orders...</p>
        ) : orders.length === 0 ? (
          <div className='text-center py-20 border border-gray-200 rounded-xl bg-white'>
            <Package className='w-14 h-14 text-gray-300 mx-auto mb-4' />
            <p className='text-gray-700 font-medium'>No orders yet</p>
          </div>
        ) : (
          <div className='space-y-5'>
            {orders.map((order) => {
              const isExpanded = !!expandedIds[order._id]
              return (
                <motion.div
                  key={order._id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className='bg-white rounded-xl shadow-sm border border-gray-100 p-5'
                >
                  {/* Top: order id, paid badge, date  —  status badge + dropdown */}
                  <div className='flex items-start justify-between gap-3'>
                    <div>
                      <div className='flex items-center gap-2'>
                        <Package className='text-green-600' size={18} />
                        <span className='font-semibold text-gray-800'>Order #{order._id.slice(-6)}</span>
                      </div>
                      <span className={`inline-block mt-1.5 text-xs px-2 py-0.5 rounded-full font-medium ${order.isPaid ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                        {order.isPaid ? "Paid" : "Unpaid"}
                      </span>
                      <p className='text-xs text-gray-400 mt-1.5'>
                        {new Date(order.createdAt).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <div className='flex flex-col items-end gap-2'>
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

                  {/* Customer + address + payment info */}
                  <div className='mt-3 space-y-1.5 text-sm text-gray-600'>
                    <div className='flex items-center gap-2'>
                      <User size={14} className='text-green-600' />
                      {order.user?.name || order.address.fullName}
                    </div>
                    <div className='flex items-center gap-2'>
                      <Phone size={14} className='text-green-600' />
                      {order.address.mobile}
                    </div>
                    <div className='flex items-center gap-2'>
                      <MapPin size={14} className='text-green-600 shrink-0' />
                      {order.address.fullAddress}, {order.address.city}, {order.address.state}
                    </div>
                    <div className='flex items-center gap-2'>
                      <CreditCard size={14} className='text-green-600' />
                      {order.paymentMethod === "cod" ? "Cash on Delivery" : "Online Payment"}
                    </div>
                  </div>

                  {/* Collapsible items list */}
                  <button
                    onClick={() => toggleExpand(order._id)}
                    className='flex items-center justify-between w-full mt-3 pt-3 border-t border-gray-100 text-sm text-gray-600 hover:text-gray-800 transition-colors'
                  >
                    <span className='flex items-center gap-2'>
                      <Package size={14} className='text-green-600' />
                      view {order.items.length} items
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
                              <p className='font-medium text-gray-700'>Rs {Number(item.price) * item.quantity}</p>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Footer */}
                  <div className='flex items-center justify-between mt-3 pt-3 border-t border-gray-100 text-sm'>
                    <span className='flex items-center gap-1.5'>
                      <Truck size={14} className={deliveryTextColor[order.status]} />
                      Delivery: <span className={`font-medium ${deliveryTextColor[order.status]}`}>{order.status}</span>
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