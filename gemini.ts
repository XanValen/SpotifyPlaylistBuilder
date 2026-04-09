import { GoogleGenAI, Type } from "@google/genai";
import { SPOTIFY_GENRES } from "../constants";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface MoodParameters {
  seed_genres: string[];
  target_valence: number;
  target_energy: number;
  target_tempo: number;
  target_danceability: number;
  explanation: string;
}

export async function parseMood(mood: string): Promise<MoodParameters> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("Gemini API key is missing. Please check your environment variables.");
  }
  
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Translate the following mood/activity/vibe into Spotify recommendation parameters: "${mood}"`,
    config: {
      systemInstruction: `You are a music expert. Map user moods to Spotify audio features.
      - valence: 0.0 to 1.0 (positivity)
      - energy: 0.0 to 1.0 (intensity)
      - tempo: 40 to 200 (BPM)
      - danceability: 0.0 to 1.0
      - seed_genres: Choose up to 3 relevant Spotify genres from the provided list. ONLY use genres from this list.
      
      Genre List: acoustic, afrobeat, alt-rock, alternative, ambient, anime, black-metal, bluegrass, blues, bossanova, brazil, breakbeat, british, cantopop, chicago-house, children, chill, classical, club, comedy, country, dance, dancehall, death-metal, deep-house, detroit-techno, disco, disney, drum-and-bass, dub, dubstep, edm, electro, electronic, emo, folk, forro, french, funk, garage, german, gospel, goth, grindcore, groove, grunge, guitar, happy, hard-rock, hardcore, hardstyle, heavy-metal, hip-hop, holidays, honky-tonk, house, idm, indian, indie, indie-pop, industrial, iranian, j-dance, j-idol, j-pop, j-rock, jazz, k-pop, kids, latin, latino, malay, mandopop, metal, metal-misc, metalcore, minimal-techno, movies, mpb, new-age, new-release, opera, pagode, party, philippines, piano, pop, pop-film, post-dubstep, power-pop, progressive-house, psych-rock, punk, punk-rock, r-n-b, rainy-day, reggae, reggaeton, road-trip, rock, rock-n-roll, rockabilly, romance, sad, salsa, samba, sertanejo, show-tunes, singer-songwriter, ska, sleep, songwriter, soul, soundtracks, spanish, study, summer, swedish, synth-pop, tango, techno, trance, trip-hop, turkish, work-out, world-music.`,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          seed_genres: { type: Type.ARRAY, items: { type: Type.STRING } },
          target_valence: { type: Type.NUMBER },
          target_energy: { type: Type.NUMBER },
          target_tempo: { type: Type.NUMBER },
          target_danceability: { type: Type.NUMBER },
          explanation: { type: Type.STRING, description: "A brief explanation of why these parameters were chosen." }
        },
        required: ["seed_genres", "target_valence", "target_energy", "target_tempo", "target_danceability", "explanation"]
      }
    }
  });

  const text = response.text || "{}";
  
  // Strip markdown if present
  const jsonStr = text.replace(/```json/g, "").replace(/```/g, "").trim();
  
  try {
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error("Failed to parse Gemini response:", text);
    throw new Error("Failed to interpret your mood. Please try again with different words.");
  }
}
