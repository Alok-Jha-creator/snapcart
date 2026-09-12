import connectDb from '@/lib/db'
import User from '@/models/user.model'
import React from 'react'

const Home = async () => {
  await connectDb()
  const user =await User.find
  return (
    <div>
       5:31
    </div>
  )
}

export default Home
