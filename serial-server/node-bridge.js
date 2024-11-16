import OSC from 'osc-js'
import { SerialPort } from 'serialport'
import WebSocket from 'ws'

const config = { udpClient: { port: 8080 } }
const osc = new OSC({ plugin: new OSC.BridgePlugin(config) })

const serialPort = new SerialPort({ path: "COM3", baudRate: 9600 }, err => {
  if (err) console.error(err)
})

osc.open() // start a WebSocket server on port 8080

osc.on('/test/random', message => {
  // console.log(message.args)
})

serialPort.on('error', function (err) {
  serialPort.close()
})

serialPort.on('close', function () {
  console.log('Serial port closed')
})

function writeToSerialPort(message) {
  serialPort.write(message, err => {
    if (err) console.error(err)
  })

}

//
const wss = new WebSocket.Server({ port: 8000 })

wss.on('connection', ws => {
  console.log('WebSocket client connected')

  ws.on('message', message => {
    try {
      writeToSerialPort(message)
    } catch (err) {
      console.error('Error parsing JSON message:', err.message)
    }
  })

  ws.on('close', () => {
    console.log('WebSocket client disconnected')
  })
})

console.log('WebSocket server is listening on port 8000')