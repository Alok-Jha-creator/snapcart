import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { auth } from "@/auth"
import connectDb from "@/lib/db"
import User from "@/models/user.model"

export async function POST(req: NextRequest) {
    try {
        await connectDb()
        const session = await auth()
        if (!session?.user?.email) return NextResponse.json({ message: "Please log in again" }, { status: 401 })

        const user = await User.findOne({ email: session.user.email })
        if (!user || user.role !== "admin") return NextResponse.json({ message: "Not allowed" }, { status: 403 })

        const { currentPassword, newPassword } = await req.json()
        if (!user.password) {
            return NextResponse.json({ message: "This account signs in with Google, so it has no password to change." }, { status: 400 })
        }
        if (typeof newPassword !== "string" || newPassword.length < 8) {
            return NextResponse.json({ message: "New password must be at least 8 characters." }, { status: 400 })
        }

        const matches = await bcrypt.compare(String(currentPassword ?? ""), user.password)
        if (!matches) return NextResponse.json({ message: "Current password is incorrect." }, { status: 400 })

        user.password = await bcrypt.hash(newPassword, 10)
        await user.save()
        return NextResponse.json({ message: "Password changed" })
    } catch (error) {
        return NextResponse.json({ message: `Could not change password: ${error}` }, { status: 500 })
    }
}