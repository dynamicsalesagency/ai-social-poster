const API_BASE = "https://ai-social-poster.onrender.com"; // your Render URL

const res = await fetch(`${API_BASE}/api/generate-post`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    topic: "Your topic here",
    platform: "instagram",
    tone: "friendly",
    language: "en",
  }),
});
