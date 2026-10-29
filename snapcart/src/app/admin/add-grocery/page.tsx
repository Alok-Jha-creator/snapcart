'use client'
import { AlertCircle, CheckCircle2, ChevronRight, ImageIcon, Loader, RotateCcw, Trash2, UploadCloud } from 'lucide-react'
import Link from 'next/link'
import React, { ChangeEvent, DragEvent, FormEvent, useEffect, useState } from 'react'
import Image from 'next/image'
import axios from 'axios'
import AdminShell from '@/components/AdminShell'

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

const MAX_DESC = 300
const MAX_IMAGE_MB = 5

const inputClass =
  'w-full border border-gray-200 bg-white rounded-xl px-3.5 py-3 text-sm outline-none placeholder:text-gray-400 focus:border-green-400 focus:ring-2 focus:ring-green-400/30 transition-all'
const labelClass = 'block text-sm font-medium text-gray-700 mb-1.5'

const AddGrocery = () => {
  const [name, setName] = useState("")
  const [category, setCategory] = useState("")
  const [description, setDescription] = useState("")
  const [unit, setUnit] = useState("")
  const [price, setPrice] = useState("")
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [backendImage, setBackendImage] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // free the temporary image URL when it changes or the page closes
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview)
    }
  }, [preview])

  const showNotice = (type: 'success' | 'error', text: string) => {
    setNotice({ type, text })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const pickFile = (file?: File) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      showNotice('error', 'Please choose an image file (JPG, PNG or WEBP).')
      return
    }
    if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
      showNotice('error', `Image is too large. Please keep it under ${MAX_IMAGE_MB} MB.`)
      return
    }
    setNotice(null)
    setBackendImage(file)
    setPreview(URL.createObjectURL(file))
  }

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    pickFile(e.target.files?.[0])
    e.target.value = ''
  }

  const handleDrop = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault()
    setDragging(false)
    pickFile(e.dataTransfer.files?.[0])
  }

  const removeImage = () => {
    setBackendImage(null)
    setPreview(null)
  }

  const resetForm = () => {
    setName("")
    setCategory("")
    setDescription("")
    setUnit("")
    setPrice("")
    removeImage()
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setNotice(null)

    if (!name.trim() || !category || !unit || !price || !description.trim()) {
      showNotice('error', 'Please fill in all the fields marked with *.')
      return
    }
    if (!(Number(price) > 0)) {
      showNotice('error', 'Price must be a number greater than 0.')
      return
    }
    if (!backendImage) {
      showNotice('error', 'Please upload an image of the grocery.')
      return
    }

    setLoading(true)
    try {
      const formData = new FormData()
      formData.append("name", name.trim())
      formData.append("category", category)
      formData.append("description", description.trim())
      formData.append("price", price)
      formData.append("unit", unit)
      formData.append("image", backendImage)

      const result = await axios.post("/api/admin/add-grocery", formData)
      console.log(result.data)
      showNotice('success', `${name.trim()} was added to your store.`)
      resetForm()
    } catch (error) {
      console.log(error)
      const message = axios.isAxiosError(error) ? error.response?.data?.message : undefined
      showNotice('error', message || 'Could not add the grocery. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AdminShell>
      {/* title + breadcrumb */}
      <div className='flex flex-wrap items-center justify-between gap-3 mb-6'>
        <h1 className='text-3xl font-bold text-[#0b5c3b]'>Add Grocery</h1>
        <nav aria-label='Breadcrumb' className='flex items-center gap-1.5 text-sm text-gray-500'>
          <Link href='/' className='hover:text-green-700'>Dashboard</Link>
          <ChevronRight size={14} />
          <Link href='/admin/view-grocery' className='hover:text-green-700'>Products</Link>
          <ChevronRight size={14} />
          <span className='text-gray-800 font-medium'>Add Grocery</span>
        </nav>
      </div>

      {notice && (
        <div
          role='status'
          className={`mb-5 flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm ${
            notice.type === 'success'
              ? 'bg-green-50 border-green-200 text-green-800'
              : 'bg-red-50 border-red-100 text-red-600'
          }`}
        >
          {notice.type === 'success' ? <CheckCircle2 size={18} className='mt-0.5 shrink-0' /> : <AlertCircle size={18} className='mt-0.5 shrink-0' />}
          <p className='flex-1'>
            {notice.text}
            {notice.type === 'success' && (
              <Link href='/admin/view-grocery' className='ml-2 font-semibold underline underline-offset-2'>View groceries</Link>
            )}
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className='grid grid-cols-1 xl:grid-cols-2 gap-5 items-start'>
        {/* left: details */}
        <section className='bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6'>
          <h2 className='text-lg font-semibold text-[#0b5c3b] mb-5'>Grocery details</h2>

          <div className='space-y-4'>
            <div>
              <label htmlFor='name' className={labelClass}>Grocery name <span className='text-red-500'>*</span></label>
              <input
                id='name'
                type='text'
                placeholder='e.g. Fresh tomato, Milk, Sweets'
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputClass}
              />
            </div>

            <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
              <div>
                <label htmlFor='category' className={labelClass}>Category <span className='text-red-500'>*</span></label>
                <select id='category' value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass}>
                  <option value=''>Select category</option>
                  {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor='unit' className={labelClass}>Unit <span className='text-red-500'>*</span></label>
                <select id='unit' value={unit} onChange={(e) => setUnit(e.target.value)} className={inputClass}>
                  <option value=''>Select unit</option>
                  {units.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor='price' className={labelClass}>Price (Rs) <span className='text-red-500'>*</span></label>
              <div className='relative'>
                <span className='absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-gray-400'>Rs</span>
                <input
                  id='price'
                  type='text'
                  inputMode='decimal'
                  placeholder='e.g. 120'
                  value={price}
                  onChange={(e) => setPrice(e.target.value.replace(/[^0-9.]/g, ''))}
                  className={`${inputClass} pl-10`}
                />
              </div>
            </div>

            <div>
              <label htmlFor='description' className={labelClass}>Description <span className='text-red-500'>*</span></label>
              <textarea
                id='description'
                rows={6}
                maxLength={MAX_DESC}
                placeholder='Tell customers about freshness, origin, or pack size...'
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={`${inputClass} resize-none`}
              />
              <p className='text-xs text-gray-400 mt-1.5 text-right'>{description.length}/{MAX_DESC}</p>
            </div>
          </div>
        </section>

        {/* right: image + preview + actions */}
        <section className='bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6'>
          <h2 className='text-lg font-semibold text-[#0b5c3b] mb-5'>Grocery image <span className='text-red-500'>*</span></h2>

          <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
            {/* dropzone */}
            <div className='relative'>
              <label
                htmlFor='image'
                onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                className={`flex flex-col items-center justify-center text-center gap-2 aspect-square rounded-xl border-2 border-dashed px-4 cursor-pointer transition-colors ${
                  dragging ? 'border-green-500 bg-green-50' : 'border-green-300 bg-green-50/40 hover:bg-green-50'
                }`}
              >
                <UploadCloud size={36} className='text-green-600' />
                <p className='text-xs text-gray-500 leading-5'>
                  Drop your image here or<br />
                  <span className='font-semibold text-green-700'>click to browse</span>
                </p>
                <p className='text-[11px] text-gray-400'>JPG, PNG or WEBP, up to {MAX_IMAGE_MB} MB</p>
              </label>
              <input id='image' type='file' accept='image/*' hidden onChange={handleImageChange} />
            </div>

            {/* live preview */}
            <div className='rounded-xl border border-gray-100 bg-gray-50/60 p-3 flex flex-col'>
              <p className='text-xs font-medium text-gray-500 mb-2'>Preview</p>
              <div className='relative aspect-square rounded-lg bg-white border border-gray-100 overflow-hidden flex items-center justify-center'>
                {preview ? (
                  <>
                    <Image src={preview} alt='Selected grocery' fill sizes='200px' className='object-contain p-2' />
                    <button
                      type='button'
                      onClick={removeImage}
                      aria-label='Remove image'
                      className='absolute top-2 right-2 w-8 h-8 rounded-full bg-white/95 shadow flex items-center justify-center text-red-500 hover:bg-red-50'
                    >
                      <Trash2 size={16} />
                    </button>
                  </>
                ) : (
                  <ImageIcon size={32} className='text-gray-300' />
                )}
              </div>
              <p className='text-sm font-medium text-gray-800 truncate mt-2'>{name.trim() || 'Grocery name'}</p>
              <p className='text-xs text-gray-500'>
                <span className='text-green-700 font-semibold'>Rs {price || '0'}</span> / {unit || 'unit'}
              </p>
              {category && <p className='text-[11px] text-gray-400 mt-1 truncate'>{category}</p>}
            </div>
          </div>

          <p className='text-xs text-gray-500 leading-5 mt-4'>
            Use a clear photo on a plain background. Customers see this image in the store, so the whole product should be visible.
          </p>

          <div className='grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6'>
            <button
              type='submit'
              disabled={loading}
              className='flex items-center justify-center gap-2 rounded-xl bg-linear-to-r from-green-500 to-green-700 text-white font-semibold py-3 shadow-sm hover:shadow-md disabled:opacity-60 transition-all'
            >
              {loading ? <><Loader className='w-5 h-5 animate-spin' /> Adding...</> : 'Add grocery'}
            </button>
            <button
              type='button'
              onClick={() => { resetForm(); setNotice(null) }}
              disabled={loading}
              className='flex items-center justify-center gap-2 rounded-xl border border-gray-200 text-gray-700 font-semibold py-3 hover:bg-gray-50 disabled:opacity-60 transition-colors'
            >
              <RotateCcw size={16} /> Reset form
            </button>
          </div>
        </section>
      </form>
    </AdminShell>
  )
}

export default AddGrocery