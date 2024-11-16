import { pyBackend } from './gui';
import { kinectDepth } from './scene-setup';

const url = 'ws://localhost:8001';
const socket = new WebSocket(url);
socket.binaryType = 'arraybuffer';

let state_buffer = [];


// Event listener for when the connection is opened
socket.addEventListener('open', () => {
    console.log('Connected to the WebSocket server');
    socket.send(JSON.stringify({ type: 'identify', role: 'frontend' }));
});

// Event listener for when a message is received from the server
socket.addEventListener('message', (event) => {
    console.log('Received message:', typeof event.data);
    console.log(event.data);
    handleMessage(event.data);
});

// Event listener for when an error occurs
socket.addEventListener('error', (event) => {
    console.error('WebSocket error:', event);
});

// Event listener for when the connection is closed
socket.addEventListener('close', (event) => {
    console.log('WebSocket connection closed:', event.code, event.reason);
});

// Function to handle received messages
function handleMessage(message) {
    if (true) {
        const uint8Array = new Uint8Array(message);
        const firstByte = uint8Array[0];
        if (firstByte === 123) {
            const decoder = new TextDecoder('utf-8');
            const jsonString = decoder.decode(message);
            try {
                const parsedMessage = JSON.parse(jsonString);
                switch (parsedMessage.type) {
                    case 'depthData':
                        console.log('Received depth data');

                    case 'state':
                        const state = {
                            pos: parsedMessage.pos,
                            target: parsedMessage.target,
                            end: parsedMessage.end,
                        }
                        state_buffer.push(state);
                        break;

                    case 'message':
                        pyBackend.setStatus(parsedMessage.status);
                    default:
                        break;
                }
                // console.log(parsedMessage);
            }
            catch (e) {
                console.error('Failed to parse message:', e);
            }
        }
        else {
            try {
                const uint16Array = new Uint16Array(message);
                kinectDepth.updateVert(uint16Array);
            }
            catch (e) {
                console.error('Failed to update Verticies:', e);

            }
        }
    }

}

// pyBackend.startTraining = function () {
//     if (!this.isTrainerReady) {
//         console.log('Trainer is not ready');
//         return;
//     }
//     if (socket.readyState === WebSocket.OPEN) {
//         socket.send(JSON.stringify({ type: 'command', target: 'trainer', command: 'start' }));
//         this.isTraining = true;
//     } else {
//         console.error('WebSocket is not open. Ready state:', socket.readyState);
//     }
// }
// pyBackend.stopTraining = function () {
//     if (socket.readyState === WebSocket.OPEN) {
//         socket.send(JSON.stringify({ type: 'command', target: 'trainer', command: 'stop' }));
//         this.isTraining = false;
//     } else {
//         console.error('WebSocket is not open. Ready state:', socket.readyState);
//     }
// }


function tick() {
    if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'command', target: 'evaluator', command: 'step' }));
    } else {
        console.error('WebSocket is not open. Ready state:', socket.readyState);
    }
}

function reset() {
    if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'command', target: 'evaluator', command: 'reset' }));
    } else {
        console.error('WebSocket is not open. Ready state:', socket.readyState);
    }
}

export { tick, reset, state_buffer };