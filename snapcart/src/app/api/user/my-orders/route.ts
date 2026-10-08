import connectDb from "@/lib/db";
import Order from "@/models/order.model";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    try {
        await connectDb()
        const { searchParams } = new URL(req.url)
        const userId = searchParams.get("userId")

        if (!userId) {
            return NextResponse.json(
                { message: "userId is required" },
                { status: 400 }
            )
        }

        const orders = await Order.find({ user: userId }).sort({ createdAt: -1 })

        return NextResponse.json(orders, { status: 200 })
    } catch (error) {
        console.log(error)
        return NextResponse.json(
            { message: `Error fetching orders: ${error}` },
            { status: 500 }
        )
    }
}