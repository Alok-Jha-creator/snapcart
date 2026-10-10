'use client'

import { ArrowLeft, ArrowRight, Minus, Plus, ShoppingBasket, ShieldCheck, Trash, Truck } from 'lucide-react'
import Link from 'next/link'
import React from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useDispatch, useSelector } from 'react-redux'
import { AppDispatch, RootState } from '@/redux/store'
import Image from 'next/image'
import { decreaseQuantity, increaseQuantity, removeFromCart } from '@/redux/cartSlice'
import { useRouter } from 'next/navigation'

const CartPage = () => {
  const { cartData, subTotal, finalTotal, deliveryFee } = useSelector((state: RootState) => state.cart)
  const dispach = useDispatch<AppDispatch>()
  const router = useRouter()

  return (
    <div className='w-[95%] sm:w-[90%] md:w-[80%] mx-auto mt-8 mb-24 relative'>
      <Link href={"/"} className='absolute -top-2 left-0 flex items-center gap-2 text-green-700 hover:text-green-800 font-medium transition-all'>
        <ArrowLeft size={20} />
        <span className='hidden sm:inline'>Back to Home</span>
      </Link>
      <motion.h2
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className='text-2xl sm:text-3xl md:text-4xl font-bold text-green-700 text-center mb-2'
      >
        🛒 Your Shopping Cart
      </motion.h2>
      <p className='text-center text-sm text-gray-500 mb-10'>
        {cartData.length} {cartData.length === 1 ? 'item' : 'items'} in your cart
      </p>

      {cartData.length == 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className='text-center py-20 bg-white rounded-2xl shadow-sm border border-gray-100'
        >
          <div className='w-24 h-24 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-5'>
            <ShoppingBasket className='w-12 h-12 text-green-600' />
          </div>
          <p className='text-gray-700 text-lg font-medium mb-1'>Your cart is empty</p>
          <p className='text-gray-500 text-sm mb-6'>Add some groceries to continue shopping!</p>
          <Link href={"/"} className='bg-green-600 text-white px-6 py-3 rounded-full hover:bg-green-700 transition-all inline-block font-medium'>Continue Shopping</Link>
        </motion.div>
      ) : (
        <div className='grid grid-cols-1 lg:grid-cols-3 gap-8'>
          <div className='lg:col-span-2 space-y-4'>
            <AnimatePresence>
              {cartData.map((item) => (
                <motion.div
                  key={String(item._id)}
                  layout
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -40 }}
                  className='flex flex-col sm:flex-row sm:items-center gap-4 bg-white rounded-2xl shadow-sm hover:shadow-lg transition-shadow duration-300 p-4 sm:p-5 border border-gray-100'
                >
                  {/* Image — opens the product detail page */}
                  <Link
                    href={`/user/grocery/${item._id}`}
                    className='block relative w-full sm:w-28 h-40 sm:h-28 shrink-0 rounded-xl overflow-hidden bg-gray-50 group'
                  >
                    <Image
                      src={item.image}
                      alt={item.name}
                      fill
                      sizes='(max-width:640px) 100vw, 112px'
                      className='object-contain p-3 transition-transform duration-300 group-hover:scale-105'
                    />
                  </Link>

                  {/* Info — name also opens the detail page */}
                  <div className='flex-1 min-w-0'>
                    <p className='text-xs text-gray-500 font-medium'>{item.category}</p>
                    <Link href={`/user/grocery/${item._id}`}>
                      <h3 className='text-base sm:text-lg font-semibold text-gray-800 line-clamp-1 hover:text-green-700 transition-colors'>{item.name}</h3>
                    </Link>
                    <div className='flex items-center gap-2 mt-1.5'>
                      <span className='text-xs font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded-full'>{item.unit}</span>
                      <span className='text-xs text-gray-500'>Rs {item.price} each</span>
                    </div>
                  </div>

                  {/* Quantity, line total, remove */}
                  <div className='flex items-center justify-between sm:justify-end gap-3 sm:gap-4'>
                    <div className='flex items-center gap-3 bg-green-50 border border-green-200 px-3 py-1.5 rounded-full'>
                      <button
                        onClick={() => dispach(decreaseQuantity(item._id))}
                        className='w-7 h-7 flex items-center justify-center rounded-full bg-green-100 hover:bg-green-200 transition-all'
                      >
                        <Minus size={14} className='text-green-700' />
                      </button>
                      <span className='font-semibold text-gray-800 w-5 text-center text-sm'>{item.quantity}</span>
                      <button
                        onClick={() => dispach(increaseQuantity(item._id))}
                        className='w-7 h-7 flex items-center justify-center rounded-full bg-green-100 hover:bg-green-200 transition-all'
                      >
                        <Plus size={14} className='text-green-700' />
                      </button>
                    </div>
                    <p className='min-w-20 text-right text-green-700 font-bold'>Rs {Number(item.price) * item.quantity}</p>
                    <button
                      onClick={() => dispach(removeFromCart(item._id))}
                      className='w-8 h-8 flex items-center justify-center rounded-full text-red-500 hover:bg-red-50 hover:text-red-700 transition-all'
                    >
                      <Trash size={17} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Order summary */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className='bg-white rounded-2xl shadow-lg p-6 h-fit lg:sticky lg:top-24 border border-gray-100 flex flex-col'
          >
            <h2 className='text-lg sm:text-xl font-bold text-gray-800 mb-4'>Order Summary</h2>
            <div className='space-y-3 text-gray-700 text-sm sm:text-base'>
              <div className='flex justify-between'>
                <span className='font-medium'>Subtotal ({cartData.length} {cartData.length === 1 ? 'item' : 'items'})</span>
                <span className='text-green-700 font-semibold'>Rs {subTotal}</span>
              </div>
              <div className='flex justify-between'>
                <span className='font-medium'>Delivery fee</span>
                {Number(deliveryFee) === 0 ? (
                  <span className='text-xs font-semibold text-green-700 bg-green-100 px-2.5 py-1 rounded-full'>Free</span>
                ) : (
                  <span className='text-green-700 font-semibold'>Rs {deliveryFee}</span>
                )}
              </div>
              <hr className='my-3 border-gray-100' />
              <div className='flex justify-between font-bold text-lg sm:text-xl'>
                <span>Final total</span>
                <span className='text-green-700'>Rs {finalTotal}</span>
              </div>
            </div>

            <motion.button
              whileTap={{ scale: 0.97 }}
              className='w-full mt-6 flex items-center justify-center gap-2 bg-green-600 text-white py-3 rounded-full hover:bg-green-700 transition-all text-sm sm:text-base font-semibold'
              onClick={() => router.push("/user/checkout")}
            >
              Proceed to Checkout
              <ArrowRight size={18} />
            </motion.button>
            <Link href={"/"} className='text-center text-sm text-green-700 hover:text-green-800 font-medium mt-3'>
              Continue Shopping
            </Link>

            <div className='mt-5 pt-4 border-t border-gray-100 space-y-2 text-xs text-gray-500'>
              <div className='flex items-center gap-2'>
                <Truck size={14} className='text-green-600 shrink-0' />
                Delivery in about 10 minutes
              </div>
              <div className='flex items-center gap-2'>
                <ShieldCheck size={14} className='text-green-600 shrink-0' />
                Pay online with eSewa or cash on delivery
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}

export default CartPage