process.env.PATH = process.env.PATH + ';C:\\Program Files\\Azure Kinect Body Tracking SDK\\tools';
const { Worker } = require('worker_threads');
const KinectAzure = require('kinect-azure');
const WebSocket = require('ws');

const WS_PORT = process.env.KINECT_PORT || 8001;

const wss = new WebSocket.Server({ port: WS_PORT });
const clients = new Set();
const kinect = new KinectAzure();

const width = 320;
const height = 288;

wss.on("connection", function connection(ws) {
    clients.add(ws);
    ws.on("message", function incoming(message) {
        console.log("received: %s", message);
    });
    ws.on("close", function close() {
        clients.delete(ws);
    });
    ws.send("Connected to Kinect Azure Handler");
});

const depthModeRange = kinect.getDepthModeRange(KinectAzure.K4A_DEPTH_MODE_NFOV_2X2BINNED);
//console.log(depthModeRange);
if (kinect.open()) {
    console.log("Kinect Opened");
    kinect.startCameras({
        camera_fps: KinectAzure.K4A_FRAMES_PER_SECOND_30,
        depth_mode: KinectAzure.K4A_DEPTH_MODE_NFOV_2X2BINNED,
        color_resolution: KinectAzure.K4A_COLOR_RESOLUTION_720,
        include_body_index_map: true,

    });
    kinect.createTracker({
        processing_mode: KinectAzure.K4ABT_TRACKER_PROCESSING_MODE_GPU_CUDA
    });
    kinect.startListening((data) => {
        if (data.bodyFrame.numBodies === 0) {
            return;
        }
        console.log("Number of bodies: ", data.bodyFrame.numBodies);
        // handle body data

        //console.log(data.bodyFrame.bodies[0].skeleton.joints[KinectAzure.K4ABT_JOINT_NECK]);
        // handle depth data
        // const newDepthData = Buffer.from(data.depthImageFrame.imageData);
        // const depthBuffer = new Uint16Array(newDepthData.length / 2);
        // for (let i = 0; i < newDepthData.length; i += 2) {
        //     const depthValue = (newDepthData[i + 1] << 8) | newDepthData[i];
        //     depthBuffer[i / 2] = depthValue;
        // }
        // const downSampledDepthBuffer = new Uint16Array(64 * 64);
        // for (let i = 0; i < 64; i++) {
        //     for (let j = 0; j < 64; j++) {
        //         const index = (j * 4 * width + i * 4);
        //         const depthValue = depthBuffer[index];
        //         downSampledDepthBuffer[j * 64 + i] = depthValue / 10;
        //     }
        // }

        const maskedDepthBuffer = depthImageFrameMasked(data.depthImageFrame, data.bodyFrame.bodyIndexMapImageFrame, 2);

        const kernel = createGaussianKernel(25, 5);
        const blurredDepthBuffer = applyGaussianBlur(maskedDepthBuffer, width / 2, height / 2, kernel);
        clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(blurredDepthBuffer);
            }
        });

    });

}
const depthImageFrameMasked = (depthImageFrame, bodyIndexMap, downSampleRate) => {
    const depthData = Buffer.from(depthImageFrame.imageData);
    const bodyIndexBuffer = Buffer.from(bodyIndexMap.imageData);

    const depthBuffer = new Uint16Array(depthData.length / 2);

    for (let i = 0; i < depthData.length; i += 2) {
        const depthValue = (depthData[i + 1] << 8) | depthData[i];
        if (bodyIndexBuffer[i / 2] !== KinectAzure.K4ABT_BODY_INDEX_MAP_BACKGROUND) {
            depthBuffer[i / 2] = depthValue;
        }
        else {
            depthBuffer[i / 2] = 0;
        }
    }

    const sampleWidth = width / downSampleRate;
    const sampleHeight = height / downSampleRate;
    const downSampledDepthBuffer = new Uint16Array(sampleWidth * sampleHeight);
    for (let i = 0; i < sampleWidth; i++) {
        for (let j = 0; j < sampleHeight; j++) {

            const index = (j * downSampleRate * width + i * downSampleRate);
            const depthValue = depthBuffer[index];
            downSampledDepthBuffer[j * sampleWidth + i] = depthValue;
        }
    }
    return downSampledDepthBuffer;

}

function createGaussianKernel(size, sigma) {
    const kernel = [];
    const mean = size / 2;
    let sum = 0;

    for (let x = 0; x < size; x++) {
        kernel[x] = [];
        for (let y = 0; y < size; y++) {
            const value = Math.exp(-0.5 * (Math.pow((x - mean) / sigma, 2.0) + Math.pow((y - mean) / sigma, 2.0))) / (2 * Math.PI * sigma * sigma);
            kernel[x][y] = value;
            sum += value;
        }
    }

    // Normalize the kernel
    for (let x = 0; x < size; x++) {
        for (let y = 0; y < size; y++) {
            kernel[x][y] /= sum;
        }
    }

    return kernel;
}

function applyGaussianBlur(depthBuffer, width, height, kernel) {
    const blurredBuffer = new Uint16Array(depthBuffer.length);
    const kernelSize = kernel.length;
    const halfKernelSize = Math.floor(kernelSize / 2);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let sum = 0;
            let weightSum = 0;

            for (let ky = -halfKernelSize; ky <= halfKernelSize; ky++) {
                for (let kx = -halfKernelSize; kx <= halfKernelSize; kx++) {
                    const px = x + kx;
                    const py = y + ky;

                    if (px >= 0 && px < width && py >= 0 && py < height) {
                        const weight = kernel[ky + halfKernelSize][kx + halfKernelSize];
                        sum += depthBuffer[py * width + px] * weight;
                        weightSum += weight;
                    }
                }
            }

            blurredBuffer[y * width + x] = sum / weightSum;
        }
    }

    return blurredBuffer;
}

async function solvePSO(target) {
    return new Promise((resolve, reject) => {
        const worker = new Worker('./kinect-server/swarm.js');
        worker.postMessage(target);
        worker.on('message', resolve);
        worker.on('error', reject);
        worker.on('exit', (code) => {
            if (code !== 0) reject(new Error(`Worker stopped with exit code ${code}`));
        });
    });
}

let controller = null;
setInterval(async () => {
    const target = [100,100,100];
    const solution = await solvePSO(target);
    controller = solution;
    //console.log(solution);
}, 1000);
setInterval(() => {
    console.log(controller);
},5000);