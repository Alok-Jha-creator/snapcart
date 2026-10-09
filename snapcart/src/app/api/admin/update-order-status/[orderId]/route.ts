import connectDb from "@/lib/db";
import DeliveryAssignment from "@/models/deliveryAssignment.model";
import Order from "@/models/order.model";
import User from "@/models/user.model";
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
        let deliveryBoysPayload: any = []
        if (status === "out of delivery" && !order.assignment) {
            const { latitude, longitude } = order.address
            const nearByDeliveryBoys = await User.find({
                role: "deliveryBoy",
                location: {
                    $near: {
                        $geometry: { type: "Point", coordinates: [Number(longitude), Number(latitude)] },
                        $maxDistance: 20000
                    }
                }
            })
            const nearByIds = nearByDeliveryBoys.map((b) => b._id)
            const busyIds = await DeliveryAssignment.find({
                assignedTo: { $in: nearByIds },
                status: { $nin: ["broadcasted", "completed"] }
            }).distinct("assignedTo")
            const busyIdSet = new Set(busyIds.map((b) => String(b)))
            const availableDeliveryBoys = nearByDeliveryBoys.filter(
                (b) => !busyIdSet.has(String(b._id))
            )
            const candidates = availableDeliveryBoys.map((b) => b._id)
            if (candidates.length == 0) {
                await order.save()
                return NextResponse.json(
                    { message: "There are no available delivery boys" },
                    { status: 200 }
                )
            }
            const assignment = await DeliveryAssignment.create({
                order: order._id,
                broadcastedTo: candidates,
                status: "broadcasted"
            })
            order.assignment = assignment._id
            deliveryBoysPayload = availableDeliveryBoys.map((b) => ({
                id: b._id,
                name: b.name,
                mobile: b.mobile,
                latitude: b.location.coordinates[1],
                longitude: b.location.coordinates[0]
            }))
        }
        await order.save()
        return NextResponse.json({
            assignment: order.assignment,
            availableBoys: deliveryBoysPayload
        }, { status: 200 })
    } catch (error) {
        return NextResponse.json(
            { message: `update status error ${error}` },
            { status: 500 }
        )
    }
}