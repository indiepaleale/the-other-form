process.env.PATH = process.env.PATH + ';C:\\Program Files\\Azure Kinect Body Tracking SDK\\tools';
import { Worker } from 'worker_threads';
import { WebSocket, WebSocketServer } from 'ws';
const K4A = await import('kinect-azure');
const KinectAzure = K4A.default;

const KINECT_PORT = process.env.KINECT_PORT || 8001;

const wss = new WebSocketServer({ port: KINECT_PORT });
const clients = new Set();
const kinect = new KinectAzure();

const width = 512;
const height = 512;

wss.on("connection", function connection(ws) {
    clients.add(ws);

    console.log("Frontend connected to KinectAzure Server");

    ws.on("message", function incoming(message) {
        //console.log("received: %s", message);
    });
    ws.on("close", function close() {
        clients.delete(ws);
    });
    //ws.send("Connected to KinectAzure Server");
});

if (kinect.open()) {
    console.log("Kinect Opened");
    kinect.startCameras({
        camera_fps: KinectAzure.K4A_FRAMES_PER_SECOND_30,
        depth_mode: KinectAzure.K4A_DEPTH_MODE_WFOV_2X2BINNED,
        include_body_index_map: true,
        min_depth: 10,
        max_depth: 5000,
    });
    kinect.createTracker({
        processing_mode: KinectAzure.K4ABT_TRACKER_PROCESSING_MODE_GPU_CUDA,
        sensor_orientation: KinectAzure.K4ABT_SENSOR_ORIENTATION_FLIP180
    });
    kinect.startListening((data) => {
        const numBodies = data.bodyFrame.numBodies;

        const depthRange = kinect.getDepthModeRange(KinectAzure.K4A_DEPTH_MODE_WFOV_2X2BINNED);
        const maskedDepthBuffer = depthImageFrameMasked(data.depthImageFrame, data.bodyFrame.bodyIndexMapImageFrame, depthRange);

        clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(maskedDepthBuffer);
                client.send(JSON.stringify({ type: "kinectData", numBodies: numBodies }));
            }
        });
    });
}

const depthImageFrameMasked = (depthImageFrame, bodyIndexMap, depthRange) => {
    const depthData = Buffer.from(depthImageFrame.imageData);
    const bodyIndexBuffer = Buffer.from(bodyIndexMap.imageData);
    const colorMaskedBuffer = new Uint8Array(depthImageFrame.width * depthImageFrame.height * 4);

    for (let i = 0; i < depthData.length; i += 2) {
        const pixelIndex = i / 2;
        const depthValue = (depthData[i + 1] << 8) | depthData[i];
        const mappedValue = depthValue / 6000 * 255;

        const y = Math.floor(pixelIndex / depthImageFrame.width);
        const x = pixelIndex % depthImageFrame.width;
        const flippedY = depthImageFrame.height - 1 - y;
        const flippedIndex = flippedY * depthImageFrame.width + x;

        if (bodyIndexBuffer[pixelIndex] !== KinectAzure.K4ABT_BODY_INDEX_MAP_BACKGROUND) {
            const hue = (depthValue / 3000) * 360;
            const [r, g, b] = hsv2rgb(hue, 1, 1);
            colorMaskedBuffer[flippedIndex * 4] = r;
            colorMaskedBuffer[flippedIndex * 4 + 1] = g;
            colorMaskedBuffer[flippedIndex * 4 + 2] = b;
            colorMaskedBuffer[flippedIndex * 4 + 3] = 255;
        } else {
            colorMaskedBuffer[flippedIndex * 4] = mappedValue;
            colorMaskedBuffer[flippedIndex * 4 + 1] = mappedValue;
            colorMaskedBuffer[flippedIndex * 4 + 2] = mappedValue;
            colorMaskedBuffer[flippedIndex * 4 + 3] = 255;
        }
    }

    return colorMaskedBuffer;
}

function hsv2rgb(h, s, v) {
    let r, g, b;
    const i = Math.floor(h / 60);
    const f = h / 60 - i;
    const p = v * (1 - s);
    const q = v * (1 - f * s);
    const t = v * (1 - (1 - f) * s);

    switch (i % 6) {
        case 0: r = v, g = t, b = p; break;
        case 1: r = q, g = v, b = p; break;
        case 2: r = p, g = v, b = t; break;
        case 3: r = p, g = q, b = v; break;
        case 4: r = t, g = p, b = v; break;
        case 5: r = v, g = p, b = q; break;
    }

    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}
