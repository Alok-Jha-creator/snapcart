'use client'
import React, { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowLeft, Building, Home, MapPin, Navigation, Navigation2, Phone, Pin, User } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { RootState } from '@/redux/store'
import { useSelector } from 'react-redux'

const Checkout = () => {
  const router = useRouter()
  const { userData } = useSelector((state: RootState) => state.user)
  const [address, setAddress] = useState({
    fullName: userData?.name,
    mobile: userData?.mobile,
    city: "",
    state: "",
    pincode: "",
    fullAddress: ""
  })
  return (
    <div className='w-[92%] sm:w-[90%] md:w-[80%] mx-auto py-10 relative'>
      <motion.button
        whileTap={{ scale: 0.97 }}
        className='absolute left-0 top-2 flex items-center gap-2 text-green-700 hover:text-green-800 font-semibold'
        onClick={() => router.push("/user/cart")}
      >
        <ArrowLeft size={16} />
        <span>Back to cart</span>
      </motion.button>
      <motion.h1
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className='text-3xl md:text-4xl font-bold text-green-700 text-center mb-10'>CheckOut
      </motion.h1>
      <div className='grid md:grid-cols-2 gap-8'>
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
          className='bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 border border-gray-100'
        >
          <h2 className='text-xl font-semibold text-gray-700 mb-4 flex items-center gap-2'>
            <MapPin className=' text-green-700 ' /> Delivery Address
          </h2>
          <div className='space-y-4'>
            <div className='relative'>
              <User className='absolute left-3 top-3 text-green-600' size={18} />
              <input type="text" value={address.fullName} onChange={(e) => setAddress({ ...address, fullName: e.target.value })} className='pl-10
                  w-full border rounded-lg p-3 text-sm bg-gray-50
                  ' />
            </div>
            <div className='relative'>
              <Phone className='absolute left-3 top-3 text-green-600' size={18} />
              <input type="text" value={address.mobile} onChange={(e) => setAddress({ ...address, mobile: e.target.value })} className='pl-10
                  w-full border rounded-lg p-3 text-sm bg-gray-50
                  ' />
            </div>
            <div className='relative'>
              <Home className='absolute left-3 top-3 text-green-600' size={18} />
              <input type="text" value={address.fullAddress} placeholder='Full address' onChange={(e) => setAddress({ ...address, fullAddress: e.target.value })} className='pl-10
                  w-full border rounded-lg p-3 text-sm bg-gray-50
                  ' />
            </div>
            <div className='grid grid-cols-3 gap-3'>
              <div className='relative'>
                <Building className='absolute left-3 top-3 text-green-600' size={18} />
                <input type="text" value={address.city} placeholder='city' onChange={(e) => setAddress({ ...address, city: e.target.value })} className='pl-10
                  w-full border rounded-lg p-3 text-sm bg-gray-50
                  ' />
              </div>
              <div className='relative'>
                <Navigation className='absolute left-3 top-3 text-green-600' size={18} />
                <input type="text" value={address.state} placeholder='state' onChange={(e) => setAddress({ ...address, state: e.target.value })} className='pl-10
                  w-full border rounded-lg p-3 text-sm bg-gray-50
                  ' />
              </div>
              <div className='relative'>
                <Pin className='absolute left-3 top-3 text-green-600' size={18} />
                <input type="text" value={address.pincode} placeholder='pincode' onChange={(e) => setAddress({ ...address, pincode: e.target.value })} className='pl-10
                  w-full border rounded-lg p-3 text-sm bg-gray-50
                  ' />
              </div>
            </div>
            <div className='flex gap-2 mt-3'>
              <input type="text" placeholder='search city or area...' className='flex-1 border rounded-lg p-3 text-sm focus:ring-2 focus:ring-green-500 outline-none' />
              <button className='bg-green-600 text-white px-5 rounded-lg hover:bg-green-700 transition-all font-medium'>Search</button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default Checkout
