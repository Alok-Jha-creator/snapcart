import { NextRequest, NextResponse } from "next/server"
import mongoose from "mongoose"
import bcrypt from "bcryptjs"
import connectDb from "@/lib/db"
import requireAdmin from "@/lib/requireAdmin"
import DeliveryBoy from "@/models/deliveryBoy.model"
import User from "@/models/user.model"
import uploadOnCloudinary from "@/lib/cloudinary"
import { EMAIL, MIN_PASSWORD, PHONE, emailTaken } from "@/lib/deliveryAccount"

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
        const email = String(formData.get("email") ?? "").trim().toLowerCase()
        const password = String(formData.get("password") ?? "")
        if (!name) return NextResponse.json({ message: "Name is required" }, { status: 400 })
        if (!PHONE.test(phone)) return NextResponse.json({ message: "Enter a valid phone number" }, { status: 400 })

        const sameNumber = await DeliveryBoy.findOne({ phone, _id: { $ne: id } })
        if (sameNumber) return NextResponse.json({ message: "Another delivery boy already uses this phone number" }, { status: 409 })

        // The login that belongs to this delivery boy (older delivery boys may not have one yet)
        const account = boy.user ? await User.findById(boy.user) : null
        if (account) {
            if (!EMAIL.test(email)) return NextResponse.json({ message: "Enter a valid email address" }, { status: 400 })
            if (email !== account.email && (await emailTaken(email, account._id))) {
                return NextResponse.json({ message: "An account with this email already exists" }, { status: 409 })
            }
            if (password && password.length < MIN_PASSWORD) {
                return NextResponse.json({ message: `Password must be at least ${MIN_PASSWORD} characters` }, { status: 400 })
            }
        } else if (email || password) {
            if (!EMAIL.test(email)) return NextResponse.json({ message: "Enter a valid email address" }, { status: 400 })
            if (password.length < MIN_PASSWORD) {
                return NextResponse.json({ message: `Password must be at least ${MIN_PASSWORD} characters` }, { status: 400 })
            }
            if (await emailTaken(email)) {
                return NextResponse.json({ message: "An account with this email already exists" }, { status: 409 })
            }
        }

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

        if (account) {
            // keep the login in step with the delivery boy
            account.name = name
            account.mobile = phone
            account.email = email
            if (boy.image) account.image = boy.image
            if (password) account.password = await bcrypt.hash(password, 10)
            await account.save()
            boy.email = email
        } else if (email) {
            const created = await User.create({
                name,
                email,
                password: await bcrypt.hash(password, 10),
                mobile: phone,
                role: "deliveryBoy",
                image: boy.image || undefined,
            })
            boy.user = created._id
            boy.email = email
        }

        await boy.save()
        return NextResponse.json(boy)
    } catch (error) {
        return NextResponse.json({ message: `Could not update delivery boy: ${error}` }, { status: 500 })
    }
}
