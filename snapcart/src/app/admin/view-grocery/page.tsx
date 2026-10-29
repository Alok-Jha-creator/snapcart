'use client'
import React, { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ChevronLeft, ChevronRight, PackageOpen, Pencil, Plus, SearchX, Trash2, X } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import axios from 'axios'
import AdminShell from '@/components/AdminShell'

interface IGrocery {
    _id: string
    name: string
    category: string
    price: string
    unit: string
    description: string
    image: string
    createdAt?: string
}

const categories = [
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
const units = ["kg", "g", "liter", "ml", "piece", "pack"]

type SortKey = "newest" | "price-low" | "price-high" | "name"

const PAGE_SIZE = 8

const inputClass =
    'w-full border border-gray-200 bg-white rounded-xl px-3.5 py-2.5 text-sm outline-none placeholder:text-gray-400 focus:border-green-400 focus:ring-2 focus:ring-green-400/30 transition-all'

const formatDate = (d?: string) =>
    d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'

const ViewGrocery = () => {
    const [groceries, setGroceries] = useState<IGrocery[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("")
    const [categoryFilter, setCategoryFilter] = useState("all")
    const [sortBy, setSortBy] = useState<SortKey>("newest")
    const [page, setPage] = useState(1)

    const [editItem, setEditItem] = useState<IGrocery | null>(null)
    const [deleteItem, setDeleteItem] = useState<IGrocery | null>(null)
    const [form, setForm] = useState({ name: "", category: "", description: "", unit: "", price: "" })
    const [busy, setBusy] = useState(false)
    const [modalError, setModalError] = useState("")

    useEffect(() => {
        const getGroceries = async () => {
            try {
                const result = await axios.get('/api/admin/get-groceries')
                setGroceries(result.data)
            } catch (error) {
                console.log('Failed to fetch groceries', error)
            } finally {
                setLoading(false)
            }
        }
        getGroceries()
    }, [])

    // go back to the first page whenever the filters change
    useEffect(() => {
        setPage(1)
    }, [search, categoryFilter, sortBy])

    const categoryCounts = useMemo(() => {
        const counts: Record<string, number> = {}
        groceries.forEach((g) => { counts[g.category] = (counts[g.category] ?? 0) + 1 })
        return counts
    }, [groceries])

    const visible = useMemo(() => {
        const q = search.trim().toLowerCase()
        const list = groceries.filter((g) =>
            (categoryFilter === "all" || g.category === categoryFilter) &&
            (q === "" || g.name.toLowerCase().includes(q) || g.category.toLowerCase().includes(q))
        )
        const sorted = [...list]
        if (sortBy === "newest") {
            sorted.sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime())
        }
        if (sortBy === "price-low") sorted.sort((a, b) => Number(a.price) - Number(b.price))
        if (sortBy === "price-high") sorted.sort((a, b) => Number(b.price) - Number(a.price))
        if (sortBy === "name") sorted.sort((a, b) => a.name.localeCompare(b.name))
        return sorted
    }, [groceries, search, categoryFilter, sortBy])

    const totalPages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE))
    const safePage = Math.min(page, totalPages)
    const pageItems = visible.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)
    const from = visible.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1
    const to = Math.min(safePage * PAGE_SIZE, visible.length)

    const clearFilters = () => {
        setSearch("")
        setCategoryFilter("all")
        setSortBy("newest")
    }

    const openEdit = (item: IGrocery) => {
        setEditItem(item)
        setForm({
            name: item.name,
            category: item.category,
            unit: item.unit,
            description: item.description ?? "",
            price: String(item.price),
        })
        setModalError("")
    }

    const closeModals = () => {
        if (busy) return
        setEditItem(null)
        setDeleteItem(null)
    }

    // close the pop-ups with the Escape key
    useEffect(() => {
        if (!editItem && !deleteItem) return
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !busy) {
                setEditItem(null)
                setDeleteItem(null)
            }
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [editItem, deleteItem, busy])

    const handleSave = async () => {
        if (!editItem) return
        if (
            !form.name.trim() ||
            !form.category ||
            !form.description.trim() ||
            !form.unit ||
            !form.price.trim() ||
            isNaN(Number(form.price))
        ) {
            setModalError("Please fill every field and enter a valid price.")
            return
        }
        setBusy(true)
        setModalError("")
        try {
            const result = await axios.patch(`/api/admin/grocery/${editItem._id}`, form)
            setGroceries((prev) => prev.map((g) => (g._id === editItem._id ? { ...g, ...result.data } : g)))
            setEditItem(null)
        } catch (error) {
            console.log('Failed to update grocery', error)
            setModalError("Could not save changes. Please try again.")
        } finally {
            setBusy(false)
        }
    }

    const handleDelete = async () => {
        if (!deleteItem) return
        setBusy(true)
        setModalError("")
        try {
            await axios.delete(`/api/admin/grocery/${deleteItem._id}`)
            setGroceries((prev) => prev.filter((g) => g._id !== deleteItem._id))
            setDeleteItem(null)
        } catch (error) {
            console.log('Failed to delete grocery', error)
            setModalError("Could not delete this product. Please try again.")
        } finally {
            setBusy(false)
        }
    }

    return (
        <AdminShell search={{ value: search, onChange: setSearch, placeholder: 'Search by name or category...' }}>
            {/* title + breadcrumb */}
            <div className='flex flex-wrap items-center justify-between gap-3 mb-6'>
                <h1 className='text-3xl font-bold text-[#0b5c3b]'>View Grocery</h1>
                <nav aria-label='Breadcrumb' className='flex items-center gap-1.5 text-sm text-gray-500'>
                    <Link href='/' className='hover:text-green-700'>Dashboard</Link>
                    <ChevronRight size={14} />
                    <Link href='/admin/view-grocery' className='hover:text-green-700'>Products</Link>
                    <ChevronRight size={14} />
                    <span className='text-gray-800 font-medium'>View Grocery</span>
                </nav>
            </div>

            <section className='bg-white rounded-2xl border border-gray-100 shadow-sm'>
                {/* card header */}
                <div className='flex flex-wrap items-center justify-between gap-3 px-5 py-4'>
                    <div>
                        <h2 className='text-lg font-semibold text-[#0b5c3b]'>All groceries</h2>
                        <p className='text-xs text-gray-500 mt-0.5'>
                            {groceries.length} {groceries.length === 1 ? 'product' : 'products'} in your store
                        </p>
                    </div>
                    <div className='flex items-center gap-3'>
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as SortKey)}
                            aria-label='Sort products'
                            className={`${inputClass} w-44`}
                        >
                            <option value="newest">Newest first</option>
                            <option value="price-low">Price: low to high</option>
                            <option value="price-high">Price: high to low</option>
                            <option value="name">Name: A to Z</option>
                        </select>
                        <Link
                            href='/admin/add-grocery'
                            className='flex items-center gap-1.5 rounded-xl bg-linear-to-r from-green-500 to-green-700 text-white text-sm font-semibold px-4 py-2.5 shadow-sm hover:shadow-md transition-all shrink-0'
                        >
                            <Plus size={16} /> Add Grocery
                        </Link>
                    </div>
                </div>

                {/* category chips */}
                {!loading && groceries.length > 0 && (
                    <div className='flex gap-2 overflow-x-auto px-5 pb-4'>
                        {[{ key: 'all', label: 'All', count: groceries.length }, ...categories
                            .filter((c) => categoryCounts[c])
                            .map((c) => ({ key: c, label: c, count: categoryCounts[c] }))
                        ].map((c) => (
                            <button
                                key={c.key}
                                onClick={() => setCategoryFilter(c.key)}
                                className={`shrink-0 text-xs font-medium px-3.5 py-1.5 rounded-full border transition-colors ${
                                    categoryFilter === c.key
                                        ? 'bg-green-600 border-green-600 text-white'
                                        : 'bg-white border-gray-200 text-gray-600 hover:bg-green-50 hover:border-green-200'
                                }`}
                            >
                                {c.label} <span className={categoryFilter === c.key ? 'text-green-100' : 'text-gray-400'}>({c.count})</span>
                            </button>
                        ))}
                    </div>
                )}

                {/* content */}
                {loading ? (
                    <div className='border-t border-gray-100 divide-y divide-gray-100'>
                        {[0, 1, 2, 3].map((i) => (
                            <div key={i} className='flex items-center gap-4 px-5 py-4'>
                                <div className='w-12 h-12 rounded-lg bg-gray-100 animate-pulse' />
                                <div className='flex-1 space-y-2'>
                                    <div className='h-4 w-40 bg-gray-100 rounded animate-pulse' />
                                    <div className='h-3 w-64 bg-gray-100 rounded animate-pulse' />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : groceries.length === 0 ? (
                    <div className='border-t border-gray-100 text-center py-16 px-4'>
                        <PackageOpen className='w-14 h-14 text-gray-300 mx-auto mb-4' />
                        <p className='text-gray-800 font-medium'>No groceries yet</p>
                        <p className='text-gray-500 text-sm mt-1 mb-5'>Add your first product to start selling.</p>
                        <Link href='/admin/add-grocery' className='inline-block rounded-xl bg-linear-to-r from-green-500 to-green-700 text-white text-sm font-semibold px-5 py-2.5'>
                            Add Grocery
                        </Link>
                    </div>
                ) : visible.length === 0 ? (
                    <div className='border-t border-gray-100 text-center py-16 px-4'>
                        <SearchX className='w-14 h-14 text-gray-300 mx-auto mb-4' />
                        <p className='text-gray-800 font-medium'>No products match your search</p>
                        <button onClick={clearFilters} className='mt-3 text-green-700 hover:text-green-800 text-sm font-medium'>
                            Clear filters
                        </button>
                    </div>
                ) : (
                    <>
                        {/* tablet and desktop: table */}
                        <div className='hidden md:block overflow-x-auto border-t border-gray-100'>
                            <table className='w-full text-sm'>
                                <thead className='bg-gray-50/70 text-left text-xs text-gray-500'>
                                    <tr>
                                        <th className='px-5 py-3 font-medium'>Product</th>
                                        <th className='px-3 py-3 font-medium'>Category</th>
                                        <th className='px-3 py-3 font-medium'>Price</th>
                                        <th className='px-3 py-3 font-medium'>Added</th>
                                        <th className='px-5 py-3 font-medium text-right'>Actions</th>
                                    </tr>
                                </thead>
                                <tbody className='divide-y divide-gray-100'>
                                    {pageItems.map((g) => (
                                        <tr key={g._id} className='hover:bg-gray-50/70 transition-colors'>
                                            <td className='px-5 py-3'>
                                                <div className='flex items-center gap-3 min-w-0'>
                                                    <div className='relative w-12 h-12 rounded-lg overflow-hidden bg-gray-50 border border-gray-100 shrink-0'>
                                                        <Image src={g.image} alt={g.name} fill sizes='48px' className='object-contain p-1' />
                                                    </div>
                                                    <div className='min-w-0'>
                                                        <p className='font-semibold text-gray-800 truncate'>{g.name}</p>
                                                        {g.description && (
                                                            <p className='text-xs text-gray-500 truncate max-w-xs'>{g.description}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className='px-3 py-3'>
                                                <span className='text-xs font-medium text-green-700 bg-green-50 px-2.5 py-1 rounded-full whitespace-nowrap'>{g.category}</span>
                                            </td>
                                            <td className='px-3 py-3 whitespace-nowrap'>
                                                <span className='font-semibold text-gray-800'>Rs {g.price}</span>
                                                <span className='text-xs text-gray-400'> / {g.unit}</span>
                                            </td>
                                            <td className='px-3 py-3 text-xs text-gray-500 whitespace-nowrap'>{formatDate(g.createdAt)}</td>
                                            <td className='px-5 py-3'>
                                                <div className='flex items-center justify-end gap-2'>
                                                    <button
                                                        onClick={() => openEdit(g)}
                                                        aria-label={`Edit ${g.name}`}
                                                        title='Edit'
                                                        className='w-9 h-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-100 transition-colors'
                                                    >
                                                        <Pencil size={15} />
                                                    </button>
                                                    <button
                                                        onClick={() => { setDeleteItem(g); setModalError("") }}
                                                        aria-label={`Delete ${g.name}`}
                                                        title='Delete'
                                                        className='w-9 h-9 rounded-full bg-red-50 text-red-600 flex items-center justify-center hover:bg-red-100 transition-colors'
                                                    >
                                                        <Trash2 size={15} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* phones: cards */}
                        <div className='md:hidden border-t border-gray-100 divide-y divide-gray-100'>
                            {pageItems.map((g) => (
                                <div key={g._id} className='p-4'>
                                    <div className='flex gap-3'>
                                        <div className='relative w-16 h-16 rounded-lg overflow-hidden bg-gray-50 border border-gray-100 shrink-0'>
                                            <Image src={g.image} alt={g.name} fill sizes='64px' className='object-contain p-1.5' />
                                        </div>
                                        <div className='flex-1 min-w-0'>
                                            <p className='font-semibold text-gray-800 truncate'>{g.name}</p>
                                            <span className='inline-block mt-1 text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full'>{g.category}</span>
                                            <p className='mt-1.5 font-bold text-gray-800'>
                                                Rs {g.price}
                                                <span className='text-xs text-gray-400 font-normal'> / {g.unit}</span>
                                            </p>
                                            {g.description && <p className='text-xs text-gray-500 mt-1 line-clamp-2'>{g.description}</p>}
                                        </div>
                                    </div>
                                    <div className='flex gap-2 mt-3'>
                                        <button
                                            onClick={() => openEdit(g)}
                                            className='flex-1 flex items-center justify-center gap-1.5 text-sm font-medium bg-blue-50 text-blue-600 py-2 rounded-xl hover:bg-blue-100 transition-colors'
                                        >
                                            <Pencil size={14} /> Edit
                                        </button>
                                        <button
                                            onClick={() => { setDeleteItem(g); setModalError("") }}
                                            className='flex-1 flex items-center justify-center gap-1.5 text-sm font-medium bg-red-50 text-red-600 py-2 rounded-xl hover:bg-red-100 transition-colors'
                                        >
                                            <Trash2 size={14} /> Delete
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* footer: count + pagination */}
                        <div className='flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 px-5 py-3'>
                            <p className='text-xs text-gray-500'>
                                Showing {from}-{to} of {visible.length}
                            </p>
                            {totalPages > 1 && (
                                <div className='flex items-center gap-2'>
                                    <button
                                        onClick={() => setPage(safePage - 1)}
                                        disabled={safePage === 1}
                                        aria-label='Previous page'
                                        className='w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-transparent'
                                    >
                                        <ChevronLeft size={16} />
                                    </button>
                                    <span className='text-sm text-gray-600 px-1'>Page {safePage} of {totalPages}</span>
                                    <button
                                        onClick={() => setPage(safePage + 1)}
                                        disabled={safePage === totalPages}
                                        aria-label='Next page'
                                        className='w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-transparent'
                                    >
                                        <ChevronRight size={16} />
                                    </button>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </section>

            {/* Edit modal */}
            <AnimatePresence>
                {editItem && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className='fixed inset-0 z-100 flex items-center justify-center bg-black/40 px-4'
                        onClick={closeModals}
                    >
                        <motion.div
                            role='dialog'
                            aria-modal='true'
                            aria-label='Edit product'
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            transition={{ duration: 0.2 }}
                            className='bg-white w-full max-w-md rounded-2xl p-5 sm:p-6 max-h-[90vh] overflow-y-auto shadow-xl'
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className='flex items-start justify-between gap-3 mb-5'>
                                <div className='flex items-center gap-3'>
                                    <div className='relative w-14 h-14 rounded-lg overflow-hidden bg-gray-50 border border-gray-100 shrink-0'>
                                        <Image src={editItem.image} alt={editItem.name} fill sizes='56px' className='object-contain p-1.5' />
                                    </div>
                                    <div>
                                        <p className='font-semibold text-[#0b5c3b]'>Edit product</p>
                                        <p className='text-xs text-gray-500'>The image can&apos;t be changed here.</p>
                                    </div>
                                </div>
                                <button onClick={closeModals} aria-label='Close' className='text-gray-400 hover:text-gray-600'>
                                    <X size={20} />
                                </button>
                            </div>

                            <div className='space-y-4'>
                                <div>
                                    <label className='block text-sm font-medium text-gray-700 mb-1.5'>Name</label>
                                    <input
                                        type="text"
                                        value={form.name}
                                        onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                                        className={inputClass}
                                    />
                                </div>
                                <div>
                                    <label className='block text-sm font-medium text-gray-700 mb-1.5'>Category</label>
                                    <select
                                        value={form.category}
                                        onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                                        className={inputClass}
                                    >
                                        <option value="">Select category</option>
                                        {categories.map((c) => (
                                            <option key={c} value={c}>{c}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className='grid grid-cols-2 gap-3'>
                                    <div>
                                        <label className='block text-sm font-medium text-gray-700 mb-1.5'>Unit</label>
                                        <select
                                            value={form.unit}
                                            onChange={(e) => setForm((p) => ({ ...p, unit: e.target.value }))}
                                            className={inputClass}
                                        >
                                            <option value="">Select unit</option>
                                            {units.map((u) => (
                                                <option key={u} value={u}>{u}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className='block text-sm font-medium text-gray-700 mb-1.5'>Price (Rs)</label>
                                        <input
                                            type="text"
                                            inputMode='decimal'
                                            value={form.price}
                                            onChange={(e) => setForm((p) => ({ ...p, price: e.target.value.replace(/[^0-9.]/g, '') }))}
                                            className={inputClass}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className='block text-sm font-medium text-gray-700 mb-1.5'>Description</label>
                                    <textarea
                                        rows={3}
                                        value={form.description}
                                        onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                                        className={`${inputClass} resize-none`}
                                    />
                                </div>
                            </div>

                            {modalError && <p className='text-sm text-red-600 mt-4'>{modalError}</p>}

                            <div className='flex gap-3 mt-6'>
                                <button
                                    onClick={closeModals}
                                    disabled={busy}
                                    className='flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50'
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={busy}
                                    className='flex-1 bg-linear-to-r from-green-500 to-green-700 text-white py-2.5 rounded-xl text-sm font-semibold shadow-sm hover:shadow-md transition-all disabled:opacity-60'
                                >
                                    {busy ? "Saving..." : "Save changes"}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Delete modal */}
            <AnimatePresence>
                {deleteItem && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className='fixed inset-0 z-100 flex items-center justify-center bg-black/40 px-4'
                        onClick={closeModals}
                    >
                        <motion.div
                            role='dialog'
                            aria-modal='true'
                            aria-label='Delete product'
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            transition={{ duration: 0.2 }}
                            className='bg-white w-full max-w-sm rounded-2xl p-6 text-center shadow-xl'
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className='w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4'>
                                <Trash2 size={22} className='text-red-600' />
                            </div>
                            <p className='font-semibold text-gray-800'>Delete this product?</p>
                            <p className='text-sm text-gray-500 mt-1'>
                                <span className='font-medium text-gray-700'>{deleteItem.name}</span> will be removed from your store. This can&apos;t be undone.
                            </p>

                            {modalError && <p className='text-sm text-red-600 mt-3'>{modalError}</p>}

                            <div className='flex gap-3 mt-6'>
                                <button
                                    onClick={closeModals}
                                    disabled={busy}
                                    className='flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50'
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDelete}
                                    disabled={busy}
                                    className='flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-60'
                                >
                                    {busy ? "Deleting..." : "Delete"}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </AdminShell>
    )
}

export default ViewGrocery