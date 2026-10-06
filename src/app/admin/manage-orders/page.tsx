'use client'
import axios from 'axios'

import React, { useEffect, useState } from 'react'

const ManageOrders = () => {
    const [orders, setOrders] = useState<[]>()
    useEffect(() => {
        const getOrders = async () => {
            try {
                const result =await axios.get('/api/admin/get-orders')
                setOrders(result.data)
            } catch (error) {
                
            }
        }
        getOrders()
    }, [])
  return (
    <div className='min-h-screen bg-gray-50 w-full'>
      hello manage orders
    </div>
  )
}

export default ManageOrders
