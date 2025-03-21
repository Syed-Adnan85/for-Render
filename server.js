const express = require("express");
const { exec } = require("child_process");
const cors = require("cors");
const path = require("path");

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Define the full path to yt-dlp inside the Render virtual environment
const ytDlpPath = "/opt/render/project/.venv/bin/yt-dlp";

app.post("/download", (req, res) => {
    const videoURL = req.body.url;

    if (!videoURL) {
        return res.status(400).json({ error: "URL is required" });
    }

    // ✅ Use the full path for yt-dlp to prevent "No versions available" error
    const command = `${ytDlpPath} -j "${videoURL}"`;

    exec(command, (error, stdout, stderr) => {
        if (error || stderr) {
            console.error("Error fetching video info:", stderr || error.message);
            return res.status(500).json({ error: "Error fetching video info. Please check the URL and try again." });
        }

        try {
            const info = JSON.parse(stdout);
            const formats = info.formats
                ? info.formats.map((format) => ({
                      quality: format.format_note || "Unknown",
                      url: format.url,
                  }))
                : [];

            res.json({
                title: info.title || "Unknown Title",
                thumbnail: info.thumbnail || null,
                formats,
            });
        } catch (parseError) {
            console.error("Error parsing video info:", parseError);
            res.status(500).json({ error: "Error parsing video info" });
        }
    });
});

app.listen(port, () => {
    console.log(`✅ Server running on port ${port}`);
});
