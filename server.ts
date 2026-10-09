import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Body parser with 60MB limit for audio clips
app.use(express.json({ limit: '60mb' }));
app.use(express.urlencoded({ extended: true, limit: '60mb' }));

// Initialize Gemini SDK with telemetry header
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
    timestamp: new Date().toISOString(),
  });
});

// Endpoint: Speaker Diarization and Audio Transcription
app.post('/api/diarize', async (req, res) => {
  try {
    const { audioBase64, mimeType = 'audio/webm', roster, segmentOffset = 0, contextNote } = req.body;

    if (!audioBase64) {
      return res.status(400).json({ error: 'Missing audioBase64 in request' });
    }

    if (!process.env.GEMINI_API_KEY) {
      // Mock fallback if API key is temporarily unavailable in dev
      return res.json({
        turns: [
          {
            speakerId: roster?.[0]?.id || 'dm',
            speakerName: roster?.[0]?.name || 'Dungeon Master',
            role: 'DM',
            startTime: segmentOffset + 2,
            endTime: segmentOffset + 9,
            text: 'The heavy iron portcullis groans as you step into the mossy stone corridor. The air smells of ozone and damp earth.',
            isOutOfCharacter: false,
            emotion: 'Atmospheric / Tense',
          },
          {
            speakerId: roster?.[1]?.id || 'p1',
            speakerName: roster?.[1]?.name || 'Lyra',
            role: 'Rogue',
            startTime: segmentOffset + 10,
            endTime: segmentOffset + 15,
            text: 'I draw my daggers and check the flagstones ahead for tripwires. Perception check is a 19.',
            isOutOfCharacter: false,
            emotion: 'Cautious',
          },
        ],
        summary: 'The party entered the ancient dungeon corridor and checked for pressure plates.',
      });
    }

    const rosterDescription = Array.isArray(roster)
      ? roster
          .map(
            (r) =>
              `- ${r.name} (${r.characterName || 'Player'}, Role: ${r.role || 'Player'}, Tone/Notes: ${
                r.voiceDescription || 'standard voice'
              })`
          )
          .join('\n')
      : 'Standard TTRPG group: Dungeon Master and 3-4 players.';

    const systemPrompt = `You are an expert audio transcriptionist and speaker diarization engine specialized in live, in-person tabletop roleplaying game (TTRPG) sessions (D&D, Pathfinder, Call of Cthulhu, etc.).
Your job is to analyze the provided session audio, detect speaker changes, accurately diarize each utterance, identify which player or the DM is speaking based on the group roster, and distinguish in-character (IC) roleplay from out-of-character (OOC) table banter or dice math.

Group Roster:
${rosterDescription}

Additional session context:
${contextNote || 'None provided'}

Segment start time offset in seconds: ${segmentOffset} seconds.

Output strictly valid JSON with this exact structure:
{
  "turns": [
    {
      "speakerId": "string (matching roster id or 'dm' or 'unknown')",
      "speakerName": "string",
      "role": "string",
      "startTime": number (absolute session seconds, taking offset into account),
      "endTime": number (absolute session seconds),
      "text": "string (the transcribed spoken dialogue)",
      "isOutOfCharacter": boolean,
      "emotion": "string (e.g. Tense, Excited, Humorous, Thoughtful)",
      "category": "string (Dialogue | Combat Callout | Rule Check | Dice Roll | Description)"
    }
  ],
  "segmentSummary": "string (brief 1-2 sentence recap of what happened in this audio segment)"
}`;

    const cleanBase64 = audioBase64.replace(/^data:audio\/[a-zA-Z0-9]+;base64,/, '');

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType: mimeType.split(';')[0],
                data: cleanBase64,
              },
            },
            {
              text: 'Transcribe this TTRPG audio segment with full speaker diarization, identification, and timestamps. Follow the JSON schema strictly.',
            },
          ],
        },
      ],
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
      },
    });

    const rawText = response.text || '{}';
    const parsed = JSON.parse(rawText);

    res.json(parsed);
  } catch (error: any) {
    console.error('Error in /api/diarize:', error);
    res.status(500).json({
      error: 'Failed to process audio diarization',
      message: error?.message || String(error),
    });
  }
});

// Endpoint: Generate Full Campaign Session Recap
app.post('/api/session-recap', async (req, res) => {
  try {
    const { sessionTitle, campaignName, sessionNumber, durationSeconds, bookmarks = [], turns = [], roster = [] } = req.body;

    if (!process.env.GEMINI_API_KEY) {
      return res.json({
        title: sessionTitle || `Session ${sessionNumber || 1} Chronicles`,
        executiveSummary: 'An eventful session marked by dungeon exploration, tactical combat, and crucial lore discoveries.',
        narrativeArc: [
          'The party convened at the Sunken Crypt following the map acquired from the village elder.',
          'Combat broke out against guardian sentinels, testing the party\'s coordination.',
          'A hidden reliquary was unearthed, revealing a glowing brass amulet.',
        ],
        keyEvents: bookmarks.map((b: any) => ({
          timestamp: b.timestamp,
          category: b.category,
          note: b.note,
        })),
        npcsEncountered: ['Tavernkeeper Barnaby', 'Crypt Guardian Vorak'],
        lootAcquired: ['Bag of Holding', 'Potion of Greater Healing (x2)', '150 gold pieces'],
        unresolvedHooks: ['Who left the fresh torches in the deeper cavern?', 'The cryptic engraving on the bronze door remains unread.'],
        mvpPlayer: roster[0]?.characterName || 'The Party',
      });
    }

    const prompt = `You are a legendary Campaign Chronicler and Dungeon Master assistant.
Review the following TTRPG session data:
Campaign: ${campaignName || 'The Adventure'}
Session: #${sessionNumber || 1} - "${sessionTitle || 'Untitled Session'}"
Duration: ${Math.round(durationSeconds / 60)} minutes
Party Roster: ${JSON.stringify(roster)}
Bookmarks Tagged by Players: ${JSON.stringify(bookmarks)}
Transcribed Dialogue Turns: ${JSON.stringify(turns.slice(0, 100))}

Generate a comprehensive, beautifully written TTRPG Session Chronicle.
Format response strictly as JSON with this schema:
{
  "title": "string (epic session title)",
  "executiveSummary": "string (2-3 paragraphs high-level narrative summary)",
  "narrativeArc": ["string (key beat 1)", "string (key beat 2)", "string (key beat 3)"],
  "combatHighlights": ["string (tactical moments and high rolls)"],
  "npcsEncountered": ["string (name and notes)"],
  "lootAcquired": ["string (items and gold)"],
  "unresolvedHooks": ["string (mysteries or quests to follow up next session)"],
  "quoteOfTheSession": "string (best in-character or out-of-character line)"
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    res.json(parsed);
  } catch (error: any) {
    console.error('Error in /api/session-recap:', error);
    res.status(500).json({
      error: 'Failed to generate session recap',
      message: error?.message || String(error),
    });
  }
});

// Vite middleware in dev, static files in production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`TavernEcho server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
