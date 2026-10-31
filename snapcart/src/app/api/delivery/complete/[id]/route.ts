import { NextResponse } from "next/server"
import { deliveryRoute } from "@/lib/deliveryRoute"
import { DELIVERY_FEE } from "@/lib/deliveryConfig"
import Delivery from "@/models/delivery.model"
import Order from "@/models/order.model"

// The order reached the customer. For cash on delivery the delivery boy must confirm the cash.
export const POST = deliveryRoute(async ({ req, id, boy }) => {
    const body = await req.json().catch(() => ({}))

    const current = await Delivery.findOne({ _id: id, deliveryBoy: boy._id, status: "out for delivery" }).populate(
        "order",
        "paymentMethod isPaid totalAmount"
    )
    if (!current || !current.order) {
        return NextResponse.json({ message: "This order is not out for delivery." }, { status: 409 })
    }

    const order = current.order
    const isCod = order.paymentMethod === "cod"
    const mustCollect = isCod && !order.isPaid
    if (mustCollect && body?.cashCollected !== true) {
        return NextResponse.json({ message: `Please confirm that you collected Rs ${order.totalAmount} in cash.` }, { status: 400 })
    }

    const delivery = await Delivery.findOneAndUpdate(
        { _id: id, deliveryBoy: boy._id, status: "out for delivery" },
        {
            $set: {
                status: "delivered",
                deliveredAt: new Date(),
                fee: DELIVERY_FEE,
                cashCollected: mustCollect ? order.totalAmount : 0,
            },
        },
        { new: true }
    )
    if (!delivery) {
        return NextResponse.json({ message: "This order was already updated." }, { status: 409 })
    }

    await Order.updateOne(
        { _id: order._id },
        { $set: isCod ? { status: "delivered", isPaid: true } : { status: "delivered" } }
    )
    return NextResponse.json({ ok: true })
})
