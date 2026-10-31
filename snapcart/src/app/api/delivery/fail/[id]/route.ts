import { NextResponse } from "next/server"
import { deliveryRoute } from "@/lib/deliveryRoute"
import Delivery from "@/models/delivery.model"
import Order from "@/models/order.model"

// The delivery boy could not hand the order over. It goes back to pending, so the admin can assign it again.
export const POST = deliveryRoute(async ({ req, id, boy }) => {
    const body = await req.json().catch(() => ({}))
    const reason = String(body?.reason ?? "").trim().slice(0, 200)
    if (!reason) return NextResponse.json({ message: "Please tell why the order could not be delivered." }, { status: 400 })

    const delivery = await Delivery.findOneAndUpdate(
        { _id: id, deliveryBoy: boy._id, status: "out for delivery" },
        { $set: { status: "failed", failedAt: new Date(), failReason: reason } },
        { new: true }
    )
    if (!delivery) {
        return NextResponse.json({ message: "This order is not out for delivery." }, { status: 409 })
    }

    await Order.updateOne({ _id: delivery.order }, { $set: { status: "pending" } })
    return NextResponse.json({ ok: true })
})
