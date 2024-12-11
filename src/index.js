import * as THREE from "three";
import {movement} from "./movement";
import { lowerSegment, upperSegment, scene, renderer, camera } from "./three";
import "./hydra";
import { send2Raspi, send2PD } from "./ws.js";

// Animate
function animate(deltaTime) {
    movement.update(deltaTime);
    lowerSegment.fk(...movement.controlSeg1);
    upperSegment.fk(...movement.controlSeg2);

    const tipPos = upperSegment.segments[upperSegment.segments.length - 1].localToWorld(new THREE.Vector3(0, 1, 0));
    send2PD.update(tipPos);
    send2Raspi([movement.controlSeg1[0], movement.controlSeg1[1], movement.controlSeg2[0], movement.controlSeg2[1]]);

    renderer.render(scene, camera);
}

let prevTime = 0;
const tick = (time) => {
    let deltaTime = time - prevTime;
    prevTime = time;
    deltaTime = deltaTime ? deltaTime : 0;
    animate(deltaTime);
    requestAnimationFrame(tick);
};

tick();

