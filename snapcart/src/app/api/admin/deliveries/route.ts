import { NextRequest, NextResponse } from "next/server"
import mongoose from "mongoose"
import connectDb from "@/lib/db"
import requireAdmin from "@/lib/requireAdmin"
import Delivery from "@/models/delivery.model"
import DeliveryBoy from "@/models/deliveryBoy.model"

export async function GET() {
    try {
        await connectDb()
        if (!(await requireAdmin())) return NextResponse.json({ message: "Not allowed" }, { status: 403 })
        const deliveries = await Delivery.find().sort({ assignedAt: -1 })
        return NextResponse.json(deliveries)
    } catch (error) {
        return NextResponse.json({ message: `Could not load deliveries: ${error}` }, { status: 500 })
    }
}

// Assign (or re-assign) an order to a delivery boy
export async function POST(req: NextRequest) {
    try {
        await connectDb()
        if (!(await requireAdmin())) return NextResponse.json({ message: "Not allowed" }, { status: 403 })

        const { orderId, deliveryBoyId } = await req.json()
        if (!mongoose.isValidObjectId(orderId) || !mongoose.isValidObjectId(deliveryBoyId)) {
            return NextResponse.json({ message: "Invalid order or delivery boy" }, { status: 400 })
        }

        const boy = await DeliveryBoy.findById(deliveryBoyId)
        if (!boy) return NextResponse.json({ message: "Delivery boy not found" }, { status: 404 })
        if (!boy.isActive) return NextResponse.json({ message: "This delivery boy is inactive" }, { status: 400 })

        const existing = await Delivery.findOne({ order: orderId })
        if (existing && (existing.status === "out for delivery" || existing.status === "delivered")) {
            return NextResponse.json({ message: "This order is already out for delivery or delivered" }, { status: 409 })
        }

        const delivery = await Delivery.findOneAndUpdate(
            { order: orderId },
            { $set: { deliveryBoy: deliveryBoyId, status: "pending", assignedAt: new Date() } },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        )
        return NextResponse.json(delivery)
    } catch (error) {
        return NextResponse.json({ message: `Could not assign the order: ${error}` }, { status: 500 })
    }
}