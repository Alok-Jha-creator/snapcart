'use client'
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { useSelector } from 'react-redux'
import { AnimatePresence, motion } from 'motion/react'
import {
    Bell, ChevronDown, ClipboardList, Grid2x2, Home, Leaf, LogOut, Menu, Package,
    PlusCircle, Search, Settings, ShoppingBag, ShoppingCart, Truck, Users, X,
} from 'lucide-react'
import { RootState } from '@/redux/store'

/* ------------------------------ static config ----------------------------- */

const mainNav = [
    { href: '/', label: 'Dashboard', icon: Home },
    { href: '/admin/add-grocery', label: 'Add Grocery', icon: PlusCircle },
    { href: '/admin/view-grocery', label: 'View Grocery', icon: ShoppingBag },
    { href: '/admin/manage-orders', label: 'Manage Orders', icon: ClipboardList },
]

// These pages are in the design but not in the project yet — point them to real routes when they exist
const storeNav = [
    { href: '/admin/view-grocery', label: 'Products', icon: Package },
    { href: '#', label: 'Categories', icon: Grid2x2 },
    { href: '#', label: 'Suppliers', icon: Truck },
    { href: '#', label: 'Customers', icon: Users },
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

/* -------------------------------- sidebar --------------------------------- */

const SidebarContent = ({ pathname, onNavigate, onClose }: { pathname: string; onNavigate?: () => void; onClose?: () => void }) => {
    const isActive = (href: string) =>
        href === '/' ? pathname === '/' || pathname === '/admin' : pathname.startsWith(href)
    const base = 'flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors [@media(min-height:820px)]:py-3'

    return (
        <>
            <div className='flex items-center justify-between gap-3 px-6 pt-5 pb-3 [@media(min-height:820px)]:pt-6 [@media(min-height:820px)]:pb-5'>
                <Link href='/' onClick={onNavigate} className='flex items-center gap-3'>
                    <ShoppingCart size={40} className='text-green-300 shrink-0' strokeWidth={1.6} />
                    <div>
                        <p className='text-2xl font-bold leading-6'>Snapcart</p>
                        <p className='text-[11px] text-green-100/80 mt-1'>Fresh Groceries, Better Life</p>
                    </div>
                </Link>
                {onClose && (
                    <button onClick={onClose} aria-label='Close menu' className='p-1 text-green-100 hover:text-white'>
                        <X size={22} />
                    </button>
                )}
            </div>

            <nav className='px-4 space-y-0.5'>
                {mainNav.map((n) => (
                    <Link
                        key={n.label}
                        href={n.href}
                        onClick={onNavigate}
                        className={`${base} ${isActive(n.href) ? 'bg-white/15' : 'text-green-50/90 hover:bg-white/10'}`}
                    >
                        <n.icon size={20} /> {n.label}
                    </Link>
                ))}
            </nav>

            <div className='mx-6 my-2 border-t border-white/15 [@media(min-height:820px)]:my-4' />
            <p className='px-7 text-xs text-green-100/70 mb-1'>Store Management</p>
            <nav className='px-4 space-y-0.5'>
                {storeNav.map((n) => (
                    <Link key={n.label} href={n.href} onClick={onNavigate} className={`${base} text-green-50/90 hover:bg-white/10`}>
                        <n.icon size={20} /> {n.label}
                    </Link>
                ))}
            </nav>

            <div className='mx-6 my-2 border-t border-white/15 [@media(min-height:820px)]:my-4' />
            <nav className='px-4 space-y-0.5'>
                <Link
                    href='/admin/settings'
                    onClick={onNavigate}
                    className={`${base} ${pathname.startsWith('/admin/settings') ? 'bg-white/15' : 'text-green-50/90 hover:bg-white/10'}`}
                >
                    <Settings size={20} /> Settings
                </Link>
                <button onClick={() => signOut({ callbackUrl: '/' })} className={`w-full ${base} text-green-50/90 hover:bg-white/10`}>
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
        </>
    )
}

/* ---------------------------------- shell --------------------------------- */

type Props = {
    children: React.ReactNode
    /** Number shown on the bell badge */
    pendingCount?: number
    /** Pass this to show a working search box in the top bar */
    search?: { value: string; onChange: (v: string) => void; placeholder?: string }
}

const AdminShell = ({ children, pendingCount = 0, search }: Props) => {
    const { userData } = useSelector((state: RootState) => state.user)
    const pathname = usePathname() ?? ''
    const [mobileOpen, setMobileOpen] = useState(false)
    const firstName = userData?.name?.split(' ')[0]

    useEffect(() => {
        setMobileOpen(false)
    }, [pathname])

    return (
        <div className='min-h-screen bg-[#f6f8f6] text-gray-800'>
            {/* desktop sidebar */}
            <aside className={`hidden lg:flex fixed inset-y-0 left-0 z-50 w-60 2xl:w-72 flex-col overflow-y-auto ${sidebarBg}`}>
                <SidebarContent pathname={pathname} />
            </aside>

            {/* mobile drawer */}
            <AnimatePresence>
                {mobileOpen && (
                    <>
                        <motion.div
                            key='overlay'
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setMobileOpen(false)}
                            className='fixed inset-0 z-60 bg-black/40 lg:hidden'
                        />
                        <motion.aside
                            key='drawer'
                            initial={{ x: -300 }}
                            animate={{ x: 0 }}
                            exit={{ x: -300 }}
                            transition={{ type: 'spring', stiffness: 260, damping: 30 }}
                            className={`fixed inset-y-0 left-0 z-70 w-72 max-w-[85%] flex flex-col overflow-y-auto lg:hidden ${sidebarBg}`}
                        >
                            <SidebarContent pathname={pathname} onNavigate={() => setMobileOpen(false)} onClose={() => setMobileOpen(false)} />
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>

            <div className='lg:ml-60 2xl:ml-72'>
                {/* top bar */}
                <header className='sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-gray-100'>
                    <div className='flex items-center justify-between gap-4 px-4 sm:px-8 h-20'>
                        <div className='flex items-center gap-3 flex-1 min-w-0'>
                            <button
                                onClick={() => setMobileOpen(true)}
                                aria-label='Open menu'
                                className='lg:hidden w-11 h-11 rounded-xl bg-gray-100/70 flex items-center justify-center shrink-0'
                            >
                                <Menu size={22} className='text-gray-700' />
                            </button>
                            {search && (
                                <div className='flex items-center gap-2 w-full max-w-xl bg-gray-100/70 rounded-xl px-4 h-11 focus-within:ring-2 focus-within:ring-green-300'>
                                    <Search size={18} className='text-gray-400 shrink-0' />
                                    <input
                                        value={search.value}
                                        onChange={(e) => search.onChange(e.target.value)}
                                        placeholder={search.placeholder ?? 'Search...'}
                                        className='w-full bg-transparent outline-none text-sm placeholder:text-gray-400'
                                    />
                                </div>
                            )}
                        </div>

                        <div className='flex items-center gap-4 sm:gap-6 shrink-0'>
                            <Link href='/admin/manage-orders' className='relative w-11 h-11 rounded-full bg-gray-50 flex items-center justify-center hover:bg-gray-100' aria-label='Pending orders'>
                                <Bell size={20} className='text-gray-600' />
                                {pendingCount > 0 && (
                                    <span className='absolute -top-0.5 -right-0.5 min-w-5 h-5 px-1 rounded-full bg-red-500 text-white text-[11px] font-semibold flex items-center justify-center'>
                                        {pendingCount}
                                    </span>
                                )}
                            </Link>
                            <div className='flex items-center gap-3'>
                                {userData?.image ? (
                                    <Image src={userData.image} alt={userData?.name || 'Admin'} width={44} height={44} className='w-11 h-11 rounded-full object-cover' />
                                ) : (
                                    <span className='w-11 h-11 rounded-full bg-green-600 text-white font-semibold flex items-center justify-center'>
                                        {firstName?.[0]?.toUpperCase() || 'A'}
                                    </span>
                                )}
                                <div className='hidden sm:block leading-4'>
                                    <p className='text-sm font-semibold'>{userData?.name || 'Admin'}</p>
                                    <p className='text-xs text-gray-500 mt-0.5'>Admin</p>
                                </div>
                                <ChevronDown size={18} className='hidden sm:block text-gray-500' />
                            </div>
                        </div>
                    </div>
                </header>

                <main className='px-4 sm:px-8 py-6 max-w-350'>{children}</main>
            </div>
        </div>
    )
}

export default AdminShell