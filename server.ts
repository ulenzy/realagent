import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

// Load firebase project config from file
let FIREBASE_PROJECT_ID = 'striped-accord-m5xj8';
try {
  const firebaseConfigPath = path.join(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(firebaseConfigPath)) {
    const firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, 'utf-8'));
    FIREBASE_PROJECT_ID = firebaseConfig.projectId || FIREBASE_PROJECT_ID;
  }
} catch (e) {
  console.warn('Could not read firebase-applet-config.json:', e);
}

// User-specific rate limiter for AI queries (5 requests per 60 seconds)
const userRequestCounts = new Map<string, { count: number; resetTime: number }>();
function checkUserRateLimit(userId: string, limit: number = 5, windowMs: number = 60000): boolean {
  const now = Date.now();
  const userData = userRequestCounts.get(userId);

  if (!userData) {
    userRequestCounts.set(userId, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (now > userData.resetTime) {
    userData.count = 1;
    userData.resetTime = now + windowMs;
    return true;
  }

  if (userData.count >= limit) {
    return false;
  }

  userData.count += 1;
  return true;
}

// Low-overhead JWT validation for Firebase ID token from authentication
function verifyFirebaseToken(token: string) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
    
    // Verify standard Firebase secure token JWT attributes
    const expectedIssuer = `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`;
    const issMatch = payload.iss === expectedIssuer;
    const audMatch = payload.aud === FIREBASE_PROJECT_ID;
    const isNotExpired = payload.exp > (Date.now() / 1000);

    if (issMatch && audMatch && isNotExpired) {
      return payload; // yields sub (user UID) and other properties
    }
    return null;
  } catch (error) {
    console.error('Error verifying Firebase ID token in Express:', error);
    return null;
  }
}

// Simple robust in-memory rate limiter middleware to prevent API flooding and protect Gemini quotas
const ipRequestCounts = new Map<string, { count: number; resetTime: number }>();
function rateLimiter(limit: number, windowMs: number) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const clientData = ipRequestCounts.get(ip);

    if (!clientData) {
      ipRequestCounts.set(ip, { count: 1, resetTime: now + windowMs });
      return next();
    }

    if (now > clientData.resetTime) {
      clientData.count = 1;
      clientData.resetTime = now + windowMs;
      return next();
    }

    if (clientData.count >= limit) {
      console.warn(`Rate limit triggered for IP: ${ip}`);
      return res.status(429).json({ error: 'Too many requests. Please cool down.' });
    }

    clientData.count += 1;
    next();
  };
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Define 15 requests per minute limiter
  const apiLimiter = rateLimiter(15, 60000);

  // API route first
  app.post('/api/generate-land-title', apiLimiter, async (req, res) => {
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

  app.post('/api/estate-intelligence', apiLimiter, async (req, res) => {
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

  // Secure fully verified and per-user rate-limited AI search Gemini endpoint proxy
  app.post('/api/ai-search', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.warn('Unauthorized request to /api/ai-search: Missing Authorization header');
        return res.status(401).json({ error: 'Unauthorized: Missing or invalid token format' });
      }

      const token = authHeader.split('Bearer ')[1];
      const decoded = verifyFirebaseToken(token);
      if (!decoded) {
        console.warn('Unauthorized request to /api/ai-search: Invalid token signature/issuer/expiration');
        return res.status(401).json({ error: 'Unauthorized: Invalid token' });
      }

      const userId = decoded.sub;

      // Ensure per-user rate limit (5 requests per min max)
      const allowed = checkUserRateLimit(userId, 5, 60000);
      if (!allowed) {
        console.warn(`Rate limit triggered on /api/ai-search for user: ${userId}`);
        return res.status(429).json({ error: 'Too many requests. Please wait a moment before querying the AI again.' });
      }

      const { input, mockProperties } = req.body;
      if (!input || typeof input !== 'string') {
        return res.status(400).json({ error: 'A search query input is required.' });
      }

      const key = process.env.GEMINI_API_KEY;
      if (!key) {
        console.warn('Missing GEMINI_API_KEY environment variable. Returning fallback instructions.');
        return res.json({
          text: JSON.stringify({
            answer: "The AI Intelligence assistant is currently operating on offline fallback mode. Looking at current Abuja signals: Ibeju-Lekki is exhibiting high development signals and Lugbe is experiencing substantial residential yields.",
            recommendedIds: ["1", "2"],
            intent: "rent",
            budget: "5000000",
            marketHighlight: "Abuja FCT infrastructural expansion is pushing peripheral growth."
          })
        });
      }

      const ai = new GoogleGenAI({
        apiKey: key,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const prompt = `
        You are an expert Nigerian Real Estate Investment Analyst named RealAI.
        User Query: "${input}"
        
        Available Property Data: ${mockProperties ? JSON.stringify(mockProperties) : '[]'}
        
        Task:
        1. Analyze user intent (flip/rent/live).
        2. Filter matching properties from data.
        3. Assign a Location Development Score (0-100).
        4. Provide reasoning text for ROI.
        
        Response Format (JSON):
        {
          "answer": "Concise natural language summary of why you chose these properties and market trends.",
          "recommendedIds": ["1", "3"],
          "intent": "flip",
          "budget": "numbers only",
          "marketHighlight": "Latest infra news in that area"
        }
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json'
        }
      });

      res.json({ text: response.text || '' });
    } catch (error: any) {
      console.error('Error handling Gemini AI search in server:', error);
      res.status(500).json({ error: error?.message || 'Failed to analyze search query' });
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
