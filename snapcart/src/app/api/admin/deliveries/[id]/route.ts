import { NextRequest, NextResponse } from "next/server"
import mongoose from "mongoose"
import connectDb from "@/lib/db"
import requireAdmin from "@/lib/requireAdmin"
import Delivery, { DeliveryStatus } from "@/models/delivery.model"
import { DELIVERY_FEE } from "@/lib/deliveryConfig"

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

        // CHANGED: also keep the times and earnings the delivery boy's dashboard shows
        const now = new Date()
        delivery.status = status
        if (status === "out for delivery") {
            delivery.pickedUpAt = now
            if (!delivery.acceptedAt) delivery.acceptedAt = now
        }
        if (status === "delivered") {
            delivery.deliveredAt = now
            delivery.fee = DELIVERY_FEE
        }
        if (status === "failed") {
            delivery.failedAt = now
            if (!delivery.failReason) delivery.failReason = "Marked as failed by the admin"
        }
        await delivery.save()
        return NextResponse.json(delivery)
    } catch (error) {
        return NextResponse.json({ message: `Could not update the delivery: ${error}` }, { status: 500 })
    }
}
