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
      systemInstruction: `You are a music expert. Map user moods and activities to Spotify audio features.

Audio Feature Ranges:
- valence: 0.0 to 1.0 (positivity/happiness - use high values for upbeat moods)
- energy: 0.0 to 1.0 (intensity - use high values for workout/party moods, low for relaxing moods)
- tempo: 40 to 200 (BPM - use high values for gym/workout/party, low for calming)
- danceability: 0.0 to 1.0 (how suitable for dancing)

Activity Examples:
- Workout/Gym: high energy (0.8+), high tempo (140+), high valence (0.7+), genres: edm, hip-hop, electronic, rock, hardcore
- Chill/Relaxing: low energy (0.3-), low tempo (80-), high valence (0.6+), genres: ambient, chill, acoustic, indie, soul
- Party: high energy (0.85+), high tempo (130+), high danceability (0.8+), genres: dance, edm, house, pop, disco
- Sad/Melancholic: low valence (0.3-), medium-low energy (0.4-), slower tempo (90-), genres: sad, ambient, soul, indie, acoustic
- Rainy/Moody: low valence (0.4), low-medium energy (0.5), medium tempo (100), genres: indie, soul, blues, acoustic, ambient

IMPORTANT: Only use these Spotify seed genres (no others):
acoustic, ambient, blues, chill, classical, club, country, dance, deep-house, disco, edm, electro, electronic, folk, funk, gospel, guitar, happy, hip-hop, house, indie, indie-pop, jazz, latin, lo-fi, metal, new-release, opera, pop, progressive-house, punk, r-n-b, reggae, reggaeton, rock, romance, sad, singer-songwriter, soul, soundtrack, study, synth-pop, techno, trance, trap, uk-garage, world-music

Choose exactly 3 genres from this list based on the mood.`,
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
