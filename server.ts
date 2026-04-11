import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

import express from "express";
import { createServer as createViteServer } from "vite";
import SpotifyWebApi from "spotify-web-api-node";
import cookieParser from "cookie-parser";
import axios from "axios";
import { SPOTIFY_GENRES } from "./src/constants.js";

console.log("Starting server with APP_URL:", process.env.APP_URL);

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(cookieParser());

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Spotify API Setup
if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET) {
  console.error("CRITICAL: SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET is missing from environment variables!");
}
if (!process.env.APP_URL) {
  console.error("CRITICAL: APP_URL is missing from environment variables!");
}

const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID?.trim(),
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET?.trim(),
  redirectUri: `${process.env.APP_URL?.trim().replace(/\/$/, "")}/auth/callback`,
});

/**
 * Direct Spotify API call using axios for better reliability and error handling.
 * Handles Spotify's specific requirement for comma-separated arrays (no brackets).
 */
async function spotifyFetch(token: string, endpoint: string, method: 'GET' | 'POST' = 'GET', dataOrParams?: any) {
  const baseUrl = "https://api.spotify.com/v1";
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  
  let url = `${baseUrl}${cleanEndpoint}`;
  
  if (method === 'GET' && dataOrParams) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(dataOrParams)) {
      if (value !== undefined && value !== null) {
        // Spotify expects arrays as comma-separated strings
        const val = Array.isArray(value) ? value.join(',') : String(value);
        params.append(key, val);
      }
    }
    const qs = params.toString();
    if (qs) {
      url += (url.includes('?') ? '&' : '?') + qs;
    }
  }

  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  console.log(`[SPOTIFY API] ${method} ${url}`);

  try {
    const response = await axios({
      method,
      url,
      data: method === 'POST' ? dataOrParams : undefined,
      headers,
      timeout: 20000 // 20s timeout
    });
    return response.data;
  } catch (error: any) {
    const statusCode = error.response?.status || error.statusCode || 500;
    const responseData = error.response?.data;
    
    console.error(`[SPOTIFY API ERROR] ${method} ${url} returned ${statusCode}`);
    if (responseData) {
      console.error("Error Details:", JSON.stringify(responseData, null, 2));
    }

    throw {
      statusCode,
      message: responseData?.error?.message || error.message || "Spotify API Error",
      body: responseData,
      stack: error.stack
    };
  }
}

let availableGenres: string[] = [];
let genreFetchFailed = false;

const getGenres = async (token: string) => {
  if (availableGenres.length > 0) return availableGenres;
  if (genreFetchFailed) return SPOTIFY_GENRES;

  try {
    console.log("Fetching available genre seeds...");
    const data = await spotifyFetch(token, "/recommendations/available-genre-seeds");
    if (data && data.genres) {
      availableGenres = data.genres;
      console.log("Successfully fetched available genres:", availableGenres.length);
      return availableGenres;
    }
    throw new Error("Invalid response format from genre seeds");
  } catch (e: any) {
    console.warn("[SPOTIFY] Genre seeds fetch failed. Using fallback list.");
    genreFetchFailed = true; // Don't try again this session
    return SPOTIFY_GENRES;
  }
};

// Auth Routes
const refreshAccessToken = async (refreshToken: string) => {
  const api = new SpotifyWebApi({
    clientId: process.env.SPOTIFY_CLIENT_ID?.trim(),
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET?.trim(),
  });
  api.setRefreshToken(refreshToken);
  const data = await api.refreshAccessToken();
  return data.body;
};

/**
 * Executes a Spotify API call with automatic token refresh logic.
 * Now passes the access token directly to the callback.
 */
async function spotifyRequest<T>(
  req: express.Request,
  res: express.Response,
  apiCall: (token: string) => Promise<T>
): Promise<T> {
  const token = req.cookies.spotify_access_token;
  const refreshToken = req.cookies.spotify_refresh_token;

  if (!token && !refreshToken) {
    throw { statusCode: 401, message: "Not authenticated" };
  }

  const setTokenCookie = (accessToken: string, expiresIn: number) => {
    res.cookie("spotify_access_token", accessToken, {
      maxAge: expiresIn * 1000,
      httpOnly: true,
      secure: true,
      sameSite: "none",
    });
  };

  try {
    let currentToken = token;
    if (!currentToken && refreshToken) {
      console.log("Access token missing, refreshing...");
      const refreshed = await refreshAccessToken(refreshToken);
      currentToken = refreshed.access_token;
      setTokenCookie(currentToken, refreshed.expires_in);
    }

    if (!currentToken) {
      throw { statusCode: 401, message: "No access token available" };
    }

    try {
      return await apiCall(currentToken);
    } catch (error: any) {
      // If it's a 401, try to refresh once
      if (error.statusCode === 401 && refreshToken) {
        console.log("Access token expired (401), attempting refresh...");
        try {
          const refreshed = await refreshAccessToken(refreshToken);
          const newAccessToken = refreshed.access_token;
          setTokenCookie(newAccessToken, refreshed.expires_in);
          return await apiCall(newAccessToken);
        } catch (refreshError: any) {
          console.error("Failed to refresh access token");
          throw refreshError;
        }
      }
      throw error;
    }
  } catch (error: any) {
    throw error;
  }
}

app.get("/api/spotify/health", async (req, res) => {
  try {
    const result = await spotifyRequest(req, res, async (token) => {
      const me = await spotifyFetch(token, "/me");
      
      const diagnostic: any = {};
      const tests = [
        { name: "me", path: "/me" },
        { name: "genres", path: "/recommendations/available-genre-seeds" },
        { name: "search", path: "/search", params: { q: "test", type: "track", limit: 1, market: me.country || "US" } }
      ];

      for (const test of tests) {
        try {
          await spotifyFetch(token, test.path, "GET", test.params);
          diagnostic[test.name] = "OK";
        } catch (err: any) {
          diagnostic[test.name] = err.statusCode || err.message;
        }
      }

      return {
        user: me.display_name,
        status: "ok",
        diagnostic,
        token_preview: token ? `${token.substring(0, 10)}...` : "none"
      };
    });
    res.json(result);
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      status: "error",
      message: error.message,
      details: error.body || {}
    });
  }
});

app.get("/api/auth/url", (req, res) => {
  const scopes = [
    "user-read-private",
    "user-read-email",
    "playlist-modify-public",
    "playlist-modify-private",
    "user-top-read",
  ];
  const authorizeURL = spotifyApi.createAuthorizeURL(scopes, "state");
  res.json({ url: authorizeURL });
});

app.get("/auth/callback", async (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).send("No code provided");

  try {
    const data = await spotifyApi.authorizationCodeGrant(code as string);
    const { access_token, refresh_token, expires_in } = data.body;

    // Set cookies with SameSite=None and Secure=true for iframe support
    res.cookie("spotify_access_token", access_token, {
      maxAge: expires_in * 1000,
      httpOnly: true,
      secure: true,
      sameSite: "none",
    });
    res.cookie("spotify_refresh_token", refresh_token, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
    });

    res.send(`
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS' }, '*');
              window.close();
            } else {
              window.location.href = '/';
            }
          </script>
          <p>Authentication successful. This window should close automatically.</p>
        </body>
      </html>
    `);
  } catch (error) {
    console.error("Error during Spotify callback:", error);
    res.status(500).send("Authentication failed");
  }
});

app.get("/api/auth/me", async (req, res) => {
  try {
    const result = await spotifyRequest(req, res, async (token) => {
      return await spotifyFetch(token, "/me");
    });
    res.json({ authenticated: true, user: result });
  } catch (error: any) {
    res.json({ authenticated: false });
  }
});

app.post("/api/auth/logout", (req, res) => {
  res.clearCookie("spotify_access_token", {
    httpOnly: true,
    secure: true,
    sameSite: "none",
  });
  res.clearCookie("spotify_refresh_token", {
    httpOnly: true,
    secure: true,
    sameSite: "none",
  });
  res.json({ success: true });
});

app.post("/api/spotify/recommendations", async (req, res) => {
  try {
    const { mood, seed_genres, target_valence, target_energy, target_tempo, target_danceability } = req.body;

    const result = await spotifyRequest(req, res, async (token) => {
      // Get user info for market
      let userCountry = "US";
      try {
        const me = await spotifyFetch(token, "/me");
        userCountry = me.country || "US";
      } catch (e) {
        console.warn("[RECOMMENDATIONS] Failed to fetch user country, defaulting to US");
      }

      // Validate genres
      const genresData = await getGenres(token);
      const lowerAvailableGenres = genresData.map((g: string) => g.toLowerCase());
      
      const validSeeds = Array.isArray(seed_genres) 
        ? seed_genres
            .map(g => typeof g === 'string' ? g.toLowerCase().trim() : '')
            .filter(g => g && lowerAvailableGenres.includes(g))
        : [];

      const finalSeeds = validSeeds.length > 0 ? validSeeds.slice(0, 5) : ["pop"];

      // Spotify's /recommendations endpoint is deprecated for new apps.
      // Use search-based approach with genre names as queries instead.
      console.log(`[RECOMMENDATIONS] Using search-based strategy with genres: ${finalSeeds.join(', ')}, market: ${userCountry}`);

      const seenIds = new Set<string>();
      let tracks: any[] = [];
      let firstSearchError: any = null;

      for (const genre of finalSeeds) {
        if (tracks.length >= 20) break;
        try {
          console.log(`[SEARCH] searching for genre: "${genre}"`);
          const result = await spotifyFetch(token, "/search", "GET", {
            q: genre,
            type: "track"
          });
          const items: any[] = result.tracks?.items || [];
          console.log(`[SEARCH] genre "${genre}" → ${items.length} items`);
          for (const track of items) {
            if (!seenIds.has(track.id)) {
              seenIds.add(track.id);
              tracks.push(track);
              if (tracks.length >= 20) break;
            }
          }
        } catch (e: any) {
          const status = e.statusCode || e.response?.status;
          const msg = e.message || e.response?.data?.error?.message;
          console.warn(`[SEARCH] Failed for genre "${genre}": ${status} — ${msg}`);
          if (!firstSearchError) firstSearchError = { statusCode: status, message: msg };
        }
      }

      if (tracks.length === 0) {
        const errMsg = firstSearchError
          ? `Search failed: ${firstSearchError.message} (status ${firstSearchError.statusCode})`
          : "No tracks found for any genre.";
        throw { statusCode: firstSearchError?.statusCode || 503, message: errMsg };
      }

      return { tracks, is_fallback: true };
    });

    res.json(result);
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ 
      error: "Spotify API Error", 
      message: error.message || "An unknown error occurred",
      details: error.body?.error?.message || error.message
    });
  }
});

app.post("/api/spotify/create-playlist", async (req, res) => {
  const { name, uris } = req.body;

  try {
    const result = await spotifyRequest(req, res, async (token) => {
      if (!uris || !Array.isArray(uris) || uris.length === 0) {
        throw { statusCode: 400, message: "No tracks provided" };
      }
      
      // Use /me/playlists for better compatibility and fewer 403s
      const playlist = await spotifyFetch(token, "/me/playlists", "POST", {
        name,
        public: false
      });
      
      await spotifyFetch(token, `/playlists/${playlist.id}/tracks`, "POST", {
        uris
      });
      
      return playlist;
    });
    res.json(result);
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ 
      error: "Failed to create playlist", 
      message: error.message || "An unknown error occurred",
      details: error.body?.error?.message || error.message
    });
  }
});

// 404 handler for API routes
app.all("/api/*", (req, res) => {
  console.warn(`[404] API route not found: ${req.method} ${req.url}`);
  res.status(404).json({ error: "API route not found", method: req.method, url: req.url });
});

// Vite middleware setup
async function startServer() {
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
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
