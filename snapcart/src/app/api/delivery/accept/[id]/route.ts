import { NextResponse } from "next/server"
import { deliveryRoute } from "@/lib/deliveryRoute"
import Delivery from "@/models/delivery.model"

// The delivery boy accepts an order the admin gave them
export const POST = deliveryRoute(async ({ id, boy }) => {
    const delivery = await Delivery.findOneAndUpdate(
        { _id: id, deliveryBoy: boy._id, status: "pending", acceptedAt: null },
        { $set: { acceptedAt: new Date() } },
        { new: true }
    )
    if (!delivery) {
        return NextResponse.json({ message: "This order is no longer waiting for you to accept it." }, { status: 409 })
    }
    return NextResponse.json({ ok: true })
})
