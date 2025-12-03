// server.js (ESM version)
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import OpenAI from "openai";

// Load .env locally; on Render you use dashboard env vars
dotenv.config();

const app = express();

// Render sets PORT; fall back to 5000 locally
const PORT = process.env.PORT || 5000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  console.warn(
    "⚠️ OPENAI_API_KEY is missing. Set it in .env (local) or in Render Environment variables."
  );
}

// OpenAI client
const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

// Fix __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(
  cors({
    origin: "*", // later you can restrict to your frontend domain
  })
);
app.use(express.json());

// Serve static frontend from /public (for local use)
app.use(express.static(path.join(__dirname, "public")));

// Root route → serve index.html locally, or show text on Render
app.get("/", (req, res) => {
  try {
    return res.sendFile(path.join(__dirname, "public", "index.html"));
  } catch (e) {
    return res.send("Brighter Business AI backend is running ✅");
  }
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({ ok: true, message: "Brighter Business AI server is running ✅" });
});

// MAIN ROUTE: generate outreach/social posts
app.post("/api/generate-post", async (req, res) => {
  try {
    const {
      topic,
      platform = "instagram",
      tone = "friendly",
      language = "en",
      goal = "more_sales",
      audience = "ecommerce_store_owners",
      style = "social_post", // "social_post" | "dm" | "email"
      variantsCount = 2,
      includeUrgency = true,
      includeSocialProof = true,
      mentionAI = true,
    } = req.body;

    if (!topic) {
      return res.status(400).json({
        success: false,
        error: "topic is required",
      });
    }

    if (!OPENAI_API_KEY) {
      return res.status(500).json({
        success: false,
        error: "OPENAI_API_KEY is not set on the server.",
      });
    }

    const safeVariants = Math.min(
      Math.max(parseInt(variantsCount || 2, 10), 1),
      3
    );

    const goalText =
      {
        more_sales: "focus strongly on driving sales and direct response",
        more_traffic: "focus on driving clicks and traffic to the store",
        leads:
          "focus on generating leads and conversations (DMs, email signups, calls)",
        awareness: "focus on brand awareness, trust and positioning",
      }[goal] || "focus on driving sales and qualified interest";

    const audienceText =
      {
        ecommerce_store_owners:
          "You are talking directly to e-commerce store owners who care about consistent orders, profit, and low risk.",
        local_business:
          "You are talking to local business owners who want more bookings and walk-in customers.",
        coaches_consultants:
          "You are talking to coaches and consultants who want more high-quality clients.",
        general:
          "You are talking to online business owners and decision-makers.",
      }[audience] || "You are talking directly to e-commerce store owners.";

    const urgencyRule = includeUrgency
      ? "- Add subtle urgency (this season, don't wait until it's too late) without sounding like cheap spam."
      : "- Do NOT use urgency; keep it calm and informational.";

    const socialProofRule = includeSocialProof
      ? "- Add light social proof or credibility (e.g. what other stores experience, typical results, or a common pattern)."
      : "- Do NOT use social proof or mention other clients; keep it neutral.";

    const mentionAIRule = mentionAI
      ? "- You may mention that the strategy is AI-powered or uses an AI engine, but always as a clear benefit (more consistency, less manual work), not just a tech buzzword."
      : "- Do NOT mention AI, engine, automation or algorithms; speak as if it’s just a powerful strategy/service.";

    const styleText =
      {
        social_post:
          "Write it as a social media caption for feeds (Instagram/Facebook/TikTok). Short paragraphs, good line breaks, but still 8–14 sentences overall.",
        dm: "Write it as a direct message (WhatsApp/DM style). Use a friendly greeting, shorter paragraphs, and make it feel 1:1 and personal.",
        email:
          "Write it as an outreach email. Include a natural subject-style hook line (but still put everything in the caption field), a short greeting, body, and a clear sign-off.",
      }[style] || "Write it as a social media caption for feeds.";

    const captionPrompt = `
You are "Brighter Business AI" — a premium outreach and sales copy engine designed to help agencies and experts convert store owners into clients.

Goal:
Write long, persuasive, HUMAN outreach-style captions tailored for ${platform}, that make e-commerce store owners interested in working with the sender.

Context:
- Topic / offer: "${topic}"
- Tone: ${tone}
- Language: ${language}
- Primary objective: ${goalText}
- Audience: ${audienceText}
- Style: ${styleText}

Overall style:
- It should read like a mini sales letter, not a short caption.
- Speak directly to the reader ("you", "your store").
- Be very concrete about problems (inconsistent orders, low traffic, wasted ad spend, weak Google visibility, etc.) and the outcome you help them achieve.
- Make the store owner feel understood, then show a clear path to better results.

Caption requirements (for EACH variant):
- Length: 8–14 sentences. This must feel like a real, meaningful, detailed message.
- Include natural line breaks (double line breaks between small paragraphs) for readability on mobile.
- Start with a STRONG, short hook line that speaks directly to the pain or desire of the store owner. This hook must also be provided separately in the "hook" field.
- Then:
  - Agitate the problem briefly (what happens if they ignore it).
  - Explain your solution and what you do in simple, concrete words.
  - Highlight 3–5 specific benefits (consistent orders, results without risk, no need to manage ads, better visibility, etc.).
- Include ONE clear call-to-action near the end (e.g. "Reply with your WhatsApp number", "Send us a DM", "Tap the link in bio to see how this works").
${urgencyRule}
${socialProofRule}
${mentionAIRule}
- Avoid cliché hype. Sound like a confident expert, not a spammy marketer.
- Do NOT stuff hashtags inside the caption (you can keep hashtags separate).

Hook requirements (for EACH variant):
- "hook" is 1 short line (max 15 words).
- It should be the scroll-stopper or subject-style line you would put at the very top.
- It must also appear as the first line of the caption itself.

Hashtag requirements (for EACH variant):
- 10–20 hashtags.
- All must start with "#".
- Mix of broad and niche tags, all relevant to:
  - e-commerce
  - growth and orders
  - store owners
  - the niche implied by the topic
- Do NOT explain the hashtags. Just list them.

Very important:
- You must respond ONLY in valid JSON.
- No extra commentary, no explanation, no markdown.
- JSON format must be EXACTLY:

{
  "variants": [
    {
      "hook": "first hook line here",
      "caption": "first long caption here",
      "hashtags": ["#tag1", "#tag2"]
    },
    {
      "hook": "second hook line here",
      "caption": "second long caption here",
      "hashtags": ["#tag1", "#tag2"]
    }
  ]
}

- The number of objects inside "variants" MUST be exactly ${safeVariants}.
`;

    // Call OpenAI
    const chatResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are Brighter Business AI, an elite outreach and conversion engine for online store owners.",
        },
        { role: "user", content: captionPrompt },
      ],
      temperature: 0.9,
    });

    const raw = chatResponse.choices?.[0]?.message?.content?.trim() || "";

    let variants = [];

    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.variants)) {
        variants = parsed.variants.map((v) => ({
          hook: (v.hook || "").trim(),
          caption: (v.caption || "").trim(),
          hashtags: Array.isArray(v.hashtags) ? v.hashtags : [],
        }));
      }
    } catch (e) {
      // If JSON parse fails, just return the raw text as one caption
      variants = [
        {
          hook: "",
          caption: raw || "New post coming soon!",
          hashtags: [],
        },
      ];
    }

    // Clean and normalize
    variants = variants.map((v) => {
      let caption = v.caption || "New post coming soon!";
      caption = caption.trim();

      let hook = (v.hook || "").trim();
      if (!hook && caption) {
        const split = caption.split(/[\n.!?]/);
        hook = split[0].trim().slice(0, 120);
      }

      const cleanTags = (v.hashtags || [])
        .map((h) => String(h).trim())
        .filter((h) => h.length > 0)
        .map((h) => (h.startsWith("#") ? h : `#${h.replace(/^#+/, "")}`));

      return {
        hook: hook || "New results without extra risk.",
        caption,
        hashtags: cleanTags,
      };
    });

    if (!variants.length) {
      variants = [
        {
          hook: "New results without extra risk.",
          caption: "New post coming soon!",
          hashtags: [],
        },
      ];
    }

    return res.json({
      success: true,
      topic,
      platform,
      tone,
      language,
      goal,
      audience,
      style,
      variantsCount: variants.length,
      variants,
    });
  } catch (err) {
    console.error("❌ Error generating post (Brighter Business AI):");
    console.error(err?.response?.data || err.message || err);

    return res.status(500).json({
      success: false,
      error: "Failed to generate post.",
      details: err?.response?.data || err.message || String(err),
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Brighter Business AI running on port ${PORT}`);
});
