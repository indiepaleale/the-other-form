import * as THREE from 'three';
import { scene, perspectiveCamera, renderer, orthoCamera } from './scene-setup';
import { initTentacle } from './tentacle';
import { tentacleControls, pyBackend } from './gui';
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

//lowerSegment.rootObject.add(sphere, line);



function animate(deltaTime) {
    tentacleControls.update();
    if (pyBackend.listening) {
        socket.tick();

        const state = socket.state_buffer.shift();
        try {
            if (state) {
                const rl_control = state.pos;
                tentacleControls.lowerX = rl_control[0];
                tentacleControls.lowerZ = rl_control[1];
                tentacleControls.upperX = rl_control[2];
                tentacleControls.upperZ = rl_control[3];

                const target = state.target;
                const end = state.end;
                //sphere.position.set(end[0], end[1], end[2]);
                sphere.position.set(target[0], target[1], target[2])
                line.geometry.attributes.position.setXYZ(0, end[0], end[1], end[2]);
                line.geometry.attributes.position.setXYZ(1, target[0], target[1], target[2]);
                line.geometry.attributes.position.needsUpdate = true;
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
    const deltaTime = time - prevTime;
    prevTime = time;
    //console.log(deltaTime);

    animate(deltaTime);
    requestAnimationFrame(tick);

};

tick();
