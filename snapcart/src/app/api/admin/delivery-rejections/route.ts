import { NextResponse } from "next/server"
import connectDb from "@/lib/db"
import requireAdmin from "@/lib/requireAdmin"
import DeliveryRejection from "@/models/deliveryRejection.model"

// Orders that delivery boys rejected (newest first), so the admin can see who said no and why
export async function GET() {
    try {
        await connectDb()
        if (!(await requireAdmin())) return NextResponse.json({ message: "Not allowed" }, { status: 403 })
        const rejections = await DeliveryRejection.find().sort({ createdAt: -1 }).limit(300).lean()
        return NextResponse.json(rejections)
    } catch (error) {
        return NextResponse.json({ message: `Could not load rejections: ${error}` }, { status: 500 })
    }
}
