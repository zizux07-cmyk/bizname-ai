const http = require("http");
const OpenAI = require("openai");

const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

const server = http.createServer(async (req, res) => {

    // Allow our website to talk to the server
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    // Generate business names
    if (req.method === "POST" && req.url === "/generate") {

        let body = "";

        req.on("data", chunk => {
            body += chunk;
        });

        req.on("end", async () => {

            try {
                const data = JSON.parse(body);

                const business = data.business;
                const style = data.style;

                const response = await client.responses.create({
                    model: "gpt-6-luna",
                    input: `Generate 5 creative business name ideas.

Business type: ${business}
Style: ${style}

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
                    error: "AI request failed"
                }));
            }
        });

        return;
    }

    res.writeHead(404, {
        "Content-Type": "text/plain"
    });

    res.end("Not found");
});

server.listen(3000, () => {
    console.log("AI server running on http://localhost:3000");
});