import { NextRequest, NextResponse } from "next/server"
import mongoose from "mongoose"
import connectDb from "@/lib/db"
import requireAdmin from "@/lib/requireAdmin"
import Delivery, { DeliveryStatus } from "@/models/delivery.model"

// Which status can follow which
const NEXT: Record<DeliveryStatus, DeliveryStatus[]> = {
    pending: ["out for delivery"],
    "out for delivery": ["delivered", "failed"],
    delivered: [],
    failed: [], // a failed order is assigned again from the assign step
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
    try {
        await connectDb()
        if (!(await requireAdmin())) return NextResponse.json({ message: "Not allowed" }, { status: 403 })

        const { id } = await context.params
        if (!mongoose.isValidObjectId(id)) return NextResponse.json({ message: "Invalid delivery" }, { status: 400 })

        const { status } = await req.json()
        const delivery = await Delivery.findById(id)
        if (!delivery) return NextResponse.json({ message: "Delivery not found" }, { status: 404 })

        if (!NEXT[delivery.status as DeliveryStatus]?.includes(status)) {
            return NextResponse.json({ message: `Cannot move a "${delivery.status}" delivery to "${status}"` }, { status: 400 })
        }

        delivery.status = status
        await delivery.save()
        return NextResponse.json(delivery)
    } catch (error) {
        return NextResponse.json({ message: `Could not update the delivery: ${error}` }, { status: 500 })
    }
}