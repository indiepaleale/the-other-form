import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const perspHandler = {
    spaceDims: [150, 250, 150], // width, height, depth
    eye2screen: [0, 125, 150],  // from bottom center of wall
    tvDims: [144, 81],          // heigh, width (assuming vertical orientation) 144*81 for 65"
    tvPos: [0, 125, 0],         // center of tv from bottom center of wall

    updateFov(distEye2Screen) {
        const fov = 2 * Math.atan(this.tvDims[0] / (2 * distEye2Screen)) * (180 / Math.PI);
        return fov;
    }
}

export const scene = new THREE.Scene();

// Perspective camera setup
export const perspectiveCamera = new THREE.PerspectiveCamera(perspHandler.updateFov(150), window.innerWidth / window.innerHeight, 0.1, 1000);
perspectiveCamera.position.set(
    perspHandler.eye2screen[0],
    perspHandler.eye2screen[1],
    perspHandler.eye2screen[2] + perspHandler.spaceDims[2] / 2
);

// Orthographic camera setup
const orthoViewFrustumHeight = 200;
export const orthoCamera = new THREE.OrthographicCamera(
    orthoViewFrustumHeight * window.innerWidth / window.innerHeight / 2, orthoViewFrustumHeight * window.innerWidth / window.innerHeight / -2,
    orthoViewFrustumHeight / 2, orthoViewFrustumHeight / -2,
    0.1, 1000
);
orthoCamera.position.set(perspHandler.eye2screen[0],
    perspHandler.eye2screen[1],
    perspHandler.eye2screen[2] + perspHandler.spaceDims[2] / 2)


// Renderer setup
export const renderer = new THREE.WebGLRenderer();
const pixelRatio = window.devicePixelRatio;
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(pixelRatio);
document.body.appendChild(renderer.domElement);

// Add OrbitControls
export const orbitControls = new OrbitControls(perspectiveCamera, renderer.domElement);
orbitControls.enableDamping = true; // Enable damping (inertia)
orbitControls.dampingFactor = 0.25; // Damping factor
orbitControls.enableZoom = true; // Enable zooming
orbitControls.enablePan = false; // Disable panning
orbitControls.enabled = false;
orbitControls.target.set(0, perspHandler.tvPos[1], 75);

// Set inital camera lookAt
orthoCamera.lookAt(perspHandler.tvPos[0],
    perspHandler.tvPos[1],
    perspHandler.tvPos[2] + perspHandler.spaceDims[2] / 2);
perspectiveCamera.lookAt(
    perspHandler.tvPos[0],
    perspHandler.tvPos[1],
    perspHandler.tvPos[2] + perspHandler.spaceDims[2] / 2);


//scene.fog = new THREE.Fog(0x000000, 300, 450);
scene.background = new THREE.Color(0x000000);
export function updateCamera(headPos) {
    perspectiveCamera.position.setX(headPos[0]);
    perspectiveCamera.lookAt(
        perspHandler.tvPos[0],
        perspHandler.tvPos[1],
        perspHandler.tvPos[2] + perspHandler.spaceDims[2] / 2);
}

// Add lights
const hemiLight = new THREE.HemisphereLight(0xffffff, 0x8d8d8d, 1);
hemiLight.position.set(0, 20, 0);
scene.add(hemiLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 2);
dirLight.position.set(3, 10, 10);
dirLight.castShadow = true;
dirLight.shadow.camera.top = 2;
dirLight.shadow.camera.bottom = - 2;
dirLight.shadow.camera.left = - 2;
dirLight.shadow.camera.right = 2;
dirLight.shadow.camera.near = 0.1;
dirLight.shadow.camera.far = 40;
scene.add(dirLight);


// Handle resizing
window.addEventListener('resize', () => {
    // Update sizes
    const width = window.innerWidth;
    const height = window.innerHeight;

    // Update camera
    perspectiveCamera.aspect = width / height;
    perspectiveCamera.updateProjectionMatrix();

    // Update orthographic camera
    orthoCamera.left = orthoViewFrustumHeight * width / height / 2;
    orthoCamera.right = orthoViewFrustumHeight * width / height / -2;

    orthoCamera.updateProjectionMatrix();

    // Update renderer
    renderer.setSize(width, height);
    renderer.setPixelRatio(pixelRatio);

});

// Handle fullscreen
window.addEventListener('dblclick', () => {
    if (document.fullscreenElement) {
        document.exitFullscreen();
    } else {
        document.body.requestFullscreen();
    }
});


// Box
const lineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff });
const geometry = new THREE.BoxGeometry(150, perspHandler.spaceDims[1], 150);
geometry.translate(0, perspHandler.spaceDims[1] / 2, 0);
const edges = new THREE.EdgesGeometry(geometry);
const edgesMesh = new THREE.LineSegments(edges, lineMaterial);
scene.add(edgesMesh);

// Floor grid lines
const size = 750;
const divisions = 75;
const step = size / divisions;
const halfSize = size / 2;

const vertices = [];

for (let i = 0; i <= divisions; i++) {
    const position = -halfSize + (i * step);
    // Vertical lines
    vertices.push(position, 0, -halfSize, position, 0, halfSize);
    // Horizontal lines
    vertices.push(-halfSize, 0, position, halfSize, 0, position);
}

const gridGeometry = new THREE.BufferGeometry();
gridGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
const grid = new THREE.LineSegments(gridGeometry, lineMaterial);

scene.add(grid);

// Add AxesHelper to the scene
// const axesHelper = new THREE.AxesHelper(10); // Size of the axes
// scene.add(axesHelper);

export const trace = {
    pointsBufferSize: 50,
    positions: new Float32Array(50 * 3),
    pointCount: 0,
    startIndex: 0,
    pointsBufferGeometry: new THREE.BufferGeometry(),
    pointsMaterial: new THREE.PointsMaterial({ color: 0x00aa00, size: 2, sizeAttenuation: true }),
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

// kinect point cloud
export const kinectDepth = {
    depthMapWidth: 160,
    depthMapHeight: 144,
    width: 150,
    height: 250,

    pointMaterial: new THREE.PointsMaterial({ color: 0x888888, size: 1, sizeAttenuation: false }),
    bufferGeometry: new THREE.BufferGeometry(),
    points: null,
    vertices: null,

    init() {
        this.vertices = new Float32Array(this.depthMapWidth * this.depthMapHeight * 3);
        for (let i = 0; i < this.depthMapWidth; i++) {
            for (let j = 0; j < this.depthMapHeight; j++) {
                const index = (j * this.depthMapWidth + i) * 3;
                this.vertices[index] = this.width / 2 - i * this.width / this.depthMapWidth;
                this.vertices[index + 1] = (this.depthMapHeight - j) * this.height / this.depthMapHeight;
                this.vertices[index + 2] = -75;
            }
        }
        this.bufferGeometry.setAttribute('position', new THREE.BufferAttribute(this.vertices, 3));
        this.points = new THREE.Points(this.bufferGeometry, this.pointMaterial);
        scene.add(this.points);
    },
    updateVert(depthBuffer) {
        this.vertices = new Float32Array(this.depthMapWidth * this.depthMapHeight * 3);
        for (let i = 0; i < this.depthMapWidth; i++) {
            for (let j = 0; j < this.depthMapHeight; j++) {
                const index = (j * this.depthMapWidth + i) * 3;
                this.vertices[index] = this.width / 2 - i * this.width / this.depthMapWidth;
                this.vertices[index + 1] = (this.depthMapHeight - j) * this.height / this.depthMapHeight;
                this.vertices[index + 2] = -75 + depthBuffer[j * this.depthMapWidth + i] / 10;
            }
        }

        this.bufferGeometry.setAttribute('position', new THREE.BufferAttribute(this.vertices, 3));
        this.points.geometry.attributes.position.needsUpdate = true;
    }

}
kinectDepth.init();