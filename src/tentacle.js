import * as THREE from 'three';


export default class Segment {
    constructor({ numSegments = 12, gap = 2.5, rootObject = null, geometry = new THREE.CylinderGeometry(3, 3, 1, 12) }) {
        this.numSegments = numSegments;
        this.gap = gap;
        this.radius = 1.5;
        this.length = numSegments * gap;
        this.rootObject = rootObject;
        this.controller = { x: 0, z: 0 };
        this.segments = [];
        this.geometry = geometry;
        this.mat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        this._init();
    }


    fk = (x, z) => {

        if (this._updateControl(x, z)) {
            this.segments.forEach((segment, index) => {
                segment.position.set(0, (index + 1) * this.gap, 0);
                segment.rotation.set(0, 0, 0);
            });
        }
        else {
            const alpha = Math.atan(x / z);
            const theta = z / (Math.cos(alpha) * this.radius) !== 0 ? z / (Math.cos(alpha) * this.radius) : x / (Math.sin(alpha) * this.radius);
            const abstractRad = this.length / theta;

            if (abstractRad === Infinity || isNaN(abstractRad)) {
                console.warn("Catasrophic failure");
                return;
            }

            const axis = new THREE.Vector3(Math.cos(alpha), 0, -Math.sin(alpha));
            axis.normalize();

            this.segments.forEach((segment, index) => {
                const thetaPart = theta * (index + 1) / this.numSegments;
                const translate = this._computeTranslate(alpha, thetaPart, abstractRad);
                const quaternion = this._computeQuaternion(axis, thetaPart);
                this._updateSegment(segment, translate, quaternion);
            });
        }

    }

    ik_angleOnly = () => {

    }

    _init = () => {
        const edges = new THREE.EdgesGeometry(this.geometry, 15);
        const lineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff });
        for (let i = 1; i <= this.numSegments; i++) {
            const segment = new THREE.Mesh(this.geometry, this.mat);
            segment.position.y = i * this.gap;
            this.segments.push(segment);
            this.rootObject.add(segment);
        }
    }

    _updateControl = (x, z) => {
        this.controller.x = x;
        this.controller.z = z;

        return (x === 0 && z === 0);

    }

    _updateSegment = (segment, vector, quaternion) => {
        segment.position.copy(vector);
        segment.quaternion.copy(quaternion);
    }

    _computeTranslate = (alpha, theta, abstractRad) => {
        const x = abstractRad * (1 - Math.cos(theta)) * Math.sin(alpha);
        const y = abstractRad * Math.sin(theta);
        const z = abstractRad * (1 - Math.cos(theta)) * Math.cos(alpha);
        return new THREE.Vector3(x, y, z);
    }

    _computeQuaternion = (axis, theta) => {
        const quaternion = new THREE.Quaternion();
        return quaternion.setFromAxisAngle(axis, theta);
    }

}
