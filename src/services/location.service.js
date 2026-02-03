import fetch from 'node-fetch';

export async function extractVillageFromAddress(address) {
  try {
    console.log("📍 Extracting village for address:", address);
    console.log("🔑 Gemini key present:", !!process.env.GEMINI_API_KEY);

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: `Extract ONLY the village or small town name from this Indian rural address. Return just the village name.\n\nAddress: ${address}`
                }
              ]
            }
          ]
        })
      }
    );

    console.log("🌐 Gemini HTTP Status:", response.status);

    const data = await response.json();
    console.log("🌍 Gemini raw response:", JSON.stringify(data, null, 2));

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      console.log("⚠️ Gemini returned no text");
      return 'UNKNOWN';
    }

    let village = text
      .replace(/village|town|is|name|:/gi, '')
      .replace(/[^\w\s]/gi, '')
      .trim();

    const words = village.split(/\s+/);
    village = words[words.length - 1];

    console.log("✅ Final extracted village:", village);

    return village.toUpperCase();

  } catch (err) {
    console.error("❌ Gemini extraction crashed:", err);
    return 'UNKNOWN';
  }
}
