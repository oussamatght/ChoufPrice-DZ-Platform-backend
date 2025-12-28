import mongoose from "mongoose"

const priceReportSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },
    productName: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200
    },
    price: {
        type: Number,
        required: true,
        min: 0
    },
    category: {
        type: String,
        required: true,
        trim: true,
        enum: [
            "Fruits & Vegetables",
            "Meat & Poultry",
            "Dairy & Eggs",
            "Bakery",
            "Beverages",
            "Groceries",
            "Household",
            "Personal Care",
            "Electronics",
            "Clothing",
            "Other"
        ],
        index: true
    },
    location: {
        wilaya: { type: String, required: true, trim: true, index: true },
        commune: { type: String, trim: true, default: "" },
        lat: { type: Number, required: true },
        lng: { type: Number, required: true }
    },
    storeName: {
        type: String,
        trim: true,
        maxlength: 100,
        default: ""
    },
    isAbnormal: {
        type: Boolean,
        default: false
    },
    upvotes: {
        type: Number,
        default: 0,
        min: 0
    },
    downvotes: {
        type: Number,
        default: 0,
        min: 0
    },
    votedBy: [{
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        voteType: { type: String, enum: ["up", "down"] }
    }],
    imageUrl: {
        type: String,
        trim: true,
        default: ""
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
})

priceReportSchema.index({ createdAt: -1 })
priceReportSchema.index({ category: 1, "location.wilaya": 1 })
priceReportSchema.index({ productName: "text" })

priceReportSchema.virtual("voteScore").get(function() {
    return this.upvotes - this.downvotes
})

export const PriceReport = mongoose.models.PriceReport || mongoose.model("PriceReport", priceReportSchema)