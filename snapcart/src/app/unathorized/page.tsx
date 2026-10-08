import React from 'react'

const Unauthorized = () => {
  return (
    <div className='flex flex-col items-center justify-center h-screen bg-gray-200'>
      <h1 className='text-3xl font-bold text-red-500'>Access Denied 🚫</h1>
      <p className='mt-2 text-gray-700'>You can not access this page.</p>
    </div>
  )
}

export default Unauthorized
