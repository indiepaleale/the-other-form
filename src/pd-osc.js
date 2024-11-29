import OSC from "osc-js";
import { trace } from "./scene-setup";

const osc = new OSC()

osc.open()// connect to some ws://host:8080


export const pd = {
    prevPos: null,
    currPos: null,
    diff: null,
    update(newPos) {
        if (this.prevPos == null) {
            this.prevPos = newPos;
        }
        this.currPos = newPos;
        const diffVec = this.currPos.clone().sub(this.prevPos);
        if (this.diff > 10) {

            this.diff = 0;
            sendOSCMessage("bang");
            trace.draw(this.currPos.x, this.currPos.y, this.currPos.z);
        }
        this.prevPos = this.currPos;
        this.diff += diffVec.length();

    }
}

function sendOSCMessage(message) {
    if(osc.status() !== 1) {
        return;
    }
    try {
        osc.send(new OSC.Message('/pd', message));
    } catch (error) { 
        console.log(error);
    }
}

