import connectDb from "@/lib/db";
import Order from "@/models/order.model";
import User from "@/models/user.model";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

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
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'payment',
            line_items: items.map((item: any) => ({
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: item.name,
                        images: [item.image],
                    },
                    unit_amount: parseInt(item.price) * 100, // Convert to cents
                },
                quantity: item.quantity,
            })),
        })
    } catch (error) {
        
    }
}