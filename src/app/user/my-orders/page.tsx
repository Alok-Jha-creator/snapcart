'use client'
import React, { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { ArrowLeft, Package, Truck, CheckCircle2, RotateCcw, MapPinned } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { RootState } from '@/redux/store'
import { useSelector } from 'react-redux'
import axios from 'axios'
import Image from 'next/image'

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
    items: IOrderItem[]
    totalAmount: number
    paymentMethod: "cod" | "online"
    isPaid: boolean
    status: "pending" | "out of delivery" | "delivered"
    address: {
        fullName: string
        fullAddress: string
        city: string
        state: string
    }
    createdAt: string
}

// Amazon/Flipkart-style step progress, driven by order.status
const STEPS = ["pending", "out of delivery", "delivered"] as const
const STEP_LABELS: Record<typeof STEPS[number], string> = {
    pending: "Order confirmed",
    "out of delivery": "Out for delivery",
    delivered: "Delivered",
}

const MyOrders = () => {
    const router = useRouter()
    const { userData } = useSelector((state: RootState) => state.user)
    const [orders, setOrders] = useState<IOrder[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchOrders = async () => {
            if (!userData?._id) return
            try {
                const result = await axios.get(`/api/user/my-orders?userId=${userData._id}`)
                setOrders(result.data)
            } catch (error) {
                console.log('Error fetching orders:', error)
            } finally {
                setLoading(false)
            }
        }
        fetchOrders()
    }, [userData])

    return (
        <div className='w-[94%] sm:w-[90%] md:w-[80%] mx-auto py-10'>
            <div className='flex items-center justify-between mb-8'>
                <button
                    onClick={() => router.push("/")}
                    className='flex items-center gap-2 text-green-700 hover:text-green-800 font-medium text-sm'
                >
                    <ArrowLeft size={16} />
                    Back to Home
                </button>
                <h1 className='text-xl sm:text-2xl font-bold text-gray-900'>Your Orders</h1>
                <div className='w-24' />
            </div>

            {loading ? (
                <p className='text-center text-gray-500 py-16'>Loading your orders...</p>
            ) : orders.length === 0 ? (
                <div className='text-center py-20 border border-gray-200 rounded-lg bg-white'>
                    <Package className='w-14 h-14 text-gray-300 mx-auto mb-4' />
                    <p className='text-gray-700 font-medium'>No orders yet</p>
                    <p className='text-gray-500 text-sm mt-1'>Items you order will show up here.</p>
                </div>
            ) : (
                <div className='space-y-5'>
                    {orders.map((order) => {
                        const stepIndex = STEPS.indexOf(order.status)
                        return (
                            <motion.div
                                key={order._id}
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.25 }}
                                className='border border-gray-200 rounded-lg bg-white overflow-hidden'
                            >
                                
                                <div className='bg-gray-50 border-b border-gray-200 px-5 py-3 flex flex-wrap items-center justify-between gap-y-2 gap-x-8 text-sm'>
                                    <div className='flex flex-wrap gap-x-8 gap-y-2'>
                                        <div>
                                            <p className='text-gray-500 text-xs'>Order placed</p>
                                            <p className='text-gray-900 font-medium'>
                                                {new Date(order.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                                            </p>
                                        </div>
                                        <div>
                                            <p className='text-gray-500 text-xs'>Total</p>
                                            <p className='text-green-600 font-medium'>Rs {order.totalAmount}</p>
                                        </div>
                                        <div>
                                            <p className='text-gray-500 text-xs'>Ship to</p>
                                            <p className='text-gray-900 font-medium'>{order.address.fullName}</p>
                                        </div>
                                    </div>
                                    <p className='text-gray-500 text-xs'>
                                        Order # <span className='text-gray-700'>{order._id.slice(-10).toUpperCase()}</span>
                                    </p>
                                </div>

                                {/* Body */}
                                <div className='p-5'>
                                    {/* Delivery progress */}
                                    <div className='flex items-center mb-6 px-1'>
                                        {STEPS.map((step, i) => (
                                            <React.Fragment key={step}>
                                                <div className='flex flex-col items-center gap-1.5'>
                                                    <div
                                                        className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                                                            i <= stepIndex ? "bg-green-600" : "bg-gray-200"
                                                        }`}
                                                    >
                                                        {i < stepIndex ? (
                                                            <CheckCircle2 size={14} className='text-white' />
                                                        ) : i === stepIndex ? (
                                                            step === "delivered" ? (
                                                                <CheckCircle2 size={14} className='text-white' />
                                                            ) : (
                                                                <Truck size={13} className='text-white' />
                                                            )
                                                        ) : null}
                                                    </div>
                                                    <span className={`text-[11px] text-center w-20 ${i <= stepIndex ? "text-gray-800 font-medium" : "text-gray-400"}`}>
                                                        {STEP_LABELS[step]}
                                                    </span>
                                                </div>
                                                {i < STEPS.length - 1 && (
                                                    <div className={`flex-1 h-0.5 mb-5 ${i < stepIndex ? "bg-green-600" : "bg-gray-200"}`} />
                                                )}
                                            </React.Fragment>
                                        ))}
                                    </div>

                                    {/* Items */}
                                    <div className='divide-y divide-gray-100'>
                                        {order.items.map((item, idx) => (
                                            <div key={idx} className='flex items-center gap-4 py-3 first:pt-0 last:pb-0'>
                                                <div className='relative w-16 h-16 rounded-md overflow-hidden bg-gray-50 border border-gray-100 shrink-0'>
                                                    <Image src={item.image} alt={item.name} fill sizes='64px' className='object-contain p-1.5' />
                                                </div>
                                                <div className='flex-1 min-w-0'>
                                                    <p className='text-sm font-medium text-gray-900 truncate'>{item.name}</p>
                                                    <p className='text-xs text-gray-500 mt-0.5'>{item.quantity} {item.unit} • Rs {item.price} each</p>
                                                </div>
                                                <p className='text-sm font-semibold text-gray-900 shrink-0'>
                                                    Rs {Number(item.price) * item.quantity}
                                                </p>
                                            </div>
                                        ))}
                                    </div>

                                    <div className='flex flex-wrap items-center justify-between gap-3 mt-4 pt-4 border-t border-gray-300'>
                                        <div className='flex items-center gap-1.5 text-xs font-bold text-gray-900'>
                                            <MapPinned size={14} className='text-gray-400' />
                                            {order.address.city}, {order.address.state}
                                            <span className='text-yellow-800 mx-2'>•  {order.paymentMethod === "cod" ? "Cash on delivery" : order.isPaid ? "Paid online" : "Payment pending"}</span>
                                           
                                        </div>
                                        <div className='flex gap-2'>
                                            <button className='flex items-center gap-1.5 text-xs font-medium border border-gray-300 text-gray-700 px-3 py-1.5 rounded-md hover:bg-gray-50 transition-colors'>
                                                <RotateCcw size={13} />
                                                Buy again
                                            </button>
                                            <button className='text-xs font-medium border border-green-600 text-green-700 px-3 py-1.5 rounded-md hover:bg-green-50 transition-colors'>
                                                Track order
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

export default MyOrders