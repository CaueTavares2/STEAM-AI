import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import passport from "passport";
import { Strategy as SteamStrategy } from "passport-steam";
import session from "express-session";
import axios from "axios";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Gemini AI setup
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

const tempTokens = new Map<string, any>();

const activeSessions = new Map<string, any>();

// Custom auth middleware
const checkAuth = (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const user = activeSessions.get(token);
    if (user) {
      req.user = user;
      return next();
    }
  }
  
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  
  res.status(401).json({ error: "Unauthorized" });
};

async function startServer() {
  // CRITICAL: Trust ALL proxies in AI Studio/Cloud Run environment
  app.set('trust proxy', true);

  // Use a stable secret for session signing
  const sessionSecret = process.env.SESSION_SECRET || "steam-recommender-secret-v3";

  app.use(session({
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    proxy: true,
    name: 'steam.sid',
    cookie: {
      secure: true,
      sameSite: 'none',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  }));

  app.use(passport.initialize());
  app.use(passport.session());

  // Ensure appUrl uses HTTPS and has no trailing slash
  let appUrl = (process.env.APP_URL || `http://localhost:${PORT}`).replace(/\/$/, "");
  
  if (appUrl.includes('run.app') && !appUrl.startsWith('https://')) {
    appUrl = appUrl.replace('http://', 'https://');
  }

  console.log(`[Steam Auth] App URL: ${appUrl}`);

  passport.use(new SteamStrategy({
    returnURL: `${appUrl}/auth/steam/return`,
    realm: `${appUrl}/`,
    apiKey: process.env.STEAM_API_KEY
  }, (identifier: string, profile: any, done: any) => {
    console.log(`[Steam Auth] User authenticated: ${profile.displayName} (${profile.id})`);
    profile.identifier = identifier;
    return done(null, profile);
  }));

  passport.serializeUser((user, done) => {
    done(null, user);
  });

  passport.deserializeUser((obj: any, done) => {
    console.log(`[Passport] Deserializing user: ${obj?.displayName} (${obj?.id})`);
    done(null, obj);
  });

  app.use(express.json());

  // Auth routes
  app.get('/api/auth/steam', passport.authenticate('steam', { failureRedirect: '/' }));

  app.get('/auth/steam/return', passport.authenticate('steam', { failureRedirect: '/' }), (req: any, res: any) => {
    console.log(`[Auth Return] Login successful for ${req.user?.displayName}. Generating exchange token.`);
    const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
    tempTokens.set(token, req.user);
    
    // Auto-delete token after 5 minutes to prevent memory leaks
    setTimeout(() => tempTokens.delete(token), 5 * 60 * 1000);

    res.send(`
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', token: '${token}' }, '*');
              window.close();
            } else {
              window.location.href = '/';
            }
          </script>
          <p>Autenticação bem-sucedida! Esta janela fechará automaticamente.</p>
        </body>
      </html>
    `);
  });

  app.post('/api/auth/exchange', (req: any, res: any) => {
    const { token } = req.body;
    const user = tempTokens.get(token);
    if (user) {
      tempTokens.delete(token);
      
      const sessionToken = Math.random().toString(36).substring(2) + Date.now().toString(36);
      activeSessions.set(sessionToken, user);

      req.login(user, (err: any) => {
        if (err) {
          console.error("[Token Exchange Error] Login failed:", err);
          return res.status(500).json({ error: 'Login failed' });
        }
        req.session.save((saveErr: any) => {
          if (saveErr) console.error("[Session Save Error]", saveErr);
          console.log(`[Token Exchange] Success for ${user.displayName}.`);
          res.json({ success: true, user, token: sessionToken });
        });
      });
    } else {
      console.log(`[Token Exchange] Failed. Invalid token.`);
      res.status(400).json({ error: 'Invalid token' });
    }
  });

  app.get('/api/auth/user', checkAuth, (req: any, res: any) => {
    res.json(req.user);
  });

  app.get('/api/auth/logout', (req: any, res: any) => {
    req.logout(() => {
      res.redirect('/');
    });
  });

  // Steam Data fetching
  app.get('/api/steam/owned-games', checkAuth, async (req: any, res: any) => {
    const user: any = req.user;
    const steamId = user.id;
    const apiKey = process.env.STEAM_API_KEY;

    try {
      const response = await axios.get(`http://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/`, {
        params: {
          key: apiKey,
          steamid: steamId,
          format: 'json',
          include_appinfo: true,
          include_played_free_games: true
        }
      });
      res.json(response.data.response);
    } catch (error: any) {
      console.error("Error fetching owned games:", error.message);
      res.status(500).json({ error: "Failed to fetch Steam data" });
    }
  });

  app.get('/api/steam/recent-games', checkAuth, async (req: any, res: any) => {
    const user: any = req.user;
    const steamId = user.id;
    const apiKey = process.env.STEAM_API_KEY;

    try {
      const response = await axios.get(`http://api.steampowered.com/IPlayerService/GetRecentlyPlayedGames/v0001/`, {
        params: {
          key: apiKey,
          steamid: steamId,
          format: 'json'
        }
      });
      res.json(response.data.response);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch Steam data" });
    }
  });

  // Gemini Recommendations
  app.post('/api/recommendations', checkAuth, async (req: any, res: any) => {
    const { ownedGames, recentGames, customGeminiKey, preferences } = req.body;

    try {
      let activeAi = ai;
      if (customGeminiKey) {
        activeAi = new GoogleGenAI({ apiKey: customGeminiKey });
      }

      const prefsText = preferences ? `
        PREFERÊNCIAS DO USUÁRIO:
        - Quero mais jogos assim: ${preferences.moreOf || 'Não especificado'}
        - Não quero jogos assim: ${preferences.lessOf || 'Não especificado'}
      ` : '';

      const prompt = `
        Analise o perfil deste jogador da Steam e recomende 5 novos jogos.
        
        Jogos Possuídos (e tempo de jogo em minutos):
        ${ownedGames.map((g: any) => `- ${g.name}: ${g.playtime_forever}min`).join('\n')}
        
        Jogos Jogados Recentemente:
        ${recentGames.map((g: any) => `- ${g.name}`).join('\n')}
        ${prefsText}
        
        Instruções:
        1. Recomende jogos que o usuário NÃO possui.
        2. Baseie as recomendações nos gêneros e estilos dos jogos mais jogados E nas preferências fornecidas.
        3. Explique por que cada jogo foi recomendado.
        4. Retorne APENAS um JSON estruturado com os App IDs oficiais da Steam para cada jogo.
      `;

      const generate = async (modelName: string) => {
        return await activeAi.models.generateContent({
          model: modelName,
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                recommendations: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      name: { type: Type.STRING },
                      appId: { type: Type.INTEGER, description: "Steam App ID for the game" },
                      reason: { type: Type.STRING },
                      genres: { type: Type.ARRAY, items: { type: Type.STRING } },
                      estimatedMatch: { type: Type.NUMBER, description: "0-100 percentage" }
                    },
                    required: ["name", "appId", "reason", "genres", "estimatedMatch"]
                  }
                }
              },
              required: ["recommendations"]
            }
          }
        });
      };

      try {
        const response = await generate("gemini-3.5-flash");
        res.json(JSON.parse(response.text));
      } catch (geminiError: any) {
        if (geminiError.status === 503 || geminiError.message?.includes('503')) {
          console.log("[Gemini Fallback] 3.5-flash failed with 503, trying 3.1-pro-preview");
          const fallbackResponse = await generate("gemini-3.1-pro-preview");
          res.json(JSON.parse(fallbackResponse.text));
        } else {
          throw geminiError;
        }
      }
    } catch (error: any) {
      console.error("Gemini Error:", error.message);
      res.status(500).json({ error: "Ocorreu um erro ao gerar recomendações. Tente novamente mais tarde." });
    }
  });

  // Vite middleware for development
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

startServer();
