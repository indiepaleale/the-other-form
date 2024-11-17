process.env.PATH = process.env.PATH + ';C:\\Program Files\\Azure Kinect Body Tracking SDK\\tools';
//import kinectazure from 'kinect-azure';
import { Worker } from 'worker_threads';
import { WebSocket, WebSocketServer } from 'ws';
const K4A = await import('kinect-azure');
const KinectAzure = K4A.default;

const KINECT_PORT = process.env.KINECT_PORT || 8001;

const wss = new WebSocketServer({ port: KINECT_PORT });
const clients = new Set();
const kinect = new KinectAzure();

const width = 320;
const height = 288;

let psoSolvingFlag = false;

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
        let target = new Array(3).fill(0).map(() => Math.floor(Math.random() * 100));
        if (data.bodyFrame.numBodies === 0) {
            if (!psoSolvingFlag) {
                psoSolvingFlag = true;
                solvePSO(target).then((solution) => {
                    psoSolvingFlag = false;
                    console.log(solution);
                });
            }
            return;
        }
        console.log("Number of bodies: ", data.bodyFrame.numBodies);
        // handle body data
        console.log("Head joint:", data.bodyFrame.bodies[0].skeleton.joints[KinectAzure.K4ABT_JOINT_NECK]);

        // Handle depth data
        const maskedDepthBuffer = depthImageFrameMasked(data.depthImageFrame, data.bodyFrame.bodyIndexMapImageFrame, 2);
        const kernel = createGaussianKernel(25, 5);
        const blurredDepthBuffer = applyGaussianBlur(maskedDepthBuffer, width / 2, height / 2, kernel);

        // Send tracking to clients
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
        const worker = new Worker('./kinect-server/swarm.js'); // Create a new worker for each task

        worker.postMessage(target);
        worker.once('message', (message) => {
            resolve(message);
            worker.terminate(); // Terminate the worker after receiving the message
        });
        worker.once('error', (error) => {
            reject(error);
            worker.terminate(); // Terminate the worker on error
        });
        worker.once('exit', (code) => {
            if (code !== 0) {
                reject(new Error(`Worker stopped with exit code ${code}`));
            }
        });
    });
}

setImmediate(test);

async function test() {
    const target = [- 100, 100, 100];
    // const time = Date.now() / 1000;
    // const radius = 100;
    // const target = [
    //     radius * Math.cos(time/5),
    //     150,
    //     radius * Math.sin(time/5)
    // ];
    await solvePSO(target).then((solution) => {
        clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({ type: "state", pos: solution, target: target }));
            }
        });
        setImmediate(test);
    });
}