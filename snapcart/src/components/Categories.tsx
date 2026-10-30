'use client'
import React, { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import Image from 'next/image'
import Link from 'next/link'
import {
  AlertCircle, Apple, ArrowRight, Baby, Boxes, CheckCircle2, ChevronRight, Cookie, CupSoda,
  Flame, Grid2x2, Home, Milk, Package, Plus, SearchX, Sparkles, SprayCan, UtensilsCrossed, Wheat,
} from 'lucide-react'
import AdminShell from '@/components/AdminShell'

interface IGrocery {
  _id: string
  name: string
  category: string
  price: string
  unit: string
  image: string
}

const categoryList = [
  "Fruits & Vegetables",
  "Dairy & Eggs",
  "Rice, Atta & Grains",
  "Snacks & Biscuits",
  "Spices & Masalas",
  "Beverages & Drinks",
  "Personal Care",
  "Household Essentials",
  "Instant & Packaged Food",
  "Baby & Pet Care"
]

const categoryMeta: Record<string, { icon: React.ElementType; tone: string; bar: string }> = {
  "Fruits & Vegetables": { icon: Apple, tone: 'bg-green-100 text-green-700', bar: 'bg-green-500' },
  "Dairy & Eggs": { icon: Milk, tone: 'bg-blue-100 text-blue-600', bar: 'bg-blue-500' },
  "Rice, Atta & Grains": { icon: Wheat, tone: 'bg-amber-100 text-amber-600', bar: 'bg-amber-500' },
  "Snacks & Biscuits": { icon: Cookie, tone: 'bg-orange-100 text-orange-500', bar: 'bg-orange-400' },
  "Spices & Masalas": { icon: Flame, tone: 'bg-red-100 text-red-500', bar: 'bg-red-400' },
  "Beverages & Drinks": { icon: CupSoda, tone: 'bg-cyan-100 text-cyan-600', bar: 'bg-cyan-500' },
  "Personal Care": { icon: Sparkles, tone: 'bg-pink-100 text-pink-500', bar: 'bg-pink-400' },
  "Household Essentials": { icon: SprayCan, tone: 'bg-purple-100 text-purple-600', bar: 'bg-purple-500' },
  "Instant & Packaged Food": { icon: UtensilsCrossed, tone: 'bg-yellow-100 text-yellow-600', bar: 'bg-yellow-500' },
  "Baby & Pet Care": { icon: Baby, tone: 'bg-teal-100 text-teal-600', bar: 'bg-teal-500' },
}
const fallbackMeta = { icon: Package, tone: 'bg-gray-100 text-gray-600', bar: 'bg-gray-400' }

type SortKey = 'most' | 'name'

const inputClass =
  'border border-gray-200 bg-white rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-green-400 focus:ring-2 focus:ring-green-400/30 transition-all'

const Categories = () => {
  const [groceries, setGroceries] = useState<IGrocery[]>([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<SortKey>('most')

  useEffect(() => {
    const load = async () => {
      try {
        const res = await axios.get('/api/admin/get-groceries')
        setGroceries(res.data)
      } catch (error) {
        console.log('Failed to fetch groceries', error)
        setFailed(true)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const rows = useMemo(() => {
    // the fixed list, plus any category found on a product that is not in the list
    const names = [...categoryList]
    groceries.forEach((g) => { if (g.category && !names.includes(g.category)) names.push(g.category) })

    return names.map((name) => {
      const items = groceries.filter((g) => g.category === name)
      const prices = items.map((g) => Number(g.price)).filter((n) => !isNaN(n))
      return {
        name,
        meta: categoryMeta[name] ?? fallbackMeta,
        count: items.length,
        thumbs: items.slice(0, 4),
        min: prices.length ? Math.min(...prices) : 0,
        max: prices.length ? Math.max(...prices) : 0,
        share: groceries.length ? Math.round((items.length / groceries.length) * 100) : 0,
      }
    })
  }, [groceries])

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    const list = rows.filter((r) => q === '' || r.name.toLowerCase().includes(q))
    return [...list].sort((a, b) => (sortBy === 'most' ? b.count - a.count || a.name.localeCompare(b.name) : a.name.localeCompare(b.name)))
  }, [rows, search, sortBy])

  const usedCount = rows.filter((r) => r.count > 0).length

  const stats = [
    { label: 'Total categories', value: rows.length, icon: Grid2x2, card: 'from-green-50 to-white border-green-100', tint: 'bg-green-500 text-white' },
    { label: 'With products', value: usedCount, icon: CheckCircle2, card: 'from-blue-50 to-white border-blue-100', tint: 'bg-blue-500 text-white' },
    { label: 'Total products', value: groceries.length, icon: Boxes, card: 'from-purple-50 to-white border-purple-100', tint: 'bg-purple-500 text-white' },
  ]

  return (
    <AdminShell search={{ value: search, onChange: setSearch, placeholder: 'Search categories...' }}>
      {/* page header */}
      <div className='flex flex-wrap items-start justify-between gap-3 mb-6'>
        <div className='flex items-center gap-3'>
          <Grid2x2 size={42} className='text-[#0b5c3b] shrink-0' strokeWidth={1.6} />
          <div>
            <h1 className='text-3xl font-bold text-[#0b5c3b] leading-8'>Categories</h1>
            <p className='text-sm text-gray-500 mt-1'>See how your products are grouped across the store.</p>
          </div>
        </div>
        <nav aria-label='Breadcrumb' className='flex items-center gap-2 text-sm text-gray-500 pt-2'>
          <Link href='/' aria-label='Home' className='hover:text-green-700'><Home size={16} /></Link>
          <ChevronRight size={14} />
          <Link href='/' className='hover:text-green-700'>Dashboard</Link>
          <ChevronRight size={14} />
          <span className='text-gray-800'>Categories</span>
        </nav>
      </div>

      {failed && (
        <div role='alert' className='mb-5 flex items-start gap-2.5 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600'>
          <AlertCircle size={18} className='mt-0.5 shrink-0' />
          <p>Could not load your products. Please refresh the page.</p>
        </div>
      )}

      {/* summary */}
      <div className='grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6'>
        {stats.map((s) => (
          <div key={s.label} className={`rounded-2xl border bg-linear-to-br ${s.card} shadow-sm p-4 flex items-center gap-3`}>
            <span className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${s.tint}`}>
              <s.icon size={20} />
            </span>
            <div>
              <p className='text-sm text-gray-600'>{s.label}</p>
              <p className='text-2xl font-bold text-gray-800 leading-7'>
                {loading ? <span className='inline-block h-7 w-10 bg-gray-200/70 rounded animate-pulse' /> : s.value}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* toolbar */}
      <div className='flex flex-wrap items-center justify-between gap-3 mb-4'>
        <h2 className='text-lg font-semibold text-[#0b5c3b]'>All categories</h2>
        <div className='flex items-center gap-3'>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortKey)} aria-label='Sort categories' className={`${inputClass} w-48`}>
            <option value='most'>Most products first</option>
            <option value='name'>Name: A to Z</option>
          </select>
          <Link
            href='/admin/add-grocery'
            className='flex items-center gap-1.5 rounded-xl bg-linear-to-r from-green-500 to-green-700 text-white text-sm font-semibold px-4 py-2.5 shadow-sm hover:shadow-md transition-all shrink-0'
          >
            <Plus size={16} /> Add Grocery
          </Link>
        </div>
      </div>

      {/* grid */}
      {loading ? (
        <div className='grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4'>
          {[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className='h-52 bg-white border border-gray-100 rounded-2xl animate-pulse' />)}
        </div>
      ) : visible.length === 0 ? (
        <div className='bg-white rounded-2xl border border-gray-100 shadow-sm text-center py-16 px-4'>
          <SearchX className='w-14 h-14 text-gray-300 mx-auto mb-4' />
          <p className='text-gray-800 font-medium'>No categories match your search</p>
          <button onClick={() => setSearch('')} className='mt-3 text-green-700 hover:text-green-800 text-sm font-medium'>Clear search</button>
        </div>
      ) : (
        <div className='grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4'>
          {visible.map((r) => (
            <div key={r.name} className='bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col'>
              <div className='flex items-start gap-3.5'>
                <span className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${r.meta.tone}`}>
                  <r.meta.icon size={22} />
                </span>
                <div className='min-w-0 flex-1'>
                  <p className='font-semibold text-gray-800 leading-5'>{r.name}</p>
                  <p className='text-xs text-gray-500 mt-1'>
                    {r.count} {r.count === 1 ? 'product' : 'products'}
                    {r.count > 0 && (
                      <span className='text-gray-400'> · {r.min === r.max ? `Rs ${r.min}` : `Rs ${r.min} - Rs ${r.max}`}</span>
                    )}
                  </p>
                </div>
              </div>

              {/* share of the whole store */}
              <div className='mt-4'>
                <div className='h-1.5 rounded-full bg-gray-100 overflow-hidden'>
                  <div className={`h-full rounded-full ${r.meta.bar}`} style={{ width: `${r.share}%` }} />
                </div>
                <p className='text-[11px] text-gray-400 mt-1.5'>{r.share}% of your store</p>
              </div>

              {/* product thumbnails */}
              <div className='mt-4 flex items-center gap-2 min-h-12'>
                {r.thumbs.length === 0 ? (
                  <p className='text-xs text-gray-400'>No products in this category yet.</p>
                ) : (
                  <>
                    {r.thumbs.map((g) => (
                      <div key={g._id} title={g.name} className='relative w-12 h-12 rounded-lg overflow-hidden bg-gray-50 border border-gray-100 shrink-0'>
                        <Image src={g.image} alt={g.name} fill sizes='48px' className='object-contain p-1' />
                      </div>
                    ))}
                    {r.count > r.thumbs.length && (
                      <span className='text-xs font-medium text-gray-500 bg-gray-100 rounded-lg w-12 h-12 flex items-center justify-center shrink-0'>
                        +{r.count - r.thumbs.length}
                      </span>
                    )}
                  </>
                )}
              </div>

              <div className='mt-auto pt-4'>
                {r.count > 0 ? (
                  <Link
                    href={`/admin/view-grocery?category=${encodeURIComponent(r.name)}`}
                    className='flex items-center justify-between rounded-xl bg-green-50 hover:bg-green-100 text-green-700 text-sm font-semibold px-4 py-2.5 transition-colors'
                  >
                    View products <ArrowRight size={16} />
                  </Link>
                ) : (
                  <Link
                    href='/admin/add-grocery'
                    className='flex items-center justify-between rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-semibold px-4 py-2.5 transition-colors'
                  >
                    Add a grocery <Plus size={16} />
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminShell>
  )
}

export default Categories