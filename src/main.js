import * as THREE from 'three';
import { scene, perspectiveCamera, renderer, orthoCamera, updateCamera } from './scene-setup';
import { initTentacle } from './tentacle';
import { tentacleControls, pyBackend, send2Raspi } from './gui';
import * as socket from './ws';
//import './target'

import { pd } from './pd-osc';


const { lowerSegment, upperSegment } = await initTentacle();

const lineGeometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0), // Start point
    new THREE.Vector3(0, 0, 0)  // End point (initially)
]);

// Create a material for the line
const lineMaterial = new THREE.LineBasicMaterial({ color: 0xff0000 });

// Create the line
const line = new THREE.Line(lineGeometry, lineMaterial);

const sphereGeometry = new THREE.SphereGeometry(5, 32, 32); // Radius 5, 32 segments
const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 }); // Red color
const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);

lowerSegment.rootObject.add(sphere);

//lowerSegment.rootObject.add(sphere, line);


const smoothControl = {

    value: [0, 0, 0, 0],
    target: [0, 0, 0, 0],
    velocity: [0, 0, 0, 0],
    damping: 0.8,
    stiffness: 0.6,


    update(delta) {
        const deltaTime = delta / 1000;
        this.value = this.value.map((val, i) => {
            const force = - this.stiffness * (val - this.target[i]);
            const dampingForce = -this.damping * this.velocity[i];
            const acceleration = force + dampingForce;

            this.velocity[i] += acceleration * deltaTime;
            this.velocity[i] = Math.max(Math.min(this.velocity[i], 1), -1);
            let newValue = val + this.velocity[i] * deltaTime;
            newValue = Math.max(Math.min(newValue, 5), -5);
            //console.log(newValue);
            return newValue;
        });
    },

    setTarget(target) {
        this.target = target;
    }
}
const smoothCamera = {

    value: [0, 0, 0],
    target: [0, 0, 0],
    velocity: [0, 0, 0],
    damping: .5,
    stiffness: 2,


    update(delta) {
        const deltaTime = delta / 1000;
        this.value = this.value.map((val, i) => {
            const force = - this.stiffness * (val - this.target[i]);
            const dampingForce = -this.damping * this.velocity[i];
            const acceleration = force + dampingForce;

            this.velocity[i] += acceleration * deltaTime;
            this.velocity[i] = Math.max(Math.min(this.velocity[i], 1), -1);
            let newValue = val + this.velocity[i] * deltaTime;
            newValue = Math.max(Math.min(newValue, 5), -5);
            //console.log(newValue);
            return newValue;
        });
    },

    setTarget(target) {
        this.target = target;
    }
}
smoothControl.update(8);
smoothCamera.update(8);

function animate(deltaTime) {
    tentacleControls.update();
    //updateCamera(socket.head);
    //console.log(sphere.position);
    sphere.position.set(socket.head[0], socket.head[1], socket.head[2]);
    smoothControl.setTarget(socket.controlTarget);
    //console.log(socket.controlTarget)
    smoothControl.update(deltaTime);
    smoothCamera.setTarget(socket.head);
    smoothCamera.update(deltaTime);
    updateCamera(smoothCamera.value);
    send2Raspi();
    //console.log(smoothControl.target);
    tentacleControls.lowerX = smoothControl.value[0];
    tentacleControls.lowerZ = smoothControl.value[1];
    tentacleControls.upperX = smoothControl.value[2];
    tentacleControls.upperZ = smoothControl.value[3];
    if (pyBackend.listening) {
        //socket.tick();

        const state = socket.state_buffer.shift();
        try {
            if (state) {
                const rl_control = state.pos;
                tentacleControls.lowerX = rl_control[0];
                tentacleControls.lowerZ = rl_control[1];
                tentacleControls.upperX = rl_control[2];
                tentacleControls.upperZ = rl_control[3];

                // const target = state.target;
                // const end = state.end;
                // //sphere.position.set(end[0], end[1], end[2]);
                // sphere.position.set(target[0], target[1], target[2])
                // line.geometry.attributes.position.setXYZ(0, end[0], end[1], end[2]);
                // line.geometry.attributes.position.setXYZ(1, target[0], target[1], target[2]);
                // line.geometry.attributes.position.needsUpdate = true;
            }
        }
        catch (e) {
            console.error('Failed to parse state:', e);
        }
    }

    lowerSegment.fk(tentacleControls.lowerX, tentacleControls.lowerZ);
    upperSegment.fk(tentacleControls.upperX, tentacleControls.upperZ);

    const tipPos = upperSegment.segments[upperSegment.segments.length - 1].localToWorld(new THREE.Vector3(0, 1, 0));
    pd.update(tipPos);


    renderer.render(scene, perspectiveCamera);
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

function chaseWithSpeedLimit(a, b, speedLimit) {
    if (Array.isArray(a) && Array.isArray(b)) {
        return a.map((val, index) => {
            const delta = b[index] - val;
            const speed = delta / speedLimit;
            const limitedDelta = Math.max(Math.min(delta, speedLimit), -speedLimit);
            return val + speed;
        });
    } else {
        const delta = b - a;
        const limitedDelta = Math.max(Math.min(delta, speedLimit), -speedLimit);
        return a + limitedDelta;
    }
}
function easeInOut(a, b, t) {
    return a + (b - a) * (t * t * (3 - 2 * t));
}

function chaseWithEaseInOut(a, b, speedLimit, deltaTime) {
    const t = Math.min(deltaTime / speedLimit, 1);
    if (Array.isArray(a) && Array.isArray(b)) {
        return a.map((val, index) => easeInOut(val, b[index], t));
    } else {
        return easeInOut(a, b, t);
    }
}

addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        send2Raspi();
    }
});