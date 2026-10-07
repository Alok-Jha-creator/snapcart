import connectDb from "@/lib/db";
import Order from "@/models/order.model";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(req: NextRequest) {
    try {
        await connectDb()
        const { orderId, status } = await req.json()
        if (!orderId || !status) {
            return NextResponse.json(
                { message: "orderId and status are required" },
                { status: 400 }
            )
        }
        const updatedOrder = await Order.findByIdAndUpdate(
            orderId,
            { status },
            { new: true }
        )
        if (!updatedOrder) {
            return NextResponse.json(
                { message: "Order not found" },
                { status: 404 }
            )
        }
        return NextResponse.json(updatedOrder, { status: 200 })
    } catch (error) {
        return NextResponse.json(
            { message: `Failed to update order: ${error}` },
            { status: 500 }
        )
    }
}