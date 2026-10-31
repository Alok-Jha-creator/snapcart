import mongoose from "mongoose"

const deliveryBoySchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },
        phone: { type: String, required: true, trim: true, unique: true },
        image: { type: String, default: "" },
        isActive: { type: Boolean, default: true },
        // The login account (a User with role "deliveryBoy") that belongs to this delivery boy
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
        email: { type: String, default: "", trim: true, lowercase: true },
        // Where the delivery boy was last seen (sent by the delivery dashboard). Customers only see it
        // while their own order is on the way.
        liveLocation: {
            lat: { type: Number },
            lng: { type: Number },
            at: { type: Date },
        },
    },
    { timestamps: true }
)

const DeliveryBoy = mongoose.models.DeliveryBoy || mongoose.model("DeliveryBoy", deliveryBoySchema)
export default DeliveryBoy
