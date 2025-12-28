import { Router } from "express"
import { PriceReport } from "../models/PriceReport.js"
import { authenticateToken } from "../middleware/auth.js"

const router = Router()

router.get("/", async(req, res) => {
    try {
        const { category, wilaya, limit = 100 } = req.query
        const filter = {}

        if (category) filter.category = category
        if (wilaya) filter["location.wilaya"] = wilaya

        const reports = await PriceReport.find(filter)
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .populate("userId", "name email")
            .lean()

        const formatted = reports.map(r => ({
            id: r._id.toString(),
            productName: r.productName,
            price: r.price,
            category: r.category,
            location: r.location,
            storeName: r.storeName,
            isAbnormal: r.isAbnormal,
            upvotes: r.upvotes,
            downvotes: r.downvotes,
            createdAt: r.createdAt,
            user: {
                id: r.userId && r.userId._id ? r.userId._id.toString() : null,
                name: r.userId && r.userId.name ? r.userId.name : "Anonymous",
            },
        }))

        res.json({ reports: formatted, count: formatted.length })
    } catch (err) {
        console.error("[reports] GET error", err)
        res.status(500).json({ message: "Failed to fetch reports" })
    }
})

router.post("/", authenticateToken, async(req, res) => {
    try {
        const { productName, price, category, location, storeName } = req.body

        if (!productName || !price || !category || !location || !location.wilaya || !location.lat || !location.lng) {
            return res.status(400).json({ message: "Missing required fields" })
        }

        if (typeof price !== "number" || price <= 0) {
            return res.status(400).json({ message: "Invalid price" })
        }

        const report = await PriceReport.create({
            userId: req.user.id,
            productName: productName.trim(),
            price,
            category: category.trim(),
            location: {
                wilaya: location.wilaya.trim(),
                commune: location.commune ? location.commune.trim() : "",
                lat: location.lat,
                lng: location.lng,
            },
            storeName: storeName ? storeName.trim() : "",
            isAbnormal: false,
        })

        const populated = await report.populate("userId", "name email")

        res.status(201).json({
            id: populated._id.toString(),
            productName: populated.productName,
            price: populated.price,
            category: populated.category,
            location: populated.location,
            storeName: populated.storeName,
            isAbnormal: populated.isAbnormal,
            upvotes: populated.upvotes,
            downvotes: populated.downvotes,
            createdAt: populated.createdAt,
            user: {
                id: populated.userId._id.toString(),
                name: populated.userId.name || "Anonymous",
            },
        })
    } catch (err) {
        console.error("[reports] POST error", err)
        res.status(500).json({ message: "Failed to create report" })
    }
})

router.post("/:id/vote", authenticateToken, async(req, res) => {
    try {
        const { id } = req.params
        const { voteType } = req.body

        if (!["up", "down"].includes(voteType)) {
            return res.status(400).json({ message: "Invalid vote type" })
        }

        const report = await PriceReport.findById(id)
        if (!report) {
            return res.status(404).json({ message: "Report not found" })
        }

        const existingVote = report.votedBy.find(v => v.userId.toString() === req.user.id)

        if (existingVote) {
            if (existingVote.voteType === "up") report.upvotes -= 1
            else report.downvotes -= 1

            if (existingVote.voteType === voteType) {
                report.votedBy = report.votedBy.filter(v => v.userId.toString() !== req.user.id)
            } else {
                existingVote.voteType = voteType
                if (voteType === "up") report.upvotes += 1
                else report.downvotes += 1
            }
        } else {
            report.votedBy.push({ userId: req.user.id, voteType })
            if (voteType === "up") report.upvotes += 1
            else report.downvotes += 1
        }

        await report.save()

        res.json({
            id: report._id.toString(),
            upvotes: report.upvotes,
            downvotes: report.downvotes,
        })
    } catch (err) {
        console.error("[reports] VOTE error", err)
        res.status(500).json({ message: "Failed to vote" })
    }
})

router.delete("/:id", authenticateToken, async(req, res) => {
    try {
        const { id } = req.params
        const report = await PriceReport.findById(id)

        if (!report) {
            return res.status(404).json({ message: "Report not found" })
        }

        if (report.userId.toString() !== req.user.id) {
            return res.status(403).json({ message: "Forbidden - not the owner" })
        }

        await report.deleteOne()
        res.json({ message: "Report deleted", id })
    } catch (err) {
        console.error("[reports] DELETE error", err)
        res.status(500).json({ message: "Failed to delete report" })
    }
})

router.get("/my", authenticateToken, async(req, res) => {
    try {
        const reports = await PriceReport.find({ userId: req.user.id })
            .sort({ createdAt: -1 })
            .lean()

        const formatted = reports.map(r => ({
            id: r._id.toString(),
            productName: r.productName,
            price: r.price,
            category: r.category,
            location: r.location,
            storeName: r.storeName,
            isAbnormal: r.isAbnormal,
            upvotes: r.upvotes,
            downvotes: r.downvotes,
            createdAt: r.createdAt,
        }))

        res.json({ reports: formatted, count: formatted.length })
    } catch (err) {
        console.error("[reports] GET /my error", err)
        res.status(500).json({ message: "Failed to fetch user reports" })
    }
})

export default router