'use client'
import React, { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { signOut } from 'next-auth/react'
import { useSelector } from 'react-redux'
import { AnimatePresence, motion } from 'motion/react'
import {
  Bell, ChevronDown, History, Inbox, Leaf, LogOut, RefreshCw, ShoppingCart, Truck, Volume2, VolumeX,
} from 'lucide-react'
import { RootState } from '@/redux/store'

export type Tab = 'available' | 'mine' | 'completed'

const navItems: { key: Tab; label: string; short: string; icon: React.ElementType }[] = [
  { key: 'available', label: 'New Requests', short: 'Requests', icon: Inbox },
  { key: 'mine', label: 'My Deliveries', short: 'Active', icon: Truck },
  { key: 'completed', label: 'History', short: 'History', icon: History },
]

const sidebarBg = 'bg-linear-to-b from-[#0b5c3b] to-[#08432c] text-white'

/** Simple vegetable basket illustration for the sidebar footer */
const Basket = () => (
  <svg viewBox='0 0 92 100' aria-hidden className='h-full max-h-28 w-auto shrink-0'>
    <path d='M24 40 C18 20 30 8 40 6 C40 20 36 30 30 42Z' fill='#2f9e44' />
    <path d='M36 38 C32 16 44 6 52 2 C54 18 48 30 42 40Z' fill='#51cf66' />
    <path d='M52 36 C54 22 62 14 70 12 C70 26 64 34 56 40Z' fill='#2b8a3e' />
    <path d='M56 30 L70 6 L76 10 L64 38Z' fill='#f76707' />
    <circle cx='68' cy='42' r='13' fill='#e03131' />
    <circle cx='28' cy='46' r='13' fill='#fcc419' />
    <circle cx='46' cy='42' r='12' fill='#82c91e' />
    <path d='M8 48 H84 L76 92 Q75 96 70 96 H22 Q17 96 16 92Z' fill='#40c057' />
    <g stroke='#2b8a3e' strokeWidth='3' strokeLinecap='round'>
      <path d='M26 54 V90 M38 54 V92 M50 54 V92 M62 54 V92 M74 54 V90' />
      <path d='M12 66 H80 M15 80 H77' />
    </g>
    <rect x='6' y='44' width='80' height='9' rx='4.5' fill='#2f9e44' />
  </svg>
)

type Props = {
  children: React.ReactNode
  tab: Tab
  onTab: (t: Tab) => void
  counts: Record<Tab, number>
  sound: boolean
  onToggleSound: () => void
  onRefresh: () => void
  refreshing: boolean
  /** small status line in the top bar, e.g. "Updated 05:42 PM" */
  status?: string
}

const DeliveryShell = ({ children, tab, onTab, counts, sound, onToggleSound, onRefresh, refreshing, status }: Props) => {
  const { userData } = useSelector((state: RootState) => state.user)
  const firstName = userData?.name?.split(' ')[0]
  const email = (userData as unknown as { email?: string } | null | undefined)?.email

  const [profileOpen, setProfileOpen] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)
  const [confirmLogout, setConfirmLogout] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  // close the profile menu on outside click / Escape
  useEffect(() => {
    if (!profileOpen) return
    const onDown = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setProfileOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [profileOpen])

  // close the logout question with Escape
  useEffect(() => {
    if (!confirmLogout) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !loggingOut) setConfirmLogout(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [confirmLogout, loggingOut])

  const doLogout = async () => {
    setLoggingOut(true)
    try {
      await signOut({ callbackUrl: '/' })
    } finally {
      setLoggingOut(false)
    }
  }

  const avatar = (px: number) =>
    userData?.image ? (
      <Image src={userData.image} alt={userData?.name || 'Rider'} width={px} height={px} style={{ width: px, height: px }} className='rounded-full object-cover shrink-0' />
    ) : (
      <span style={{ width: px, height: px }} className='rounded-full bg-green-600 text-white font-semibold flex items-center justify-center shrink-0'>
        {firstName?.[0]?.toUpperCase() || 'R'}
      </span>
    )

  const base = 'w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors [@media(min-height:820px)]:py-3'

  return (
    <div className='min-h-screen bg-[#f6f8f6] text-gray-800'>
      {/* desktop sidebar */}
      <aside className={`hidden lg:flex fixed inset-y-0 left-0 z-50 w-60 2xl:w-72 flex-col overflow-y-auto ${sidebarBg}`}>
        <div className='flex items-center gap-3 px-6 pt-5 pb-4 [@media(min-height:820px)]:pt-6 [@media(min-height:820px)]:pb-5'>
          <ShoppingCart size={40} className='text-green-300 shrink-0' strokeWidth={1.6} />
          <div>
            <p className='text-2xl font-bold leading-6'>Snapcart</p>
            <p className='text-[11px] text-green-100/80 mt-1'>Delivery Partner</p>
          </div>
        </div>

        <nav className='px-4 space-y-0.5'>
          {navItems.map((n) => (
            <button
              key={n.key}
              onClick={() => onTab(n.key)}
              aria-current={tab === n.key ? 'page' : undefined}
              className={`${base} ${tab === n.key ? 'bg-white/15' : 'text-green-50/90 hover:bg-white/10'}`}
            >
              <n.icon size={20} />
              <span className='flex-1 text-left'>{n.label}</span>
              {counts[n.key] > 0 && n.key !== 'completed' && (
                <span className='min-w-5 h-5 px-1.5 rounded-full bg-yellow-400 text-yellow-950 text-[11px] font-bold flex items-center justify-center'>
                  {counts[n.key]}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className='mx-6 my-3 border-t border-white/15' />
        <nav className='px-4'>
          <button onClick={() => setConfirmLogout(true)} className={`${base} text-green-50/90 hover:bg-white/10`}>
            <LogOut size={20} /> Logout
          </button>
        </nav>

        <div className='mt-auto flex-1 min-h-0 px-6 pb-4 pt-2 flex items-end gap-3'>
          <Basket />
          <div className='pb-2'>
            <p className='italic text-lg leading-5 text-green-50 -rotate-6' style={{ fontFamily: 'cursive' }}>
              Fresh<br />Food<br />Everyday
            </p>
            <Leaf size={16} className='text-green-300 fill-green-300 ml-9 mt-1' />
          </div>
        </div>
      </aside>

      {/* logout confirmation */}
      <AnimatePresence>
        {confirmLogout && (
          <motion.div
            key='logout-confirm'
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className='fixed inset-0 z-100 flex items-center justify-center bg-black/40 px-4'
            onClick={() => { if (!loggingOut) setConfirmLogout(false) }}
          >
            <motion.div
              role='alertdialog'
              aria-modal='true'
              aria-labelledby='logout-title'
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              className='bg-white w-full max-w-sm rounded-2xl p-6 text-center shadow-xl'
              onClick={(e) => e.stopPropagation()}
            >
              <div className='w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4'>
                <LogOut size={22} className='text-red-600' />
              </div>
              <p id='logout-title' className='text-lg font-semibold text-gray-800'>Log out?</p>
              <p className='text-sm text-gray-500 mt-1'>Are you sure you want to log out? You won&apos;t get new delivery requests until you log in again.</p>
              <div className='flex gap-3 mt-6'>
                <button type='button' autoFocus onClick={() => setConfirmLogout(false)} disabled={loggingOut} className='flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-50 disabled:opacity-50'>
                  Cancel
                </button>
                <button type='button' onClick={doLogout} disabled={loggingOut} className='flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-xl text-sm font-semibold disabled:opacity-60'>
                  {loggingOut ? 'Logging out...' : 'Yes, log out'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className='lg:ml-60 2xl:ml-72'>
        {/* top bar */}
        <header className='sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-gray-100'>
          <div className='flex items-center justify-between gap-4 px-4 sm:px-8 h-20'>
            <div className='min-w-0'>
              <span className='lg:hidden flex items-center gap-2 text-lg font-bold text-[#0b5c3b]'>
                <ShoppingCart size={22} className='text-green-600' /> Snapcart
              </span>
              <p className='hidden lg:block text-sm text-gray-500 truncate'>{status}</p>
            </div>

            <div className='flex items-center gap-3 sm:gap-4 shrink-0'>
              <button
                onClick={onToggleSound}
                aria-label='Toggle sound alerts'
                title={sound ? 'Sound alerts on' : 'Sound alerts off'}
                className='w-11 h-11 rounded-full bg-gray-50 hover:bg-gray-100 flex items-center justify-center text-gray-600'
              >
                {sound ? <Volume2 size={19} /> : <VolumeX size={19} />}
              </button>
              <button
                onClick={onRefresh}
                aria-label='Refresh'
                className='w-11 h-11 rounded-full bg-gray-50 hover:bg-gray-100 flex items-center justify-center text-gray-600'
              >
                <RefreshCw size={19} className={refreshing ? 'animate-spin' : ''} />
              </button>
              <button
                onClick={() => onTab('available')}
                aria-label='New delivery requests'
                className='relative w-11 h-11 rounded-full bg-gray-50 hover:bg-gray-100 flex items-center justify-center text-gray-600'
              >
                <Bell size={20} />
                {counts.available > 0 && (
                  <span className='absolute -top-0.5 -right-0.5 min-w-5 h-5 px-1 rounded-full bg-red-500 text-white text-[11px] font-semibold flex items-center justify-center'>
                    {counts.available}
                  </span>
                )}
              </button>

              <div className='relative' ref={profileRef}>
                <button
                  type='button'
                  onClick={() => setProfileOpen((o) => !o)}
                  aria-haspopup='menu'
                  aria-expanded={profileOpen}
                  className='flex items-center gap-3 rounded-xl p-1 -m-1 hover:bg-gray-50 transition-colors'
                >
                  {avatar(44)}
                  <div className='hidden sm:block leading-4 text-left'>
                    <p className='text-sm font-semibold'>{userData?.name || 'Rider'}</p>
                    <p className='text-xs text-gray-500 mt-0.5'>Delivery Partner</p>
                  </div>
                  <ChevronDown size={18} className={`hidden sm:block text-gray-500 transition-transform ${profileOpen ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {profileOpen && (
                    <motion.div
                      role='menu'
                      initial={{ opacity: 0, y: -8, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.97 }}
                      transition={{ duration: 0.15 }}
                      className='absolute right-0 top-full mt-3 w-64 bg-white rounded-2xl border border-gray-100 shadow-lg p-2 z-50'
                    >
                      <div className='flex items-center gap-3 px-3 py-3 border-b border-gray-100 mb-1'>
                        {avatar(40)}
                        <div className='min-w-0'>
                          <p className='text-sm font-semibold text-gray-800 truncate'>{userData?.name || 'Rider'}</p>
                          <p className='text-xs text-gray-500 truncate'>{email || 'Delivery Partner'}</p>
                        </div>
                      </div>
                      <button
                        type='button'
                        role='menuitem'
                        onClick={() => { setProfileOpen(false); setConfirmLogout(true) }}
                        className='w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors'
                      >
                        <LogOut size={16} /> Logout
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </header>

        <main className='px-4 sm:px-8 py-6 pb-28 lg:pb-8 max-w-350'>{children}</main>
      </div>

      {/* mobile bottom navigation */}
      <nav className='lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-gray-200 pb-[env(safe-area-inset-bottom,0px)]'>
        <div className='grid grid-cols-3'>
          {navItems.map((n) => (
            <button
              key={n.key}
              onClick={() => onTab(n.key)}
              className={`relative flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium ${tab === n.key ? 'text-green-700' : 'text-gray-500'}`}
            >
              <span className='relative'>
                <n.icon size={20} />
                {counts[n.key] > 0 && n.key !== 'completed' && (
                  <span className='absolute -top-1.5 -right-2.5 min-w-4 h-4 px-1 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center'>
                    {counts[n.key]}
                  </span>
                )}
              </span>
              {n.short}
              {tab === n.key && <span className='absolute top-0 inset-x-6 h-0.5 bg-green-600 rounded-full' />}
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}

export default DeliveryShell