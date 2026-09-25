import { Search, ShoppingCartIcon } from 'lucide-react';
import mongoose from 'mongoose';
import Link from 'next/link';
import React from 'react'

interface IUser{
    _id?: mongoose.Types.ObjectId;
    name: string;
    email: string;
    password ?: string;
    mobile: string; 
    role: "user" | "deliveryBoy" | "admin";
    image?: string;
}

const Nav = ({user}:{user:IUser}) => {
  return (
    <div className="w-[95%] fixed top-4 left-1/2 -translate-x-1/2 bg-linear-to-r from-green-500 to-green-700 shadow-lg shadow-black/30 rounded-2xl p-4 h-20 px-4 md:px-8 z-50 flex justify-between items-center">
      <Link href={"/"} className='text-white font-bold text-xl sm:text-2xl tracking-wide hover:scale-105 transition-transform'>
       Snapcart
      </Link>

      <form className='hidden md:flex items-center bg-white rounded-full px-4 py-2 w-1/2 max-w-lg shadow-md'>
      <Search className='text-gray-500 w-5 h-5 mr-2'/>
      <input type="text" placeholder='Search groceries...' className='w-full outline-none text-gray-700 placeholder-gray-400' />
      </form>

      <div className='flex items-center gap-3 md:gap-6 relative'>
          <Link href={""} className='flex items-center w-11 h-11 justify-center shadow-md relative gap-1 bg-white hover-scale-105 transition rounded-full'>
           <ShoppingCartIcon className='w-6 h-6 text-green-600 '/>
           <span>0</span>
          </Link>
      </div>
    </div>
  )
}

export default Nav
