const express = require('express');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

let ffmpegProcess = null;
let streamStatus = { status: 'idle', message: 'No stream running.' };

const CONFIG_FILE = path.join(__dirname, 'config.json');

// HTML content embedded directly in index.js
const HTML_CONTENT = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>M3U/M3U8 Streamer JS</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background-color: #f4f4f4; color: #333; }
        .container { background-color: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); max-width: 600px; margin: auto; }
        h1 { color: #0056b3; }
        .status-box { border: 1px solid #ddd; padding: 15px; margin-top: 20px; border-radius: 5px; background-color: #e9ecef; }
        .status-message { font-weight: bold; margin-bottom: 10px; }
        .status-detail { font-size: 0.9em; color: #555; }
        .buttons button { background-color: #007bff; color: white; padding: 10px 15px; border: none; border-radius: 5px; cursor: pointer; margin-right: 10px; }
        .buttons button:hover { background-color: #0056b3; }
        .buttons button:disabled { background-color: #cccccc; cursor: not-allowed; }
        .error { color: red; }
        .success { color: green; }
    </style>
</head>
<body>
    <div class="container">
        <h1>M3U/M3U8 Streamer to Facebook (Node.js)</h1>
        <div class="status-box">
            <div class="status-message">Current Stream Status: <span id="streamStatus">Loading...</span></div>
            <div class="status-detail" id="streamMessage"></div>
        </div>
        <div class="buttons" style="margin-top: 20px;">
            <button id="startButton">Start Stream</button>
            <button id="stopButton" disabled>Stop Stream</button>
        </div>
        <div id="output" style="margin-top: 20px; white-space: pre-wrap; background-color: #eee; padding: 10px; border-radius: 5px; max-height: 300px; overflow-y: scroll;"></div>
    </div>

    <script>
        const streamStatusElement = document.getElementById("streamStatus");
        const streamMessageElement = document.getElementById("streamMessage");
        const startButton = document.getElementById("startButton");
        const stopButton = document.getElementById("stopButton");
        const outputElement = document.getElementById("output");

        async function updateStatus() {
            try {
                const response = await fetch("/stream_status");
                const data = await response.json();
                streamStatusElement.textContent = data.status;
                streamMessageElement.textContent = data.message;

                if (data.status === "running") {
                    streamStatusElement.className = "success";
                    startButton.disabled = true;
                    stopButton.disabled = false;
                } else if (data.status === "error") {
                    streamStatusElement.className = "error";
                    startButton.disabled = false;
                    stopButton.disabled = true;
                } else {
                    streamStatusElement.className = "";
                    startButton.disabled = false;
                    stopButton.disabled = true;
                }
            } catch (error) {
                console.error("Error fetching stream status:", error);
                streamStatusElement.textContent = "Error";
                streamMessageElement.textContent = "Could not connect to server.";
                streamStatusElement.className = "error";
                startButton.disabled = true;
                stopButton.disabled = true;
            }
        }

        startButton.addEventListener("click", async () => {
            outputElement.textContent = "Starting stream...";
            startButton.disabled = true;
            stopButton.disabled = true;
            try {
                const response = await fetch("/start_stream", { method: "POST" });
                const data = await response.json();
                outputElement.textContent = JSON.stringify(data, null, 2);
                updateStatus();
            } catch (error) {
                outputElement.textContent = "Error starting stream: " + error.message;
                startButton.disabled = false;
            }
        });

        stopButton.addEventListener("click", async () => {
            outputElement.textContent = "Stopping stream...";
            startButton.disabled = true;
            stopButton.disabled = true;
            try {
                const response = await fetch("/stop_stream", { method: "POST" });
                const data = await response.json();
                outputElement.textContent = JSON.stringify(data, null, 2);
                updateStatus();
            } catch (error) {
                outputElement.textContent = "Error stopping stream: " + error.message;
                stopButton.disabled = false;
            }
        });

        // Initial status update and then every 5 seconds
        updateStatus();
        setInterval(updateStatus, 5000);
    </script>
</body>
</html>
`;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
    res.send(HTML_CONTENT);
});

app.get('/stream_status', (req, res) => {
    res.json(streamStatus);
});

app.post('/start_stream', (req, res) => {
    if (ffmpegProcess) {
        return res.json({ status: 'error', message: 'Stream already running.' });
    }

    let config;
    try {
        config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    } catch (error) {
        streamStatus = { status: 'error', message: `Failed to read config.json: ${error.message}` };
        return res.json(streamStatus);
    }

    const { m3u8_url, rtmps_url, stream_key } = config;

    if (!m3u8_url || !rtmps_url || !stream_key) {
        streamStatus = { status: 'error', message: 'Missing stream configuration in config.json.' };
        return res.json(streamStatus);
    }

    const command = [
        '-i', m3u8_url,
        '-c:v', 'libx264',
        '-preset', 'veryfast',
        '-b:v', '2500k',
        '-maxrate', '3000k',
        '-bufsize', '6000k',
        '-pix_fmt', 'yuv420p',
        '-g', '50',
        '-c:a', 'aac',
        '-b:a', '128k',
        '-ar', '44100',
        '-f', 'flv',
        `${rtmps_url}${stream_key}`
    ];

    try {
        ffmpegProcess = spawn('ffmpeg', command, { stdio: ['ignore', 'pipe', 'pipe'] });
        streamStatus = { status: 'running', message: 'Stream started successfully.' };

        ffmpegProcess.stderr.on('data', (data) => {
            const msg = data.toString();
            console.error(`FFmpeg: ${msg}`);
            // You might want to capture and display these logs on the frontend
            if (msg.includes('Error')) {
                streamStatus = { status: 'error', message: `FFmpeg error: ${msg}` };
            }
        });

        ffmpegProcess.on('close', (code) => {
            console.log(`FFmpeg process exited with code ${code}`);
            if (code !== 0 && streamStatus.status !== 'error') {
                streamStatus = { status: 'error', message: `FFmpeg exited with code ${code}` };
            } else if (streamStatus.status !== 'error') {
                streamStatus = { status: 'stopped', message: 'Stream stopped normally.' };
            }
            ffmpegProcess = null;
        });

        ffmpegProcess.on('error', (err) => {
            console.error('Failed to start FFmpeg process:', err);
            streamStatus = { status: 'error', message: `Failed to start FFmpeg: ${err.message}` };
            ffmpegProcess = null;
        });

        res.json({ status: 'starting', message: 'Attempting to start stream...' });
    } catch (error) {
        streamStatus = { status: 'error', message: `Failed to start stream: ${error.message}` };
        res.json(streamStatus);
    }
});

app.post('/stop_stream', (req, res) => {
    if (!ffmpegProcess) {
        return res.json({ status: 'error', message: 'No stream is running.' });
    }

    ffmpegProcess.kill('SIGINT'); // Send interrupt signal to FFmpeg
    streamStatus = { status: 'stopped', message: 'Stream stopped by user.' };
    res.json(streamStatus);
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on port ${PORT}`);
});


