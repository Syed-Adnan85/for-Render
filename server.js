const express = require('express');
const { exec } = require('child_process');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.urlencoded({ extended: true }));

app.post('/download', (req, res) => {
    const videoURL = req.body.url;
    if (!videoURL) {
        return res.status(400).send('URL is required');
    }

    const command = process.platform === 'win32' ? 
        `yt-dlp.exe -j "${videoURL}"` : `./yt-dlp -j "${videoURL}"`;

    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error('Error fetching video info:', stderr);
            return res.status(400).send('Error fetching video info. Please check the URL and try again.');
        }

        try {
            const info = JSON.parse(stdout);
            const formats = info.formats ? info.formats.map(format => ({
                quality: format.format_note,
                url: format.url
            })) : [];

            res.json({
                title: info.title,
                thumbnail: info.thumbnail,
                formats
            });

        } catch (parseError) {
            console.error('Error parsing video info:', parseError);
            res.status(500).send('Error parsing video info');
        }
    });
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
