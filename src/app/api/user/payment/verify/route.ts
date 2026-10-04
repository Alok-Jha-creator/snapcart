import connectDb from "@/lib/db";
import Order from "@/models/order.model";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    try {
        await connectDb()
        const { searchParams } = new URL(req.url)
        const orderId = searchParams.get("orderId")
        const data = searchParams.get("data")   // eSewa sends a base64-encoded JSON string here

        if (!orderId || !data) {
            return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/user/checkout?payment=failed`)
        }

        // Decode the base64 response eSewa sends back
        const decodedData = JSON.parse(Buffer.from(data, "base64").toString("utf-8"))

        if (decodedData.status !== "COMPLETE") {
            return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/user/checkout?payment=failed`)
        }

        // Mark the order as paid
        await Order.findByIdAndUpdate(orderId, {
            isPaid: true
        })

        return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/user/order-success`)

    } catch (error) {
        console.log("Payment verification error:", error)
        return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/user/checkout?payment=failed`)
    }
}