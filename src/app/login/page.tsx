'use client'
import { ArrowLeft, EyeIcon, EyeOff, Key, Leaf, Loader2, Lock, LogIn, Mail, User } from 'lucide-react'
import React, { FormEvent, useState } from 'react'
import { motion } from 'motion/react'
import { FcGoogle } from "react-icons/fc"
import { useRouter } from 'next/navigation'
import { signIn, useSession } from 'next-auth/react'



const Login = () => {
   
   const [email,setEmail] = useState('')
   const [password,setPassword] = useState('')
   const [showPassword,setShowPassword] = useState(false)
   const [loding,setLoading] = useState(false)
   const router = useRouter()
   const session = useSession()
   const handleLogin = async (e:FormEvent)=>{
    e.preventDefault()
    setLoading(true)
    try {
        await signIn("credentials",{
            email,password,
        })
        router.push('/')
        setLoading(false)
    } catch (error) {
       console.log(error) 
       setLoading(false)
    }
   }
  
  return (
    <div className='flex flex-col items-center justify-center min-h-screen bg-white relative px-6 py-10'>
  
    <motion.h1
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    className='text-4xl font-extrabold text-green-700 mb-2'
    >
    Welcome back !
    </motion.h1>
    <motion.p 
      initial={{ opacity: 0, y: 1 }}
      animate={{ opacity: 1, y: -5 }}
      transition={{ duration: 0.6 }} 
      className='text-gray-600 mb-8 flex items-center'>
        Login to SnapCart <Leaf className='w-5 h-5 text-green-600'/>
    </motion.p>

    <motion.form
    initial={{ opacity: 0 }}
    animate={{ opacity: 1}}
    transition={{ duration: 0.6 }}
    className='flex flex-col gap-5 w-full max-w-sm'
    onSubmit={handleLogin}
    >
     
      <div className='relative'>
        <Mail className='absolute left-3 top-3.5 w-5 h-5 text-gray-400'/>
        <input type="text" placeholder='Your Email' className='w-full border border-gray-400 rounded-xl py-3 pl-10 pr-4 text-gray-800 focus:ring-1 focus:ring-green-500 focus:outline-none' 
        onChange={(e)=>setEmail(e.target.value)}
        value={email} />
      </div>

      <div className='relative'>
        <Lock className='absolute left-3 top-3.5 w-5 h-5 text-gray-400'/>
        <input type={showPassword?"text":"password"} placeholder='Your Password' className='w-full border border-gray-400 rounded-xl py-3 pl-10 pr-4 text-gray-800 focus:ring-1 focus:ring-green-500 focus:outline-none' 
        onChange={(e)=>setPassword(e.target.value)}
        value={password} />
        {showPassword?<EyeOff className='absolute right-3 top-3.5 w-5 h-5 text-gray-500 cursor-pointer' onClick={()=>{setShowPassword(false)}}/>:<EyeIcon className='absolute right-3 top-3.5 w-5 h-5 text-gray-500 cursor-pointer' onClick={()=>{setShowPassword(true)}} />}
      </div>

      {
      (()=>{
        const formValidation =  email !== "" && password !== ""
        return <button disabled={!formValidation || loding} className={`w-full font-semibold py-3 rounded-xl transition-all duration-200 shadow-md inline-flex items-center justify-center gap-2 ${
          formValidation 
          ? "bg-green-700 text-white hover:bg-green-800 cursor-pointer"
          : "bg-gray-400 text-gray-700 cursor-not-allowed"
        }`}>
          {loding?<Loader2 className='w-5 h-5 animate-spin'/>:"Login"}
          </button>
      }) ()
    }
    <div className='flex items-center  gap-2 text-gray-400 text-sm mt-2'>
      <span className='flex-1 h-px bg-gray-200'></span>
      OR
      <span className='flex-1 h-px bg-gray-200'></span>
    </div>
    <button className='w-full flex font-semibold py-3 rounded-xl transition-all duration-200 shadow-md items-center justify-center gap-3 bg-white text-gray-700 border border-gray-400 hover:bg-gray-100' onClick={()=>signIn("google",{callbackUrl:"/"})}>
     <FcGoogle className="w-6 h-6" />
      Continue with Google
    </button>
    </motion.form>
    <p className='mt-6 items-center gap-1 flex text-gray-600 text-sm' onClick={()=>router.push("/register")}>
      Want to Create an account?<LogIn className='w-4 h-4'/>  <span className='text-green-700'> Sign Up</span> 
    </p>
    </div>  
  )
}

export default Login
