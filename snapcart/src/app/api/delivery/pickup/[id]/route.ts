import { NextResponse } from "next/server"
import { deliveryRoute } from "@/lib/deliveryRoute"
import Delivery from "@/models/delivery.model"
import Order from "@/models/order.model"

// The delivery boy has the order and starts the delivery (order becomes "out of delivery")
export const POST = deliveryRoute(async ({ id, boy }) => {
    const delivery = await Delivery.findOneAndUpdate(
        { _id: id, deliveryBoy: boy._id, status: "pending", acceptedAt: { $ne: null } },
        { $set: { status: "out for delivery", pickedUpAt: new Date() } },
        { new: true }
    )
    if (!delivery) {
        return NextResponse.json({ message: "Accept the order first. It may also be on the road already." }, { status: 409 })
    }

    await Order.updateOne({ _id: delivery.order }, { $set: { status: "out of delivery" } })
    return NextResponse.json({ ok: true })
})
