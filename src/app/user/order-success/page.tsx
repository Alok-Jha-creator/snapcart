'use client'
import React from 'react'
import { motion } from 'motion/react'
import { ArrowRight, CheckCircle, Package } from 'lucide-react'
import Link from 'next/link'

const OrderSuccess = () => {
  return (
    <div className='flex flex-col items-center justify-center min-h-[80vh] px-6 text-center bg-linear-to-b from-green-50 to-white'>
        <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.9}}

        >
            <CheckCircle className='text-green-700 w-16 h-16 md:w-20 md:h-20' />
        </motion.div>
      <motion.h1
      initial={{ opacity: 0, y: -50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className='text-3xl md:text-4xl font-bold text-green-700 mt-6'
      >
           Order placed successfully! 
      </motion.h1>
      <motion.p
       initial={{ opacity: 0, y: 50 }}
       animate={{ opacity: 1, y: 0 }}
       transition={{ duration: 0.5,delay: 0.2 }}
       className='text-gray-600 mt-3 text-sm md:text-base max-w-md'
      >
        Thank you for your order. Your order has been placed and is being processed. You can track its progress in your <span className='font-semibold text-green-700'> My Orders</span> section
      </motion.p>
      <motion.div
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay: 0.3, ease: 'easeInOut', repeat:Infinity , repeatType: 'reverse' }}
      className='mt-10'
      >
        <Package className='text-green-700 w-16 h-16 md:w-20 md:h-20 mt-6' />
      </motion.div>
      <motion.div
      initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className='mt-6'
      >
        <Link 
        href={'/user/my-orders'}
        >
          <motion.div
          animate={{ scale: 1.05 }}
          initial={{ scale: 1 }}
          transition={{ duration: 0.5 }}
           className='mt-8 inline-block bg-green-700 text-white px-6 py-3 rounded-full shadow-md hover:bg-green-800 transition-colors duration-300'>
          
          Go to my Orders Page <ArrowRight className='inline-block ml-2 w-4 h-4' />
          </motion.div>
            
        </Link>
      </motion.div>
      <motion.div
      initial={{ opacity: 0.2 }}
      animate={{ opacity:[0.2,0.6,0.2] }}
      transition={{ duration: 0.2, repeat: Infinity, repeatType: 'reverse' }}
      className='absolute top-0 left-0 w-full h-full pointer-events-none'
      
      >
        <div className='absolute top-20 left-[10%] w-2 h-2 bg-green-500 rounded-full animate-bounce'/>
        <div className='absolute top-15 left-[50%] w-2 h-2 bg-green-500 rounded-full animate-ping'/>
        <div className='absolute top-40 left-[10%] w-2 h-2 bg-green-500 rounded-full animate-pulse'/>
        <div className='absolute top-30 left-[60%] w-2 h-2 bg-green-500 rounded-full animate-bounce'/>
        <div className='absolute top-14 left-[20%] w-2 h-2 bg-green-500 rounded-full animate-bounce'/>
        <div className='absolute top-20 left-[80%] w-2 h-2 bg-green-500 rounded-full animate-pulse'/>
        <div className='absolute top-20 left-[70%] w-2 h-2 bg-green-500 rounded-full animate-bounce'/>
      </motion.div>
    </div>
  )
}

export default OrderSuccess