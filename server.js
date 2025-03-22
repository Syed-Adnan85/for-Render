const express = require("express");
const cors = require("cors");
const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const DOWNLOAD_DIR = path.join(__dirname, "downloads");
if (!fs.existsSync(DOWNLOAD_DIR)) {
    fs.mkdirSync(DOWNLOAD_DIR);
}

// API Home Route
app.get("/", (req, res) => {
    res.json({ message: "Video Downloader API is running!" });
});

// Fetch Available Video Qualities along with Title & Thumbnail
app.get("/get-qualities", (req, res) => {
    const videoUrl = req.query.url;
    if (!videoUrl) {
        return res.status(400).json({ error: "Missing video URL" });
    }

    const command = `yt-dlp --dump-json "${videoUrl}"`;

    exec(command, (error, stdout, stderr) => {
        if (error) {
            return res.status(500).json({ error: "Failed to fetch video info", details: stderr });
        }

        try {
            const info = JSON.parse(stdout);
            const formats = info.formats ? info.formats.map(format => ({
                format_id: format.format_id,
                quality: format.format_note,
                url: format.url
            })) : [];

            res.json({
                title: info.title,
                thumbnail: info.thumbnail,
                formats
            });

        } catch (parseError) {
            console.error("Error parsing video info:", parseError);
            res.status(500).send("Error parsing video info");
        }
    });
});

// Video Download Route
app.get("/download", (req, res) => {
    const videoUrl = req.query.url;
    const quality = req.query.quality || "best";

    if (!videoUrl) {
        return res.status(400).json({ error: "Missing video URL" });
    }

    const uniqueName = `${Date.now()}-%(title)s.%(ext)s`;
    const outputFilePath = path.join(DOWNLOAD_DIR, uniqueName);
    const command = `yt-dlp -f "${quality}" --write-info-json -o "${outputFilePath}" "${videoUrl}"`;

    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error: ${stderr}`);
            return res.status(500).json({ error: "Download failed", details: stderr });
        }

        // Find the most recently downloaded file
        const files = fs.readdirSync(DOWNLOAD_DIR);
        const downloadedFile = files.length > 0 ? files[files.length - 1] : null;

        if (!downloadedFile) {
            return res.status(500).json({ error: "File not found after download" });
        }

        // Read metadata file
        const infoFile = downloadedFile.replace(/\.(mp4|mkv|webm|avi|flv|mov)$/, ".info.json");
        let title = "Unknown Title";
        let thumbnail = null;

        if (fs.existsSync(path.join(DOWNLOAD_DIR, infoFile))) {
            const infoData = JSON.parse(fs.readFileSync(path.join(DOWNLOAD_DIR, infoFile), "utf8"));
            title = infoData.title || title;
            thumbnail = infoData.thumbnail || thumbnail;
        }

        const serverUrl = `${req.protocol}://${req.get("host")}`;

        res.json({
            message: "Download complete!",
            title,
            thumbnail,
            file: downloadedFile,
            path: `/downloads/${downloadedFile}`,
            download_url: `${serverUrl}/downloads/${encodeURIComponent(downloadedFile)}`,
            stream_url: `${serverUrl}/stream?file=${encodeURIComponent(downloadedFile)}`
        });
    });
});

// Stream Video Route (for playing in the browser)
app.get("/stream", (req, res) => {
    const fileName = req.query.file;
    if (!fileName) {
        return res.status(400).json({ error: "File name is required" });
    }

    const filePath = path.join(DOWNLOAD_DIR, fileName);
    
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: "File not found" });
    }

    res.sendFile(filePath);
});

// Serve downloaded files
app.use('/downloads', express.static(DOWNLOAD_DIR));

// Start Server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
