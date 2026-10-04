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

        const signedFieldNames = "total_amount,transaction_uuid,product_code"
        const message = `total_amount=${totalAmount},transaction_uuid=${transactionUuid},product_code=${productCode}`

        const signature = crypto
            .createHmac("sha256", secretKey)
            .update(message)
            .digest("base64")

        const esewaPayload = {
            amount: totalAmount,
            tax_amount: 0,
            total_amount: totalAmount,
            transaction_uuid: transactionUuid,
            product_code: productCode,
            product_service_charge: 0,
            product_delivery_charge: 0,
            success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/api/user/payment/verify?orderId=${newOrder._id}`,
            failure_url: `${process.env.NEXT_PUBLIC_BASE_URL}/user/checkout`,
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