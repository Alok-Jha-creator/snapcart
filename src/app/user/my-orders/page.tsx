'use client'
import React, { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { ArrowLeft, Package, MapPin, CreditCard, Truck } from 'lucide-react'
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

const statusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-700",
    "out of delivery": "bg-blue-100 text-blue-700",
    delivered: "bg-green-100 text-green-700",
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
        <div className='w-[92%] sm:w-[90%] md:w-[80%] mx-auto py-10 relative'>
            <motion.button
                whileTap={{ scale: 0.97 }}
                className='absolute left-0 top-2 flex items-center gap-2 text-green-700 hover:text-green-800 font-semibold'
                onClick={() => router.push("/")}
            >
                <ArrowLeft size={16} />
                <span>Back to Home</span>
            </motion.button>

            <motion.h1
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className='text-3xl md:text-4xl font-bold text-green-700 text-center mb-10'
            >
                📦 My Orders
            </motion.h1>

            {loading ? (
                <p className='text-center text-gray-500'>Loading orders...</p>
            ) : orders.length === 0 ? (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className='text-center py-20 bg-white rounded-2xl shadow-md'
                >
                    <Package className='w-16 h-16 text-gray-400 mx-auto mb-4' />
                    <p className='text-gray-600 text-lg'>You haven't placed any orders yet.</p>
                </motion.div>
            ) : (
                <div className='space-y-6'>
                    {orders.map((order) => (
                        <motion.div
                            key={order._id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3 }}
                            className='bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 p-6 border border-gray-100'
                        >
                            <div className='flex flex-wrap items-center justify-between gap-3 mb-4 pb-4 border-b border-gray-100'>
                                <div>
                                    <p className='text-xs text-gray-500'>Order ID</p>
                                    <p className='font-semibold text-gray-800 text-sm'>#{order._id.slice(-8).toUpperCase()}</p>
                                </div>
                                <div>
                                    <p className='text-xs text-gray-500'>Placed on</p>
                                    <p className='font-semibold text-gray-800 text-sm'>
                                        {new Date(order.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </p>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${statusColors[order.status]}`}>
                                    {order.status}
                                </span>
                            </div>

                            <div className='space-y-3 mb-4'>
                                {order.items.map((item, idx) => (
                                    <div key={idx} className='flex items-center gap-3'>
                                        <div className='relative w-14 h-14 rounded-lg overflow-hidden bg-gray-50 border border-gray-100 shrink-0'>
                                            <Image src={item.image} alt={item.name} fill className='object-contain p-1' />
                                        </div>
                                        <div className='flex-1'>
                                            <p className='text-sm font-medium text-gray-800'>{item.name}</p>
                                            <p className='text-xs text-gray-500'>{item.quantity} x {item.unit} — Rs {item.price}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className='flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-gray-100 text-sm'>
                                <div className='flex items-center gap-2 text-gray-600'>
                                    <MapPin size={16} className='text-green-600' />
                                    <span>{order.address.city}, {order.address.state}</span>
                                </div>
                                <div className='flex items-center gap-2 text-gray-600'>
                                    {order.paymentMethod === "cod" ? (
                                        <Truck size={16} className='text-yellow-600' />
                                    ) : (
                                        <CreditCard size={16} className='text-green-600' />
                                    )}
                                    <span>{order.paymentMethod === "cod" ? "Cash on Delivery" : order.isPaid ? "Paid Online" : "Payment Pending"}</span>
                                </div>
                                <p className='font-bold text-green-700'>Rs {order.totalAmount}</p>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    )
}

export default MyOrders