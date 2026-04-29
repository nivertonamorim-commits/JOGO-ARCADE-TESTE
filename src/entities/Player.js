import * as THREE from 'https://unpkg.com/three@0.164.1/build/three.module.js';
export class Player{constructor(scene,pilot='male'){this.health=pilot==='male'?110:100;this.lives=3;this.weapon=1;this.combo=0;this.comboTimer=0;this.mesh=new THREE.Group();const body=new THREE.Mesh(new THREE.ConeGeometry(0.7,2.4,6),new THREE.MeshStandardMaterial({color:0x66BB6A}));body.rotation.x=Math.PI/2;this.mesh.add(body);scene.add(this.mesh);this.target=new THREE.Vector3();this.fireCd=0;}
update(dt,bounds){this.mesh.position.lerp(this.target,Math.min(1,dt*12));this.mesh.position.x=Math.max(-bounds.x,Math.min(bounds.x,this.mesh.position.x));this.mesh.position.z=Math.max(-bounds.z,Math.min(bounds.z,this.mesh.position.z));if(this.comboTimer>0)this.comboTimer-=dt;else this.combo=0;}
}
