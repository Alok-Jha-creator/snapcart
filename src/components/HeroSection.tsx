'use client'
import { Leaf, Smartphone, Truck } from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import React, { useEffect, useState } from 'react'
import {motion} from "motion/react"
import Image from 'next/image';

const slides = [
    {
      id: 1,
      icon: <Leaf className="w-20 h-20 sm:w-28 sm:h-28 text-green-400 drop-shadow-lg" />,
      title: "Fresh Organic Groceries 🥬",
      subtitle: "Farm-fresh fruits, vegetables, and daily essentials delivered to you.",
      btnText: "Shop Now",
      bg: "https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=774&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    },
    {
      id: 2,
      icon: <Truck className="w-20 h-20 sm:w-28 sm:h-28 text-yellow-400 drop-shadow-lg" />,
      title: "Fast & Reliable Delivery 🚚",
      subtitle: "We ensure your groceries reach your doorstep in no time.",
      btnText: "Order Now",
      bg: "https://images.unsplash.com/photo-1607273685680-6bd976c5a5ce?q=80&w=870&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    },
    {
      id: 3,
      icon: <Smartphone className="w-20 h-20 sm:w-28 sm:h-28 text-blue-400 drop-shadow-lg" />,
      title: "Shop Anytime, Anywhere 🛒",
      subtitle: "Easy and seamless online grocery shopping experience.",
      btnText: "Get Started",
      bg: "https://images.unsplash.com/photo-1623658877772-69ae99a89304?q=80&w=870&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    },
  ];

const HeroSection = () => {
    const slides = [
        {
          id: 1,
          icon: <Leaf className="w-20 h-20 sm:w-28 sm:h-28 text-green-400 drop-shadow-lg" />,
          title: "Fresh Organic Groceries 🥬",
          subtitle: "Farm-fresh fruits, vegetables, and daily essentials delivered to you.",
          btnText: "Shop Now",
          bg: "https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=774&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
        },
        {
          id: 2,
          icon: <Truck className="w-20 h-20 sm:w-28 sm:h-28 text-yellow-400 drop-shadow-lg" />,
          title: "Fast & Reliable Delivery 🚚",
          subtitle: "We ensure your groceries reach your doorstep in no time.",
          btnText: "Order Now",
          bg: "https://images.unsplash.com/photo-1607273685680-6bd976c5a5ce?q=80&w=870&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
        },
        {
          id: 3,
          icon: <Smartphone className="w-20 h-20 sm:w-28 sm:h-28 text-blue-400 drop-shadow-lg" />,
          title: "Shop Anytime, Anywhere 🛒",
          subtitle: "Easy and seamless online grocery shopping experience.",
          btnText: "Get Started",
          bg: "https://images.unsplash.com/photo-1623658877772-69ae99a89304?q=80&w=870&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
        },
      ];

      const[ current,setCurrent]=useState(0)
      useEffect(()=>{
        const timer=setInterval(() => {
            setCurrent((prev)=>(prev+1)%(slides.length))
        },4000);
        return ()=>clearInterval(timer)
      },[])
  return (
    <div className='relative w-[95%] mx-auto mt-28 h-[80vh] rounded-3xl overflow-hidden shadow-2xl'>
      <AnimatePresence mode='wait'>
        <motion.div
        initial={{opacity:0}}
        animate={{opacity:1}}
        transition={{duration:0.8}}
        exit={{opacity:0}}
        className='absolute inset-0'
        >
            <Image src={slides[current]?.bg}
            fill
            alt='slide'
            priority
            />
        </motion.div>

      </AnimatePresence>
    </div>
  )
}

export default HeroSection
