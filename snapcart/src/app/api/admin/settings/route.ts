import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import connectDb from "@/lib/db"
import User from "@/models/user.model"
import Settings, { defaultSettings } from "@/models/settings.model"
import uploadOnCloudinary from "@/lib/cloudinary"

type Section = "store" | "inventory" | "delivery" | "notifications"
const SECTIONS: Section[] = ["store", "inventory", "delivery", "notifications"]

const text = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max)
const amount = (v: unknown) => Math.max(0, Number(v) || 0)
const time = (v: unknown, fallback: string) => (/^\d{2}:\d{2}$/.test(String(v)) ? String(v) : fallback)
const bool = (v: unknown) => v === true

// Keep only the fields we know about, with safe values
const clean = (section: Section, v: Record<string, unknown>, existingLogo: string) => {
    const d = defaultSettings
    if (section === "store") {
        return {
            name: text(v.name, 60) || d.store.name,
            logo: existingLogo,
            address: text(v.address, 200),
            phone: text(v.phone, 20),
            currency: "NPR",
            openTime: time(v.openTime, d.store.openTime),
            closeTime: time(v.closeTime, d.store.closeTime),
        }
    }
    if (section === "inventory") {
        return {
            lowStockThreshold: amount(v.lowStockThreshold),
            defaultUnit: ["kg", "g", "liter", "ml", "piece", "pack"].includes(String(v.defaultUnit)) ? String(v.defaultUnit) : "",
            outOfStock: v.outOfStock === "hide" ? "hide" : "show",
            maxQtyPerOrder: Math.floor(amount(v.maxQtyPerOrder)),
        }
    }
    if (section === "delivery") {
        const areas = Array.isArray(v.areas) ? v.areas.map((a) => text(a, 40)).filter(Boolean).slice(0, 50) : []
        return {
            charge: amount(v.charge),
            freeDeliveryMin: amount(v.freeDeliveryMin),
            minOrderAmount: amount(v.minOrderAmount),
            areas,
            allowCancel: bool(v.allowCancel),
            cancelWindowMinutes: Math.floor(amount(v.cancelWindowMinutes)),
        }
    }
    return {
        newOrder: bool(v.newOrder),
        pendingReminder: bool(v.pendingReminder),
        reminderMinutes: Math.floor(amount(v.reminderMinutes)) || d.notifications.reminderMinutes,
        lowStock: bool(v.lowStock),
        email: bool(v.email),
    }
}

const requireAdmin = async () => {
    const session = await auth()
    if (!session?.user?.email) return null
    const user = await User.findOne({ email: session.user.email })
    return user && user.role === "admin" ? user : null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const withDefaults = (doc: any) => ({
    store: { ...defaultSettings.store, ...(doc?.store ?? {}) },
    inventory: { ...defaultSettings.inventory, ...(doc?.inventory ?? {}) },
    delivery: { ...defaultSettings.delivery, ...(doc?.delivery ?? {}) },
    notifications: { ...defaultSettings.notifications, ...(doc?.notifications ?? {}) },
})

export async function GET() {
    try {
        await connectDb()
        if (!(await requireAdmin())) return NextResponse.json({ message: "Not allowed" }, { status: 403 })
        const doc = await Settings.findOne({ key: "main" }).lean()
        return NextResponse.json(withDefaults(doc))
    } catch (error) {
        return NextResponse.json({ message: `Could not load settings: ${error}` }, { status: 500 })
    }
}

export async function PUT(req: NextRequest) {
    try {
        await connectDb()
        if (!(await requireAdmin())) return NextResponse.json({ message: "Not allowed" }, { status: 403 })

        const formData = await req.formData()
        const section = String(formData.get("section")) as Section
        if (!SECTIONS.includes(section)) return NextResponse.json({ message: "Unknown settings section" }, { status: 400 })

        let values: Record<string, unknown> = {}
        try { values = JSON.parse(String(formData.get("values") ?? "{}")) } catch { /* use empty values */ }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const existing = (await Settings.findOne({ key: "main" }).lean()) as any
        let logo: string = existing?.store?.logo ?? ""
        const file = formData.get("logo") as File | null
        if (section === "store" && file && file.size > 0) {
            const url = await uploadOnCloudinary(file)
            if (!url) return NextResponse.json({ message: "Logo upload failed" }, { status: 500 })
            logo = url
        }

        const updated = await Settings.findOneAndUpdate(
            { key: "main" },
            { $set: { [section]: clean(section, values, logo) } },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        ).lean()

        return NextResponse.json(withDefaults(updated))
    } catch (error) {
        return NextResponse.json({ message: `Could not save settings: ${error}` }, { status: 500 })
    }
}