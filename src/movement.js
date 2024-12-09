import { Noise } from 'noisejs';

const noise = new Noise(Math.random());

const movement = {
    pause: false,
    movMul: 0,
    noiseMul: 0.5,

    controlSeg1: [0, 0],
    controlSeg2: [0, 0],

    rangeSeg1: 1.5,
    rangeSeg2: 5,

    time: Date.now(),

    update(delta) {
        this.controlSeg1[0] = noise.simplex2(this.time, 0) * this.rangeSeg1;
        this.controlSeg1[1] = noise.simplex2(0, this.time) * this.rangeSeg1;

        this.controlSeg2[0] = noise.simplex2(this.time, 100) * this.rangeSeg2;
        this.controlSeg2[1] = noise.simplex2(100, this.time) * this.rangeSeg2;
        if (this.pause) {
            return;
        }
        if (typeof delta === 'number' && !isNaN(delta)) {
            this.time += 0.0002 * delta;
        }
    },

    pNoise(offset) {
        return [noise.simplex2(this.time, offset), noise.simplex2(offset, this.time)];
    },

    searchTarget(target){

    }
};

addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        movement.pause = !movement.pause;
    }
});

export default movement;

const smoothControl = {

    value: [0, 0, 0, 0],
    target: [0, 0, 0, 0],
    velocity: [0, 0, 0, 0],
    damping: 0.8,
    stiffness: 5,


    update(delta) {
        const deltaTime = delta / 1000;
        this.value = this.value.map((val, i) => {
            const force = - this.stiffness * (val - this.target[i]);
            const dampingForce = -this.damping * this.velocity[i];
            const acceleration = force + dampingForce;

            this.velocity[i] += acceleration * deltaTime;
            this.velocity[i] = Math.max(Math.min(this.velocity[i], 2), -2);
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