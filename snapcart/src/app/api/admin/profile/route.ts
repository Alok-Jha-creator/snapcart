import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import connectDb from "@/lib/db"
import User from "@/models/user.model"
import uploadOnCloudinary from "@/lib/cloudinary"

export async function PATCH(req: NextRequest) {
    try {
        await connectDb()
        const session = await auth()
        if (!session?.user?.email) return NextResponse.json({ message: "Please log in again" }, { status: 401 })

        const user = await User.findOne({ email: session.user.email })
        if (!user || user.role !== "admin") return NextResponse.json({ message: "Not allowed" }, { status: 403 })

        const formData = await req.formData()
        const name = String(formData.get("name") ?? "").trim().slice(0, 60)
        const mobile = String(formData.get("mobile") ?? "").trim()
        if (!name) return NextResponse.json({ message: "Name is required" }, { status: 400 })
        if (!/^[0-9+\-\s]{7,15}$/.test(mobile)) return NextResponse.json({ message: "Enter a valid phone number" }, { status: 400 })

        user.name = name
        user.mobile = mobile

        const file = formData.get("image") as File | null
        if (file && file.size > 0) {
            const url = await uploadOnCloudinary(file)
            if (!url) return NextResponse.json({ message: "Photo upload failed" }, { status: 500 })
            user.image = url
        }

        await user.save()
        return NextResponse.json({ name: user.name, mobile: user.mobile, image: user.image })
    } catch (error) {
        return NextResponse.json({ message: `Could not update profile: ${error}` }, { status: 500 })
    }
}