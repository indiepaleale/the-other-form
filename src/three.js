import * as THREE from 'three';
import Segment from './tentacle.js';

const aspectRatio = 16 / 10;
const threeCanvas = document.createElement('canvas');
// threeCanvas.style.display = 'none';

// Renderer
const renderer = new THREE.WebGLRenderer({ canvas: threeCanvas, preserveDrawingBuffer: true });

renderer.setSize(window.innerWidth, window.innerWidth / aspectRatio);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);
scene.fog = new THREE.Fog(0x000000, 300, 450);

// Camera
const camera = new THREE.PerspectiveCamera(30, aspectRatio, 0.1, 1000);
camera.position.set(0, 220, 275);
camera.lookAt(0, 140, 0);

addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp') {
        camera.position.y += 2;
    } else if (e.key === 'ArrowDown') {
        camera.position.y -= 2;
    }
    else if (e.key === 'ArrowLeft') {
        camera.position.z -= 2;
    }
    else if (e.key === 'ArrowRight') {
        camera.position.z += 2;
    }
    else if (e.key === 'e') {
        console.log(camera.position);
    }
});


// Handle resizing
window.addEventListener('resize', () => {
    const width = window.innerWidth;
    const height = window.innerWidth / aspectRatio;
    renderer.setSize(width, height);
});

// Handle fullscreen
window.addEventListener('dblclick', () => {
    if (document.fullscreenElement) {
        document.exitFullscreen();
    } else {
        document.body.requestFullscreen();
    }
});

// Tentacle setup
const tentacleRoot = new THREE.Object3D();

tentacleRoot.position.set(0, 220, 120);
tentacleRoot.rotateX(Math.PI);
// scene.add(tentacleRoot);

const lowerSegment = new Segment({ numSegments: 10, rootObject: tentacleRoot });
const upperSegment = new Segment({ numSegments: 14, rootObject: lowerSegment.segments[lowerSegment.segments.length - 1] });

const trace = {
    pointsBufferSize: 50,
    positions: new Float32Array(50 * 3),
    pointCount: 0,
    startIndex: 0,
    pointsBufferGeometry: new THREE.BufferGeometry(),
    pointsMaterial: new THREE.PointsMaterial({ color: 0xffffff, size: 4, sizeAttenuation: false }),
    points: null,

    init() {
        this.pointsBufferGeometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
        this.points = new THREE.Points(this.pointsBufferGeometry, this.pointsMaterial);
        this.points.frustumCulled = false;
        scene.add(this.points);
    },

    draw(x, y, z) {
        const index = (this.startIndex + this.pointCount) % this.pointsBufferSize * 3;

        this.positions[index] = x;
        this.positions[index + 1] = y;
        this.positions[index + 2] = z;

        if (this.pointCount < this.pointsBufferSize) {
            this.pointCount++;
        } else {
            this.startIndex = (this.startIndex + 1) % this.pointsBufferSize;
        }

        this.pointsBufferGeometry.attributes.position.needsUpdate = true;
    }
}
trace.init();

renderer.render(scene, camera);

export { renderer, scene, camera, lowerSegment, trace, upperSegment, threeCanvas };