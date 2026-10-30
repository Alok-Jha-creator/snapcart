import { NextRequest, NextResponse } from "next/server"
import connectDb from "@/lib/db"
import requireAdmin from "@/lib/requireAdmin"
import DeliveryBoy from "@/models/deliveryBoy.model"
import uploadOnCloudinary from "@/lib/cloudinary"

const PHONE = /^[0-9+\-\s]{7,15}$/

export async function GET() {
    try {
        await connectDb()
        if (!(await requireAdmin())) return NextResponse.json({ message: "Not allowed" }, { status: 403 })
        const boys = await DeliveryBoy.find().sort({ createdAt: -1 })
        return NextResponse.json(boys)
    } catch (error) {
        return NextResponse.json({ message: `Could not load delivery boys: ${error}` }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    try {
        await connectDb()
        if (!(await requireAdmin())) return NextResponse.json({ message: "Not allowed" }, { status: 403 })

        const formData = await req.formData()
        const name = String(formData.get("name") ?? "").trim().slice(0, 60)
        const phone = String(formData.get("phone") ?? "").trim()
        if (!name) return NextResponse.json({ message: "Name is required" }, { status: 400 })
        if (!PHONE.test(phone)) return NextResponse.json({ message: "Enter a valid phone number" }, { status: 400 })
        if (await DeliveryBoy.findOne({ phone })) {
            return NextResponse.json({ message: "A delivery boy with this phone number already exists" }, { status: 409 })
        }

        let image = ""
        const file = formData.get("image") as File | null
        if (file && file.size > 0) {
            const url = await uploadOnCloudinary(file)
            if (!url) return NextResponse.json({ message: "Photo upload failed" }, { status: 500 })
            image = url
        }

        const boy = await DeliveryBoy.create({ name, phone, image })
        return NextResponse.json(boy, { status: 201 })
    } catch (error) {
        return NextResponse.json({ message: `Could not add delivery boy: ${error}` }, { status: 500 })
    }
}