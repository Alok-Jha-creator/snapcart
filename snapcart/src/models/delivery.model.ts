import mongoose from "mongoose"

// One record per order: which delivery boy has it, and how the delivery is going.
// Kept separate so your existing Order model does not need to change.
export const DELIVERY_STATUSES = ["pending", "out for delivery", "delivered", "failed"] as const
export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number]

// How the steps map to the fields below:
//   assigned by admin      status "pending",          acceptedAt empty   -> "New request" for the delivery boy
//   accepted               status "pending",          acceptedAt set
//   picked up              status "out for delivery",  pickedUpAt set
//   delivered              status "delivered",         deliveredAt, fee, cashCollected set
//   could not deliver      status "failed",            failedAt, failReason set
// A rejected order has its delivery record removed, so it goes back to "Not Assigned" for the admin.
const deliverySchema = new mongoose.Schema(
    {
        order: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true, unique: true },
        deliveryBoy: { type: mongoose.Schema.Types.ObjectId, ref: "DeliveryBoy", required: true },
        status: { type: String, enum: DELIVERY_STATUSES, default: "pending" },
        assignedAt: { type: Date, default: Date.now },
        acceptedAt: { type: Date, default: null },
        pickedUpAt: { type: Date, default: null },
        deliveredAt: { type: Date, default: null },
        failedAt: { type: Date, default: null },
        failReason: { type: String, default: "" },
        fee: { type: Number }, // what the delivery boy earned, saved when the order is delivered
        cashCollected: { type: Number, default: 0 }, // COD cash collected at the door
    },
    { timestamps: true }
)

deliverySchema.index({ deliveryBoy: 1, status: 1 })

const Delivery = mongoose.models.Delivery || mongoose.model("Delivery", deliverySchema)
export default Delivery
