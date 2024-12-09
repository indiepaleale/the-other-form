import HydraRenderer from "hydra-synth";
import { threeCanvas } from "./three";
import { depthImage } from "./ws";


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

/// robot layer
hydra.src(hydra.o0)
    //.layer(hydra.solid(0), .1)
    .add(hydra.src(hydra.s0).color(0.2, 0.4, 0.9), 0.1)
    .diff(hydra.src(hydra.s0).modulate(hydra.src(hydra.o0), 3))
    // .sub(hydra.noise(6,0.7).color(1,0.9,0.8), 0.005)
    .sub(hydra.solid(1, 1, 1), 0.005)
    .modulate(hydra.noise(10, 0.5).color(1, 2, 3), 0.002)
    .modulateRotate(hydra.o0, 0.01)
    .out(hydra.o0);

// background layer
hydra.solid(0, 0, 0)
    .add(hydra.src(hydra.o3).repeat(8, 5), 0.4)
    .diff(hydra.src(hydra.o3).repeat(8, 5).modulate(hydra.src(hydra.o1), 0.02))
    .blend(hydra.src(hydra.o1), 0.2)
    .out(hydra.o1);

// rotating viewport
hydra.solid(0, 0, 0)
    .layer(
        hydra.src(hydra.s1).mask(hydra.shape(4, 1))
            .rotate(() => Math.sin(hydra.time *0.5) * 0.25))
    .out(hydra.o3);

/// composite layer
hydra.src(hydra.o1)
    .mult(hydra.solid(0, 0, 0), 0.5)
    .diff(hydra.o0)
    .out(hydra.o2);

hydra.render(hydra.o2);

export { hydra };

window.addEventListener('resize', () => {
    const width = window.innerWidth;
    const height = window.innerWidth / aspectRatio;
    hydraRender.setResolution(width, height);
});