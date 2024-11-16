// Nodejs side code

const { create, all } = require("mathjs");

const readline = require("readline");

const PSO = require("particle-swarm-optimization");

const math = create(all);
//const ws = new WebSocket("ws://localhost:8001");

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: '> new target: ',
});


let globalTarget = [0, 200, 0];

const opts = {
    timeOutMS: 1 * 1000,
    nParts: 20,
    nRounds: 1000,

    maxPos: Math.PI,
    minPos: -Math.PI,

    nNeighs: 0.1,
    maxVel: 1,
    minVel: -1,
}
const pso = new PSO(scoreFunc, 4, opts);

rl.on('line', (input) => {
    const target = input.trim().split(' ').map(Number).slice(0, 3);
    console.log(`new target: ${target}`);
    globalTarget = target;
    const solutions = Array.from(pso.search())
        .map(p => ({ p, fit: scoreFunc(p) }))
        .sort((o1, o2) => (o1.score > o2.score ? 1 : -1))
    console.log(solutions[0].fit);
    console.log(angle2control(solutions[0].p));
    const message = {
        type: "state",
        pos: angle2control(solutions[0].p),
        target: target,
    }

    //ws.send(JSON.stringify(message));

    rl.prompt();
});

// Display the initial prompt
rl.prompt();

//ws.onopen = () => { ws.send("Hello from the client!"); };

const constrainMin = [-3.3333, -Math.PI, -3.3333, -Math.PI]
const constrainMax = [3.3333, Math.PI, 3.3333, Math.PI]


const solutions = Array.from(pso.search())
    .map(p => ({ p, fit: scoreFunc(p) }))
    .sort((o1, o2) => (o1.score > o2.score ? 1 : -1))
console.log(solutions[0].fit);
console.log(angle2control(solutions[0].p));


function angleOff(angles, target) {
    // console.log("optimizing for target: ", target);
    const [theta1, alpha1, theta2, alpha2] = angles;
    const T_10 = getTransformationMatrix(theta1, alpha1, 36);
    const T_21 = getTransformationMatrix(theta2, alpha2, 36);

    let h_end_pointing = [0, 1, 0, 0];
    let h_end_pos = [0, 0, 0, 1];

    h_end_pointing = math.multiply(math.multiply(T_10, T_21), h_end_pointing);
    h_end_pos = math.multiply(math.multiply(T_10, T_21), h_end_pos);

    const end_dir = h_end_pointing.slice(0, 3);
    const end_pos = h_end_pos.slice(0, 3);

    let dir_target = math.subtract(target, end_pos);
    dir_target = math.divide(dir_target, math.norm(dir_target));

    return Math.acos(math.dot(end_dir, dir_target));
}
function angle2control(angles) {
    const x1 = 1.5 * angles[0] * Math.sin(angles[1]);
    const z1 = 1.5 * angles[0] * Math.cos(angles[1]);
    const x2 = 1.5 * angles[2] * Math.sin(angles[3]);
    const z2 = 1.5 * angles[2] * Math.cos(angles[3]);
    return [x1, z1, x2, z2];
}

function scoreFunc(angles) {
    const [t1, a1, t2, a2] = angles;
    const off = angleOff(angles, globalTarget);
    const score = -(off ** 2) - 0.001 * (t1 ** 2);
    return score;
}
function getTransformationMatrix(theta, alpha, length) {
    const cosTheta = Math.cos(theta);
    const sinTheta = Math.sin(theta);
    const cosAlpha = Math.cos(alpha);
    const sinAlpha = Math.sin(alpha);
    const oneMinusCosTheta = 1 - cosTheta;

    const T_rt = [
        [
            cosTheta + cosAlpha ** 2 * oneMinusCosTheta,
            sinAlpha * sinTheta,
            -cosAlpha * sinAlpha * oneMinusCosTheta,
            0,
        ],
        [-sinAlpha * sinTheta, cosTheta, -cosAlpha * sinTheta, 0],
        [
            -cosAlpha * sinAlpha * oneMinusCosTheta,
            cosAlpha * sinTheta,
            cosTheta + sinAlpha ** 2 * oneMinusCosTheta,
            0,
        ],
        [0, 0, 0, 1],
    ];

    if (theta === 0) {
        T_rt[1][3] = length;
    } else {
        const abstracRad = length / theta;

        T_rt[0][3] = abstracRad * oneMinusCosTheta * sinAlpha;
        T_rt[1][3] = abstracRad * sinTheta;
        T_rt[2][3] = abstracRad * oneMinusCosTheta * cosAlpha;
    }

    return T_rt;
}