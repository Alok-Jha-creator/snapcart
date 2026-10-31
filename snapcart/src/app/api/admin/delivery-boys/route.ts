import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import connectDb from "@/lib/db"
import requireAdmin from "@/lib/requireAdmin"
import DeliveryBoy from "@/models/deliveryBoy.model"
import User from "@/models/user.model"
import uploadOnCloudinary from "@/lib/cloudinary"
import { EMAIL, MIN_PASSWORD, PHONE, emailTaken } from "@/lib/deliveryAccount"

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

// Adds a delivery boy together with the login (a User with role "deliveryBoy") they will use
export async function POST(req: NextRequest) {
    try {
        await connectDb()
        if (!(await requireAdmin())) return NextResponse.json({ message: "Not allowed" }, { status: 403 })

        const formData = await req.formData()
        const name = String(formData.get("name") ?? "").trim().slice(0, 60)
        const phone = String(formData.get("phone") ?? "").trim()
        const email = String(formData.get("email") ?? "").trim().toLowerCase()
        const password = String(formData.get("password") ?? "")

        if (!name) return NextResponse.json({ message: "Name is required" }, { status: 400 })
        if (!PHONE.test(phone)) return NextResponse.json({ message: "Enter a valid phone number" }, { status: 400 })
        if (!EMAIL.test(email)) return NextResponse.json({ message: "Enter a valid email address" }, { status: 400 })
        if (password.length < MIN_PASSWORD) {
            return NextResponse.json({ message: `Password must be at least ${MIN_PASSWORD} characters` }, { status: 400 })
        }
        if (await DeliveryBoy.findOne({ phone })) {
            return NextResponse.json({ message: "A delivery boy with this phone number already exists" }, { status: 409 })
        }
        if (await emailTaken(email)) {
            return NextResponse.json({ message: "An account with this email already exists" }, { status: 409 })
        }

        let image = ""
        const file = formData.get("image") as File | null
        if (file && file.size > 0) {
            const url = await uploadOnCloudinary(file)
            if (!url) return NextResponse.json({ message: "Photo upload failed" }, { status: 500 })
            image = url
        }

        const user = await User.create({
            name,
            email,
            password: await bcrypt.hash(password, 10),
            mobile: phone,
            role: "deliveryBoy",
            image: image || undefined,
        })

        try {
            const boy = await DeliveryBoy.create({ name, phone, image, email, user: user._id })
            return NextResponse.json(boy, { status: 201 })
        } catch (error) {
            await User.findByIdAndDelete(user._id) // do not leave a login without a delivery boy
            throw error
        }
    } catch (error) {
        return NextResponse.json({ message: `Could not add delivery boy: ${error}` }, { status: 500 })
    }
}
