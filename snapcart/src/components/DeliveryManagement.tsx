'use client'
import React, { FormEvent, useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import Image from 'next/image'
import { AnimatePresence, motion } from 'motion/react'
import {
  AlertCircle, CalendarDays, Camera, CheckCircle2, ChevronLeft, ChevronRight, Loader, MapPin, Package,
  Pencil, Phone, Plus, Search, SearchX, Truck, User, UserCheck, Users, X,
} from 'lucide-react'
import AdminShell from '@/components/AdminShell'

/* ---------------------------------- types --------------------------------- */

type DStatus = 'pending' | 'out for delivery' | 'delivered' | 'failed'
type BoyStatus = 'available' | 'on' | 'inactive'

interface IOrderItem { name: string; price: string; unit: string; image: string; quantity: number }
interface IOrder {
  _id: string
  user?: { name?: string; mobile?: string; email?: string }
  items: IOrderItem[]
  totalAmount: number
  paymentMethod: 'cod' | 'online'
  isPaid: boolean
  status: 'pending' | 'out of delivery' | 'delivered'
  address: { fullName: string; mobile?: string; fullAddress?: string; city?: string; state?: string; pincode?: string }
  createdAt: string
}
interface IBoy { _id: string; name: string; phone: string; image?: string; isActive: boolean; email?: string; user?: string | null }
interface IDelivery { _id: string; order: string; deliveryBoy: string; status: DStatus; assignedAt: string }

interface IRejection { order: string; boyName: string; reason?: string; createdAt: string }

interface Row { order: IOrder; rec?: IDelivery; boy?: IBoy; st: DStatus; rejection?: IRejection }
interface BoyStat { active: number; onDelivery: number; completed: number; failed: number; total: number; status: BoyStatus }

/* --------------------------------- helpers -------------------------------- */

const statusMeta: Record<DStatus, { label: string; tab: string; badge: string; dot: string }> = {
  pending: { label: 'Pending Delivery', tab: 'Pending', badge: 'bg-amber-100 text-amber-700', dot: 'bg-amber-400' },
  'out for delivery': { label: 'Out for Delivery', tab: 'Out for Delivery', badge: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500' },
  delivered: { label: 'Delivered', tab: 'Delivered', badge: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
  failed: { label: 'Failed Delivery', tab: 'Failed', badge: 'bg-red-100 text-red-600', dot: 'bg-red-500' },
}

const boyStatusMeta: Record<BoyStatus, { label: string; badge: string }> = {
  available: { label: 'Available', badge: 'bg-green-100 text-green-700' },
  on: { label: 'On Delivery', badge: 'bg-blue-100 text-blue-700' },
  inactive: { label: 'Inactive', badge: 'bg-gray-100 text-gray-500' },
}

// What the order's own status becomes when a delivery status changes
const orderStatusFor: Record<DStatus, 'pending' | 'out of delivery' | 'delivered'> = {
  pending: 'pending',
  'out for delivery': 'out of delivery',
  delivered: 'delivered',
  failed: 'pending',
}

// The status shown for an order, using both the delivery record and the order itself
const effectiveStatus = (order: IOrder, rec?: IDelivery): DStatus => {
  if (order.status === 'delivered' || rec?.status === 'delivered') return 'delivered'
  if (rec?.status === 'failed' && order.status === 'pending') return 'failed'
  if (order.status === 'out of delivery' || rec?.status === 'out for delivery') return 'out for delivery'
  return 'pending'
}

const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString()
const PAGE_SIZE = 8

const inputClass =
  'w-full border border-gray-200 bg-white rounded-xl px-3.5 py-2.5 text-sm outline-none placeholder:text-gray-400 focus:border-green-400 focus:ring-2 focus:ring-green-400/30 transition-all'

const errorText = (error: unknown, fallback: string) =>
  (axios.isAxiosError(error) && error.response?.data?.message) || fallback

/* ------------------------------ small pieces ------------------------------ */

const Avatar = ({ boy, size = 40 }: { boy?: IBoy; size?: number }) => (
  <span style={{ width: size, height: size }} className='relative rounded-full overflow-hidden bg-green-600 text-white font-semibold flex items-center justify-center shrink-0 text-sm'>
    {boy?.image
      ? <Image src={boy.image} alt={boy.name} fill sizes={`${size}px`} className='object-cover' />
      : (boy?.name?.[0]?.toUpperCase() ?? <User size={size / 2} />)}
  </span>
)

const Modal = ({ children, onClose, label }: { children: React.ReactNode; onClose: () => void; label: string }) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className='fixed inset-0 z-100 flex items-center justify-center bg-black/40 px-4'
      onClick={onClose}
    >
      <motion.div
        role='dialog'
        aria-modal='true'
        aria-label={label}
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.2 }}
        className='bg-white w-full max-w-lg rounded-2xl p-5 sm:p-6 max-h-[90vh] overflow-y-auto shadow-xl'
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </motion.div>
    </motion.div>
  )
}

const Pager = ({ page, total, from, to, count, onPage }: { page: number; total: number; from: number; to: number; count: number; onPage: (p: number) => void }) => (
  <div className='flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 px-5 py-3'>
    <p className='text-xs text-gray-500'>Showing {from}-{to} of {count}</p>
    {total > 1 && (
      <div className='flex items-center gap-2'>
        <button onClick={() => onPage(page - 1)} disabled={page === 1} aria-label='Previous page' className='w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 disabled:opacity-40'>
          <ChevronLeft size={16} />
        </button>
        <span className='text-sm text-gray-600 px-1'>Page {page} of {total}</span>
        <button onClick={() => onPage(page + 1)} disabled={page === total} aria-label='Next page' className='w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 disabled:opacity-40'>
          <ChevronRight size={16} />
        </button>
      </div>
    )}
  </div>
)

/* ---------------------------- add / edit delivery boy --------------------- */

const BoyModal = ({
  boy, activeOrders, onClose, onSave,
}: { boy?: IBoy; activeOrders: number; onClose: () => void; onSave: (fd: FormData) => Promise<void> }) => {
  const [name, setName] = useState(boy?.name ?? '')
  const [phone, setPhone] = useState(boy?.phone ?? '')
  const [isActive, setIsActive] = useState(boy?.isActive ?? true)
  const [email, setEmail] = useState(boy?.email ?? '')
  const [password, setPassword] = useState('')
  const hasLogin = !!boy?.user
  const [photo, setPhoto] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview) }, [preview])

  const pick = (file?: File) => {
    if (!file) return
    if (!file.type.startsWith('image/')) return setError('Please choose an image file.')
    if (file.size > 2 * 1024 * 1024) return setError('Photo is too large. Please keep it under 2 MB.')
    setError('')
    setPhoto(file)
    setPreview(URL.createObjectURL(file))
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (!name.trim()) return setError('Please enter a name.')
    if (!/^[0-9+\-\s]{7,15}$/.test(phone.trim())) return setError('Please enter a valid phone number.')
    // a new delivery boy always needs a login; an older one only if the admin starts filling it in
    const wantsLogin = !boy || hasLogin || email.trim() !== '' || password !== ''
    if (wantsLogin) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setError('Please enter a valid email address.')
      if ((!hasLogin || password !== '') && password.length < 8) return setError('Password must be at least 8 characters.')
    }
    if (boy && !isActive && boy.isActive && activeOrders > 0) {
      return setError(`${boy.name} still has ${activeOrders} active ${activeOrders === 1 ? 'order' : 'orders'}. Assign them to someone else before deactivating.`)
    }
    setSaving(true)
    try {
      const fd = new FormData()
      fd.append('name', name.trim())
      fd.append('phone', phone.trim())
      if (boy) fd.append('isActive', String(isActive))
      if (wantsLogin) {
        fd.append('email', email.trim())
        if (password) fd.append('password', password)
      }
      if (photo) fd.append('image', photo)
      await onSave(fd)
    } catch (err) {
      setError(errorText(err, 'Could not save. Please try again.'))
      setSaving(false)
    }
  }

  const shown = preview || boy?.image

  return (
    <Modal onClose={() => { if (!saving) onClose() }} label={boy ? 'Edit delivery boy' : 'Add delivery boy'}>
      <div className='flex items-start justify-between gap-3 mb-5'>
        <div>
          <h3 className='text-lg font-bold text-[#0b5c3b]'>{boy ? 'Edit Delivery Boy' : 'Add Delivery Boy'}</h3>
          <p className='text-xs text-gray-500 mt-0.5'>The delivery boy signs in with the email and password below. You assign their orders yourself.</p>
        </div>
        <button onClick={onClose} disabled={saving} aria-label='Close' className='text-gray-400 hover:text-gray-600'><X size={20} /></button>
      </div>

      <form onSubmit={submit} className='space-y-4'>
        <div className='flex items-center gap-4'>
          <div className='relative w-20 h-20 shrink-0'>
            <span className='relative w-20 h-20 rounded-full overflow-hidden bg-green-600 text-white text-2xl font-semibold flex items-center justify-center'>
              {shown ? <Image src={shown} alt='Photo' fill sizes='80px' className='object-cover' /> : (name[0]?.toUpperCase() || <User size={30} />)}
            </span>
            <label htmlFor='boy-photo' className='absolute -bottom-0.5 -right-0.5 w-8 h-8 rounded-full bg-green-600 border-2 border-white text-white flex items-center justify-center cursor-pointer hover:bg-green-700' title='Choose photo'>
              <Camera size={15} />
            </label>
            <input id='boy-photo' type='file' accept='image/png,image/jpeg,image/webp' hidden onChange={(e) => { pick(e.target.files?.[0]); e.target.value = '' }} />
          </div>
          <p className='text-xs text-gray-500'>Profile photo (optional)<br />JPG, PNG or WEBP, up to 2 MB</p>
        </div>

        <div>
          <label htmlFor='boy-name' className='block text-sm font-medium text-gray-700 mb-1.5'>Name</label>
          <input id='boy-name' value={name} onChange={(e) => setName(e.target.value)} placeholder='e.g. Ram Kumar' className={inputClass} />
        </div>
        <div>
          <label htmlFor='boy-phone' className='block text-sm font-medium text-gray-700 mb-1.5'>Phone number</label>
          <input id='boy-phone' inputMode='tel' value={phone} onChange={(e) => setPhone(e.target.value)} placeholder='e.g. 9801234567' className={inputClass} />
        </div>

        <div className='rounded-xl border border-gray-200 p-4 space-y-3'>
          <div>
            <p className='text-sm font-semibold text-gray-800'>Login details</p>
            <p className='text-xs text-gray-500 mt-0.5'>
              {boy && !hasLogin
                ? 'This delivery boy has no login yet. Add an email and password so they can sign in.'
                : 'Share these with the delivery boy so they can sign in and see their orders.'}
            </p>
          </div>
          <div>
            <label htmlFor='boy-email' className='block text-sm font-medium text-gray-700 mb-1.5'>Email</label>
            <input id='boy-email' type='email' autoComplete='off' value={email} onChange={(e) => setEmail(e.target.value)} placeholder='e.g. ram@example.com' className={inputClass} />
          </div>
          <div>
            <label htmlFor='boy-password' className='block text-sm font-medium text-gray-700 mb-1.5'>{hasLogin ? 'New password' : 'Password'}</label>
            <div className='flex gap-2'>
              <input id='boy-password' type='text' autoComplete='off' value={password} onChange={(e) => setPassword(e.target.value)} placeholder={hasLogin ? 'Leave blank to keep the current one' : 'At least 8 characters'} className={inputClass} />
              <button
                type='button'
                onClick={() => setPassword(Array.from(crypto.getRandomValues(new Uint8Array(10)), (b) => 'abcdefghjkmnpqrstuvwxyz23456789'[b % 31]).join(''))}
                className='shrink-0 text-xs font-semibold border border-gray-200 text-gray-700 px-3 rounded-xl hover:bg-gray-50'
              >
                Generate
              </button>
            </div>
          </div>
        </div>

        {boy && (
          <div className='flex items-start justify-between gap-4 rounded-xl border border-gray-200 px-4 py-3'>
            <div>
              <p className='text-sm font-medium text-gray-800'>Active</p>
              <p className='text-xs text-gray-500'>Turn off to deactivate. Inactive boys can&apos;t get new orders.</p>
            </div>
            <button
              type='button'
              role='switch'
              aria-checked={isActive}
              aria-label='Active'
              onClick={() => setIsActive((v) => !v)}
              className={`relative w-11 h-6 rounded-full shrink-0 transition-colors ${isActive ? 'bg-green-600' : 'bg-gray-300'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${isActive ? 'translate-x-5' : ''}`} />
            </button>
          </div>
        )}

        {error && <p role='alert' className='text-sm text-red-600'>{error}</p>}

        <div className='flex gap-3 pt-1'>
          <button type='button' onClick={onClose} disabled={saving} className='flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-50 disabled:opacity-50'>Cancel</button>
          <button type='submit' disabled={saving} className='flex-1 flex items-center justify-center gap-2 bg-green-700 hover:bg-green-800 text-white py-2.5 rounded-xl text-sm font-semibold disabled:opacity-60'>
            {saving ? <><Loader className='w-4 h-4 animate-spin' /> Saving...</> : boy ? 'Save Changes' : 'Add Delivery Boy'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

/* ---------------------------- assign / manage one order ------------------- */

const OrderModal = ({
  row, boys, stats, busy, error, onClose, onAssign, onStatus,
}: {
  row: Row
  boys: IBoy[]
  stats: Record<string, BoyStat>
  busy: boolean
  error: string
  onClose: () => void
  onAssign: (boyId: string) => void
  onStatus: (status: DStatus) => void
}) => {
  const { order, rec, boy, st } = row
  const [selected, setSelected] = useState('')
  const [reassign, setReassign] = useState(false)

  const needsAssign = !rec && st !== 'delivered'
  const canReassign = !!rec && (st === 'pending' || st === 'failed')
  const showPicker = needsAssign || (canReassign && (st === 'failed' || reassign))

  const activeBoys = boys
    .filter((b) => b.isActive)
    .sort((a, b) => Number(stats[a._id]?.status === 'on') - Number(stats[b._id]?.status === 'on'))

  const address = [order.address.fullAddress, order.address.city, order.address.state, order.address.pincode].filter(Boolean).join(', ')
  const customer = order.user?.name || order.address.fullName
  const phone = order.address.mobile || order.user?.mobile

  return (
    <Modal onClose={() => { if (!busy) onClose() }} label='Order delivery'>
      <div className='flex items-start justify-between gap-3 mb-4'>
        <div>
          <h3 className='text-lg font-bold text-[#0b5c3b]'>Order #{order._id.slice(-6)}</h3>
          <span className={`inline-block mt-1.5 text-xs font-medium px-2.5 py-0.5 rounded-full ${statusMeta[st].badge}`}>{statusMeta[st].label}</span>
        </div>
        <button onClick={onClose} disabled={busy} aria-label='Close' className='text-gray-400 hover:text-gray-600'><X size={20} /></button>
      </div>

      {/* customer + address */}
      <div className='rounded-xl bg-gray-50/80 p-4 space-y-2 text-sm text-gray-600'>
        <p className='flex items-center gap-2'><User size={14} className='text-green-600 shrink-0' /><span className='font-medium text-gray-800'>{customer}</span></p>
        {phone && <p className='flex items-center gap-2'><Phone size={14} className='text-green-600 shrink-0' />{phone}</p>}
        {address && <p className='flex items-start gap-2'><MapPin size={14} className='text-green-600 shrink-0 mt-0.5' /><span className='min-w-0 wrap-break-word'>{address}</span></p>}
      </div>

      {/* items */}
      <div className='mt-4'>
        <p className='text-xs font-semibold text-[#0b5c3b] mb-2'>{order.items.length} {order.items.length === 1 ? 'item' : 'items'}</p>
        <div className='space-y-2'>
          {order.items.map((it, i) => (
            <div key={i} className='flex items-center gap-3 text-sm'>
              <span className='relative w-9 h-9 rounded-lg overflow-hidden bg-gray-50 border border-gray-100 shrink-0'>
                {it.image && <Image src={it.image} alt={it.name} fill sizes='36px' className='object-contain p-1' />}
              </span>
              <span className='flex-1 min-w-0 truncate text-gray-800'>{it.name}</span>
              <span className='text-xs text-gray-400 shrink-0'>{it.quantity} {it.unit}</span>
            </div>
          ))}
        </div>
        <div className='flex items-center justify-between mt-3 pt-3 border-t border-gray-100 text-sm'>
          <span className='text-gray-500'>{order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Online Payment'} · {order.isPaid ? 'Paid' : 'Unpaid'}</span>
          <span className='font-semibold text-gray-800'>Rs {order.totalAmount}</span>
        </div>
      </div>

      {/* a delivery boy said no to this order */}
      {!rec && row.rejection && (
        <p className='mt-4 text-xs text-red-700 bg-red-50 border border-red-100 rounded-xl px-3.5 py-2.5'>
          Rejected by {row.rejection.boyName}{row.rejection.reason ? `: ${row.rejection.reason}` : '.'} Please assign another delivery boy.
        </p>
      )}

      {/* current delivery boy */}
      {boy && (
        <div className='mt-4 flex items-center gap-3 rounded-xl border border-gray-200 px-4 py-3'>
          <Avatar boy={boy} size={40} />
          <div className='min-w-0 flex-1'>
            <p className='text-xs text-gray-500'>Delivery boy</p>
            <p className='text-sm font-semibold text-gray-800 truncate'>{boy.name}</p>
            <p className='text-xs text-gray-500'>{boy.phone}</p>
          </div>
          {canReassign && st === 'pending' && !reassign && (
            <button onClick={() => setReassign(true)} className='text-xs font-semibold text-green-700 hover:text-green-800'>Change</button>
          )}
        </div>
      )}

      {/* pick a delivery boy */}
      {showPicker && (
        <div className='mt-4'>
          <p className='text-sm font-semibold text-gray-800 mb-2'>{rec ? 'Choose another delivery boy' : 'Choose a delivery boy'}</p>
          {activeBoys.length === 0 ? (
            <p className='text-sm text-gray-500 rounded-xl border border-dashed border-gray-300 px-4 py-4 text-center'>No active delivery boys yet. Add one first.</p>
          ) : (
            <div className='space-y-2 max-h-56 overflow-y-auto pr-1'>
              {activeBoys.map((b) => {
                const bs = stats[b._id]
                const meta = boyStatusMeta[bs?.status ?? 'available']
                return (
                  <label key={b._id} className={`flex items-center gap-3 rounded-xl border px-3.5 py-2.5 cursor-pointer transition-colors ${selected === b._id ? 'border-green-400 bg-green-50/60' : 'border-gray-200 hover:bg-gray-50'}`}>
                    <input type='radio' name='boy' value={b._id} checked={selected === b._id} onChange={() => setSelected(b._id)} className='accent-green-600' />
                    <Avatar boy={b} size={36} />
                    <span className='min-w-0 flex-1'>
                      <span className='block text-sm font-medium text-gray-800 truncate'>{b.name}</span>
                      <span className='block text-xs text-gray-500'>{b.phone} · {bs?.active ?? 0} active{b.user ? '' : ' · no login'}</span>
                    </span>
                    <span className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full shrink-0 ${meta.badge}`}>{meta.label}</span>
                  </label>
                )
              })}
            </div>
          )}
          <button
            onClick={() => onAssign(selected)}
            disabled={!selected || busy}
            className='mt-3 w-full flex items-center justify-center gap-2 bg-green-700 hover:bg-green-800 text-white py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50'
          >
            {busy ? <><Loader className='w-4 h-4 animate-spin' /> Assigning...</> : 'Assign Delivery Boy'}
          </button>
        </div>
      )}

      {/* update the delivery status */}
      {rec && st === 'pending' && !reassign && (
        <button onClick={() => onStatus('out for delivery')} disabled={busy} className='mt-4 w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl text-sm font-semibold disabled:opacity-60'>
          {busy ? <Loader className='w-4 h-4 animate-spin' /> : <Truck size={16} />} Mark as Out for Delivery
        </button>
      )}
      {rec && st === 'out for delivery' && (
        <div className='mt-4 grid grid-cols-2 gap-3'>
          <button onClick={() => onStatus('delivered')} disabled={busy} className='flex items-center justify-center gap-2 bg-green-700 hover:bg-green-800 text-white py-2.5 rounded-xl text-sm font-semibold disabled:opacity-60'>
            {busy ? <Loader className='w-4 h-4 animate-spin' /> : <CheckCircle2 size={16} />} Delivered
          </button>
          <button onClick={() => onStatus('failed')} disabled={busy} className='flex items-center justify-center gap-2 border border-red-200 text-red-600 hover:bg-red-50 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-60'>
            <X size={16} /> Failed
          </button>
        </div>
      )}
      {!rec && st === 'out for delivery' && (
        <p className='mt-3 text-xs text-blue-800 bg-blue-50 border border-blue-100 rounded-xl px-3.5 py-2.5'>
          This order was marked out for delivery from Manage Orders. Assign a delivery boy to start tracking it here.
        </p>
      )}

      {error && <p role='alert' className='mt-3 text-sm text-red-600'>{error}</p>}
    </Modal>
  )
}

/* -------------------------------- component ------------------------------- */

const DeliveryManagement = () => {
  const [orders, setOrders] = useState<IOrder[]>([])
  const [boys, setBoys] = useState<IBoy[]>([])
  const [deliveries, setDeliveries] = useState<IDelivery[]>([])
  const [rejections, setRejections] = useState<IRejection[]>([])
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [boySearch, setBoySearch] = useState('')
  const [boyFilter, setBoyFilter] = useState<'all' | BoyStatus>('all')
  const [boyPage, setBoyPage] = useState(1)
  const [tab, setTab] = useState<'all' | DStatus>('all')
  const [page, setPage] = useState(1)

  const [boyModal, setBoyModal] = useState<{ boy?: IBoy } | null>(null)
  const [orderModalId, setOrderModalId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [modalError, setModalError] = useState('')

  useEffect(() => {
    const load = async () => {
      const [o, b, d, r] = await Promise.allSettled([
        axios.get('/api/admin/get-orders'),
        axios.get('/api/admin/delivery-boys'),
        axios.get('/api/admin/deliveries'),
        axios.get('/api/admin/delivery-rejections'),
      ])
      let failed = false
      if (o.status === 'fulfilled') setOrders(o.value.data); else failed = true
      if (b.status === 'fulfilled') setBoys(b.value.data); else failed = true
      if (d.status === 'fulfilled') setDeliveries(d.value.data); else failed = true
      if (r.status === 'fulfilled') setRejections(r.value.data) // only a hint, so a failure here is not an error
      if (failed) setNotice({ type: 'error', text: 'Some data could not be loaded. Please refresh the page.' })
      setLoading(false)
    }
    load()
  }, [])

  useEffect(() => { setPage(1) }, [tab])
  useEffect(() => { setBoyPage(1) }, [boySearch, boyFilter])

  const show = (type: 'success' | 'error', text: string) => {
    setNotice({ type, text })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  /* ------------------------------- derived data ------------------------------ */

  // Online orders are hidden until paid, the same rule as Manage Orders
  const validOrders = useMemo(
    () =>
      orders
        .filter((o) => o.paymentMethod === 'cod' || o.isPaid)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [orders]
  )

  const rows: Row[] = useMemo(() => {
    const recByOrder = new Map(deliveries.map((d) => [String(d.order), d]))
    const boyById = new Map(boys.map((b) => [b._id, b]))
    // newest rejection per order (the list comes newest first)
    const rejectionByOrder = new Map<string, IRejection>()
    rejections.forEach((x) => { if (!rejectionByOrder.has(String(x.order))) rejectionByOrder.set(String(x.order), x) })
    return validOrders.map((order) => {
      const rec = recByOrder.get(order._id)
      return {
        order,
        rec,
        boy: rec ? boyById.get(String(rec.deliveryBoy)) : undefined,
        st: effectiveStatus(order, rec),
        rejection: rec ? undefined : rejectionByOrder.get(order._id),
      }
    })
  }, [validOrders, deliveries, boys, rejections])

  const stats: Record<string, BoyStat> = useMemo(() => {
    const result: Record<string, BoyStat> = {}
    boys.forEach((b) => { result[b._id] = { active: 0, onDelivery: 0, completed: 0, failed: 0, total: 0, status: 'available' } })
    rows.forEach((r) => {
      if (!r.rec) return
      const s = result[String(r.rec.deliveryBoy)]
      if (!s) return
      s.total += 1
      if (r.st === 'delivered') s.completed += 1
      else if (r.st === 'failed') s.failed += 1
      else { s.active += 1; if (r.st === 'out for delivery') s.onDelivery += 1 }
    })
    boys.forEach((b) => {
      const s = result[b._id]
      s.status = !b.isActive ? 'inactive' : s.onDelivery > 0 ? 'on' : 'available'
    })
    return result
  }, [boys, rows])

  const today = new Date()
  const todayOrders = validOrders.filter((o) => sameDay(new Date(o.createdAt), today)).length
  const delivered = rows.filter((r) => r.st === 'delivered').length
  const failedCount = rows.filter((r) => r.st === 'failed').length
  const assignedTotal = rows.filter((r) => r.rec).length
  const availableNow = boys.filter((b) => stats[b._id]?.status === 'available').length

  const cards = [
    { label: 'Total Delivery Boys', value: boys.length, hint: 'Registered', icon: Users, card: 'from-green-50 to-white border-green-100', tint: 'bg-green-500 text-white' },
    { label: 'Available Now', value: availableNow, hint: 'Ready for orders', icon: UserCheck, card: 'from-blue-50 to-white border-blue-100', tint: 'bg-blue-500 text-white' },
    { label: "Today's Deliveries", value: todayOrders, hint: 'Orders placed today', icon: CalendarDays, card: 'from-amber-50 to-white border-amber-100', tint: 'bg-amber-400 text-white' },
    { label: 'Successful Deliveries', value: delivered, hint: 'Delivered so far', icon: CheckCircle2, card: 'from-purple-50 to-white border-purple-100', tint: 'bg-purple-500 text-white' },
  ]

  // delivery personnel list
  const visibleBoys = useMemo(() => {
    const q = boySearch.trim().toLowerCase()
    return boys.filter((b) =>
      (boyFilter === 'all' || stats[b._id]?.status === boyFilter) &&
      (q === '' || b.name.toLowerCase().includes(q) || b.phone.includes(q))
    )
  }, [boys, boySearch, boyFilter, stats])
  const boyPages = Math.max(1, Math.ceil(visibleBoys.length / PAGE_SIZE))
  const safeBoyPage = Math.min(boyPage, boyPages)
  const boyItems = visibleBoys.slice((safeBoyPage - 1) * PAGE_SIZE, safeBoyPage * PAGE_SIZE)

  // manage deliveries list
  const tabCounts = {
    all: rows.length,
    pending: rows.filter((r) => r.st === 'pending').length,
    'out for delivery': rows.filter((r) => r.st === 'out for delivery').length,
    delivered: delivered,
    failed: failedCount,
  }
  const visibleRows = rows.filter((r) => tab === 'all' || r.st === tab)
  const pages = Math.max(1, Math.ceil(visibleRows.length / PAGE_SIZE))
  const safePage = Math.min(page, pages)
  const pageRows = visibleRows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  const modalRow = rows.find((r) => r.order._id === orderModalId)
  const performance = [...boys].sort((a, b) => (stats[b._id]?.completed ?? 0) - (stats[a._id]?.completed ?? 0))

  /* --------------------------------- actions -------------------------------- */

  const saveBoy = async (fd: FormData) => {
    const editing = boyModal?.boy
    const res = editing
      ? await axios.patch<IBoy>(`/api/admin/delivery-boys/${editing._id}`, fd)
      : await axios.post<IBoy>('/api/admin/delivery-boys', fd)
    setBoys((prev) => (editing ? prev.map((b) => (b._id === res.data._id ? res.data : b)) : [res.data, ...prev]))
    setBoyModal(null)
    show('success', editing ? `${res.data.name} was updated.` : `${res.data.name} was added to your delivery team.`)
  }

  const upsertDelivery = (d: IDelivery) =>
    setDeliveries((prev) => (prev.some((x) => x._id === d._id) ? prev.map((x) => (x._id === d._id ? d : x)) : [d, ...prev]))

  const assign = async (boyId: string) => {
    if (!modalRow) return
    setBusy(true)
    setModalError('')
    try {
      const res = await axios.post<IDelivery>('/api/admin/deliveries', { orderId: modalRow.order._id, deliveryBoyId: boyId })
      upsertDelivery(res.data)
      // a failed order goes back to pending in Manage Orders as well
      if (modalRow.order.status !== 'pending') {
        await axios.post(`/api/admin/update-order-status/${modalRow.order._id}`, { status: 'pending' })
        setOrders((prev) => prev.map((o) => (o._id === modalRow.order._id ? { ...o, status: 'pending' } : o)))
      }
      const name = boys.find((b) => b._id === boyId)?.name ?? 'the delivery boy'
      setOrderModalId(null)
      show('success', `Order #${modalRow.order._id.slice(-6)} was assigned to ${name}.`)
    } catch (err) {
      setModalError(errorText(err, 'Could not assign this order. Please try again.'))
    } finally {
      setBusy(false)
    }
  }

  const changeStatus = async (status: DStatus) => {
    if (!modalRow?.rec) return
    const { rec, order } = modalRow
    setBusy(true)
    setModalError('')
    try {
      const res = await axios.patch<IDelivery>(`/api/admin/deliveries/${rec._id}`, { status })
      upsertDelivery(res.data)
      try {
        // keep Manage Orders in step with the delivery
        await axios.post(`/api/admin/update-order-status/${order._id}`, { status: orderStatusFor[status] })
        setOrders((prev) => prev.map((o) => (o._id === order._id ? { ...o, status: orderStatusFor[status] } : o)))
      } catch (err) {
        console.log('Could not sync the order status', err)
        setModalError('The delivery was updated, but the order status in Manage Orders could not be changed. Please update it there.')
      }
    } catch (err) {
      setModalError(errorText(err, 'Could not update the delivery. Please try again.'))
    } finally {
      setBusy(false)
    }
  }

  const openOrder = (id: string) => { setModalError(''); setOrderModalId(id) }

  /* ----------------------------------- UI ----------------------------------- */

  return (
    <AdminShell>
      {/* page header */}
      <div className='flex flex-wrap items-start justify-between gap-3 mb-6'>
        <div className='flex items-center gap-3'>
          <Truck size={42} className='text-[#0b5c3b] shrink-0' strokeWidth={1.6} />
          <div>
            <h1 className='text-3xl font-bold text-[#0b5c3b] leading-8'>Delivery Management</h1>
            <p className='text-sm text-gray-500 mt-1'>Manage your delivery team and customer deliveries.</p>
          </div>
        </div>
        <button
          onClick={() => setBoyModal({})}
          className='flex items-center gap-1.5 rounded-xl bg-linear-to-r from-green-500 to-green-700 text-white text-sm font-semibold px-4 py-2.5 shadow-sm hover:shadow-md transition-all'
        >
          <Plus size={16} /> Add Delivery Boy
        </button>
      </div>

      {notice && (
        <div role='status' className={`mb-5 flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm ${notice.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-100 text-red-600'}`}>
          {notice.type === 'success' ? <CheckCircle2 size={18} className='mt-0.5 shrink-0' /> : <AlertCircle size={18} className='mt-0.5 shrink-0' />}
          <p className='flex-1'>{notice.text}</p>
          <button onClick={() => setNotice(null)} aria-label='Dismiss' className='opacity-60 hover:opacity-100'><X size={16} /></button>
        </div>
      )}

      {/* 1. overview */}
      <div className='grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6'>
        {cards.map((c) => (
          <div key={c.label} className={`rounded-2xl border bg-linear-to-br ${c.card} shadow-sm p-4 flex items-center gap-3`}>
            <span className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${c.tint}`}><c.icon size={20} /></span>
            <div className='min-w-0'>
              <p className='text-sm text-gray-600'>{c.label}</p>
              <p className='text-2xl font-bold text-gray-800 leading-8'>
                {loading ? <span className='inline-block h-7 w-10 bg-gray-200/70 rounded animate-pulse' /> : c.value}
              </p>
              <p className='text-xs text-gray-400'>{c.hint}</p>
            </div>
          </div>
        ))}
      </div>

      {/* 2. delivery personnel */}
      <section className='bg-white rounded-2xl border border-gray-100 shadow-sm mb-6'>
        <div className='flex flex-wrap items-center justify-between gap-3 px-5 py-4'>
          <div>
            <h2 className='text-lg font-semibold text-[#0b5c3b]'>Delivery Personnel</h2>
            <p className='text-xs text-gray-500 mt-0.5'>{boys.length} {boys.length === 1 ? 'person' : 'people'} in your delivery team</p>
          </div>
          <div className='flex items-center gap-3'>
            <div className='relative'>
              <Search size={16} className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-400' />
              <input value={boySearch} onChange={(e) => setBoySearch(e.target.value)} placeholder='Search delivery boys...' className={`${inputClass} pl-9 w-52`} />
            </div>
            <select value={boyFilter} onChange={(e) => setBoyFilter(e.target.value as 'all' | BoyStatus)} aria-label='Filter by status' className={`${inputClass} w-36`}>
              <option value='all'>All Status</option>
              <option value='available'>Available</option>
              <option value='on'>On Delivery</option>
              <option value='inactive'>Inactive</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className='border-t border-gray-100 p-5 space-y-3'>{[0, 1, 2].map((i) => <div key={i} className='h-12 bg-gray-100 rounded-xl animate-pulse' />)}</div>
        ) : boys.length === 0 ? (
          <div className='border-t border-gray-100 text-center py-14 px-4'>
            <Users className='w-14 h-14 text-gray-300 mx-auto mb-4' />
            <p className='text-gray-800 font-medium'>No delivery boys yet</p>
            <p className='text-gray-500 text-sm mt-1 mb-5'>Add your first delivery boy to start assigning orders.</p>
            <button onClick={() => setBoyModal({})} className='rounded-xl bg-linear-to-r from-green-500 to-green-700 text-white text-sm font-semibold px-5 py-2.5'>Add Delivery Boy</button>
          </div>
        ) : visibleBoys.length === 0 ? (
          <div className='border-t border-gray-100 text-center py-14 px-4'>
            <SearchX className='w-12 h-12 text-gray-300 mx-auto mb-3' />
            <p className='text-gray-800 font-medium'>No delivery boys match</p>
            <button onClick={() => { setBoySearch(''); setBoyFilter('all') }} className='mt-3 text-green-700 text-sm font-medium'>Clear filters</button>
          </div>
        ) : (
          <>
            <div className='overflow-x-auto border-t border-gray-100'>
              <table className='w-full text-sm min-w-170'>
                <thead className='bg-gray-50/70 text-left text-xs text-gray-500'>
                  <tr>
                    <th className='px-5 py-3 font-medium'>Name</th>
                    <th className='px-3 py-3 font-medium'>Phone</th>
                    <th className='px-3 py-3 font-medium'>Status</th>
                    <th className='px-3 py-3 font-medium'>Assigned Orders</th>
                    <th className='px-3 py-3 font-medium'>Completed Deliveries</th>
                    <th className='px-5 py-3 font-medium text-right'>Action</th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-gray-100'>
                  {boyItems.map((b) => {
                    const s = stats[b._id]
                    const meta = boyStatusMeta[s?.status ?? 'available']
                    return (
                      <tr key={b._id} className='hover:bg-gray-50/70 transition-colors'>
                        <td className='px-5 py-3'>
                          <div className='flex items-center gap-3'>
                            <Avatar boy={b} size={40} />
                            <span className='font-semibold text-gray-800'>{b.name}</span>
                          </div>
                        </td>
                        <td className='px-3 py-3 text-gray-600'>
                          <p>{b.phone}</p>
                          <p className='text-xs text-gray-400'>{b.user ? b.email : 'No login yet'}</p>
                        </td>
                        <td className='px-3 py-3'><span className={`text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap ${meta.badge}`}>{meta.label}</span></td>
                        <td className='px-3 py-3 text-gray-700'>{s?.active ?? 0}</td>
                        <td className='px-3 py-3 text-gray-700'>{s?.completed ?? 0}</td>
                        <td className='px-5 py-3'>
                          <div className='flex justify-end'>
                            <button onClick={() => setBoyModal({ boy: b })} className='flex items-center gap-1.5 text-xs font-semibold border border-gray-200 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-50'>
                              <Pencil size={13} /> Edit
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <Pager page={safeBoyPage} total={boyPages} count={visibleBoys.length} from={(safeBoyPage - 1) * PAGE_SIZE + 1} to={Math.min(safeBoyPage * PAGE_SIZE, visibleBoys.length)} onPage={setBoyPage} />
          </>
        )}
      </section>

      <section className='bg-white rounded-2xl border border-gray-100 shadow-sm mb-6'>
        <div className='px-5 py-4'>
          <h2 className='text-lg font-semibold text-[#0b5c3b]'>Manage Deliveries</h2>
          <p className='text-xs text-gray-500 mt-0.5'>Assign a delivery boy to each order and follow it until it is delivered.</p>
        </div>

        <div className='flex gap-2 overflow-x-auto px-5 pb-4'>
          {([['all', 'All'], ['pending', 'Pending'], ['out for delivery', 'Out for Delivery'], ['delivered', 'Delivered'], ['failed', 'Failed']] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`shrink-0 text-xs font-medium px-3.5 py-1.5 rounded-full border transition-colors ${tab === key ? 'bg-green-600 border-green-600 text-white' : 'bg-white border-gray-200 text-gray-600 hover:bg-green-50 hover:border-green-200'}`}
            >
              {label} <span className={tab === key ? 'text-green-100' : 'text-gray-400'}>({tabCounts[key]})</span>
            </button>
          ))}
        </div>

        {loading ? (
          <div className='border-t border-gray-100 p-5 space-y-3'>{[0, 1, 2].map((i) => <div key={i} className='h-12 bg-gray-100 rounded-xl animate-pulse' />)}</div>
        ) : rows.length === 0 ? (
          <div className='border-t border-gray-100 text-center py-14 px-4'>
            <Package className='w-14 h-14 text-gray-300 mx-auto mb-4' />
            <p className='text-gray-800 font-medium'>No orders to deliver yet</p>
            <p className='text-gray-500 text-sm mt-1'>New customer orders will show up here.</p>
          </div>
        ) : visibleRows.length === 0 ? (
          <div className='border-t border-gray-100 text-center py-14 px-4'>
            <SearchX className='w-12 h-12 text-gray-300 mx-auto mb-3' />
            <p className='text-gray-800 font-medium'>No orders in this tab</p>
          </div>
        ) : (
          <>
            <div className='overflow-x-auto border-t border-gray-100'>
              <table className='w-full text-sm min-w-170'>
                <thead className='bg-gray-50/70 text-left text-xs text-gray-500'>
                  <tr>
                    <th className='px-5 py-3 font-medium'>Order ID</th>
                    <th className='px-3 py-3 font-medium'>Customer</th>
                    <th className='px-3 py-3 font-medium'>Delivery Boy</th>
                    <th className='px-3 py-3 font-medium'>Status</th>
                    <th className='px-5 py-3 font-medium text-right'>Action</th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-gray-100'>
                  {pageRows.map((r) => {
                    const action = r.st === 'delivered' ? 'View' : !r.rec ? 'Assign' : r.st === 'failed' ? 'Reassign' : 'Manage'
                    return (
                      <tr key={r.order._id} className='hover:bg-gray-50/70 transition-colors'>
                        <td className='px-5 py-3'>
                          <p className='font-semibold text-gray-800'>#{r.order._id.slice(-6)}</p>
                          <p className='text-xs text-gray-400'>{new Date(r.order.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</p>
                        </td>
                        <td className='px-3 py-3'>
                          <p className='font-medium text-gray-800 truncate max-w-40'>{r.order.user?.name || r.order.address.fullName}</p>
                          <p className='text-xs text-gray-500'>{r.order.address.mobile || r.order.user?.mobile || ''}</p>
                        </td>
                        <td className='px-3 py-3'>
                          {r.boy ? (
                            <span className='flex items-center gap-2'><Avatar boy={r.boy} size={28} /><span className='text-gray-800'>{r.boy.name}</span></span>
                          ) : r.rejection ? (
                            <span className='text-xs font-medium text-red-600' title={r.rejection.reason || undefined}>Rejected by {r.rejection.boyName}</span>
                          ) : <span className='text-gray-400'>Not Assigned</span>}
                        </td>
                        <td className='px-3 py-3'>
                          <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap ${statusMeta[r.st].badge}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${statusMeta[r.st].dot}`} /> {statusMeta[r.st].label}
                          </span>
                        </td>
                        <td className='px-5 py-3'>
                          <div className='flex justify-end'>
                            <button
                              onClick={() => openOrder(r.order._id)}
                              className={`text-xs font-semibold px-3.5 py-1.5 rounded-lg transition-colors ${action === 'Assign' || action === 'Reassign' ? 'bg-green-700 text-white hover:bg-green-800' : 'border border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                            >
                              {action}
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <Pager page={safePage} total={pages} count={visibleRows.length} from={(safePage - 1) * PAGE_SIZE + 1} to={Math.min(safePage * PAGE_SIZE, visibleRows.length)} onPage={setPage} />
          </>
        )}
      </section>

      <section className='bg-white rounded-2xl border border-gray-100 shadow-sm'>
        <div className='px-5 py-4'>
          <h2 className='text-lg font-semibold text-[#0b5c3b]'>Delivery Performance</h2>
          <p className='text-xs text-gray-500 mt-0.5'>See how many orders each delivery boy has delivered.</p>
        </div>

        <div className='grid grid-cols-2 lg:grid-cols-4 gap-3 px-5 pb-5'>
          {[
            { label: 'Total deliveries', value: assignedTotal, tone: 'bg-gray-50 text-gray-800' },
            { label: "Today's deliveries", value: todayOrders, tone: 'bg-amber-50 text-amber-700' },
            { label: 'Successfully delivered', value: delivered, tone: 'bg-green-50 text-green-700' },
            { label: 'Failed deliveries', value: failedCount, tone: 'bg-red-50 text-red-600' },
          ].map((t) => (
            <div key={t.label} className={`rounded-xl px-4 py-3 ${t.tone}`}>
              <p className='text-2xl font-bold leading-7'>{loading ? '-' : t.value}</p>
              <p className='text-xs mt-0.5 opacity-80'>{t.label}</p>
            </div>
          ))}
        </div>

        {boys.length === 0 ? (
          <p className='border-t border-gray-100 text-center text-sm text-gray-500 py-10'>Add delivery boys to see how each one is doing.</p>
        ) : (
          <div className='overflow-x-auto border-t border-gray-100'>
            <table className='w-full text-sm min-w-170'>
              <thead className='bg-gray-50/70 text-left text-xs text-gray-500'>
                <tr>
                  <th className='px-5 py-3 font-medium'>Delivery Boy</th>
                  <th className='px-3 py-3 font-medium'>Assigned</th>
                  <th className='px-3 py-3 font-medium'>Delivered</th>
                  <th className='px-3 py-3 font-medium'>Failed</th>
                  <th className='px-3 py-3 font-medium'>In progress</th>
                  <th className='px-5 py-3 font-medium'>Success rate</th>
                </tr>
              </thead>
              <tbody className='divide-y divide-gray-100'>
                {performance.map((b) => {
                  const s = stats[b._id]
                  const finished = (s?.completed ?? 0) + (s?.failed ?? 0)
                  const rate = finished > 0 ? Math.round(((s?.completed ?? 0) / finished) * 100) : null
                  return (
                    <tr key={b._id}>
                      <td className='px-5 py-3'>
                        <div className='flex items-center gap-3'><Avatar boy={b} size={32} /><span className='font-medium text-gray-800'>{b.name}</span></div>
                      </td>
                      <td className='px-3 py-3 text-gray-700'>{s?.total ?? 0}</td>
                      <td className='px-3 py-3 font-semibold text-green-700'>{s?.completed ?? 0}</td>
                      <td className='px-3 py-3 text-red-600'>{s?.failed ?? 0}</td>
                      <td className='px-3 py-3 text-gray-700'>{s?.active ?? 0}</td>
                      <td className='px-5 py-3'>
                        {rate === null ? <span className='text-xs text-gray-400'>No finished deliveries</span> : (
                          <div className='flex items-center gap-3'>
                            <div className='h-2 w-28 rounded-full bg-gray-100 overflow-hidden'><div className='h-full rounded-full bg-green-500' style={{ width: `${rate}%` }} /></div>
                            <span className='text-xs font-medium text-gray-700'>{rate}%</span>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* pop-ups */}
      <AnimatePresence>
        {boyModal && (
          <BoyModal
            key='boy'
            boy={boyModal.boy}
            activeOrders={boyModal.boy ? stats[boyModal.boy._id]?.active ?? 0 : 0}
            onClose={() => setBoyModal(null)}
            onSave={saveBoy}
          />
        )}
        {modalRow && (
          <OrderModal
            key={`order-${modalRow.order._id}`}
            row={modalRow}
            boys={boys}
            stats={stats}
            busy={busy}
            error={modalError}
            onClose={() => setOrderModalId(null)}
            onAssign={assign}
            onStatus={changeStatus}
          />
        )}
      </AnimatePresence>
    </AdminShell>
  )
}

export default DeliveryManagement