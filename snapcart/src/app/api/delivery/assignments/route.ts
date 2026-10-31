import { NextResponse } from "next/server"
import { requireDeliveryBoy } from "@/lib/requireDeliveryBoy"
import { DELIVERY_FEE } from "@/lib/deliveryConfig"
import Delivery from "@/models/delivery.model"
import "@/models/order.model"

interface LeanDelivery {
    _id: unknown
    status: "pending" | "out for delivery" | "delivered" | "failed"
    assignedAt?: Date
    acceptedAt?: Date | null
    pickedUpAt?: Date | null
    deliveredAt?: Date | null
    failedAt?: Date | null
    updatedAt?: Date
    failReason?: string
    fee?: number
    cashCollected?: number
    order: null | {
        _id: unknown
        items: unknown[]
        totalAmount: number
        paymentMethod: "cod" | "online"
        isPaid: boolean
        address: Record<string, unknown>
    }
}

// Where the delivery is, from the delivery boy's point of view
const stageOf = (d: LeanDelivery) => (d.status === "pending" ? (d.acceptedAt ? "accepted" : "new") : d.status)

const shape = (d: LeanDelivery) => {
    const stage = stageOf(d)
    const o = d.order
    return {
        _id: String(d._id),
        status: d.status,
        stage,
        assignedAt: d.assignedAt,
        acceptedAt: d.acceptedAt ?? null,
        pickedUpAt: d.pickedUpAt ?? null,
        finishedAt: d.deliveredAt ?? d.failedAt ?? d.updatedAt,
        fee: d.fee ?? DELIVERY_FEE,
        cashCollected: d.cashCollected ?? 0,
        failReason: d.failReason ?? "",
        order: o && {
            _id: String(o._id),
            items: o.items,
            totalAmount: o.totalAmount,
            paymentMethod: o.paymentMethod,
            isPaid: o.isPaid,
            // the customer's phone number is only shown after the delivery boy accepts the order
            address: stage === "new" ? { ...o.address, mobile: undefined } : o.address,
        },
    }
}

export async function GET() {
    try {
        const me = await requireDeliveryBoy()
        if (!me.ok) return NextResponse.json({ message: me.message }, { status: me.status })
        const { boy } = me

        const populateOrder = { path: "order", select: "items totalAmount paymentMethod isPaid address" }

        const [open, done, sums] = await Promise.all([
            Delivery.find({ deliveryBoy: boy._id, status: { $in: ["pending", "out for delivery"] } })
                .populate(populateOrder)
                .sort({ assignedAt: -1 })
                .lean<LeanDelivery[]>(),
            Delivery.find({ deliveryBoy: boy._id, status: { $in: ["delivered", "failed"] } })
                .populate(populateOrder)
                .sort({ updatedAt: -1 })
                .limit(200)
                .lean<LeanDelivery[]>(),
            Delivery.aggregate([
                { $match: { deliveryBoy: boy._id, status: "delivered" } },
                { $group: { _id: null, delivered: { $sum: 1 }, earned: { $sum: { $ifNull: ["$fee", DELIVERY_FEE] } } } },
            ]),
        ])

        const openShaped = open.filter((d) => d.order).map(shape)
        return NextResponse.json({
            available: openShaped.filter((d) => d.stage === "new"),
            // deliveries already on the road come first
            mine: openShaped
                .filter((d) => d.stage !== "new")
                .sort((a, b) => Number(b.stage === "out for delivery") - Number(a.stage === "out for delivery")),
            completed: done.filter((d) => d.order).map(shape),
            totals: { delivered: sums[0]?.delivered ?? 0, earned: sums[0]?.earned ?? 0 },
        })
    } catch (error) {
        return NextResponse.json({ message: `Failed to load deliveries: ${error}` }, { status: 500 })
    }
}
