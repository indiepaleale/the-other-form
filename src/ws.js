import OSC from "osc-js";

const SERIAL_HOST = 'localhost';
const SERIAL_WS_PORT = import.meta.env.VITE_SERIAL_SOCKET_PORT || 8000;

const KINECT_HOST = 'localhost';
const KINECT_PORT = import.meta.env.VITE_KINECT_PORT || 8001;

const serialSocket = new WebSocket(`ws://${SERIAL_HOST}:${SERIAL_WS_PORT}`);
const kinectSocket = new WebSocket(`ws://${KINECT_HOST}:${KINECT_PORT}`);

kinectSocket.binaryType = 'arraybuffer';
const osc = new OSC()
osc.open()// connect to some ws://host:8080

let state_buffer = [];
let controlTarget = [0, 0, 0, 0];
let head = [0, 0, 0];

let numBodies = 0;

const send2PD = {
    prevPos: null,
    currPos: null,
    diff: null,
    update(newPos) {
        if (this.prevPos == null) {
            this.prevPos = newPos;
        }
        this.currPos = newPos;
        const diffVec = this.currPos.clone().sub(this.prevPos);
        if (this.diff > 5) {

            this.diff = 0;
            bang();
        }
        this.prevPos = this.currPos;
        this.diff += diffVec.length();

    }
}

function bang() {
    if (osc.status() !== 1) {
        return;
    }
    try {
        osc.send(new OSC.Message('/pd', 'bang'));
    } catch (error) {
        console.log(error);
    }
}

document.addEventListener('keydown', (event) => {
    if (event.key === 'b') {
        bang();
    }
});
serialSocket.addEventListener('open', () => {
    console.log('Connected to Serial Server');
});


kinectSocket.addEventListener('open', () => {
    kinectSocket.send("Frontend connected!");
    console.log('Connected to KinectAzure Backend');
});


kinectSocket.addEventListener('message', (event) => {
    handleMessage(event.data);
});


kinectSocket.addEventListener('error', (event) => {
    console.error('WebSocket error:', event);
});

kinectSocket.addEventListener('close', (event) => {
    console.log('WebSocket connection closed:', event.code, event.reason);
});

function handleMessage(message) {
    if (typeof message === 'string') {
        try {
            const parsedMessage = JSON.parse(message);
            switch (parsedMessage.type) {
                case 'kinectData':
                    numBodies = parsedMessage.numBodies;
                    break;

                case 'state':
                    const state = {
                        pos: parsedMessage.pos,
                        target: parsedMessage.target,
                        end: parsedMessage.end,
                    }
                    if (state.pos) {
                        controlTarget = state.pos;
                        controlTarget[0] /= 3;
                        controlTarget[1] /= 3;
                    }
                    if (state.target) head = state.target;
                    state_buffer.push(state);
                    break;

                default:
                    break;
            }
        }
        catch (e) {
            console.log("Error parsing message: ", message);
        }
    }
    // needs validation here
    else if (message instanceof ArrayBuffer) {
        try {
            const depthBuffer = new Uint8Array(message);
            drawDepthData(depthBuffer);
        }
        catch (e) {
            console.error('Failed update Depth Image', e);
        }

    }

}

// draw invisible depth image on DOM
const depthImage = document.createElement('canvas');
depthImage.width = 512;
depthImage.height = 512;
depthImage.style.backgroundColor = 'grey';
document.body.appendChild(depthImage);
depthImage.style.display = 'none';
depthImage.id = 'depthCanvas';

function colorBuffer2Image(colorBuffer) {
    const clampedArray = new Uint8ClampedArray(colorBuffer);
    return new ImageData(clampedArray, 512, 512);
}

function drawDepthData(buffer) {
    const canvas = document.getElementById('depthCanvas');
    const context = canvas.getContext('2d');

    const imageData = colorBuffer2Image(buffer);
    context.putImageData(imageData, 0, 0);
}

function send2Raspi(controls) {
    if (serialSocket.readyState === WebSocket.OPEN) {
        const dataString = controls.map(value => value.toFixed(2)).join(',') + '\n';
        serialSocket.send(dataString);
    }
}

export { depthImage, numBodies, send2Raspi, send2PD }