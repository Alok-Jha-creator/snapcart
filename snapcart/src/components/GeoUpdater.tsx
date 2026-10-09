'use client'
import { getSocket } from '@/lib/socket'
import { get } from 'http'
import React, { useEffect } from 'react'

const GeoUpdater = ({userId}:{userId:string}) => {
    let socket = getSocket()
    socket.emit("identity",userId)
    useEffect(() => {
        if(!userId) return
        if(!navigator.geolocation) return
            const watcher=navigator.geolocation.watchPosition((pos)=>{
                const {latitude,longitude} = pos.coords
                socket.emit("update-location",{
                    userId,
                    latitude:latitude,
                    longitude:longitude
                })
        },(err)=>{console.log('err',err)},{enableHighAccuracy:true});
           
        return () => navigator.geolocation.clearWatch(watcher)
    }, [userId])
  return null
}

export default GeoUpdater
