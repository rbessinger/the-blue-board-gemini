// This file will handle the logic and talk to the Gemini API
export default async function handler(req, res) {
  const { prompt } = req.body;
  // Gemini logic will go here to call your /api/fr24-flight route
  res.status(200).json({ report: "Mission Accepted. Analyzing Flight Data..." });
}
import { GoogleGenerativeAI } from "@google/genai";

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  
  // 1. Define the Tools (Gemini's "Buttons" to talk to your code)
  const tools = [
    {
      functionDeclarations: [
        {
          name: "getFlightData",
          description: "Get real-time tail number and flight status for a specific flight.",
          parameters: {
            type: "OBJECT",
            properties: {
              flight: { type: "STRING", description: "The flight number, e.g., UA1811" }
            },
            required: ["flight"]
          }
        },
        {
          name: "getIrropsStatus",
          description: "Get the current delay/IRROPS score for a specific airport hub.",
          parameters: {
            type: "OBJECT",
            properties: {
              airport: { type: "STRING", description: "The airport code, e.g., ORD" }
            },
            required: ["airport"]
          }
        }
      ]
    }
  ];

  // 2. Initialize the Model with "Dispatcher" instructions
  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    tools: tools,
    systemInstruction: "You are 'The Dispatcher.' Use the provided tools to get real-time flight and airport data. Provide a technical 'Leave By' report with bold timings and technical aircraft dossiers. Focus on ORD-specific logistics."
  });

  const chat = model.startChat();
  const { prompt } = req.body;

  // 3. The "Loop" (Gemini asks for data, we fetch it from your Blue Board)
  let result = await chat.sendMessage(prompt);
  let response = result.response;
  let call = response.functionCalls()?.[0];

  // If Gemini wants to use a tool, we execute your existing Blue Board APIs
  if (call) {
    let apiResponse;
    const baseUrl = `https://${req.headers.host}`;

    if (call.name === "getFlightData") {
      const data = await fetch(`${baseUrl}/api/fr24-flight?flight=${call.args.flight}`);
      apiResponse = await data.json();
    } 
    
    if (call.name === "getIrropsStatus") {
      const data = await fetch(`${baseUrl}/api/irrops`);
      apiResponse = await data.json();
    }

    // Send the data BACK to Gemini so it can write the final report
    const finalResult = await chat.sendMessage([{
      functionResponse: {
        name: call.name,
        response: { content: apiResponse }
      }
    }]);
    
    return res.status(200).json({ report: finalResult.response.text() });
  }

  // Fallback if no tool was needed
  res.status(200).json({ report: response.text() });
}
