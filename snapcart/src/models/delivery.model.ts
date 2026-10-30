import mongoose from "mongoose"

// One record per order: which delivery boy has it, and how the delivery is going.
// Kept separate so your existing Order model does not need to change.
export const DELIVERY_STATUSES = ["pending", "out for delivery", "delivered", "failed"] as const
export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number]

const deliverySchema = new mongoose.Schema(
    {
        order: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true, unique: true },
        deliveryBoy: { type: mongoose.Schema.Types.ObjectId, ref: "DeliveryBoy", required: true },
        status: { type: String, enum: DELIVERY_STATUSES, default: "pending" },
        assignedAt: { type: Date, default: Date.now },
    },
    { timestamps: true }
)

const Delivery = mongoose.models.Delivery || mongoose.model("Delivery", deliverySchema)
export default Delivery