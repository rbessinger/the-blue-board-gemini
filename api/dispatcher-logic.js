// This file will handle the logic and talk to the Gemini API
export default async function handler(req, res) {
  const { prompt } = req.body;
  // Gemini logic will go here to call your /api/fr24-flight route
  res.status(200).json({ report: "Mission Accepted. Analyzing Flight Data..." });
}
