
const http = require("http");
const fs = require("fs");
const path = require("path");
const OpenAI = require("openai");

const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

const server = http.createServer(async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Content-Type", "application/json; charset=utf-8");

    if (req.method === "OPTIONS") {
        res.writeHead(204);
        return res.end();
    }

    if (req.method === "GET" && req.url === "/") {
        fs.readFile(path.join(__dirname, "index.html"), (err, content) => {
            if (err) {
                res.writeHead(500);
                return res.end("Could not load website.");
            }

            res.writeHead(200, {
                "Content-Type": "text/html; charset=utf-8"
            });
            res.end(content);
        });
        return;
    }

    if (req.method === "POST" && req.url === "/generate") {
        let body = "";
        let tooLarge = false;

        req.on("data", chunk => {
            body += chunk;

            if (body.length > 10000) {
                tooLarge = true;
                res.writeHead(413);
                res.end(JSON.stringify({
                    error: "Request is too large."
                }));
                req.destroy();
            }
        });

        req.on("end", async () => {
            if (tooLarge) return;

            try {
                const data = JSON.parse(body);
                const business = String(data.business || "").trim();
                const style = String(data.style || "").trim().toLowerCase();

                const allowedStyles = [
                    "modern", "premium", "fun", "minimal"
                ];

                if (!business || business.length > 100 ||
                    !allowedStyles.includes(style)) {
                    res.writeHead(400);
                    return res.end(JSON.stringify({
                        error: "Enter a valid business type and style."
                    }));
                }

                const response = await client.responses.create({
                    // Keep your currently working model unchanged.
                    model: "gpt-6-luna",
                    input: `You are a professional brand naming expert.

Create exactly 10 creative business names.

Business type: ${business}
Style: ${style}

For every idea provide:
- name: short, memorable business name
- meaning: a brief explanation of the name
- tagline: a catchy short slogan
- vibe: brand personality in a few words

Return only valid JSON in this exact structure:
{
  "ideas": [
    {
      "name": "Example Name",
      "meaning": "Brief explanation",
      "tagline": "A short slogan",
      "vibe": "Modern and premium"
    }
  ]
}

Do not use markdown fences. Keep every field concise.
The ideas must fit the requested business type and style.`
                });

                let parsed;

                try {
                    parsed = JSON.parse(response.output_text);
                } catch {
                    throw new Error("AI returned invalid JSON.");
                }

                if (!Array.isArray(parsed.ideas) ||
                    parsed.ideas.length === 0) {
                    throw new Error("AI returned no name ideas.");
                }

                const ideas = parsed.ideas
                    .filter(item =>
                        item &&
                        typeof item.name === "string" &&
                        item.name.trim()
                    )
                    .slice(0, 10)
                    .map(item => ({
                        name: item.name.trim(),
                        meaning: String(item.meaning || ""),
                        tagline: String(item.tagline || ""),
                        vibe: String(item.vibe || "")
                    }));

                if (!ideas.length) {
                    throw new Error("AI returned no valid names.");
                }

                res.writeHead(200);
                res.end(JSON.stringify({
                    names: ideas.map(item => item.name).join("\n"),
                    ideas
                }));

            } catch (error) {
                console.error("Generation failed:", error.message);

                res.writeHead(500);
                res.end(JSON.stringify({
                    error: "AI generation failed. Please try again."
                }));
            }
        });

        return;
    }

    res.writeHead(404, {
        "Content-Type": "text/plain; charset=utf-8"
    });
    res.end("Not Found");
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
});