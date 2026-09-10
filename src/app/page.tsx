'use client'
import Welcome from '@/components/Welcome'
import { useState } from 'react'


export default function Page() {
  const [step, setStep] = useState(1)

  return (
    <>
      {step === 1 && <Welcome nextStep={setStep} />}
    </>
  )
}