import { GUI } from 'three/addons/libs/lil-gui.module.min.js'
import { Noise } from 'noisejs';

const gui = new GUI();

const noise = new Noise(Math.random());

const tentacleControls = {
    animated: false,
    lowerX: 0,
    lowerZ: 0,
    upperX: 0,
    upperZ: 0,
    update() {
        if (this.animated) {
            const time = Date.now() * 0.0001;
            const lowerRange = 1;
            const upperRange = 5;
            this.lowerX = noise.simplex2(time, 0) * lowerRange;
            this.lowerZ = noise.simplex2(0, time) * lowerRange;
            this.upperX = noise.simplex2(time, 100) * upperRange;
            this.upperZ = noise.simplex2(100, time) * upperRange;
        }
    },
}

const pyBackend = {
    isTrainerReady: false,
    isEvaluatorReady: false,
    message: 'Model not ready ...',
    listening: false,  
    refresh: function () { },
    startTraining: function () {
        // Overwritten in ws.js
    },
    stopTraining: function () {
        // Overwritten in ws.js
    },

    setStatus(status) {
        switch (status) {
            case 'trainer_ready':
                this.isTrainerReady = true;
                this.message = 'Model Ready';
                break;
            case 'evaluator_ready':
                this.isEvaluatorReady = true;
                this.message = 'Model Ready';
                break;
            case 'waiting':
                this.message = 'Model not ready ...';
                break;
            default:
                break;
        }
    },
};
gui.add(tentacleControls, 'animated').name('Animated');
gui.add(tentacleControls, 'lowerX', -8, 8).name('S1 - Lower X').listen();
gui.add(tentacleControls, 'lowerZ', -8, 8).name('S2 - Lower Z').listen();
gui.add(tentacleControls, 'upperX', -8, 8).name('S3 - Upper X').listen();
gui.add(tentacleControls, 'upperZ', -8, 8).name('S4 - Upper Z').listen();
gui.add(gui, 'reset').name('Reset');

const pyControls = gui.addFolder('Python Backend');
pyControls.add(pyBackend, 'message').name('Python Backend').listen();
pyControls.add(pyBackend, 'refresh').name('Refresh')

pyControls.add(pyBackend, 'isTrainerReady').name('Trainer Ready').listen();
pyControls.add(pyBackend, 'isEvaluatorReady').name('Evaluator Ready').listen();
pyControls.add(pyBackend, 'listening').name('Listening').listen();

gui.close();
// gui.hide();


export { tentacleControls, pyBackend };