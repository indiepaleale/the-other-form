import { Noise } from 'noisejs';
import { numBodies } from './ws.js';

const noise = new Noise(Math.random());

const action = {
    numBodies: 0,
    energy: 0, // 0-100
    energyLimit: 100,
    energyDecay: 0.1,
    energyGain: 0.2,
    energyNorm: 0,
    update(numBodies) {
        this.numBodies = numBodies;
        this.energy = Math.max(0, this.energy - this.energyDecay);
        this.energy = Math.min(this.energyLimit, this.energy + this.energyGain * numBodies);
        this.energyNorm = this.energy / this.energyLimit;

    }
};
const movement = {
    pause: false,
    zero: false,
    noiseMul: 0.4,

    controlSeg1: [0, 0],
    controlSeg2: [0, 0],

    rangeSeg1: 1,
    rangeSeg2: 5,

    time: Date.now(),

    update(deltaTime) {
        if (this.zero) {
            this.controlSeg1 = [0, 0];
            this.controlSeg2 = [0, 0];
            return;
        }

        action.update(numBodies);
        const noiseH = this.pNoise(100, 2);
        const noiseL = this.pNoise(200, 1);
        const noiseCombined = noiseH.map((val, i) => val * this.noiseMul + noiseL[i] * (1 - this.noiseMul));

        this.controlSeg1[0] = noiseCombined[0] * this.rangeSeg1 * action.energyNorm;
        this.controlSeg1[1] = noiseCombined[1] * this.rangeSeg1 * action.energyNorm;

        this.controlSeg2[0] = noiseCombined[2] * this.rangeSeg2 * action.energyNorm;
        this.controlSeg2[1] = noiseCombined[3] * this.rangeSeg2 * action.energyNorm;

        if (this.pause) {
            return;
        }
        if (typeof deltaTime === 'number' && !isNaN(deltaTime)) {
            this.time += 0.0002 * deltaTime;
        }
    },

    pNoise(offset, mult) {
        return [noise.simplex2(this.time * mult, 0),
        noise.simplex2(0, this.time * mult),
        noise.simplex2(this.time * mult, offset),
        noise.simplex2(offset, this.time * mult)];
    },

};

addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        movement.pause = !movement.pause;
    }
    if (event.key === 'z') {
        movement.zero = !movement.zero;
    }
});

export { movement,action };
