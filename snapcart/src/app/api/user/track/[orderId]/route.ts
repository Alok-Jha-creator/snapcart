import { NextRequest, NextResponse } from "next/server"
import mongoose from "mongoose"
import { auth } from "@/auth"
import connectDb from "@/lib/db"
import Order from "@/models/order.model"
import Delivery from "@/models/delivery.model"
import "@/models/deliveryBoy.model"

type Stage = "placed" | "assigned" | "accepted" | "on_the_way" | "delivered" | "failed"

interface LeanOrder {
    _id: unknown
    user: unknown
    status: "pending" | "out of delivery" | "delivered"
    paymentMethod: "cod" | "online"
    isPaid: boolean
    totalAmount: number
    createdAt: Date
    items: { name: string; quantity: number; unit: string }[]
    address: {
        fullName: string
        mobile?: string
        fullAddress: string
        city: string
        state: string
        latitude?: number
        longitude?: number
    }
}

interface LeanDelivery {
    status: "pending" | "out for delivery" | "delivered" | "failed"
    assignedAt?: Date
    acceptedAt?: Date | null
    pickedUpAt?: Date | null
    deliveredAt?: Date | null
    deliveryBoy: null | {
        name: string
        image?: string
        phone?: string
        liveLocation?: { lat?: number; lng?: number; at?: Date }
    }
}

// What the customer sees about one of their own orders: the status, who is delivering it,
// and (only while it is on the way) where the delivery boy is right now.
export async function GET(_req: NextRequest, context: { params: Promise<{ orderId: string }> }) {
    try {
        const session = await auth()
        const userId = session?.user?.id
        if (!userId) return NextResponse.json({ message: "Please log in again." }, { status: 401 })

        const { orderId } = await context.params
        if (!mongoose.isValidObjectId(orderId)) return NextResponse.json({ message: "Invalid order" }, { status: 400 })

        await connectDb()
        const order = await Order.findById(orderId).lean<LeanOrder>()
        // someone else's order looks exactly like an order that does not exist
        if (!order || String(order.user) !== String(userId)) {
            return NextResponse.json({ message: "Order not found" }, { status: 404 })
        }

        const delivery = await Delivery.findOne({ order: order._id })
            .populate("deliveryBoy", "name image phone liveLocation")
            .lean<LeanDelivery>()

        let stage: Stage = "placed"
        if (order.status === "delivered" || delivery?.status === "delivered") stage = "delivered"
        else if (delivery?.status === "failed" && order.status === "pending") stage = "failed"
        else if (order.status === "out of delivery" || delivery?.status === "out for delivery") stage = "on_the_way"
        else if (delivery) stage = delivery.acceptedAt ? "accepted" : "assigned"

        const boyDoc = stage === "failed" ? null : delivery?.deliveryBoy ?? null
        const knowsCustomerPhone = stage === "accepted" || stage === "on_the_way"
        const loc = boyDoc?.liveLocation

        return NextResponse.json({
            stage,
            order: {
                _id: String(order._id),
                totalAmount: order.totalAmount,
                paymentMethod: order.paymentMethod,
                isPaid: order.isPaid,
                createdAt: order.createdAt,
                items: order.items.map((i) => ({ name: i.name, quantity: i.quantity, unit: i.unit })),
                address: order.address,
            },
            boy: boyDoc
                ? {
                      name: boyDoc.name,
                      image: boyDoc.image ?? "",
                      // the delivery boy's phone number is shared only once he has accepted the order
                      phone: knowsCustomerPhone ? boyDoc.phone : undefined,
                  }
                : null,
            times: {
                placedAt: order.createdAt,
                assignedAt: delivery?.assignedAt ?? null,
                pickedUpAt: delivery?.pickedUpAt ?? null,
                deliveredAt: delivery?.deliveredAt ?? null,
            },
            // the live position is only given out while the order is on the way
            boyLocation:
                stage === "on_the_way" && loc?.lat != null && loc?.lng != null
                    ? { lat: loc.lat, lng: loc.lng, at: loc.at ?? null }
                    : null,
        })
    } catch (error) {
        return NextResponse.json({ message: `Could not load tracking: ${error}` }, { status: 500 })
    }
}
