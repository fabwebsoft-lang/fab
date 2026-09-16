export default function handler(req, res) {
  res.status(200).json({
    status: "ok",
    environment: process.env.NODE_ENV || "production",
    hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
    timestamp: new Date().toISOString(),
  });
}
