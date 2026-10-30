import mongoose from "mongoose"
const deliveryBoySchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },
        phone: { type: String, required: true, trim: true, unique: true },
        image: { type: String, default: "" },
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
)

const DeliveryBoy = mongoose.models.DeliveryBoy || mongoose.model("DeliveryBoy", deliveryBoySchema)
export default DeliveryBoy