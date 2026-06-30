import { getApp } from "../server";

export default async function handler(req: any, res: any) {
  try {
    const app = await getApp();
    return app(req, res);
  } catch (error: any) {
    console.error("Vercel Serverless Function Error:", error);
    res.status(500).json({
      error: "Serverless function initialization failed",
      message: error?.message || "Internal Server Error",
    });
  }
}
