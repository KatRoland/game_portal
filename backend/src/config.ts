import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

if (!process.env.JWT_SECRET) {
    console.error("FATAL ERROR: JWT_SECRET environment variable is not set.");
    process.exit(1);
}

export const JWT_SECRET = process.env.JWT_SECRET;
