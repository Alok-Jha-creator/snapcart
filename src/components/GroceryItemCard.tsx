'use client'

import React from 'react'
import mongoose from 'mongoose'
import { motion } from "motion/react"
import Image from 'next/image'

interface IGrocery {
    _id?: mongoose.Types.ObjectId,
    name: string,
    category: string,
    price: string,
    unit: string,
    image: string,
    createdAt?: Date,
    updatedAt?: Date
}
const GroceryItemCard = ({ item }: { item: IGrocery }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: false, amount: 0.5 }}
            className='bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100 flex flex-col'
        >
            <div>
                <Image src={item.image} fill alt={item.name} />
            </div>
        </motion.div>
    )
}

export default GroceryItemCard
