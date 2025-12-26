import cors from "cors"
import dotenv from "dotenv"
import express from "express"
import helmet from "helmet"
import mongoose from "mongoose"
import morgan from "morgan"
import authRoutes from "./routes/auth.js"

dotenv.config()

const app = express()
const PORT = process.env.PORT || 4000

// CORS configuration for both local and production
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  process.env.FRONTEND_ORIGIN
].filter(Boolean)

app.use(helmet())
app.use(cors({ 
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl requests)
    if (!origin) return callback(null, true)
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      // Also allow any vercel.app domain
      if (origin.includes('vercel.app')) {
        callback(null, true)
      } else {
        console.warn(`[CORS] Blocked origin: ${origin}`)
        callback(null, false)
      }
    }
  },
  credentials: true
}))
app.use(express.json({ limit: "1mb" }))
app.use(morgan("tiny"))

app.get("/health", (_req, res) => res.json({ status: "ok" }))
app.use("/api/auth", authRoutes)

app.use((err, _req, res, _next) => {
    console.error("[server] unhandled error", err)
    res.status(500).json({ message: "Server error" })
})

const start = async() => {
    try {
        if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI not set")
        if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET not set")

        await mongoose.connect(process.env.MONGODB_URI)
        console.log("✅ Connected to MongoDB")

        app.listen(PORT, () => {
            console.log(`✅ Auth API running on port ${PORT}`)
        })
    } catch (err) {
        console.error("❌ Failed to start server", err)
        process.exit(1)
    }
}

start()