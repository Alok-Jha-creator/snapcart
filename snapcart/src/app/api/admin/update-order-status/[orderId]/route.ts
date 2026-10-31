import connectDb from "@/lib/db";
import requireAdmin from "@/lib/requireAdmin";
import Order from "@/models/order.model";
import { NextRequest, NextResponse } from "next/server";

const STATUSES = ["pending", "out of delivery", "delivered"]

// CHANGED: the old version broadcast the order to every nearby delivery boy. The admin now assigns
// orders herself (Delivery Management), so this only updates the order status.
// It also checks that the caller is the admin, which the old version did not.
export async function POST(req: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
    try {
        await connectDb()
        if (!(await requireAdmin())) return NextResponse.json({ message: "Not allowed" }, { status: 403 })

        const { orderId } = await params
        const { status } = await req.json()
        if (!STATUSES.includes(status)) {
            return NextResponse.json({ message: "Invalid status" }, { status: 400 })
        }

        const order = await Order.findById(orderId)
        if (!order) {
            return NextResponse.json({ message: "order not found" }, { status: 404 })
        }
        order.status = status
        await order.save()

        // same response shape as before, so Manage Orders keeps working
        return NextResponse.json({ assignment: order.assignement ?? null, availableBoys: [] }, { status: 200 })
    } catch (error) {
        return NextResponse.json({ message: `update status error ${error}` }, { status: 500 })
    }
}
