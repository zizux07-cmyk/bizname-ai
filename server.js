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

    if (req.method === "OPTIONS") {
        res.writeHead(204);
        return res.end();
    }

    // Show website homepage
    if (req.method === "GET" && req.url === "/") {
        const filePath = path.join(__dirname, "index.html");

        fs.readFile(filePath, (error, content) => {
            if (error) {
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

    // Generate AI business names
    if (req.method === "POST" && req.url === "/generate") {
        let body = "";

        req.on("data", chunk => {
            body += chunk;
        });

        req.on("end", async () => {
            try {
                const data = JSON.parse(body);

                if (!data.business || !data.style) {
                    res.writeHead(400, {
                        "Content-Type": "application/json"
                    });

                    return res.end(JSON.stringify({
                        error: "Business type and style are required."
                    }));
                }

                const response = await client.responses.create({
                    model: "gpt-6-luna",
                    input: `Generate 5 creative business name ideas.

Business type: ${data.business}
Style: ${data.style}

Return only 5 name ideas, one per line.`
                });

                res.writeHead(200, {
                    "Content-Type": "application/json"
                });

                res.end(JSON.stringify({
                    names: response.output_text
                }));

            } catch (error) {
                console.error(error);

                res.writeHead(500, {
                    "Content-Type": "application/json"
                });

                res.end(JSON.stringify({
                    error: "AI request failed."
                }));
            }
        });

        return;
    }

    res.writeHead(404, {
        "Content-Type": "text/plain"
    });

    res.end("Not Found");
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
});