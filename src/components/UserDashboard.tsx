import React from 'react'
import HeroSection from './HeroSection'
import CategorySlider from './CategorySlider'
import connectDb from '@/lib/db'
import Grocery from '@/models/grocery.model'
import GroceryItemCard from './GroceryItemCard'

const UserDashboard = async () => {
  await connectDb()
  const groceries=await Grocery.find({})
  const plainGrocery = JSON.parse(JSON.stringify(groceries))

  return (
    <>
      <HeroSection/>
      <CategorySlider/>
      {plainGrocery.map((item:any,index:number)=>(
        <GroceryItemCard key={index} item={item}/>
      ))}
    </>
  )
}

export default UserDashboard
