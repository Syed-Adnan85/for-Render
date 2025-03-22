const express = require("express");
const cors = require("cors");
const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 5000;

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

// Video Download Route
app.get("/download", (req, res) => {
    const videoUrl = req.query.url;
    const quality = req.query.quality || "best";

    if (!videoUrl) {
        return res.status(400).json({ error: "Missing video URL" });
    }

    const outputFilePath = path.join(DOWNLOAD_DIR, "%(title)s.%(ext)s");
    const command = `yt-dlp -f "${quality}" -o "${outputFilePath}" "${videoUrl}"`;

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

        res.json({
            message: "Download complete!",
            file: downloadedFile,
            path: `/downloads/${downloadedFile}`,
            download_url: `http://localhost:${PORT}/downloads/${encodeURIComponent(downloadedFile)}`,
            stream_url: `http://localhost:${PORT}/stream?file=${encodeURIComponent(downloadedFile)}`
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
