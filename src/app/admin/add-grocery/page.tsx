'use client'
import { ArrowBigLeft, ArrowLeft } from 'lucide-react'
import  Link  from 'next/link'
import React from 'react'
import {motion} from 'motion/react'

const AddGrocery = () => {
  return (
    <div className='min-h-screen flex items-center justify-center bg-linear-to-br from-green-50 to-white py-16 px-4 relative'>
      <Link href="/" className='absolute top-6 left-6 flex items-center gap-2 text-green-700 font-semibold bg-white px-4 py-2 rounded-full shadow-md hover:bg-green-100 hover:shadow-lg transition-all' >
       <ArrowLeft className='w-5 h-5'/>
       <span className='hidden md:flex'>Back to Home</span> 
      </Link>
    </div>
  )
}

export default AddGrocery
