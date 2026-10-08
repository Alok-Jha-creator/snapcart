import connectDb from "@/lib/db";
import Order from "@/models/order.model";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
    try {
        await connectDb()
        const { orderId } = await params
        const { status } = await req.json()
        const order = await Order.findById(orderId).populate("user")
        if (!order) {
            return NextResponse.json(
                { message: "order not found" },
                { status: 400 }
            )
        }
        order.status = status
        let availableDeliveryBoy : any =[ ]
        if(status==="out of delivery" && !order.assignement){
            availableDeliveryBoy = await Order.find({ status: "pending" }).populate("user")
        }
        await order.save()
        return NextResponse.json(order, { status: 200 })
    } catch (error) {
        return NextResponse.json(
            { message: `update status error ${error}` },
            { status: 500 }
        )
    }
}