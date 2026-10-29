'use client'
import React, { FormEvent, KeyboardEvent, useEffect, useState } from 'react'
import axios from 'axios'
import Image from 'next/image'
import Link from 'next/link'
import { useSelector } from 'react-redux'
import {
  AlertCircle, Bell, Camera, CheckCircle2, ChevronRight, Clock, Eye, EyeOff, Home, Info, Loader,
  Lock, Mail, Package, Phone, RefreshCw, Save, Settings as SettingsIcon, ShieldCheck, Store,
  Truck, UploadCloud, User, X,
} from 'lucide-react'
import AdminShell from '@/components/AdminShell'
import { RootState } from '@/redux/store'

/* ---------------------------------- types --------------------------------- */

interface IStore { name: string; logo: string; address: string; phone: string; currency: string; openTime: string; closeTime: string }
interface IInventory { lowStockThreshold: number; defaultUnit: string; outOfStock: 'hide' | 'show'; maxQtyPerOrder: number }
interface IDelivery { charge: number; freeDeliveryMin: number; minOrderAmount: number; areas: string[]; allowCancel: boolean; cancelWindowMinutes: number }
interface INotifications { newOrder: boolean; pendingReminder: boolean; reminderMinutes: number; lowStock: boolean; email: boolean }
interface ISettings { store: IStore; inventory: IInventory; delivery: IDelivery; notifications: INotifications }

type SectionKey = 'profile' | 'store' | 'inventory' | 'delivery' | 'notifications' | 'security'

const sections: {
  key: SectionKey; title: string; short: string; headline: string; icon: React.ElementType; tone: string
}[] = [
  { key: 'profile', title: 'Profile Settings', short: 'Personal details and password', headline: 'Update your personal information and change your password.', icon: User, tone: 'bg-green-100 text-green-700' },
  { key: 'store', title: 'Store Information', short: 'Name, logo, address and contact', headline: 'Update your store name, logo, address and contact details.', icon: Store, tone: 'bg-blue-100 text-blue-600' },
  { key: 'inventory', title: 'Inventory Settings', short: 'Stock alerts and product preferences', headline: 'Choose how stock alerts and product availability work.', icon: Package, tone: 'bg-orange-100 text-orange-500' },
  { key: 'delivery', title: 'Order & Delivery Settings', short: 'Delivery charges and order rules', headline: 'Set delivery charges, delivery areas and order rules.', icon: Truck, tone: 'bg-purple-100 text-purple-600' },
  { key: 'notifications', title: 'Notification Settings', short: 'Order and stock alerts', headline: 'Choose which order and stock alerts you want to see.', icon: Bell, tone: 'bg-pink-100 text-pink-500' },
  { key: 'security', title: 'Security Settings', short: 'Account protection and access', headline: 'Protect your account and manage who can sign in.', icon: ShieldCheck, tone: 'bg-emerald-100 text-emerald-600' },
]

const units = ["kg", "g", "liter", "ml", "piece", "pack"]
const MAX_IMAGE_MB = 2

const inputClass =
  'w-full border border-gray-200 bg-white rounded-xl px-3.5 py-3 text-sm outline-none placeholder:text-gray-400 focus:border-green-400 focus:ring-2 focus:ring-green-400/30 transition-all disabled:bg-gray-50 disabled:text-gray-500'
const labelClass = 'block text-sm font-medium text-gray-700 mb-1.5'

/* ------------------------------ small pieces ------------------------------ */

const Field = ({ label, htmlFor, hint, children }: { label: string; htmlFor?: string; hint?: string; children: React.ReactNode }) => (
  <div>
    <label htmlFor={htmlFor} className={labelClass}>{label}</label>
    {children}
    {hint && <p className='text-xs text-gray-400 mt-1.5'>{hint}</p>}
  </div>
)

/** Text input with an icon on the left (and an optional button on the right) */
const IconInput = ({
  icon: Icon, trailing, className = '', ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { icon: React.ElementType; trailing?: React.ReactNode }) => (
  <div className='relative'>
    <Icon size={18} className='absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none' />
    <input {...props} className={`${inputClass} pl-10 ${trailing ? 'pr-11' : ''} ${className}`} />
    {trailing && <div className='absolute right-3 top-1/2 -translate-y-1/2'>{trailing}</div>}
  </div>
)

const Toggle = ({ checked, onChange, label, desc }: { checked: boolean; onChange: (v: boolean) => void; label: string; desc?: string }) => (
  <div className='flex items-start justify-between gap-4 py-3.5'>
    <div className='min-w-0'>
      <p className='text-sm font-medium text-gray-800'>{label}</p>
      {desc && <p className='text-xs text-gray-500 mt-0.5'>{desc}</p>}
    </div>
    <button
      type='button'
      role='switch'
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative w-11 h-6 rounded-full shrink-0 transition-colors ${checked ? 'bg-green-600' : 'bg-gray-300'}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : ''}`} />
    </button>
  </div>
)

const InfoBox = ({ children }: { children: React.ReactNode }) => (
  <div className='flex items-start gap-2.5 rounded-xl bg-blue-50 border border-blue-100 text-blue-800 text-xs leading-5 px-3.5 py-3'>
    <Info size={16} className='mt-0.5 shrink-0' />
    <p>{children}</p>
  </div>
)

const SubHeading = ({ children }: { children: React.ReactNode }) => (
  <h3 className='text-base font-semibold text-[#0b5c3b] mb-4'>{children}</h3>
)

const Actions = ({ saving, onReset, label }: { saving: boolean; onReset: () => void; label: string }) => (
  <div className='flex flex-wrap items-center justify-end gap-3 pt-2'>
    <button
      type='button'
      onClick={onReset}
      disabled={saving}
      className='flex items-center gap-2 rounded-xl border-2 border-green-600 text-green-700 font-semibold px-5 py-2.5 text-sm hover:bg-green-50 disabled:opacity-60 transition-colors'
    >
      <RefreshCw size={16} /> Reset
    </button>
    <button
      type='submit'
      disabled={saving}
      className='flex items-center gap-2 rounded-xl bg-green-700 hover:bg-green-800 text-white font-semibold px-5 py-2.5 text-sm shadow-sm disabled:opacity-60 transition-colors'
    >
      {saving ? <><Loader className='w-4 h-4 animate-spin' /> Saving...</> : <><Save size={16} /> {label}</>}
    </button>
  </div>
)

/** Dashed click-or-drop box for choosing an image */
const Dropzone = ({ id, title, onFile }: { id: string; title: string; onFile: (f: File) => void }) => {
  const [drag, setDrag] = useState(false)
  return (
    <>
      <label
        htmlFor={id}
        onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files?.[0]; if (f) onFile(f) }}
        className={`flex items-center gap-4 flex-1 min-w-0 rounded-xl border-2 border-dashed px-5 py-5 cursor-pointer transition-colors ${
          drag ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:bg-gray-50'
        }`}
      >
        <UploadCloud size={34} className='text-gray-400 shrink-0' />
        <span className='min-w-0'>
          <span className='block text-sm font-semibold text-gray-800'>{title}</span>
          <span className='block text-xs text-gray-500 mt-0.5'>Click to upload or drag and drop</span>
          <span className='block text-[11px] text-gray-400'>(JPG, PNG - Max {MAX_IMAGE_MB}MB)</span>
        </span>
      </label>
      <input
        id={id}
        type='file'
        accept='image/png,image/jpeg,image/webp'
        hidden
        onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) onFile(f) }}
      />
    </>
  )
}

const num = (v: string) => (v === '' ? 0 : Math.max(0, Number(v) || 0))

/* -------------------------------- component ------------------------------- */

const Settings = () => {
  const { userData } = useSelector((state: RootState) => state.user)
  const u = userData as { name?: string; email?: string; mobile?: string; image?: string } | null | undefined

  const [section, setSection] = useState<SectionKey>('profile')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // profile
  const [name, setName] = useState('')
  const [mobile, setMobile] = useState('')
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPasswords, setShowPasswords] = useState(false)

  // store-wide settings: last saved copy + editable drafts
  const [saved, setSaved] = useState<ISettings | null>(null)
  const [store, setStore] = useState<IStore | null>(null)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [inventory, setInventory] = useState<IInventory | null>(null)
  const [delivery, setDelivery] = useState<IDelivery | null>(null)
  const [notifications, setNotifications] = useState<INotifications | null>(null)
  const [areaInput, setAreaInput] = useState('')

  useEffect(() => {
    setName(u?.name ?? '')
    setMobile(u?.mobile ?? '')
  }, [u?.name, u?.mobile])

  useEffect(() => {
    const load = async () => {
      try {
        const res = await axios.get<ISettings>('/api/admin/settings')
        setSaved(res.data)
        setStore(res.data.store)
        setInventory(res.data.inventory)
        setDelivery(res.data.delivery)
        setNotifications(res.data.notifications)
      } catch (error) {
        console.log('Failed to load settings', error)
        setNotice({ type: 'error', text: 'Could not load your settings. Please refresh the page.' })
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // free temporary image URLs
  useEffect(() => () => { if (photoPreview) URL.revokeObjectURL(photoPreview) }, [photoPreview])
  useEffect(() => () => { if (logoPreview) URL.revokeObjectURL(logoPreview) }, [logoPreview])

  const show = (type: 'success' | 'error', text: string) => {
    setNotice({ type, text })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const errorText = (error: unknown, fallback: string) =>
    (axios.isAxiosError(error) && error.response?.data?.message) || fallback

  const pickImage = (file: File, kind: 'photo' | 'logo') => {
    if (!file.type.startsWith('image/')) return show('error', 'Please choose an image file (JPG, PNG or WEBP).')
    if (file.size > MAX_IMAGE_MB * 1024 * 1024) return show('error', `Image is too large. Please keep it under ${MAX_IMAGE_MB} MB.`)
    setNotice(null)
    if (kind === 'photo') { setPhoto(file); setPhotoPreview(URL.createObjectURL(file)) }
    else { setLogoFile(file); setLogoPreview(URL.createObjectURL(file)) }
  }

  /* ---------------------------------- reset --------------------------------- */

  const resetSection = (key: SectionKey) => {
    setNotice(null)
    if (key === 'profile') {
      setName(u?.name ?? ''); setMobile(u?.mobile ?? '')
      setPhoto(null); setPhotoPreview(null)
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('')
    }
    if (!saved) return
    if (key === 'store') { setStore(saved.store); setLogoFile(null); setLogoPreview(null) }
    if (key === 'inventory') setInventory(saved.inventory)
    if (key === 'delivery') { setDelivery(saved.delivery); setAreaInput('') }
    if (key === 'notifications') setNotifications(saved.notifications)
  }

  /* ---------------------------------- save ---------------------------------- */

  const saveProfile = async (e: FormEvent) => {
    e.preventDefault()
    setNotice(null)
    if (!name.trim()) return show('error', 'Please enter your name.')
    if (!/^[0-9+\-\s]{7,15}$/.test(mobile.trim())) return show('error', 'Please enter a valid phone number.')

    const changingPassword = !!(currentPassword || newPassword || confirmPassword)
    if (changingPassword) {
      if (!currentPassword || !newPassword || !confirmPassword) return show('error', 'To change your password, fill in all three password fields.')
      if (newPassword.length < 8) return show('error', 'New password must be at least 8 characters.')
      if (newPassword !== confirmPassword) return show('error', 'New password and confirm password do not match.')
    }

    setSaving(true)
    try {
      // password first: a wrong current password should stop everything before anything else changes
      if (changingPassword) {
        await axios.post('/api/admin/change-password', { currentPassword, newPassword })
        setCurrentPassword(''); setNewPassword(''); setConfirmPassword('')
      }
      const fd = new FormData()
      fd.append('name', name.trim())
      fd.append('mobile', mobile.trim())
      if (photo) fd.append('image', photo)
      await axios.patch('/api/admin/profile', fd)
      show('success', 'Profile updated. Refreshing your details...')
      // reload so the top bar and session pick up the new name and photo
      setTimeout(() => window.location.reload(), 900)
    } catch (error) {
      show('error', errorText(error, 'Could not update your profile. Please try again.'))
    } finally {
      setSaving(false)
    }
  }

  const saveSection = async (key: 'store' | 'inventory' | 'delivery' | 'notifications', values: object, label: string) => {
    setNotice(null)
    setSaving(true)
    try {
      const fd = new FormData()
      fd.append('section', key)
      fd.append('values', JSON.stringify(values))
      if (key === 'store' && logoFile) fd.append('logo', logoFile)
      const res = await axios.put<ISettings>('/api/admin/settings', fd)
      setSaved(res.data)
      if (key === 'store') { setStore(res.data.store); setLogoFile(null); setLogoPreview(null) }
      show('success', `${label} saved.`)
    } catch (error) {
      show('error', errorText(error, `Could not save ${label.toLowerCase()}. Please try again.`))
    } finally {
      setSaving(false)
    }
  }

  const addArea = () => {
    const value = areaInput.trim().replace(/,$/, '')
    if (!value || !delivery) return
    if (delivery.areas.some((a) => a.toLowerCase() === value.toLowerCase())) { setAreaInput(''); return }
    setDelivery({ ...delivery, areas: [...delivery.areas, value] })
    setAreaInput('')
  }

  const onAreaKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addArea() }
  }

  const goToPassword = () => {
    setSection('profile')
    setTimeout(() => document.getElementById('password-section')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 60)
  }

  const current = sections.find((s) => s.key === section)!
  const avatarSrc = photoPreview || u?.image

  const skeleton = (
    <div className='space-y-4'>
      {[0, 1, 2].map((i) => <div key={i} className='h-12 bg-gray-100 rounded-xl animate-pulse' />)}
    </div>
  )

  const eye = (
    <button
      type='button'
      onClick={() => setShowPasswords((p) => !p)}
      aria-label={showPasswords ? 'Hide passwords' : 'Show passwords'}
      className='text-gray-400 hover:text-gray-600'
    >
      {showPasswords ? <EyeOff size={17} /> : <Eye size={17} />}
    </button>
  )

  return (
    <AdminShell>
      {/* page header */}
      <div className='flex flex-wrap items-start justify-between gap-3 mb-6'>
        <div className='flex items-center gap-3'>
          <SettingsIcon size={42} className='text-[#0b5c3b] shrink-0' strokeWidth={1.6} />
          <div>
            <h1 className='text-3xl font-bold text-[#0b5c3b] leading-8'>Settings</h1>
            <p className='text-sm text-gray-500 mt-1'>Manage your store preferences and account configuration.</p>
          </div>
        </div>
        <nav aria-label='Breadcrumb' className='flex items-center gap-2 text-sm text-gray-500 pt-2'>
          <Link href='/' aria-label='Home' className='hover:text-green-700'><Home size={16} /></Link>
          <ChevronRight size={14} />
          <Link href='/' className='hover:text-green-700'>Dashboard</Link>
          <ChevronRight size={14} />
          <span className='text-gray-800'>Settings</span>
        </nav>
      </div>

      {notice && (
        <div
          role='status'
          className={`mb-5 flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm ${
            notice.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-100 text-red-600'
          }`}
        >
          {notice.type === 'success' ? <CheckCircle2 size={18} className='mt-0.5 shrink-0' /> : <AlertCircle size={18} className='mt-0.5 shrink-0' />}
          <p className='flex-1'>{notice.text}</p>
          <button onClick={() => setNotice(null)} aria-label='Dismiss' className='opacity-60 hover:opacity-100'><X size={16} /></button>
        </div>
      )}

      <div className='grid grid-cols-1 lg:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[340px_minmax(0,1fr)] gap-5 items-start'>
        {/* section list */}
        <nav aria-label='Settings sections' className='bg-white rounded-2xl border border-gray-100 shadow-sm p-2 flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible'>
          {sections.map((s, i) => {
            const active = section === s.key
            return (
              <React.Fragment key={s.key}>
                {i > 0 && <div className='hidden lg:block mx-3 border-t border-gray-100' />}
                <button
                  onClick={() => { setSection(s.key); setNotice(null) }}
                  aria-current={active ? 'page' : undefined}
                  className={`shrink-0 flex items-center gap-3.5 rounded-xl px-3 py-3 text-left transition-colors ${active ? 'bg-green-50' : 'hover:bg-gray-50'}`}
                >
                  <span className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${active ? 'bg-green-700 text-white' : s.tone}`}>
                    <s.icon size={20} />
                  </span>
                  <span className='min-w-0 flex-1'>
                    <span className={`block text-sm font-semibold whitespace-nowrap lg:whitespace-normal ${active ? 'text-[#0b5c3b]' : 'text-gray-800'}`}>{s.title}</span>
                    <span className='hidden lg:block text-xs text-gray-500 mt-0.5'>{s.short}</span>
                  </span>
                  <ChevronRight size={16} className={`hidden lg:block shrink-0 ${active ? 'text-green-700' : 'text-gray-400'}`} />
                </button>
              </React.Fragment>
            )
          })}
        </nav>

        {/* section content */}
        <section className='bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-7'>
          <div className='flex items-center gap-4 pb-5 mb-6 border-b border-gray-100'>
            <span className='w-14 h-14 rounded-full bg-green-700 text-white flex items-center justify-center shrink-0'>
              <current.icon size={26} />
            </span>
            <div>
              <h2 className='text-xl font-bold text-[#0b5c3b]'>{current.title}</h2>
              <p className='text-sm text-gray-500 mt-0.5'>{current.headline}</p>
            </div>
          </div>

          {/* ------------------------------ profile ------------------------------ */}
          {section === 'profile' && (
            <form onSubmit={saveProfile} className='space-y-7'>
              <div>
                <SubHeading>Profile Photo</SubHeading>
                <div className='flex flex-col sm:flex-row sm:items-center gap-4'>
                  <div className='relative w-24 h-24 shrink-0'>
                    <div className='relative w-24 h-24 rounded-full overflow-hidden bg-green-600 text-white flex items-center justify-center text-3xl font-semibold'>
                      {avatarSrc ? <Image src={avatarSrc} alt='Profile photo' fill sizes='96px' className='object-cover' /> : (name[0]?.toUpperCase() || 'A')}
                    </div>
                    <label
                      htmlFor='photo-badge'
                      className='absolute -bottom-0.5 -right-0.5 w-8 h-8 rounded-full bg-green-600 border-2 border-white text-white flex items-center justify-center cursor-pointer hover:bg-green-700'
                      title='Change photo'
                    >
                      <Camera size={15} />
                    </label>
                    <input id='photo-badge' type='file' accept='image/png,image/jpeg,image/webp' hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) pickImage(f, 'photo') }} />
                  </div>
                  <Dropzone id='photo' title='Change Photo' onFile={(f) => pickImage(f, 'photo')} />
                </div>
              </div>

              <div className='border-t border-gray-100 pt-7'>
                <SubHeading>Personal Information</SubHeading>
                <div className='grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-5'>
                  <Field label='Full Name' htmlFor='name'>
                    <IconInput id='name' icon={User} value={name} onChange={(e) => setName(e.target.value)} />
                  </Field>
                  <Field label='Email Address' htmlFor='email' hint="Your email is your login ID, so it can't be changed here.">
                    <IconInput id='email' icon={Mail} value={u?.email ?? ''} disabled readOnly />
                  </Field>
                  <Field label='Phone Number' htmlFor='mobile'>
                    <IconInput id='mobile' icon={Phone} inputMode='tel' value={mobile} onChange={(e) => setMobile(e.target.value)} />
                  </Field>
                  <Field label='Role' htmlFor='role'>
                    <IconInput id='role' icon={Lock} value='Admin' disabled readOnly />
                  </Field>
                </div>
              </div>

              <div id='password-section' className='border-t border-gray-100 pt-7 scroll-mt-28'>
                <SubHeading>Change Password</SubHeading>
                <p className='text-xs text-gray-500 -mt-2 mb-4'>Leave these empty if you don&apos;t want to change your password. Use at least 8 characters.</p>
                <div className='grid grid-cols-1 md:grid-cols-3 gap-5'>
                  <Field label='Current Password' htmlFor='cur'>
                    <IconInput id='cur' icon={Lock} type={showPasswords ? 'text' : 'password'} autoComplete='current-password' placeholder='Enter current password' value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
                  </Field>
                  <Field label='New Password' htmlFor='new'>
                    <IconInput id='new' icon={Lock} type={showPasswords ? 'text' : 'password'} autoComplete='new-password' placeholder='Enter new password' value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                  </Field>
                  <Field label='Confirm New Password' htmlFor='conf'>
                    <IconInput id='conf' icon={Lock} type={showPasswords ? 'text' : 'password'} autoComplete='new-password' placeholder='Confirm new password' value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} trailing={eye} />
                  </Field>
                </div>
              </div>

              <Actions saving={saving} onReset={() => resetSection('profile')} label='Update Profile' />
            </form>
          )}

          {/* ------------------------------- store ------------------------------- */}
          {section === 'store' && (loading || !store ? skeleton : (
            <form
              onSubmit={(e) => { e.preventDefault(); saveSection('store', store, 'Store information') }}
              className='space-y-7'
            >
              <div>
                <SubHeading>Store Logo</SubHeading>
                <div className='flex flex-col sm:flex-row sm:items-center gap-4'>
                  <div className='relative w-24 h-24 rounded-2xl overflow-hidden bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0'>
                    {logoPreview || store.logo
                      ? <Image src={(logoPreview || store.logo) as string} alt='Store logo' fill sizes='96px' className='object-contain p-2' />
                      : <Store size={32} className='text-gray-300' />}
                  </div>
                  <Dropzone id='logo' title='Change Logo' onFile={(f) => pickImage(f, 'logo')} />
                </div>
              </div>

              <div className='border-t border-gray-100 pt-7'>
                <SubHeading>Store Details</SubHeading>
                <div className='grid grid-cols-1 sm:grid-cols-2 gap-5'>
                  <Field label='Store Name' htmlFor='store-name'>
                    <IconInput id='store-name' icon={Store} value={store.name} onChange={(e) => setStore({ ...store, name: e.target.value })} />
                  </Field>
                  <Field label='Contact Number' htmlFor='store-phone'>
                    <IconInput id='store-phone' icon={Phone} inputMode='tel' value={store.phone} onChange={(e) => setStore({ ...store, phone: e.target.value })} />
                  </Field>
                  <div className='sm:col-span-2'>
                    <Field label='Store Address' htmlFor='store-address'>
                      <textarea id='store-address' rows={3} value={store.address} onChange={(e) => setStore({ ...store, address: e.target.value })} className={`${inputClass} resize-none`} />
                    </Field>
                  </div>
                  <Field label='Opens At' htmlFor='open'>
                    <IconInput id='open' icon={Clock} type='time' value={store.openTime} onChange={(e) => setStore({ ...store, openTime: e.target.value })} />
                  </Field>
                  <Field label='Closes At' htmlFor='close'>
                    <IconInput id='close' icon={Clock} type='time' value={store.closeTime} onChange={(e) => setStore({ ...store, closeTime: e.target.value })} />
                  </Field>
                  <Field label='Currency' htmlFor='currency'>
                    <IconInput id='currency' icon={Lock} value='NPR (Rs)' disabled readOnly />
                  </Field>
                </div>
              </div>

              <Actions saving={saving} onReset={() => resetSection('store')} label='Save Changes' />
            </form>
          ))}

          {/* ----------------------------- inventory ----------------------------- */}
          {section === 'inventory' && (loading || !inventory ? skeleton : (
            <form
              onSubmit={(e) => { e.preventDefault(); saveSection('inventory', inventory, 'Inventory settings') }}
              className='space-y-6'
            >
              <InfoBox>Your products don&apos;t track stock yet. These settings are saved now and will start working once a stock count is added to each product.</InfoBox>
              <div className='grid grid-cols-1 sm:grid-cols-2 gap-5'>
                <Field label='Low-Stock Alert At' htmlFor='low' hint='Alert when stock goes at or below this number.'>
                  <input id='low' inputMode='numeric' value={inventory.lowStockThreshold || ''} placeholder='0' onChange={(e) => setInventory({ ...inventory, lowStockThreshold: num(e.target.value) })} className={inputClass} />
                </Field>
                <Field label='Default Unit' htmlFor='unit' hint='Pre-selected when you add a grocery.'>
                  <select id='unit' value={inventory.defaultUnit} onChange={(e) => setInventory({ ...inventory, defaultUnit: e.target.value })} className={inputClass}>
                    <option value=''>No default</option>
                    {units.map((x) => <option key={x} value={x}>{x}</option>)}
                  </select>
                </Field>
                <Field label='Max Quantity Per Order' htmlFor='maxqty' hint='Use 0 for no limit.'>
                  <input id='maxqty' inputMode='numeric' value={inventory.maxQtyPerOrder || ''} placeholder='0' onChange={(e) => setInventory({ ...inventory, maxQtyPerOrder: num(e.target.value) })} className={inputClass} />
                </Field>
              </div>
              <fieldset>
                <legend className={labelClass}>When a product is out of stock</legend>
                <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
                  {([
                    { v: 'show', t: 'Show it as unavailable', d: 'Customers can still see it but cannot order.' },
                    { v: 'hide', t: 'Hide it from the store', d: 'It disappears until it is back in stock.' },
                  ] as const).map((o) => (
                    <label key={o.v} className={`flex items-start gap-3 rounded-xl border px-3.5 py-3 cursor-pointer transition-colors ${inventory.outOfStock === o.v ? 'border-green-400 bg-green-50/50' : 'border-gray-200 hover:bg-gray-50'}`}>
                      <input type='radio' name='oos' checked={inventory.outOfStock === o.v} onChange={() => setInventory({ ...inventory, outOfStock: o.v })} className='mt-1 accent-green-600' />
                      <span><span className='block text-sm font-medium text-gray-800'>{o.t}</span><span className='block text-xs text-gray-500'>{o.d}</span></span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <Actions saving={saving} onReset={() => resetSection('inventory')} label='Save Changes' />
            </form>
          ))}

          {/* ------------------------------ delivery ----------------------------- */}
          {section === 'delivery' && (loading || !delivery ? skeleton : (
            <form
              onSubmit={(e) => { e.preventDefault(); saveSection('delivery', delivery, 'Order and delivery settings') }}
              className='space-y-6'
            >
              <InfoBox>These values are saved here. Your checkout and cancel-order code must read them to apply the charges and rules to real orders.</InfoBox>
              <div className='grid grid-cols-1 sm:grid-cols-3 gap-5'>
                <Field label='Delivery Charge (Rs)' htmlFor='charge'>
                  <input id='charge' inputMode='decimal' value={delivery.charge || ''} placeholder='0' onChange={(e) => setDelivery({ ...delivery, charge: num(e.target.value) })} className={inputClass} />
                </Field>
                <Field label='Free Delivery Above (Rs)' htmlFor='free' hint='0 = never free'>
                  <input id='free' inputMode='decimal' value={delivery.freeDeliveryMin || ''} placeholder='0' onChange={(e) => setDelivery({ ...delivery, freeDeliveryMin: num(e.target.value) })} className={inputClass} />
                </Field>
                <Field label='Minimum Order (Rs)' htmlFor='min' hint='0 = no minimum'>
                  <input id='min' inputMode='decimal' value={delivery.minOrderAmount || ''} placeholder='0' onChange={(e) => setDelivery({ ...delivery, minOrderAmount: num(e.target.value) })} className={inputClass} />
                </Field>
              </div>

              <Field label='Delivery Areas' htmlFor='area' hint='Type an area and press Enter. Leave empty to deliver everywhere.'>
                <div className='flex gap-2'>
                  <input id='area' value={areaInput} onChange={(e) => setAreaInput(e.target.value)} onKeyDown={onAreaKey} placeholder='e.g. Birgunj, Parsa' className={inputClass} />
                  <button type='button' onClick={addArea} className='shrink-0 rounded-xl border border-gray-200 px-4 text-sm font-semibold text-gray-700 hover:bg-gray-50'>Add</button>
                </div>
                {delivery.areas.length > 0 && (
                  <div className='flex flex-wrap gap-2 mt-3'>
                    {delivery.areas.map((a) => (
                      <span key={a} className='inline-flex items-center gap-1.5 text-xs font-medium text-green-700 bg-green-50 border border-green-100 rounded-full pl-3 pr-1.5 py-1'>
                        {a}
                        <button type='button' aria-label={`Remove ${a}`} onClick={() => setDelivery({ ...delivery, areas: delivery.areas.filter((x) => x !== a) })} className='w-5 h-5 rounded-full hover:bg-green-100 flex items-center justify-center'>
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </Field>

              <div className='divide-y divide-gray-100 border-y border-gray-100'>
                <Toggle
                  checked={delivery.allowCancel}
                  onChange={(v) => setDelivery({ ...delivery, allowCancel: v })}
                  label='Let customers cancel orders'
                  desc='Only while the order is still pending.'
                />
              </div>
              {delivery.allowCancel && (
                <Field label='Cancellation Window (minutes)' htmlFor='window' hint='0 = until the order leaves for delivery.'>
                  <input id='window' inputMode='numeric' value={delivery.cancelWindowMinutes || ''} placeholder='0' onChange={(e) => setDelivery({ ...delivery, cancelWindowMinutes: num(e.target.value) })} className={`${inputClass} max-w-48`} />
                </Field>
              )}
              <Actions saving={saving} onReset={() => resetSection('delivery')} label='Save Changes' />
            </form>
          ))}

          {/* ---------------------------- notifications -------------------------- */}
          {section === 'notifications' && (loading || !notifications ? skeleton : (
            <form
              onSubmit={(e) => { e.preventDefault(); saveSection('notifications', notifications, 'Notification settings') }}
              className='space-y-5'
            >
              <div className='divide-y divide-gray-100 border-y border-gray-100'>
                <Toggle checked={notifications.newOrder} onChange={(v) => setNotifications({ ...notifications, newOrder: v })} label='New order alerts' desc='Show a count on the bell when new orders arrive.' />
                <Toggle checked={notifications.pendingReminder} onChange={(v) => setNotifications({ ...notifications, pendingReminder: v })} label='Pending order reminders' desc='Remind you about orders that have been waiting too long.' />
                {notifications.pendingReminder && (
                  <div className='py-3.5'>
                    <Field label='Remind me after (minutes)' htmlFor='remind'>
                      <input id='remind' inputMode='numeric' value={notifications.reminderMinutes || ''} placeholder='30' onChange={(e) => setNotifications({ ...notifications, reminderMinutes: num(e.target.value) })} className={`${inputClass} max-w-48`} />
                    </Field>
                  </div>
                )}
                <Toggle checked={notifications.lowStock} onChange={(v) => setNotifications({ ...notifications, lowStock: v })} label='Low-stock alerts' desc='Needs stock tracking on your products.' />
                <Toggle checked={notifications.email} onChange={(v) => setNotifications({ ...notifications, email: v })} label='Email notifications' desc='Needs an email service to be set up before emails are sent.' />
              </div>
              <Actions saving={saving} onReset={() => resetSection('notifications')} label='Save Changes' />
            </form>
          ))}

          {/* ------------------------------ security ----------------------------- */}
          {section === 'security' && (
            <div className='space-y-7'>
              <div>
                <SubHeading>Password</SubHeading>
                <div className='flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 px-4 py-3.5'>
                  <div className='flex items-center gap-3'>
                    <span className='w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center'><Lock size={18} /></span>
                    <div>
                      <p className='text-sm font-medium text-gray-800'>Account password</p>
                      <p className='text-xs text-gray-500'>You can change it from Profile Settings.</p>
                    </div>
                  </div>
                  <button type='button' onClick={goToPassword} className='text-sm font-semibold text-green-700 hover:text-green-800'>Change password</button>
                </div>
              </div>

              <div className='border-t border-gray-100 pt-7'>
                <SubHeading>Not available yet</SubHeading>
                <ul className='divide-y divide-gray-100 border-y border-gray-100 text-sm text-gray-600'>
                  {['Log out from other devices', 'Two-factor authentication', 'Manage other admin accounts'].map((t) => (
                    <li key={t} className='flex items-center justify-between py-3.5'>
                      <span>{t}</span>
                      <span className='text-[11px] font-medium bg-gray-100 text-gray-500 px-2.5 py-0.5 rounded-full'>Coming soon</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </section>
      </div>
    </AdminShell>
  )
}

export default Settings