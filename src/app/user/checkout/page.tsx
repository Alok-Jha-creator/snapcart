'use client'
import React, { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowLeft, Building, CreditCard, CreditCardIcon, Home, LocateFixed, MapPin, Navigation, Navigation2, Phone, Pin, Truck, User } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { RootState } from '@/redux/store'
import { useSelector } from 'react-redux'
import { MapContainer, Marker, TileLayer, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L, { LatLngExpression } from 'leaflet'
import axios from 'axios'
import { OpenStreetMapProvider } from 'leaflet-geosearch'


const markerIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/128/684/684908.png',
  iconSize: [40, 40],
  iconAnchor: [20, 40],
})
const Checkout = () => {
  const router = useRouter()
  const { userData } = useSelector((state: RootState) => state.user)
  const { subTotal,deliveryFee,finalTotal } = useSelector((state: RootState) => state.cart)
  const [address, setAddress] = useState({
    fullName: "",
    mobile: "",
    city: "",
    state: "",
    pincode: "",
    fullAddress: ""
  })
  const [searchQuery, setSearchQuery] = useState("")
  const [position, setPosition] = useState<[number, number] | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<"cod"|"online">("cod")
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        const { latitude, longitude } = pos.coords;
        setPosition([latitude, longitude])
      }, (error) => {
        console.log('location error', error)
      }, {
        enableHighAccuracy: true, timeout: 10000, maximumAge: 0

      })
    }
  }, [])
  useEffect(() => {
    if (userData) {
      setAddress((prev) => ({ ...prev, fullName: userData?.name || "" })),
        setAddress((prev) => ({ ...prev, mobile: userData?.mobile || "" }))
    }
  }, [userData])

  const DraggableMarker: React.FC = () => {
    const map = useMap()
    useEffect(() => {
      map.setView(position as LatLngExpression, 13, { animate: true })
    }, [position, map])


    useEffect(() => {
      const fetchAddress = async () => {
        if (!position) return
        try {
          const result = await axios.get(`https://nominatim.openstreetmap.org/reverse?lat=${position[0]}&lon=${position[1]}&format=json`)
          setAddress((prev) => ({
            ...prev,
            city: result.data.address.city
              || result.data.address.town
              || result.data.address.municipality
              || result.data.address.city_district
              || result.data.address.village
              || "",
            state: result.data.address.state || "",
            pincode: result.data.address.postcode || "",
            fullAddress: result.data.display_name || ""
          }))
        } catch (error) {
          console.log('Error fetching address:', error)
        }
      }
      fetchAddress()
    }, [position])

    return <Marker
      icon={markerIcon}
      position={position as LatLngExpression}
      draggable={true}
      eventHandlers={{
        dragend: (e: L.LeafletEvent) => {
          const marker = e.target as L.Marker;
          const { lat, lng } = marker.getLatLng();
          setPosition([lat, lng])
        }
      }}
    />
  }

  const handleSearchQuery = async () => {
    if (!searchQuery.trim()) return
    try {
      const provider = new OpenStreetMapProvider()
      const results = await provider.search({ query: searchQuery })
      if (results && results.length > 0) {
        setPosition([results[0].y, results[0].x])
      } else {
        console.log('No results found')
      }
    } catch (error) {
      console.log('Search error:', error)
    }
  }

  const handleCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        const { latitude, longitude } = pos.coords;
        setPosition([latitude, longitude])
      }, (error) => {
        console.log('location error', error)
      }, {
        enableHighAccuracy: true, timeout: 10000, maximumAge: 0

      })
    }
  }

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
        className='text-3xl md:text-4xl font-bold text-green-700 text-center mb-8'>CheckOut
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
              <input type="text" value={address.fullName} onChange={(e) => setAddress((prev) => ({ ...prev, fullName: e.target.value }))} className='pl-10
                  w-full border rounded-lg p-3 text-sm bg-gray-50
                  ' />
            </div>
            <div className='relative'>
              <Phone className='absolute left-3 top-3 text-green-600' size={18} />
              <input type="text" value={address.mobile} onChange={(e) => setAddress((prev) => ({ ...prev, mobile: e.target.value }))} className='pl-10
                  w-full border rounded-lg p-3 text-sm bg-gray-50
                  ' />
            </div>
            <div className='relative'>
              <Home className='absolute left-3 top-3 text-green-600' size={18} />
              <input type="text" value={address.fullAddress} placeholder='Full address' onChange={(e) => setAddress((prev) => ({ ...prev, fullAddress: e.target.value }))} className='pl-10
                  w-full border rounded-lg p-3 text-sm bg-gray-50
                  ' />
            </div>
            <div className='grid grid-cols-3 gap-3'>
              <div className='relative'>
                <Building className='absolute left-3 top-3 text-green-600' size={18} />
                <input type="text" value={address.city} placeholder='city' onChange={(e) => setAddress((prev) => ({ ...prev, city: e.target.value }))} className='pl-10
                  w-full border rounded-lg p-3 text-sm bg-gray-50
                  ' />
              </div>
              <div className='relative'>
                <Navigation className='absolute left-3 top-3 text-green-600' size={18} />
                <input type="text" value={address.state} placeholder='state' onChange={(e) => setAddress((prev) => ({ ...prev, state: e.target.value }))} className='pl-10
                  w-full border rounded-lg p-3 text-sm bg-gray-50
                  ' />
              </div>
              <div className='relative'>
                <Pin className='absolute left-3 top-3 text-green-600' size={18} />
                <input type="text" value={address.pincode} placeholder='pincode' onChange={(e) => setAddress((prev) => ({ ...prev, pincode: e.target.value }))} className='pl-10
                  w-full border rounded-lg p-3 text-sm bg-gray-50
                  ' />
              </div>
            </div>
            <div className='flex gap-2 mt-3'>
              <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} type="text" placeholder='search city or area...' className='flex-1 border rounded-lg p-3 text-sm focus:ring-2 focus:ring-green-500 outline-none' />
              <button onClick={handleSearchQuery} className='bg-green-600 text-white px-5 rounded-lg hover:bg-green-700 transition-all font-medium'>Search</button>
            </div>
            <div className='relative mt-6 h-82.5 rounded-xl overflow-hidden border border-gray-200 shadow-inner'>
              {position &&
                <MapContainer className='w-full h-full' center={position as LatLngExpression} zoom={13} scrollWheelZoom={true}>
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <DraggableMarker />
                </MapContainer>}
              <motion.button
                whileTap={{ scale: 0.97 }}
                className='absolute bottom-4 right-4 bg-green-600 flex items-center justify-center z-999 text-white p-3 rounded-full shadow-lg hover:bg-green-700 transition-all'
                onClick={handleCurrentLocation}
              >
                <LocateFixed size={22} />
              </motion.button>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
          className='bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 border border-gray-100 h-fit'
        >
          <h2 className='text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2'><CreditCard className='text-green-600 '/> Payment Method</h2> 
          <div className='space-y-4 mb-6'>
                <button 
                onClick={() => setPaymentMethod("online")}
                className={`flex items-center gap-3 w-full border rounded-lg p-3 transition-all ${
                  paymentMethod === "online" ? "border-green-600 bg-green-100 shadow-sm" : "border-gray-200 hover:border-gray-400"
                }`}>
                <CreditCardIcon className='text-green-600'/> <span className='font-medium text-gray-700'>Pay Online (stripe)</span>
                </button>
                <button
                onClick={() => setPaymentMethod("cod")}
                className={`flex items-center gap-3 w-full border rounded-lg p-3 transition-all ${
                  paymentMethod === "cod" ? "border-green-600 bg-yellow-100 shadow-sm" : "border-gray-200 hover:border-gray-400"
                }`}>
                <Truck className='text-yellow-600'/> <span className='font-medium text-gray-700'>Cash On Delivery</span>
                </button>
          </div>
          <div className='border-t pt-4 text-gray-700 space-y-2 text-sm sm:text-base'>
            <div className='flex justify-between'> 
              <span className='font-semibold'>Sub Total</span>
              <span className='font-semibold text-green-600'>Rs {subTotal}</span>
            </div>
            <div className='flex justify-between'> 
              <span className='font-semibold'>Delivery Fee</span>
              <span className='font-semibold text-green-600'>Rs {deliveryFee}</span>
            </div>
            <div className='flex justify-between font-bold text-lg border-t'> 
              <span className='font-semibold'>Total Amount</span>
              <span className='font-semibold text-green-600'>Rs {finalTotal}</span>
            </div>
          
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default Checkout
