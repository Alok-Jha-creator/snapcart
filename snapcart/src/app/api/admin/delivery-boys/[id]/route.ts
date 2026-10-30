import { NextRequest, NextResponse } from "next/server"
import mongoose from "mongoose"
import connectDb from "@/lib/db"
import requireAdmin from "@/lib/requireAdmin"
import DeliveryBoy from "@/models/deliveryBoy.model"
import uploadOnCloudinary from "@/lib/cloudinary"

const PHONE = /^[0-9+\-\s]{7,15}$/

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
    try {
        await connectDb()
        if (!(await requireAdmin())) return NextResponse.json({ message: "Not allowed" }, { status: 403 })

        const { id } = await context.params
        if (!mongoose.isValidObjectId(id)) return NextResponse.json({ message: "Invalid delivery boy" }, { status: 400 })
        const boy = await DeliveryBoy.findById(id)
        if (!boy) return NextResponse.json({ message: "Delivery boy not found" }, { status: 404 })

        const formData = await req.formData()
        const name = String(formData.get("name") ?? "").trim().slice(0, 60)
        const phone = String(formData.get("phone") ?? "").trim()
        if (!name) return NextResponse.json({ message: "Name is required" }, { status: 400 })
        if (!PHONE.test(phone)) return NextResponse.json({ message: "Enter a valid phone number" }, { status: 400 })

        const sameNumber = await DeliveryBoy.findOne({ phone, _id: { $ne: id } })
        if (sameNumber) return NextResponse.json({ message: "Another delivery boy already uses this phone number" }, { status: 409 })

        boy.name = name
        boy.phone = phone
        const active = formData.get("isActive")
        if (active !== null) boy.isActive = String(active) === "true"

        const file = formData.get("image") as File | null
        if (file && file.size > 0) {
            const url = await uploadOnCloudinary(file)
            if (!url) return NextResponse.json({ message: "Photo upload failed" }, { status: 500 })
            boy.image = url
        }

        await boy.save()
        return NextResponse.json(boy)
    } catch (error) {
        return NextResponse.json({ message: `Could not update delivery boy: ${error}` }, { status: 500 })
    }
}