'use client'
import React, { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { ArrowLeft, Minus, Plus, ShoppingCart, Zap, PackageX } from 'lucide-react'
import { useParams, useRouter } from 'next/navigation'
import { useDispatch, useSelector } from 'react-redux'
import axios from 'axios'
import Image from 'next/image'
import type mongoose from 'mongoose'
import { AppDispatch, RootState } from '@/redux/store'
import { addToCart, decreaseQuantity, increaseQuantity } from '@/redux/cartSlice'

interface IGrocery {
    _id: mongoose.Types.ObjectId,
    name: string,
    category: string,
    price: string,
    unit: string,
    image: string,
    description?: string
}

const GroceryDetail = () => {
    const { id } = useParams<{ id: string }>()
    const router = useRouter()
    const dispatch = useDispatch<AppDispatch>()
    const { cartData } = useSelector((state: RootState) => state.cart)
    const [item, setItem] = useState<IGrocery | null>(null)
    const [loading, setLoading] = useState(true)
    const [qty, setQty] = useState(1)

    useEffect(() => {
        const getGrocery = async () => {
            try {
                const result = await axios.get(`/api/grocery/${id}`)
                setItem(result.data)
            } catch (error) {
                console.log('Error fetching grocery:', error)
            } finally {
                setLoading(false)
            }
        }
        if (id) getGrocery()
    }, [id])

    // If the item is already in the cart, the stepper edits the cart directly
    const cartItem = item ? cartData.find((i) => String(i._id) === String(item._id)) : undefined
    const shownQty = cartItem ? cartItem.quantity : qty

    const handleMinus = () => {
        if (!item) return
        if (cartItem) dispatch(decreaseQuantity(item._id))
        else setQty((q) => Math.max(1, q - 1))
    }

    const handlePlus = () => {
        if (!item) return
        if (cartItem) dispatch(increaseQuantity(item._id))
        else setQty((q) => q + 1)
    }

    const handleAddToCart = () => {
        if (!item) return
        dispatch(addToCart({ ...item, quantity: qty }))
    }

    const handleBuyNow = () => {
        if (!item) return
        if (!cartItem) dispatch(addToCart({ ...item, quantity: qty }))
        router.push("/user/checkout")
    }

    if (loading) {
        return <p className='text-center text-gray-500 py-24'>Loading product...</p>
    }

    if (!item) {
        return (
            <div className='text-center py-24'>
                <PackageX className='w-14 h-14 text-gray-300 mx-auto mb-4' />
                <p className='text-gray-700 font-medium'>Product not found</p>
                <button onClick={() => router.push("/")} className='mt-4 text-green-700 font-medium text-sm hover:text-green-800'>
                    Back to Home
                </button>
            </div>
        )
    }

    return (
        <div className='w-[94%] sm:w-[90%] md:w-[80%] mx-auto py-10'>
            <button
                onClick={() => router.back()}
                className='flex items-center gap-2 text-green-700 hover:text-green-800 font-medium text-sm mb-6'
            >
                <ArrowLeft size={16} />
                Back
            </button>

            <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className='bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden grid md:grid-cols-2'
            >
                {/* Image */}
                <div className='relative w-full aspect-square md:aspect-auto md:min-h-105 bg-gray-50'>
                    <Image
                        src={item.image}
                        alt={item.name}
                        fill
                        sizes='(max-width:768px) 100vw, 40vw'
                        className='object-contain p-8'
                    />
                </div>

                {/* Info */}
                <div className='p-6 md:p-8 flex flex-col'>
                    <p className='text-xs text-gray-500 font-medium'>{item.category}</p>
                    <h1 className='text-2xl md:text-3xl font-bold text-gray-800 mt-1'>{item.name}</h1>

                    <div className='flex items-end gap-3 mt-4'>
                        <span className='text-3xl font-bold text-green-700'>Rs {item.price}</span>
                        <span className='text-sm text-gray-500 mb-1'>per {item.unit}</span>
                    </div>

                    <hr className='my-5 border-gray-100' />

                    {/* Quantity */}
                    <div className='flex items-center gap-4'>
                        <span className='text-sm text-gray-500'>Quantity</span>
                        <div className='flex items-center gap-4 bg-green-50 border border-green-200 rounded-full px-3 py-1.5'>
                            <button
                                onClick={handleMinus}
                                className='w-7 h-7 flex items-center justify-center rounded-full bg-green-100 hover:bg-green-200 transition-all'
                            >
                                <Minus size={16} className='text-green-700' />
                            </button>
                            <span className='text-sm font-semibold text-gray-800 w-6 text-center'>{shownQty}</span>
                            <button
                                onClick={handlePlus}
                                className='w-7 h-7 flex items-center justify-center rounded-full bg-green-100 hover:bg-green-200 transition-all'
                            >
                                <Plus size={16} className='text-green-700' />
                            </button>
                        </div>
                        <span className='text-sm text-gray-500'>
                            Total: <span className='font-semibold text-gray-800'>Rs {Number(item.price) * shownQty}</span>
                        </span>
                    </div>

                    {/* Actions */}
                    <div className='flex flex-col sm:flex-row gap-3 mt-6'>
                        {cartItem ? (
                            <motion.button
                                whileTap={{ scale: 0.97 }}
                                onClick={() => router.push("/user/cart")}
                                className='flex-1 flex items-center justify-center gap-2 border border-green-600 text-green-700 hover:bg-green-50 py-3 rounded-full text-sm font-semibold transition-all'
                            >
                                <ShoppingCart size={18} />
                                Go to Cart
                            </motion.button>
                        ) : (
                            <motion.button
                                whileTap={{ scale: 0.97 }}
                                onClick={handleAddToCart}
                                className='flex-1 flex items-center justify-center gap-2 border border-green-600 text-green-700 hover:bg-green-50 py-3 rounded-full text-sm font-semibold transition-all'
                            >
                                <ShoppingCart size={18} />
                                Add to Cart
                            </motion.button>
                        )}
                        <motion.button
                            whileTap={{ scale: 0.97 }}
                            onClick={handleBuyNow}
                            className='flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white py-3 rounded-full text-sm font-semibold transition-all'
                        >
                            <Zap size={18} />
                            Buy Now
                        </motion.button>
                    </div>
                </div>
            </motion.div>

            {/* Details / description */}
            <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
                className='bg-white rounded-2xl border border-gray-100 shadow-sm mt-6'
            >
                <h2 className='text-lg font-semibold text-gray-800 px-6 py-4 border-b border-gray-100'>Product details</h2>
                <div className='p-6 space-y-5'>
                    {item.description && (
                        <p className='text-sm text-gray-600 leading-relaxed whitespace-pre-line'>{item.description}</p>
                    )}
                    <div className='grid grid-cols-[110px_1fr] gap-y-2 text-sm'>
                        <span className='text-gray-500'>Category</span>
                        <span className='text-gray-800'>{item.category}</span>
                        <span className='text-gray-500'>Unit</span>
                        <span className='text-gray-800'>{item.unit}</span>
                        <span className='text-gray-500'>Price</span>
                        <span className='text-gray-800'>Rs {item.price} per {item.unit}</span>
                    </div>
                </div>
            </motion.div>
        </div>
    )
}

export default GroceryDetail 