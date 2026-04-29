import * as THREE from 'https://unpkg.com/three@0.164.1/build/three.module.js';
import {GameStateManager} from './core/GameStateManager.js';import {InputManager} from './core/InputManager.js';import {Player} from './entities/Player.js';import {Enemy} from './entities/Enemy.js';import {STATE,STAGES} from './utils/Constants.js';

const root=document.getElementById('game-root'),gsm=new GameStateManager(),input=new InputManager(document.body);
const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setSize(innerWidth,innerHeight);root.appendChild(renderer.domElement);
const scene=new THREE.Scene();scene.background=new THREE.Color(0x050b06);const cam=new THREE.PerspectiveCamera(60,innerWidth/innerHeight,.1,200);cam.position.set(0,20,16);cam.lookAt(0,0,0);
scene.add(new THREE.AmbientLight(0xffffff,.7));const dl=new THREE.DirectionalLight(0xffffff,.8);dl.position.set(5,10,8);scene.add(dl);
const roadMat=new THREE.MeshStandardMaterial({color:0x2a2f38});const chunks=[];for(let i=0;i<3;i++){const g=new THREE.Group();const road=new THREE.Mesh(new THREE.PlaneGeometry(22,40),roadMat);road.rotation.x=-Math.PI/2;g.add(road);for(let j=0;j<16;j++){const b=new THREE.Mesh(new THREE.BoxGeometry(2,Math.random()*2+1,2),new THREE.MeshStandardMaterial({color:0x555b66}));b.position.set((Math.random()-.5)*20,b.scale.y/2,(Math.random()-.5)*36);g.add(b);}g.position.z=i*40;scene.add(g);chunks.push(g);} 
let player,enemies=[],pBullets=[],eBullets=[],powerUps=[],score=0,stage='urban',wave=0,t=0,boss=null;
function spawnWave(){wave++;if(wave===1){for(let i=0;i<10;i++)spawn('drone',-8+i*1.6,24+i*2);}else if(wave===2){for(let i=0;i<9;i++)spawn('drone',(i-4)*1.5,24+Math.abs(i-4));}else if(wave===3){for(let i=0;i<8;i++)spawn('fighter',(Math.random()-.5)*12,26+i*2);}else if(wave===4){for(let i=0;i<6;i++)spawn('armored',(i-3)*2.2,24+i*2);}else if(wave===5){spawn('miniboss',0,26);}else if(wave===6){showWarning();setTimeout(()=>spawnBoss(),1200);} }
const spawn=(type,x,z)=>{const e=new Enemy(scene,type);e.mesh.position.set(x,1,z);enemies.push(e);};
function spawnBoss(){boss=new Enemy(scene,'boss');boss.mesh.position.set(0,2,30);enemies.push(boss);}function showWarning(){document.getElementById('warning').textContent='WARNING — ENEMY BOSS APPROACHING';setTimeout(()=>document.getElementById('warning').textContent='',1800)}
function startGame(){reset();gsm.set(STATE.PLAYING);hidePanels();player=new Player(scene,selectedPilot);document.getElementById('stageName').textContent=STAGES[stage].name;spawnWave();}
function reset(){[...enemies,...pBullets,...eBullets,...powerUps].forEach(o=>scene.remove(o.mesh));enemies=[];pBullets=[];eBullets=[];powerUps=[];score=0;wave=0;t=0;boss=null;if(player)scene.remove(player.mesh);}let selectedPilot='male';
function shoot(){const make=(xoff,vx=0)=>{const m=new THREE.Mesh(new THREE.SphereGeometry(.14),new THREE.MeshBasicMaterial({color:0x66ff88}));m.position.copy(player.mesh.position).add(new THREE.Vector3(xoff,.2,-.6));scene.add(m);pBullets.push({mesh:m,v:new THREE.Vector3(vx,0,-1.2),dmg:1});};make(0);if(player.weapon>1){make(.35);make(-.35);}if(player.weapon>2){make(.5,.15);make(-.5,-.15);} }
function enemyShoot(e){const m=new THREE.Mesh(new THREE.SphereGeometry(.16),new THREE.MeshBasicMaterial({color:0xff6d3a}));m.position.copy(e.mesh.position);scene.add(m);const dir=player.mesh.position.clone().sub(e.mesh.position).normalize().multiplyScalar(.45);eBullets.push({mesh:m,v:dir,dmg:8});}
function explode(pos){for(let i=0;i<8;i++){const m=new THREE.Mesh(new THREE.SphereGeometry(.08),new THREE.MeshBasicMaterial({color:0xffb300}));m.position.copy(pos);scene.add(m);powerUps.push({mesh:m,life:.5,v:new THREE.Vector3((Math.random()-.5)*.4,Math.random()*.2,(Math.random()-.5)*.4),fx:true});}}
function update(dt){if(gsm.state!==STATE.PLAYING)return; t+=dt;
  const ndc=new THREE.Vector2((input.x/innerWidth)*2-1,-(input.y/innerHeight)*2+1);const ray=new THREE.Raycaster();ray.setFromCamera(ndc,cam);const p=new THREE.Plane(new THREE.Vector3(0,1,0),0);const hit=new THREE.Vector3();ray.ray.intersectPlane(p,hit);player.target.set(hit.x,1,Math.max(-10,Math.min(10,hit.z)));player.update(dt,{x:9,z:10});
  player.fireCd-=dt;if(player.fireCd<=0){shoot();player.fireCd=player.weapon===1?.2:player.weapon===2?.14:.1;}
  chunks.forEach(c=>{c.position.z+=STAGES[stage].speed*dt*.3;if(c.position.z>40)c.position.z-=120;});
  pBullets.forEach(b=>b.mesh.position.add(b.v));eBullets.forEach(b=>b.mesh.position.add(b.v));
  enemies.forEach(e=>{e.mesh.position.z-=dt*(e.type==='drone'?7:e.type==='fighter'?5:e.type==='armored'?3:2);e.mesh.position.x+=Math.sin(t*2+e.mesh.id)*dt*(e.type==='drone'?2:1);e.cd-=dt;if(e.cd<=0){enemyShoot(e);e.cd=e.type.includes('boss')?.45:1.2;}});
  pBullets.forEach(b=>enemies.forEach(e=>{if(b.mesh.position.distanceTo(e.mesh.position)<(e.type.includes('boss')?1.3:.7)){e.hp-=b.dmg;b.mesh.position.y=99;if(e.hp<=0){score+=e.score*(1+player.combo*0.1);player.combo++;player.comboTimer=2;explode(e.mesh.position);if(Math.random()<0.15&&!e.type.includes('boss'))dropPower(e.mesh.position);scene.remove(e.mesh);e.dead=true;if(e.type==='boss'){stageClear();}}}}));
  eBullets.forEach(b=>{if(b.mesh.position.distanceTo(player.mesh.position)<.45){b.mesh.position.y=99;damagePlayer(10);}});
  enemies=enemies.filter(e=>!e.dead&&e.mesh.position.z>-16);pBullets=pBullets.filter(b=>b.mesh.position.z>-20&&b.mesh.position.y<50);eBullets=eBullets.filter(b=>b.mesh.position.z<20&&b.mesh.position.y<50);
  powerUps.forEach(p=>{if(p.fx){p.life-=dt;p.mesh.position.add(p.v);if(p.life<=0){scene.remove(p.mesh);p.dead=true;}}else{p.mesh.rotation.y+=dt*3;p.mesh.position.z-=dt*2;if(p.mesh.position.distanceTo(player.mesh.position)<.6){if(p.kind==='weapon')player.weapon=Math.min(3,player.weapon+1);if(p.kind==='health')player.health=Math.min(100,player.health+25);score+=200;scene.remove(p.mesh);p.dead=true;}}});powerUps=powerUps.filter(p=>!p.dead);
  if(enemies.length===0&&wave<6&&!boss)spawnWave();
  drawHUD();
}
function dropPower(pos){const m=new THREE.Mesh(new THREE.TorusGeometry(.25,.08,8,12),new THREE.MeshBasicMaterial({color:0xFFD43B}));m.position.copy(pos);scene.add(m);powerUps.push({mesh:m,kind:Math.random()<.6?'weapon':'health'});}
function damagePlayer(v){player.health-=v;if(player.health<=0){player.lives--;player.health=100;if(player.lives<=0)return gameOver();}}
function stageClear(){gsm.set('stageclear');document.getElementById('centerMsg').textContent='STAGE CLEAR';setTimeout(()=>{document.getElementById('centerMsg').textContent='';gsm.set(STATE.MENU);show('menu');},2000)}
function gameOver(){gsm.set(STATE.GAMEOVER);document.getElementById('finalScore').textContent='Score: '+Math.floor(score);show('gameover');}
function drawHUD(){scoreEl.textContent='SCORE '+Math.floor(score);comboEl.textContent='COMBO x'+(1+player.combo*0.1).toFixed(1);healthEl.textContent='HP '+Math.floor(player.health);livesEl.textContent='LIVES '+player.lives;weaponEl.textContent='WPN '+player.weapon;}
const scoreEl=document.getElementById('score'),comboEl=document.getElementById('combo'),healthEl=document.getElementById('health'),livesEl=document.getElementById('lives'),weaponEl=document.getElementById('weapon');
function animate(ts){requestAnimationFrame(animate);const dt=Math.min(.033,(ts-(animate.last||ts))/1000);animate.last=ts;update(dt);renderer.render(scene,cam);}animate();
onresize=()=>{renderer.setSize(innerWidth,innerHeight);cam.aspect=innerWidth/innerHeight;cam.updateProjectionMatrix();};
const show=id=>{document.querySelectorAll('.panel').forEach(p=>p.classList.remove('active'));document.getElementById(id).classList.add('active');}; const hidePanels=()=>document.querySelectorAll('.panel').forEach(p=>p.classList.remove('active'));
document.getElementById('startBtn').onclick=()=>startGame();document.getElementById('pilotBtn').onclick=()=>show('pilot');document.getElementById('stageBtn').onclick=()=>show('stage');document.querySelectorAll('.back').forEach(b=>b.onclick=()=>show('menu'));
document.querySelectorAll('[data-pilot]').forEach(b=>b.onclick=()=>{selectedPilot=b.dataset.pilot;show('menu');});document.querySelectorAll('[data-stage]').forEach(b=>b.onclick=()=>{stage=b.dataset.stage;show('menu');});
document.getElementById('retryBtn').onclick=()=>startGame();document.getElementById('menuBtn').onclick=()=>{gsm.set(STATE.MENU);show('menu');};
