import * as THREE from 'three';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { scene, perspectiveCamera, renderer, orbitControls } from './scene-setup.js';

const target = new THREE.Object3D();
const transformControl = new TransformControls(perspectiveCamera, renderer.domElement);
transformControl.attach(target);
const gizmo = transformControl.getHelper();
//gizmo.scale.set(0.5, 0.5, 0.5);

transformControl.addEventListener( 'dragging-changed', function ( event ) {

    orbitControls.enabled = ! event.value;

} );

scene.add(target);
scene.add(gizmo);