import HydraRenderer from "hydra-synth";
import { threeCanvas } from "./three";
import { depthImage } from "./ws";
import { action } from "./movement";


const hydraCanvas = document.createElement("canvas");

const aspectRatio = 16 / 10;
document.body.appendChild(hydraCanvas);
hydraCanvas.width = window.innerWidth;
hydraCanvas.height = window.innerWidth / aspectRatio;

const opts = {
    canvas: hydraCanvas, // canvas element to render to. If none is supplied, a canvas will be created and appended to the screen
    autoLoop: true, // whether or not to automatically call requestAnimationFrame
    detectAudio: false, // whether or not to automatically
    makeGlobal: false, // if false, will not pollute global namespace (note: there are currently bugs with this)
};
const hydraRender = new HydraRenderer(opts);
const hydra = hydraRender.synth;

hydra.s0.init({ src: threeCanvas });
hydra.s1.init({ src: depthImage });
hydra.s1.initCam()

// robot trace layer
hydra.solid(0, 0, 0)
    .layer(hydra.src(hydra.s0)
        .modulateScale(hydra.noise(3, 0.1), 0.1)
        .mask(hydra.shape(144, 0.8, 0.01).scale(.8, 10 / 16, 1)))
    .out(hydra.o0);

// kinect layer
hydra.solid(0, 0, 0)
    .add(hydra.src(hydra.s1).repeat(8, 5), 0.4)
    .diff(hydra.src(hydra.s1).repeat(8, 5).modulate(hydra.src(hydra.o1), 0.02))
    .blend(hydra.src(hydra.o1), 0.2)
    .modulateScale(hydra.shape(144, 0.8, 0.8).scale(0.8, 10 / 16, 1), 0.5)
    .mult(hydra.solid(0.1, 0.1, 0.1), 0.5)
    .out(hydra.o1);

/// composite layer
hydra.solid(0, 0, 0)
    .layer(hydra.shape(144, 0.8, 0.01).scale(1, 10 / 16, 1)
        .modulateScale(hydra.noise(1, 0.2), () => action.energyNorm * 0.1))
    .add(hydra.src(hydra.o1), 0.2) // remove this for black background
    .diff(hydra.src(hydra.o0).mask(hydra.shape(144, 0.8, 0.01).scale(1, 10 / 16, 1)))
    .out(hydra.o2);

hydra.render(hydra.o2);

export { hydra };

window.addEventListener('resize', () => {
    const width = window.innerWidth;
    const height = window.innerWidth / aspectRatio;
    hydraRender.setResolution(width, height);
});