import mongoose from "mongoose"

// A log of orders that a delivery boy rejected, so the admin can see who said no and why.
const deliveryRejectionSchema = new mongoose.Schema(
    {
        order: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true, index: true },
        deliveryBoy: { type: mongoose.Schema.Types.ObjectId, ref: "DeliveryBoy", required: true },
        boyName: { type: String, default: "" },
        reason: { type: String, default: "" },
    },
    { timestamps: true }
)

const DeliveryRejection =
    mongoose.models.DeliveryRejection || mongoose.model("DeliveryRejection", deliveryRejectionSchema)
export default DeliveryRejection
