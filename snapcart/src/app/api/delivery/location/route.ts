import { NextRequest, NextResponse } from "next/server"
import User from "@/models/user.model"
import DeliveryBoy from "@/models/deliveryBoy.model"
import { requireDeliveryBoy } from "@/lib/requireDeliveryBoy"

// Saves where the delivery boy is (the dashboard sends this every 10 seconds while a delivery is on the way)
export async function POST(req: NextRequest) {
    try {
        const me = await requireDeliveryBoy()
        if (!me.ok) return NextResponse.json({ message: me.message }, { status: me.status })

        const { latitude, longitude } = await req.json()
        const lat = Number(latitude)
        const lng = Number(longitude)
        if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
            return NextResponse.json({ message: "Invalid location" }, { status: 400 })
        }

        await Promise.all([
            User.updateOne(
                { _id: me.user._id },
                { $set: { location: { type: "Point", coordinates: [lng, lat] }, isOnline: true } }
            ),
            // this one is what the customer's tracking page reads
            DeliveryBoy.updateOne({ _id: me.boy._id }, { $set: { liveLocation: { lat, lng, at: new Date() } } }),
        ])
        return NextResponse.json({ ok: true })
    } catch (error) {
        return NextResponse.json({ message: `Could not save location: ${error}` }, { status: 500 })
    }
}
