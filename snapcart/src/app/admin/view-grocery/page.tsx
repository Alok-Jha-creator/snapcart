'use client'
import React, { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowLeft, PackageOpen, Pencil, Plus, Search, SearchX, Trash2, X } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import axios from 'axios'

interface IGrocery {
    _id: string
    name: string
    category: string
    price: string
    unit: string
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

const inputClass = 'w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white outline-none focus:ring-2 focus:ring-green-500 transition-all'

const ViewGrocery = () => {
    const router = useRouter()
    const [groceries, setGroceries] = useState<IGrocery[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("")
    const [categoryFilter, setCategoryFilter] = useState("all")
    const [sortBy, setSortBy] = useState<SortKey>("newest")

    const [editItem, setEditItem] = useState<IGrocery | null>(null)
    const [deleteItem, setDeleteItem] = useState<IGrocery | null>(null)
    const [form, setForm] = useState({ name: "", category: "", unit: "", price: "" })
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

    const visible = useMemo(() => {
        const q = search.trim().toLowerCase()
        const list = groceries.filter((g) =>
            (categoryFilter === "all" || g.category === categoryFilter) &&
            (q === "" || g.name.toLowerCase().includes(q) || g.category.toLowerCase().includes(q))
        )
        const sorted = [...list]
        if (sortBy === "price-low") sorted.sort((a, b) => Number(a.price) - Number(b.price))
        if (sortBy === "price-high") sorted.sort((a, b) => Number(b.price) - Number(a.price))
        if (sortBy === "name") sorted.sort((a, b) => a.name.localeCompare(b.name))
        return sorted
    }, [groceries, search, categoryFilter, sortBy])

    const clearFilters = () => {
        setSearch("")
        setCategoryFilter("all")
        setSortBy("newest")
    }

    const openEdit = (item: IGrocery) => {
        setEditItem(item)
        setForm({ name: item.name, category: item.category, unit: item.unit, price: String(item.price) })
        setModalError("")
    }

    const closeModals = () => {
        if (busy) return
        setEditItem(null)
        setDeleteItem(null)
    }

    const handleSave = async () => {
        if (!editItem) return
        if (!form.name.trim() || !form.category || !form.unit || !form.price.trim() || isNaN(Number(form.price))) {
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
        <div className='min-h-screen w-full py-8 sm:py-10'>
            <div className='w-[94%] md:w-[90%] max-w-6xl mx-auto'>
                <button
                    onClick={() => router.push("/")}
                    className='flex items-center gap-2 text-green-700 hover:text-green-800 font-medium text-sm mb-5'
                >
                    <ArrowLeft size={16} />
                    Back
                </button>

                {/* Header */}
                <div className='flex items-center justify-between gap-3 mb-6'>
                    <div>
                        <h1 className='text-xl sm:text-2xl font-bold text-green-700'>Your Groceries</h1>
                        <p className='text-xs sm:text-sm text-gray-500 mt-0.5'>
                            {groceries.length} {groceries.length === 1 ? 'product' : 'products'} in your store
                        </p>
                    </div>
                    <Link
                        href='/admin/add-grocery'
                        className='flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2 rounded-full transition-all shrink-0'
                    >
                        <Plus size={16} />
                        <span className='hidden sm:inline'>Add Grocery</span>
                        <span className='sm:hidden'>Add</span>
                    </Link>
                </div>

                {/* Toolbar */}
                <div className='grid grid-cols-2 md:grid-cols-[1fr_220px_190px] gap-3 mb-4'>
                    <div className='relative col-span-2 md:col-span-1'>
                        <Search size={16} className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-400' />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder='Search by name or category...'
                            className={`${inputClass} pl-9`}
                        />
                    </div>
                    <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className={inputClass}
                    >
                        <option value="all">All categories</option>
                        {categories.map((c) => (
                            <option key={c} value={c}>{c}</option>
                        ))}
                    </select>
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as SortKey)}
                        className={inputClass}
                    >
                        <option value="newest">Newest first</option>
                        <option value="price-low">Price: low to high</option>
                        <option value="price-high">Price: high to low</option>
                        <option value="name">Name: A to Z</option>
                    </select>
                </div>

                {!loading && groceries.length > 0 && (
                    <p className='text-xs text-gray-500 mb-3'>
                        Showing {visible.length} of {groceries.length}
                    </p>
                )}

                {/* Content */}
                {loading ? (
                    <div className='space-y-3'>
                        {[0, 1, 2, 3].map((i) => (
                            <div key={i} className='h-20 bg-white border border-gray-200 rounded-xl animate-pulse' />
                        ))}
                    </div>
                ) : groceries.length === 0 ? (
                    <div className='text-center py-20 bg-white border border-gray-200 rounded-xl'>
                        <PackageOpen className='w-14 h-14 text-gray-300 mx-auto mb-4' />
                        <p className='text-gray-700 font-medium'>No groceries yet</p>
                        <p className='text-gray-500 text-sm mt-1 mb-5'>Add your first product to start selling.</p>
                        <Link href='/admin/add-grocery' className='inline-block bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-5 py-2.5 rounded-full transition-all'>
                            Add Grocery
                        </Link>
                    </div>
                ) : visible.length === 0 ? (
                    <div className='text-center py-20 bg-white border border-gray-200 rounded-xl'>
                        <SearchX className='w-14 h-14 text-gray-300 mx-auto mb-4' />
                        <p className='text-gray-700 font-medium'>No products match your search</p>
                        <button onClick={clearFilters} className='mt-4 text-green-700 hover:text-green-800 text-sm font-medium'>
                            Clear filters
                        </button>
                    </div>
                ) : (
                    <>
                        {/* Tablet and desktop: table */}
                        <div className='hidden md:block bg-white rounded-xl border border-gray-200 overflow-hidden'>
                            <table className='w-full text-sm'>
                                <thead className='bg-gray-50 border-b border-gray-200 text-left text-xs text-gray-500'>
                                    <tr>
                                        <th className='px-5 py-3 font-medium'>Product</th>
                                        <th className='px-3 py-3 font-medium'>Category</th>
                                        <th className='px-3 py-3 font-medium'>Price</th>
                                        <th className='px-5 py-3 font-medium text-right'>Actions</th>
                                    </tr>
                                </thead>
                                <tbody className='divide-y divide-gray-100'>
                                    {visible.map((g) => (
                                        <tr key={g._id} className='hover:bg-gray-50 transition-colors'>
                                            <td className='px-5 py-3'>
                                                <div className='flex items-center gap-3 min-w-0'>
                                                    <div className='relative w-12 h-12 rounded-md overflow-hidden bg-gray-50 border border-gray-100 shrink-0'>
                                                        <Image src={g.image} alt={g.name} fill sizes='48px' className='object-contain p-1' />
                                                    </div>
                                                    <span className='font-medium text-gray-800 truncate'>{g.name}</span>
                                                </div>
                                            </td>
                                            <td className='px-3 py-3'>
                                                <span className='text-xs text-gray-600 bg-gray-100 px-2.5 py-1 rounded-full whitespace-nowrap'>{g.category}</span>
                                            </td>
                                            <td className='px-3 py-3 whitespace-nowrap'>
                                                <span className='font-semibold text-green-700'>Rs {g.price}</span>
                                                <span className='text-xs text-gray-400'> / {g.unit}</span>
                                            </td>
                                            <td className='px-5 py-3'>
                                                <div className='flex items-center justify-end gap-2'>
                                                    <button
                                                        onClick={() => openEdit(g)}
                                                        className='flex items-center gap-1.5 text-xs font-medium border border-gray-300 text-gray-700 px-3 py-1.5 rounded-md hover:bg-gray-50 transition-colors'
                                                    >
                                                        <Pencil size={13} />
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => { setDeleteItem(g); setModalError("") }}
                                                        className='flex items-center gap-1.5 text-xs font-medium border border-red-200 text-red-600 px-3 py-1.5 rounded-md hover:bg-red-50 transition-colors'
                                                    >
                                                        <Trash2 size={13} />
                                                        Delete
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Phones: cards */}
                        <div className='md:hidden space-y-3'>
                            {visible.map((g) => (
                                <motion.div
                                    key={g._id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className='bg-white rounded-xl border border-gray-200 p-4'
                                >
                                    <div className='flex gap-3'>
                                        <div className='relative w-16 h-16 rounded-lg overflow-hidden bg-gray-50 border border-gray-100 shrink-0'>
                                            <Image src={g.image} alt={g.name} fill sizes='64px' className='object-contain p-1.5' />
                                        </div>
                                        <div className='flex-1 min-w-0'>
                                            <p className='font-semibold text-gray-800 truncate'>{g.name}</p>
                                            <span className='inline-block mt-1 text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full'>{g.category}</span>
                                            <p className='mt-1.5 text-green-700 font-bold'>
                                                Rs {g.price}
                                                <span className='text-xs text-gray-400 font-normal'> / {g.unit}</span>
                                            </p>
                                        </div>
                                    </div>
                                    <div className='flex gap-2 mt-3 pt-3 border-t border-gray-100'>
                                        <button
                                            onClick={() => openEdit(g)}
                                            className='flex-1 flex items-center justify-center gap-1.5 text-sm font-medium border border-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-50 transition-colors'
                                        >
                                            <Pencil size={14} />
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => { setDeleteItem(g); setModalError("") }}
                                            className='flex-1 flex items-center justify-center gap-1.5 text-sm font-medium border border-red-200 text-red-600 py-2 rounded-lg hover:bg-red-50 transition-colors'
                                        >
                                            <Trash2 size={14} />
                                            Delete
                                        </button>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </>
                )}
            </div>

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
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            transition={{ duration: 0.2 }}
                            className='bg-white w-full max-w-md rounded-xl p-5 sm:p-6 max-h-[90vh] overflow-y-auto'
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className='flex items-start justify-between gap-3 mb-5'>
                                <div className='flex items-center gap-3'>
                                    <div className='relative w-14 h-14 rounded-lg overflow-hidden bg-gray-50 border border-gray-100 shrink-0'>
                                        <Image src={editItem.image} alt={editItem.name} fill sizes='56px' className='object-contain p-1.5' />
                                    </div>
                                    <div>
                                        <p className='font-semibold text-gray-800'>Edit product</p>
                                        <p className='text-xs text-gray-500'>The image can't be changed here.</p>
                                    </div>
                                </div>
                                <button onClick={closeModals} aria-label='Close' className='text-gray-400 hover:text-gray-600'>
                                    <X size={20} />
                                </button>
                            </div>

                            <div className='space-y-4'>
                                <div>
                                    <label className='block text-sm font-medium text-gray-700 mb-1'>Name</label>
                                    <input
                                        type="text"
                                        value={form.name}
                                        onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                                        className={inputClass}
                                    />
                                </div>
                                <div>
                                    <label className='block text-sm font-medium text-gray-700 mb-1'>Category</label>
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
                                        <label className='block text-sm font-medium text-gray-700 mb-1'>Unit</label>
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
                                        <label className='block text-sm font-medium text-gray-700 mb-1'>Price (Rs)</label>
                                        <input
                                            type="text"
                                            inputMode='decimal'
                                            value={form.price}
                                            onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))}
                                            className={inputClass}
                                        />
                                    </div>
                                </div>
                            </div>

                            {modalError && <p className='text-sm text-red-600 mt-4'>{modalError}</p>}

                            <div className='flex gap-3 mt-6'>
                                <button
                                    onClick={closeModals}
                                    disabled={busy}
                                    className='flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50'
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={busy}
                                    className='flex-1 bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-60'
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
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            transition={{ duration: 0.2 }}
                            className='bg-white w-full max-w-sm rounded-xl p-6 text-center'
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className='w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4'>
                                <Trash2 size={22} className='text-red-600' />
                            </div>
                            <p className='font-semibold text-gray-800'>Delete this product?</p>
                            <p className='text-sm text-gray-500 mt-1'>
                                <span className='font-medium text-gray-700'>{deleteItem.name}</span> will be removed from your store. This can't be undone.
                            </p>

                            {modalError && <p className='text-sm text-red-600 mt-3'>{modalError}</p>}

                            <div className='flex gap-3 mt-6'>
                                <button
                                    onClick={closeModals}
                                    disabled={busy}
                                    className='flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50'
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDelete}
                                    disabled={busy}
                                    className='flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-60'
                                >
                                    {busy ? "Deleting..." : "Delete"}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

export default ViewGrocery