import OSC from 'osc-js'
import { SerialPort } from 'serialport'
import WebSocket from 'ws'

// serial port may needs more configuration

const OSC_PORT = process.env.OSC_PORT || 8080;
const SERIAL_SOCKET_PORT = process.env.SERIAL_SOCKET_PORT || 8000;
const SERIAL_PORT = process.env.SERIAL_PORT || 'COM3';

const config = { udpClient: { port: OSC_PORT } };
const osc = new OSC({ plugin: new OSC.BridgePlugin(config) });

// const serialPort = new SerialPort({ path: SERIAL_PORT, baudRate: 9600 }, err => {
//   if (err) console.error(err);
// });

osc.open(); // OSC bridge will listen on port 8080


// serialPort.on('error', function (err) {
//   serialPort.close();
// })

// serialPort.on('close', function () {
//   console.log('Serial port closed');
// })

// WS to bridge messages from the client to the serial port

const wss = new WebSocket.Server({ port: SERIAL_SOCKET_PORT });
const serialErrors = new Set();

wss.on('connection', ws => {
  console.log('Client connected to Serial Server');
  if (ws.readyState === WebSocket.OPEN) {
    ws.send("welcome to the serial server");
  } else {
    console.error('Client is not open');
  }
  ws.on('message', message => {
    try {
      writeToSerialPort(message);
    } catch (err) {
      if (!serialErrors.has(err.message)) {
        serialErrors.add(err.message);
        console.error('Error writing to serial port: ', err.message);
      }
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected from Serial Server');
  });
});


function writeToSerialPort(message) {
  serialPort.write(message, err => {
    if (err) console.error(err);
  });
}