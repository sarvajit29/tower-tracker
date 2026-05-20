import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-loaded Gemini client
let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI | null {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (key && key !== "MY_GEMINI_API_KEY" && key.trim() !== "") {
      try {
        aiClient = new GoogleGenAI({
          apiKey: key,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            }
          }
        });
      } catch (err) {
        console.error("Failed to initialize GoogleGenAI client:", err);
      }
    }
  }
  return aiClient;
}

// Procedural generator fallback
function generateProceduralTowers(lat: number, lng: number) {
  const operators = ["Jio", "Airtel", "Vi", "BSNL"];
  const networkTypes = ["2G", "3G", "4G", "5G"];
  const towers = [];
  
  // Create 6 realistic cell towers scattered around the coordinate
  for (let i = 0; i < 6; i++) {
    const angle = (i * 2 * Math.PI) / 6 + (Math.random() * 0.4 - 0.2);
    // Distances between 150m to 1200m
    const distanceKm = 0.15 + Math.random() * 0.95;
    // Estimate lat/lng offsets (approx 111km per degree)
    const latOffset = (distanceKm * Math.sin(angle)) / 111;
    const lngOffset = (distanceKm * Math.cos(angle)) / (111 * Math.cos(lat * Math.PI / 180));
    
    const operator = operators[i % operators.length];
    let networkType = "4G";
    if (operator === "Jio") {
      networkType = Math.random() > 0.3 ? "5G" : "4G";
    } else if (operator === "BSNL") {
      networkType = Math.random() > 0.4 ? "3G" : "2G";
    } else {
      networkType = Math.random() > 0.4 ? "5G" : "4G";
    }
    
    // Signal based on distance and network
    const baseSignal = networkType === "5G" ? -85 : networkType === "4G" ? -80 : -75;
    const rssi = Math.round(baseSignal - (distanceKm * 25) - (Math.random() * 10));
    
    towers.push({
      id: `TWR-${operator.toUpperCase()}-${1000 + i}`,
      operator,
      networkType,
      latitude: Number((lat + latOffset).toFixed(6)),
      longitude: Number((lng + lngOffset).toFixed(6)),
      signalStrength: Math.max(-115, Math.min(-50, rssi)),
      height: 25 + Math.floor(Math.random() * 20), // in meters
      band: networkType === "5G" ? "3500 MHz (n78)" : networkType === "4G" ? "1800 MHz (B3)" : "900 MHz (B8)",
      cellId: Math.floor(100000 + Math.random() * 899999),
      tac: Math.floor(1000 + Math.random() * 8999),
    });
  }
  return towers;
}

// REST API for Cell Towers
app.post("/api/towers", async (req, res) => {
  const { latitude, longitude } = req.body;
  const lat = Number(latitude) || 12.9716; // default to Bangalore center if not passed
  const lng = Number(longitude) || 77.5946;

  console.log(`Fetching towers for location: Lat=${lat}, Lng=${lng}`);

  const ai = getAiClient();
  if (!ai) {
    console.log("No Gemini API key configured or initialized. Serving procedural fallbacks.");
    const towers = generateProceduralTowers(lat, lng);
    return res.json({ towers, source: "offline-procedural" });
  }

  try {
    const prompt = `Generate a JSON object representing 6 realistic nearby cellular cell towers located in a tight radius (approx 150m to 1500m) around coordinates: Latitude = ${lat}, Longitude = ${lng}. 
Your response must represent major Indian cellular operators: Jio, Airtel, Vi, and BSNL.
The signal strengths must decay properly based on distance. Make sure some are 5G, some are 4G, and some are legacy.
Return the coordinates as absolute float latitude and longitude offsets close to the base coordinate.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["towers"],
          properties: {
            towers: {
              type: Type.ARRAY,
              description: "List of nearby mobile cell towers",
              items: {
                type: Type.OBJECT,
                required: ["id", "operator", "networkType", "latitude", "longitude", "signalStrength", "height", "band", "cellId", "tac"],
                properties: {
                  id: { type: Type.STRING, description: "Unique Tower Identifier like TWR-Operator-number" },
                  operator: { type: Type.STRING, description: "Carrier brand: Jio, Airtel, Vi, or BSNL" },
                  networkType: { type: Type.STRING, description: "Generation: 2G, 3G, 4G, or 5G" },
                  latitude: { type: Type.NUMBER, description: "Absolute Latitude float matching proximity" },
                  longitude: { type: Type.NUMBER, description: "Absolute Longitude float matching proximity" },
                  signalStrength: { type: Type.INTEGER, description: "dBm power from -120 to -50" },
                  height: { type: Type.INTEGER, description: "Tower structural height in meters" },
                  band: { type: Type.STRING, description: "Radio frequency specification (e.g. 1800 MHz, 3500 n78, etc.)" },
                  cellId: { type: Type.INTEGER, description: "Cell Identifier (6-digit integer)" },
                  tac: { type: Type.INTEGER, description: "Tracking Area Code" },
                },
              },
            },
          },
        },
      },
    });

    const data = JSON.parse(response.text || "{}");
    if (data && Array.isArray(data.towers) && data.towers.length > 0) {
      console.log(`Successfully generated ${data.towers.length} custom towers via Gemini.`);
      return res.json({ towers: data.towers, source: "gemini-ai" });
    } else {
      throw new Error("Invalid format returned from Gemini model");
    }
  } catch (error) {
    console.error("Gemini tower retrieval failed, using fallback:", error);
    const towers = generateProceduralTowers(lat, lng);
    return res.json({ towers, source: "fallback-procedural", error: (error as Error).message });
  }
});

// Boot environment-dependent Vite logic
async function bootstrap() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Tower Tracker Express Engine] Online with port ${PORT}`);
  });
}

bootstrap();
