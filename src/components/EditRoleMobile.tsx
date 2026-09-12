'use client'
import React, { useState } from 'react'
import { motion } from 'motion/react'
import { label } from 'motion/react-client'
import { ArrowRight, Bike, User, UserCog } from 'lucide-react'
import axios from 'axios'
import { redirect } from 'next/navigation'

const EditRoleMobile = () => {
  const [roles, setRoles] = useState([
    {id:"admin",label:"Admin",icon:UserCog},
    {id:"user",label:"User",icon:User},
    {id:"deliveryBoy ",label:"Delivery Boy ",icon:Bike}
  ])
  const [selectedRole, setSelectedRole] = useState("")
  const [mobile, setMobile] = useState("")
  const handleEdit=async()=>{
    try {
      const result = await axios.post("/api/user/edit-role-mobile",{
        role:selectedRole,
        mobile
      })
      redirect("/")
    } catch (error) {
      console.log("Error in edit role and mobile",error)
    }
  }
  return (
    <div className='flex flex-col items-center  min-h-screen w-full p-6'>
       <motion.h1
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6,delay: 0.8 }}
        className='text-2xl md:text-4xl font-extrabold text-green-700 text-center mt-8'
       >
        Select Your Role
      </motion.h1>
      <div className='flex flex-col md:flex-row justify-center items-center gap-6 mt-10'>
          {roles.map((role)=>{
            const Icon = role.icon
            const isSelected = selectedRole === role.id
            return (
              <motion.div
              whileTap={{ scale: 0.94 }}
                key={role.id}
                onClick={()=>setSelectedRole(role.id)}
              className={`flex flex-col justify-center items-center w-48 h-44 rounded-2xl border-2
                    transition-all ${isSelected ? 'border-green-600 bg-green-100 shadow-lg' : 'border-gray-300 bg-white hover:border-green-600'}
                `}
              >
                <Icon/>
                <span>{role.label}</span>
              </motion.div>
            )
          })}
      </div>
      <motion.div
       initial={{ opacity: 0}}
       animate={{ opacity: 1}}
       transition={{ duration: 0.6,delay: 0.9 }}
       className='flex flex-col items-center mt-10'
      >
        <label 

        htmlFor="mobile" className='text-gray-800 font-medium mb-2'>
          Enter your Mobile No.
          </label>
        <input 
        type="tel" 
        id="mobile" 
        name="mobile" 
        placeholder='Enter your mobile no.' 
        className='w-64 border text-gray-800 border-gray-300 md:w-80 rounded-xl px-4 py-3 focus:ring-2 focus:ring-green-500 focus:outline-none'
        onChange={(e)=>setMobile(e.target.value)}
        />

      </motion.div>
      <motion.button
       initial={{ opacity: 0, y: 30 }}
       animate={{ opacity: 1, y: 0 }}
       transition={{ delay: 1 }}
       disabled={!selectedRole || mobile.length !== 10}
       className={`inline-flex items-center mt-20 gap-2  font-semibold py-3 px-8 rounded-2xl shadow-md transition-all duration-200 w-47 ${
        selectedRole && mobile.length === 10 ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-gray-400 text-gray-500 cursor-not-allowed'
       }`}
      onClick={handleEdit}
       >Go to Home <ArrowRight/> </motion.button>
    </div>
  )
}

export default EditRoleMobile
