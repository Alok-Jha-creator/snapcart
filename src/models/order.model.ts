import mongoose from "mongoose";

export interface IOrder {
    _id?:mongoose.Types.ObjectId,
    user: mongoose.Types.ObjectId,
    items: [
        {
            grocery: mongoose.Types.ObjectId;
            name:string,
            price: string,
            unit: string,
            image: string,
            quantity: number
        }
    ],
    isPaid: boolean,
    totalAmount: number,
    paymentMethod: "cod" |"online",
    address: {
        fullName: string,
        mobile: string,
        city: string,
        state: string,
        pincode: string,
        fullAddress: string,
        latitude: number,
        longitude: number
    }
    assignedDeliveryBoy?:mongoose.Types.ObjectId
    status: "pending" | "out of delivery"| "delivered" ,
    createdAt?: Date,
    updatedAt?: Date

}

const orderSchema = new mongoose.Schema<IOrder>({
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    items: [
        {
            grocery: { type: mongoose.Schema.Types.ObjectId, ref: "Grocery", required: true },
            name: { type: String, required: true },
            price: { type: String, required: true },
            unit: { type: String, required: true },
            image: { type: String, required: true },
            quantity: { type: Number, required: true }
        }
    ],
    paymentMethod: { type: String, enum: ["cod", "online"], default:"cod"},
    isPaid: { type: Boolean, default: false },
    address: {
        fullName: String,
        mobile: String,
        city: String,
        state: String,
        pincode: String,
        fullAddress: String,
        latitude: Number,
        longitude: Number
    },
    status: { type: String, enum: ["pending", "out of delivery", "delivered"], default: "pending" },
    totalAmount: { type: Number, required: true }
},{timestamps:true})

const Order=mongoose.models.Order || mongoose.model("Order",orderSchema)
export default Order