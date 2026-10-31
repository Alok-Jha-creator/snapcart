import { NextResponse } from "next/server"
import { deliveryRoute } from "@/lib/deliveryRoute"
import Delivery from "@/models/delivery.model"
import DeliveryRejection from "@/models/deliveryRejection.model"

// The delivery boy says no, before picking the order up.
// The delivery record is removed, so the order goes back to "Not Assigned" for the admin.
export const POST = deliveryRoute(async ({ req, id, boy }) => {
    const body = await req.json().catch(() => ({}))
    const reason = String(body?.reason ?? "").trim().slice(0, 200)

    const delivery = await Delivery.findOneAndDelete({ _id: id, deliveryBoy: boy._id, status: "pending" })
    if (!delivery) {
        return NextResponse.json({ message: "This order can no longer be rejected." }, { status: 409 })
    }

    await DeliveryRejection.create({ order: delivery.order, deliveryBoy: boy._id, boyName: boy.name, reason })
    return NextResponse.json({ ok: true })
})
