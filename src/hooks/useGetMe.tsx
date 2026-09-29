'use client'

import { AppDispatch } from '@/redux/store'
import { setUserData } from '@/redux/userSlice'
import axios from 'axios'
import { data } from 'motion/react-client'
import React, { useEffect } from 'react'
import { useDispatch } from 'react-redux'

const useGetMe = () => {

 useEffect(()=>{
    const getMe=async ()=>{
        const dispatch=useDispatch<AppDispatch>()
        try {
            const result=await axios.get("/api/me")
            dispatch(setUserData(result,data))
        } catch (error) {
            console.log(error)
        }
    }
    getMe()
 },[])
}

export default useGetMe
