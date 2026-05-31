import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API route first
  app.post('/api/generate-land-title', async (req, res) => {
    const { landUse, landSize, state } = req.body;
    if (!landUse || !landSize) {
      return res.status(400).json({ error: 'landUse and landSize are required' });
    }
    try {
      const key = process.env.GEMINI_API_KEY;
      if (!key) {
        return res.json({ title: `${landSize}SQM ${landUse} Land — ${state || 'Abuja'}` });
      }

      const ai = new GoogleGenAI({
        apiKey: key,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: `Generate a concise Nigerian real estate listing title for a ${landUse} land plot of ${landSize} SQM located in ${state || 'Abuja'}, Nigeria. Return only the title string, no explanation, max 60 characters.`,
      });

      const title = response.text?.trim().replace(/^["']|["']$/g, '') || `${landSize}SQM ${landUse} Land — ${state || 'Abuja'}`;
      res.json({ title });
    } catch (error: any) {
      const errorMsg = error?.message || String(error);
      if (errorMsg.includes('429') || errorMsg.includes('quota') || errorMsg.includes('RESOURCE_EXHAUSTED')) {
        console.warn('Gemini API rate limit/quota limits reached (429). Utilizing fallback title.');
      } else {
        console.warn('Error generating land title:', errorMsg);
      }
      res.json({ title: `${landSize}SQM ${landUse} Land — ${state || 'Abuja'}` });
    }
  });

  app.post('/api/estate-intelligence', async (req, res) => {
    const { lat, lng, propertyType, listingType } = req.body;
    if (lat === undefined || lng === undefined) {
      return res.status(400).json({ error: 'Coordinates lat and lng are required' });
    }

    try {
      const key = process.env.GEMINI_API_KEY;
      if (!key) {
        console.warn('GEMINI_API_KEY environment variable is not defined, returning fallback signal.');
        return res.json({ aiGenerated: false });
      }

      const ai = new GoogleGenAI({
        apiKey: key,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const type = propertyType || 'House';
      const listType = listingType || 'Sale';

      const systemPrompt = "You are a Nigerian real estate market analyst specialising in Abuja FCT.";
      const userPrompt = `Given a property at coordinates [${lat}, ${lng}], property type [${type}], and listing type [${listType}], analyse the location and return a JSON object with these exact fields and realistic values based on your knowledge of Abuja neighbourhoods:
- infrastructureScore (0-100)
- securityRating (0-100)
- powerReliability (0-100)
- roadAccessibility (0-100)
- internetCoverage (0-100)
- waterAvailability (0-100)
- appreciationTrend (percentage 0-30)
- rentalDemand (1-10)
- livabilityScore (0-100)
- areaTrend (one of: Expanding, Stable, Emerging Hot Zone, Elite Hub, Established Luxury, Rapid Development)
- expectedAppreciation (string e.g. '15% Annually')
- nearbyKeyAdditions (array of 3 strings)
- aiSummary (2 sentences)
- roiPotential (one of: Low, Medium, High, Extreme)

Return only valid JSON matching this schema, no markdown code blocks, no trailing comments.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: userPrompt,
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: 'application/json',
        }
      });

      const rawText = response.text || '';
      let cleanJson = rawText.trim();
      if (cleanJson.startsWith('```')) {
        cleanJson = cleanJson.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
      }

      const result = JSON.parse(cleanJson);
      res.json({
        ...result,
        aiGenerated: true
      });
    } catch (error: any) {
      const errorMsg = error?.message || String(error);
      if (errorMsg.includes('429') || errorMsg.includes('quota') || errorMsg.includes('RESOURCE_EXHAUSTED')) {
        console.warn('Gemini API rate limit/quota limits reached (429). Utilizing fallback intelligence.');
      } else {
        console.warn('Error in Express Gemini API:', errorMsg);
      }
      res.json({ aiGenerated: false });
    }
  });

  // Vite middleware for development or serving built static files in production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error('Failed to start full-stack server:', error);
});
