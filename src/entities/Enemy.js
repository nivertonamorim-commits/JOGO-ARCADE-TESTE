import * as THREE from 'https://unpkg.com/three@0.164.1/build/three.module.js';
export class Enemy{constructor(scene,type='drone'){this.type=type;this.hp={drone:2,fighter:4,armored:10,miniboss:90,boss:240}[type];this.score={drone:100,fighter:250,armored:500,miniboss:3000,boss:10000}[type];this.mesh=new THREE.Mesh(new THREE.OctahedronGeometry(type==='boss'?2.8:type==='miniboss'?1.8:0.8),new THREE.MeshStandardMaterial({color:0x222833,emissive:0x101626}));scene.add(this.mesh);this.cd=1;}
}
