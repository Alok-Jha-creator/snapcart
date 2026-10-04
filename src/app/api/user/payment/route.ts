import connectDb from "@/lib/db";
import Order from "@/models/order.model";
import User from "@/models/user.model";
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(req: NextRequest) {
    try {
        await connectDb()
        const { userId, items, totalAmount, paymentMethod, address } = await req.json()
        if (!userId || !items || !totalAmount || !paymentMethod || !address) {
            return NextResponse.json(
                { message: "Missing required fields" },
                { status: 400 }
            )
        }
        const user = await User.findById(userId)
        if (!user) {
            return NextResponse.json(
                { message: "User not found" },
                { status: 400 }
            )
        }
        const newOrder = await Order.create({
            user: userId,
            items,
            totalAmount,
            paymentMethod,
            address
        })

        const transactionUuid = `${newOrder._id}-${Date.now()}`
        const productCode = process.env.ESEWA_PRODUCT_CODE!
        const secretKey = process.env.ESEWA_SECRET_KEY!

        // Use the SAME formatted string for both the signature message and the payload field,
        // otherwise eSewa rejects it with "Invalid payload signature" (ES104)
        const formattedTotal = totalAmount.toFixed(2)

        const signedFieldNames = "total_amount,transaction_uuid,product_code"
        const message = `total_amount=${formattedTotal},transaction_uuid=${transactionUuid},product_code=${productCode}`

        const signature = crypto
            .createHmac("sha256", secretKey)
            .update(message)
            .digest("base64")

        const esewaPayload = {
            amount: totalAmount,
            tax_amount: 0,
            total_amount: formattedTotal,
            transaction_uuid: transactionUuid,
            product_code: productCode,
            product_service_charge: 0,
            product_delivery_charge: 0,
            // No query params here — eSewa appends "?data=..." by simple concatenation,
            // so an existing "?" in this URL would break the query string
            success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/api/user/payment/verify`,
            failure_url: `${process.env.NEXT_PUBLIC_BASE_URL}/user/checkout?payment=failed`,
            signed_field_names: signedFieldNames,
            signature,
        }

        return NextResponse.json(
            {
                order: newOrder,
                esewaPayload,
                esewaUrl: "https://rc-epay.esewa.com.np/api/epay/main/v2/form"
            },
            { status: 200 }
        )
    } catch (error) {
        console.log(error)
        return NextResponse.json(
            { message: `Order creation error: ${error}` },
            { status: 500 }
        )
    }
}