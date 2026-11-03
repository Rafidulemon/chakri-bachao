// Office scene, people, mini-games and login screen, ported from the single-file prototype.
// Uses three r128 (the version the prototype was built and tested on).
import * as THREE_NS from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { BufferGeometryUtils } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { sfx } from './sound.js';
import { CONVOS } from './chatter.js';
import { createChess, createLudo, createUno, mulberry32 } from './boardgames.js';

const THREE = { ...THREE_NS, OrbitControls, BufferGeometryUtils, RoomEnvironment };

export function startOffice() {

const stage=document.getElementById('stage'), loading=document.getElementById('loading');
let renderer;
try{ renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'}); }
catch(e){ loading.textContent='দুঃখিত, এই ব্রাউজারে 3D (WebGL) চালু নেই। Chrome বা Firefox দিয়ে আবার চেষ্টা করুন।'; return; }
const coarse=!!(window.matchMedia&&matchMedia('(pointer: coarse)').matches);
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,coarse?1.5:2));
renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.outputEncoding=THREE.sRGBEncoding; renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=.62;
const lin=c=>new THREE.Color(c).convertSRGBToLinear();
stage.appendChild(renderer.domElement);

const H=2.9, T=0.12, GY=-12.3, LOW=0.3, STAND=0.965;
const scene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(45,1,0.05,500);
camera.position.set(10,30,28);
const controls=new THREE.OrbitControls(camera,renderer.domElement);
controls.target.set(1,0,-2); controls.enableDamping=true; controls.dampingFactor=.08;
controls.maxPolarAngle=Math.PI*.495; controls.minDistance=1.5; controls.maxDistance=110;

const hemi=new THREE.HemisphereLight(lin('#fdfaf2'),lin('#7a7264'),.25); scene.add(hemi);
const sun=new THREE.DirectionalLight(lin('#fff1d8'),1.25); sun.position.set(16,34,20); sun.castShadow=true;
const sm=coarse?1024:2048; sun.shadow.mapSize.set(sm,sm);
Object.assign(sun.shadow.camera,{left:-26,right:26,top:26,bottom:-26,near:1,far:90}); sun.shadow.bias=-.0005; sun.shadow.normalBias=.02;
scene.add(sun);
const fill=new THREE.DirectionalLight(lin('#dfe8ff'),.25); fill.position.set(-20,18,-12); scene.add(fill);
try{const pm=new THREE.PMREMGenerator(renderer);scene.environment=pm.fromScene(new THREE.RoomEnvironment(),.04).texture;}catch(e){hemi.intensity=.8;}
scene.fog=new THREE.Fog('#cfd9de',60,160);
function applyTheme(){
  const sky=getComputedStyle(document.documentElement).getPropertyValue('--sky').trim()||'#cfd9de';
  scene.background=new THREE.Color(sky); scene.fog.color=lin(sky);
}
applyTheme();
if(window.matchMedia){const mq=matchMedia('(prefers-color-scheme: dark)');mq.addEventListener?mq.addEventListener('change',applyTheme):mq.addListener(applyTheme);}

/* ================= helpers ================= */
const mats={};
function mat(c,r,m,extra){const k=c+'|'+(r==null?.8:r)+'|'+(m||0)+'|'+(extra?Object.keys(extra).join(',')+(extra.map?extra.map.uuid:''):'');if(mats[k])return mats[k];
  return mats[k]=new THREE.MeshStandardMaterial(Object.assign({color:lin(c),roughness:r==null?.8:r,metalness:m||0},extra||{}));}
function matD(c,r,ex){return mat(c,r,0,Object.assign({side:THREE.DoubleSide},ex||{}));}
const UB=new THREE.BoxGeometry(1,1,1), US=new THREE.SphereGeometry(1,20,14), UC=new THREE.CylinderGeometry(1,1,1,20), UP=new THREE.PlaneGeometry(1,1);
const staticG=new THREE.Group(), wallsG=new THREE.Group(), tallG=new THREE.Group();
scene.add(staticG,wallsG,tallG);
const colliders=[]; function addCol(a,b,c,d,top){colliders.push([a,b,c,d,top===undefined?99:top]);}
function M(m){return typeof m==='string'?mat(m):m;}
function bx(p,w,h,d,x,y,z,m,o){o=o||{};const e=new THREE.Mesh(UB,M(m));e.scale.set(w,h,d);e.position.set(x,y+h/2,z);
  if(o.rx)e.rotation.x=o.rx;if(o.ry)e.rotation.y=o.ry;if(o.rz)e.rotation.z=o.rz;e.castShadow=o.cast!==false;e.receiveShadow=true;
  (p||staticG).add(e);if(o.col)addCol(x-w/2,x+w/2,z-d/2,z+d/2,y+h);return e;}
function cy(p,r,h,x,y,z,m,o){o=o||{};const e=new THREE.Mesh(UC,M(m));e.scale.set(r,h,r);e.position.set(x,y+h/2,z);
  if(o.rx)e.rotation.x=o.rx;if(o.rz)e.rotation.z=o.rz;e.castShadow=o.cast!==false;e.receiveShadow=true;(p||staticG).add(e);if(o.col)addCol(x-r,x+r,z-r,z+r,y+h);return e;}
function sp(p,rx,ry,rz,x,y,z,m,o){o=o||{};const e=new THREE.Mesh(US,M(m));e.scale.set(rx,ry,rz);e.position.set(x,y,z);e.castShadow=o.cast!==false;e.receiveShadow=true;(p||staticG).add(e);return e;}
function grp(p,x,y,z,ry){const g=new THREE.Group();g.position.set(x,y,z);if(ry)g.rotation.y=ry;(p||staticG).add(g);return g;}
function plane(p,w,h,x,y,z,m,ry,rx){const e=new THREE.Mesh(UP,M(m));e.scale.set(w,h,1);e.position.set(x,y,z);e.rotation.order='YXZ';e.rotation.y=ry||0;e.rotation.x=rx||0;e.castShadow=false;e.receiveShadow=true;(p||staticG).add(e);return e;}
const gc={};
function cylG(rt,rb,h,s){const k='c'+rt+'|'+rb+'|'+h+'|'+(s||12);return gc[k]||(gc[k]=new THREE.CylinderGeometry(rt,rb,h,s||12));}
function sphPart(k,ps,pl,ts,tl){k='s'+k;return gc[k]||(gc[k]=new THREE.SphereGeometry(1,22,14,ps,pl,ts,tl));}
function lathe(k,pts,dz){k='l'+k;if(gc[k])return gc[k];const g=new THREE.LatheGeometry(pts.map(p=>new THREE.Vector2(p[0],p[1])),26);g.scale(1,1,dz);return gc[k]=g;}
function torusG(r,t){const k='t'+r+'|'+t;return gc[k]||(gc[k]=new THREE.TorusGeometry(r,t,8,24));}
function coneG(r,h){const k='k'+r+'|'+h;return gc[k]||(gc[k]=new THREE.ConeGeometry(r,h,10));}
const lerp=(a,b,u)=>a+(b-a)*u, clamp=(v,a,b)=>v<a?a:v>b?b:v, ease=u=>{u=clamp(u,0,1);return u*u*(3-2*u);};
function win(c,a,b,r){if(c<a-r||c>b+r)return 0;if(c<a)return ease((c-(a-r))/r);if(c>b)return ease(1-(c-b)/r);return 1;}
let seed=11; const R=()=>{seed=(seed*16807)%2147483647;return (seed-1)/2147483646;};
const pick=a=>a[Math.floor(R()*a.length)];
function ctex(w,h,fn,repeat){const c=document.createElement('canvas');c.width=w;c.height=h;fn(c.getContext('2d'),w,h);const t=new THREE.CanvasTexture(c);
  t.encoding=THREE.sRGBEncoding;t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());if(repeat){t.wrapS=t.wrapT=THREE.RepeatWrapping;}return t;}
function noise(g,w,h,n,a,b){for(let i=0;i<n;i++){const v=a+Math.random()*(b-a)|0;g.fillStyle='rgba('+v+','+v+','+v+',.18)';g.fillRect(Math.random()*w,Math.random()*h,2,2);}}

/* ================= textures ================= */
const TX={};
function makeTextures(){
  TX.tile=ctex(256,256,(g,w,h)=>{g.fillStyle='#efede8';g.fillRect(0,0,w,h);g.strokeStyle='rgba(150,145,135,.08)';for(let i=0;i<10;i++){g.lineWidth=1+Math.random()*3;g.beginPath();let x=Math.random()*w,y=0;g.moveTo(x,y);while(y<h){x+=(Math.random()-.5)*50;y+=25;g.lineTo(x,y);}g.stroke();}
    g.fillStyle='rgba(120,115,105,.45)';g.fillRect(0,0,w,1.5);g.fillRect(0,128,w,1.5);g.fillRect(0,0,1.5,h);g.fillRect(128,0,1.5,h);},true);
  TX.dwood=ctex(512,512,(g,w,h)=>{const cols=['#5b4c41','#65564b','#52453b','#6b5b4f','#5f5045'];for(let r=0;r<8;r++){let x=-(r*97%300);while(x<w){const len=200+((x*7+r*31)%160);
    g.fillStyle=cols[(r*3+Math.abs(x))%cols.length];g.fillRect(x,r*64,len,64);for(let k=0;k<12;k++){g.strokeStyle='rgba(25,18,12,.14)';g.beginPath();const yy=r*64+4+k*5;g.moveTo(x,yy);g.bezierCurveTo(x+len*.3,yy+3,x+len*.6,yy-3,x+len,yy+1);g.stroke();}
    g.fillStyle='rgba(20,14,10,.6)';g.fillRect(x,r*64,2,64);x+=len;}g.fillStyle='rgba(20,14,10,.5)';g.fillRect(0,r*64,w,2);}},true);
  const sq=[];for(let r=0;r<9;r++)for(let c=0;c<8;c++)if(Math.random()<.42)sq.push([c,r]);
  TX.feat=ctex(256,320,(g,w,h)=>{g.fillStyle='#5c5d5e';g.fillRect(0,0,w,h);noise(g,w,h,5000,40,140);sq.forEach(([c,r])=>{g.fillStyle='#f3efe4';g.fillRect(10+c*31,12+r*34,15,15);});},true);
  TX.featE=ctex(256,320,(g,w,h)=>{g.fillStyle='#000';g.fillRect(0,0,w,h);sq.forEach(([c,r])=>{g.fillStyle='#ffffff';g.fillRect(10+c*31,12+r*34,15,15);});},true);
  const F='"Hind Siliguri","Noto Sans Bengali",Arial,sans-serif';
  TX.logo=ctex(1024,340,(g,w,h)=>{g.fillStyle='#2a2d33';g.fillRect(0,0,w,h);noise(g,w,h,6000,30,80);g.fillStyle='#ffffff';g.font='700 118px '+F;g.textAlign='center';g.fillText('ECHOLOGY',w/2-40,190);
    g.fillStyle='#e2622b';g.fillText('X',w/2+300,190);g.fillStyle='#cfd3d8';g.font='500 30px '+F;g.fillText('A/B TESTING  ·  FULL-STACK  ·  QA',w/2,245);g.fillStyle='#e2622b';g.fillRect(w/2-180,262,360,6);});
  TX.logoS=ctex(512,192,(g,w,h)=>{g.fillStyle='#2a2d33';g.fillRect(0,0,w,h);g.fillStyle='#fff';g.font='700 70px '+F;g.textAlign='center';g.fillText('ECHOLOGYX',w/2,120);g.fillStyle='#e2622b';g.fillRect(w/2-120,140,240,6);});
  TX.values=ctex(512,320,(g,w,h)=>{g.fillStyle='#2a2d33';g.fillRect(0,0,w,h);noise(g,w,h,3000,30,80);g.textAlign='left';g.fillStyle='#ffffff';g.font='700 34px '+F;
    ['TASK','MOTIVATION','SOLUTION','TEAMWORK','HELP'].forEach((t,i)=>g.fillText(t,40,70+i*50));g.fillStyle='#e2622b';g.beginPath();g.arc(400,160,62,0,7);g.fill();g.fillStyle='#fff';g.font='700 52px '+F;g.textAlign='center';g.fillText('EL',400,178);});
  TX.el=ctex(128,128,(g,w,h)=>{g.clearRect(0,0,w,h);g.fillStyle='#e2622b';g.beginPath();g.arc(64,64,60,0,7);g.fill();g.fillStyle='#fff';g.font='700 50px '+F;g.textAlign='center';g.fillText('EL',64,82);});
  TX.mapMat=new THREE.MeshStandardMaterial({roughness:.8,map:ctex(256,128,(g,w,h)=>{g.fillStyle='#2b2c30';g.fillRect(0,0,w,h);const blobs=[[60,40,40,22],[75,85,16,26],[130,40,22,18],[135,78,16,22],[185,45,50,24],[215,95,16,10]];
    g.fillStyle='#e2622b';for(let y=4;y<h;y+=5)for(let x=4;x<w;x+=5)for(const [bx2,by,rx,ry] of blobs)if(((x-bx2)/rx)**2+((y-by)/ry)**2<1){g.fillRect(x,y,3,3);break;}})});

  TX.fabric=ctex(128,128,(g,w,h)=>{g.fillStyle='#f6f6f6';g.fillRect(0,0,w,h);for(let y=0;y<h;y+=2){g.fillStyle='rgba(0,0,0,'+(.03+Math.random()*.03)+')';g.fillRect(0,y,w,1);}
    for(let x=0;x<w;x+=2){g.fillStyle='rgba(0,0,0,'+(.02+Math.random()*.02)+')';g.fillRect(x,0,1,h);}noise(g,w,h,1500,200,255);},true);TX.fabric.repeat.set(5,5);
  TX.wb=ctex(256,160,(g,w,h)=>{g.fillStyle='#fbfbf8';g.fillRect(0,0,w,h);g.lineWidth=3;g.strokeStyle='#2f6db5';g.strokeRect(20,24,60,34);g.strokeRect(150,24,70,34);g.strokeRect(84,100,70,34);
    g.strokeStyle='#b3261e';g.beginPath();g.moveTo(80,41);g.lineTo(150,41);g.moveTo(185,58);g.lineTo(130,100);g.moveTo(50,58);g.lineTo(100,100);g.stroke();g.fillStyle='#1d6f42';g.fillRect(24,140,90,4);g.fillRect(24,150,60,4);});
  TX.carpet=ctex(256,256,(g,w,h)=>{g.fillStyle='#7f858d';g.fillRect(0,0,w,h);noise(g,w,h,9000,60,200);
    for(let i=0;i<2;i++)for(let j=0;j<2;j++){g.fillStyle=(i+j)%2?'rgba(0,0,0,.05)':'rgba(255,255,255,.04)';g.fillRect(i*128,j*128,128,128);}
    g.strokeStyle='rgba(30,34,40,.25)';g.lineWidth=2;g.strokeRect(1,1,126,126);g.strokeRect(129,129,126,126);g.strokeRect(129,1,126,126);g.strokeRect(1,129,126,126);},true);
  TX.wood=ctex(512,512,(g,w,h)=>{const cols=['#9b6b42','#a5744a','#8f6039','#ad7b50','#97683f'];for(let r=0;r<8;r++){let x=-(r*97%300);while(x<w){const len=180+((x*7+r*31)%140);
    g.fillStyle=cols[(r*3+Math.abs(x))%cols.length];g.fillRect(x,r*64,len,64);for(let k=0;k<14;k++){g.strokeStyle='rgba(60,35,15,.12)';g.beginPath();const yy=r*64+4+k*4.3;g.moveTo(x,yy);g.bezierCurveTo(x+len*.3,yy+3,x+len*.6,yy-3,x+len,yy+1);g.stroke();}
    g.fillStyle='rgba(40,22,10,.55)';g.fillRect(x,r*64,2,64);x+=len;}g.fillStyle='rgba(40,22,10,.5)';g.fillRect(0,r*64,w,2);}},true);
  TX.ceramic=ctex(256,256,(g,w,h)=>{g.fillStyle='#d9cbb0';g.fillRect(0,0,w,h);noise(g,w,h,3000,150,250);g.fillStyle='#b8a98d';for(let i=0;i<=2;i++){g.fillRect(i*128-2,0,4,h);g.fillRect(0,i*128-2,w,4);}},true);
  TX.white=ctex(256,256,(g,w,h)=>{g.fillStyle='#eef1f1';g.fillRect(0,0,w,h);noise(g,w,h,1500,200,255);g.fillStyle='#c9d0d2';for(let i=0;i<=4;i++){g.fillRect(i*64-1,0,2,h);g.fillRect(0,i*64-1,w,2);}},true);
  TX.terra=ctex(256,256,(g,w,h)=>{for(let i=0;i<4;i++)for(let j=0;j<4;j++){g.fillStyle=['#b4673f','#a95f3a','#bb6f46'][(i*3+j)%3];g.fillRect(i*64,j*64,64,64);}noise(g,w,h,3000,80,180);g.fillStyle='#7d4a31';for(let i=0;i<=4;i++){g.fillRect(i*64-1.5,0,3,h);g.fillRect(0,i*64-1.5,w,3);}},true);
  TX.marble=ctex(512,512,(g,w,h)=>{g.fillStyle='#e3e1dc';g.fillRect(0,0,w,h);noise(g,w,h,4000,170,240);g.strokeStyle='rgba(120,118,112,.18)';
    for(let i=0;i<14;i++){g.lineWidth=1+Math.random()*2;g.beginPath();let x=Math.random()*w,y=0;g.moveTo(x,y);while(y<h){x+=(Math.random()-.5)*40;y+=20+Math.random()*30;g.lineTo(x,y);}g.stroke();}
    g.fillStyle='rgba(150,148,140,.6)';g.fillRect(0,0,w,2);g.fillRect(0,0,2,h);g.fillRect(256,0,2,h);g.fillRect(0,256,w,2);},true);
  /* role-specific screens (512x320) */
  const SF='"Segoe UI",Arial,sans-serif',W=512,Hh=320;
  const txt=(g,t,x,y,sz,c,w)=>{g.fillStyle=c;g.font=(w||400)+' '+sz+'px '+SF;g.fillText(t,x,y);};
  const lines=(g,x,y,n,gap,cols,maxw)=>{for(let i=0;i<n;i++){let xx=x+((i*7)%3)*10;const k=1+((i*13)%3);for(let j=0;j<k;j++){const w=14+((i*31+j*17)%(maxw||70));g.fillStyle=cols[(i+j*2)%cols.length];g.fillRect(xx,y+i*gap,w,5);xx+=w+7;}}};
  const sheet=(g,title,head,rows,colW,sevCol)=>{g.fillStyle='#ffffff';g.fillRect(0,0,W,Hh);g.fillStyle='#1d6f42';g.fillRect(0,0,W,22);txt(g,title+' - Excel',10,16,12,'#fff',600);
    g.fillStyle='#f3f2f1';g.fillRect(0,22,W,34);for(let i=0;i<9;i++){g.fillStyle='#c8c6c4';g.fillRect(12+i*54,30,40,18);}g.fillStyle='#e1dfdd';g.fillRect(0,56,W,16);txt(g,'fx',8,68,11,'#605e5c',600);
    let y=72;g.fillStyle='#e6f2ea';g.fillRect(0,y,W,18);let x=26;head.forEach((h,i)=>{txt(g,h,x+4,y+13,11,'#1d6f42',700);x+=colW[i];});
    g.strokeStyle='#d4d4d4';g.lineWidth=1;for(let r=0;r<12;r++){const yy=y+18+r*19;g.beginPath();g.moveTo(0,yy+19);g.lineTo(W,yy+19);g.stroke();txt(g,String(r+2),6,yy+14,10,'#888');
      const row=rows[r%rows.length];let xx=26;row.forEach((c,i)=>{if(i===sevCol){const col={High:'#f4cccc',Critical:'#e06666',Medium:'#fce5cd',Low:'#fff2cc'}[c];if(col){g.fillStyle=col;g.fillRect(xx+1,yy+1,colW[i]-2,17);}}
        txt(g,String(c).replace('#',String(101+r)),xx+4,yy+14,10.5,'#222');xx+=colW[i];});}
    let xx=26;colW.forEach(w=>{g.beginPath();g.moveTo(xx,y);g.lineTo(xx,Hh);g.stroke();xx+=w;});g.fillStyle='#f3f2f1';g.fillRect(0,Hh-16,W,16);txt(g,'Sheet1',10,Hh-4,10,'#1d6f42',600);};
  const S={};
  S.claude=ctex(W,Hh,(g)=>{g.fillStyle='#f4f1ea';g.fillRect(0,0,W,Hh);g.fillStyle='#ebe6dc';g.fillRect(0,0,108,Hh);txt(g,'Claude',14,26,17,'#2b2a27',600);
    for(let i=0;i<8;i++){g.fillStyle=i===1?'#ddd6c8':'transparent';g.fillRect(8,46+i*26,92,20);txt(g,['New chat','Fix login bug','API pagination','Write unit tests','Refactor hooks','SQL query help','Regex for email','Deploy script'][i],14,60+i*26,10.5,'#4a463f');}
    g.fillStyle='#e8e0d0';g.beginPath();g.roundRect?g.roundRect(300,22,190,34,10):g.rect(300,22,190,34);g.fill();txt(g,'Why does this test fail on CI?',310,44,10.5,'#2b2a27');
    txt(g,'The test depends on the local timezone. On CI the',128,82,10.5,'#2b2a27');txt(g,'clock is UTC, so the date shifts by a day. Mock it:',128,98,10.5,'#2b2a27');
    g.fillStyle='#2b2b2b';g.fillRect(128,108,360,92);lines(g,140,120,6,13,['#c792ea','#82aaff','#c3e88d','#f78c6c','#e6e6e6'],60);
    txt(g,'Then run the suite again and it should pass.',128,222,10.5,'#2b2a27');
    g.fillStyle='#ffffff';g.fillRect(128,262,370,44);g.strokeStyle='#d9d1c1';g.strokeRect(128,262,370,44);txt(g,'Reply to Claude...',140,288,11,'#9b958a');g.fillStyle='#c96442';g.fillRect(462,272,26,24);});
  S.vscode=ctex(W,Hh,(g)=>{g.fillStyle='#1e1e1e';g.fillRect(0,0,W,Hh);g.fillStyle='#3c3c3c';g.fillRect(0,0,W,18);txt(g,'App.tsx - frontend - Visual Studio Code',150,13,10,'#cccccc');
    g.fillStyle='#333333';g.fillRect(0,18,30,Hh);for(let i=0;i<5;i++){g.fillStyle=i?'#858585':'#ffffff';g.fillRect(9,30+i*28,12,12);}
    g.fillStyle='#252526';g.fillRect(30,18,110,Hh);txt(g,'EXPLORER',38,34,9,'#bbbbbb',600);['src','  components','    Header.tsx','    Cart.tsx','  hooks','  App.tsx','  api.ts','package.json','README.md'].forEach((f,i)=>txt(g,f,38,52+i*16,10,i===5?'#ffffff':'#c5c5c5'));
    g.fillStyle='#2d2d2d';g.fillRect(140,18,W,22);g.fillStyle='#1e1e1e';g.fillRect(140,18,80,22);txt(g,'App.tsx',150,33,10,'#ffffff');txt(g,'api.ts',232,33,10,'#969696');
    for(let i=0;i<14;i++)txt(g,String(i+1),146,58+i*14,9,'#858585');lines(g,170,52,14,14,['#569cd6','#9cdcfe','#ce9178','#dcdcaa','#4ec9b0','#c586c0','#d4d4d4'],70);
    g.fillStyle='#1e1e1e';g.fillRect(140,250,W,52);g.fillStyle='#2d2d2d';g.fillRect(140,250,W,1);txt(g,'TERMINAL',150,264,9,'#e7e7e7',600);txt(g,'$ npm run dev',150,280,10,'#cccccc');txt(g,'ready - started server on http://localhost:3000',150,294,10,'#23d18b');
    g.fillStyle='#007acc';g.fillRect(0,Hh-16,W,16);txt(g,'main   0 errors   Ln 12, Col 8   TypeScript React',8,Hh-4,9.5,'#ffffff');});
  S.xlBug=ctex(W,Hh,(g)=>sheet(g,'Bug_List.xlsx',['ID','Title','Severity','Status','Assignee'],[['BUG-#','Checkout button not clickable','High','Open','Tanvir'],['BUG-#','Cart total wrong after coupon','Critical','Open','Nadia'],['BUG-#','Footer overlaps on mobile','Low','Fixed','Sami'],['BUG-#','Login error message missing','Medium','In QA','Rafi'],['BUG-#','Image not loading on Safari','High','Open','Mitu'],['BUG-#','Typo on product page','Low','Closed','Arif']],[62,180,64,60,70],2));
  S.browser=ctex(W,Hh,(g)=>{g.fillStyle='#dee1e6';g.fillRect(0,0,W,52);g.fillStyle='#ffffff';g.fillRect(8,6,150,20);txt(g,'Checkout | Demo Shop',16,20,10,'#333');g.fillStyle='#ffffff';g.fillRect(40,30,330,18);txt(g,'staging.demo-shop.com/checkout',50,43,10,'#202124');
    g.fillStyle='#ffffff';g.fillRect(0,52,330,Hh-52);g.fillStyle='#111827';g.fillRect(0,52,330,26);txt(g,'DEMO SHOP',12,70,12,'#ffffff',700);txt(g,'Checkout',12,102,15,'#111',700);
    for(let i=0;i<3;i++){g.fillStyle='#f3f4f6';g.fillRect(12,114+i*36,200,28);txt(g,['Full name','Email address','Card number'][i],20,132+i*36,10,'#9ca3af');}
    g.fillStyle='#e2622b';g.fillRect(12,228,200,30);txt(g,'Place order',80,247,11,'#ffffff',700);g.strokeStyle='#e00';g.lineWidth=3;g.strokeRect(8,224,208,38);txt(g,'Bug: button does nothing',220,246,10,'#d00',700);
    g.fillStyle='#f3f4f6';g.fillRect(228,114,94,90);txt(g,'Total  ৳ 2,450',234,134,10,'#111');txt(g,'Coupon -10%',234,152,10,'#16a34a');
    g.fillStyle='#ffffff';g.fillRect(330,52,W-330,Hh-52);g.fillStyle='#f1f3f4';g.fillRect(330,52,W-330,20);txt(g,'Elements   Console   Network',336,66,9.5,'#5f6368');
    for(let i=0;i<9;i++){const err=i%3===1;g.fillStyle=err?'#fdecea':'#ffffff';g.fillRect(330,74+i*22,W-330,21);txt(g,err?'✖ Uncaught TypeError: cart.total':'GET /api/cart 200',336,88+i*22,9,err?'#d93025':'#5f6368');}});
  S.xlDesign=ctex(W,Hh,(g)=>sheet(g,'Design_Tasks.xlsx',['Screen','Task','Priority','Status','Due'],[['Home','New hero banner','High','In progress','Oct 30'],['Checkout','Simplify form','Medium','Review','Nov 2'],['Profile','Dark mode','Low','To do','Nov 8'],['Cart','Empty state','Medium','Done','Oct 28'],['Onboarding','Illustrations','High','To do','Nov 5']],[70,150,62,82,70],2));
  S.figma=ctex(W,Hh,(g)=>{g.fillStyle='#e5e5e5';g.fillRect(0,0,W,Hh);g.fillStyle='#2c2c2c';g.fillRect(0,0,W,24);txt(g,'Figma   Shop App / Checkout v3',10,16,10.5,'#ffffff');for(let i=0;i<6;i++){g.fillStyle=i===1?'#0d99ff':'#5a5a5a';g.fillRect(200+i*22,6,14,12);}
    g.fillStyle='#ffffff';g.fillRect(0,24,104,Hh);txt(g,'Layers',8,40,10,'#333',700);['Frame 12','  Header','  Product card','  Button / CTA','  Price','Frame 13','  Form','  Checkout btn'].forEach((t,i)=>txt(g,t,8,58+i*16,9.5,i===3?'#0d99ff':'#444'));
    g.fillStyle='#ffffff';g.fillRect(W-110,24,110,Hh);txt(g,'Design',W-102,40,10,'#333',700);for(let i=0;i<7;i++){g.fillStyle='#f0f0f0';g.fillRect(W-102,52+i*24,94,16);}g.fillStyle='#e2622b';g.fillRect(W-102,52+7*24,16,16);
    for(let k=0;k<3;k++){const fx=122+k*94;g.fillStyle='#ffffff';g.fillRect(fx,46,80,160);g.fillStyle='#111827';g.fillRect(fx,46,80,14);g.fillStyle=['#fde68a','#bfdbfe','#fecaca'][k];g.fillRect(fx+6,66,68,50);
      g.fillStyle='#d1d5db';g.fillRect(fx+6,122,50,6);g.fillRect(fx+6,132,62,6);g.fillStyle='#e2622b';g.fillRect(fx+6,184,68,14);}
    g.strokeStyle='#0d99ff';g.lineWidth=2;g.strokeRect(210,180,84,22);txt(g,'Button / CTA',214,222,9,'#0d99ff',600);g.fillStyle='#a855f7';g.beginPath();g.moveTo(300,250);g.lineTo(312,262);g.lineTo(304,262);g.fill();txt(g,'Mitu',312,272,9,'#a855f7',600);});
  S.xlHR=ctex(W,Hh,(g)=>sheet(g,'Leave_Tracker.xlsx',['Employee','Team','Leave taken','Remaining','Appraisal'],[['Tanvir Ahmed','Dev','6','14','Due'],['Nadia Islam','QA','3','17','Done'],['Sami Rahman','Design','9','11','Due'],['Rafi Hasan','Dev','2','18','Done'],['Mitu Akter','Design','5','15','Pending'],['Arif Khan','QA','11','9','Due']],[110,60,80,80,80],-1));
  TX.S={};for(const k in S)TX.S[k]=new THREE.MeshBasicMaterial({map:S[k]});
  TX.btile=ctex(256,256,(g,w,h)=>{g.fillStyle='#dcd2c4';g.fillRect(0,0,w,h);noise(g,w,h,3000,170,240);g.fillStyle='rgba(150,138,122,.6)';for(let i=0;i<=2;i++){g.fillRect(i*128-1,0,2,h);g.fillRect(0,i*128-1,w,2);}},true);
  TX.conc=ctex(256,256,(g,w,h)=>{g.fillStyle='#a8a49d';g.fillRect(0,0,w,h);noise(g,w,h,9000,110,200);for(let y=0;y<h;y+=42){g.fillStyle='rgba(70,66,60,.35)';g.fillRect(0,y,w,2);}for(let x=0;x<w;x+=128){g.fillStyle='rgba(70,66,60,.25)';g.fillRect(x,0,2,h);}for(let i=0;i<20;i++){g.fillStyle='rgba(60,56,50,.35)';g.beginPath();g.arc(Math.random()*w,Math.random()*h,2.5,0,7);g.fill();}},true);
  TX.cceil=ctex(256,256,(g,w,h)=>{g.fillStyle='#8a8a87';g.fillRect(0,0,w,h);noise(g,w,h,9000,60,170);for(let i=0;i<14;i++){const r=g.createRadialGradient(0,0,0,0,0,60);r.addColorStop(0,'rgba(55,55,52,.35)');r.addColorStop(1,'rgba(55,55,52,0)');g.save();g.translate(Math.random()*w,Math.random()*h);g.scale(1+Math.random(),.6+Math.random()*.6);g.fillStyle=r;g.fillRect(-60,-60,120,120);g.restore();}
    g.fillStyle='rgba(50,50,48,.35)';g.fillRect(0,0,w,2);g.fillRect(0,0,2,h);},true);
  TX.grille=ctex(128,128,(g,w,h)=>{g.fillStyle='#e9e9e6';g.fillRect(0,0,w,h);g.fillStyle='#b9bcc0';for(let y=0;y<h;y+=4)for(let x=(y/4%2)*2;x<w;x+=4)if((x-64)**2+(y-64)**2<44*44)g.fillRect(x,y,2,2);g.strokeStyle='#5a5d62';g.lineWidth=5;g.beginPath();g.arc(64,64,52,0,7);g.stroke();});
  TX.frost=ctex(128,256,(g,w,h)=>{g.fillStyle='#ffffff';g.fillRect(0,0,w,h);for(let i=0;i<5000;i++){g.fillStyle='rgba(200,210,215,'+(Math.random()*.35)+')';g.fillRect(Math.random()*w,Math.random()*h,2,2);}g.fillStyle='rgba(255,255,255,.6)';g.fillRect(0,96,w,40);});
  TX.exitLbl=ctex(128,48,(g,w,h)=>{g.clearRect(0,0,w,h);g.fillStyle='#1a1a1a';g.font='700 26px Arial';g.textAlign='center';g.fillText('EXIT',64,34);});
  const face=(ok)=>ctex(160,224,(g,w,h)=>{g.fillStyle=ok?'#0f3d22':'#0d1b2e';g.fillRect(0,0,w,h);g.strokeStyle=ok?'#3ddc84':'#4fc3f7';g.lineWidth=4;g.beginPath();g.ellipse(80,96,44,58,0,0,7);g.stroke();
    g.setLineDash([8,6]);g.beginPath();g.moveTo(20,96);g.lineTo(140,96);g.stroke();g.setLineDash([]);g.fillStyle=ok?'#3ddc84':'#4fc3f7';g.font='700 18px Arial';g.textAlign='center';g.fillText(ok?'UNLOCKED':'FACE ID',80,190);
    if(ok){g.lineWidth=7;g.beginPath();g.moveTo(58,96);g.lineTo(74,112);g.lineTo(104,78);g.stroke();}});
  TX.faceIdle=new THREE.MeshBasicMaterial({map:face(false)});TX.faceOk=new THREE.MeshBasicMaterial({map:face(true)});
  TX.denim=ctex(128,128,(g,w,h)=>{g.fillStyle='#d8dde6';g.fillRect(0,0,w,h);g.strokeStyle='rgba(40,50,70,.22)';g.lineWidth=1;for(let i=-h;i<w;i+=3){g.beginPath();g.moveTo(i,0);g.lineTo(i+h,h);g.stroke();}noise(g,w,h,2500,150,255);},true);TX.denim.repeat.set(4,4);
  TX.feltB=ctex(256,256,(g,w,h)=>{g.fillStyle='#1d5fa8';g.fillRect(0,0,w,h);for(let i=0;i<6000;i++){g.fillStyle=Math.random()<.5?'rgba(0,0,0,.06)':'rgba(255,255,255,.05)';g.fillRect(Math.random()*w,Math.random()*h,2,2);}});
  TX.felt=ctex(256,256,(g,w,h)=>{g.fillStyle='#16704f';g.fillRect(0,0,w,h);for(let i=0;i<6000;i++){g.fillStyle=Math.random()<.5?'rgba(0,0,0,.06)':'rgba(255,255,255,.04)';g.fillRect(Math.random()*w,Math.random()*h,2,2);}});
  TX.carrom=ctex(512,512,(g,w,h)=>{g.fillStyle='#ecd29f';g.fillRect(0,0,w,h);g.strokeStyle='rgba(150,110,60,.15)';for(let i=0;i<60;i++){g.beginPath();g.moveTo(0,i*9+Math.random()*4);g.bezierCurveTo(170,i*9+6,340,i*9-6,512,i*9+2);g.stroke();}
    const s=512/0.74, px=v=>256+v*s;g.strokeStyle='#2a1b12';g.lineWidth=2;
    for(const sgn of [-1,1]){for(const off of [0.26,0.29]){g.beginPath();g.moveTo(px(-.235),px(sgn*off));g.lineTo(px(.235),px(sgn*off));g.stroke();g.beginPath();g.moveTo(px(sgn*off),px(-.235));g.lineTo(px(sgn*off),px(.235));g.stroke();}}
    g.fillStyle='#b3261e';for(const a of [-1,1])for(const b of [-1,1]){g.beginPath();g.arc(px(a*.235),px(b*.275),9,0,7);g.fill();g.beginPath();g.arc(px(b*.275),px(a*.235),9,0,7);g.fill();}
    g.beginPath();g.arc(256,256,s*.085,0,7);g.stroke();g.beginPath();g.arc(256,256,s*.016,0,7);g.fillStyle='#b3261e';g.fill();
    g.lineWidth=2;for(const a of [-1,1])for(const b of [-1,1]){g.beginPath();g.moveTo(px(a*.12),px(b*.12));g.lineTo(px(a*.26),px(b*.26));g.stroke();}
    g.fillStyle='#15100c';for(const a of [0,w])for(const b of [0,h]){g.beginPath();g.arc(a,b,22,0,7);g.fill();}});
  const scr=[
    (g,w,h)=>{g.fillStyle='#1e1f29';g.fillRect(0,0,w,h);g.fillStyle='#2a2c38';g.fillRect(0,0,38,h);const c=['#c792ea','#82aaff','#c3e88d','#f78c6c','#89ddff','#a6accd'];
      for(let y=10;y<h-6;y+=9){let x=46+((y*7)%4)*10;const n=2+((y*13)%4);for(let i=0;i<n;i++){const ww=10+((y*31+i*17)%40);g.fillStyle=c[(y+i*3)%c.length];g.fillRect(x,y,ww,4);x+=ww+6;}}},
    (g,w,h)=>{g.fillStyle='#ffffff';g.fillRect(0,0,w,h);g.fillStyle='#1d6f42';g.fillRect(0,0,w,16);g.strokeStyle='#d5d9dd';for(let x=0;x<w;x+=36){g.beginPath();g.moveTo(x,16);g.lineTo(x,h);g.stroke();}
      for(let y=16;y<h;y+=11){g.beginPath();g.moveTo(0,y);g.lineTo(w,y);g.stroke();}g.fillStyle='#55606b';for(let y=20;y<h;y+=11)for(let x=4;x<w;x+=36)if((x+y)%5)g.fillRect(x,y,8+((x*y)%18),4);
      g.fillStyle='#e6f2ea';g.fillRect(150,70,96,80);g.fillStyle='#2e8b57';for(let i=0;i<6;i++){const bh=10+((i*29)%55);g.fillRect(158+i*14,146-bh,9,bh);}},
    (g,w,h)=>{g.fillStyle='#f6f7f9';g.fillRect(0,0,w,h);g.fillStyle='#1f5fbf';g.fillRect(0,0,w,14);g.fillStyle='#e9edf2';g.fillRect(0,14,62,h);
      for(let y=22;y<h;y+=17){g.fillStyle=y%3?'#2b2f36':'#6b7280';g.fillRect(70,y,60+((y*13)%60),4);g.fillStyle='#9aa1aa';g.fillRect(70,y+7,120+((y*7)%50),3);g.fillStyle='#d4d8de';g.fillRect(66,y+13,w,1);}},
    (g,w,h)=>{g.fillStyle='#eef1f5';g.fillRect(0,0,w,h);for(let i=0;i<3;i++){g.fillStyle='#fff';g.fillRect(8+i*82,8,74,40);g.fillStyle=['#2f6db5','#d9a015','#b3261e'][i];g.fillRect(14+i*82,18,30,10);}
      g.fillStyle='#fff';g.fillRect(8,56,240,96);g.strokeStyle='#2f6db5';g.lineWidth=2;g.beginPath();g.moveTo(16,140);for(let x=16;x<240;x+=14)g.lineTo(x,140-((x*x)%70)-(x/4));g.stroke();}
  ];
  TX.screens=scr.map(f=>new THREE.MeshBasicMaterial({map:ctex(256,160,f)}));
  TX.tv=new THREE.MeshBasicMaterial({map:ctex(512,288,(g,w,h)=>{g.fillStyle='#14305c';g.fillRect(0,0,w,h);g.fillStyle='#ffffff';
    g.font='600 30px "Hind Siliguri","Noto Sans Bengali",sans-serif';g.fillText('ত্রৈমাসিক বিক্রি, Q3',28,46);g.fillStyle='#9fb6d9';g.font='400 17px "Hind Siliguri",sans-serif';g.fillText('টার্গেট: ১০০%   অর্জন: ???',28,74);
    const v=[60,85,110,95,140,40];v.forEach((b,i)=>{g.fillStyle=i===5?'#e0574c':'#5aa0e6';g.fillRect(60+i*68,250-b,40,b);});g.strokeStyle='#9fb6d9';g.beginPath();g.moveTo(40,252);g.lineTo(480,252);g.stroke();})});
  TX.win=ctex(128,256,(g,w,h)=>{g.fillStyle='#c9bfae';g.fillRect(0,0,w,h);for(let r=0;r<8;r++)for(let c=0;c<4;c++){g.fillStyle=(r*5+c*3)%7?'#55697a':'#e8d9a8';g.fillRect(8+c*30,10+r*31,20,20);
    g.fillStyle='#8a8070';g.fillRect(6+c*30,30+r*31,24,3);}});
  TX.dart=new THREE.MeshStandardMaterial({map:ctex(256,256,(g,w,h)=>{g.fillStyle='#111';g.fillRect(0,0,w,h);for(let i=0;i<20;i++){g.fillStyle=i%2?'#efe2c0':'#1b1b1b';g.beginPath();g.moveTo(128,128);g.arc(128,128,120,i*Math.PI/10,(i+1)*Math.PI/10);g.fill();}
    g.strokeStyle='#b3261e';g.lineWidth=10;g.beginPath();g.arc(128,128,112,0,7);g.stroke();g.beginPath();g.arc(128,128,70,0,7);g.stroke();g.fillStyle='#1d8a4d';g.beginPath();g.arc(128,128,12,0,7);g.fill();g.fillStyle='#b3261e';g.beginPath();g.arc(128,128,5,0,7);g.fill();}),roughness:.7});
  TX.smoke=ctex(64,64,(g)=>{const r=g.createRadialGradient(32,32,0,32,32,32);r.addColorStop(0,'rgba(236,236,236,.85)');r.addColorStop(.5,'rgba(230,230,230,.35)');r.addColorStop(1,'rgba(230,230,230,0)');g.fillStyle=r;g.fillRect(0,0,64,64);});
}
function floorMat(tex,w,d,size,tint,rough){const t=tex.clone();t.needsUpdate=true;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(w/size,d/size);return new THREE.MeshStandardMaterial({map:t,roughness:rough||.82,color:lin(tint||'#ffffff')});}
function floor(x1,x2,z1,z2,tex,size,tint,y,rough){const w=x2-x1,d=z2-z1;const e=plane(staticG,w,d,(x1+x2)/2,y||.004,(z1+z2)/2,floorMat(tex,w,d,size,tint,rough),0,-Math.PI/2);e.castShadow=false;}

/* ================= walls ================= */
let wallM,glassM,outGlassM,frameM;
function wseg(x1,z1,x2,z2,kind){
  const v=Math.abs(x1-x2)<1e-6, len=v?Math.abs(z2-z1):Math.abs(x2-x1); if(len<.02)return;
  const w=v?T:len,d=v?len:T,cx=(x1+x2)/2,cz=(z1+z2)/2;
  if(kind==='glass'){
    const g=new THREE.Mesh(UB,glassM);g.scale.set(v?.02:len,H,v?len:.02);g.position.set(cx,H/2,cz);wallsG.add(g);
    bx(wallsG,v?.06:len,.07,v?len:.06,cx,0,cz,frameM);bx(wallsG,v?.06:len,.06,v?len:.06,cx,H-.06,cz,frameM);
    const n=Math.max(1,Math.round(len/1.25));for(let i=0;i<=n;i++){const t=-len/2+len*i/n;bx(wallsG,.05,H,.05,v?cx:cx+t,0,v?cz+t:cz,frameM);}
  }else if(kind==='win'){
    bx(wallsG,w,.9,d,cx,0,cz,wallM);bx(wallsG,w,H-2.2,d,cx,2.2,cz,wallM);
    const g=new THREE.Mesh(UB,outGlassM);g.scale.set(v?.02:len,1.3,v?len:.02);g.position.set(cx,1.55,cz);g.castShadow=false;wallsG.add(g);
    bx(wallsG,v?T+.12:len,.035,v?len:T+.12,cx,.88,cz,'#d8d2c4');
    const n=Math.max(1,Math.round(len/1.5));for(let i=0;i<=n;i++){const t=-len/2+len*i/n;bx(wallsG,v?.08:.05,1.3,v?.05:.08,v?cx:cx+t,.9,v?cz+t:cz,frameM,{cast:false});}
  }else if(kind==='full'){
    const g=new THREE.Mesh(UB,outGlassM);g.scale.set(v?.02:len,H-.1,v?len:.02);g.position.set(cx,H/2,cz);g.castShadow=false;wallsG.add(g);
    bx(wallsG,v?T:len,.06,v?len:T,cx,0,cz,frameM);bx(wallsG,v?T:len,.08,v?len:T,cx,H-.08,cz,frameM);
    const n=Math.max(1,Math.round(len/1.25));for(let i=0;i<=n;i++){const t=-len/2+len*i/n;bx(wallsG,v?.07:.05,H,v?.05:.07,v?cx:cx+t,0,v?cz+t:cz,frameM,{cast:false});}
  }else bx(wallsG,w,H,d,cx,0,cz,wallM);
  addCol(cx-Math.max(w,.12)/2,cx+Math.max(w,.12)/2,cz-Math.max(d,.12)/2,cz+Math.max(d,.12)/2);
}
function wline(axis,fixed,a,b,gaps,kind){
  gaps=(gaps||[]).slice().sort((p,q)=>p[0]-q[0]);let cur=a;
  const seg=(s,e)=>{if(e-s<.02)return;axis==='x'?wseg(s,fixed,e,fixed,kind):wseg(fixed,s,fixed,e,kind);};
  for(const [g0,g1] of gaps){seg(cur,g0);cur=g1;const mid=(g0+g1)/2,len=g1-g0;
    if(axis==='x')bx(tallG,len,H-2.15,T,mid,2.15,fixed,kind==='glass'?frameM:wallM);else bx(tallG,T,H-2.15,len,fixed,2.15,mid,kind==='glass'?frameM:wallM);
    if(axis==='x')bx(wallsG,len,.008,T+.04,mid,0,fixed,'#8e8b84',{cast:false});else bx(wallsG,T+.04,.008,len,fixed,0,mid,'#8e8b84',{cast:false});}
  seg(cur,b);
}

/* ================= furniture ================= */
function oChair(x,z,ry,col,par){if(!par)CHAIRS.push({x,z,yaw:ry||0,h:.48});const g=grp(par||staticG,x,0,z,ry);const cm=mat('#1b1c1f',.75),me=mat('#2a2b2e',.4,.4);
  for(let i=0;i<5;i++){const a=i*Math.PI*2/5;bx(g,.03,.03,.28,Math.sin(a)*.14,.035,Math.cos(a)*.14,me,{ry:a,cast:false});sp(g,.024,.024,.024,Math.sin(a)*.27,.024,Math.cos(a)*.27,'#111',{cast:false});}
  cy(g,.025,.36,0,.06,0,me);bx(g,.5,.08,.48,0,.4,0,cm);bx(g,.46,.6,.05,0,.53,-.26,cm,{rx:-.1});bx(g,.3,.14,.06,0,1.17,-.31,cm,{rx:-.15});bx(g,.04,.2,.04,0,1.08,-.29,me,{cast:false});
  bx(g,.035,.2,.035,-.25,.47,-.03,me,{cast:false});bx(g,.035,.2,.035,.25,.47,-.03,me,{cast:false});bx(g,.06,.03,.26,-.25,.67,-.03,cm);bx(g,.06,.03,.26,.25,.67,-.03,cm);return g;}
function woodChair(x,z,ry){const g=grp(staticG,x,0,z,ry);const w=mat('#6b4528',.6);bx(g,.44,.05,.42,0,.41,0,w);
  for(const a of [-.19,.19])for(const b of [-.18,.18])bx(g,.04,.41,.04,a,0,b,w,{cast:false});bx(g,.04,.5,.04,-.19,.46,-.19,w);bx(g,.04,.5,.04,.19,.46,-.19,w);bx(g,.42,.18,.03,0,.74,-.19,w);bx(g,.42,.05,.03,0,.58,-.19,w);}
function plasticChair(x,z,ry,col){const g=grp(staticG,x,0,z,ry);const m=mat(col,.45);bx(g,.46,.04,.44,0,.4,0,m);bx(g,.46,.42,.04,0,.44,-.22,m,{rx:-.12});
  for(const a of [-.2,.2])for(const b of [-.19,.19])bx(g,.04,.42,.04,a,0,b,m,{rz:a*.3,cast:false});bx(g,.04,.04,.4,-.23,.6,-.02,m);bx(g,.04,.04,.4,.23,.6,-.02,m);}
const MUG=['#ffffff','#b3261e','#2f6db5','#e8dcb5','#1d6f42'];
function wDesk(x,z,dir){
  bx(null,1.6,.03,.72,x,.72,z,'#35383d',{col:true});const fm=mat('#141518',.4,.4);
  for(const a of [-.76,.76]){bx(null,.04,.72,.04,x+a,0,z-.3,fm,{cast:false});bx(null,.04,.72,.04,x+a,0,z+.3,fm,{cast:false});bx(null,.04,.04,.64,x+a,.05,z,fm,{cast:false});}
  bx(null,.42,.56,.5,x+.5,0,z-.12*dir,'#5d6168');bx(null,.42,.05,.5,x+.5,.56,z-.12*dir,'#e2622b',{cast:false});
  const mz=z+.17*dir;bx(null,.22,.015,.16,x-.1,.75,mz,'#141518');bx(null,.04,.22,.03,x-.1,.75,mz+.02*dir,'#141518');bx(null,.58,.35,.025,x-.1,.9,mz,'#0f1013');
  plane(null,.54,.31,x-.1,1.075,mz-.014*dir,TX.screens[Math.floor(R()*4)],dir>0?Math.PI:0);
  if(R()<.4)plane(null,.8,.38,x-.1,.737,z-.08*dir,TX.mapMat,dir>0?Math.PI:0,-Math.PI/2);
  bx(null,.44,.018,.14,x-.13,.75,z-.13*dir,'#1e1f22',{cast:false});sp(null,.028,.014,.045,x+.22,.76,z-.13*dir,'#1e1f22',{cast:false});
  if(R()<.6)cy(null,.04,.1,x-.62,.75,z+.02*dir,pick(MUG));if(R()<.3)cy(null,.035,.24,x+.6,.75,z+.15*dir,'#3d7fbf');
  oChair(x,z-.86*dir,dir>0?0:Math.PI);
}
function plant(x,z,s){s=s||1;cy(null,.2*s,.45*s,x,0,z,'#5b5e63',{col:true});const g=mat('#3f7a3a',.8),g2=mat('#4f8f45',.8);
  for(let i=0;i<7;i++){const a=i*.9;sp(null,.16*s,.3*s,.16*s,x+Math.sin(a)*.12*s,.75*s+(i%3)*.12*s,z+Math.cos(a)*.12*s,i%2?g:g2);}}
function laptop(x,z,ry,scr,y){const g=grp(staticG,x,y||.75,z,ry);bx(g,.32,.015,.22,0,0,0,'#9aa0a8');const s=grp(g,0,.015,-.11);s.rotation.x=-.28;bx(s,.32,.21,.008,0,0,0,'#2a2c30');plane(s,.29,.18,0,.105,.005,TX.screens[scr||0],0);}

/* ================= people ================= */
const JN=['spine','neck','head','lSh','rSh','lEl','rEl','lHand','rHand','lHip','rHip','lKn','rKn','lAn','rAn'];
const SKINS=['#c48a5f','#b07a50','#d6a378','#9a6844','#a87452','#dcae84','#8c5c3c'];
const people=[];let PHN=1;   // PHN: everybody gets the same per-person phase on every screen, so the office animates in step
const Gs=(v,m,s)=>{const d=(v-m)/s;return Math.exp(-d*d);};
// sculpt a unit-sphere point (front = +z) into a human head shape, in metres
function sculpt(x,y,z,f){
  let X=x*(f?.079:.083),Y=y*.112,Z=z*(f?.095:.1);
  if(z<0){Z*=1.07;Y+=.006*(-z)*Math.max(0,y);}
  if(y<0){const t=-y;X*=1-(f?.36:.3)*t*t;if(z>0)Z*=1-.05*t;else Z*=1-.45*t*t;}
  const fr=Math.max(0,z);
  X*=1+.05*Gs(y,-.05,.25)*fr; X*=1-.05*Gs(y,.28,.2)*fr;
  Z+=(f?.007:.012)*Gs(x,0,.3)*Gs(y,-.82,.13)*fr;
  Z+=.024*Gs(x,0,.085)*Gs(y,-.18,.2)*fr*fr*fr;
  Z+=.012*Gs(x,0,.15)*Gs(y,-.35,.08)*fr;
  Z-=.011*(Gs(x,.37,.14)+Gs(x,-.37,.14))*Gs(y,.06,.1)*fr;
  Z+=.005*Gs(y,.24,.07)*fr*(1-Gs(x,0,.15)*.5);
  Z+=.006*Gs(x,0,.26)*(Gs(y,-.52,.045)+.8*Gs(y,-.62,.05))*fr;
  Z-=.003*Gs(x,0,.25)*Gs(y,-.57,.02)*fr;
  return [X,Y,Z];
}
function headShell(key,f,off,region,seg){const k='hs'+key+(f?'f':'m');if(gc[k])return gc[k];
  const g=new THREE.SphereGeometry(1,seg||48,seg?Math.round(seg*.8):40);g.rotateY(-Math.PI/2);
  const p=g.attributes.position,n=p.count,keep=new Uint8Array(n),cols=key==='skin'?new Float32Array(n*3):null;
  for(let i=0;i<n;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i);keep[i]=region?(region(x,y,z)?1:0):1;
    const sc=sculpt(x,y,z,f),o=1+(keep[i]?(typeof off==='function'?off(x,y,z):off):-.035);p.setXYZ(i,sc[0]*o,sc[1]*o,sc[2]*o);
    if(cols){const fr=Math.max(0,z),lip=Math.min(1,1.4*Gs(x,0,.22)*(Gs(y,-.52,.05)+Gs(y,-.62,.055))*fr*fr),
      sock=.1*(Gs(x,.37,.16)+Gs(x,-.37,.16))*Gs(y,.06,.12)*fr,blush=.05*(Gs(x,.45,.2)+Gs(x,-.45,.2))*Gs(y,-.25,.15)*fr;
      cols[i*3]=lerp(1,.8,lip)-sock;cols[i*3+1]=lerp(1,.52,lip)-sock-blush;cols[i*3+2]=lerp(1,.5,lip)-sock-blush;}}
  if(region){const a=g.index.array,ni=[];for(let i=0;i<a.length;i+=3)if(keep[a[i]]||keep[a[i+1]]||keep[a[i+2]])ni.push(a[i],a[i+1],a[i+2]);g.setIndex(ni);}
  if(cols)g.setAttribute('color',new THREE.BufferAttribute(cols,3));
  g.computeVertexNormals();return gc[k]=g;}
const TM=[[0,.142,.098],[.15,.145,.1],[.35,.158,.108],[.55,.172,.116],[.7,.178,.113],[.8,.186,.102],[.88,.18,.088],[.94,.13,.07],[1,.06,.052]];
const TF=[[0,.122,.088],[.15,.124,.09],[.35,.138,.094],[.55,.15,.098],[.7,.154,.098],[.8,.16,.09],[.88,.155,.08],[.94,.11,.064],[1,.055,.048]];
function itp(tab,t,k){for(let i=1;i<tab.length;i++)if(t<=tab[i][0]){const a=tab[i-1],b=tab[i],u=(t-a[0])/(b[0]-a[0]);return lerp(a[k],b[k],u*u*(3-2*u));}return tab[tab.length-1][k];}
function torsoGeo(f){const k='torso'+f;if(gc[k])return gc[k];const g=new THREE.CylinderGeometry(1,1,1,32,26,true),p=g.attributes.position,tab=f?TF:TM;
  for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),t=y+.5,a=Math.atan2(z,x),c=Math.cos(a),s=Math.sin(a),W=itp(tab,t,1),D=itp(tab,t,2);
    let px=Math.sign(c)*Math.pow(Math.abs(c),.8)*W,pz=Math.sign(s)*Math.pow(Math.abs(s),.85)*D;
    if(f&&s>0)pz+=.028*Gs(t,.6,.11)*(Gs(px,.065,.05)+Gs(px,-.065,.05));
    if(!f&&s>0)pz+=.006*Gs(t,.66,.12)*(Gs(px,.07,.07)+Gs(px,-.07,.07));
    if(s<0)pz-=.008*Gs(t,.72,.15)*(Gs(px,.08,.06)+Gs(px,-.08,.06));
    p.setXYZ(i,px,t*.52,pz);}
  g.computeVertexNormals();return gc[k]=g;}
function handGeo(){if(gc.hand)return gc.hand;const parts=[],sph=new THREE.SphereGeometry(1,12,10),cyl=new THREE.CylinderGeometry(1,1,1,8);
  const add=(geo,sx,sy,sz,x,y,z,rx)=>{const g=geo.clone();g.scale(sx,sy,sz);if(rx)g.rotateX(rx);g.translate(x,y,z);parts.push(g.index?g.toNonIndexed():g);};
  add(sph,.017,.045,.038,0,-.045,0);const fz=[.024,.008,-.008,-.023],fl=[.044,.05,.047,.037];
  for(let i=0;i<4;i++){add(cyl,.0072,fl[i],.0072,0,-.083-fl[i]/2,fz[i]);add(sph,.0072,.0072,.0072,0,-.083-fl[i],fz[i]);}
  add(cyl,.0085,.045,.0085,0,0,0,.6);parts[parts.length-1].translate(0,-.058,.036);
  return gc.hand=THREE.BufferGeometryUtils.mergeBufferGeometries(parts,false);}
function shoeGeo(){if(gc.shoe)return gc.shoe;const g=new THREE.SphereGeometry(1,22,14),p=g.attributes.position;
  for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i);let X=x*.047,Y=Math.max(y,-.45)*.04,Z=z*.125;
    if(z>.3){X*=1-.3*(z-.3);if(y>0)Y-=.022*(z-.3);}if(z<-.5)X*=.92;p.setXYZ(i,X,Y,Z);}
  g.computeVertexNormals();return gc.shoe=g;}
function collarGeo(){if(gc.collar)return gc.collar;const g=new THREE.LatheGeometry([[.062,0],[.06,.025],[.072,.05]].map(q=>new THREE.Vector2(q[0],q[1])),22,.45,Math.PI*2-.9);return gc.collar=g;}
const HL=(z,a,b,c)=>z>0?lerp(a,b,z):lerp(a,c,-z);
const REG={
  short:(x,y,z)=>y>HL(z,.08,.55,-.5)||(Math.abs(x)>.82&&z>-.1&&z<.32&&y>-.32),
  bald:(x,y,z)=>y>HL(z,.08,.55,-.5)&&y<.45&&z<.35,
  long:(x,y,z)=>y>HL(z,.0,.62,-.62)||(Math.abs(x)>.8&&z<.15&&y>-.18),
  hijab:(x,y,z)=>!(z>.2&&(x/.66)*(x/.66)+((y+.12)/.78)*((y+.12)/.78)<1),
  beard:(x,y,z)=>z>-.15&&y<-.2&&y>-1&&!(Math.abs(x)<.32&&y>-.7&&y<-.42&&z>.7)&&(y<-.45||Math.abs(x)>.6),
  mous:(x,y,z)=>z>.72&&y>-.5&&y<-.38&&Math.abs(x)<.34};
const OFF={short:(x,y,z)=>.055+.05*Math.max(0,y)+.02*Math.max(0,-z),bald:.04,long:(x,y,z)=>.06+.04*Math.max(0,y),hijab:.12,beard:.03,mous:.035};
function makePerson(o){
  const f=o.g==='f',P={o,s:o.h,J:{},ph:(PHN++*13.37)%30,blink:0,yaw:0,x:0,z:0};
  const root=new THREE.Group();root.scale.setScalar(o.h);scene.add(root);P.root=root;
  const FAB={map:TX.fabric};
  const sk=mat(o.skin,.55),skH=mat(o.skin,.5,0,{vertexColors:true}),top=mat(o.top,.92,0,FAB),bot=mat(o.bot,.88,0,o.jeans?{map:TX.denim}:FAB),
    shoe=mat(o.shoe||'#1a1a1c',.32,.05),hair=matD(o.hair||'#141010',.48),J=P.J;
  const pm=(p,geo,m,x,y,z,sx,sy,sz,cast)=>{const e=new THREE.Mesh(geo,m);e.position.set(x,y,z);if(sx!=null)e.scale.set(sx,sy,sz);e.castShadow=!!cast;p.add(e);return e;};
  const gp=(p,x,y,z)=>{const g=new THREE.Group();g.position.set(x,y,z);p.add(g);return g;};
  P.pm=pm;P.gp=gp;
  J.hips=gp(root,0,STAND,0);const kam=!!o.kameez;
  pm(J.hips,lathe(f?'pf2':'pm2',f?[[0,-.095],[.12,-.09],[.168,-.035],[.165,.04],[.142,.1]]:[[0,-.085],[.118,-.08],[.155,-.03],[.153,.05],[.144,.1]],.72),kam?top:bot,0,0,0,null,null,null,true);
  if(!kam){pm(J.hips,lathe('belt',[[.149,.068],[.149,.1]],.72),mat('#1c1a18',.4),0,0,0);pm(J.hips,UB,mat('#b9b2a2',.25,.8),0,.084,.108,.036,.026,.006);}
  if(kam)J.skirt=pm(J.hips,lathe('sk2',[[.245,-.5],[.236,-.45],[.2,-.2],[.17,0],[.15,.1]],.8),matD(o.top,.92,FAB),0,0,0,null,null,null,true);
  J.spine=gp(J.hips,0,.1,0);
  pm(J.spine,torsoGeo(f),top,0,0,0,null,null,null,true);
  const tab=f?TF:TM,Dz=t=>itp(tab,t,2);
  if(!f&&o.style==='tee'){const rib=pm(J.spine,torusG(.06,.011),mat(o.top,.8),0,.5,.004,1,1,.85);rib.rotation.x=Math.PI/2+.12;
    if(o.print)pm(J.spine,UB,mat(o.print,.7),0,.34,Dz(.64)-.002,.12,.07,.012);}
  else if(!f&&o.style==='polo'){pm(J.spine,collarGeo(),matD(o.top,.85,FAB),0,.5,0,.95,.75,.95);pm(J.spine,UB,top,0,.43,Dz(.82)-.002,.03,.1,.012);
    for(const t of [.8,.87])pm(J.spine,US,mat('#e6e2d8',.3),0,t*.52,Dz(t)+.004,.006,.006,.003);}
  else if(!f){pm(J.spine,collarGeo(),matD(o.collar||o.top,.9,FAB),0,.5,0);
    if(!o.tie)for(let i=0;i<5;i++){const t=.18+i*.15;pm(J.spine,US,mat('#e6e2d8',.3),0,t*.52,Dz(t)+.001,.0055,.0055,.003);}
    pm(J.spine,UB,top,.072,.33,Dz(.64)-.004,.07,.08,.014);}
  else pm(J.spine,lathe('nk',[[.064,.505],[.058,.52]],.8),mat(o.trim||'#e9d7a8',.7),0,0,0);
  if(o.tie){const tm=mat(o.tie,.5);pm(J.spine,UB,tm,0,.32,Dz(.62)+.005,.045,.32,.01);pm(J.spine,UB,tm,0,.49,Dz(.93)+.012,.034,.034,.022);}
  if(o.orna){const om=matD(o.orna,.9,FAB);const t=pm(J.spine,torusG(.135,.028),om,0,.45,.005,1,1,.72);t.rotation.x=Math.PI/2+.35;pm(J.spine,UB,om,.09,.25,-.105,.1,.46,.012);pm(J.spine,UB,om,-.09,.25,-.105,.1,.46,.012);}
  J.neck=gp(J.spine,0,.485,0);pm(J.neck,cylG(.044,.054,.13,18),sk,0,.05,0,null,null,null,true);
  J.head=gp(J.neck,0,.1,0);
  pm(J.head,headShell('skin',f,0,null),skH,0,.105,0,null,null,null,true);
  const S=(x,y,z)=>{const v=new THREE.Vector3(x,y,z).normalize();const r=sculpt(v.x,v.y,v.z,f);return [r[0],r[1]+.105,r[2]];};
  J.eyes=[];J.lids=[];const ew=mat('#f2efe8',.12),ir=mat(o.iris||'#3b2414',.2),pu=mat('#060606',.1);
  for(const s of [1,-1]){const e=S(s*.37,.07,.93);const g=gp(J.head,e[0]*.97,e[1],e[2]-.0095);
    pm(g,US,ew,0,0,0,.0115,.0115,.0115);pm(g,US,ir,0,0,.0093,.0058,.0058,.0028);pm(g,US,pu,0,0,.0111,.0027,.0027,.001);
    const lid=pm(g,sphPart('lid',0,Math.PI*2,0,1.25),sk,0,0,0,.0126,.0126,.0126);lid.rotation.x=-.5;J.lids.push(lid);J.eyes.push(g);
    const b=S(s*.37,.27,.92);const br=pm(J.head,UB,hair,b[0],b[1],b[2]+.003,.03,.0045,.006);br.rotation.z=-s*.12;
    const ea=S(s,-.02,-.05);const ear=pm(J.head,US,sk,ea[0]+s*.003,ea[1],ea[2],.009,.026,.017);ear.rotation.y=s*.35;}
  const mp=S(0,-.575,.82);J.mouth=pm(J.head,UB,mat('#4e2520',.6),0,mp[1],mp[2]-.0015,.026,.0025,.004);J.mouthPt=gp(J.head,0,mp[1],mp[2]+.03);
  const hs=o.hs||'short';
  if(hs==='hijab'){const hm=matD(o.hijab,.92,FAB);pm(J.head,headShell('h_hijab',f,OFF.hijab,REG.hijab,64),hm,0,.105,0,null,null,null,true);
    pm(J.neck,lathe('hd2',[[.2,-.12],[.15,-.06],[.098,.02],[.08,.1]],.85),hm,0,0,0,null,null,null,true);}
  else{const key=hs==='bun'?'long':hs;pm(J.head,headShell('h_'+key,f,OFF[key],REG[key],64),hair,0,.105,0,null,null,null,true);
    if(hs==='long'){const g=gc.hb||(gc.hb=new THREE.CylinderGeometry(.088,.125,.32,20,3,true,Math.PI/2,Math.PI));pm(J.head,g,hair,0,-.035,-.018,1,1,.85,true);}
    if(hs==='bun')pm(J.head,US,hair,0,.12,-.112,.046,.042,.042);}
  if(o.beard)pm(J.head,headShell('beard',f,OFF.beard,REG.beard,64),hair,0,.105,0);
  if(o.beard||o.mous)pm(J.head,headShell('mous',f,OFF.mous,REG.mous,64),hair,0,.105,0);
  if(o.glasses){const gm=mat('#1b1b1b',.3,.4);for(const s of [1,-1]){const e=S(s*.37,.07,.93);pm(J.head,torusG(.017,.0022),gm,e[0],e[1],e[2]+.013);pm(J.head,UB,gm,s*.08,e[1]+.004,e[2]-.045,.003,.003,.09);}
    pm(J.head,UB,gm,0,S(0,.1,1)[1],S(0,.1,1)[2]+.005,.02,.003,.003);}
  const longS=o.sleeve!=='short';
  const UA=lathe('ua2',[[.04,-.28],[.043,-.24],[.047,-.16],[.051,-.08],[.054,-.025],[.05,0]],1),
    UAS=lathe('uas',[[.046,-.28],[.049,-.2],[.054,-.1],[.057,-.02],[.054,0]],1),
    SLV=lathe('slv',[[.058,-.15],[.057,-.12],[.058,-.05],[.058,0]],1),
    FA=lathe('fa2',[[.029,-.25],[.032,-.21],[.039,-.13],[.044,-.06],[.041,-.015],[.039,0]],1),
    FAS=lathe('fas',[[.036,-.232],[.038,-.2],[.044,-.13],[.048,-.06],[.046,0]],1);
  for(const s of [1,-1]){const L=s>0?'l':'r';
    const sh=gp(J.spine,s*.172,.445,0);J[L+'Sh']=sh;pm(J.spine,US,top,s*.158,.448,0,.054,.052,.056);
    if(longS)pm(sh,UAS,top,0,0,0,null,null,null,true);else{pm(sh,UA,sk,0,0,0,null,null,null,true);pm(sh,SLV,matD(o.top,.92,FAB),0,0,0,null,null,null,true);}
    pm(sh,US,longS?top:sk,0,-.28,0,.043,.043,.043);
    const el=gp(sh,0,-.28,0);J[L+'El']=el;
    if(longS){pm(el,FAS,top,0,0,0,null,null,null,true);pm(el,cylG(.034,.037,.02,14),top,0,-.232,0);pm(el,cylG(.029,.031,.03,12),sk,0,-.24,0);}
    else pm(el,FA,sk,0,0,0,null,null,null,true);
    const hd=gp(el,0,-.25,0);J[L+'Hand']=hd;pm(hd,handGeo(),sk,0,0,0,null,null,null,true);}
  const TH=kam?lathe('thS',[[.072,-.44],[.075,-.35],[.08,-.2],[.084,-.08],[.082,0]],1):lathe('thT',[[.062,-.44],[.064,-.36],[.07,-.24],[.077,-.1],[.079,-.02],[.076,0]],1),
    SH=kam?lathe('shS',[[.04,-.42],[.05,-.39],[.058,-.3],[.062,-.15],[.062,0]],1):lathe('shT',[[.05,-.42],[.051,-.36],[.054,-.22],[.058,-.1],[.058,0]],1);
  for(const s of [1,-1]){const L=s>0?'l':'r';
    const hp=gp(J.hips,s*.088,-.03,0);J[L+'Hip']=hp;pm(hp,TH,bot,0,0,0,null,null,null,true);pm(hp,US,bot,0,-.44,0,.062,.062,.062);
    const kn=gp(hp,0,-.44,0);J[L+'Kn']=kn;pm(kn,SH,bot,0,0,0,null,null,null,true);
    const an=gp(kn,0,-.42,0);J[L+'An']=an;
    if(kam)pm(an,cylG(.029,.033,.04,12),sk,0,-.012,0);
    if(o.sandal){pm(an,shoeGeo(),sk,0,-.05,.045,.88,.8,.9,true);pm(an,UB,shoe,0,-.0775,.045,.088,.012,.25);pm(an,UB,shoe,0,-.052,.1,.084,.01,.022);pm(an,UB,shoe,0,-.05,.0,.08,.01,.02);}
    else{pm(an,shoeGeo(),shoe,0,-.052,.045,1,1,1,true);pm(an,UB,mat('#2a2522',.7),0,-.0715,.045,.092,.012,.25);}}
  people.push(P);return P;
}
function place(P,x,z,yaw){P.x=x;P.z=z;P.y=0;P.vy=0;P.yaw=yaw||0;P.root.position.set(x,0,z);P.root.rotation.y=P.yaw;}
function rest(P){const J=P.J;for(const n of JN)J[n].rotation.set(0,0,0);J.hips.rotation.set(0,0,0);J.hips.position.y=STAND;
  J.lSh.rotation.z=.07;J.rSh.rotation.z=-.07;J.lEl.rotation.x=-.1;J.rEl.rotation.x=-.1;J.mouth.scale.y=.0025;J.lids[0].rotation.x=J.lids[1].rotation.x=-.5;if(J.skirt)J.skirt.scale.y=1;}
function sit(P,seat){const J=P.J,sl=seat/P.s;J.hips.position.y=sl+.1;const th=Math.asin(clamp((sl+.07-.4975)/.44,-.3,.8)),a=Math.PI/2-th;
  J.lHip.rotation.x=J.rHip.rotation.x=-a;J.lKn.rotation.x=J.rKn.rotation.x=a;J.lHip.rotation.z=.06;J.rHip.rotation.z=-.06;if(J.skirt)J.skirt.scale.y=.3;}
function talk(P,t,on){P.J.mouth.scale.y=on?.0025+Math.abs(Math.sin(t*11+P.ph))*.011:.0025;}
function life(P,t,dt){if((t+P.ph*1.3)%4.3>4.18)P.J.lids[0].rotation.x=P.J.lids[1].rotation.x=.6;   // blinks follow the shared clock too
  P.J.spine.rotation.x+=Math.sin(t*1.7+P.ph)*.012;}
const _ia=new THREE.Vector3(),_ib=new THREE.Vector3(),_ic=new THREE.Vector3(),_id=new THREE.Vector3(),_iq=new THREE.Quaternion(),_iq2=new THREE.Quaternion(),_vt=new THREE.Vector3();
const PB=new THREE.Vector3(1,-.4,0),PG=new THREE.Vector3(-.4,.5,-1),PTL=new THREE.Vector3(.6,-1,-.3),PTR=new THREE.Vector3(-.6,-1,-.3),PCL=new THREE.Vector3(.7,-1,0),PCR=new THREE.Vector3(-.7,-1,0);
function armIK(P,side,target,pole){const J=P.J,sh=J[side+'Sh'],el=J[side+'El'],par=sh.parent;P.root.updateMatrixWorld(true);
  _ia.copy(target);par.worldToLocal(_ia);_ia.sub(sh.position);
  const L1=.28,L2=.3,d=clamp(_ia.length(),.1,L1+L2-.004),ce=clamp((L1*L1+L2*L2-d*d)/(2*L1*L2),-1,1),e=-(Math.PI-Math.acos(ce));el.rotation.set(e,0,0);
  _ib.set(0,-L1-L2*Math.cos(e),-L2*Math.sin(e)).normalize();_ic.copy(_ia).normalize();_iq.setFromUnitVectors(_ib,_ic);
  _id.set(0,-1,0).applyQuaternion(_iq);_id.addScaledVector(_ic,-_ic.dot(_id));_ib.copy(pole).addScaledVector(_ic,-_ic.dot(pole));
  if(_id.lengthSq()>1e-6&&_ib.lengthSq()>1e-6){_id.normalize();_ib.normalize();const cr=_id.clone().cross(_ib);_iq2.setFromAxisAngle(_ic,Math.atan2(_ic.dot(cr),_id.dot(_ib)));_iq.premultiply(_iq2);}
  sh.quaternion.copy(_iq);}
function typeIK(P,t,ty,mo){const J=P.J,f0=Math.sin(P.yaw),f1=Math.cos(P.yaw),r0=-Math.cos(P.yaw),r1=Math.sin(P.yaw),y=P.kbY||.795,cx=P.x+f0*P.kbd,cz=P.z+f1*P.kbd;
  const a1=Math.max(0,Math.sin(t*15+P.ph))*.014*ty,a2=Math.max(0,Math.sin(t*16.7+P.ph*2))*.014*ty;
  armIK(P,'l',_vt.set(cx-r0*.1,y+.02+a1,cz-r1*.1),PTL);J.lHand.rotation.set(0,-1.5,0);
  armIK(P,'r',_vt.set(lerp(cx+r0*.1,cx+r0*.3,mo),y+.02+a2,lerp(cz+r1*.1,cz+r1*.3,mo)),PTR);J.rHand.rotation.set(0,1.5,0);}
function walkPose(P,ph,amp){const J=P.J,s=Math.sin(ph),c=Math.cos(ph);
  J.lHip.rotation.x=-s*.42*amp;J.rHip.rotation.x=s*.42*amp;J.lKn.rotation.x=Math.max(0,c)*.8*amp+.05;J.rKn.rotation.x=Math.max(0,-c)*.8*amp+.05;
  J.lAn.rotation.x=-Math.max(0,c)*.25*amp;J.rAn.rotation.x=-Math.max(0,-c)*.25*amp;
  J.lSh.rotation.x=s*.32*amp;J.rSh.rotation.x=-s*.32*amp;J.lEl.rotation.x=-.25;J.rEl.rotation.x=-.25;
  J.hips.position.y=STAND-.02+Math.abs(c)*.025*amp;J.hips.rotation.y=s*.06*amp;J.spine.rotation.y=-s*.08*amp;J.spine.rotation.x=.04;}
function moveAlong(P,dt){ // returns true when path finished
  if(!P.path||!P.path.length)return true;const tg=P.path[0],dx=tg[0]-P.x,dz=tg[1]-P.z,d=Math.hypot(dx,dz),st=P.speed*dt;
  if(d>1e-4){const ty=Math.atan2(dx,dz);let df=ty-P.yaw;df=Math.atan2(Math.sin(df),Math.cos(df));P.yaw+=df*Math.min(1,dt*8);}
  if(d<=st){P.x=tg[0];P.z=tg[1];P.path.shift();}else{P.x+=dx/d*st;P.z+=dz/d*st;}
  P.root.position.set(P.x,0,P.z);P.root.rotation.y=P.yaw;P.wph=(P.wph||0)+dt*P.speed*4.6;rest(P);walkPose(P,P.wph,1);return !P.path.length;}
function turnTo(P,yaw,dt){let df=yaw-P.yaw;df=Math.atan2(Math.sin(df),Math.cos(df));P.yaw+=df*Math.min(1,dt*6);P.root.rotation.y=P.yaw;return Math.abs(df)<.04;}

/* random looks */
const MTOP=['#f4f4f2','#cfe0f2','#a9c4de','#e9d9e6','#d8e4d2','#ececec','#5d6e86','#c9b79c','#e2e6ea','#f1e8d6'];
const MBOT=['#2a2f3a','#1e1f24','#4a4d54','#8b7d63','#3b3f4a','#2f3a4f'];
const KAM=['#7e2c3a','#2f6f73','#c08a2b','#d98b6d','#5e3a7a','#2e5a8c','#b8475a','#467a4a'];
const ORNA=['#f0d9a0','#e9c6c9','#c9e0e2','#f3e5c8','#d7c3e6'];
const HIJ=['#3a3f52','#7a5a4a','#c7b29a','#5b6e7a','#8a3b47','#e0d4c0'];
const TEE=['#2f3a4f','#e2622b','#f4f4f2','#1d1d1f','#4f7cac','#7a1f26','#3c6e47','#c9a227','#8a8f96','#5b2a86','#2b6f73','#d8d4cc'];
const JEANS=['#2d4a73','#3b5a85','#24364f','#4a6a95','#1f2a3a'],CHINO=['#b9a27a','#7d6d55','#3b3f4a','#8b7d63'];
function mkMan(extra){extra=extra||{};const st=(extra.tie||extra.style==='shirt')?'shirt':(extra.style||(R()<.9?(R()<.55?'tee':'polo'):'shirt'));const cas=st!=='shirt',jeans=cas&&R()<.75;
  return makePerson(Object.assign({g:'m',h:.88+R()*.06,skin:pick(SKINS),style:st,top:cas?pick(TEE):pick(MTOP),bot:jeans?pick(JEANS):pick(cas?CHINO:MBOT),jeans,hs:R()<.12?'bald':'short',hair:R()<.15?'#5b5550':'#16110e',
    beard:R()<.22,mous:R()<.25,glasses:R()<.28,sleeve:cas?'short':(R()<.25?'short':'long'),shoe:cas&&R()<.5?pick(['#ecebe7','#d9d6cf','#2a2c30']):'#1a1a1c',print:st==='tee'&&R()<.45?pick(['#ffffff','#e2622b','#1d1d1f','#c9a227']):null},extra));}
function mkWoman(extra){const hij=R()<.1;return makePerson(Object.assign({g:'f',h:.81+R()*.04,skin:pick(SKINS),top:pick(KAM),bot:pick(['#efe6d6','#2a2a2e','#e9dfd0','#d9c7b0']),kameez:true,
  orna:hij?null:pick(ORNA),trim:pick(ORNA),hs:hij?'hijab':(R()<.5?'bun':'long'),hijab:pick(HIJ),glasses:R()<.2,sandal:R()<.5,shoe:'#5a3d2b'},extra||{}));}
function mkAny(e){return R()<.38?mkWoman(e):mkMan(e);}

/* props */
function addCig(P){const g=P.gp(P.J.rHand,0,-.085,0);const c=P.pm(g,cylG(.0042,.0042,.075,8),mat('#f4f1ea',.6),0,0,.03);c.rotation.x=Math.PI/2;
  P.pm(g,cylG(.0045,.0045,.02,8),mat('#c98a3c',.6),0,0,-.005).rotation.x=Math.PI/2;P.cigTip=P.pm(g,US,new THREE.MeshBasicMaterial({color:lin('#ff6a2a')}),0,0,.068,.0048,.0048,.0048);P.cigGroup=g;P.cigBody=c;}
function addCup(P,hand){const g=P.gp(P.J[hand||'rHand'],0,-.09,.025);P.pm(g,cylG(.032,.025,.065,14),mat('#f7f5ef',.3),0,0,0);P.pm(g,cylG(.029,.029,.004,14),mat('#9a5a2b',.4),0,.026,0);}
function addPhone(P,hand){const g=P.gp(P.J[hand||'rHand'],0,-.085,.03);const b=P.pm(g,UB,mat('#15161a',.3,.2),0,0,0,.07,.14,.009);P.pm(g,UB,new THREE.MeshBasicMaterial({color:lin('#8fb8e6')}),0,0,.005,.062,.128,.002);P.phone=g;}

/* ================= smoke ================= */
const puffs=[];let pIdx=0;
function initSmoke(){for(let i=0;i<220;i++){const m=new THREE.SpriteMaterial({map:TX.smoke,transparent:true,depthWrite:false,opacity:0});const s=new THREE.Sprite(m);s.visible=false;scene.add(s);puffs.push({s,life:0,max:1,v:new THREE.Vector3(),size:.05,op:.4});}}
function puff(p,size,life,v,op){const q=puffs[pIdx=(pIdx+1)%puffs.length];q.s.position.copy(p);q.life=0;q.max=life;q.v.copy(v);q.size=size;q.op=op;q.s.visible=true;}
function updSmoke(dt){for(const q of puffs){if(!q.s.visible)continue;q.life+=dt;if(q.life>q.max){q.s.visible=false;continue;}const u=q.life/q.max;
  q.s.position.addScaledVector(q.v,dt);q.v.multiplyScalar(1-dt*1.2);q.v.y+=dt*.06;q.v.x+=dt*.04;const sc=q.size*(1+u*5);q.s.scale.set(sc,sc,sc);q.s.material.opacity=q.op*(1-u)*Math.min(1,u*8);}}
const _v=new THREE.Vector3(),_v2=new THREE.Vector3();

/* ================= disc physics (pool and carrom) ================= */
// table sound, quieter the further the camera is from the table
function tsnd(Tb,name,v){if(CATCH)return;const d=Math.hypot(camera.position.x-Tb.cx,camera.position.y-Tb.y,camera.position.z-Tb.cz);// walking: only heard inside the gaming room, silent everywhere else. orbit/top view: only when the camera is zoomed in close.
  let f;if(mode==='walk')f=lastZone==='game'?1:0;else f=d<16?Math.min(1,1.2-d/16):0;
  if(f<=0.02)return;sfx.play(Tb.snd+name,f*v);}
function stepDiscs(Tb,dt){const n=6,h=dt/n,B=Tb.balls;
  for(let s=0;s<n;s++){
    for(const b of B){if(!b.on)continue;const v=Math.hypot(b.vx,b.vz);
      if(v>0){const nv=v-Tb.decel*h-Tb.drag*v*h;if(nv<.006){b.vx=b.vz=0;}else{b.vx*=nv/v;b.vz*=nv/v;}}
      b.x+=b.vx*h;b.z+=b.vz*h;const sp0=Math.hypot(b.vx,b.vz);let wl=false;
      if(b.x>Tb.hx-b.r){b.x=Tb.hx-b.r;b.vx=-Math.abs(b.vx)*Tb.cr;wl=true;}if(b.x<-Tb.hx+b.r){b.x=-Tb.hx+b.r;b.vx=Math.abs(b.vx)*Tb.cr;wl=true;}
      if(b.z>Tb.hz-b.r){b.z=Tb.hz-b.r;b.vz=-Math.abs(b.vz)*Tb.cr;wl=true;}if(b.z<-Tb.hz+b.r){b.z=-Tb.hz+b.r;b.vz=Math.abs(b.vz)*Tb.cr;wl=true;}
      if(wl&&sp0>.08&&performance.now()>(Tb.hush||0))tsnd(Tb,'Wall',Math.min(1,.2+sp0/(Tb.snd==='pool'?3:1.5)));
      for(const p of Tb.pockets){if((b.x-p[0])*(b.x-p[0])+(b.z-p[1])*(b.z-p[1])<p[2]*p[2]){b.on=false;b.vx=b.vz=0;b.mesh.visible=false;Tb.potted.push(b);tsnd(Tb,'Pocket',1);break;}}}
    for(let i=0;i<B.length;i++){const a=B[i];if(!a.on)continue;for(let j=i+1;j<B.length;j++){const b=B[j];if(!b.on)continue;
      const dx=b.x-a.x,dz=b.z-a.z,rr=a.r+b.r,d2=dx*dx+dz*dz;if(d2>=rr*rr||d2<1e-12)continue;const d=Math.sqrt(d2),nx=dx/d,nz=dz/d,ov=rr-d,ia=1/a.m,ib=1/b.m;
      a.x-=nx*ov*ia/(ia+ib);a.z-=nz*ov*ia/(ia+ib);b.x+=nx*ov*ib/(ia+ib);b.z+=nz*ov*ib/(ia+ib);
      const rel=(a.vx-b.vx)*nx+(a.vz-b.vz)*nz;if(rel>0){if(rel>.04&&performance.now()>(Tb.hush||0))tsnd(Tb,(a.striker||b.striker)?'Strike':'Hit',Math.min(1,.2+rel/(Tb.snd==='pool'?3:1.5)));if(Tb.firstHit===null&&(a.cue||b.cue))Tb.firstHit=a.cue?b:a;const jj=(1+Tb.e)*rel/(ia+ib);a.vx-=jj*nx*ia;a.vz-=jj*nz*ia;b.vx+=jj*nx*ib;b.vz+=jj*nz*ib;}}}}}
function moving(Tb){return Tb.balls.some(b=>b.on&&(b.vx||b.vz));}
function standDist(Tb,cx,cz,dx,dz,ax,az){let t=1e9;if(Math.abs(dx)>1e-6){const tx=((-dx>0?ax:-ax)-cx)/(-dx);if(tx>0)t=Math.min(t,tx);}if(Math.abs(dz)>1e-6){const tz=((-dz>0?az:-az)-cz)/(-dz);if(tz>0)t=Math.min(t,tz);}return t;}
function rectParam(x,z,ax,az){const px=clamp(x,-ax,ax),pz=clamp(z,-az,az);const dR=ax-px,dL=px+ax,dB=az-pz,dT=pz+az,m=Math.min(dR,dL,dB,dT);
  if(m===dT)return px+ax;if(m===dR)return 2*ax+pz+az;if(m===dB)return 2*ax+2*az+(ax-px);return 4*ax+2*az+(az-pz);}
function rectPoint(s,ax,az){const L=4*(ax+az);s=((s%L)+L)%L;if(s<2*ax)return[-ax+s,-az];s-=2*ax;if(s<2*az)return[ax,-az+s];s-=2*az;if(s<2*ax)return[ax-s,az];s-=2*ax;return[-ax,az-s];}
function perimPath(cx,cz,ax,az,from,to){const f=[from[0]-cx,from[1]-cz],t=[to[0]-cx,to[1]-cz],L=4*(ax+az);const s0=rectParam(f[0],f[1],ax,az),s1=rectParam(t[0],t[1],ax,az);
  let d=s1-s0;if(d>L/2)d-=L;if(d<-L/2)d+=L;const pts=[rectPoint(s0,ax,az)];const n=Math.max(1,Math.ceil(Math.abs(d)/.3));for(let i=1;i<=n;i++)pts.push(rectPoint(s0+d*i/n,ax,az));pts.push(t);
  return pts.map(p=>[p[0]+cx,p[1]+cz]);}

/* ================= build the office ================= */
const PRES=[-10.6,3.8];
const ZONES=[
  {id:'work',bn:'ওয়ার্কস্পেস',en:'Workspace',what:'আয়তাকার অফিসের মাঝখানে, আগের আড়াই গুণ বড়। সফটওয়্যার ইঞ্জিনিয়ারদের ল্যাপটপে Claude আর মনিটরে VS Code, QA দের Excel বাগ লিস্ট আর ব্রাউজার, ডিজাইনারদের Excel আর Figma।',r:[-12.5,14.75,-13.5,.4],c:[1,-6.8],sp:[1,-12.5]},
  {id:'w2',bn:'ওয়ার্কস্পেস',en:'Workspace',r:[-16,18,-13.5,7.5],hide:true},
  {id:'lounge',bn:'গেস্ট লাউঞ্জ ১',en:'Guest lounge 1',what:'উপরের বাঁ কোণে, কাচের দেয়াল। দুজন অতিথি চা নিয়ে অপেক্ষা করছেন, একজন ফোনে।',r:[-16,-12.5,-13.5,-5.7],c:[-14.3,-9.6],sp:[-13,-8.8]},
  {id:'lounge2',bn:'গেস্ট লাউঞ্জ ২',en:'Guest lounge 2',what:'প্রথম লাউঞ্জ আর সিইও রুমের মাঝে, কাচের দেয়াল। তিনজন অতিথি চা নিয়ে গল্প করছেন, একজন ফোনে।',r:[-16,-12.5,-5.7,.3],c:[-14.3,-2.8],sp:[-12.1,-2.7]},
  {id:'ceo',bn:'সিইও রুম',en:'CEO room',what:'কাচের দেয়াল। বড় ডেস্কে স্যার ফোনে ব্যস্ত, পাশে সোফা আর বুকশেলফ।',r:[-16,-11.5,.3,7.5],c:[-13.8,3.9],sp:[-12.1,1.3]},
  {id:'conf',bn:'কনফারেন্স রুম',en:'Conference room',what:'প্রেজেন্টেশন চলছে, একজন ঘুমিয়ে পড়েছেন।',r:[-11.5,-4.1,2.5,7.5],c:[-7.8,5],sp:[-7.15,3.1]},
  {id:'game',bn:'গেমিং রুম',en:'Carrom and 8-ball pool',what:'বাঁ দিকে লম্বা স্ট্যান্ডের ক্যারম, চারজন দাঁড়িয়ে খেলছে আর দুজন দেখছে। ডান দিকে নীল পুল টেবিলে পুরো ৮-বল গেম চলছে।',r:[-4.1,5.2,2.5,7.5],c:[.5,5],sp:[.05,2.0]},
  {id:'wash',bn:'ওয়াশরুম',en:'Washroom',what:'উপরের ডান কোণে, ডাইনিংয়ের ঠিক উপরে একই লাইনে।',r:[14.75,18,-13.5,-10.5],c:[16.4,-12],sp:[14.2,-10.9]},
  {id:'dine',bn:'ডাইনিং',en:'Dining',what:'ডান দিকে ওয়াশরুমের নিচে, লম্বালম্বি। বাঁ পাশের দরজা ওয়ার্কস্পেসের মাঝের হাঁটার পথের সাথে এক লাইনে। ৬টা টেবিল, প্রতিটায় ৪টা বসার জায়গা, মাথার দিকে কিচেন কাউন্টার।',r:[14.75,18,-10.5,.5],c:[16.4,-4.5],sp:[14.2,-6.75]},
  {id:'hr',bn:'এইচআর রুম',en:'HR room',what:'নিচের ডান কোণে, ডাইনিংয়ের ঠিক নিচে। দুটো ঘোরানো টেবিলে দুজন এইচআর, প্রত্যেকের একটা মনিটরে Excel, সামনে একজন করে কর্মী বসে।',r:[14.75,18,.5,7.5],c:[16.4,4],sp:[14.2,4]},
  {id:'bal',bn:'বারান্দা',en:'Balcony',what:'গেমিং রুম থেকে এইচআর রুম পর্যন্ত লম্বা ঢাকা বারান্দা। তিনজন দাঁড়িয়ে সিগারেট, তিনজন বেতের চেয়ারে চা, দুজন প্ল্যান্টারের কিনারায় আর দুজন মেঝেতে বসে সিগারেট।',r:[-6.2,18.3,7.5,10.1],c:[6,8.7],sp:[2.5,8.5]},
  {id:'gate',bn:'মেইন গেট ও লিফট',en:'Main gate',what:'উপরের দেয়ালের ঠিক মাঝখানে, ঝাপসা কাচের বন্ধ দরজা। ভেতরে দরজার পাশে এক্সিট বাটন, বাইরে ফেস স্ক্যানার। হেঁটে দেখুন মোডে কাছে গিয়ে E চাপুন।',r:[-1.7,3.7,-15.9,-13.5],c:[1,-14.7],sp:[1,-14.2]}
];
// random numbers the pool and carrom controllers use. A live match swaps in a seeded one so both players see the same game.
let SRP=Math.random,SRC=Math.random,CATCH=false;   // CATCH: the ambient games are fast-forwarding, so stay quiet
const acts=[]; // {P, fn}
const DESKS=[];   // every desk seat [x,z,yaw,role]; .occ is set when someone sits there
let POOL,CARROM=null,TT=null,GATE=null;
const fans=[],traffic=[],BAL=[];   // BAL: the people on the balcony and their job (se / qa / des)

function build(){
  makeTextures();initSmoke();
  wallM=mat('#ece9e3',.92);frameM=mat('#1d1f22',.4,.4);
  glassM=new THREE.MeshStandardMaterial({color:lin('#c4dde4'),transparent:true,opacity:.16,roughness:.04,metalness:.1,depthWrite:false});
  outGlassM=new THREE.MeshStandardMaterial({color:lin('#a8cad6'),transparent:true,opacity:.26,roughness:.04,metalness:.2,depthWrite:false});
  // rectangular floor plate: x -16..18, z -13.5..7.5 (34 m x 21 m), main gate in the top wall
  const X0=-16,X1=18,Z0=-13.5,Z1=7.5,WX=X1-X0,WZ=Z1-Z0,CX=(X0+X1)/2,CZ=(Z0+Z1)/2,DXL=14.75;

  /* ---------- building shell (13th floor), entrance lobby ---------- */
  bx(null,WX+.3,.3,WZ+.3,CX,-.3,CZ,'#b9b4aa');bx(null,WX,12,WZ,CX,GY,CZ,'#cfc9bd');
  for(let f=0;f<4;f++){bx(null,.04,1.3,WZ-1,X1+.02,GY+1+f*3,CZ,'#4f6070',{cast:false});bx(null,WX-1,1.3,.04,CX,GY+1+f*3,Z1+.02,'#4f6070',{cast:false});bx(null,WX-1,1.3,.04,CX,GY+1+f*3,Z0-.02,'#4f6070',{cast:false});bx(null,.04,1.3,WZ-1,X0-.02,GY+1+f*3,CZ,'#4f6070',{cast:false});}
  bx(null,5.4,.3,2.4,1,-.3,Z0-1.2,'#b9b4aa');floor(-1.7,3.7,Z0-2.4,Z0,TX.marble,2,null,.004,.3);
  bx(wallsG,5.4,H,.12,1,0,Z0-2.4,wallM);addCol(-1.8,3.8,Z0-2.5,Z0-2.34);addCol(-1.82,-1.7,Z0-2.4,Z0);addCol(3.7,3.82,Z0-2.4,Z0);
  for(const x of [0,2]){bx(wallsG,1.05,2.3,.05,x,0,Z0-2.32,'#2a2d31');bx(wallsG,.47,2.1,.03,x-.24,0,Z0-2.29,mat('#aeb5bd',.25,.7),{cast:false});bx(wallsG,.47,2.1,.03,x+.24,0,Z0-2.29,mat('#aeb5bd',.25,.7),{cast:false});}
  {const P=mkWoman();place(P,1,Z0-1.4,Math.PI);P.v='scroll';addPhone(P);acts.push({P,fn:aScroll});addCol(.75,1.25,Z0-1.65,Z0-1.15);}

  /* ---------- floors ---------- */
  floor(-12.5,DXL,Z0,.4,TX.tile,1.2,null,.004,.14);floor(X0,-12.5,-5.7,.3,TX.dwood,2,'#e8dccb',.004,.45);floor(-11.5,5.2,.4,2.5,TX.tile,1.2,null,.004,.14);
  floor(5.2,DXL,.4,Z1,TX.tile,1.2,null,.004,.14);
  floor(.2,1.8,Z0,.4,TX.dwood,2,null,.007,.45);floor(-12.5,DXL,-.9,.1,TX.dwood,2,null,.008,.45);floor(-12.5,DXL,Z0,Z0+1.1,TX.dwood,2,null,.006,.45);floor(-12.5,DXL,-7.4,-6.2,TX.dwood,2,null,.006,.45);
  floor(X0,-12.5,Z0,-5.7,TX.dwood,2,'#e8dccb',.004,.45);floor(X0,-11.5,.3,Z1,TX.dwood,2,null,.004,.4);
  floor(-11.5,-4.1,2.5,Z1,TX.dwood,2,null,.004,.45);floor(-4.1,5.2,2.5,Z1,TX.dwood,2,null,.004,.45);floor(DXL,X1,.5,Z1,TX.carpet,1.2,'#d6d0e0',.004);
  floor(DXL,X1,-10.5,.5,TX.tile,1.2,null,.009,.14);floor(DXL,X1,Z0,-10.5,TX.white,.9,null,.009);
  bx(null,24.5,.3,2.7,6.05,-.3,8.85,'#a99f8c');floor(-6.2,18.3,7.5,10.1,TX.btile,1.2,null,.004,.35);

  /* ---------- exposed ceiling, cove soffits, pendants, flags ---------- */
  /* ceiling from your video: raw concrete slab, grey cove-lit beams, black square ducts, red sprinkler pipes, round cassette ACs, dome pendants */
  {const ct=TX.cceil.clone();ct.needsUpdate=true;ct.wrapS=ct.wrapT=THREE.RepeatWrapping;ct.repeat.set(WX/4,WZ/4);const ceil=plane(tallG,WX,WZ,CX,H,CZ,new THREE.MeshStandardMaterial({map:ct,roughness:.95}),0,Math.PI/2);ceil.receiveShadow=false;}
  const duct=mat('#1b1c1f',.55,.3),pipe=mat('#c0262c',.5,.2);
  for(const x of [-9,-1,4.5,11])bx(tallG,.45,.32,13.5,x,H-.38,-6.75,duct);
  for(const z of [-9.6,-3.4])bx(tallG,27,.28,.4,1.125,H-.34,z,duct);
  for(const z of [-11.2,-5.0,-1.6]){const p=new THREE.Mesh(UC,pipe);p.scale.set(.03,27,.03);p.rotation.z=Math.PI/2;p.position.set(1.125,H-.14,z);tallG.add(p);for(let x=-12;x<14.5;x+=3){const d=new THREE.Mesh(UC,pipe);d.scale.set(.012,.22,.012);d.position.set(x,H-.25,z);tallG.add(d);}}
  const sof=mat('#7c7f84',.9),cove=new THREE.MeshBasicMaterial({color:lin('#ffb15a')}),dlM=new THREE.MeshBasicMaterial({color:lin('#fffaf0')});
  bx(tallG,1.3,.3,13.9,1,H-.32,-6.55,sof);bx(tallG,.04,.03,13.9,.33,H-.31,-6.55,cove,{cast:false});bx(tallG,.04,.03,13.9,1.67,H-.31,-6.55,cove,{cast:false});
  bx(tallG,27.25,.3,1.1,1.125,H-.32,-.4,sof);bx(tallG,27.25,.03,.04,1.125,H-.31,-.97,cove,{cast:false});bx(tallG,27.25,.03,.04,1.125,H-.31,.17,cove,{cast:false});
  bx(tallG,27.25,.3,1.1,1.125,H-.32,-6.8,sof);bx(tallG,27.25,.03,.04,1.125,H-.31,-7.37,cove,{cast:false});bx(tallG,27.25,.03,.04,1.125,H-.31,-6.23,cove,{cast:false});
  for(let z=-13;z<0;z+=1.8)plane(tallG,.14,.14,1,H-.325,z,dlM,0,Math.PI/2);for(let x=-12;x<14.5;x+=2.2){plane(tallG,.14,.14,x,H-.325,-.4,dlM,0,Math.PI/2);plane(tallG,.14,.14,x,H-.325,-6.8,dlM,0,Math.PI/2);}
  const MCX=[-10.9,-6.6,-2.3,4.0,8.3,12.6];
  const shade=matD('#2a2b2e',.35,{}),bulb=new THREE.MeshBasicMaterial({color:lin('#fffdf4')});
  const pendant=(x,z)=>{bx(tallG,.006,.55,.006,x,H-.55,z,'#111',{cast:false});const sh=new THREE.Mesh(sphPart('dome',0,Math.PI*2,0,Math.PI*.5),shade);sh.scale.set(.18,.14,.18);sh.position.set(x,H-.62,z);tallG.add(sh);
    const b=new THREE.Mesh(US,bulb);b.scale.set(.06,.04,.06);b.position.set(x,H-.63,z);tallG.add(b);plane(tallG,.3,.3,x,H-.625,z,bulb,0,Math.PI/2);};
  for(const cx of MCX)for(const z of [-10.6,-8.2,-4.6,-2.2])pendant(cx,z);
  const ac=(x,z)=>{const g=grp(tallG,x,0,z);bx(g,.55,.3,.55,0,H-.62,0,'#202124');for(const a of [-.2,.2])bx(g,.03,.3,.03,a,H-.34,a,'#202124',{cast:false});
    const body=new THREE.Mesh(UC,mat('#f2f2ef',.4));body.scale.set(.42,.1,.42);body.position.y=H-.67;g.add(body);
    const ring=new THREE.Mesh(torusG(.33,.02),mat('#2a2c30',.4));ring.rotation.x=Math.PI/2;ring.position.y=H-.725;g.add(ring);
    const gr=new THREE.Mesh(UP,new THREE.MeshStandardMaterial({map:TX.grille,roughness:.6}));gr.scale.set(.56,.56,1);gr.rotation.x=Math.PI/2;gr.position.y=H-.722;g.add(gr);};
  for(const x of [-10.2,-3.6,.6,4.8,9.0,12.9])for(const z of [-9.6,-3.4])ac(x+1.8,z);
  for(const [x,z] of [[-14.3,-9.6],[-14.3,-2.8],[-13.8,3.9],[-7.8,5],[-1.8,5],[2.6,5],[16.4,-12],[16.4,-6.5],[16.4,-1.8],[16.4,2.5],[16.4,5.5],[8.6,3.4],[12.4,3.4]])ac(x,z);
  const lin_=new THREE.MeshBasicMaterial({color:lin('#f7f9ff')});for(const [x,z,l] of [[-7.8,4,3],[-7.8,6,3],[-1.8,4,2.5],[2.6,4,2.5],[2.6,6,2.5],[-1.8,6,2.5]])bx(tallG,l,.03,.06,x,H-.1,z,lin_,{cast:false});
  const FC=[['#d52b1e','#ffffff'],['#006a4e','#f42a41'],['#012169','#c8102e'],['#000000','#ffce00'],['#0055a4','#ef4135'],['#006aa7','#fecc00'],['#ff9933','#138808'],['#bc002d','#ffffff'],['#3c3b6e','#b22234'],['#009246','#ce2b37']];
  for(const [cx,za,zb] of [[-10.9,-13,-.6],[-6.6,-13,-.6],[-2.3,-13,-.6],[4.0,-13,-.6],[8.3,-13,-.6],[12.6,-13,-.6],[1,-13,0]])for(let z=za,i=0;z<zb;z+=.34,i++){const c=FC[(i+Math.abs(Math.round(cx)))%FC.length];const g=grp(tallG,cx,H-.42-Math.sin((z-za)/1.8*Math.PI)*.05,z,Math.PI/2);
    plane(g,.26,.09,0,.045,0,matD(c[0],.8),0);plane(g,.26,.09,0,-.045,0,matD(c[1],.8),0);}

  /* ---------- walls (from your layout sketch) ---------- */
  wline('x',Z0,X0,X1,[[.3,1.7]]);wline('x',Z1,X0,X1,[[2,3],[16.6,17.4]],'full');
  wline('z',X0,Z0,Z1,[],'full');wline('z',X1,Z0,-10.5,[]);wline('z',X1,-10.5,Z1,[],'full');
  wline('z',-12.5,Z0,.3,[[-9.3,-8.3],[-3.2,-2.2]],'glass');wline('x',-5.7,X0,-12.5,[],'glass');wline('x',.3,X0,-11.5,[],'glass');wline('z',-11.5,.3,2.5,[[.8,1.8]],'glass');wline('z',-11.5,2.5,Z1,[]);
  wline('x',2.5,-11.5,-4.1,[[-7.6,-6.7]],'glass');wline('z',-4.1,2.5,Z1,[]);
  wline('x',2.5,-4.1,5.2,[[-.4,.5]],'glass');wline('z',5.2,2.5,Z1,[],'glass');
  wline('z',DXL,Z0,-10.5,[[-11.25,-10.6]]);wline('x',-10.5,DXL,X1,[]);wline('z',DXL,-10.5,.5,[[-7.2,-6.3]],'glass');wline('x',.5,DXL,X1,[]);
  wline('z',DXL,.5,Z1,[[3.6,4.4]]);
  /* main gate: closed frosted glass sliding doors, exit button inside, face scanner outside */
  {const frost=new THREE.MeshStandardMaterial({color:lin('#e3ecef'),map:TX.frost,transparent:true,opacity:.93,roughness:.6,metalness:.05}),fr=mat('#1a1b1e',.4,.5),hd=mat('#c9ced3',.25,.9);
    const leaf=(x)=>{const g=grp(wallsG,x,0,Z0);const m=new THREE.Mesh(UB,frost);m.scale.set(.68,2.3,.03);m.position.y=1.17;g.add(m);
      for(const [w,h,px,py] of [[.7,.04,0,2.32],[.7,.04,0,.02],[.04,2.32,-.33,1.17],[.04,2.32,.33,1.17]]){const f=new THREE.Mesh(UB,fr);f.scale.set(w,h,.045);f.position.set(px,py,0);g.add(f);}
      const h=new THREE.Mesh(UB,hd);h.scale.set(.025,.7,.06);h.position.set(x<1?.26:-.26,1.05,0);g.add(h);return g;};
    const L=leaf(.65),Rr=leaf(1.35);const col=[.3,1.7,Z0-.07,Z0+.07];colliders.push(col);
    bx(wallsG,1.6,.12,.2,1,2.32,Z0,fr,{cast:false});
    const bp=grp(wallsG,2.0,1.15,Z0+.075);const plate=new THREE.Mesh(UB,mat('#f2f2ef',.4));plate.scale.set(.09,.13,.015);bp.add(plate);
    const btn=new THREE.Mesh(UC,new THREE.MeshStandardMaterial({color:lin('#2fa84f'),emissive:lin('#0a3a18'),roughness:.4}));btn.scale.set(.03,.02,.03);btn.rotation.x=Math.PI/2;btn.position.set(0,.01,.012);bp.add(btn);
    const lab=new THREE.Mesh(UP,new THREE.MeshBasicMaterial({map:TX.exitLbl,transparent:true}));lab.scale.set(.08,.03,1);lab.position.set(0,-.045,.009);bp.add(lab);
    const sc=grp(wallsG,-.05,1.45,Z0-.075);const body=new THREE.Mesh(UB,mat('#111215',.35,.3));body.scale.set(.15,.24,.03);sc.add(body);
    const scr=new THREE.Mesh(UP,TX.faceIdle);scr.scale.set(.12,.17,1);scr.rotation.y=Math.PI;scr.position.set(0,.01,-.016);sc.add(scr);
    const cam=new THREE.Mesh(US,mat('#000',.1));cam.scale.set(.008,.008,.004);cam.position.set(0,.105,-.016);sc.add(cam);
    [L,Rr,bp,sc].forEach(g=>g.traverse(o=>{if(o.isMesh)o.userData.noMerge=true;}));GATE={L,R:Rr,col,open:0,target:0,timer:0,btn,scr,scan:0,btnT:0};}
  fpanel(-6.1,Z0+.065,12.8,0);fpanel(3.35,Z0+.065,3.3,0);fpanel(11.875,Z0+.065,5.75,0);
  plane(wallsG,4,H-.05,7,H/2,Z0+.065,new THREE.MeshStandardMaterial({map:TX.logo,roughness:.7}),0);
  plane(wallsG,4.96,H-.05,-11.435,H/2,5,new THREE.MeshStandardMaterial({map:TX.values,roughness:.7}),Math.PI/2);
  const elM=new THREE.MeshBasicMaterial({map:TX.el,transparent:true});
  for(let x=-3.7;x<5;x+=1.4){if(Math.abs(x-.05)<.6)continue;plane(wallsG,.26,.26,x,1.45,2.47,elM,Math.PI);}
  for(let x=-11;x<-4.3;x+=1.4){if(Math.abs(x+7.15)<.6)continue;plane(wallsG,.26,.26,x,1.45,2.47,elM,Math.PI);}
  for(let z=-9.8;z<0;z+=1.4)plane(wallsG,.26,.26,DXL-.03,1.45,z,elM,-Math.PI/2);
  for(const z of [-11,-8.6,-4.2,-1.8]){bx(tallG,.006,.5,.006,1,H-.5,z,'#111',{cast:false});const d=new THREE.Mesh(UC,elM);d.scale.set(.32,.012,.32);d.rotation.z=Math.PI/2;d.position.set(1,H-.75,z);tallG.add(d);}
  for(const [x,z] of [[-8.75,-7.15],[-4.45,-7.15],[6.15,-7.15],[10.45,-7.15]])cy(wallsG,.3,H,x,0,z,'#9b968d',{col:true});

  /* ---------- open workspace: bench clusters with role-based screens ---------- */
  const roleOf=()=>{const r=R();return r<.55?'se':r<.8?'qa':'des';};const seats=DESKS;
  const cluster=(cx,zs)=>{for(const z of zs){const r1=roleOf(),r2=roleOf();deskR(cx-.36,z,Math.PI/2,r1);deskR(cx+.36,z,-Math.PI/2,r2);seats.push([cx-1.11,z,Math.PI/2,r1]);seats.push([cx+1.11,z,-Math.PI/2,r2]);}};
  for(const cx of MCX)cluster(cx,[-11.4,-9.8,-8.2,-5.4,-3.8,-2.2]);
  cluster(8.6,[1.8,3.4,5.0]);cluster(12.4,[1.8,3.4,5.0]);
  seats.forEach((s,i)=>{if(R()>.45)return;s.occ=true;const P=mkAny();s.npc=P;place(P,s[0],s[1],s[2]);P.role=s[3];P.kbd=.6;P.v=(i%11===5)?'phone':'type';if(P.v==='phone')addPhone(P);acts.push({P,fn:aType});});
  plant(-12.1,Z0+.5,1.1);plant(DXL-.4,Z0+.5,1.1);plant(-12.1,-6.8,1);
  cy(null,.16,1.05,14.4,0,-13.15,'#dfe8ee',{col:true});cy(null,.14,.32,14.4,1.05,-13.15,'#7fb4d9');bx(null,.6,1,.6,14.35,0,6.9,'#c9ccd0',{col:true});bx(null,.5,.02,.32,14.3,1,6.9,'#fbfbf8');
  {const a=mkMan({sleeve:'short'}),b=mkWoman();place(a,13.55,-12.95,Math.PI*.4);place(b,14.3,-12.4,-Math.PI*.8);addCup(a);addCup(b);acts.push({P:a,fn:aTeaStand});acts.push({P:b,fn:aTeaStand});addCol(13.3,14.55,-13.2,-12.15);}
  bx(null,.8,.42,2,5.7,0,6.2,'#5b6e7a',{col:true});bx(null,.2,.45,2,5.36,.42,6.2,'#5b6e7a');bx(null,.6,.38,.6,6.6,0,6.2,'#8a6a4a',{col:true});
  {const P=mkWoman();place(P,5.85,6.0,Math.PI/2);P.v='lap';acts.push({P,fn:aSofaLaptop});}
  plant(6.6,7.1,1.1);plant(14.3,7.1,1);
  // strip in front of the conference room: bar counter and whiteboard huddle
  bx(null,2.4,.05,.5,-9.4,1.02,2.15,'#4a3526',{col:true});for(const x of [-10.5,-8.3])bx(null,.05,1.02,.05,x,0,2.15,'#1a1a1a',{cast:false});
  for(const x of [-10.2,-8.6]){cy(null,.17,.04,x,.74,1.6,'#1d1e20');cy(null,.025,.74,x,0,1.6,'#1d1e20',{cast:false});const P=mkAny();place(P,x,1.6,0);P.v='type';P.seat=.76;P.kbd=.47;P.kbY=1.1;acts.push({P,fn:aType});laptop(x,2.1,0,x<-9?0:1,1.07);}
  {const g=grp(staticG,-5.2,0,2.25,Math.PI);for(const a of [-.75,.75]){bx(g,.04,1.9,.04,a,0,0,'#9aa0a8');bx(g,.4,.03,.04,a,0,0,'#9aa0a8');}bx(g,1.6,1,.03,0,.9,0,'#e9ecee');plane(g,1.54,.94,0,1.4,.02,new THREE.MeshStandardMaterial({map:TX.wb,roughness:.3}),0);addCol(-6.05,-4.35,2.1,2.4);}
  {const a=mkMan({top:'#ffffff',tie:'#1f3b6e'}),b=mkWoman(),c=mkMan({glasses:true});place(a,-6.35,1.75,Math.PI+.4);place(b,-5.55,.95,-.1);place(c,-4.7,1.0,-.45);
    a.v='point';b.v='listen';c.v='listen';[a,b,c].forEach(P=>{acts.push({P,fn:aHuddle});addCol(P.x-.22,P.x+.22,P.z-.22,P.z+.22);});}

  
  /* ---------- guest lounge ---------- */
  bx(null,.85,.42,2.6,-15.5,0,-9.6,'#6f5848',{col:true});bx(null,.22,.45,2.6,-15.82,.42,-9.6,'#6f5848');bx(null,.85,.2,.2,-15.5,.42,-10.85,'#6f5848');bx(null,.85,.2,.2,-15.5,.42,-8.35,'#6f5848');
  for(const z of [-10.2,-9.0])bx(null,.6,.08,.55,-15.45,.42,z,'#7d6352');
  bx(null,.9,.4,.55,-14.3,0,-9.6,'#3a2a20',{col:true});cy(null,.04,.09,-14.1,.4,-9.5,'#ffffff');
  bx(null,.75,.42,.75,-13.25,0,-9.6,'#4d6b74',{col:true});bx(null,.18,.45,.75,-12.96,.42,-9.6,'#4d6b74');
  bx(null,1.6,.006,2.2,-14.4,.005,-9.6,'#8f7b66',{cast:false});plant(-15.5,-12.9,1.2);plant(-15.5,-6.4,1.1);
  {const a=mkMan({tie:'#7e2c3a',top:'#ffffff'}),b=mkWoman();place(a,-15.35,-10.2,Math.PI/2);place(b,-15.35,-9.0,Math.PI/2);addCup(a);addCup(b);a.ph=b.ph+5;acts.push({P:a,fn:aChatSit});acts.push({P:b,fn:aChatSit});}
  {const P=mkMan({glasses:true});place(P,-13.35,-9.6,-Math.PI/2);P.v='phone';addPhone(P);acts.push({P,fn:aMeet});}

    /* ---------- guest lounge 2: fills the space down to the CEO room ---------- */
  bx(null,.85,.42,2.6,-15.5,0,-2.8,'#4f5d6b',{col:true});bx(null,.22,.45,2.6,-15.82,.42,-2.8,'#4f5d6b');bx(null,.85,.2,.2,-15.5,.42,-4.05,'#4f5d6b');bx(null,.85,.2,.2,-15.5,.42,-1.55,'#4f5d6b');
  for(const z of [-3.4,-2.2])bx(null,.6,.08,.55,-15.45,.42,z,'#5d6c7a');
  bx(null,.9,.38,.6,-14.3,0,-2.8,'#d8cdb9',{col:true});cy(null,.04,.09,-14.15,.38,-2.7,'#ffffff');bx(null,.3,.02,.22,-14.45,.38,-2.95,'#c9a227',{cast:false});
  for(const z of [-3.5,-2.1]){bx(null,.75,.42,.75,-13.2,0,z,'#c98a46',{col:true});bx(null,.18,.45,.75,-12.9,.42,z,'#c98a46');}
  bx(null,2.2,.006,2.6,-14.3,.005,-2.8,'#6b7d8a',{cast:false});plant(-15.5,-5.2,1.1);plant(-15.5,-.3,1.1);plant(-13.0,-.2,.9);
  {const a=mkMan({top:'#cfe0f2'}),b=mkMan({tie:'#1f3b6e',top:'#ffffff',glasses:true});place(a,-15.35,-3.4,Math.PI/2);place(b,-15.35,-2.2,Math.PI/2);addCup(a);addCup(b);b.ph=a.ph+4;acts.push({P:a,fn:aChatSit});acts.push({P:b,fn:aChatSit});}
  {const P=mkWoman();place(P,-13.3,-3.5,-Math.PI/2);P.v='phone';addPhone(P);acts.push({P,fn:aMeet});}
  {const P=mkMan({sleeve:'short'});place(P,-13.3,-2.1,-Math.PI/2);addCup(P);P.seat=.45;acts.push({P,fn:aChatSit});}

  /* ---------- CEO room ---------- */
  bx(null,2.1,.05,.95,-13.8,.74,3.6,'#3b2a1f',{col:true});bx(null,2.1,.74,.06,-13.8,0,3.15,'#2e2119');bx(null,.06,.74,.9,-14.82,0,3.6,'#2e2119');bx(null,.06,.74,.9,-12.78,0,3.6,'#2e2119');
  bx(null,.6,.35,.03,-14.2,.92,3.85,'#111');plane(null,.56,.31,-14.2,1.095,3.83,TX.screens[3],Math.PI);
  oChair(-13.8,4.55,Math.PI);
  {const P=mkMan({top:'#2e3a59',bot:'#1e1f24',tie:'#7e2c3a',hs:'bald',hair:'#5b5550',mous:true,h:.91});place(P,-13.8,4.45,Math.PI);P.v='phone';addPhone(P);acts.push({P,fn:aType});}
  oChair(-14.3,2.55,0);oChair(-13.3,2.55,0);
  bx(null,.8,.42,2,-15.5,0,6.2,'#2b2b2b',{col:true});bx(null,.2,.45,2,-15.85,.42,6.2,'#2b2b2b');bx(null,.6,.35,.6,-14.6,0,6.2,'#5a3e2b',{col:true});
  bx(wallsG,.4,2,2.2,-15.75,0,1.6,'#5a3e2b',{col:true});for(let r=0;r<4;r++)for(let i=0;i<8;i++)bx(wallsG,.26,.3,.07+((i*7+r)%3)*.02,-15.62,.12+r*.48,.65+i*.24,pick(['#2f6db5','#b3261e','#1d6f42','#e8dcb5','#5b2a86']),{cast:false});
  plant(-12.0,7.0,1.2);

    /* ---------- conference room ---------- */
  bx(null,3.4,.05,1.2,-7.8,.72,5,'#3a3d42',{col:true});bx(null,.25,.72,.6,-8.8,0,5,'#1d1e20');bx(null,.25,.72,.6,-6.8,0,5,'#1d1e20');
  bx(null,.05,.95,1.7,-11.4,.95,5,'#111');plane(null,1.62,.88,-11.37,1.42,5,TX.tv,Math.PI/2);
  for(const x of [-8.9,-7.8,-6.7]){oChair(x,3.98,0);oChair(x,6.02,Math.PI);}
  laptop(-6.7,4.65,0,0);laptop(-8.9,5.35,Math.PI,2);
  for(const [v,x,z,yw] of [['listen',-8.9,4.08,0],['sleep',-7.8,4.08,0],['laptop',-6.7,4.08,0],['phone',-8.9,5.92,Math.PI],['listen',-7.8,5.92,Math.PI]]){const P=v==='sleep'?mkMan():mkAny();place(P,x,z,yw);P.v=v;if(v==='laptop'){P.kbd=.48;P.kbY=.785;}if(v==='phone')addPhone(P);acts.push({P,fn:aMeet});}
  {const P=mkMan({top:'#ffffff',bot:'#2a2f3a',tie:'#7e2c3a',glasses:true,h:.9});place(P,PRES[0],PRES[1],Math.PI*.42);P.v='present';acts.push({P,fn:aMeet});addCol(PRES[0]-.25,PRES[0]+.25,PRES[1]-.25,PRES[1]+.25);}

    /* ---------- game room: blue 8-ball pool table and a standing carrom board ---------- */
  const PT={snd:'pool',cx:2.6,cz:5,hx:1.27,hz:.635,y:.79,decel:.32,drag:.22,cr:.75,e:.93,balls:[],potted:[],firstHit:null};
  PT.pockets=[[-PT.hx,-PT.hz,.07],[PT.hx,-PT.hz,.07],[-PT.hx,PT.hz,.07],[PT.hx,PT.hz,.07],[0,-PT.hz,.055],[0,PT.hz,.055]];
  {const wood=mat('#17181a',.45),x=PT.cx,z=PT.cz;bx(null,2.84,.16,1.57,x,.62,z,wood,{col:true});
    for(const a of [-1.2,0,1.2])for(const b of [-.65,.65])bx(null,.14,.62,.14,x+a,0,z+b,wood);
    plane(null,2.6,1.33,x,.785,z,new THREE.MeshStandardMaterial({map:TX.feltB,roughness:.95}),0,-Math.PI/2);
    bx(null,2.84,.05,.14,x,.775,z-.785+.07,wood);bx(null,2.84,.05,.14,x,.775,z+.785-.07,wood);bx(null,.14,.05,1.57,x-1.42+.07,.775,z,wood);bx(null,.14,.05,1.57,x+1.42-.07,.775,z,wood);
    const cush=mat('#154a86',.9);bx(null,2.54,.035,.04,x,.79,z-PT.hz-.02,cush);bx(null,2.54,.035,.04,x,.79,z+PT.hz+.02,cush);bx(null,.04,.035,1.27,x-PT.hx-.02,.79,z,cush);bx(null,.04,.035,1.27,x+PT.hx+.02,.79,z,cush);
    for(const p of PT.pockets)cy(null,.062,.012,x+p[0]*1.01,.79,z+p[1]*1.02,'#0c0c0c',{cast:false});
    for(let i=1;i<8;i++){sp(null,.008,.004,.008,x-1.27+i*2.54/8,.828,z-.75,'#efe6cc',{cast:false});sp(null,.008,.004,.008,x-1.27+i*2.54/8,.828,z+.75,'#efe6cc',{cast:false});}
    bx(tallG,1.9,.12,.42,x,1.9,z,'#151618');plane(tallG,1.84,.36,x,1.899,z,new THREE.MeshBasicMaterial({color:lin('#fff6d8')}),0,Math.PI/2);bx(tallG,.015,.9,.015,x-.6,2.02,z,'#333',{cast:false});bx(tallG,.015,.9,.015,x+.6,2.02,z,'#333',{cast:false});}
  const COL={1:'#f2c230',2:'#1f4fb5',3:'#c9262c',4:'#5b2a86',5:'#ee7a1f',6:'#1d7f47',7:'#7a1f26',8:'#151515'};
  const cueBall={r:.0286,m:1,on:true,x:-PT.hx/2,z:0,vx:0,vz:0,cue:true,n:0};PT.balls.push(cueBall);
  for(let n=1;n<=15;n++)PT.balls.push({r:.0286,m:1,on:true,x:0,z:0,vx:0,vz:0,n,kind:n<8?'solid':n>8?'stripe':'eight'});
  for(const b of PT.balls){let m;if(b.cue)m=mat('#f8f6ee',.2);else{const c=COL[b.n>8?b.n-8:b.n];
      m=new THREE.MeshStandardMaterial({roughness:.18,map:ctex(128,64,(g)=>{g.fillStyle=b.n>8?'#f8f6ee':c;g.fillRect(0,0,128,64);if(b.n>8){g.fillStyle=c;g.fillRect(0,17,128,30);}
        for(const cx of [32,96]){g.fillStyle='#f8f6ee';g.beginPath();g.ellipse(cx,32,11,13,0,0,7);g.fill();g.fillStyle='#111';g.font='700 15px Arial';g.textAlign='center';g.fillText(String(b.n),cx,37);}})});}
    b.mesh=new THREE.Mesh(new THREE.SphereGeometry(b.r,18,14),m);b.mesh.castShadow=true;scene.add(b.mesh);}
  function rack(){const fx=PT.hx/2,r=.0286,pos=[];for(let row=0;row<5;row++)for(let j=0;j<=row;j++)pos.push([fx+row*r*1.74,(j-row/2)*r*2.02,row,j]);
    const solids=[2,3,4,5,6,7].sort(()=>SRP()-.5),stripes=[9,10,11,12,13,14].sort(()=>SRP()-.5);
    const order=pos.map(([x,z,row,j])=>{if(row===0)return 1;if(row===2&&j===1)return 8;if(row===4&&j===0)return 15;if(row===4&&j===4)return solids.pop();return null;});
    const rest_=solids.concat(stripes).sort(()=>SRP()-.5);for(let i=0;i<order.length;i++)if(order[i]===null)order[i]=rest_.pop();
    pos.forEach(([x,z],i)=>{const b=PT.balls.find(q=>q.n===order[i]);b.on=true;b.mesh.visible=true;b.vx=b.vz=0;b.x=x;b.z=z;b.mesh.rotation.set(SRP()*6,SRP()*6,0);});
    cueBall.on=true;cueBall.mesh.visible=true;cueBall.x=-PT.hx/2;cueBall.z=0;cueBall.vx=cueBall.vz=0;}
  rack();
  const cues=[0,1].map(()=>{const g=new THREE.Group();const sh=new THREE.Mesh(cylG(.0065,.012,1.0,10),mat('#d2ae72',.5));sh.rotation.x=Math.PI/2;sh.position.z=-.5;g.add(sh);
    const bt=new THREE.Mesh(cylG(.012,.015,.45,10),mat('#2a1a10',.4));bt.rotation.x=Math.PI/2;bt.position.z=-1.225;g.add(bt);const tp=new THREE.Mesh(cylG(.0066,.0066,.012,8),mat('#3d6fb0'));tp.rotation.x=Math.PI/2;g.add(tp);
    g.traverse(o=>{if(o.isMesh)o.castShadow=true;});scene.add(g);return g;});
  const pA=mkMan({sleeve:'short',top:'#2f3a4f',bot:'#1e1f24'}),pB=mkMan({top:'#cfe0f2'});
  POOL={T:PT,cue:cueBall,players:[pA,pB],cues,wait:[[4.75,3.1],[4.75,6.9]],shooter:0,state:'plan',t:0,shot:null,breakNext:true,wasBreak:false,ballInHand:false,
    groups:[null,null],wins:[0,0],games:1,breaker:0,msg:PN[0]+' ব্রেক করবে।',rack,ax:1.8,az:1.17};
  place(pA,.8,5,Math.PI/2);place(pB,4.75,6.9,-2.2);pA.speed=pB.speed=1.05;
  // video props: concrete columns, cue rack, bean bags, poufs, storage bench
  for(const [x,z] of [[-3.7,7.1]])cy(wallsG,.3,H,x,0,z,'#9b968d',{col:true});
  bx(wallsG,.05,.5,.03,-3.7,1.5,6.77,'#2a2a2a',{cast:false});for(let i=0;i<4;i++)cy(null,.012,1.45,-3.85+i*.1,0,6.74,i%2?'#c9a46a':'#a8743c',{cast:false});
  for(const [x,c] of [[3.6,'#f2f0ea'],[-2.7,'#f2f0ea']]){sp(null,.42,.3,.4,x,.28,7.0,c);sp(null,.3,.12,.28,x,.5,6.95,'#e2622b',{cast:false});}
  for(const x of [-.6,1.4])cy(null,.22,.42,x,0,7.1,'#d9662b');
  bx(null,1.0,.45,.45,.45,0,7.2,'#e3d3b4',{col:true});
  // standing carrom board on a chrome X-stand
  const CT={snd:'carrom',cx:-1.8,cz:5,hx:.37,hz:.37,y:.975,decel:.55,drag:.6,cr:.68,e:.85,balls:[],potted:[]};
  CT.pockets=[[-.37,-.37,.034],[.37,-.37,.034],[-.37,.37,.034],[.37,.37,.034]];
  {const x=CT.cx,z=CT.cz,chrome=mat('#c9ced3',.25,.9),fr=mat('#a4522a',.45);
    for(const s of [-1,1]){rod(x-.42,0,z+s*.38,x+.42,.93,z+s*.38,.012,chrome);rod(x+.42,0,z+s*.38,x-.42,.93,z+s*.38,.012,chrome);rod(x+s*.38,0,z-.42,x+s*.38,.93,z+.42,.012,chrome);}
    bx(null,.9,.03,.9,x,.93,z,'#6b3a20',{col:true});plane(null,.76,.76,x,.977,z,new THREE.MeshStandardMaterial({map:TX.carrom,roughness:.35}),0,-Math.PI/2);
    for(const s of [-1,1]){bx(null,.92,.06,.08,x,.94,z+s*.42,fr);bx(null,.08,.06,.76,x+s*.42,.94,z,fr);}
    bx(null,.12,.32,.01,x+.2,.62,z+.385,'#f4f4f2',{rz:.15,cast:false});}
  const coinR=.0159,coins=[],ringPos=[[0,0]];for(let i=0;i<6;i++){const a=i*Math.PI/3;ringPos.push([Math.cos(a)*2.02*coinR,Math.sin(a)*2.02*coinR]);}
  for(let i=0;i<6;i++){const a=i*Math.PI/3;ringPos.push([Math.cos(a)*4.04*coinR,Math.sin(a)*4.04*coinR]);const b=a+Math.PI/6;ringPos.push([Math.cos(b)*3.5*coinR,Math.sin(b)*3.5*coinR]);}
  ringPos.forEach((p,i)=>{const col=i===0?'#c3262c':(i%2?'#f1e3c0':'#1b1715');const b={r:coinR,m:1,on:true,x:p[0],z:p[1],vx:0,vz:0,home:p};b.mesh=new THREE.Mesh(cylG(coinR,coinR,.008,18),mat(col,.35));b.mesh.castShadow=true;scene.add(b.mesh);CT.balls.push(b);coins.push(b);});
  const striker={r:.0206,m:1.6,on:true,x:0,z:.27,vx:0,vz:0,striker:true};striker.mesh=new THREE.Mesh(cylG(.0206,.0206,.009,22),mat('#f7f4ec',.25));striker.mesh.castShadow=true;scene.add(striker.mesh);CT.balls.push(striker);
  const cps=[mkMan({sleeve:'short'}),mkWoman(),mkMan(),mkMan({top:'#e9d9e6'})],cpos=[[0,.72,Math.PI],[.72,0,-Math.PI/2],[0,-.72,0],[-.72,0,Math.PI/2]];
  cps.forEach((P,i)=>{place(P,CT.cx+cpos[i][0],CT.cz+cpos[i][1],cpos[i][2]);addCol(P.x-.22,P.x+.22,P.z-.22,P.z+.22);});
  const wts=[mkWoman(),mkMan({glasses:true})];place(wts[0],-3.5,4.1,1.08);place(wts[1],-3.5,5.9,2.06);wts.forEach(P=>addCol(P.x-.22,P.x+.22,P.z-.22,P.z+.22));
  CARROM={T:CT,coins,striker,players:cps,watchers:wts,turn:0,state:'place',t:0,shot:null,buzz:0};

    /* ---------- dining: right column under the washroom, rotated ---------- */
  {const top=mat('#dcc9a8',.55),leg=mat('#f1f1ee',.4,.2),plateM=mat('#f8f8f4',.3),riceM=mat('#fbfbf6',.9),curM=mat('#b5651d',.6),cM=new THREE.MeshStandardMaterial({map:TX.conc,roughness:.9});
    plane(wallsG,3.25,H-.05,16.375,H/2,-10.435,cM,0);plane(wallsG,11,H-.05,17.935,H/2,-5,cM,-Math.PI/2);
    const glassW=new THREE.MeshStandardMaterial({color:lin('#cfe8f0'),transparent:true,opacity:.45,roughness:.05}),TXc=15.95;
    for(const z of [-8.2,-5.65,-4.35,-3.05,-1.75,-.45]){const x=TXc;bx(null,.75,.035,1.2,x,.72,z,top,{col:true});for(const a of [-.33,.33])for(const b of [-.55,.55])bx(null,.03,.72,.03,x+a,0,z+b,leg,{cast:false});
      for(const b of [-.3,.3]){dChair(x-.8,z+b,Math.PI/2);dStool(x+.78,z+b);}cy(null,.13,.012,x,.755,z,'#4b5a60',{cast:false});
      const g=grp(tallG,x,0,z);for(let i=0;i<7;i++){const a=i*.9,r=.12+(i%3)*.06;const bb=new THREE.Mesh(US,new THREE.MeshStandardMaterial({color:lin('#f3efe6'),transparent:true,opacity:.35,roughness:.05}));bb.scale.setScalar(.07);bb.position.set(Math.cos(a)*r,2.25-(i%3)*.12,Math.sin(a)*r);g.add(bb);
        const l=new THREE.Mesh(US,new THREE.MeshBasicMaterial({color:lin('#ffd9a0')}));l.scale.setScalar(.018);l.position.copy(bb.position);g.add(l);bx(g,.004,H-2.25,.004,bb.position.x,2.25-(i%3)*.12,bb.position.z,'#999',{cast:false});}
      for(const [side,b] of [[-1,-.3],[-1,.3],[1,-.3],[1,.3]]){if(R()>.6)continue;const px=x+side*.7;const P=mkAny();place(P,px,z+b,side<0?Math.PI/2:-Math.PI/2);P.v='eat';acts.push({P,fn:aEat});
        cy(null,.12,.012,x+side*.2,.755,z+b,plateM,{cast:false});sp(null,.065,.032,.055,x+side*.2,.77,z+b,riceM,{cast:false});cy(null,.045,.02,x+side*.3,.755,z+b+.1,curM,{cast:false});cy(null,.03,.1,x+side*.28,.755,z+b-.18,glassW,{cast:false});}}
    // kitchen counter on the short concrete wall
    const cab=mat('#3d4146',.5),ctr=mat('#e8e4dc',.3);bx(null,3.05,.88,.58,16.375,0,-10.15,cab,{col:true});bx(null,3.09,.04,.62,16.375,.88,-10.15,ctr);
    bx(tallG,3.05,.6,.35,16.375,1.65,-10.3,cab);bx(tallG,2.95,.015,.02,16.375,1.645,-10.12,new THREE.MeshBasicMaterial({color:lin('#ffc27a')}),{cast:false});
    cy(null,.17,.3,15.1,.92,-10.15,'#d9dde0');cy(null,.18,.03,15.1,1.22,-10.15,'#b9bec4');cy(null,.19,.22,15.8,.92,-10.15,'#8c9298');cy(null,.17,.2,16.5,.92,-10.15,'#b06a2c');
    bx(null,.3,.22,.25,17.15,.92,-10.17,'#f2c230');for(let i=0;i<5;i++)cy(null,.12,.012,17.6,.92+i*.014,-10.15,'#f8f8f6',{cast:false});
    bx(null,.32,.55,.3,17.75,0,.1,'#c7cbcf',{col:true});
    {const P=mkMan({top:'#f1e8d6',bot:'#2a2f3a',sleeve:'short',beard:true});place(P,15.8,-9.45,Math.PI);P.v='stir';acts.push({P,fn:aStir});addCol(15.55,16.05,-9.7,-9.2);}
    {const P=mkMan({top:'#1f2a44',bot:'#2a2f3a'});place(P,17.3,-9.35,Math.PI*.85);P.v='tea';addCup(P);acts.push({P,fn:aTeaStand});addCol(17.05,17.55,-9.6,-9.1);}}
  {const P=mkMan({top:'#e8dcb5',bot:'#2f4a3d',sleeve:'short'});P.speed=.8;P.path0=[[17.45,-8.9],[17.45,-6.5],[13.9,-6.5],[-11,-6.5]];P.tray=true;
    const tr=P.gp(P.root,0,1.0,.36);P.pm(tr,cylG(.2,.2,.015,22),mat('#b9bec4',.3,.6),0,0,0,null,null,null,true);for(const [a,b] of [[-.08,-.05],[.08,.02],[0,.1]])P.pm(tr,cylG(.032,.025,.065,12),mat('#f7f5ef',.3),a,.04,b,null,null,null,true);
    place(P,17.45,-8.9,0);acts.push({P,fn:aWalker});}
  /* ---------- washroom: top-right corner, same column as the dining ---------- */
  for(const z of [-12.55,-11.65])bx(wallsG,1.0,1.9,.05,17.45,.1,z,'#a6b4bb',{col:true});
  for(const z of [-13.0,-12.1,-11.2]){bx(null,.58,.42,.38,17.65,0,z,'#f4f5f3');bx(null,.48,.05,.36,17.6,.42,z,'#ffffff',{cast:false});}
  for(const [z,a] of [[-12.1,.5],[-11.2,.2]]){const g=grp(wallsG,16.95,0,z+.45,Math.PI/2+a);bx(g,.85,1.8,.04,.43,.1,0,'#a6b4bb');}
  bx(null,.55,.85,1.2,15.05,0,-12.5,'#d8dcdc',{col:true});for(const z of [-12.8,-12.2]){cy(null,.17,.02,15.07,.85,z,'#ffffff');cy(null,.012,.12,14.87,.85,z,'#b9c0c6');}
  plane(tallG,1.2,.8,14.815,1.6,-12.5,mat('#b9d3dc',.05,.6),Math.PI/2);
  {const P=mkMan({sleeve:'short'});place(P,15.63,-12.5,-Math.PI/2);P.v='wash';acts.push({P,fn:aWash});addCol(15.4,15.85,-12.75,-12.25);}
  
  {const P=mkWoman();P.speed=1.0;P.path0=[[-11.8,-12.9],[1,-12.9],[1,-.4],[13.9,-.4]];P.file=true;P.pm(P.J.spine,UB,mat('#2f6db5',.6),.04,.24,.15,.24,.32,.025,null,null,null,true);place(P,-11.8,-12.9,0);acts.push({P,fn:aWalker});}
  /* ---------- HR room: right column below the dining, two rotated desks ---------- */
  {const top=mat('#d6cab3',.6);for(const [z,who] of [[2.6,0],[5.4,1]]){
    bx(null,.75,.05,1.5,16.6,.72,z,top,{col:true});bx(null,.05,.72,1.5,16.24,0,z,'#8f969e');
    bx(null,.025,.32,.5,16.42,.9,z,'#111');bx(null,.12,.015,.16,16.45,.75,z,'#141518');plane(null,.46,.28,16.435,1.06,z,TX.S.xlHR,Math.PI/2);
    bx(null,.14,.018,.42,16.78,.75,z,'#1e1f22',{cast:false});cy(null,.04,.1,16.75,.75,z+.55,pick(MUG));
    oChair(17.45,z,-Math.PI/2);oChair(15.75,z-.3,Math.PI/2);oChair(15.75,z+.35,Math.PI/2);
    const P=mkWoman();place(P,17.35,z,-Math.PI/2);P.v='type';P.kbd=.57;acts.push({P,fn:aType});}}
  {const P=mkMan();place(P,15.85,2.3,Math.PI/2);P.v='listen';acts.push({P,fn:aHRvisit});}
  {const P=mkMan({glasses:true});place(P,15.85,5.75,Math.PI/2);P.v='listen';acts.push({P,fn:aHRvisit});}
  bx(wallsG,1.6,1.9,.4,16.4,0,.72,'#8c8577',{col:true});for(let i=0;i<10;i++)bx(wallsG,.12,.3,.3,15.75+i*.14,1.2+(i%2)*.4,.95,pick(['#c9a227','#b3261e','#2f6db5']),{cast:false});
  plant(17.65,7.1,.9);
  /* ---------- balcony (from your video): planter edge with rail, covered, wicker chairs ---------- */
  {const x0=-6.2,x1=18.3,len=x1-x0,cxB=(x0+x1)/2,pm=mat('#8f8b84',.9),soil=mat('#3b2e24',.95),rail=mat('#1c1d20',.35,.6);
    bx(null,len,.85,.55,cxB,0,9.825,pm,{col:true});bx(null,len,.02,.47,cxB,.85,9.825,soil,{cast:false});
    bx(null,.5,.85,2.6,x0+.25,0,8.8,pm,{col:true});bx(null,.5,.85,2.6,x1-.25,0,8.8,pm,{col:true});
    const leaf=[mat('#3f7a3a',.8),mat('#4f8f45',.8),mat('#2f6a33',.8),mat('#5c9a4c',.8)];
    for(let x=x0+.2;x<x1-.1;x+=.32){const h=.5+((Math.round(x*37)%7)/7)*.9;sp(null,.16,h*.55,.14,x,.85+h*.5,9.85+((Math.round(x*13)%3)-1)*.06,leaf[Math.abs(Math.round(x*7))%4]);
      if(Math.round(x*10)%3===0){const b=new THREE.Mesh(coneG(.05,h*1.6),leaf[2]);b.position.set(x+.08,.85+h*.8,9.9);b.castShadow=true;staticG.add(b);}}
    for(const xe of [x0+.25,x1-.25])for(let z=7.8;z<9.6;z+=.35)sp(null,.14,.4,.14,xe,1.15,z,leaf[1]);
    const r=new THREE.Mesh(UC,rail);r.scale.set(.025,len-1,.025);r.rotation.z=Math.PI/2;r.position.set(cxB,.95,9.48);r.castShadow=true;staticG.add(r);
    for(let x=x0+.6;x<x1-.4;x+=1.6){bx(null,.04,.25,.06,x,.7,9.51,rail);}
    bx(tallG,len,.3,2.6,cxB,H,8.8,'#e9e6df');plane(tallG,len,2.6,cxB,H-.01,8.8,mat('#f1eee8',.9),0,Math.PI/2);
    for(let x=x0+.5;x<x1;x+=.9){const hl=.6+((Math.round(x*17)%5)/5)*1.1;bx(tallG,.01,hl,.01,x,H-hl,10.05,leaf[3],{cast:false});}
    for(const x of [x0+1.5,x1-1.5])plane(tallG,.18,.18,x,H-.02,8.4,new THREE.MeshBasicMaterial({color:lin('#fffaf0')}),0,Math.PI/2);
    addCol(x0-.3,x1+.3,9.5,10.4);addCol(x0-.3,x0+.5,7.4,10.4);addCol(x1-.5,x1+.3,7.4,10.4);}
  // cha corner: round white table with three wicker chairs
  cy(null,.36,.02,-3.5,.62,8.5,'#f4f3ef');cy(null,.03,.62,-3.5,0,8.5,'#e9e8e4',{col:true});cy(null,.2,.02,-3.5,0,8.5,'#e9e8e4',{cast:false});
  cy(null,.04,.06,-3.4,.64,8.45,'#d9662b');
  const ch=[[-4.25,8.55,Math.PI/2],[-2.75,8.55,-Math.PI/2],[-3.5,7.85,0]];
  for(const [x,z,ry] of ch){const ci=ch.findIndex(c=>c[0]===x&&c[1]===z);wicker(x-Math.sin(ry)*.1,z-Math.cos(ry)*.1,ry);const P=mkMan(R()<.4?{sleeve:'short'}:{});place(P,x,z,ry);addCup(P);P.seat=.45;acts.push({P,fn:aChatSit});BAL.push({P,role:['se','qa','des'][ci]});}
  // three standing smokers
  {const g=[[4.3,8.45],[5.1,8.95],[5.15,8.0]],c=[4.85,8.47];g.forEach(([x,z],i)=>{const P=mkMan(i===1?{beard:true,sleeve:'short'}:i===2?{top:'#5d6e86'}:{});place(P,x,z,Math.atan2(c[0]-x,c[1]-z));addCig(P);P.ph=i*2.7;acts.push({P,fn:aSmoke});BAL.push({P,role:['se','qa','des'][i]});addCol(x-.22,x+.22,z-.22,z+.22);});}
  // two sitting on the planter edge, two sitting on the floor against the glass
  for(const [x,i] of [[7.15,0],[7.95,1]]){const P=mkMan(i?{sleeve:'short',mous:true}:{});place(P,x,9.72,Math.PI);addCig(P);P.seat=.86;P.ph=i*3.1;P.lookY=i?-.5:.5;acts.push({P,fn:aSitSmoke});BAL.push({P,role:['se','des'][i]});}
  for(const [x,i] of [[.1,0],[.95,1]]){const P=mkMan(i?{beard:true}:{sleeve:'short'});place(P,x,7.82,0);addCig(P);P.ground=true;P.ph=i*2.2+1;P.lookY=i?.5:-.5;acts.push({P,fn:aSitSmoke});BAL.push({P,role:['qa','se'][i]});addCol(x-.25,x+.25,7.6,8.4);}
    /* ---------- street below the balcony ---------- */
  {const g=new THREE.Mesh(new THREE.PlaneGeometry(240,240),mat('#9c9685'));g.rotation.x=-Math.PI/2;g.position.y=GY;g.receiveShadow=true;staticG.add(g);}
  bx(null,120,.15,6.5,0,GY,13.25,'#b5ae9e',{cast:false});bx(null,120,.04,7,0,GY,20,'#45474c',{cast:false});
  for(let x=-58;x<59;x+=4)bx(null,1.8,.01,.12,x,GY+.04,20,'#e8e4d8',{cast:false});bx(null,120,.15,3,0,GY,25,'#b5ae9e',{cast:false});
  const bcol=['#cbbba2','#b7c2b6','#d3c4b2','#a9b4be','#cdb9aa','#c1b8a6'];
  for(let i=0,x=-56;x<56;i++){const d=6+((i*37)%5),h=9+((i*53)%22);const m=new THREE.MeshStandardMaterial({map:TX.win,color:lin(bcol[i%6]),roughness:.9});bx(null,d,h,10,x+d/2,GY,32,m);x+=d+.7;}
  for(let x=-40;x<=40;x+=8){cy(null,.12,2.4,x,GY,15.6,'#5a4630');sp(null,1.1,1.0,1.1,x,GY+3,15.6,'#4b7d3f');}
  for(const [k,l,z] of [['bus',0,-30],['r',0,-18],['r',0,-12],['cng',0,-4],['car',0,8],['r',0,20],['bus',0,34],['car',1,30],['r',1,18],['cng',1,10],['r',1,-2],['bus',1,-16],['r',1,-30]])vehicle(k,l,z);
}
function deskR(x,z,ry,role){const g=grp(staticG,x,0,z,ry);const fm=mat('#141518',.4,.4);const sc=({se:['claude','vscode'],qa:['xlBug','browser'],des:['xlDesign','figma']})[role||'se'];
  bx(g,1.6,.03,.72,0,.72,0,'#35383d');for(const a of [-.76,.76]){bx(g,.04,.72,.04,a,0,-.3,fm,{cast:false});bx(g,.04,.72,.04,a,0,.3,fm,{cast:false});bx(g,.04,.04,.64,a,.05,0,fm,{cast:false});}
  bx(g,.42,.56,.5,.5,0,-.12,'#5d6168');bx(g,.42,.05,.5,.5,.56,-.12,'#e2622b',{cast:false});
  bx(g,.22,.015,.16,0,.75,.2,'#141518');bx(g,.04,.22,.03,0,.75,.22,'#141518');bx(g,.6,.36,.025,0,.9,.18,'#0f1013');plane(g,.56,.33,0,1.08,.166,TX.S[sc[1]],Math.PI);
  const lg=grp(g,.56,.75,.02);lg.rotation.y=.4;bx(lg,.33,.016,.23,0,0,0,'#a3a8ae');bx(lg,.28,.002,.12,0,.016,-.03,'#2a2c30',{cast:false});
  const sg=grp(lg,0,.016,.11);sg.rotation.x=.3;bx(sg,.33,.22,.008,0,0,0,'#a3a8ae');plane(sg,.3,.19,0,.112,-.0045,TX.S[sc[0]],Math.PI);
  bx(g,.42,.018,.14,0,.75,-.15,'#1e1f22',{cast:false});for(let i=0;i<4;i++)bx(g,.38,.004,.02,0,.768,-.2+i*.032,'#3a3c40',{cast:false});
  bx(g,.22,.003,.2,-.3,.75,-.15,'#2a2c30',{cast:false});sp(g,.026,.013,.042,-.3,.76,-.15,'#1e1f22',{cast:false});
  if(R()<.5)cy(g,.04,.1,-.62,.75,.12,pick(MUG));
  oChair(0,-.86,0,null,g);
  if(Math.abs(Math.sin(ry))>.5)addCol(x-.36,x+.36,z-.8,z+.8,.8);else addCol(x-.8,x+.8,z-.36,z+.36,.8);}   // desks are low enough to jump over or onto
function dChair(x,z,ry){CHAIRS.push({x,z,yaw:ry||0,h:.46});const g=grp(staticG,x,0,z,ry);const l=mat('#9a6a3e',.55);
  const s=new THREE.Mesh(sphPart('shell',0,Math.PI*2,Math.PI*.5,Math.PI*.5),matD('#f4f4f1',.35));s.scale.set(.24,.12,.23);s.position.set(0,.5,0);s.castShadow=true;g.add(s);
  const b=new THREE.Mesh(sphPart('shellB',Math.PI,Math.PI,Math.PI*.12,Math.PI*.4),matD('#f4f4f1',.35));b.scale.set(.24,.42,.2);b.position.set(0,.5,0);b.castShadow=true;g.add(b);
  cy(g,.18,.03,0,.47,.01,'#c98a46');for(const a of [-1,1])for(const c of [-1,1]){const leg=bx(g,.024,.46,.024,a*.15,.02,c*.14,l,{cast:false});leg.rotation.z=a*.12;leg.rotation.x=-c*.12;}}
function dStool(x,z){CHAIRS.push({x,z,yaw:x>15.95?-Math.PI/2:Math.PI/2,h:.46});const g=grp(staticG,x,0,z);cy(g,.19,.07,0,.4,0,'#c98a46');for(const a of [-1,1])for(const c of [-1,1]){const leg=bx(g,.024,.42,.024,a*.11,0,c*.11,mat('#9a6a3e',.55),{cast:false});leg.rotation.z=a*.1;leg.rotation.x=-c*.1;}}
function wicker(x,z,ry){CHAIRS.push({x,z,yaw:ry||0,h:.45});const g=grp(staticG,x,0,z,ry);const w=matD('#f2f0ea',.6);
  const b=new THREE.Mesh(gc.wk||(gc.wk=new THREE.CylinderGeometry(.3,.26,.38,22,1,true,Math.PI*.25,Math.PI*1.5)),w);b.position.set(0,.62,0);b.castShadow=true;g.add(b);
  cy(g,.27,.05,0,.4,0,'#f2f0ea');for(const a of [-1,1])for(const c of [-1,1])bx(g,.025,.42,.025,a*.17,0,c*.17,'#e4e2dc',{cast:false});}
function aSitSmoke(P,t,dt){rest(P);const J=P.J,c=(t+P.ph)%8;
  if(P.ground){J.hips.position.y=.11;J.spine.rotation.x=-.12;J.lHip.rotation.set(-1.95,0,.18);J.rHip.rotation.set(-1.75,0,-.12);J.lKn.rotation.x=2.25;J.rKn.rotation.x=1.9;J.lAn.rotation.x=-.5;J.rAn.rotation.x=-.4;
    J.lSh.rotation.set(-1.25,0,-.05);J.lEl.rotation.x=-.55;}
  else{sit(P,P.seat||.86);J.spine.rotation.x=.12;J.lSh.rotation.set(-.55,0,-.12);J.lEl.rotation.x=-.75;J.lKn.rotation.x+=.1;}
  const d=win(c,1.3,2.6,.45),base=P.ground?[-1.1,.25,-.9]:[-.6,.2,-1.15];
  J.rSh.rotation.set(lerp(base[0],-.5,d),0,lerp(base[1],.5,d));J.rEl.rotation.x=lerp(base[2],-2.4,d);
  const ex=win(c,3.2,4.3,.25);J.neck.rotation.set(-.2*ex,P.lookY||0,0);talk(P,t,c>5&&c<7.4);
  if(P.cigTip){burnCig(P,((t+P.ph)%70)/70,t);P.cigTip.getWorldPosition(_v);if(Math.random()<dt*6)puff(_v,.025,2.4,_v2.set((Math.random()-.5)*.03,.12,(Math.random()-.5)*.03),.35);
    if(ex>.5&&Math.random()<dt*28){P.J.mouthPt.getWorldPosition(_v);puff(_v,.04,1.8,_v2.set(Math.sin(P.yaw)*.3,.1,Math.cos(P.yaw)*.3),.42);}}}
function aHRvisit(P,t){rest(P);sit(P,.48);const J=P.J;J.spine.rotation.x=.05;J.lSh.rotation.set(-.5,0,-.1);J.lEl.rotation.x=-.9;J.rSh.rotation.set(-.5,0,.1);J.rEl.rotation.x=-.9;
  J.neck.rotation.set(.05+Math.max(0,Math.sin(t*1.1+P.ph))*.1,0,0);talk(P,t,Math.sin(t*.5+P.ph)>.4);}
function gateOpen(){if(!GATE)return;if(GATE.target===0)sfx.play('door');GATE.target=1;GATE.timer=5;}
function gateUpdate(t,dt){const G=GATE;if(!G)return;
  if(G.scan>0){G.scan-=dt;if(G.scan<=0){G.scr.material=TX.faceOk;sfx.play('beep');gateOpen();G.okT=2.5;}}
  if(G.okT>0){G.okT-=dt;if(G.okT<=0)G.scr.material=TX.faceIdle;}
  if(G.btnT>0){G.btnT-=dt;G.btn.position.z=.006;}else G.btn.position.z=.012;
  if(G.target){G.timer-=dt;const inDoor=player&&mode==='walk'&&Math.abs(player.x-1)<.9&&Math.abs(player.z-(-13.5))<.7;if(G.timer<=0&&!inDoor){G.target=0;sfx.play('door');}}
  G.open+=(G.target-G.open)*Math.min(1,dt*3.5);G.L.position.x=.65-.62*G.open;G.R.position.x=1.35+.62*G.open;
  const o=G.open>.6;G.col[0]=o?-99:.3;G.col[1]=o?-98:1.7;}
function gateNear(){if(!GATE||!player)return null;const x=player.x,z=player.z,Z=-13.5;
  if(z>Z&&Math.hypot(x-2.0,z-(Z+.4))<1.5)return 'btn';if(z<Z&&Math.hypot(x-(-.05),z-(Z-.4))<1.6)return 'face';return null;}
function gateInteract(){const n=gateNear();if(n==='btn'){GATE.btnT=.3;sfx.play('btn');gateOpen();}else if(n==='face'&&GATE.scan<=0&&GATE.target===0){GATE.scan=1.3;sfx.play('scan');}}
function rod(x1,y1,z1,x2,y2,z2,r,m){const a=new THREE.Vector3(x1,y1,z1),b=new THREE.Vector3(x2,y2,z2),d=b.clone().sub(a),L=d.length();const e=new THREE.Mesh(UC,m);e.scale.set(r,L,r);
  e.position.copy(a).addScaledVector(d,.5);e.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());e.castShadow=true;staticG.add(e);return e;}
function fpanel(x,z,len,ry){const r=len/2.4;const a=TX.feat.clone(),e=TX.featE.clone();a.needsUpdate=e.needsUpdate=true;a.wrapS=e.wrapS=THREE.RepeatWrapping;a.repeat.set(r,1);e.repeat.set(r,1);
  const m=new THREE.MeshStandardMaterial({map:a,emissiveMap:e,emissive:new THREE.Color(1,.97,.9),emissiveIntensity:1.1,roughness:.85});plane(wallsG,len,H-.04,x,H/2,z,m,ry);}
function shellChair(x,z,ry){const g=grp(staticG,x,0,z,ry);const w=mat('#f6f5f2',.35),l=mat('#b48a5e',.6);
  const s=new THREE.Mesh(sphPart('shell',0,Math.PI*2,Math.PI*.5,Math.PI*.5),matD('#f6f5f2',.35));s.scale.set(.24,.12,.23);s.position.set(0,.5,0);s.castShadow=true;g.add(s);
  const b=new THREE.Mesh(sphPart('shellB',Math.PI,Math.PI,Math.PI*.12,Math.PI*.4),matD('#f6f5f2',.35));b.scale.set(.24,.42,.2);b.position.set(0,.5,0);b.castShadow=true;g.add(b);
  for(const a of [-1,1])for(const c of [-1,1]){const leg=bx(g,.022,.46,.022,a*.15,.02,c*.14,l,{cast:false});leg.rotation.z=a*.12;leg.rotation.x=-c*.12;}}
function ttUpdate(t,dt){if(!TT)return;const S=TT;S.t+=dt;const per=1.05,k=S.t/per,n=Math.floor(k),u=k-n,fromA=n%2===0;
  const xr=i=>Math.sin(i*12.9898)*.5;const x0=xr(n),x1=xr(n+1),zA=S.cz-1.5,zB=S.cz+1.5,za=fromA?zA:zB,zb=fromA?zB:zA,top=.785,bu=.62;
  let y;if(u<bu){const v=u/bu;y=lerp(.98,top,v)+.26*Math.sin(Math.PI*v);}else{const v=(u-bu)/(1-bu);y=top+.22*v+.18*Math.sin(Math.PI*v);}
  S.ball.position.set(S.cx+lerp(x0,x1,u),y,lerp(za,zb,u));
  S.players.forEach((P,i)=>{rest(P);const J=P.J,recv=(i===0)!==fromA;const tx=S.cx+(recv?x1:x0)*.85;P.x+=(tx-P.x)*Math.min(1,dt*4);P.root.position.set(P.x,0,P.z);
    J.hips.position.y=STAND-.06;J.spine.rotation.x=.3;J.neck.rotation.x=-.2;J.lHip.rotation.x=-.35;J.lKn.rotation.x=.45;J.rHip.rotation.x=-.2;J.rKn.rotation.x=.35;J.lHip.rotation.z=.12;J.rHip.rotation.z=-.12;
    let sw=recv?(u<.7?0:-ease((u-.7)/.25)):(u<.25?1-ease(u/.25):0);if(recv&&u>.95)sw=lerp(-1,1,(u-.95)/.05);
    J.rSh.rotation.set(-.75,sw*.7,-.35);J.rEl.rotation.x=-1.1+sw*.2;J.lSh.rotation.set(-.6,0,.2);J.lEl.rotation.x=-1.3;J.spine.rotation.y=sw*.25;life(P,t,dt);});}

function vehicle(kind,lane,z){const g=new THREE.Group();let speed;const b=(w,h,d,y,c,zz)=>{const m=new THREE.Mesh(UB,mat(c,.6));m.scale.set(w,h,d);m.position.set(0,y+h/2,zz||0);m.castShadow=true;g.add(m);};
  if(kind==='r'){b(.95,.55,.9,.35,'#c8262c');b(1,.06,1,1.55,'#1f7a5a',-.05);b(1,.9,.06,.65,'#1f7a5a',-.5);b(.1,.85,.1,0,'#222',.95);b(.6,.08,.9,.45,'#e8c547',.6);speed=1.4;}
  else if(kind==='cng'){b(1.3,1.2,2.4,.3,'#2e9e4f');b(1.32,.08,2.42,1.5,'#246f3a');speed=3;}
  else if(kind==='bus'){b(2.5,2.6,9,.35,lane?'#2f5fa6':'#b8452f');b(2.52,.6,8.6,1.6,'#2a3440');speed=2.2;}
  else{b(1.8,.8,4.2,.3,lane?'#e9e9e6':'#4b4f57');b(1.6,.55,2.1,1.1,'#2a3440',-.2);speed=3.4;}
  g.position.set(z,GY+.04,lane?21.7:18.3);g.rotation.y=lane?-Math.PI/2:Math.PI/2;scene.add(g);traffic.push({g,dir:lane?-1:1,speed,kind,x0:z});}

/* ================= activities ================= */
function aType(P,t,dt){rest(P);sit(P,P.seat||.48);const J=P.J,c=(t+P.ph)%28;
  if(P.v==='phone'){J.spine.rotation.x=-.12;J.rSh.rotation.set(-.55,0,-.35);J.rEl.rotation.x=-2.25;J.rHand.rotation.set(0,-1.2,0);J.lSh.rotation.set(-.6,0,-.14);J.lEl.rotation.x=-.95;J.lHand.rotation.y=1.4;
    J.neck.rotation.set(.05,Math.sin(t*.4+P.ph)*.25,-.12);talk(P,t,Math.sin(t*.7+P.ph)>-.2);J.lHip.rotation.y=-.3;J.rHip.rotation.y=.2;return;}
  const mo=win(c,17,20.5,.4),st=win(c,22.5,24,.5),ty=Math.max(0,1-mo-st);
  const k1=Math.sin(t*15+P.ph)*.05*ty,k2=Math.sin(t*16.7+P.ph*2)*.05*ty;
  J.spine.rotation.x=lerp(.1,-.22,st);J.neck.rotation.x=lerp(.08,-.3,st);J.head.rotation.y=Math.sin(t*.35+P.ph)*.1-.12*mo;
  J.lSh.rotation.set(lerp(-.62,-2.85,st),0,lerp(-.14,.35,st));J.lEl.rotation.x=lerp(-1.0+k1,-1.95,st);J.lHand.rotation.y=1.4*(1-st);
  J.rSh.rotation.set(lerp(lerp(-.62,-.6,mo),-2.85,st),Math.sin(t*2.6)*.06*mo,lerp(lerp(.14,-.08,mo),-.35,st));J.rEl.rotation.x=lerp(lerp(-1.0+k2,-1.05,mo),-1.95,st);J.rHand.rotation.y=-1.4*(1-st);
  J.lAn.rotation.x=-.1;J.rKn.rotation.x+=.15;J.rAn.rotation.x=-.25;if(P.kbd&&st<.5)typeIK(P,t,ty,mo);}
function aSofaLaptop(P,t){rest(P);sit(P,.42);const J=P.J;J.spine.rotation.x=-.12;J.neck.rotation.x=.4;
  J.lSh.rotation.set(-.55,0,-.2);J.lEl.rotation.x=-.75+Math.sin(t*14)*.04;J.rSh.rotation.set(-.55,0,.2);J.rEl.rotation.x=-.75+Math.sin(t*15.5+1)*.04;J.lHand.rotation.y=1.4;J.rHand.rotation.y=-1.4;
  if(!P.lp){P.lp=P.gp(P.J.hips,0,.03,.33);P.pm(P.lp,UB,mat('#9aa0a8',.4,.4),0,0,0,.32,.015,.22,null,null,null,true);const s=P.gp(P.lp,0,.01,-.11);s.rotation.x=-1.85;P.pm(s,UB,mat('#2a2c30'),0,0,.105,.32,.008,.21);
    const pl=new THREE.Mesh(UP,TX.screens[2]);pl.scale.set(.29,.18,1);pl.position.set(0,.006,.105);pl.rotation.x=-Math.PI/2;s.add(pl);}}
function aEat(P,t){rest(P);sit(P,.46);const J=P.J,c=(t+P.ph)%4.8;J.spine.rotation.x=.3;
  J.lSh.rotation.set(-1.0,0,-.12);J.lEl.rotation.x=-.45;J.lHand.rotation.y=1.3;
  const up=win(c,2.55,3.05,.45),mix=1-up;
  J.rSh.rotation.set(lerp(-1.15+Math.sin(t*6)*.05*mix,-.62,up),0,lerp(.16+Math.cos(t*6)*.04*mix,.46,up));J.rEl.rotation.x=lerp(-.35,-2.45,up);J.rHand.rotation.y=-1.3*mix;
  J.neck.rotation.x=lerp(.28,.05,up);const chew=c>3.1||c<1.2;J.mouth.scale.y=chew?.0025+Math.abs(Math.sin(t*8))*.008:.0025;J.head.rotation.x=chew?Math.sin(t*8)*.02:0;
  if(c>1.4&&c<2.4){J.neck.rotation.y=Math.sin(P.ph)*.5;talk(P,t,true);}}
function aSmoke(P,t,dt){rest(P);const J=P.J,c=(t+P.ph)%8;
  J.hips.rotation.z=Math.sin(t*.3+P.ph)*.025;J.rKn.rotation.x=.14;J.rHip.rotation.x=-.05;J.rAn.rotation.x=-.08;
  J.lSh.rotation.set(.08,0,.12);J.lEl.rotation.x=-.4;
  const d=win(c,1.3,2.6,.45);J.rSh.rotation.set(lerp(-.2,-.38,d),0,lerp(-.06,.5,d));J.rEl.rotation.x=lerp(-1.35,-2.45,d);
  const ex=win(c,3.2,4.3,.25);J.neck.rotation.set(-.2*ex,P.lookY||0,0);
  talk(P,t,c>5&&c<7.4);
  if(P.cigTip){burnCig(P,((t+P.ph)%70)/70,t);P.cigTip.getWorldPosition(_v);if(Math.random()<dt*6)puff(_v,.025,2.4,_v2.set((Math.random()-.5)*.03,.12,(Math.random()-.5)*.03),.35);
    if(ex>.5&&Math.random()<dt*28){P.J.mouthPt.getWorldPosition(_v);puff(_v,.04,1.8,_v2.set(Math.sin(P.yaw)*.35+(Math.random()-.5)*.08,.08,Math.cos(P.yaw)*.35+(Math.random()-.5)*.08),.42);}}}
function aRail(P,t,dt){rest(P);const J=P.J,c=(t+P.ph)%9;J.spine.rotation.x=.42;J.hips.position.y=STAND-.02;
  J.lSh.rotation.set(-1.45,0,-.2);J.lEl.rotation.x=-.85;J.lHand.rotation.y=1.2;
  const d=win(c,2,3.2,.5);J.rSh.rotation.set(lerp(-1.45,-.95,d),0,lerp(.2,.62,d));J.rEl.rotation.x=lerp(-.85,-2.4,d);
  J.neck.rotation.set(-.35,Math.sin(t*.2)*.4,0);J.rHip.rotation.set(.1,0,.12);J.rKn.rotation.x=.2;J.lHip.rotation.z=.04;
  const ex=win(c,3.8,4.8,.25);if(P.cigTip){burnCig(P,((t+P.ph)%70)/70,t);P.cigTip.getWorldPosition(_v);if(Math.random()<dt*6)puff(_v,.025,2.4,_v2.set(0,.12,0),.35);
    if(ex>.5&&Math.random()<dt*28){P.J.mouthPt.getWorldPosition(_v);puff(_v,.04,1.8,_v2.set(.35,.06,(Math.random()-.5)*.08),.42);}}}
function aTeaStand(P,t){rest(P);const J=P.J,c=(t+P.ph)%10;J.hips.rotation.z=Math.sin(t*.25+P.ph)*.02;J.lKn.rotation.x=.12;
  const d=win(c,1,2,.4);J.rSh.rotation.set(lerp(-.3,-.62,d),0,lerp(.05,.45,d));J.rEl.rotation.x=lerp(-1.45,-2.4,d);
  const tk=Math.sin(t*.45+P.ph)>0;talk(P,t,tk&&d<.1);J.lSh.rotation.set(tk?-.4+Math.sin(t*2.3)*.12:.05,0,tk?-.15:.1);J.lEl.rotation.x=tk?-1.3+Math.sin(t*3.1)*.2:-.15;J.lHand.rotation.y=tk?Math.sin(t*2)*.5:0;
  J.neck.rotation.y=Math.sin(t*.3+P.ph)*.25;}
function aChatSit(P,t){rest(P);sit(P,P.seat||.44);const J=P.J,c=(t+P.ph)%11;J.spine.rotation.x=-.08;
  const d=win(c,1,2,.4);J.rSh.rotation.set(lerp(-.5,-.65,d),0,lerp(.12,.46,d));J.rEl.rotation.x=lerp(-1.05,-2.4,d);
  const tk=Math.sin(t*.38+P.ph)>0;talk(P,t,tk&&d<.1);J.lSh.rotation.set(tk?-.65+Math.sin(t*2.1)*.15:-.5,0,-.1);J.lEl.rotation.x=tk?-1.2+Math.sin(t*2.9)*.25:-.9;
  J.neck.rotation.set(0,Math.sin(t*.2+P.ph)*.2,0);J.lHip.rotation.y=-.2;J.lKn.rotation.x-=.15;}
function aMeet(P,t){const J=P.J;rest(P);
  if(P.v==='present'){const c=(t+P.ph)%9,pt=win(c,1,3.5,.5);J.rSh.rotation.set(lerp(-.2,.15,pt),0,lerp(-.08,-1.35,pt));J.rEl.rotation.x=lerp(-.2,-.1,pt);J.neck.rotation.y=lerp(Math.sin(t*.4)*.3,-.9,pt);
    J.lSh.rotation.set(-.45+Math.sin(t*1.9)*.12,0,-.12);J.lEl.rotation.x=-1.2+Math.sin(t*2.6)*.2;J.lHand.rotation.y=.8;talk(P,t,true);J.hips.rotation.z=Math.sin(t*.4)*.02;return;}
  sit(P,.48);
  if(P.v==='sleep'){const c=(t+P.ph)%7,dr=c<6?ease(c/6):1-ease((c-6)/.25);J.spine.rotation.x=-.12+dr*.1;J.neck.rotation.x=.1+dr*.62;J.lids[0].rotation.x=J.lids[1].rotation.x=.6;
    J.lSh.rotation.set(-.35,0,-.05);J.lEl.rotation.x=-.9;J.rSh.rotation.set(-.35,0,.05);J.rEl.rotation.x=-.9;P.noBlink=true;return;}
  if(P.v==='phone'){J.spine.rotation.x=.18;J.neck.rotation.x=.55;J.lSh.rotation.set(-.5,0,-.2);J.lEl.rotation.x=-1.25;J.rSh.rotation.set(-.5,0,.2);J.rEl.rotation.x=-1.25;J.lHand.rotation.y=1.2;J.rHand.rotation.y=-1.2+Math.sin(t*5)*.1;return;}
  if(P.v==='laptop'){J.spine.rotation.x=.12;J.neck.rotation.x=.18;if(P.kbd){typeIK(P,t,1,0);return;}J.lSh.rotation.set(-.62,0,-.12);J.lEl.rotation.x=-1.0+Math.sin(t*15)*.04;J.rSh.rotation.set(-.62,0,.12);J.rEl.rotation.x=-1.0+Math.sin(t*16.4)*.04;J.lHand.rotation.y=1.4;J.rHand.rotation.y=-1.4;return;}
  // listen: look at presenter, nod sometimes
  const py=Math.atan2(PRES[0]-P.x,PRES[1]-P.z);let rel=py-P.yaw;rel=Math.atan2(Math.sin(rel),Math.cos(rel));
  J.neck.rotation.set(Math.max(0,Math.sin(t*1.3+P.ph))*.12,clamp(rel,-1.2,1.2)*.8,0);J.spine.rotation.y=clamp(rel,-1,1)*.2;
  J.lSh.rotation.set(-.62,0,-.15);J.lEl.rotation.x=-.75;J.rSh.rotation.set(-.62,0,.15);J.rEl.rotation.x=-.75;J.lHand.rotation.y=1.3;J.rHand.rotation.y=-1.3;}
function aHuddle(P,t){rest(P);const J=P.J;
  if(P.v==='point'){const c=(t+P.ph)%7,pt=win(c,1,3.2,.4);J.rSh.rotation.set(lerp(-.3,-1.45,pt),0,lerp(-.08,-.5,pt));J.rEl.rotation.x=lerp(-1.2,-.15,pt);
    J.lSh.rotation.set(-.35+Math.sin(t*2)*.1,0,-.1);J.lEl.rotation.x=-1.3;J.neck.rotation.y=lerp(.45,-.6,pt);talk(P,t,true);return;}
  J.lSh.rotation.set(-.55,0,-.42);J.lEl.rotation.x=-1.9;J.rSh.rotation.set(-.6,0,.42);J.rEl.rotation.x=-1.85;
  J.neck.rotation.set(Math.max(0,Math.sin(t*1.2+P.ph))*.1,Math.sin(t*.3+P.ph)*.2,0);J.hips.rotation.z=Math.sin(t*.3+P.ph)*.02;J.lKn.rotation.x=.08;talk(P,t,Math.sin(t*.5+P.ph)>.7);}
function aWash(P,t){rest(P);const J=P.J;J.spine.rotation.x=.32;J.neck.rotation.x=.3;const r=Math.sin(t*7);
  J.lSh.rotation.set(-.85+r*.05,0,-.32);J.lEl.rotation.x=-.75+r*.12;J.rSh.rotation.set(-.85-r*.05,0,.32);J.rEl.rotation.x=-.75-r*.12;J.lHand.rotation.y=1.2;J.rHand.rotation.y=-1.2;J.lHip.rotation.x=-.05;J.rHip.rotation.x=.05;}
function aScroll(P,t){rest(P);const J=P.J;J.neck.rotation.x=.48;J.lSh.rotation.set(-.32,0,-.22);J.lEl.rotation.x=-1.55;J.rSh.rotation.set(-.32,0,.22);J.rEl.rotation.x=-1.55+Math.sin(t*4)*.03;
  J.lHand.rotation.y=1.1;J.rHand.rotation.y=-1.1;J.hips.rotation.z=Math.sin(t*.3)*.02;J.lKn.rotation.x=.1;}
function aStir(P,t){rest(P);const J=P.J;J.spine.rotation.x=.2;J.neck.rotation.x=.35;J.rSh.rotation.set(-.95+Math.sin(t*3)*.1,0,.22+Math.cos(t*3)*.1);J.rEl.rotation.x=-.65;
  J.lSh.rotation.set(-.85,0,-.1);J.lEl.rotation.x=-.45;J.neck.rotation.y=Math.sin(t*.2)*.2;}
function aWatchSofa(P,t){rest(P);sit(P,.42);const J=P.J;J.spine.rotation.x=-.18;J.neck.rotation.set(.1,Math.sin(t*.25)*.5+.2,0);J.lSh.rotation.set(-.4,0,-.05);J.lEl.rotation.x=-.8;J.rSh.rotation.set(-.4,0,.05);J.rEl.rotation.x=-.8;
  J.lHip.rotation.y=-.25;J.lKn.rotation.x-=.2;}
function aWalker(P,t,dt){if(!P.path||!P.path.length){P.dirF=!P.dirF;P.path=(P.dirF?P.path0.slice():P.path0.slice().reverse());}
  moveAlong(P,dt);const J=P.J;if(P.tray){J.lSh.rotation.set(-.55,0,-.25);J.lEl.rotation.x=-1.3;J.rSh.rotation.set(-.55,0,.25);J.rEl.rotation.x=-1.3;J.lHand.rotation.y=1.4;J.rHand.rotation.y=-1.4;}
  if(P.file){J.lSh.rotation.set(-.3,0,-.42);J.lEl.rotation.x=-1.75;}}

/* ================= pool controller: full 8-ball ================= */
const PN=['রাহিম','করিম'],KN={solid:'সলিড (১-৭)',stripe:'স্ট্রাইপ (৯-১৫)'};
const bnN=n=>Number(n).toLocaleString('bn-BD');
function ballsOn(T,f){return T.balls.filter(b=>b.on&&!b.cue&&(!f||f(b)));}
function legalTargets(S){const g=S.groups[S.shooter];if(!g)return ballsOn(S.T,b=>b.n!==8);const l=ballsOn(S.T,b=>b.kind===g);return l.length?l:ballsOn(S.T,b=>b.n===8);}
function segClear(T,x1,z1,x2,z2,skip,rad){const dx=x2-x1,dz=z2-z1,L=dx*dx+dz*dz;for(const b of T.balls){if(!b.on||skip.includes(b))continue;
  const u=clamp(L?((b.x-x1)*dx+(b.z-z1)*dz)/L:0,0,1),px=x1+dx*u-b.x,pz=z1+dz*u-b.z;if(px*px+pz*pz<rad*rad)return false;}return true;}
function shotFor(S,cx,cz,tg,p){const T=S.T,r=S.cue.r;let ux=p[0]-tg.x,uz=p[1]-tg.z;const ul=Math.hypot(ux,uz);ux/=ul;uz/=ul;
  const gx=tg.x-ux*2*r,gz=tg.z-uz*2*r;let ax=gx-cx,az=gz-cz;const al=Math.hypot(ax,az);if(al<.05)return null;ax/=al;az/=al;const cut=ax*ux+az*uz;if(cut<.35)return null;
  const clear=segClear(T,cx,cz,gx,gz,[S.cue,tg],2*r*.97)&&segClear(T,tg.x,tg.z,p[0],p[1],[tg,S.cue],2*r*.97);const st=standDist(T,cx,cz,ax,az,S.ax,S.az);
  return{ax,az,sp:clamp(.8+(al+ul)*.95,1.0,3.2),s:(clear?1:-.7)+cut*.8-.1*(al+ul)-.25*Math.max(0,st-1.1)+SRP()*.12};}
function poolPlan(){const S=POOL,T=S.T,cb=S.cue;
  if(S.breakNext){cb.on=true;cb.mesh.visible=true;cb.vx=cb.vz=0;cb.x=-T.hx/2;cb.z=(SRP()-.5)*.3;const ax=T.hx/2-cb.x,az=-cb.z,l=Math.hypot(ax,az);return{ax:ax/l,az:az/l,sp:6.6};}
  const tgs=legalTargets(S);
  if(S.ballInHand){let best=null;for(const tg of tgs)for(const p of T.pockets){let ux=p[0]-tg.x,uz=p[1]-tg.z;const ul=Math.hypot(ux,uz);ux/=ul;uz/=ul;
      for(const d of [.22,.38]){const cx=tg.x-ux*(2*cb.r+d),cz=tg.z-uz*(2*cb.r+d);if(Math.abs(cx)>T.hx-cb.r||Math.abs(cz)>T.hz-cb.r)continue;
        if(T.balls.some(b=>b.on&&!b.cue&&Math.hypot(b.x-cx,b.z-cz)<2.3*cb.r))continue;const sh=shotFor(S,cx,cz,tg,p);if(sh&&(!best||sh.s>best.s))best={s:sh.s,cx,cz};}}
    if(best){cb.x=best.cx;cb.z=best.cz;}else{cb.x=-T.hx/2;cb.z=0;}cb.on=true;cb.mesh.visible=true;cb.vx=cb.vz=0;S.ballInHand=false;}
  let best=null;for(const tg of tgs)for(const p of T.pockets){const sh=shotFor(S,cb.x,cb.z,tg,p);if(sh&&(!best||sh.s>best.s))best=sh;}
  if(!best){const tg=tgs.reduce((a,b)=>Math.hypot(b.x-cb.x,b.z-cb.z)<Math.hypot(a.x-cb.x,a.z-cb.z)?b:a);let ax=tg.x-cb.x,az=tg.z-cb.z;const l=Math.hypot(ax,az)||1;best={ax:ax/l,az:az/l,sp:1.5};}
  const n=(SRP()-.5)*.018,ca=Math.cos(n),sa=Math.sin(n);return{ax:best.ax*ca-best.az*sa,az:best.ax*sa+best.az*ca,sp:best.sp};}
function poolResolve(){const S=POOL,T=S.T,cb=S.cue,me=S.shooter,op=1-me,g=S.groups[me];
  const pot=T.potted.filter(b=>!b.cue),scratch=!cb.on,eight=pot.some(b=>b.n===8),fh=T.firstHit;let foul=scratch||!fh,msg='';
  if(!foul&&!S.wasBreak){if(g){if(S.onEight){if(fh.n!==8)foul=true;}else if(fh.kind!==g)foul=true;}else if(fh.n===8)foul=true;}
  if(eight){if(S.wasBreak){const e=T.balls.find(b=>b.n===8);e.on=true;e.mesh.visible=true;e.vx=e.vz=0;e.x=T.hx/2;e.z=0;for(const b of T.balls)if(b!==e&&b.on&&Math.hypot(b.x-e.x,b.z-e.z)<2*e.r)b.x+=.07;msg='ব্রেকে ৮ নম্বর পড়েছে, আবার বসানো হলো। ';}
    else{const win=S.onEight&&!foul?me:op;S.wins[win]++;S.winner=win;S.msg=win===me?PN[me]+' ৮ নম্বর বল ফেলে গেম জিতল!':PN[me]+' '+(S.onEight?'ফাউলসহ ':'আগেভাগে ')+'৮ নম্বর ফেলেছে, '+PN[op]+' জিতল!';return'over';}}
  if(scratch){cb.on=true;cb.mesh.visible=true;cb.vx=cb.vz=0;cb.x=-T.hx/2;cb.z=0;}
  if(!g&&!foul&&!S.wasBreak){const own=pot.find(b=>b.n!==8);if(own){S.groups[me]=own.kind;S.groups[op]=own.kind==='solid'?'stripe':'solid';msg+=PN[me]+' '+KN[own.kind]+' নিল। ';}}
  const g2=S.groups[me],potOwn=pot.some(b=>b.n!==8&&(S.wasBreak||!g2||b.kind===g2));
  if(foul){S.shooter=op;S.ballInHand=true;msg+='ফাউল: '+(scratch?'সাদা বল পকেটে পড়েছে':!fh?'কোনো বলে লাগেনি':'আগে ভুল বলে লেগেছে')+'। '+PN[op]+' পেল বল ইন হ্যান্ড।';}
  else if(potOwn)msg+=PN[me]+' বল ফেলেছে, আবার খেলবে।';
  else{S.shooter=op;msg+=(S.wasBreak?'ব্রেকে কিছু পড়েনি। ':'মিস। ')+PN[op]+' এর পালা।';}
  S.msg=msg;S.wasBreak=false;return potOwn&&!foul?'same':'switch';}
function updBoard(){const S=POOL,el=document.getElementById('poolBoard');if(!el||!S)return;const T=S.T;
  const row=i=>{const g=S.groups[i],left=g?ballsOn(T,b=>b.kind===g).length:0;return'<div class="pr'+(S.shooter===i&&S.state!=='over'?' on':'')+'"><b>'+PN[i]+'</b><span>'+(g?KN[g]+(left?', বাকি '+bnN(left):', এখন ৮ নম্বর'):'খোলা টেবিল')+'</span><em>'+bnN(S.wins[i])+'</em></div>';};
  el.innerHTML='<div class="pt">৮-বল পুল <small>গেম '+bnN(S.games)+' · জয় সংখ্যা ডানে</small></div>'+row(0)+row(1)+'<div class="pm">'+(S.msg||'')+'</div>';}
// the match being played with real shots (null for the ambient game and for old-style matches)
function poolMatch(){return MT&&MT.turnPool&&MT.game==='pool'&&MT.state==='play'?MT:null;}
function poolWalk(sh){const S=POOL,T=S.T,cb=S.cue,d=standDist(T,cb.x,cb.z,S.shot.ax,S.shot.az,S.ax,S.az);S.stand=[T.cx+cb.x-S.shot.ax*d,T.cz+cb.z-S.shot.az*d];
  sh.path=perimPath(T.cx,T.cz,S.ax,S.az,[sh.x,sh.z],S.stand);S.state='walk';S.t=0;}
function cueOK(S,x,z){const T=S.T,r=S.cue.r;if(Math.abs(x)>T.hx-r*1.2||Math.abs(z)>T.hz-r*1.2)return false;return!T.balls.some(b=>b.on&&!b.cue&&Math.hypot(b.x-x,b.z-z)<2.1*r);}
// the nearest legal spot for the cue ball (behind the head string for a break)
function fitCue(S,x,z){const T=S.T,r=S.cue.r,mx=T.hx-r*1.3,mz=T.hz-r*1.3,xm=S.breakNext?-T.hx/2:mx;
  x=clamp(x,-mx,xm);z=clamp(z,-mz,mz);if(cueOK(S,x,z))return[x,z];
  for(let k=1;k<40;k++)for(let a=0;a<12;a++){const q=a/12*6.2832,nx=clamp(x+Math.cos(q)*k*.03,-mx,xm),nz=clamp(z+Math.sin(q)*k*.03,-mz,mz);if(cueOK(S,nx,nz))return[nx,nz];}
  return[-T.hx/2,0];}
// a shot chosen by a person: ang (radians, x towards z), pw (0 to 1) and, when the cue ball was in hand, where it was put
function humanShot(S,mv){const T=S.T,cb=S.cue,a=+mv.ang||0,pw=clamp(mv.pw==null?.5:+mv.pw,0,1);
  if(S.breakNext||S.ballInHand){const q=fitCue(S,mv.cx!=null?+mv.cx:-T.hx/2,mv.cz!=null?+mv.cz:0);cb.x=q[0];cb.z=q[1];cb.on=true;cb.mesh.visible=true;cb.vx=cb.vz=0;S.ballInHand=false;}
  return{ax:Math.cos(a),az:Math.sin(a),sp:.5+pw*6.1};}
function poolUpdate(t,dt){const S=POOL,T=S.T;stepDiscs(T,dt);
  for(const b of T.balls){if(!b.on)continue;b.mesh.position.set(T.cx+b.x,T.y+b.r,T.cz+b.z);const v=Math.hypot(b.vx,b.vz);if(v>0){_v.set(b.vz/v,0,-b.vx/v);b.mesh.rotateOnWorldAxis(_v,v*dt/b.r);}}
  const sh=S.players[S.shooter],wt=S.players[1-S.shooter],cue=S.cues[S.shooter],wcue=S.cues[1-S.shooter];
  if(wt.path&&wt.path.length)moveAlong(wt,dt);else{rest(wt);turnTo(wt,Math.atan2(T.cx-wt.x,T.cz-wt.z),dt);const J=wt.J,c=(t+wt.ph)%10;
    J.rSh.rotation.set(-.28,0,-.18);J.rEl.rotation.x=-.55;const ch=win(c,2,3.4,.4);J.lSh.rotation.set(lerp(.05,-1.75,ch),0,lerp(.08,-.55,ch));J.lEl.rotation.x=lerp(-.1,-1.1,ch);J.hips.rotation.z=Math.sin(t*.3)*.02;J.lKn.rotation.x=.1;}
  holdCue(wt,wcue);
  switch(S.state){
    case 'plan':{rest(sh);holdCue(sh,cue);if(moving(T))break;S.t+=dt;if(S.t<.7)break;
      S.onEight=!!S.groups[S.shooter]&&ballsOn(T,b=>b.kind===S.groups[S.shooter]).length===0;
      const M=poolMatch();if(M&&M.humans[S.shooter]){S.state='await';S.t=0;S.humanShot=false;updBoard();break;}   // a real player chooses the shot
      S.humanShot=false;S.shot=poolPlan();poolWalk(sh);updBoard();break;}
    case 'await':{rest(sh);holdCue(sh,cue);const M=poolMatch();if(!M){S.state='plan';break;}
      const mv=M.moves[M.mIdx];if(!mv){M.blocked=true;break;}
      M.mIdx++;if(mv.p!==S.shooter)break;   // not this player's move: ignore it
      if(mv.auto){S.humanShot=false;S.shot=poolPlan();}else{S.humanShot=true;S.shot=humanShot(S,mv);}
      poolWalk(sh);updBoard();break;}
    case 'walk':{const done=moveAlong(sh,dt);holdCue(sh,cue);if(done){S.state='turn';S.t=0;}break;}
    case 'turn':{rest(sh);holdCue(sh,cue);S.t+=dt;if(turnTo(sh,Math.atan2(S.shot.ax,S.shot.az),dt)||S.t>1){S.state='aim';S.t=0;}break;}
    case 'aim':case 'strike':case 'follow':{S.t+=dt;let back;
      if(S.state==='aim'){const k=Math.min(1,S.t/.5);back=.04+.11*(.5-.5*Math.cos(S.t*4.2))*k;if(S.t>(S.humanShot?.8:2.4)){S.state='strike';S.t=0;}}
      else if(S.state==='strike'){back=lerp(.15,-.02,Math.min(1,S.t/.09));if(S.t>.09&&!S.hit){S.hit=true;if(S.breakNext&&sfx.has('poolBreak'))T.hush=performance.now()+1800;tsnd(T,S.breakNext?'Break':'Cue',1);T.potted=[];T.firstHit=null;S.wasBreak=S.breakNext;S.breakNext=false;S.cue.vx=S.shot.ax*S.shot.sp;S.cue.vz=S.shot.az*S.shot.sp;S.state='follow';S.t=0;}}
      else{back=-.03;if(S.t>.8){S.state='watch';S.t=0;}}
      const k=S.state==='aim'?Math.min(1,S.t/.35):S.state==='follow'?1-ease((S.t-.5)/.3):1;poolPose(sh,back,k);
      if(!S.line)S.line=[T.cx+S.cue.x,T.cz+S.cue.z];const L=S.line,dx=S.shot.ax,dz=S.shot.az,nt=Math.hypot(1,.12),tx=L[0]-dx*(back+.03),tz=L[1]-dz*(back+.03),ty=T.y+.034;
      cue.position.set(tx,ty,tz);cue.lookAt(tx+dx/nt,ty-.12/nt,tz+dz/nt);
      const sb=clamp((tx-sh.x)*dx+(tz-sh.z)*dz+.12,.7,1.38);armIK(sh,'r',_vt.set(tx-dx/nt*sb,ty+.12/nt*sb,tz-dz/nt*sb),PG);sh.J.rHand.rotation.set(0,-1.2,0);
      armIK(sh,'l',_vt.set(L[0]-dx*.24,T.y+.04,L[1]-dz*.24),PB);sh.J.lHand.rotation.set(0,1.3,0);break;}
    case 'watch':{S.line=null;rest(sh);holdCue(sh,cue);const cb=S.cue;if(cb.on){const ly=Math.atan2(T.cx+cb.x-sh.x,T.cz+cb.z-sh.z);let rel=ly-sh.yaw;rel=Math.atan2(Math.sin(rel),Math.cos(rel));sh.J.neck.rotation.y=clamp(rel,-1.1,1.1);}
      if(moving(T)){S.t=0;break;}S.t+=dt;if(S.t<.7)break;S.hit=false;const prev=S.shooter,res=poolResolve();
      if(res==='over'){S.state='over';S.t=0;S.players[S.winner].cheer=3;updBoard();break;}
      if(res==='same')sh.cheer=.9;else{const old=S.players[prev];old.path=perimPath(T.cx,T.cz,S.ax,S.az,[old.x,old.z],S.wait[prev]);}
      S.state='plan';S.t=0;updBoard();break;}
    case 'over':{rest(sh);holdCue(sh,cue);S.t+=dt;if(S.t<3.2)break;
      S.rack();S.groups=[null,null];S.breakNext=true;S.wasBreak=false;S.ballInHand=false;S.games++;S.breaker=1-S.breaker;
      if(S.breaker!==S.shooter){sh.path=perimPath(T.cx,T.cz,S.ax,S.az,[sh.x,sh.z],S.wait[S.shooter]);S.shooter=S.breaker;}
      S.msg='নতুন গেম। '+PN[S.breaker]+' ব্রেক করবে।';S.state='plan';S.t=0;updBoard();break;}}
  for(const P of S.players)if(P.cheer>0){P.cheer-=dt;const J=P.J;J.lSh.rotation.set(-2.6,0,.3);J.lEl.rotation.x=-.35;if(P!==sh||S.state==='over'||S.state==='plan'){J.rSh.rotation.set(-2.5,0,-.3);J.rEl.rotation.x=-.35;}J.neck.rotation.x=-.18;talk(P,t,true);}
}
function poolPose(P,back,k){rest(P);const J=P.J;J.hips.position.y=STAND-.04*k;J.spine.rotation.x=.95*k;J.neck.rotation.x=-.8*k;J.head.rotation.x=-.12*k;
  J.lSh.rotation.set(lerp(.05,-2.55,k),0,lerp(.08,-.12,k));J.lEl.rotation.x=lerp(-.1,-.12,k);J.lHand.rotation.y=1.3*k;
  J.rSh.rotation.set(lerp(-.2,.45,k),0,lerp(-.08,.06,k));J.rEl.rotation.x=lerp(-.4,-1.5+back*3.2,k);
  J.lHip.rotation.x=-.32*k;J.lKn.rotation.x=.3*k;J.rHip.rotation.x=.14*k;J.rHip.rotation.z=-.06*k;}
function holdCue(P,cue){const J=P.J;if(!(P.path&&P.path.length)){J.rSh.rotation.x=Math.min(J.rSh.rotation.x,-.25);J.rSh.rotation.z=-.18;J.rEl.rotation.x=-.55;}
  else{J.rSh.rotation.set(-.25,0,-.18);J.rEl.rotation.x=-.55;}
  P.root.updateMatrixWorld(true);J.rHand.getWorldPosition(_v);cue.position.set(_v.x,1.47,_v.z);cue.lookAt(_v.x+.02,3,_v.z);}

/* ================= carrom controller (standing board) ================= */
const CN=[[0,-1],[-1,0],[0,1],[1,0]];
function carromUpdate(t,dt){if(!CARROM)return;const S=CARROM,T=S.T;stepDiscs(T,dt);
  for(const b of T.balls){if(!b.on)continue;b.mesh.position.set(T.cx+b.x,T.y+.0045,T.cz+b.z);}
  const cur=S.players[S.turn],n=CN[S.turn],pp=[-n[1],n[0]],st=S.striker;
  const look=(P,amt)=>{const ly=Math.atan2(T.cx+st.x-P.x,T.cz+st.z-P.z);let rel=ly-P.yaw;rel=Math.atan2(Math.sin(rel),Math.cos(rel));P.J.neck.rotation.set(amt,clamp(rel,-1,1),0);};
  S.players.forEach((P,i)=>{rest(P);const J=P.J;J.hips.position.y=STAND-.015;J.lKn.rotation.x=J.rKn.rotation.x=.1;J.lHip.rotation.x=J.rHip.rotation.x=-.06;
    if(i===S.turn&&(S.state==='aim'||S.state==='flick'))return;
    J.spine.rotation.x=.2;look(P,.4);const n=CN[i],lf=[n[1],-n[0]],ex=T.cx-n[0]*.43,ez=T.cz-n[1]*.43;
    armIK(P,'l',_vt.set(ex+lf[0]*.2,T.y+.035,ez+lf[1]*.2),PCL);armIK(P,'r',_vt.set(ex-lf[0]*.2,T.y+.035,ez-lf[1]*.2),PCR);J.lHand.rotation.set(0,1.3,0);J.rHand.rotation.set(0,-1.3,0);
    if(P.cheer>0){P.cheer-=dt;J.lSh.rotation.set(-2.7,0,.35);J.rSh.rotation.set(-2.7,0,-.35);J.lEl.rotation.x=-.3;J.rEl.rotation.x=-.3;J.neck.rotation.x=-.2;talk(P,t,true);}});
  S.watchers.forEach(P=>{rest(P);const J=P.J;J.lSh.rotation.set(-.55,0,-.42);J.lEl.rotation.x=-1.9;J.rSh.rotation.set(-.6,0,.42);J.rEl.rotation.x=-1.85;J.hips.rotation.z=Math.sin(t*.3+P.ph)*.02;J.lKn.rotation.x=.08;look(P,.3);
    if(S.buzz>0){J.lSh.rotation.set(-1.2,0,-.2);J.lEl.rotation.x=-1.4;J.rSh.rotation.set(-1.2,0,.2);J.rEl.rotation.x=-1.4;talk(P,t,true);}else talk(P,t,Math.sin(t*.6+P.ph)>.75);life(P,t,dt);});
  if(S.buzz>0)S.buzz-=dt;
  switch(S.state){
    case 'place':{if(moving(T))break;S.t+=dt;if(S.t<.8)break;
      let best=null;for(let u=-.2;u<=.201;u+=.05){const sx=-n[0]*.275+pp[0]*u,sz=-n[1]*.275+pp[1]*u;
        for(const c of S.coins){if(!c.on)continue;for(const p of T.pockets){let ux=p[0]-c.x,uz=p[1]-c.z;const ul=Math.hypot(ux,uz);ux/=ul;uz/=ul;const gx=c.x-ux*(c.r+st.r),gz=c.z-uz*(c.r+st.r);
          let ax=gx-sx,az=gz-sz;const al=Math.hypot(ax,az);if(al<.05)continue;ax/=al;az/=al;if(ax*n[0]+az*n[1]<.15)continue;const cut=ax*ux+az*uz;if(cut<.45)continue;
          const s=cut-.4*(al+ul)+SRC()*.25;if(!best||s>best.s)best={s,sx,sz,ax,az,sp:clamp(.9+(al+ul)*2.2,1.1,2.6)};}}}
      if(!best){const sx=-n[0]*.275,sz=-n[1]*.275;best={sx,sz,ax:n[0],az:n[1],sp:2.4};}
      S.cp=null;st.on=true;st.mesh.visible=true;st.x=best.sx;st.z=best.sz;st.vx=st.vz=0;for(const c of S.coins)if(c.on&&Math.hypot(c.x-st.x,c.z-st.z)<.04){c.x+=n[0]*.05;c.z+=n[1]*.05;}
      const nz=(SRC()-.5)*.04;S.shot={ax:best.ax*Math.cos(nz)-best.az*Math.sin(nz),az:best.ax*Math.sin(nz)+best.az*Math.cos(nz),sp:best.sp};S.state='aim';S.t=0;break;}
    case 'aim':case 'flick':{S.t+=dt;const J=cur.J;J.spine.rotation.x=.62;J.neck.rotation.set(-.05,0,0);J.lHip.rotation.x=J.rHip.rotation.x=-.12;J.lKn.rotation.x=J.rKn.rotation.x=.2;
      J.spine.rotation.x=.55;J.neck.rotation.set(.15,0,0);const n=CN[S.turn],lf=[n[1],-n[0]],ex=T.cx-n[0]*.43,ez=T.cz-n[1]*.43;
      armIK(cur,'l',_vt.set(ex+lf[0]*.24,T.y+.035,ez+lf[1]*.24),PCL);J.lHand.rotation.set(0,1.3,0);
      let off;if(S.state==='aim')off=.075+Math.sin(t*9)*.004;else off=S.t<.08?.075*(1-S.t/.08):-Math.min(.04,(S.t-.08)*.5);
      const cpx=S.cp?S.cp[0]:T.cx+st.x,cpz=S.cp?S.cp[1]:T.cz+st.z;armIK(cur,'r',_vt.set(cpx-S.shot.ax*off,T.y+.03,cpz-S.shot.az*off),PCR);J.rHand.rotation.set(-.3,-1.2,0);
      if(S.state==='aim'&&S.t>1.5){S.state='flick';S.t=0;}
      if(S.state==='flick'&&S.t>=.08&&!S.hit){S.hit=true;tsnd(T,'Flick',1);S.cp=[T.cx+st.x,T.cz+st.z];T.potted=[];st.vx=S.shot.ax*S.shot.sp;st.vz=S.shot.az*S.shot.sp;}
      if(S.state==='flick'&&S.t>.5){S.state='watch';S.t=0;}break;}
    case 'watch':{if(moving(T)){S.t=0;break;}S.t+=dt;if(S.t<.6)break;S.hit=false;
      const potC=T.potted.some(b=>!b.striker),foul=!st.on;st.on=true;st.mesh.visible=true;
      if(potC&&!foul){cur.cheer=1.3;S.buzz=1.2;if(S.sc)S.sc[S.turn]+=T.potted.filter(b=>!b.striker).length;}else{do{S.turn=(S.turn+1)%4;}while(S.skip&&S.skip.includes(S.turn));}
      if(S.sc){if(S.coins.filter(c=>c.on).length<=1){S.over=true;S.state='done';S.t=0;break;}}
      else if(S.coins.filter(c=>c.on).length<=4){for(const c of S.coins){c.on=true;c.mesh.visible=true;c.x=c.home[0];c.z=c.home[1];c.vx=c.vz=0;}}
      S.state='place';S.t=0;break;}}
}


/* ================= balcony chatter: speech bubbles over the heads of the people on the balcony ================= */
// The conversations live in chatter.js. Which one plays, who says what and when are all worked out from the shared clock, so everybody hears the same one.
const ROLE_TAG={se:'SE',qa:'QA',des:'ডিজাইনার'};
const CHAT_SLOT=50;
const chat={slot:-1,lines:[],el:null,idx:-2};
function buildChat(slot){const rng=mulberry32(slot*7919+13),conv=CONVOS[Math.floor(rng()*CONVOS.length)],who={},lines=[];let at=1.5;
  for(const [key,text] of conv){let sp=who[key];
    if(!sp){const used=Object.values(who),pool=BAL.filter(b=>b.role===key),free=pool.filter(b=>!used.includes(b)),from=free.length?free:pool;sp=who[key]=from[Math.floor(rng()*from.length)];}
    const dur=Math.min(7,1.8+text.length*.07);lines.push({at,dur,sp,text});at+=dur+.45;}
  chat.slot=slot;chat.lines=lines;chat.idx=-2;}
function hideBubble(){if(chat.el)chat.el.classList.remove('on');chat.idx=-2;}
function updateTalk(dt){
  if(!BAL.length)return;
  if(!chat.el){chat.el=document.createElement('div');chat.el.className='bub';bubbleLayer().appendChild(chat.el);}
  const d=Math.hypot(camera.position.x-6,camera.position.y-1.5,camera.position.z-8.7);
  if(d>(mode==='walk'?17:30)){hideBubble();return;}   // only chatter when you are near the balcony
  const w=worldT(),slot=Math.floor(w/CHAT_SLOT),off=w-slot*CHAT_SLOT;
  if(chat.slot!==slot)buildChat(slot);
  const i=chat.lines.findIndex(l=>off>=l.at&&off<l.at+l.dur);
  if(i<0){hideBubble();return;}
  const L=chat.lines[i];
  if(i!==chat.idx){chat.idx=i;chat.el.innerHTML='<i class="tag '+L.sp.role+'">'+ROLE_TAG[L.sp.role]+'</i><span></span>';chat.el.lastChild.textContent=L.text;chat.el.classList.add('on');}
  L.sp.P.J.neck.getWorldPosition(_v);_v.y+=.3;_v.project(camera);
  if(_v.z>1||_v.z<-1||Math.abs(_v.x)>1.05||Math.abs(_v.y)>1.05)chat.el.style.visibility='hidden';
  else{chat.el.style.visibility='';const w2=stage.clientWidth,h2=stage.clientHeight,bw=chat.el.offsetWidth;
    const x=Math.max(bw/2+6,Math.min(w2-bw/2-6,(_v.x*.5+.5)*w2)),y=(-_v.y*.5+.5)*h2;
    chat.el.style.transform='translate('+x+'px,'+y+'px) translate(-50%,-100%)';}}

/* ================= labels ================= */
const labelLayer=document.getElementById('labels'),labels=[];
let labelsOn=true,tallWalls=false;
function makeLabels(){for(const z of ZONES){if(z.hide)continue;const el=document.createElement('div');el.className='lbl';el.innerHTML='<b>'+z.bn+'</b><small>'+z.en+'</small>';labelLayer.appendChild(el);labels.push({el,z,pos:new THREE.Vector3(z.c[0],0,z.c[1])});}}
function updateLabels(){const w=stage.clientWidth,h=stage.clientHeight,top=(tallWalls?H:H*LOW)+.55;
  for(const L of labels){if(!labelsOn||mode==='walk'){L.el.style.display='none';continue;}_v.copy(L.pos);_v.y=top;_v.project(camera);
    if(_v.z>1||_v.z<-1||Math.abs(_v.x)>1.2||Math.abs(_v.y)>1.2){L.el.style.display='none';continue;}L.el.style.display='';
    L.el.style.transform='translate('+((_v.x*.5+.5)*w).toFixed(1)+'px,'+((-_v.y*.5+.5)*h).toFixed(1)+'px) translate(-50%,-100%)';}}
function setWalls(on){tallWalls=on;wallsG.scale.y=on?1:LOW;tallG.visible=on;document.getElementById('tgWalls').setAttribute('aria-pressed',String(on));}

/* ================= bake static meshes ================= */
function bake(group){group.updateMatrixWorld(true);const inv=new THREE.Matrix4().copy(group.matrixWorld).invert();const buckets=new Map(),rm=[];
  group.traverse(o=>{if(!o.isMesh||o.userData.noMerge)return;const g=o.geometry.clone();g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv,o.matrixWorld));
    for(const k of Object.keys(g.attributes))if(k!=='position'&&k!=='normal'&&k!=='uv')g.deleteAttribute(k);if(!g.attributes.uv)return;
    const key=o.material.uuid+'|'+(o.castShadow?1:0);if(!buckets.has(key))buckets.set(key,{m:o.material,c:o.castShadow,g:[]});buckets.get(key).g.push(g.index?g.toNonIndexed():g);rm.push(o);});
  rm.forEach(o=>o.parent.remove(o));
  for(const b of buckets.values()){const merged=THREE.BufferGeometryUtils.mergeBufferGeometries(b.g,false);if(!merged)continue;const e=new THREE.Mesh(merged,b.m);e.castShadow=b.c;e.receiveShadow=true;group.add(e);}
  // drop now-empty groups
  const empties=[];group.traverse(o=>{if(o!==group&&o.type==='Group'&&o.children.length===0)empties.push(o);});empties.forEach(o=>o.parent&&o.parent.remove(o));}

/* ================= walk mode and UI ================= */
let mode='orbit',player,keys={},joy={x:0,y:0},lookId=null,lookX=0,fly=null;
const RAD=.28;
const touchUI=()=>coarse||innerWidth<=820;
function syncTouchUI(){const w=mode==='walk',t=w&&touchUI();document.getElementById('joy').hidden=!t;document.getElementById('mbtns').hidden=!t;document.body.classList.toggle('touchui',touchUI());}
function hit(x,z,y){y=y||0;for(const c of colliders){if(c[4]!==undefined&&c[4]<=y+.05)continue;const cx=Math.max(c[0],Math.min(x,c[1])),cz=Math.max(c[2],Math.min(z,c[3]));if((x-cx)*(x-cx)+(z-cz)*(z-cz)<RAD*RAD)return true;}return x<-16||x>18.6||z<-16||z>10.6;}
function zoneAt(x,z){let best=null,ba=1e9;for(const zn of ZONES)if(x>=zn.r[0]&&x<=zn.r[1]&&z>=zn.r[2]&&z<=zn.r[3]){const a=(zn.r[1]-zn.r[0])*(zn.r[3]-zn.r[2])+(zn.hide?.5:0);if(a<ba){ba=a;best=zn;}}if(best)return best;for(const zn of ZONES)if(!zn.hide&&x>=zn.r[0]&&x<=zn.r[1]&&z>=zn.r[2]&&z<=zn.r[3])return zn;for(const zn of ZONES)if(x>=zn.r[0]&&x<=zn.r[1]&&z>=zn.r[2]&&z<=zn.r[3])return zn;return null;}
let lastZone='';
// Jumping: the player has a height (P.y) and a vertical speed. Low furniture is jumped over or stood on; walls, people and tall things are not.
const GRAV=22,JUMP_V=6.6;   // a jump peaks at about a metre, enough for a desk or a sofa
function supportAt(x,z,y){let best=0;for(const c of colliders){const top=c[4]===undefined?99:c[4];if(top>1.3||top<=best)continue;
  if(x>c[0]-.1&&x<c[1]+.1&&z>c[2]-.1&&z<c[3]+.1&&top<=y+.12)best=top;}return best;}
function airPose(P){const J=P.J;J.lSh.rotation.set(-.9,0,.5);J.rSh.rotation.set(-.9,0,-.5);J.lHip.rotation.x=-.7;J.rHip.rotation.x=-.35;J.lKn.rotation.x=.9;J.rKn.rotation.x=.5;J.spine.rotation.x=.05;}
// Hand-keyed body movement: kf() reads a value from a list of [time, value] keys, with smooth easing between them
const easeS=x=>x<=0?0:x>=1?1:x*x*(3-2*x);
function kf(u,k){if(u<=k[0][0])return k[0][1];for(let i=1;i<k.length;i++){if(u<=k[i][0]){const t=easeS((u-k[i-1][0])/(k[i][0]-k[i-1][0]));return k[i-1][1]+(k[i][1]-k[i-1][1])*t;}}return k[k.length-1][1];}
// a slap: wind up with the hand out wide and the body turned away, whip the arm across with the hips, follow through, recover (u runs 0..1)
function slapPose(P,u){const J=P.J;
  J.rSh.rotation.set(kf(u,[[0,0],[.38,-1.3],[.55,-1.4],[.8,-1.2],[1,0]]),0,kf(u,[[0,-.07],[.38,-1.25],[.55,.55],[.8,.95],[1,-.07]]));
  J.rEl.rotation.x=kf(u,[[0,-.1],[.38,-1.4],[.55,-.2],[.8,-.3],[1,-.1]]);J.rHand.rotation.y=-1.2*kf(u,[[0,0],[.3,1],[.9,1],[1,0]]);
  J.lSh.rotation.set(kf(u,[[0,0],[.38,-.5],[.55,-.2],[1,0]]),0,kf(u,[[0,.07],[.38,.5],[.8,.4],[1,.07]]));J.lEl.rotation.x=kf(u,[[0,-.1],[.4,-.6],[1,-.1]]);
  const sy=kf(u,[[0,0],[.38,.55],[.55,-.45],[.8,-.55],[1,0]]);
  J.spine.rotation.y=sy;J.spine.rotation.x=kf(u,[[0,0],[.38,-.08],[.55,.18],[.8,.15],[1,0]]);J.hips.rotation.y=kf(u,[[0,0],[.38,.3],[.55,-.25],[.8,-.3],[1,0]]);
  J.neck.rotation.y=-sy*.65;J.neck.rotation.x=kf(u,[[0,0],[.55,.12],[1,0]]);
  J.lHip.rotation.x=kf(u,[[0,0],[.38,.1],[.55,-.4],[.8,-.4],[1,0]]);J.lKn.rotation.x=kf(u,[[0,0],[.55,.25],[.8,.2],[1,0]]);J.rHip.rotation.x=kf(u,[[0,0],[.38,.18],[.55,.05],[1,0]]);
  J.mouth.scale.y=.0025+.008*kf(u,[[0,0],[.38,1],[.7,.4],[1,0]]);}
// a kick: cock the leg back, swing it through with the hips, snap the knee out, hold, recover
function kickPose(P,u){const J=P.J;
  J.rHip.rotation.x=kf(u,[[0,0],[.3,.55],[.42,-1.55],[.62,-1.5],[.85,-.3],[1,0]]);J.rKn.rotation.x=kf(u,[[0,0],[.3,1.5],[.42,.12],[.62,.2],[.85,.8],[1,0]]);J.rAn.rotation.x=kf(u,[[0,0],[.42,.5],[1,0]]);
  J.spine.rotation.x=kf(u,[[0,0],[.3,.12],[.42,-.38],[.62,-.35],[.85,-.1],[1,0]]);J.hips.rotation.y=kf(u,[[0,0],[.3,.2],[.42,-.3],[.7,-.25],[1,0]]);
  J.lHip.rotation.x=kf(u,[[0,0],[.3,.05],[.42,.25],[.62,.2],[1,0]]);J.lKn.rotation.x=kf(u,[[0,0],[.3,.35],[.5,.3],[1,0]]);
  J.lSh.rotation.set(kf(u,[[0,0],[.42,-.3],[1,0]]),0,kf(u,[[0,.07],[.42,.95],[.8,.6],[1,.07]]));J.rSh.rotation.set(kf(u,[[0,0],[.42,.4],[1,0]]),0,kf(u,[[0,-.07],[.42,-.95],[.8,-.6],[1,-.07]]));
  J.neck.rotation.x=kf(u,[[0,0],[.42,.25],[1,0]]);}
// the person who was hit (a = seconds since the blow): head snaps round, hand flies to the cheek, knees buckle, a step back; or doubled over holding the leg, hopping
function victimPose(P,a,kind){const J=P.J;let dy=0,back=0;
  if(kind==='slap'){
    J.neck.rotation.set(kf(a,[[0,0],[.09,.25],[.5,.2],[1.4,0]]),kf(a,[[0,0],[.09,-1.0],[.35,-.85],[1.4,0]]),kf(a,[[0,0],[.09,.35],[1.4,0]]));
    J.spine.rotation.y=kf(a,[[0,0],[.12,-.5],[.5,-.3],[1.4,0]]);J.spine.rotation.x=kf(a,[[0,0],[.15,-.2],[.6,.25],[1.4,0]]);
    J.lSh.rotation.set(kf(a,[[0,.05],[.3,-1.8],[1.0,-1.8],[1.4,.05]]),0,kf(a,[[0,.07],[.3,.2],[1.4,.07]]));J.lEl.rotation.x=kf(a,[[0,-.1],[.3,-2.4],[1.0,-2.4],[1.4,-.1]]);
    J.rSh.rotation.set(kf(a,[[0,0],[.15,-.8],[.5,-.2],[1.4,0]]),0,kf(a,[[0,-.07],[.15,-.9],[1.4,-.07]]));
    J.lKn.rotation.x=J.rKn.rotation.x=kf(a,[[0,0],[.15,.35],[.6,.15],[1.4,0]]);
    back=.38*easeS(a/.3)*(1-easeS((a-1)/.4));J.mouth.scale.y=a<.9?.012:.0025;}
  else if(kind==='kick'){
    J.spine.rotation.x=kf(a,[[0,0],[.15,.9],[.7,1.0],[1.7,0]]);J.neck.rotation.x=kf(a,[[0,0],[.2,.4],[1.7,0]]);
    J.lSh.rotation.set(kf(a,[[0,.05],[.25,-.4],[1,-.5],[1.7,.05]]),0,.1);J.rSh.rotation.set(kf(a,[[0,0],[.25,-.4],[1,-.5],[1.7,0]]),0,-.1);J.lEl.rotation.x=J.rEl.rotation.x=kf(a,[[0,-.1],[.25,-.3],[1.7,-.1]]);
    J.rHip.rotation.x=kf(a,[[0,0],[.2,-.9],[1.2,-.9],[1.7,0]]);J.rKn.rotation.x=kf(a,[[0,0],[.2,1.3],[1.2,1.3],[1.7,0]]);
    dy=a>.3&&a<1.3?Math.abs(Math.sin(a*13))*.06:0;back=.15*easeS(a/.25)*(1-easeS((a-1.2)/.5));J.mouth.scale.y=a<1.2?.011:.0025;}
  else{   // startled: somebody kicked my desk
    J.lSh.rotation.set(-2.7,0,.5);J.rSh.rotation.set(-2.7,0,-.5);J.lEl.rotation.x=J.rEl.rotation.x=-.3;J.neck.rotation.y=Math.sin(a*18)*.5*(1-a/1.2);
    dy=Math.sin(Math.min(1,a/.4)*Math.PI)*.18;J.mouth.scale.y=a<.8?.012:.0025;}
  return{dy,back};}

function offerPose(P,u){const J=P.J,s=Math.sin(Math.min(1,u)*Math.PI);J.rSh.rotation.set(-1.4*s,0,-.12);J.rEl.rotation.x=-.25*s;J.neck.rotation.y=0;if(P.cigGroup)P.cigGroup.visible=s>.1||P.cigGroup.visible;}

/* ---- hurting people and furniture: slaps and kicks ---- */
const SLAP={t:-1,cool:0,kind:'slap',dur:.62,imp:.285,fired:true,tg:null},HIT={t:0,age:-1,kind:'slap',dur:1.4},HS={t:0},SHAKE={t:0},FXS={cur:'',until:0,n:0},CMP={on:false,stage:'',t:0,kind:'slap'},TB=[],HITS=[];
const TS={k:1,t:0},CAMFX={on:false};   // TS: slow motion at the moment of impact; CAMFX: the camera punching in on the boss
function setFx(kind){FXS.cur=kind+':'+(++FXS.n);FXS.until=performance.now()+2500;}
function npcPeople(){const set=new Set(acts.map(a=>a.P));for(const P of POOL.players)set.add(P);for(const P of CARROM.players)set.add(P);for(const P of CARROM.watchers)set.add(P);
  set.delete(player);return[...set].filter(P=>P.root.visible&&!(MT&&MT.parts&&MT.parts.includes(P)));}
// what is in front of me: a boss, a colleague who is here right now, a simulated colleague, somebody's desk, or just furniture
function hurtTarget(kind){const P=player;if(mode!=='walk'||MT||CMP.on)return null;const fx=Math.sin(P.yaw),fz=Math.cos(P.yaw),reach=kind==='kick'?1.5:1.7;let best=null,bd=reach;
  const consider=(q,qx,qz,info)=>{const dx=qx-P.x,dz=qz-P.z,d=Math.hypot(dx,dz);if(d<bd&&d>.01&&(dx*fx+dz*fz)/d>.05&&Math.abs((P.y||0)-(q.y||0))<.8){bd=d;best=info;}};
  for(const id of BOSS_IDS){const B=BS.people[id];if(B&&B.root.visible&&!CHASE.on)consider(B,B.root.position.x,B.root.position.z,{kind:'boss',boss:id,P:B,name:BOSSES[id].bn});}
  for(const r of NET.remote.values())if(r.P.root.visible&&!(MT&&MT.ids&&MT.ids.includes(r.p.empId)))consider(r.P,r.x,r.z,{kind:'user',id:r.p.empId,P:r.P,r,name:r.p.nickname||shortName(r.p.name)});
  for(const q of npcPeople())consider(q,q.root.position.x,q.root.position.z,{kind:'npc',P:q,name:''});
  if(best||kind!=='kick')return best;
  // nobody there: a desk? (a colleague's desk if they are online, otherwise whoever sits there)
  let ds=null,dd=1.6;for(const s of DESKS){const dx=s[0]-P.x,dz=s[1]-P.z,d=Math.hypot(dx,dz);if(d<dd&&(dx*fx+dz*fz)/(d||1)>.2){dd=d;ds=s;}}
  if(ds){for(const r of NET.remote.values()){if(deskSpotFor(r.p.empId).seat===ds)return{kind:'user',id:r.p.empId,P:r.P,r,name:r.p.nickname||shortName(r.p.name),desk:true};}
    const sitter=npcPeople().find(q=>Math.hypot(q.x-ds[0],q.z-ds[1])<.6);if(sitter)return{kind:'npc',P:sitter,name:'',desk:true};}
  // plain furniture
  const ax=P.x+fx*.8,az=P.z+fz*.8;for(const c of colliders){const top=c[4]===undefined?99:c[4];if(top>1.3||top<.05)continue;if(ax>c[0]-.25&&ax<c[1]+.25&&az>c[2]-.25&&az<c[3]+.25)return{kind:'thing'};}
  return null;}
function tmpBubble(P,text,sec,cls){const el=document.createElement('div');el.className='bub on '+(cls||'mline');el.textContent=text;bubbleLayer().appendChild(el);TB.push({el,P,left:sec});}
function tbUpdate(dt){const w=stage.clientWidth,h=stage.clientHeight;
  for(const t of TB.slice()){t.left-=dt;if(t.left<=0){t.el.remove();TB.splice(TB.indexOf(t),1);continue;}
    t.P.J.neck.getWorldPosition(_v);_v.y+=.32;_v.project(camera);
    if(_v.z>1||_v.z<-1||Math.abs(_v.x)>1.1||Math.abs(_v.y)>1.1){t.el.style.visibility='hidden';continue;}t.el.style.visibility='';
    const bw=t.el.offsetWidth,x=Math.max(bw/2+6,Math.min(w-bw/2-6,(_v.x*.5+.5)*w)),y=(-_v.y*.5+.5)*h;t.el.style.transform='translate('+x+'px,'+y+'px) translate(-50%,-100%)';}}
function hitUpdate(dt){for(const h of HITS.slice()){h.age+=dt;
  if(h.age>=h.dur){HITS.splice(HITS.indexOf(h),1);h.P.root.position.set(h.x,h.y0,h.z);continue;}
  const v=victimPose(h.P,h.age,h.kind);h.P.root.position.set(h.x-Math.sin(h.P.yaw)*v.back,h.y0+v.dy,h.z-Math.cos(h.P.yaw)*v.back);}}
function flash(){const f=byId('flash');f.classList.remove('on');void f.offsetWidth;f.classList.add('on');}
async function api(path,body){try{const r=await fetch(path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});return await r.json().catch(()=>null);}catch(e){return null;}}
function doHurt(kind){if(SLAP.t>=0||SLAP.cool>0)return;const tg=hurtTarget(kind);if(!tg)return;
  const P=player;if(tg.P)P.yaw=Math.atan2(tg.P.root.position.x-P.x,tg.P.root.position.z-P.z);   // turn to face them
  if(SMOKE.on)stopSmoke(false);
  Object.assign(SLAP,{t:0,kind,cool:1.6,dur:kind==='kick'?.8:.62,imp:kind==='kick'?.34:.285,fired:false,tg});
  sfx.play('whoosh');setFx(kind);}
// the moment the blow lands: sound, a freeze-frame, a shake, and the other person's reaction
function impact(tg,kind){if(!tg)return;HS.t=.07;SHAKE.t=.2;const word=kind==='kick'?'লাথি':'চড়';
  sfx.play(tg.kind==='thing'?'bonk':kind==='kick'?'kick':'slap');
  if(tg.kind==='thing'){tmpBubble(player,'উফ! পা ব্যথা পেলাম 😖',2.2);return;}
  setTimeout(()=>sfx.play(kind==='kick'?'grunt':'ouch'),95);
  if(tg.kind==='boss'){startTrouble(tg.boss,kind);return;}
  const react=tg.desk?'desk':kind==='kick'?'kick':'slap';
  if(tg.kind==='user'){tg.r.hitAge=0;tg.r.hitKind=react;tmpBubble(tg.P,tg.desk?'আমার ডেস্কে লাথি?! 😱':'আউ! 😵',1.8);
    api('/api/slap',{action:'slap',target:tg.id,kind:tg.desk?'desk':kind}).then(d=>{
      if(d&&d.ok)toast((kind==='kick'?'ধুম! ':'চটাস! ')+tg.name+' এইচআরে অভিযোগ করতে গেছেন… শো-কজ আসছে!',4500);else toast((d&&d.error)||word+'টা লাগেনি, আবার চেষ্টা করুন।',3000);});}
  else{const P=tg.P;if(!HITS.some(h=>h.P===P))HITS.push({P,age:0,dur:react==='slap'?1.4:react==='kick'?1.7:1.2,kind:react,x:P.root.position.x,y0:P.root.position.y,z:P.root.position.z});
    const L=tg.desk?['আমার ডেস্কে লাথি?! ডেস্কটা তো আমার সন্তানের মতো!','এই! ডেস্কের কী দোষ?!','আমি এইচআরকে বলছি!']:['আউ! এইচআরকে বলছি!','এই! কী করলেন?!','আমি কিন্তু রেকর্ড করে রাখলাম!','ওরে বাবা! আমার শরীর!'];
    tmpBubble(P,L[Math.floor(Math.random()*L.length)],2.6);
    if(!NET.npcPending){NET.npcPending=true;const lk=tg.desk?'npcDesk':kind==='kick'?'npcKick':'npcSlap';setTimeout(()=>npcShowCause(lk),6500);}}}
async function npcShowCause(lk){NET.npcPending=false;const d=await api('/api/slap',{action:'npc',kind:lk==='npcDesk'?'desk':lk==='npcKick'?'kick':'slap'});
  if(d&&d.ok){if(PROFILE)PROFILE.employment=d.employment;showLetter(lk,'',d.before,d.employment,d.delta);}else if(d&&d.error)toast(d.error,3000);}

/* ---- show-cause letters: always in Bengali, always a bit silly ---- */
const LET={
  slap:[
    {t:'শো-কজ নোটিশ: হাত এত চালু কেন?',b:'প্রতি: {name}\n\n{v} জানিয়েছেন, আপনার হাত নাকি তাঁর গালের সাথে "পরিচিত" হয়েছে। এই পরিচয়-পর্ব কোম্পানির নিয়মে নেই। আমরা একটা পরিবার ঠিকই, কিন্তু সব আত্মীয়ের গালে চড় মারা যায় না।\n\nউপদেশ: রাগ উঠলে চা খান, হাত তুলবেন না। না পারলে অন্তত হাতে চায়ের কাপ তুলে রাখুন।',s:'ইতি, এইচআর (গাল সুরক্ষা সেল)'},
    {t:'সতর্কবার্তা: চটাস-কাণ্ড',b:'প্রিয় {name},\n\n{v}-এর গালে আপনার হাতের ছাপ এখনও আছে, ফরেনসিক বিভাগ বলছে ছাপটা আপনার হাতের সাথেই মেলে। আপনি যদি বলেন "মশা মারছিলাম", তাহলে বলে রাখি, মশাটা ছয় ফুট লম্বা ছিল এবং সে অভিযোগ করেছে।\n\nএই চিঠি আপনার চরিত্র-ফাইলে ঢুকে গেল।',s:'শুভকামনায়, এইচআর আপা (এখন একটু রাগান্বিত)'},
    {t:'কারণ দর্শাও: গালে গান কেন?',b:'{name},\n\nবিনা নোটিশে সহকর্মীর গালে তবলা বাজানো অফিস-আচরণবিধির ৪২ নম্বর ধারার লঙ্ঘন। {v} এই বাদ্যযন্ত্র-ব্যবহারে সম্মতি দেননি।\n\nতিন কর্মদিবসের মধ্যে লিখুন: "আমি আর চড় মারব না" (২০০ বার)। ভুল বানান হলে আরও ২০০ বার।',s:'ইতি, এইচআর বিভাগ (সাংস্কৃতিক শাখা)'}],
  kick:[
    {t:'শো-কজ নোটিশ: অফিসে ফুটবল?',b:'প্রতি: {name}\n\n{v}-কে আপনি নাকি ফুটবল ভেবে ভুল করেছেন। আমরা বলে রাখি, তিনি গোলপোস্ট নন, এবং অফিসে গোলের বদলে কাজ করতে হয়।\n\nআপনার জন্য নতুন নিয়ম: লাথি মারার ইচ্ছা হলে সোজা প্যান্ট্রিতে গিয়ে বাতাসকে মারুন।',s:'ইতি, এইচআর (ক্রীড়া ও শৃঙ্খলা শাখা)'},
    {t:'সতর্কবার্তা: পায়ের প্রতি পায়ের অত্যাচার',b:'প্রিয় {name},\n\n{v} জানিয়েছেন আপনার পা তাঁর পায়ের সাথে "সরাসরি সংঘর্ষ" করেছে। আপনার পা সম্ভবত আপনার মাথার চেয়ে দ্রুত সিদ্ধান্ত নেয়, এটা সুখবর নয়।\n\nসাথে ফ্রি পরামর্শ: জুতোর ফিতা শক্ত করে বাঁধুন, আর মন নরম করুন।',s:'শুভকামনায়, এইচআর আপা'},
    {t:'কারণ দর্শাও: কিক নাকি কিক-অফ?',b:'{name},\n\nআপনি অফিসের ভেতরে কিক-অফ করেছেন, অথচ ম্যাচ ঘোষণা হয়নি, রেফারি ছিল না, আর {v} খেলোয়াড় হিসেবে নিবন্ধিতও নন।\n\nআপনাকে লাল কার্ড দেওয়া হলো। (আসল কার্ড পরে পাবেন, প্রিন্টার নষ্ট।)',s:'ইতি, এইচআর বিভাগ (রেফারি প্যানেল)'}],
  desk:[
    {t:'শো-কজ নোটিশ: ডেস্কের কী দোষ?',b:'প্রতি: {name}\n\n{v}-এর ডেস্ক এখন মানসিক আঘাতে আছে। ডেস্কটা কাঁদছে, কিবোর্ড কাঁপছে, আর মাউস আজ কাজ করতে রাজি নয়। এই ক্ষতির দায় আপনার।\n\nআপনাকে ডেস্কের কাছে ক্ষমা চাইতে হবে, তারপর {v}-এর কাছে।',s:'ইতি, এইচআর (আসবাব কল্যাণ সেল)'},
    {t:'সতর্কবার্তা: কাঠের ওপর অত্যাচার',b:'প্রিয় {name},\n\nঅফিসের ডেস্ক কথা বলতে পারে না, তাই {v} তার পক্ষে মামলা করেছেন। ডেস্কের ভাষ্য: "আমি তো শুধু কাজের জন্য দাঁড়িয়ে ছিলাম, লাথি খাওয়ার জন্য নই।"\n\nআপনার রেটিং কাটা গেল। ডেস্ককে কাউন্সেলিং নেওয়ানো হচ্ছে, খরচ আপনার।',s:'শুভকামনায়, এইচআর আপা'}],
  npcSlap:[
    {t:'শো-কজ নোটিশ: নাম-না-জানা সহকর্মী',b:'প্রতি: {name}\n\nএক নিরীহ সহকর্মী অভিযোগ করেছেন আপনি তাঁকে চড় মেরেছেন। তিনি নাম বলতে চাননি, তবে আপনার চেহারার বর্ণনা দিয়েছেন: "সুন্দর, কিন্তু হাত চালু।"\n\nএইচআর বলছে: হাত দরকার কাজের জন্য, কাজ করুন।',s:'ইতি, এইচআর বিভাগ'}],
  npcKick:[
    {t:'শো-কজ নোটিশ: লাথি-কাণ্ড',b:'প্রতি: {name}\n\nএক সহকর্মীর পায়ে আপনার পা আকস্মিক "হ্যালো" বলেছে। তিনি এখনো ঠিকমতো হাঁটতে পারছেন না, তাই আজ বাসায় যেতে ক্যাবের খরচ দিতে হবে।\n\nবিল আপনার বেতন থেকে কাটা হবে না (বেতন আসবে আগামী সপ্তাহে, মনে আছে?)।',s:'ইতি, এইচআর বিভাগ'}],
  npcDesk:[
    {t:'শো-কজ নোটিশ: ডেস্ক-আক্রমণ',b:'প্রতি: {name}\n\nআপনি কাউকে নয়, তার ডেস্ককে লাথি মেরেছেন। ডেস্কের মালিক বলছেন, "ডেস্কই আমার সঙ্গী, ও না থাকলে অফিসে আমার আর কেউ নেই।"\n\nআপনার বিরুদ্ধে ডেস্কের মানহানির মামলাও করা হচ্ছে।',s:'ইতি, এইচআর বিভাগ'}],
  ceo:[
    {t:'চূড়ান্ত সতর্কীকরণ ও সাময়িক বরখাস্ত',b:'প্রতি: {name}\n\nআপনি সরাসরি সিইওর গায়ে হাত তুলেছেন! এই ঘটনা কোম্পানির ইতিহাসে প্রথম, এবং সম্ভবত শেষ, কারণ আপনি আর বেশিদিন থাকছেন না।\n\nআপনার এমপ্লয়মেন্ট রেটিং ৪০ পয়েন্ট কাটা হলো, আর পরবর্তী ছয় মাস আপনার চেয়ারে বসার অধিকার সিইওর পোষা ক্যাকটাসের থাকবে।\n\nআপনাকে সিইওর রুমে ডেকে ১ ঘণ্টা মোটিভেশনাল লেকচার শোনানো হবে। এটাই আসল শাস্তি।',s:'ইতি, সিইও (স্বাক্ষর: হিজিবিজি, তবে রাগ নিয়ে)'}],
  hr:[
    {t:'চূড়ান্ত সতর্কীকরণ: এইচআরের গায়ে হাত!',b:'প্রিয় {name},\n\nআমরা একটা পরিবার, আর পরিবারের এইচআরের গায়ে হাত তোলা মানে পুরো পরিবার ঘরছাড়া হওয়ার ঝুঁকি। আপনার ফাইলে লাল কালিতে বড় করে লেখা হলো: "বিপজ্জনক"।\n\nএমপ্লয়মেন্ট রেটিং ৩০ পয়েন্ট কাটা হলো। এবার ঈদের বোনাসও আপনার চেহারা দেখে দেওয়া হবে।\n\nআপনাকে ৩ দিন "আমি আমার আচরণ বদলাব" লিখে এইচআরের টেবিলে জমা দিতে হবে (হাতে লিখে)।',s:'শুভকামনায়, এইচআর আপা (মুখে হাসি, চোখে আগুন)'}],
  mgr:[
    {t:'ম্যানেজারের ব্যক্তিগত ও চূড়ান্ত বার্তা',b:'{name},\n\nতুমি আমাকে মেরেছ। আমি কিছু বলছি না। আমি শুধু আমার চোখের জল আটকাচ্ছি। আর এই মাসের সব ডেডলাইন তোমার নামে বসাচ্ছি।\n\nএমপ্লয়মেন্ট রেটিং ২৫ পয়েন্ট কাটা হলো। কাল সকাল ৮টায় ১-অন-১, সাথে বড় কাপের কফি আনবে (আমার জন্য)।\n\nআমি রাগ করিনি। আমি শুধু হতাশ। এবং একটু রাগও।',s:'—তোমার ম্যানেজার (আর কখনো তোমার বন্ধু নয়)'}]};
const DEFY=['আপনি ক্ষমা চাইতে অস্বীকার করেছেন। আপনার ফাইলে লাল কালিতে একটা দাগ পড়ল, আর এইচআরের ফাইল-কেবিনেটও রাগ করল।','ঠিক আছে, আপনি ক্ষমা চাইবেন না। আমরাও আপনাকে চা দেব না। এটাই শাস্তি।','অহংকার ভালো জিনিস, তবে অফিসে রেটিংয়ের চেয়ে দামি না। রেটিং আরও কাটা গেল।','আপনার জেদ রেকর্ড করা হয়েছে। প্রোমোশনের সময় এই পাতাটা সবার আগে খোলা হবে।'];
async function defy(){const no=byId('lNo');no.disabled=true;const d=await api('/api/slap',{action:'defy'}),cut=byId('lCut');
  if(d&&d.ok){if(PROFILE)PROFILE.employment=d.employment;cut.textContent+=' → ক্ষমা না চাওয়ায় আরও '+bnd(d.delta)+' কাটা: '+bnd(d.employment);byId('lBody').textContent+='\n\nপুনশ্চ: '+DEFY[Math.floor(Math.random()*DEFY.length)];byId('lOk').textContent='ঠিক আছে, মেনে নিলাম 😤';sfx.play('fail');}
  else toast((d&&d.error)||'এবার আর কাটা গেল না।',3000);}
function showLetter(kind,victim,before,after,delta){const set=LET[kind]||LET.slap,L=set[Math.floor(Math.random()*set.length)],name=window.CB_PLAYER.name;
  byId('lTitle').textContent=L.t;byId('lBody').textContent=L.b.replace(/\{name\}/g,name).replace(/\{v\}/g,victim||'সহকর্মী');byId('lSign').textContent=L.s;
  const cut=byId('lCut');cut.className='lcut bad';cut.textContent='এমপ্লয়মেন্ট রেটিং '+bnd(before)+' → '+bnd(after)+' (−'+bnd(delta)+')'+(after<=0?' · আপনি এখন "পরীক্ষাধীন কর্মী" 😬':'');
  byId('lOk').disabled=false;byId('lOk').textContent='ক্ষমা চাইলাম 🙏';byId('lNo').disabled=false;byId('mletter').hidden=false;sfx.play('fail');}
// someone you hurt has complained: HR's letter reaches you
function applyNotices(list){for(const n of list){if(NET.handled.has('n'+n.id))continue;NET.handled.add('n'+n.id);if(PROFILE)PROFILE.employment=n.after;
  showLetter(n.kind==='kick'?'kick':n.kind==='desk'?'desk':'slap',n.victim,n.before,n.after,n.delta);}}

/* ---- I was hurt: stagger, walk to HR, complain ---- */
function applySlaps(list){for(const s of list){if(NET.handled.has('s'+s.id)||CMP.on)continue;NET.handled.add('s'+s.id);onSlapped(s);}}
let HRP=null;
function hrPerson(){if(HRP&&HRP.root.visible)return HRP;HRP=acts.map(a=>a.P).find(P=>P.x>14.8&&P.x<18&&P.z>.5&&P.z<7.5)||null;return HRP;}
function onSlapped(s){Object.assign(CMP,{on:true,speed:0,stage:'hit',t:0,id:s.id,kind:s.kind||'slap',slapper:s.name,auto:null,arrived:false,hrSaid:false});
  if(CHASE.on)endChase();const hk=s.kind==='desk'?'desk':s.kind==='kick'?'kick':'slap';HIT.kind=hk;HIT.age=0;HIT.dur=hk==='slap'?1.4:hk==='kick'?1.7:1.2;HIT.t=HIT.dur;HS.t=.07;SHAKE.t=.2;
  flash();sfx.play(hk==='slap'?'slap':'kick');setTimeout(()=>sfx.play(hk==='kick'?'grunt':'ouch'),95);setFx('hit-'+hk);tmpBubble(player,hk==='desk'?'আমার ডেস্ক!! 😱':'আউ! 😵',1.8);
  toast(s.name+(s.kind==='desk'?' আপনার ডেস্কে লাথি মেরেছে!':s.kind==='kick'?' আপনাকে লাথি মেরেছে!':' আপনাকে চড় মেরেছে!')+' এইচআরে অভিযোগ করতে যাচ্ছেন…',4500);if(SMOKE.on)stopSmoke(false);}
function cmpUpdate(dt){if(!CMP.on)return;CMP.t+=dt;const P=player;
  if(CMP.kind==='pair'){if(!PAIR.on){CMP.on=false;return;}if(!PAIR.ready&&(CMP.arrived||nowS()-PAIR.t0>4.8||!PAIR.spot)){PAIR.ready=true;CMP.auto=null;CMP.stage='hold';if(PAIR.spot){P.x=PAIR.spot[0];P.z=PAIR.spot[1];}}return;}
  if(CMP.stage==='hit'&&CMP.t>(CMP.kind==='trouble'?2.6:1.1)){
    if(mode==='walk'&&!MT){const spot=CMP.kind==='trouble'?nearFree(-13.2,3.9):nearFree(15.7,4.1);CMP.stage='walk';CMP.t=0;CMP.arrived=false;CMP.speed=CMP.kind==='trouble'?2.1:0;CMP.auto=route(P.x,P.z,spot[0],spot[1]);}
    else{CMP.stage='file';CMP.t=0;}}
  else if(CMP.stage==='walk'&&(CMP.arrived||CMP.t>45)){CMP.auto=null;CMP.stage='speak';CMP.t=0;
    if(CMP.kind==='trouble'){sfx.play('slam');SHAKE.t=.25;}
    else{const hr=hrPerson();if(hr)P.yaw=Math.atan2(hr.x-P.x,hr.z-P.z);tmpBubble(P,'ম্যাডাম, '+CMP.slapper+(CMP.kind==='desk'?' আমার ডেস্কে লাথি মেরেছে! 😭':CMP.kind==='kick'?' আমাকে লাথি মেরেছে! 😭':' আমাকে চড় মেরেছে! 😭'),3.4);}}
  else if(CMP.stage==='speak'){
    if(CMP.kind==='trouble'){const B=BS.people[CMP.boss],L=[[.5,0,'এত বড় সাহস?! তোমার চাকরি এখন ঝুলছে!'],[2.3,0,'আমার গায়ে হাত?! তোমার বাপ-দাদার নাম ভুলিয়ে দেব!'],[4.2,0,'এই চিঠি তোমার জীবনের সেরা চিঠি হবে, মন দিয়ে পড়ো!'],[1.5,1,'স্যার... ভুল হয়ে গেছে... হাতটা পিছলে গিয়েছিল 🙏'],[3.3,1,'আর কোনোদিন হবে না স্যার, কসম! 😭']];
      CMP.said=CMP.said||{};L.forEach(([at,who,txt],i)=>{if(CMP.t>=at&&!CMP.said[i]){CMP.said[i]=1;tmpBubble(who?player:B,txt,2.4);if(!who){sfx.play('rage');SHAKE.t=.12;}}});
      if(CMP.t>6.4){CMP.said=null;CMP.stage='file';CMP.t=0;}}
    else{const hr=hrPerson();if(CMP.t>1.7&&!CMP.hrSaid){CMP.hrSaid=true;if(hr)tmpBubble(hr,['কী?! এত সাহস! আমি এখনই শো-কজ পাঠাচ্ছি! 😠','এই অফিসে এসব চলবে না! আমি চিঠি লিখছি!','নাম বলুন, আমি এক্ষুনি কারণ দর্শাও পাঠাচ্ছি!'][Math.floor(Math.random()*3)],3.2);sfx.play('pop');}
      if(CMP.t>4.6){CMP.stage='file';CMP.t=0;}}}
  else if(CMP.stage==='file'){CMP.stage='done';
    if(CMP.kind==='trouble'){api('/api/slap',{action:'boss',boss:CMP.boss,kind:CMP.act||'slap'}).then(d=>{
        if(d&&d.ok){if(PROFILE){PROFILE.employment=d.employment;PROFILE.xp=d.xp;}showLetter(CMP.boss,'',d.before,d.employment,d.delta);}else toast((d&&d.error)||'এবারের মতো বেঁচে গেলেন!',3500);
        CMP.on=false;});}
    else api('/api/slap',{action:'complain',id:CMP.id}).then(d=>{
      toast(d&&d.ok?'অভিযোগ জমা হয়েছে। এইচআর '+CMP.slapper+' কে শো-কজ পাঠিয়েছে ✉️':((d&&d.error)||'অভিযোগ জমা হয়নি।'),4500);CMP.on=false;});}}
// I hit a superior: the boss drags me to the CEO's room and I get a very serious letter
function startTrouble(boss,kind){if(CMP.on)return;if(CHASE.on)endChase();const B=BS.people[boss];
  Object.assign(CMP,{on:true,stage:'hit',t:0,kind:'trouble',boss,act:kind,auto:null,arrived:false,hrSaid:false,slapper:''});
  CMP.react=kind==='kick'?'kick':'slap';CMP.said=null;CMP.speed=0;flash();TS.k=.28;TS.t=.6;SHAKE.t=.3;
  sfx.play('gasp');setTimeout(()=>sfx.play('sting'),120);setTimeout(()=>sfx.play('rage'),900);
  if(B)tmpBubble(B,'কী?!! 😡',2.2);if(SMOKE.on)stopSmoke(false);
  const near=npcPeople().filter(q=>B&&Math.hypot(q.x-B.x,q.z-B.z)<8).slice(0,3);near.forEach((q,i)=>setTimeout(()=>tmpBubble(q,['ওরে বাবা! 😨','এবার শেষ!','সর্বনাশ!'][i%3],2.4),300+i*350));   // everyone nearby freezes and stares
  toast(BOSSES[boss].bn+'কে '+(kind==='kick'?'লাথি':'চড়')+' মারলেন?! এবার আর রক্ষা নেই… 😱',4500);}

/* ================= your own desk: the bag, the laptop, the cables, the chair ================= */
// Every employee has one desk for good (the server hands out the lowest free one on first login). You arrive with a bag on your back;
// once you are inside you are asked to go to your desk, where you unpack: bag down, laptop out, laptop on the desk, cables in, then you sit.
const DESKOWN={},DESKKIT={},PLATES={},CHAIRS=[];
const SETUP={state:'off',t:0},SIT={on:false,t:0,c:null};
const deskIdxFor=id=>{const o=DESKOWN[id];if(o!==undefined&&o!==null)return o%DESKS.length;let h=0;for(const c of String(id))h=(h*31+c.charCodeAt(0))>>>0;return h%DESKS.length;};   // nobody left over shares one by name
function deskSpotFor(id){const s=DESKS[deskIdxFor(id)],f0=Math.sin(s[2]),f1=Math.cos(s[2]),r0=-Math.cos(s[2]),r1=Math.sin(s[2]);
  return{seat:s,stand:nearFree(s[0]+r0*.8-f0*.2,s[1]+r1*.8-f1*.2)};}
function myDeskSpot(){return deskSpotFor(PROFILE.empId);}
// a point on the desk, given in the desk's own measurements (x across, y up, z away from the person sitting)
function dwp(s,lx,ly,lz){const ry=s[2],dx=s[0]+Math.sin(ry)*.75,dz=s[1]+Math.cos(ry)*.75;return new THREE.Vector3(dx+lx*Math.cos(ry)+lz*Math.sin(ry),ly,dz-lx*Math.sin(ry)+lz*Math.cos(ry));}
async function loadDeskOwners(){await refreshEmps();if(!EMPS)return;for(const e of EMPS)if(e.desk!=null)DESKOWN[e.empId]=e.desk;
  buildPlates(EMPS.concat([{desk:PROFILE.desk,name:window.CB_PLAYER.name,nickname:PROFILE.nickname}]));syncDesks();}
function syncDesks(){const here=new Set([PROFILE&&PROFILE.empId,...NET.players.keys()]);   // the simulated worker at a desk goes home when its owner is around
  for(const id in DESKOWN){const s=DESKS[DESKOWN[id]];if(s&&s.npc)s.npc.root.visible=!here.has(id)&&!(CLK.free&&false);}}
function buildPlates(list){for(const e of list){if(e.desk==null||PLATES[e.desk])continue;const s=DESKS[e.desk];if(!s)continue;
    const tex=canvasTex(256,64,(x,w,h)=>{x.fillStyle='#f4f1ea';x.fillRect(0,0,w,h);x.strokeStyle='#b9b2a0';x.lineWidth=3;x.strokeRect(2,2,w-4,h-4);x.fillStyle='#2b2b2b';x.font='700 25px "Hind Siliguri",sans-serif';x.textAlign='center';x.textBaseline='middle';
      const n=String(e.nickname||e.name||'');x.fillText(n.length>22?n.slice(0,21)+'…':n,w/2,h/2+1);});
    const g=new THREE.Group(),m=new THREE.Mesh(new THREE.PlaneGeometry(.2,.05),new THREE.MeshBasicMaterial({map:tex}));m.rotation.x=-.4;g.add(m);
    const f0=Math.sin(s[2]),f1=Math.cos(s[2]);g.position.set(s[0]+f0*.43,.775,s[1]+f1*.43);g.rotation.y=Math.atan2(-f0,-f1);scene.add(g);PLATES[e.desk]=g;}}

/* ---- the bag ---- */
function addBag(P){if(P.bag)return;const g=P.gp(P.J.spine,0,.3,-.15),col=mat('#2f6f73',.8);
  P.pm(g,UB,col,0,0,0,.27,.36,.13,true);P.pm(g,UB,mat('#265a5d',.8),0,-.06,-.075,.2,.16,.03);
  for(const x of[-.085,.085])P.pm(g,UB,mat('#1e4548',.9),x,.12,.07,.03,.02,.26);
  const flap=P.gp(g,0,.18,-.065);P.pm(flap,UB,mat('#265a5d',.8),0,.0,.07,.27,.03,.15);flap.userData.flap=true;P.bag=g;P.bagFlap=flap;}
function removeBag(P){if(!P.bag)return;P.bag.parent&&P.bag.parent.remove(P.bag);P.bag=null;P.bagFlap=null;}
function makeKit(s){const f0=Math.sin(s[2]),f1=Math.cos(s[2]),pos=dwp(s,0,.772,-.1),g=new THREE.Group();g.position.copy(pos);g.rotation.y=s[2]+Math.PI;scene.add(g);g.updateMatrixWorld(true);
  const base=new THREE.Mesh(UB,mat('#a3a8ae',.45,.4));base.scale.set(.33,.016,.23);base.castShadow=true;g.add(base);
  const kb=new THREE.Mesh(UB,mat('#2a2c30',.6));kb.scale.set(.28,.002,.12);kb.position.set(0,.009,.03);g.add(kb);
  const lid=new THREE.Group();lid.position.set(0,.008,-.11);g.add(lid);
  const back=new THREE.Mesh(UB,mat('#a3a8ae',.45,.4));back.scale.set(.33,.21,.008);back.position.set(0,.105,0);lid.add(back);
  const off=new THREE.Mesh(new THREE.PlaneGeometry(.3,.19),new THREE.MeshBasicMaterial({color:0x0b0c0f}));off.position.set(0,.105,.0047);lid.add(off);
  const on=new THREE.Mesh(new THREE.PlaneGeometry(.3,.19),TX.screens[0]);on.position.set(0,.105,.0052);on.visible=false;lid.add(on);
  const led=new THREE.Mesh(US,new THREE.MeshBasicMaterial({color:0x2ecc59}));led.scale.set(.004,.004,.004);led.position.set(.17,.01,-.02);led.visible=false;g.add(led);
  lid.rotation.x=Math.PI/2;g.visible=false;
  const cabM=new THREE.MeshStandardMaterial({color:0x111111,roughness:.6}),cab=()=>{const m=new THREE.Mesh(new THREE.CylinderGeometry(.005,.005,1,6),cabM);m.visible=false;scene.add(m);return m;};
  return{g,lid,off,on,led,cab1:cab(),cab2:cab(),port1:g.localToWorld(new THREE.Vector3(-.17,.01,-.03)),port2:g.localToWorld(new THREE.Vector3(.17,.01,-.03)),mon:dwp(s,.05,.765,.2),sock:dwp(s,.62,.06,.16)};}
function cableBetween(m,a,b){const d=_vt.copy(b).sub(a),L=d.length()||.001;m.position.copy(a).addScaledVector(d,.5);m.scale.set(1,L,1);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());m.visible=true;}
const lerpAng=(a,b,k)=>{let d=b-a;d=Math.atan2(Math.sin(d),Math.cos(d));return a+d*k;};
function startSetup(){const P=player,d=myDeskSpot(),s=d.seat,f0=Math.sin(s[2]),f1=Math.cos(s[2]),r0=-Math.cos(s[2]),r1=Math.sin(s[2]);
  Object.assign(SETUP,{state:'run',t:0,s,f:[f0,f1],r:[r0,r1],from:[P.x,P.z],stand:[s[0]+r0*.5+f0*.2,s[1]+r1*.5+f1*.2],bagFloor:new THREE.Vector3(s[0]+r0*.95-f0*.05,.18,s[1]+r1*.95-f1*.05),detached:false});
  SETUP.kit=DESKKIT[deskIdxFor(PROFILE.empId)]||(DESKKIT[deskIdxFor(PROFILE.empId)]=makeKit(s));
  byId('deskbar').hidden=true;if(BS.mark)BS.mark.visible=false;if(SMOKE.on)stopSmoke(false);for(const k in keys)keys[k]=false;}
function setupUpdate(P,dt,t){const S=SETUP,s=S.s,f=S.f,K=S.kit,J=P.J;S.t+=dt;const a=S.t;
  const wk=ease(a/.7);if(a<7.2){P.x=lerp(S.from[0],S.stand[0],wk);P.z=lerp(S.from[1],S.stand[1],wk);}
  P.yaw=lerpAng(P.yaw,Math.atan2(f[0],f[1]),Math.min(1,dt*8));P.y=0;P.root.position.set(P.x,0,P.z);P.root.rotation.y=P.yaw;rest(P);
  const hand=(side,v)=>armIK(P,side,v,side==='r'?PTR:PTL),V=(x,y,z)=>new THREE.Vector3(x,y,z),bag=P.bag;
  const lapStart=new THREE.Vector3();
  if(a>=.9&&!S.detached&&bag){S.detached=true;scene.attach(bag);S.bagFrom=bag.position.clone();}
  if(bag&&S.detached){   // bag comes off the back and goes down beside the chair
    const k=ease((a-.9)/1);bag.position.lerpVectors(S.bagFrom,S.bagFloor,k);bag.position.y+=Math.sin(k*Math.PI)*.12;bag.rotation.set(0,P.yaw+Math.PI,0);}
  if(a>.9&&a<2.0){J.spine.rotation.x=.55*ease((a-.9)/.5);if(bag)hand('r',bag.position.clone().add(V(0,.16,0)));hand('l',bag.position.clone().add(V(0,.1,.0)));}
  if(bag&&P.bagFlap){const fl=ease((a-2.0)/.5);P.bagFlap.rotation.x=-1.9*fl;}
  const top=S.bagFloor.clone().add(V(0,.3,0)),desk=dwp(s,0,.772,-.1);
  K.g.visible=a>2.3;
  if(a>=2.0&&a<3.0){J.spine.rotation.x=.75;hand('r',top.clone().add(V(0,.05,0)));hand('l',S.bagFloor.clone().add(V(.0,.2,.05)));}
  if(a>=2.3&&a<4.4){const k=ease((a-2.5)/1.9);K.g.position.lerpVectors(top.clone().add(V(0,.05,0)),desk,k);K.g.position.y+=Math.sin(k*Math.PI)*.18;K.g.rotation.y=P.yaw+Math.PI;
    const hp=K.g.position;J.spine.rotation.x=lerp(.75,.5,k);hand('r',hp.clone().add(V(.16,0,0).applyAxisAngle(V(0,1,0),P.yaw)));hand('l',hp.clone().add(V(-.16,0,0).applyAxisAngle(V(0,1,0),P.yaw)));}
  if(a>=4.4){K.g.position.copy(desk);K.g.rotation.y=s[2]+Math.PI;}
  if(a>=4.4&&a<5.4){J.spine.rotation.x=.5;const k=ease((a-4.5)/.8);K.lid.rotation.x=lerp(Math.PI/2,-.28,k);hand('r',K.g.localToWorld(V(0,.1+.1*k,-.11)));hand('l',K.g.localToWorld(V(-.16,.02,.08)));}
  if(a>=5.4)K.lid.rotation.x=-.28;
  if(a>=5.4&&a<6.5){J.spine.rotation.x=.55;const k=ease((a-5.5)/.9),h=K.port1.clone().lerp(K.mon,k);hand('r',h);hand('l',K.g.localToWorld(V(-.16,.02,.08)));cableBetween(K.cab1,K.port1,h);}
  if(a>=6.5)cableBetween(K.cab1,K.port1,K.mon);
  if(a>=6.5&&a<7.4){J.spine.rotation.x=.6;const k=ease((a-6.6)/.8),h=K.port2.clone().lerp(K.sock,k);hand('r',h);hand('l',K.g.localToWorld(V(.16,.02,.08)));cableBetween(K.cab2,K.port2,h);}
  if(a>=7.4){cableBetween(K.cab2,K.port2,K.sock);K.led.visible=true;K.off.visible=false;K.on.visible=true;}
  if(a>=7.2){const k=ease((a-7.2)/.9);P.x=lerp(S.stand[0],s[0],k);P.z=lerp(S.stand[1],s[1],k);P.root.position.set(P.x,0,P.z);rest(P);sit(P,lerp(.95,.48,k));J.spine.rotation.x=lerp(.4,.1,k);
    J.rSh.rotation.set(-.7,0,-.14);J.lSh.rotation.set(-.7,0,.14);}
  if(a>=8.3){removeBag(P);S.state='done';SIT.on=true;SIT.t=1;SIT.from=null;SIT.c={x:s[0],z:s[1],yaw:s[2],h:.48,desk:s};P.seat=.48;P.kbd=.6;P.v='type';P.role=window.CB_PLAYER.role||'se';
    toast('ল্যাপটপ চালু! এবার কাজ শুরু (E বা হাঁটলে উঠে দাঁড়াবেন)',4500);try{localStorage.setItem('cb-setup-day',new Date().toDateString());}catch(e){}}}
// asked to go to the desk: a ring on the floor and a banner
function deskPrompt(P){if(SETUP.state!=='bag'||MT||CMP.on||CHASE.on)return;const d=myDeskSpot(),m=bossMark(),bar=byId('deskbar');
  m.visible=true;m.position.set(d.stand[0],0,d.stand[1]);m.position.y=Math.sin(performance.now()/250)*.05;
  const dd=Math.hypot(P.x-d.stand[0],P.z-d.stand[1]);bar.hidden=false;byId('deskD').textContent='আপনার ডেস্ক এখান থেকে '+bnd(Math.round(dd))+' মিটার · সবুজ গোল দাগের কাছে যান';
  if(dd<1.2)startSetup();}

/* ---- sitting down and standing up anywhere ---- */
function chairNear(){const P=player;if(SIT.on||MT||CMP.on||SETUP.state==='run'||P.gnd===false)return null;let best=null,bd=.95;
  const busy=c=>{for(const q of npcPeople())if(Math.hypot(q.x-c.x,q.z-c.z)<.5)return true;for(const r of NET.remote.values())if(r.P.root.visible&&Math.hypot(r.x-c.x,r.z-c.z)<.5)return true;return false;};
  for(const c of CHAIRS){const d=Math.hypot(c.x-P.x,c.z-P.z);if(d<bd&&!busy(c)){bd=d;best=c;}}
  for(const s of DESKS){const d=Math.hypot(s[0]-P.x,s[1]-P.z);if(d<bd){const c={x:s[0],z:s[1],yaw:s[2],h:.48,desk:s};if(!busy(c)){bd=d;best=c;}}}
  return best;}
function startSit(c){const P=player;SIT.on=true;SIT.t=0;SIT.c=c;SIT.from=[P.x,P.z];if(SMOKE.on)stopSmoke(false);P.seat=c.h;P.kbd=.6;P.v='type';P.role=window.CB_PLAYER.role||'se';sfx.play('pop',.2);}
function standUp(){const P=player,c=SIT.c;if(!SIT.on)return;SIT.on=false;
  if(c){const f0=Math.sin(c.yaw),f1=Math.cos(c.yaw),q=nearFree(c.x-f0*.75,c.z-f1*.75);P.x=q[0];P.z=q[1];P.yaw=c.yaw+Math.PI;}P.y=0;P.vy=0;}
function sitUpdate(P,t,dt){const c=SIT.c;SIT.t+=dt;const k=ease(SIT.t/.5);
  if(SIT.from){P.x=lerp(SIT.from[0],c.x,k);P.z=lerp(SIT.from[1],c.z,k);}else{P.x=c.x;P.z=c.z;}
  P.yaw=lerpAng(P.yaw,c.yaw,Math.min(1,dt*8));P.y=0;P.root.position.set(P.x,0,P.z);P.root.rotation.y=P.yaw;
  if(c.desk){P.v='type';aType(P,t,dt);}else{rest(P);sit(P,c.h);const J=P.J;J.spine.rotation.x=.08;J.lSh.rotation.set(-.45,0,.16);J.rSh.rotation.set(-.45,0,-.16);J.lEl.rotation.x=J.rEl.rotation.x=-1.4;J.neck.rotation.y=Math.sin(t*.4)*.2;}}

/* ---- smoking on the balcony: the lighter comes out of the pocket, then the cigarette is lit ---- */
const SMOKE={on:false,t:0,buddy:null},SMOKE_LEN=45,PAIR={on:false,ready:false};
const V3=(x,y,z)=>new THREE.Vector3(x,y,z),nowS=()=>(Date.now()+NET.skew)/1000;
function ensureLighter(P){if(P.lighter)return P.lighter;const g=new THREE.Group(),body=new THREE.Mesh(UB,mat('#cfd3d8',.3,.8));body.scale.set(.022,.05,.012);g.add(body);
  const cap=new THREE.Mesh(UB,mat('#8a8f96',.3,.8));cap.scale.set(.022,.012,.012);cap.position.y=.03;g.add(cap);
  const flame=new THREE.Mesh(US,new THREE.MeshBasicMaterial({color:0xffb347}));flame.scale.set(.008,.017,.008);flame.position.y=.052;flame.visible=false;g.add(flame);g.userData.flame=flame;g.visible=false;scene.add(g);return P.lighter=g;}
const pocketPos=(P,side)=>{P.root.updateMatrixWorld(true);return P.root.localToWorld(V3(side*.19,.88,.05));};   // side 1 = the left pocket, -1 = the right
const fwdOf=P=>V3(Math.sin(P.yaw),0,Math.cos(P.yaw)),mouthW=P=>P.J.mouthPt.getWorldPosition(V3(0,0,0)),tipW=P=>P.cigTip.getWorldPosition(V3(0,0,0));
const cigHandPos=P=>mouthW(P).addScaledVector(fwdOf(P),.075).add(V3(0,-.045,0)),restHand=(P,side)=>pocketPos(P,side).addScaledVector(fwdOf(P),.13);
function lightHandPos(P){return tipW(P).add(V3(0,-.055,0)).addScaledVector(fwdOf(P),-.01);}
// the cigarette burns down once it is lit; an unlit one stays cold
function burnCig(P,k,t){if(!P.cigBody)return;
  if(P.cigLit===false){P.cigTip.material.color.setRGB(.28,.22,.2);P.cigTip.scale.set(.0042,.0042,.0042);return;}
  const f=1-.7*Math.min(1,Math.max(0,k));P.cigBody.scale.y=f;P.cigBody.position.z=-.0075+.075*f/2;P.cigTip.position.z=-.0075+.075*f;
  const pulse=.5+.5*Math.sin(t*5+(P.ph||0)),s=.0048*(1+.3*pulse);P.cigTip.scale.set(s,s,s);P.cigTip.material.color.setRGB(1,.3+.3*pulse,.08);}
// the lighting scene, a = seconds since it began: hand to the pocket, lighter out, up to the cigarette, flame, lit, and (alone) back into the pocket
function lightCeremony(P,a,t,ret){const J=P.J;P.root.updateMatrixWorld(true);const L=ensureLighter(P);P.cigGroup.visible=true;
  armIK(P,'r',restHand(P,-1).lerp(cigHandPos(P),ease((a-.1)/.7)),PTR);J.rHand.rotation.set(0,1.2,0);
  const pocket=pocketPos(P,1),tip=lightHandPos(P);let h;
  if(a<.8)h=restHand(P,1).lerp(pocket,ease(a/.8));else if(a<1.3)h=pocket.clone();else if(a<2.2)h=pocket.clone().lerp(tip,ease((a-1.3)/.9));else if(a<2.5||!ret)h=tip.clone();else h=tip.clone().lerp(pocket,ease((a-2.5)/.7));
  armIK(P,'l',h,PTL);P.lhT=h;J.neck.rotation.x=.22*ease((a-1.2)/.4);J.spine.rotation.x=.06;
  L.visible=a>1.0&&(a<3.1||!ret);L.position.copy(h).add(V3(0,.055,0));L.rotation.y=P.yaw;L.userData.flame.visible=a>1.95&&a<2.5;
  if(a>=2.2&&P.cigLit===false){P.cigLit=true;puff(tipW(P),.03,2,V3(0,.1,0),.4);}}
function startSmoke(buddy,skip){const P=player;if(lastZone!=='bal'||SMOKE.on)return;
  if(!P.cigTip)addCig(P);P.cigGroup.visible=true;P.cigLit=!!skip;ensureLighter(P);SMOKE.on=true;SMOKE.t=skip?3.2:0;SMOKE.buddy=buddy||null;sfx.play('lighter');
  if(!skip)toast(buddy?'দুজনে মিলে সুখটান! 🚬 ('+buddy+')':'সিগারেট ধরালেন 🚬 (ধূমপান স্বাস্থ্যের জন্য ক্ষতিকর)। হাঁটলে বা লাফ দিলে ফেলে দেবেন।',4500);}
function stopSmoke(natural){if(!SMOKE.on)return;SMOKE.on=false;SMOKE.buddy=null;if(player.cigGroup)player.cigGroup.visible=false;if(player.lighter)player.lighter.visible=false;
  if(natural)toast('সিগারেট শেষ! এবার কাজে ফিরুন।',3000);}
// while smoking (solo): the lighting scene first, then ordinary puffing
function smokePose(P,s,t,dt){if(s<3.2)lightCeremony(P,s,t,true);else{if(P.lighter)P.lighter.visible=false;P.cigLit=true;aSmoke(P,t,dt);burnCig(P,(s-3.2)/SMOKE_LEN,t);}}

/* ---- two people at the balcony: an invitation to smoke, or "I have no cigarette" ---- */
const OFFER={t:-1},SOC={out:null},PASS={mesh:null};
const BEG=[
  ['ভাই, একটা সিগারেট হবে? আজ ব্যাগেই ফেলে এসেছি!','কালও তো এই কথাই বলেছিলে। তোমার সিগারেট কি বাসায় ঘুমায়?','আরে ভাই, ওরা কাল রাত থেকে ছুটিতে আছে!','নাও, কিন্তু এটাই শেষ ধার। পরেরবার কিস্তিতে দেব!','সুদসহ ফেরত দিও কিন্তু! আসল না হলেও সুদটা দিও!','ধন্যবাদ বস! আপনি তো সাক্ষাৎ সিগারেট-দেবতা!'],
  ['দাদা, সিগারেট আছে? আমার ব্র্যান্ড আজ বাজারে নেই!','বাজারে নেই মানে? তুমি তো কালও আমার প্যাকেট থেকে নিয়েছিলে!','ওটা তো ধার ছিল না, ওটা ছিল "শেয়ারিং ইজ কেয়ারিং"!','আচ্ছা আচ্ছা, নাও। শেয়ারিংয়ের জ্বালায় আমার প্যাকেট এখন ডায়েটে!','মনে রেখো, আমি তোমার ডেবিট-ক্রেডিট খাতায় লিখে রাখছি!','ধন্যবাদ ভাই! আজ থেকে আপনি আমার ব্যাংক!'],
  ['ভাই, আমার সিগারেট শেষ। একটা দেবেন, প্লিজ?','তোমার সিগারেট সবসময় শেষ হয় কেন? তুমি কি একসাথে সব খেয়ে ফেলো?','না ভাই, মনের দুঃখে একটু বেশি হয়ে গেছে!','দুঃখ তো আমারও আছে, তাও তো আমি প্যাকেট ভরে আনি! নাও।','এই নিয়ে তিনবার! চতুর্থবার এলে বিল পাঠাব!','আপনি না থাকলে এই অফিসে ধোঁয়াই উঠত না!']];
function ensurePass(){if(PASS.mesh)return PASS.mesh;const g=new THREE.Group(),b=new THREE.Mesh(cylG(.0042,.0042,.075,8),mat('#f4f1ea',.6));b.rotation.x=Math.PI/2;g.add(b);const f=new THREE.Mesh(cylG(.0045,.0045,.02,8),mat('#c98a3c',.6));f.rotation.x=Math.PI/2;f.position.z=-.04;g.add(f);g.visible=false;scene.add(g);return PASS.mesh=g;}
function smokeBuddy(){if(lastZone!=='bal'||SMOKE.on||MT||CMP.on||SOC.out||PAIR.on)return null;let best=null,bd=2.8;
  for(const r of NET.remote.values()){if(!r.P.root.visible||r.p.zone!=='bal')continue;const d=Math.hypot(r.x-player.x,r.z-player.z);if(d<bd){bd=d;best=r;}}return best;}
// someone standing nearby who is smoking: a colleague who is online, or one of the people on the balcony
function begTarget(){if(lastZone!=='bal'||SMOKE.on||MT||CMP.on||SOC.out||PAIR.on)return null;let best=null,bd=2.8;const P=player;
  for(const r of NET.remote.values()){if(!r.P.root.visible||r.pose!=='smoke')continue;const d=Math.hypot(r.x-P.x,r.z-P.z);if(d<bd){bd=d;best={r,live:true,P:r.P,id:r.p.empId,name:r.p.nickname||shortName(r.p.name)};}}
  for(const b of BAL){const q=b.P;if(!q.root.visible||!q.cigTip)continue;const d=Math.hypot(q.x-P.x,q.z-P.z);if(d<bd){bd=d;best={live:false,P:q,name:'ভাই'};}}
  return best;}
function sendSmokeInvite(r){if(!r||SOC.out)return;OFFER.t=0;setFx('offer');if(!player.cigTip)addCig(player);player.cigGroup.visible=true;player.cigLit=false;sfx.play('pop');
  tmpBubble(player,['ভাই, একটা সুখটান দেবেন? 🚬','চলেন, বারান্দায় এক টান হয়ে যাক!','বস নেই, এই সুযোগে একটা টান?'][Math.floor(Math.random()*3)],3.2);
  SOC.out={name:r.p.nickname||shortName(r.p.name),id:r.p.empId,kind:'smoke'};
  api('/api/social',{action:'send',target:r.p.empId,kind:'smoke',x:player.x,z:player.z}).then(d=>{if(!(d&&d.ok)){toast((d&&d.error)||'ডাকটা পৌঁছায়নি।',3000);SOC.out=null;if(player.cigGroup&&!SMOKE.on)player.cigGroup.visible=false;}
    else setTimeout(()=>{if(SOC.out){SOC.out=null;if(!SMOKE.on&&player.cigGroup)player.cigGroup.visible=false;toast('কোনো সাড়া নেই… একাই টানুন তাহলে 😅',3000);}},45000);});}
function sendBeg(tg){if(!tg)return;
  if(!tg.live){startPair('beg','asker',nowS()+.2,tg.name,null,tg.P,{x:player.x,z:player.z});return;}
  SOC.out={name:tg.name,id:tg.id,kind:'beg'};tmpBubble(player,'ভাই… আমার সিগারেট নেই… 🥺',3);
  api('/api/social',{action:'send',target:tg.id,kind:'beg',x:player.x,z:player.z}).then(d=>{if(!(d&&d.ok)){toast((d&&d.error)||'বলাটা পৌঁছায়নি।',3000);SOC.out=null;}
    else setTimeout(()=>{if(SOC.out){SOC.out=null;toast(tg.name+' শুনল না… 😅',3000);}},45000);});}
function showSocialIn(s){NET.smokeId=s.id;NET.smokeFrom=s;
  byId('smkT').textContent=shortName(s.name)+(s.kind==='beg'?' বলছে তার সিগারেট নেই! 🥺':' আপনাকে বারান্দায় সিগারেট খেতে ডাকছে! 🚬');
  byId('smkP').textContent=s.kind==='beg'?'একটা সিগারেট ধার দেবেন? (ফেরত পাবেন কি না, তা আল্লাহ জানেন)':'বারান্দায় গিয়ে একসাথে এক টান দেবেন? (ধূমপান স্বাস্থ্যের জন্য ক্ষতিকর, তবে আড্ডা স্বাস্থ্যের জন্য ভালো)';
  byId('smkYes').textContent=s.kind==='beg'?'দিচ্ছি 🚬':'আসছি! 🚬';byId('smkNo').textContent=s.kind==='beg'?'নেই ভাই, এটাই শেষ':'না ভাই, ছেড়ে দিয়েছি';
  byId('msmoke').hidden=false;sfx.play('pop',.4);clearTimeout(NET.smkT);NET.smkT=setTimeout(()=>{if(NET.smokeId===s.id)closeSmokeInvite();},42000);}
function closeSmokeInvite(){byId('msmoke').hidden=true;NET.smokeId=null;clearTimeout(NET.smkT);}
async function answerSmoke(yes){const s=NET.smokeFrom;if(!s||NET.smokeId==null)return;closeSmokeInvite();
  const d=await api('/api/social',{action:'respond',id:s.id,accept:yes});
  if(yes&&d&&d.ok){if(MT||CMP.on||mode!=='walk'){toast('এখন খেলা চলছে বলে যেতে পারলেন না।',3000);return;}
    startPair(s.kind==='beg'?'beg':'smoke',s.kind==='beg'?'giver':'guest',d.at/1000+.3,shortName(s.name),s.fromId,null,{x:s.x,z:s.z});}
  else if(!yes)toast(s.kind==='beg'?'"নেই ভাই" বলে দিলেন 😅':'ডাকটা ফিরিয়ে দিলেন 🙅',2000);}
function applySocialOut(list){for(const o of list){if(NET.handled.has('o'+o.id))continue;NET.handled.add('o'+o.id);const was=SOC.out;SOC.out=null;
  if(o.status==='accepted'){if(MT||CMP.on)continue;startPair(o.kind==='beg'?'beg':'smoke',o.kind==='beg'?'asker':'host',o.at/1000+.3,shortName(o.name),o.toId,null,{x:player.x,z:player.z});}
  else{const r=NET.remote.get(o.toId);if(r)tmpBubble(r.P,o.kind==='beg'?'নেই ভাই, এটাই শেষ প্যাকেট! 😤':'না ভাই, আমি ছেড়ে দিয়েছি… গতকাল থেকে! 😂',3.4);
    toast(shortName(o.name)+(o.kind==='beg'?' দিতে রাজি হয়নি 😭':' আসবে না বলল 😂'),3500);if(!SMOKE.on&&player.cigGroup)player.cigGroup.visible=false;}}}
function applySocialIn(list){for(const s of list){if(NET.handled.has('i2'+s.id))continue;NET.handled.add('i2'+s.id);if(MT||CMP.on||SMOKE.on||PAIR.on||mode!=='walk'){api('/api/social',{action:'respond',id:s.id,accept:false});continue;}showSocialIn(s);}}

/* ---- the shared scene itself: both screens play it from the same moment, so they match ---- */
// kind 'smoke': host and guest meet, the host lights up, hands the lighter over, the guest lights up and hands it back
// kind 'beg': the asker pleads (funny), the giver sighs and hands over a cigarette
function startPair(kind,role,t0,buddyName,buddyId,buddyP,where){
  const P=player,hx=where&&isFinite(where.x)?where.x:P.x,hz=where&&isFinite(where.z)?where.z:P.z;
  const me=kind==='smoke'?(role==='host'?nearFree(hx,hz):nearFree(hx+.95,hz)):null;   // the two stand a step apart, face to face
  Object.assign(PAIR,{on:true,ready:false,kind,role,t0,buddyName,buddyId,buddyP,script:Math.floor(Math.random()*BEG.length),said:{},spot:me});
  PAIR.script=Math.abs(Math.floor(t0))%BEG.length;
  Object.assign(CMP,{on:true,speed:0,kind:'pair',stage:'walk',t:0,auto:me?route(P.x,P.z,me[0],me[1]):null,arrived:!me});
  if(SMOKE.on)stopSmoke(false);if(!P.cigTip)addCig(P);P.cigGroup.visible=true;P.cigLit=false;ensureLighter(P);
  toast(kind==='beg'?buddyName+' এর সাথে কথা হচ্ছে… 😅':buddyName+' কে নিয়ে সিগারেট খেতে যাচ্ছেন 🚬',3500);}
function endPair(){const P=player,buddy=PAIR.buddyName,kind=PAIR.kind;PAIR.on=false;CMP.on=false;if(PASS.mesh)PASS.mesh.visible=false;
  if(P.lighter&&kind==='smoke'){P.lighter.visible=false;}
  if(kind==='smoke'){P.cigLit=true;if(lastZone==='bal')startSmoke(buddy,true);}
  else if(kind==='beg'&&PAIR.role==='asker'){P.cigGroup.visible=true;P.cigLit=false;if(lastZone==='bal')startSmoke(null,false);}}
const sayOnce=(key,P,text,sec)=>{if(!PAIR.said[key]){PAIR.said[key]=1;tmpBubble(P,text,sec);}};
const pairSide=(P,O)=>({M:V3((P.x+O.x)/2,1.08,(P.z+O.z)/2)});
function pairPose(P,role,a,O,t,dt){P.root.updateMatrixWorld(true);P.yaw=lerpAng(P.yaw,Math.atan2(O.x-P.x,O.z-P.z),.25);P.root.rotation.y=P.yaw;
  if(PAIR.kind==='beg')return begPose(P,role,a,O,t,dt);
  rest(P);ensureLighter(P);if(!P.cigTip)addCig(P);P.cigGroup.visible=true;const J=P.J,ah=a-5,M=pairSide(P,O).M,own=restHand(P,1),waist=own.clone();
  const mine=V3(M.x+(P.x-M.x)*.25,1.08,M.z+(P.z-M.z)*.25);
  if(role==='host'){
    if(ah<0){armIK(P,'r',restHand(P,-1),PTR);P.lhT=own;sayOnce('h0',P,'আগুন লাগবে তো? দাঁড়াও, জ্বালাই…',3);return;}
    if(ah<2.3){lightCeremony(P,ah,t,false);return;}
    armIK(P,'r',cigHandPos(P),PTR);J.rHand.rotation.set(0,1.2,0);const tip=lightHandPos(P);let h;
    if(ah<3.6)h=tip.clone().lerp(mine,ease((ah-2.3)/1.3));else if(ah<4.6)h=mine.clone();else if(ah<5.6)h=mine.clone().lerp(waist,ease((ah-4.6)/1));else if(ah<7)h=waist.clone().lerp(mine,ease((ah-5.6)/1.4));else h=mine.clone().lerp(pocketPos(P,1),ease((ah-7)/.6));
    armIK(P,'l',h,PTL);P.lhT=h;if(ah>2.4)sayOnce('h1',P,'নাও, আগুন! সাবধানে, ঠান্ডা মেজাজে!',2.6);if(ah>7.7)sayOnce('h2',P,'চলো, বস আসার আগে শেষ করি!',2.6);}
  else{
    if(ah<2.3){armIK(P,'r',restHand(P,-1),PTR);P.lhT=own;return;}
    if(ah<3.3)armIK(P,'r',restHand(P,-1).lerp(cigHandPos(P),ease((ah-2.3)/1)),PTR);else armIK(P,'r',cigHandPos(P),PTR);J.rHand.rotation.set(0,1.2,0);
    const tip=lightHandPos(P);let h;
    if(ah<3.6)h=waist.clone().lerp(mine,ease((ah-2.3)/1.3));else if(ah<5)h=mine.clone().lerp(tip,ease((ah-3.6)/1.4));else if(ah<5.6)h=tip.clone();else if(ah<6.4)h=tip.clone().lerp(mine,ease((ah-5.6)/.8));else if(ah<7)h=mine.clone();else h=mine.clone().lerp(waist,ease((ah-7)/.6));
    armIK(P,'l',h,PTL);P.lhT=h;J.neck.rotation.x=.2*ease((ah-3.4)/.4)*(1-ease((ah-5.4)/.4));
    if(ah>=4.6&&P.cigLit===false){P.cigLit=true;puff(tipW(P),.03,2,V3(0,.1,0),.4);}
    if(ah>3.8)sayOnce('g1',P,'ধন্যবাদ ভাই! আপনার আগুনের জুড়ি নেই!',2.6);if(ah>6.2)sayOnce('g2',P,'এই নিন আপনার আগুন, ফেরত!',2.4);}}
// one frame of the lighter in the middle of a two-person smoke: it travels host -> guest -> host
function pairLighter(host,guest,a){if(PAIR.kind!=='smoke'||!host.lighter)return;const L=host.lighter,ah=a-5,H=host.lhT,G=guest.lhT;if(!H||!G)return;
  if(ah<2.3||ah>=7.6){if(ah>=7.6)L.visible=false;return;}
  let p;if(ah<3.6)p=H.clone().lerp(G,ease((ah-2.3)/1.3));else if(ah<5.6)p=G.clone();else if(ah<7)p=G.clone().lerp(H,ease((ah-5.6)/1.4));else p=H.clone();
  L.visible=true;L.position.copy(p).add(V3(0,.055,0));L.userData.flame.visible=ah>4.2&&ah<5;}
function begPose(P,role,a,O,t,dt){const J=P.J,pk=Math.max(0,Math.min(BEG.length-1,PAIR.script)),L=BEG[pk],speaking=[[0.2,3.2,'asker'],[3.4,6.2,'giver'],[6.4,9.2,'asker'],[9.4,12,'giver'],[14,16.5,'giver'],[14.6,17,'asker']];
  const say=(i,who)=>{if(!PAIR.said['b'+i]&&role===who&&false)return;};
  [[0.2,0,'asker'],[3.4,1,'giver'],[6.4,2,'asker'],[9.4,3,'giver'],[14,4,'giver'],[14.7,5,'asker']].forEach(([at,i,who])=>{if(a>=at&&!PAIR.said['b'+i]){PAIR.said['b'+i]=1;if(PAIR.who&&0){}
    const spk=who===role?P:O;tmpBubble(spk,L[i],3.1);}});
  if(role==='asker'){
    if(P.cigGroup)P.cigGroup.visible=a>14;
    J.rSh.rotation.set(-1.0,0,-.45);J.rEl.rotation.x=-1.3;J.rHand.rotation.set(0,-.4,0);J.lSh.rotation.set(-.3,0,.4);J.lEl.rotation.x=-1.0;J.neck.rotation.set(.12,Math.sin(a*1.5)*.12,0);talk(P,t,(a>.2&&a<3.2)||(a>6.4&&a<9.2)||a>14.7&&a<17);
    if(a>12.8){const k=ease((a-12.8)/1.2),giver=O,hand=giver.J.rHand.getWorldPosition(V3(0,0,0));armIK(P,'r',restHand(P,-1).lerp(hand,k),PTR);}}
  else{
    P.cigLit=true;aSmoke(P,t,dt);P.cigGroup.visible=true;talk(P,t,(a>3.4&&a<6.2)||(a>9.4&&a<12)||(a>14&&a<16.5));
    if(a>11.6&&a<16){const k=ease((a-11.6)/1.4)*(1-ease((a-15)/.8)),mine=cigHandPos(P),out=V3(P.x+Math.sin(P.yaw)*.5,1.0,P.z+Math.cos(P.yaw)*.5);armIK(P,'r',mine.lerp(out,k),PTR);
      const pm=ensurePass();pm.visible=a<14.2;P.J.rHand.getWorldPosition(pm.position);pm.rotation.y=P.yaw;}}}
// a person who is NOT a real player (one of the smokers on the balcony) can be the giver too
function pairNpc(t,dt){if(!PAIR.on||!PAIR.ready||!PAIR.buddyP)return;const a=nowS()-PAIR.t0,B=PAIR.buddyP;
  pairPose(B,PAIR.role==='asker'?'giver':'asker',a,player,t,dt);}
function pairLocal(P,t,dt){const a=nowS()-PAIR.t0;
  const O=PAIR.buddyP||(NET.remote.get(PAIR.buddyId)||{}).P;if(!O){endPair();return;}
  O.x=O.x===undefined?O.root.position.x:O.x;O.z=O.z===undefined?O.root.position.z:O.z;
  pairPose(P,PAIR.role,a,O,t,dt);
  if(PAIR.kind==='smoke'){const host=PAIR.role==='host'?P:O,guest=PAIR.role==='host'?O:P;pairLighter(host,guest,a);if(a-5>7.7)endPair();}
  else if(a>17.2)endPair();}

function updateWalk(t,dt){const P=player;
  P.cam+=((keys.lookL?1:0)-(keys.lookR?1:0))*1.9*dt;let ix=(keys.right?1:0)-(keys.left?1:0)+joy.x,iy=(keys.fwd?1:0)-(keys.back?1:0)+joy.y;const m=Math.hypot(ix,iy);if(m>1){ix/=m;iy/=m;}
  if(SLAP.cool>0)SLAP.cool-=dt;if(HIT.t>0)HIT.t-=dt;const adt=HS.t>0?0:dt;if(HS.t>0)HS.t-=dt;if(SHAKE.t>0)SHAKE.t-=dt;
  const cmpBusy=CMP.on&&CMP.stage!=='done';
  const spd=((MT&&MT.auto)||(cmpBusy&&CMP.auto))?((cmpBusy&&CMP.auto&&CMP.speed)||3):keys.run?4:1.8,fx=-Math.sin(P.cam),fz=-Math.cos(P.cam),rx=Math.cos(P.cam),rz=-Math.sin(P.cam);
  let dyo=0,bko=0,moving=false;
  if(SETUP.state==='run'){setupUpdate(P,dt,t);P.gnd=true;}                                   // unpacking at your desk
  else if(SIT.on){                                                                           // sitting on a chair: any walking key stands you up
    if(SIT.t>.6&&(m>.3||keys.jump)){keys.jump=false;standUp();}else{sitUpdate(P,t,dt);P.gnd=true;}}
  if(!(SETUP.state==='run')&&!SIT.on){
    let mx=(fx*iy+rx*ix)*spd*dt,mz=(fz*iy+rz*ix)*spd*dt;
    if(MT){mx=mz=0;if(MT.auto){const a=autoStep(P,dt);mx=a[0];mz=a[1];}}   // a challenge is running: the game moves you
    else if(cmpBusy){mx=mz=0;if(CMP.auto){const a=autoWalk(P,dt,CMP);mx=a[0];mz=a[1];}}   // you are being walked somewhere (HR, the CEO's room, a smoke)
    else if(HIT.t>0)mx=mz=0;
    if(SLAP.t>=0)mx=mz=0;   // planted on both feet while swinging
    moving=!!(mx||mz);
    if(SMOKE.on&&(moving||lastZone!=='bal'))stopSmoke(false);
    if(keys.jump){keys.jump=false;if(P.gnd!==false&&!MT&&!cmpBusy&&HIT.t<=0){P.vy=JUMP_V;P.gnd=false;sfx.play('jump');if(SMOKE.on)stopSmoke(false);}}
    const y0=P.y||0;
    if(moving){if(!hit(P.x+mx,P.z,y0))P.x+=mx;if(!hit(P.x,P.z+mz,y0))P.z+=mz;const ty=Math.atan2(mx,mz);let df=ty-P.yaw;df=Math.atan2(Math.sin(df),Math.cos(df));P.yaw+=df*Math.min(1,dt*10);}
    P.vy=(P.vy||0)-GRAV*dt;let ny=y0+P.vy*dt;const fl=supportAt(P.x,P.z,Math.max(y0,ny)),was=P.gnd;
    if(ny<=fl){ny=fl;P.vy=0;P.gnd=true;if(was===false)sfx.play('land');}else P.gnd=false;
    P.y=ny;
    rest(P);
    if(HIT.age>=0){HIT.age+=adt;if(HIT.age<HIT.dur){const v=victimPose(P,HIT.age,HIT.kind);dyo=v.dy;bko=v.back;}else HIT.age=-1;}
    if(HIT.age>=0){}
    else if(!P.gnd)airPose(P);
    else if(PAIR.on&&PAIR.ready&&!moving)pairLocal(P,t,dt);
    else if(SMOKE.on&&!moving){SMOKE.t+=dt;smokePose(P,SMOKE.t,t,dt);if(SMOKE.t>=SMOKE_LEN+3.2)stopSmoke(true);}
    else if(moving){P.wph=(P.wph||0)+dt*spd*4.6;const sn=Math.floor(P.wph/Math.PI);if(sn!==P.sn){P.sn=sn;sfx.play(spd>2?'run':'step');}walkPose(P,P.wph,Math.min(1,spd/1.8));}
    if(SLAP.t>=0){SLAP.t+=adt;const u=SLAP.t/SLAP.dur;if(!SLAP.fired&&SLAP.t>=SLAP.imp){SLAP.fired=true;impact(SLAP.tg,SLAP.kind);}
      if(u<1)(SLAP.kind==='kick'?kickPose:slapPose)(P,u);else SLAP.t=-1;}
    if(CMP.on&&CMP.kind==='trouble'&&CMP.stage!=='hit'){const J=P.J;   // head down, being marched off; then hands folded, pleading
      if(CMP.stage==='walk'){J.spine.rotation.x=.42;J.neck.rotation.x=.6;J.lSh.rotation.x=.05;}
      else{J.spine.rotation.x=.5;J.neck.rotation.x=.65;J.lSh.rotation.set(-.75,0,.18);J.rSh.rotation.set(-.75,0,-.18);J.lEl.rotation.x=J.rEl.rotation.x=-1.5;J.hips.rotation.z=Math.sin(t*30)*.015;}}
    if(OFFER.t>=0){OFFER.t+=dt;offerPose(P,OFFER.t/1.6);if(OFFER.t>1.6){OFFER.t=-1;if(!SMOKE.on&&!SOC.out&&P.cigGroup)P.cigGroup.visible=false;}}
  }
  P.root.position.set(P.x-Math.sin(P.yaw)*bko,(P.y||0)+dyo,P.z-Math.cos(P.yaw)*bko);P.root.rotation.y=P.yaw;life(P,t,dt);
  let back=2.4;const up=1.95+(P.y||0)*.6;for(;back>.7;back-=.2){if(!hit(P.x-fx*back,P.z-fz*back))break;}camera.position.set(P.x-fx*back,up,P.z-fz*back);camera.lookAt(P.x+fx*1.5,1.25+(P.y||0)*.5,P.z+fz*1.5);
  if(CMP.on&&CMP.kind==='trouble'&&CMP.stage==='hit'&&BS.people[CMP.boss]){const B=BS.people[CMP.boss],k=ease(CMP.t/.5);B.J.head.getWorldPosition(_v);const tg=_v.clone(),dir=V3(P.x-B.x,0,P.z-B.z).normalize(),cp=tg.clone().addScaledVector(dir,1.1).add(V3(dir.z*.4,-.05,-dir.x*.4));
    camera.position.lerp(cp,k*.85);camera.lookAt(tg);camera.fov=lerp(45,30,k);camera.updateProjectionMatrix();CAMFX.on=true;}
  else if(CAMFX.on){camera.fov=45;camera.updateProjectionMatrix();CAMFX.on=false;}
  if(SHAKE.t>0){const k=SHAKE.t/.2*.09;camera.position.x+=(Math.random()-.5)*k;camera.position.y+=(Math.random()-.5)*k;camera.position.z+=(Math.random()-.5)*k;}
  deskPrompt(P);
  const gn=(MT||CMP.on||SETUP.state==='run')?null:actNear(),ab=document.getElementById('hudAct');if(gn!==P.gn){P.gn=gn;ab.hidden=!gn;ab.textContent=actText(gn);}
  const free=!(MT||CMP.on||SIT.on||SETUP.state==='run'),sT=free?hurtTarget('slap'):null,kT=free?hurtTarget('kick'):null,sb=byId('hudSlap'),kb=byId('hudKick'),ib=byId('hudInvite'),gb=byId('hudBeg'),bd=free?smokeBuddy():null,bg=free?begTarget():null;
  if(!!sT!==!sb.hidden)sb.hidden=!sT;const kShow=!!kT&&kT.kind!=='thing';if(kShow!==!kb.hidden)kb.hidden=!kShow;
  if(!!bd!==!ib.hidden){ib.hidden=!bd;if(bd)ib.textContent=(touchUI()?'':'G চাপুন: ')+'🚬 '+(bd.p.nickname||shortName(bd.p.name))+' কে সিগারেটে ডাকুন';}
  if(!!bg!==!gb.hidden){gb.hidden=!bg;if(bg)gb.textContent=(touchUI()?'':'H চাপুন: ')+'🙏 সিগারেট নেই বলুন';}
  P.buddy=bd;P.begT=bg;
  const zn=zoneAt(P.x,P.z),id=zn?zn.id:'';if(id!==lastZone){lastZone=id;sfx.traffic(id==='bal'?1:0);document.getElementById('hudZone').innerHTML=zn?zn.bn+'<small>'+zn.en+'</small>':'বাইরে<small>Outside</small>';
    if(id==='work'&&SETUP.state==='bag'&&!SETUP.told){SETUP.told=true;toast('অফিসে ঢুকেছেন! এবার আপনার নিজের ডেস্কে যান 🎒',5000);}}}
// the boss marches you to the CEO's room
function steam(B,dt){if(Math.random()<dt*28){B.J.head.getWorldPosition(_v);puff(_v.add(V3(0,.13,0)),.05,1.1,V3((Math.random()-.5)*.12,.4,(Math.random()-.5)*.12),.5);}}
function troubleEscort(B,dt,t){const U=player,st=CMP.stage,J=B.J;rest(B);
  if(st==='hit'){   // the blow lands: the boss reels, then straightens up, finger out, shaking with rage
    const age=CMP.t;B.yaw=lerpAng(B.yaw,Math.atan2(U.x-B.x,U.z-B.z),Math.min(1,dt*(age<.4?2:7)));let dy=0,back=0;
    if(age<1.5){const v=victimPose(B,age,CMP.react||'slap');dy=v.dy;back=v.back;}
    else{const k=easeS((age-1.5)/.5);J.rSh.rotation.set(-1.5*k,0,-.1);J.rEl.rotation.x=-.15*k;J.lSh.rotation.set(-.4*k,0,.5*k);J.lEl.rotation.x=-1.2*k;J.spine.rotation.x=.12*k;J.neck.rotation.x=.1*k;J.hips.rotation.z=Math.sin(t*40)*.02*k;talk(B,t,true);steam(B,dt);}
    B.root.position.set(B.x-Math.sin(B.yaw)*back,dy,B.z-Math.cos(B.yaw)*back);B.root.rotation.y=B.yaw;life(B,t,dt);return;}
  const fwd=V3(Math.sin(U.yaw),0,Math.cos(U.yaw));
  // marching you off: right behind you with a hand on your collar; scolding: in front of you, finger wagging
  const tx=st==='walk'?U.x-fwd.x*.62:U.x+fwd.x*.95,tz=st==='walk'?U.z-fwd.z*.62:U.z+fwd.z*.95,dx=tx-B.x,dz=tz-B.z,d=Math.hypot(dx,dz);
  if(d>6){B.x=tx;B.z=tz;}else{const s=Math.min(d,4.2*dt);B.x+=dx/(d||1)*s;B.z+=dz/(d||1)*s;}
  B.yaw=lerpAng(B.yaw,Math.atan2(U.x-B.x,U.z-B.z),Math.min(1,dt*8));B.root.position.set(B.x,0,B.z);B.root.rotation.y=B.yaw;
  if(st==='walk'||d>.25){CHASE.wph+=dt*2.1*3.4;walkPose(B,CHASE.wph,1);}
  if(st==='walk'){const collar=U.J.neck.getWorldPosition(V3(0,0,0)).add(V3(0,-.06,0)).addScaledVector(fwd,-.03);armIK(B,'r',collar,PTR);J.lSh.rotation.set(-1.3,0,.35+Math.sin(t*9)*.08);J.lEl.rotation.x=-.25;J.spine.rotation.x=.18;talk(B,t,true);}
  else{const w=Math.sin(t*10);J.rSh.rotation.set(-1.45,0,-.2+w*.28);J.rEl.rotation.x=-.9+w*.25;J.lSh.rotation.set(-.4,0,.5);J.lEl.rotation.x=-1.5;J.spine.rotation.x=.16;J.neck.rotation.set(.1,Math.sin(t*6)*.25,0);J.hips.rotation.z=Math.sin(t*35)*.02;talk(B,t,true);}
  steam(B,dt);life(B,t,dt);}
// everyone nearby freezes and stares at the scene
function gawk(){if(!(CMP.on&&CMP.kind==='trouble'&&CMP.stage!=='done'))return;const B=BS.people[CMP.boss];if(!B)return;
  for(const q of npcPeople()){if(Math.hypot(q.x-B.x,q.z-B.z)>8)continue;const rel=Math.atan2(B.x-q.x,B.z-q.z)-q.yaw,r=Math.atan2(Math.sin(rel),Math.cos(rel));q.J.neck.rotation.y=Math.max(-1.1,Math.min(1.1,r));q.J.neck.rotation.x=-.05;}}
function wireActionUI(){
  byId('hudSlap').addEventListener('click',()=>doHurt('slap'));byId('hudKick').addEventListener('click',()=>doHurt('kick'));
  byId('hudInvite').addEventListener('click',()=>{const b=player.buddy;if(b)sendSmokeInvite(b);});
  byId('hudBeg').addEventListener('click',()=>{if(player.begT)sendBeg(player.begT);});
  byId('smkYes').addEventListener('click',()=>answerSmoke(true));byId('smkNo').addEventListener('click',()=>answerSmoke(false));
  const bj=byId('bJump'),bs=byId('bSlap'),bk=byId('bKick');
  bj.addEventListener('click',()=>{keys.jump=true;});bs.addEventListener('click',()=>doHurt('slap'));bk.addEventListener('click',()=>doHurt('kick'));
  const el=byId('msmoke');el.addEventListener('keydown',e=>e.stopPropagation());el.addEventListener('keyup',e=>e.stopPropagation());}
function flyTo(tg,off,dur){const tT=new THREE.Vector3(tg[0],tg[1],tg[2]);fly={fP:camera.position.clone(),fT:controls.target.clone(),tP:tT.clone().add(new THREE.Vector3(off[0],off[1],off[2])),tT,t:0,d:dur||.9};}
function updFly(dt){if(!fly)return;fly.t=Math.min(1,fly.t+dt/fly.d);const e=fly.t<.5?2*fly.t*fly.t:1-Math.pow(-2*fly.t+2,2)/2;camera.position.lerpVectors(fly.fP,fly.tP,e);controls.target.lerpVectors(fly.fT,fly.tT,e);if(fly.t>=1)fly=null;}
function setMode(m){if(MT&&m!=='walk')return;const prev=mode;mode=m;document.querySelectorAll('.seg button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===m)));
  const w=m==='walk';document.body.classList.toggle('walking',w);controls.enabled=!w;player.root.visible=w;document.getElementById('hud').hidden=!w;syncTouchUI();
  document.getElementById('hudKeys').textContent=touchUI()?'বাঁ দিকের জয়স্টিক দিয়ে হাঁটুন, স্ক্রিন টেনে ঘুরে তাকান':'WASD বা অ্যারো দিয়ে হাঁটুন, Shift চেপে দৌড়, মাউস টেনে ঘুরে তাকান';
  if(!w)sfx.traffic(0);
  if(w){fly=null;lastZone='~';for(const k in keys)keys[k]=false;document.getElementById('bRun').setAttribute('aria-pressed','false');if(!tallWalls)setWalls(true);if(touchUI()){panel.classList.add('folded');syncFold();}}
  else if(m==='top')flyTo([1,0,-2.5],[0,50,.01],1);else{if(prev==='walk'){setWalls(false);flyTo([player.x,0,player.z],[6,8,7],.8);}else flyTo([1,0,-2],[9,30,30],1);}}
const panel=document.getElementById('panel'),foldBtn=document.getElementById('fold');
const burger=document.getElementById('burger');
function syncFold(){const f=panel.classList.contains('folded');burger.hidden=!f;burger.setAttribute('aria-expanded',String(!f));}
function wireUI(){
  document.querySelectorAll('.seg button').forEach(b=>b.addEventListener('click',()=>setMode(b.dataset.mode)));
  document.getElementById('tgWalls').addEventListener('click',()=>setWalls(!tallWalls));
  // the game is in Bengali; the small English captions under the labels are off unless asked for
  const tgEn=document.getElementById('tgEn'),setEn=on=>{document.body.classList.toggle('en',on);tgEn.setAttribute('aria-pressed',String(on));try{localStorage.setItem('cb-en',on?'1':'0');}catch(e){}};
  try{setEn(localStorage.getItem('cb-en')==='1');}catch(e){}
  tgEn.addEventListener('click',()=>setEn(!document.body.classList.contains('en')));
  document.getElementById('tgLabels').addEventListener('click',e=>{labelsOn=!labelsOn;e.currentTarget.setAttribute('aria-pressed',String(labelsOn));});
  foldBtn.addEventListener('click',()=>{panel.classList.add('folded');syncFold();});
  burger.addEventListener('click',()=>{panel.classList.remove('folded');syncFold();});
  if(innerWidth<640){panel.classList.add('folded');syncFold();}
  const zl=document.getElementById('zoneList');
  for(const z of ZONES){if(z.hide)continue;const li=document.createElement('li'),b=document.createElement('button');b.className='zone';b.innerHTML='<b>'+z.bn+'</b><small>'+z.what+'</small>';
    b.addEventListener('click',()=>{if(mode==='walk'){player.x=z.sp[0];player.z=z.sp[1];return;}if(mode!=='orbit')setMode('orbit');setTimeout(()=>flyTo([z.c[0],0,z.c[1]],z.id==='bal'?[0,4.5,-4.5]:[2.8,4.6,4.8],1),0);});
    li.appendChild(b);zl.appendChild(li);}
  const KM={Space:'jump',KeyW:'fwd',ArrowUp:'fwd',KeyS:'back',ArrowDown:'back',KeyA:'left',ArrowLeft:'left',KeyD:'right',ArrowRight:'right',ShiftLeft:'run',ShiftRight:'run'};
  addEventListener('keydown',e=>{if(mode!=='walk')return;if(e.code==='KeyE'){interact();return;}if(e.code==='KeyF'){doHurt('slap');return;}if(e.code==='KeyK'){doHurt('kick');return;}if(e.code==='KeyG'){if(player.buddy)sendSmokeInvite(player.buddy);return;}if(e.code==='KeyH'){if(player.begT)sendBeg(player.begT);return;}if(KM[e.code]){keys[KM[e.code]]=true;if(e.code.startsWith('Arrow')||e.code==='Space')e.preventDefault();}});
  addEventListener('keyup',e=>{if(KM[e.code])keys[KM[e.code]]=false;});addEventListener('blur',()=>{for(const k in keys)keys[k]=false;});
  document.getElementById('hudAct').addEventListener('click',()=>interact());wireMatchUI();wireNetUI();wireBossUI();wireActionUI();
  const hold=(id,k)=>{const b=document.getElementById(id),on=e=>{e.preventDefault();keys[k]=true;try{b.setPointerCapture(e.pointerId);}catch(_){}},off=()=>{keys[k]=false;};
    b.addEventListener('pointerdown',on);b.addEventListener('pointerup',off);b.addEventListener('pointercancel',off);b.addEventListener('lostpointercapture',off);b.addEventListener('contextmenu',e=>e.preventDefault());};
  hold('bLookL','lookL');hold('bLookR','lookR');
  const bRun=document.getElementById('bRun');bRun.addEventListener('click',()=>{keys.run=!keys.run;bRun.setAttribute('aria-pressed',String(keys.run));});
  document.getElementById('bExit').addEventListener('click',()=>setMode('orbit'));
  addEventListener('orientationchange',()=>setTimeout(syncTouchUI,200));
  const mute=document.getElementById('mute'),syncMute=()=>{mute.textContent=sfx.muted?'🔇':'🔊';mute.setAttribute('aria-pressed',String(sfx.muted));mute.setAttribute('aria-label',sfx.muted?'সাউন্ড চালু করুন':'সাউন্ড বন্ধ করুন');};
  syncMute();mute.addEventListener('click',()=>{sfx.unlock();sfx.setMuted(!sfx.muted);syncMute();if(!sfx.muted)sfx.play('pop');});
  document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('button');if(b&&b.id!=='mute'&&b.id!=='goBtn'){sfx.unlock();sfx.play('click');}},true);
  const cvs=renderer.domElement;
  cvs.addEventListener('pointerdown',e=>{if(mode!=='walk')return;lookId=e.pointerId;lookX=e.clientX;cvs.setPointerCapture(e.pointerId);});
  cvs.addEventListener('pointermove',e=>{if(mode!=='walk'||e.pointerId!==lookId)return;player.cam-=(e.clientX-lookX)*.006;lookX=e.clientX;});
  const el=e=>{if(e.pointerId===lookId)lookId=null;};cvs.addEventListener('pointerup',el);cvs.addEventListener('pointercancel',el);
  const joyEl=document.getElementById('joy'),knob=document.getElementById('knob');let jid=null;
  const jm=e=>{const r=joyEl.getBoundingClientRect();let dx=e.clientX-(r.left+r.width/2),dy=e.clientY-(r.top+r.height/2);const m=Math.hypot(dx,dy);if(m>44){dx*=44/m;dy*=44/m;}knob.style.transform='translate('+dx+'px,'+dy+'px)';joy.x=dx/44;joy.y=-dy/44;};
  joyEl.addEventListener('pointerdown',e=>{jid=e.pointerId;joyEl.setPointerCapture(e.pointerId);jm(e);e.preventDefault();});
  joyEl.addEventListener('pointermove',e=>{if(e.pointerId===jid)jm(e);});
  const je=e=>{if(e.pointerId!==jid)return;jid=null;joy.x=joy.y=0;knob.style.transform='';};joyEl.addEventListener('pointerup',je);joyEl.addEventListener('pointercancel',je);
}


/* ================= login screen ================= */
let PAUSE3D=false;
// the employee's real designation decides the role (it picks the screens on the desk, and goes on the scoreboard)
function roleFromDesignation(d){d=String(d||'').toLowerCase();
  if(/\b(ceo|cto|cfo|coo|chief|founder|managing director)\b/.test(d))return'ceo';
  if(/\bhr\b|human resource|talent|people (ops|partner)/.test(d))return'hr';
  if(/\bqa\b|quality|tester|testing|sqa/.test(d))return'qa';
  if(/design|\bui\b|\bux\b|graphic|creative|motion|video|illustrat/.test(d))return'des';
  if(/peon|office assistant|support staff|housekeep/.test(d))return'peon';
  return'se';}
const NOTICES=['আজ থেকে অফিসে চা বিনামূল্যে। শুধু কাপটা আপনি নিয়ে আসবেন, চা আমরা বলে দেব।','ডেডলাইন কাল। গতকালও কাল ছিল, আগামীকালও কাল থাকবে।','এইচআরের নতুন নিয়ম: হাসিমুখে কাজ করুন। না পারলে হাসিমুখের ছবি জমা দিন।','সবাইকে জানানো যাচ্ছে, বাগ নয়, ওগুলো "অনির্ধারিত ফিচার"।','মিটিংয়ে ঘুমানো নিষেধ। ঘুমালে নাক ডাকা চলবে না।','প্যান্ট্রির বিস্কুট আজ শেষ। কে খেয়েছে, তা সিসিটিভি বলবে (যদি চালু থাকে)।','বৃহস্পতিবার সবাই কাজ এগিয়ে রাখুন, কারণ শুক্রবার আমাদের কেউ ছুটি দিয়েছে বলে জানা নেই।','আজকের ম্যাজিক শব্দ: "এটা আমার মেশিনে তো চলে!"'];
const dhakaNow=()=>{const p=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Dhaka',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).formatToParts(new Date()),g=k=>+p.find(x=>x.type===k).value;return{h:g('hour')%24,m:g('minute'),s:g('second')};};
function initLogin(){
  const L=document.getElementById('login'),card=document.getElementById('idcard'),nm=document.getElementById('lname'),pw=document.getElementById('lpass'),msg=document.getElementById('lmsg'),
    go=document.getElementById('goBtn'),goTxt=document.getElementById('goTxt'),nh=document.getElementById('nameHint');
  const BN=n=>String(n).replace(/\d/g,d=>'০১২৩৪৫৬৭৮৯'[d]);let tries=0,busy=false;
  try{const v=JSON.parse(localStorage.getItem('cb-login')||'null');if(v&&v.email){nm.value=v.email;const w=document.getElementById('lwelcome');w.hidden=false;w.textContent='আবার স্বাগতম! 👋 '+v.email+' দিয়েই ঢুকছেন তো? শুধু এমপ্লয়ি আইডিটা দিন।';}}catch(e){}
  const say=(t,c)=>{msg.textContent=t;msg.className='lmsg'+(c?' '+c:'');};
  const shake=()=>{card.classList.remove('shake');void card.offsetWidth;card.classList.add('shake');};
  const clk=document.getElementById('lclock'),dt=document.getElementById('ldate'),st=document.getElementById('lstat');
  document.getElementById('lnotice').textContent=NOTICES[Math.floor(Date.now()/864e5)%NOTICES.length];
  const paint=()=>{const n=dhakaNow(),mins=n.h*60+n.m,h12=((n.h+11)%12)+1,per=n.h>=5&&n.h<12?'সকাল':n.h<15?'দুপুর':n.h<17?'বিকেল':n.h<19?'সন্ধ্যা':'রাত';
    clk.textContent=per+' '+BN(h12)+':'+BN(String(n.m).padStart(2,'0'))+':'+BN(String(n.s).padStart(2,'0'));
    dt.textContent=new Date().toLocaleDateString('bn-BD',{timeZone:'Asia/Dhaka',weekday:'long',day:'numeric',month:'long'});
    const open=mins>=13*60+30&&mins<22*60;st.textContent=open?'🟢 অফিস চলছে (দুপুর ১:৩০ – রাত ১০টা)':'🔴 অফিস বন্ধ (খোলে দুপুর ১:৩০-এ)';};
  paint();const tick=setInterval(paint,1000);
  document.getElementById('forgot').addEventListener('click',()=>{shake();say('আপনার আইডি ELX দিয়ে শুরু, যেমন ELX 002। না মিললে এইচআর আপাকে মেইল করুন, সাথে একটা ওয়ার্নিং লেটার ফ্রি।','bad');});
  const enter=(how)=>{const email=nm.value.trim();
    if(!email){shake();say('ইমেইল ছাড়া তো বেতনও আসবে না! আগে অফিসের ইমেইল লিখুন।','bad');nm.focus();return;}
    if(!pw.value.trim()){shake();say('এমপ্লয়ি আইডি ছাড়া ঢুকতে চান? আপনি কি সিইও?','bad');pw.focus();return;}
    sfx.unlock();if(busy)return;busy=true;go.disabled=true;go.classList.add('scan');goTxt.textContent='আঙুলের ছাপ পড়া হচ্ছে…';say('','');
    const fail=(m)=>{sfx.play('fail');go.classList.remove('scan');busy=false;go.disabled=false;goTxt.textContent='আবার চেষ্টা করুন';shake();say(m,'bad');};
    const wait=new Promise(r=>setTimeout(r,1300));
    const call=fetch('/api/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email,empId:pw.value})})
      .then(async r=>{let d=null;try{d=await r.json();}catch(e){}return {r,d};});
    Promise.all([wait,call]).then(([,{r,d}])=>{
      if(!r.ok||!d||!d.ok){fail(d&&d.error?d.error:'সার্ভারে সংযোগ হয়নি। `vercel dev` দিয়ে চালাচ্ছেন তো? কিছুক্ষণ পর আবার চেষ্টা করুন।');return;}
      go.classList.remove('scan');sfx.play('ok');sfx.ambience(true);CLK.on=true;CLK.t=0;CLK.shown=-1;CLK.free=null;if(d.serverNow)NET.skew=d.serverNow-Date.now();startNet();const emp=d.employee,name=emp.name;
      const nw=dhakaNow(),since=nw.h*60+nw.m-(13*60+30),late=since>0&&since<510?Math.min(59,since):0,role=roleFromDesignation(emp.designation);
      say((late?'হাজিরা হয়েছে! আপনি '+BN(late)+' মিনিট লেট।':'হাজিরা হয়েছে! সময়মতো এসেছেন, বসের চোখ কপালে।')+' চাকরির মিটার থেকে '+BN(Math.min(20,Math.round(late/3)))+'% কাটা গেল।','ok');goTxt.textContent='স্বাগতম, '+name+'!';
      try{if(document.getElementById('remember').checked)localStorage.setItem('cb-login',JSON.stringify({email}));else localStorage.removeItem('cb-login');}catch(e){}
      window.CB_PLAYER={name,role,late,empId:emp.empId,designation:emp.designation,branch:emp.branch,department:emp.department,promise:document.getElementById('promise').checked};initProfile(emp);
      setTimeout(()=>{clearInterval(tick);PAUSE3D=false;L.classList.add('out');setTimeout(()=>{L.hidden=true;toast((document.getElementById('promise').checked?'':'প্রতিজ্ঞা করেননি? বস লক্ষ্য করেছে। ')+'গেটের বাইরে আছেন। ফেস স্ক্যানারের কাছে গিয়ে E চাপুন।',6000);},600);
        setPlayerModel(emp.gender,emp.model,emp.look);DESKOWN[emp.empId]=emp.desk;SETUP.state='bag';SETUP.told=false;addBag(player);setMode('walk');place(player,.3,-14.2,0);player.cam=Math.PI;},1300);
    },()=>fail('নেটওয়ার্ক সমস্যা। আবার চেষ্টা করুন।'));};
  document.getElementById('lform').addEventListener('submit',e=>{e.preventDefault();enter('finger');});
  
  L.hidden=false;setTimeout(()=>{PAUSE3D=true;},1500);setTimeout(()=>{try{(nm.value?pw:nm).focus({preventScroll:true});}catch(e){}},300);}

/* ================= shared clock ================= */
const WORLD_EPOCH=Date.UTC(2026,0,1);
const worldT=()=>(Date.now()+NET.skew-WORLD_EPOCH)/1000;   // seconds of shared time, the same on every screen once the server clock offset is known
// The office day is 1:30 PM to 10:00 PM Dhaka time, and the dining room is free from 5 PM until the next day's 1:30 PM.
const OPEN_MIN=13*60+30,CLOSE_MIN=22*60,FREE_MIN=17*60;
const CLK={on:false,min:-1,shown:-1,free:null,t:0};
const officeOpen=m=>m>=OPEN_MIN&&m<CLOSE_MIN,diningBusy=m=>m>=OPEN_MIN&&m<FREE_MIN;
const periodBn=h=>h>=5&&h<12?'সকাল':h<15?'দুপুর':h<17?'বিকেল':h<19?'সন্ধ্যা':'রাত';
function dhakaMinutes(){const p=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Dhaka',hour:'2-digit',minute:'2-digit',hour12:false}).formatToParts(new Date(Date.now()+NET.skew));
  return (+p.find(x=>x.type==='hour').value%24)*60+ +p.find(x=>x.type==='minute').value;}
function clockTick(dt){if(!CLK.on)return;CLK.t-=dt;if(CLK.t>0)return;CLK.t=1;
  const m=dhakaMinutes();CLK.min=m;
  if(m!==CLK.shown){CLK.shown=m;const h=Math.floor(m/60);byId('hudClock').textContent='🕐 '+periodBn(h)+' '+bnd(((h+11)%12)+1)+':'+bnd(String(m%60).padStart(2,'0'))+' · '+(officeOpen(m)?'অফিস চলছে':'অফিস বন্ধ');}
  const free=!diningBusy(m);
  if(free!==CLK.free&&!MT){const first=CLK.free===null;CLK.free=free;for(const a of acts)if(a.fn===aEat)a.P.root.visible=!free;
    if(free&&!first)toast('ডাইনিং এখন ফাঁকা, টেবিলে গিয়ে উনো, দাবা বা লুডু খেলতে পারেন।',6000);}}
/* ---- the ambient pool and carrom games: the same on every screen ---- */
// The game restarts every AMB_LEN seconds of shared time with a seed taken from that slot, and a screen that joins late fast-forwards it.
const AMB_LEN=120,AMB={p:{slot:-1,n:0,needs:true,rng:null},c:{slot:-1,n:0,needs:true,rng:null}};
function poolFresh(S){const T=S.T;S.rack();S.groups=[null,null];S.wins=[0,0];S.games=1;S.breakNext=true;S.wasBreak=false;S.ballInHand=false;S.hit=false;S.line=null;S.winner=null;S.shot=null;S.stand=null;S.onEight=false;T.potted=[];T.firstHit=null;S.shooter=S.breaker=0;S.state='plan';S.t=0;S.msg='';
  for(const P of S.players){P.path=[];P.cheer=0;P.speed=1.05;}place(S.players[0],.8,5,Math.PI/2);place(S.players[1],4.75,6.9,-2.2);}
function ambUpdate(t){
  const slot=Math.floor(t/AMB_LEN),base=slot*AMB_LEN,target=Math.floor((t-base)*60);
  if(MT&&MT.state==='play'&&MT.game==='pool')AMB.p.needs=true;
  else{const a=AMB.p;if(a.needs||a.slot!==slot){a.slot=slot;a.n=0;a.needs=false;a.rng=mulberry32(slot*2+1);SRP=a.rng;poolFresh(POOL);}
    SRP=a.rng;let k=0;CATCH=target-a.n>8;while(a.n<target&&k++<400){a.n++;poolUpdate(base+a.n/60,1/60);}CATCH=false;}
  if(MT&&MT.state==='play'&&MT.game==='carrom')AMB.c.needs=true;
  else{const a=AMB.c;if(a.needs||a.slot!==slot){a.slot=slot;a.n=0;a.needs=false;a.rng=mulberry32(slot*2+2);SRC=a.rng;resetCoins(CARROM);}
    SRC=a.rng;let k=0;CATCH=target-a.n>8;while(a.n<target&&k++<400){a.n++;carromUpdate(base+a.n/60,1/60);}CATCH=false;}}

/* ================= challenges: pool, carrom (game room) and uno, chess, ludo (dining room) ================= */
// Flow: walk up to a table, press E, pick who to invite, walk to their desk, challenge them, walk to the table together,
// watch a random match (nobody is controlled), then your rating and XP move and are saved on the server.
const byId=id=>document.getElementById(id);
/* ================= character models: 10 looks per gender, picked in the profile ================= */
// n = name shown in the picker, o = options for mkMan / mkWoman. Model 0 is everybody's starting look.
const MODELS={
  m:[
    {n:'ক্লাসিক লাল',o:{skin:'#c48a5f',style:'tee',top:'#b3261e',bot:'#2a2f3a',jeans:false,hs:'short',hair:'#16110e',beard:false,mous:false,glasses:false,sleeve:'short',tie:null,print:null}},
    {n:'চশমা ডেভ',o:{skin:'#b07a50',style:'polo',top:'#2f6f73',bot:'#3b3f4a',jeans:false,hs:'short',hair:'#16110e',beard:false,mous:false,glasses:true,sleeve:'short',tie:null,print:null}},
    {n:'ফরমাল ম্যানেজার',o:{skin:'#dcae84',style:'shirt',top:'#f4f4f2',bot:'#1e1f24',jeans:false,hs:'short',hair:'#16110e',beard:false,mous:false,glasses:true,sleeve:'long',tie:'#7e2c3a',print:null}},
    {n:'দাড়ি ভাই',o:{skin:'#9a6844',style:'tee',top:'#2f3a4f',bot:'#2d4a73',jeans:true,hs:'short',hair:'#16110e',beard:true,mous:false,glasses:false,sleeve:'short',tie:null,print:null}},
    {n:'টাক মামা',o:{skin:'#a87452',style:'polo',top:'#c9a227',bot:'#4a4d54',jeans:false,hs:'bald',hair:'#16110e',beard:false,mous:true,glasses:false,sleeve:'short',tie:null,print:null}},
    {n:'ট্রেন্ডি ডিজাইনার',o:{skin:'#d6a378',style:'tee',top:'#e2622b',bot:'#3b5a85',jeans:true,hs:'short',hair:'#5b5550',beard:false,mous:false,glasses:true,sleeve:'short',tie:null,print:'#ffffff'}},
    {n:'কুল ব্লু',o:{skin:'#c48a5f',style:'polo',top:'#4f7cac',bot:'#8b7d63',jeans:false,hs:'short',hair:'#16110e',beard:false,mous:true,glasses:false,sleeve:'short',tie:null,print:null}},
    {n:'গ্রিন টি',o:{skin:'#8c5c3c',style:'tee',top:'#3c6e47',bot:'#1e1f24',jeans:false,hs:'short',hair:'#16110e',beard:true,mous:false,glasses:true,sleeve:'short',tie:null,print:null}},
    {n:'ডার্ক নাইট',o:{skin:'#b07a50',style:'tee',top:'#1d1d1f',bot:'#1f2a3a',jeans:true,hs:'short',hair:'#16110e',beard:false,mous:false,glasses:false,sleeve:'short',tie:null,print:'#c9a227'}},
    {n:'পার্পল ভাইব',o:{skin:'#dcae84',style:'tee',top:'#5b2a86',bot:'#2a2f3a',jeans:false,hs:'short',hair:'#5b5550',beard:false,mous:false,glasses:true,sleeve:'short',tie:null,print:null}}],
  f:[
    {n:'ক্লাসিক লাল',o:{skin:'#c48a5f',top:'#b3261e',bot:'#2a2a2e',orna:'#f0d9a0',trim:'#f0d9a0',hs:'long',hair:'#141010',glasses:false,sandal:false}},
    {n:'বান স্টাইল',o:{skin:'#d6a378',top:'#2f6f73',bot:'#efe6d6',orna:'#e9c6c9',trim:'#e9c6c9',hs:'bun',hair:'#141010',glasses:true,sandal:true}},
    {n:'হিজাবি এলিগ্যান্স',o:{skin:'#dcae84',top:'#5e3a7a',bot:'#e9dfd0',orna:null,trim:'#d7c3e6',hs:'hijab',hijab:'#e0d4c0',glasses:false,sandal:false}},
    {n:'গোলাপি কামিজ',o:{skin:'#c48a5f',top:'#b8475a',bot:'#efe6d6',orna:'#f3e5c8',trim:'#f3e5c8',hs:'long',hair:'#141010',glasses:false,sandal:true}},
    {n:'নীল স্মার্ট',o:{skin:'#b07a50',top:'#2e5a8c',bot:'#e9dfd0',orna:'#c9e0e2',trim:'#c9e0e2',hs:'bun',hair:'#141010',glasses:true,sandal:false}},
    {n:'গ্রিন গার্ল',o:{skin:'#d6a378',top:'#467a4a',bot:'#2a2a2e',orna:'#c9e0e2',trim:'#c9e0e2',hs:'long',hair:'#3a2418',glasses:false,sandal:true}},
    {n:'হলুদ রোদ',o:{skin:'#dcae84',top:'#c08a2b',bot:'#2a2a2e',orna:'#f3e5c8',trim:'#f3e5c8',hs:'bun',hair:'#141010',glasses:false,sandal:false}},
    {n:'হিজাবি ব্লু',o:{skin:'#c48a5f',top:'#2e5a8c',bot:'#d9c7b0',orna:null,trim:'#c9e0e2',hs:'hijab',hijab:'#3a3f52',glasses:true,sandal:false}},
    {n:'কমলা পিচ',o:{skin:'#a87452',top:'#d98b6d',bot:'#efe6d6',orna:'#d7c3e6',trim:'#d7c3e6',hs:'long',hair:'#141010',glasses:true,sandal:true}},
    {n:'ডার্ক কুইন',o:{skin:'#9a6844',top:'#7e2c3a',bot:'#2a2a2e',orna:'#c9e0e2',trim:'#e9c6c9',hs:'long',hair:'#141010',glasses:false,sandal:false}}]};
const modelList=g=>MODELS[g==='f'?'f':'m'];
const modelOf=(g,i)=>{const L=modelList(g);return L[i>=0&&i<L.length?i:0];};
// what you can change on top of a preset model (the same choices, checked again by the server)
const SKIN_TONES=['#f1c9a5','#e8b98f','#dcae84','#d6a378','#c48a5f','#b07a50','#a87452','#9a6844','#8c5c3c','#6b4429'];
const HAIR_COLS=['#16110e','#3a2418','#5b5550','#8a5a2b','#b8863b','#c9c2b5','#7a1f26','#2f3a4f'];
const TOP_M=['#f4f4f2','#cfe0f2','#4f7cac','#2f3a4f','#1d1d1f','#b3261e','#e2622b','#c9a227','#3c6e47','#2f6f73','#5b2a86','#8a8f96'];
const BOT_M=['#2a2f3a','#1e1f24','#4a4d54','#3b3f4a','#8b7d63','#b9a27a','#2d4a73','#3b5a85'];
const TOP_F=['#b3261e','#b8475a','#d98b6d','#c08a2b','#467a4a','#2f6f73','#2e5a8c','#5e3a7a','#7e2c3a','#1d1d1f','#f1e8d6','#e9c6c9'];
const BOT_F=['#2a2a2e','#efe6d6','#e9dfd0','#d9c7b0','#2e5a8c','#7e2c3a','#467a4a','#5e3a7a'];
const ORNA_COLS=['#f0d9a0','#e9c6c9','#c9e0e2','#f3e5c8','#d7c3e6','#ffffff'];
const HIJAB_COLS=['#3a3f52','#7a5a4a','#c7b29a','#5b6e7a','#8a3b47','#e0d4c0','#1d1d1f','#2e5a8c'];
function lookFix(g,base,look){const o=Object.assign({},base);if(!look)return o;Object.assign(o,look);
  if(g==='f'){if(o.hs==='hijab'&&!o.hijab)o.hijab='#e0d4c0';if(look.orna)o.trim=look.orna;}
  else{if(look.style){o.tie=look.style==='shirt'&&base.tie?base.tie:null;if(look.style!=='tee')o.print=null;if(look.style==='shirt'&&!look.sleeve)o.sleeve='long';}
    if(look.jeans===true&&!look.bot)o.bot='#2d4a73';if(look.jeans===false&&!look.bot&&base.jeans)o.bot='#2a2f3a';}
  return o;}
function mkModel(g,i,look){const o=lookFix(g==='f'?'f':'m',modelOf(g,i).o,look);return g==='f'?mkWoman(o):mkMan(o);}
// your own character: rebuilt whenever your gender or model changes, kept where you stand
function setPlayerModel(g,i,look){g=g==='f'?'f':'m';i=Number.isInteger(i)?i:0;const key=JSON.stringify(look||{});if(player.o.g===g&&player.mi===i&&player.lk===key)return;
  const old=player,np=mkModel(g,i,look);np.mi=i;np.lk=key;place(np,old.x,old.z,old.yaw);np.cam=old.cam;np.root.visible=old.root.visible;scene.remove(old.root);player=np;if(SETUP.state==='bag')addBag(np);}
// a small flat portrait of a model for the picker
function modelSvg(g,m){const o=m.o,NS='http://www.w3.org/2000/svg',s=document.createElementNS(NS,'svg');s.setAttribute('viewBox','0 0 40 46');
  const add=(t,a)=>{const e=document.createElementNS(NS,t);for(const k in a)e.setAttribute(k,a[k]);s.appendChild(e);return e;};
  const hair=o.hair||'#141010';
  if(o.hs==='long'||o.hs==='bun')add('ellipse',{cx:20,cy:20,rx:12.5,ry:14,fill:hair});
  if(o.hs==='hijab'){add('ellipse',{cx:20,cy:22,rx:14,ry:17,fill:o.hijab});}
  add('path',{d:'M3 46c1-10 8-15 17-15s16 5 17 15z',fill:o.top});
  if(o.tie)add('path',{d:'M18.5 32l3 0-1 9-1-9z',fill:o.tie});
  add('rect',{x:17,y:26,width:6,height:6,fill:o.skin});
  add('ellipse',{cx:20,cy:19,rx:8.5,ry:10,fill:o.skin});
  if(o.hs==='short')add('path',{d:'M11.5 17c0-7 4-10 8.5-10s8.5 3 8.5 10c-2-4-5-5-8.5-5s-6.5 1-8.5 5z',fill:hair});
  if(o.hs==='long'||o.hs==='bun')add('path',{d:'M11 18c0-8 4-11 9-11s9 3 9 11c-2-4-5-6-9-6s-7 2-9 6z',fill:hair});
  if(o.hs==='bun')add('circle',{cx:20,cy:5.5,r:3.6,fill:hair});
  if(o.hs==='hijab')add('path',{d:'M10.5 20c0-9 4-13 9.5-13s9.5 4 9.5 13c-2-4-5-6.5-9.5-6.5S12.5 16 10.5 20z',fill:o.hijab});
  if(o.beard)add('path',{d:'M12 21c1 9 5 11 8 11s7-2 8-11c-2 4-5 5-8 5s-6-1-8-5z',fill:hair});
  if(o.mous&&!o.beard)add('rect',{x:16,y:23,width:8,height:1.8,rx:.9,fill:hair});
  add('circle',{cx:16.6,cy:19,r:1,fill:'#1b1b1b'});add('circle',{cx:23.4,cy:19,r:1,fill:'#1b1b1b'});
  if(o.glasses){add('circle',{cx:16.6,cy:19,r:3,fill:'none',stroke:'#1b1b1b','stroke-width':1});add('circle',{cx:23.4,cy:19,r:3,fill:'none',stroke:'#1b1b1b','stroke-width':1});}
  return s;}
let MT=null,RET=[],EMPS=null,pickGame='pool',pickDining=false,pickTable=-1,pickSel=[];
const GAMEDEF={
  pool:{bn:'পুল',em:'🎱',max:1},carrom:{bn:'ক্যারম',em:'🎯',max:1},
  uno:{bn:'উনো',em:'🃏',max:3,dine:true},chess:{bn:'দাবা',em:'♟️',max:1,dine:true},ludo:{bn:'লুডু',em:'🎲',max:3,dine:true}};
const RANKS=[[0,'প্রোবেশনার'],[50,'জুনিয়র'],[150,'সিনিয়র'],[300,'টিম লিড'],[600,'সিইওর প্রিয়']];
function rankOf(xp){let r=RANKS[0];for(const k of RANKS)if(xp>=k[0])r=k;return r[1];}
const shortName=n=>String(n||'').trim().split(/\s+/)[0]||'';
const bnd=s=>String(s).replace(/\d/g,d=>'০১২৩৪৫৬৭৮৯'[d]);

/* ---- path finding on a grid of the same collision test the player uses ---- */
const GR=.3,GX0=-16,GZ0=-16,GNX=Math.ceil(34.7/GR)+1,GNZ=Math.ceil(26.7/GR)+1;
let gridCache=null;
function gfree(i,j){if(i<0||j<0||i>=GNX||j>=GNZ)return false;if(!gridCache)gridCache=new Uint8Array(GNX*GNZ);const k=j*GNX+i;let v=gridCache[k];if(!v){v=hit(GX0+i*GR,GZ0+j*GR)?2:1;gridCache[k]=v;}return v===1;}
const gci=x=>Math.max(0,Math.min(GNX-1,Math.round((x-GX0)/GR))),gcj=z=>Math.max(0,Math.min(GNZ-1,Math.round((z-GZ0)/GR)));
function nearFreeCell(x,z){let i=gci(x),j=gcj(z);if(gfree(i,j))return[i,j];
  for(let r=1;r<16;r++)for(let a=-r;a<=r;a++)for(let b=-r;b<=r;b++){if(Math.max(Math.abs(a),Math.abs(b))!==r)continue;if(gfree(i+a,j+b))return[i+a,j+b];}
  return[i,j];}
function nearFree(x,z){if(!hit(x,z))return[x,z];const c=nearFreeCell(x,z);return[GX0+c[0]*GR,GZ0+c[1]*GR];}
function route(x0,z0,x1,z1){
  const si=gci(x0),sj=gcj(z0),[gi,gj]=nearFreeCell(x1,z1),N=GNX*GNZ,g=new Float32Array(N).fill(1e9),from=new Int32Array(N).fill(-1),closed=new Uint8Array(N),heap=[];
  const push=(f,k)=>{heap.push([f,k]);let i=heap.length-1;while(i>0){const p=(i-1)>>1;if(heap[p][0]<=heap[i][0])break;[heap[p],heap[i]]=[heap[i],heap[p]];i=p;}};
  const pop=()=>{const top=heap[0],last=heap.pop();if(heap.length){heap[0]=last;let i=0;for(;;){const l=2*i+1,r=l+1;let m=i;if(l<heap.length&&heap[l][0]<heap[m][0])m=l;if(r<heap.length&&heap[r][0]<heap[m][0])m=r;if(m===i)break;[heap[m],heap[i]]=[heap[i],heap[m]];i=m;}}return top;};
  const s=sj*GNX+si;g[s]=0;push(0,s);let goal=-1;
  while(heap.length){const k=pop()[1];if(closed[k])continue;closed[k]=1;const i=k%GNX,j=(k/GNX)|0;if(i===gi&&j===gj){goal=k;break;}
    for(let di=-1;di<=1;di++)for(let dj=-1;dj<=1;dj++){if(!di&&!dj)continue;const ni=i+di,nj=j+dj;if(!gfree(ni,nj))continue;const nk=nj*GNX+ni;if(closed[nk])continue;
      if(di&&dj&&(!gfree(i+di,j)||!gfree(i,j+dj)))continue;const ng=g[k]+(di&&dj?1.414:1);if(ng<g[nk]){g[nk]=ng;from[nk]=k;push(ng+Math.hypot(ni-gi,nj-gj),nk);}}}
  if(goal<0)return[[x1,z1]];
  const pts=[];for(let k=goal;k>=0;k=from[k])pts.push([GX0+(k%GNX)*GR,GZ0+((k/GNX)|0)*GR]);pts.reverse();pts[0]=[x0,z0];
  const los=(a,b)=>{const L=Math.hypot(b[0]-a[0],b[1]-a[1]),n=Math.ceil(L/.12),nx=-(b[1]-a[1])/(L||1)*.1,nz=(b[0]-a[0])/(L||1)*.1;   // the line and a little to each side of it, so doorways are not clipped
    for(let q=1;q<n;q++){const u=q/n,x=a[0]+(b[0]-a[0])*u,z=a[1]+(b[1]-a[1])*u;if(hit(x,z)||hit(x+nx,z+nz)||hit(x-nx,z-nz))return false;}return true;};
  const out=[];let a=0;while(a<pts.length-1){let b=pts.length-1;while(b>a+1&&!los(pts[a],pts[b]))b--;out.push(pts[b]);a=b;}
  if(!out.length)out.push([x1,z1]);else if(!hit(x1,z1))out[out.length-1]=[x1,z1];
  return out;}

/* ---- speech bubbles and name tags that follow a person's head ---- */
function bubbleLayer(){let l=byId('bubbles');if(!l){l=document.createElement('div');l.id='bubbles';document.body.appendChild(l);}return l;}
function mkTip(P,cls,html,sec,dy){const el=document.createElement('div');el.className='bub on '+cls;if(html.nodeType)el.appendChild(html);else el.textContent=html;bubbleLayer().appendChild(el);
  const t={el,P,left:sec,dy:dy||.32};MT.tips.push(t);return t;}
function rmTip(t){t.el.remove();const i=MT.tips.indexOf(t);if(i>=0)MT.tips.splice(i,1);}
function say(P,text,sec){sfx.play('pop',.25);return mkTip(P,'mline',text,sec);}
function updTips(dt){const w=stage.clientWidth,h=stage.clientHeight;
  for(const t of MT.tips.slice()){t.left-=dt;if(t.left<=0){rmTip(t);continue;}
    t.P.J.neck.getWorldPosition(_v);_v.y+=t.dy;_v.project(camera);
    if(_v.z>1||_v.z<-1||Math.abs(_v.x)>1.1||Math.abs(_v.y)>1.1){t.el.style.visibility='hidden';continue;}t.el.style.visibility='';
    const bw=t.el.offsetWidth,x=Math.max(bw/2+6,Math.min(w-bw/2-6,(_v.x*.5+.5)*w)),y=(-_v.y*.5+.5)*h;t.el.style.transform='translate('+x+'px,'+y+'px) translate(-50%,-100%)';}}

/* ---- starting: walk up to a table, press E ---- */
const DTABLES=[-8.2,-5.65,-4.35,-3.05,-1.75,-.45].map(z=>({x:15.95,z}));
function diningNear(){if(MT||lastZone!=='dine'||!player)return-1;let b=-1,bd=1.75;DTABLES.forEach((t,i)=>{const d=Math.hypot(player.x-t.x,player.z-t.z);if(d<bd){bd=d;b=i;}});return b;}
function tableNear(){if(MT)return null;
  if(SIT.on)return'stand';if(SETUP.state==='run')return null;if(chairNear())return'sit';
  if(lastZone==='bal')return SMOKE.on?'smokeStop':'smoke';
  if(lastZone==='game'){const x=player.x,z=player.z;if(Math.hypot(x-2.6,z-5)<2.1)return'pool';if(Math.hypot(x+1.8,z-5)<1.5)return'carrom';return null;}
  if(lastZone==='dine'&&diningNear()>=0)return CLK.free?'dine':'dineBusy';return null;}
function actNear(){return gateNear()||tableNear();}
function interact(){const n=actNear();
  if(n==='pool'||n==='carrom')openPicker(n,false);else if(n==='dine')openPicker('uno',true);else if(n==='smoke')startSmoke();else if(n==='smokeStop')stopSmoke(false);
  else if(n==='sit'){const c=chairNear();if(c)startSit(c);}else if(n==='stand')standUp();
  else if(n==='dineBusy')toast('ডাইনিং এখন লাঞ্চ-ব্রেকে ব্যস্ত। বিকেল ৫টার পর ফাঁকা হলে খেলতে পারবেন।',3500);
  else gateInteract();}
function actText(n){const k=touchUI()?'ট্যাপ করুন: ':'E চাপুন: ';
  return n==='btn'?k+'এক্সিট বাটন চাপুন':n==='face'?k+'ফেস স্ক্যান করে দরজা খুলুন':n==='pool'?k+'পুল খেলুন 🎱':n==='carrom'?k+'ক্যারম খেলুন 🎯':n==='dine'?k+'উনো, দাবা বা লুডু খেলুন 🎲':n==='sit'?k+'বসুন 🪑':n==='stand'?k+'উঠে দাঁড়ান':n==='smoke'?k+'সিগারেট ধরান 🚬':n==='smokeStop'?k+'সিগারেট ফেলে দিন':n==='dineBusy'?'ডাইনিং এখন ব্যস্ত, বিকেল ৫টার পর খেলা যাবে':'';}

/* ---- picking who to invite ---- */
const ratingOf=(e,g)=>(e.ratings&&e.ratings[g])||1000;
function renderPick(){const q=byId('mpickQ').value.trim().toLowerCase(),L=byId('mlist'),max=GAMEDEF[pickGame].max;L.textContent='';
  const isOn=e=>e.online||NET.players.has(e.empId);
  const rows=EMPS.filter(e=>!q||(e.name+' '+e.nickname+' '+e.designation+' '+e.department).toLowerCase().includes(q)).sort((a,b)=>(isOn(b)-isOn(a))||a.name.localeCompare(b.name));
  if(!rows.length){L.textContent='কাউকে খুঁজে পাওয়া যায়নি।';}
  for(const e of rows){const b=document.createElement('button');b.type='button';b.className='cand';b.setAttribute('aria-pressed',String(pickSel.includes(e.empId)));
    const dot=document.createElement('i');dot.className='dot '+(isOn(e)?'on':'off');dot.title=isOn(e)?'অনলাইন':'অফলাইন';
    const av=document.createElement('span');av.className='cav';av.textContent=e.avatar;av.style.background=e.avatarBg;
    const tx=document.createElement('span');tx.className='ctx';const n=document.createElement('b');n.textContent=e.name+(e.nickname?' ('+e.nickname+')':'');const s=document.createElement('small');s.textContent=isOn(e)&&e.act?e.act:(e.designation||e.department||'');tx.append(n,s);
    const xp=document.createElement('em');xp.textContent='⭐ '+bnd(ratingOf(e,pickGame));b.append(dot,av,tx,xp);
    b.addEventListener('click',()=>{
      if(!pickDining&&max===1){closePick();beginInvite([e],pickGame,-1);return;}
      const i=pickSel.indexOf(e.empId);if(i>=0)pickSel.splice(i,1);else if(pickSel.length<max)pickSel.push(e.empId);else{toast('এই খেলায় সর্বোচ্চ '+bnd(max)+' জনকে ডাকা যায়।',2200);return;}
      renderPick();});
    L.appendChild(b);}
  byId('mpickInfo').textContent='বেছেছেন '+bnd(pickSel.length)+'/'+bnd(max);byId('mpickGo').disabled=!pickSel.length;}
function renderGameTabs(){const T=byId('mgames');T.textContent='';
  for(const g of['uno','chess','ludo']){const b=document.createElement('button');b.type='button';b.setAttribute('aria-pressed',String(g===pickGame));b.textContent=GAMEDEF[g].em+' '+GAMEDEF[g].bn;
    b.addEventListener('click',()=>{pickGame=g;pickSel=pickSel.slice(0,GAMEDEF[g].max);renderGameTabs();renderPick();});T.appendChild(b);}}
function closePick(){byId('mpick').hidden=true;}
async function openPicker(game,dining){if(MT)return;pickGame=game;pickDining=!!dining;pickSel=[];pickTable=dining?diningNear():-1;for(const k in keys)keys[k]=false;
  byId('mpickTitle').textContent=dining?'কার সাথে খেলবেন?':GAMEDEF[game].bn+' খেলতে কাকে ডাকবেন?';byId('mpickQ').value='';byId('mlist').textContent='লোড হচ্ছে…';
  byId('mgames').hidden=!dining;byId('mpickFoot').hidden=!dining;if(dining)renderGameTabs();byId('mpick').hidden=false;
  try{const r=await fetch('/api/employees'),d=await r.json();if(!r.ok||!d.ok)throw new Error(d&&d.error);EMPS=d.employees;renderPick();}
  catch(e){byId('mlist').textContent='সহকর্মীদের তালিকা আনা যায়নি। আবার চেষ্টা করুন।';}}

/* ---- the invitation: walk to the colleague, challenge ---- */
// A colleague who is online gets a live challenge on their own screen. Anyone offline is simulated as before: a copy of them appears at a desk.
const LIVE_WAIT=35;   // seconds a live colleague has to answer
const nowMs=m=>Date.now()+(m&&m.live?NET.skew:0);
function pickDeskNow(){const free=DESKS.filter(s=>!s.occ&&!s.taken),all=free.length?free:DESKS.filter(s=>!s.taken),s=all[Math.floor(Math.random()*all.length)];s.taken=true;return s;}
function spawnAtDesk(emp,s){const P=mkModel(emp.gender,emp.model,emp.look);place(P,s[0],s[1],s[2]);P.role=s[3];P.kbd=.6;P.v='type';P.speed=2.6;const act={P,fn:aType};acts.push(act);return{P,act,seat:s,emp};}
function beginInvite(emps,game,table){
  panel.classList.add('folded');syncFold();
  const live=emps.filter(e=>NET.players.has(e.empId)),sims=emps.filter(e=>!NET.players.has(e.empId));
  const opps=sims.map(e=>spawnAtDesk(e,pickDeskNow()));
  MT={game,emps,emp:emps[0],opps,live:false,liveEmps:live,table,t:0,tips:[],auto:null,arrived:false};
  if(live.length){MT.state='toLive';MT.target=live[0].empId;MT.routeT=0;toast(live[0].name+' এর কাছে যাচ্ছেন…',3500);return;}
  MT.opp=opps[0];const s=opps[0].seat,f0=Math.sin(s[2]),f1=Math.cos(s[2]),st=nearFree(s[0]-f0*1,s[1]-f1*1);MT.stand=st;MT.face=Math.atan2(f0,f1);MT.state='toDesk';
  MT.auto=route(player.x,player.z,st[0],st[1]);toast(emps[0].name+' এর ডেস্কে যাচ্ছেন…',3500);}
function showChallenge(){const m=MT,e=m.emp,box=document.createElement('div'),gd=GAMEDEF[m.game];
  const h=document.createElement('b');h.textContent=e.avatar+' '+e.name;
  const p=document.createElement('div');p.className='mmsg';p.textContent=shortName(window.CB_PLAYER&&window.CB_PLAYER.name)+' আপনাকে '+gd.bn+' খেলতে ডাকছেন!'+(m.emps.length>1?' (সাথে আরও '+bnd(m.emps.length-1)+' জন)':'');
  const row=document.createElement('div');row.className='mact';
  const go=document.createElement('button');go.type='button';go.className='mgo';go.textContent='⚔️ চ্যালেঞ্জ করুন';
  const no=document.createElement('button');no.type='button';no.className='mno';no.textContent='থাক';row.append(go,no);box.append(h,p,row);
  const tip=mkTip(m.opp.P,'mtip',box,1e9,.4);sfx.play('pop',.3);
  go.addEventListener('click',()=>{rmTip(tip);const L=['চলেন, দেখি কত ধানে কত চাল!','কাজ পরে, আগে একটা ম্যাচ হয়ে যাক!','ভয় পেলে এখনই বলে দেন!'];say(player,L[Math.floor(Math.random()*L.length)],2.2);m.state='say1';m.t=0;});
  no.addEventListener('click',()=>{rmTip(tip);cancelInvite();});}
function dropAct(o){const i=acts.indexOf(o.act);if(i>=0)acts.splice(i,1);o.act=null;}
function cancelInvite(){const m=MT;if(!m)return;for(const t of m.tips.slice())rmTip(t);for(const o of m.opps){dropAct(o);if(o.seat)o.seat.taken=false;scene.remove(o.P.root);}
  if(m.liveId&&!m.ids)livePost({action:'cancel',id:m.liveId});MT=null;}

/* ---- live challenges ---- */
async function livePost(body){try{const r=await fetch('/api/live',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)}),d=await r.json().catch(()=>null);return{ok:r.ok&&d&&d.ok,d};}catch(e){return{ok:false,d:null};}}
// the host is next to the colleague: send the challenge to their screen
async function sendLive(m){if(m.state!=='toLive')return;m.state='sending';m.auto=null;
  const live=m.liveEmps.map(e=>e.empId),sims=m.emps.filter(e=>!live.includes(e.empId)).map(e=>e.empId);
  const r=await livePost({action:'create',game:m.game,table:m.table,invitees:live,sims});
  if(MT!==m)return;
  if(!r.ok){toast((r.d&&r.d.error)||'চ্যালেঞ্জ পাঠানো যায়নি। আবার চেষ্টা করুন।',3500);cancelInvite();return;}
  m.liveId=r.d.id;m.state='waitLive';m.t=0;m.liveInfo=null;
  const box=document.createElement('div'),h=document.createElement('b');h.textContent='⏳ '+m.liveEmps.map(e=>shortName(e.name)).join(', ')+' এর উত্তরের অপেক্ষায়…';
  const row=document.createElement('div');row.className='mact';const no=document.createElement('button');no.type='button';no.className='mno';no.textContent='বাতিল';row.append(no);box.append(h,row);
  const rem=NET.remote.get(m.target);m.waitTip=mkTip(rem?rem.P:player,'mtip',box,1e9,.4);
  no.addEventListener('click',()=>{if(MT===m)cancelInvite();});}
async function goLive(m){if(m.state!=='waitLive')return;m.state='going';
  const L=m.liveInfo,declined=L?L.players.filter(p=>p.state!=='accepted').map(p=>shortName((m.emps.find(e=>e.empId===p.id)||{}).name)):[];
  if(declined.length)toast(declined.join(', ')+' রাজি হননি।',3500);
  const r=await livePost({action:'go',id:m.liveId});
  if(MT!==m)return;
  if(!r.ok){toast((r.d&&r.d.error)||'কেউ রাজি হননি।',3500);cancelInvite();return;}
  if(m.waitTip)rmTip(m.waitTip);m.waitTip=null;NET.skew=r.d.serverNow-Date.now();m.live=true;enterGo(m,r.d.live);}
// everyone agreed (or the game was made up of simulated colleagues): everybody walks to their seats
function enterGo(m,info){
  const me=PROFILE.empId;m.ids=info.order;m.meIdx=m.ids.indexOf(me);m.seed=info.seed;m.startAt=info.startAtMs;m.table=info.table;m.liveId=info.id;m.simIds=info.simIds||[];m.moves=(info.moves||[]).slice();
  m.pinfo={};for(const p of info.parts)m.pinfo[p.empId]=p;
  m.emps=m.ids.filter(i=>i!==me).map(i=>m.pinfo[i]);m.emp=m.emps[0];
  m.seats=GAMEDEF[m.game].dine?diningSeats(DTABLES[m.table],m.ids.length):null;
  const sp=spotsFor(m),old=m.opps||[];m.opps=[];
  m.ids.forEach((id,i)=>{if(id===me)return;
    let o=old.find(x=>x.emp.empId===id);
    if(!o){const pi=m.pinfo[id];
      if(info.simIds.includes(id))o=spawnAtDesk(pi,pickDeskNow());
      else{const r=NET.remote.get(id),P=mkModel(pi.gender,pi.model,pi.look);if(r)place(P,r.x,r.z,r.yaw);else place(P,sp[i][0],sp[i][1],0);P.speed=2.6;o={P,seat:null,emp:pi,live:true};}}
    dropAct(o);o.idx=i;rest(o.P);o.P.root.position.set(o.P.x,0,o.P.z);o.P.speed=2.6;o.P.path=route(o.P.x,o.P.z,sp[i][0],sp[i][1]);o.done=false;m.opps.push(o);});
  for(const t of m.tips.slice())rmTip(t);
  m.auto=route(player.x,player.z,sp[m.meIdx][0],sp[m.meIdx][1]);m.arrived=false;m.state='walk';m.t=0;}
// a live colleague invited me
function showInvite(L){const host=L.parts.find(p=>p.empId===L.hostId)||{name:'কেউ'},gd=GAMEDEF[L.game];
  NET.inviteId=L.id;byId('invEm').textContent=gd.em;byId('invT').textContent=shortName(host.name)+' আপনাকে '+gd.bn+' খেলতে ডাকছেন!';
  byId('invP').textContent=(L.players.length>1||L.simIds.length?'সাথে আরও '+bnd(L.players.length-1+L.simIds.length)+' জন। ':'')+'রাজি থাকলে ডাইনিং ও গেমিং রুমের টেবিলে খেলা শুরু হবে।';
  const bar=byId('invBar');bar.style.transition='none';bar.style.width='100%';void bar.offsetWidth;bar.style.transition='width '+LIVE_WAIT+'s linear';bar.style.width='0%';
  byId('minvite').hidden=false;sfx.play('pop',.4);clearTimeout(NET.invT);NET.invT=setTimeout(()=>closeInvite(L.id),(LIVE_WAIT+3)*1000);}
function closeInvite(id){if(id!=null&&NET.inviteId!==id)return;byId('minvite').hidden=true;NET.inviteId=null;clearTimeout(NET.invT);}
async function answerInvite(accept){const id=NET.inviteId;if(id==null)return;closeInvite(id);if(accept)NET.accepted.add(id);
  const r=await livePost({action:'respond',id,accept});
  if(accept)toast(r.ok?'চ্যালেঞ্জ নিয়েছেন! সবাই তৈরি হলে খেলা শুরু হবে…':((r.d&&r.d.error)||'চ্যালেঞ্জটা আর চালু নেই।'),4000);}
function startFromGo(L){if(MT){return;}panel.classList.add('folded');syncFold();if(mode!=='walk')setMode('walk');
  MT={game:L.game,emps:[],opps:[],live:true,liveId:L.id,table:L.table,t:0,tips:[],auto:null,arrived:false,state:'walk'};enterGo(MT,L);toast('খেলা শুরু হচ্ছে, সিটে যান!',3000);}
// called with the live matches the server knows about every time the presence beat comes back
function applyLive(list,serverNow){const me=PROFILE&&PROFILE.empId;if(!me)return;NET.skew=serverNow-Date.now();
  for(const L of list){const mine=L.hostId===me;
    if(mine&&MT&&MT.liveId===L.id)MT.liveInfo=L;
    if(MT&&MT.liveId===L.id&&L.moves){if(!MT.moves)MT.moves=[];if(L.moves.length>MT.moves.length)MT.moves=L.moves.slice();}
    if(!mine&&L.status==='invite'){const p=L.players.find(x=>x.id===me);
      if(p&&p.state==='invited'&&!NET.handled.has('i'+L.id)){NET.handled.add('i'+L.id);
        if(MT)livePost({action:'respond',id:L.id,accept:false});else showInvite(L);}}
    if(!mine&&L.status==='cancel'&&NET.inviteId===L.id){closeInvite(L.id);toast('ডাকা মানুষটি চ্যালেঞ্জ বাতিল করেছেন।',3000);}
    if(!mine&&L.status==='go'&&L.order&&L.order.includes(me)&&NET.accepted.has(L.id)&&!NET.handled.has('g'+L.id)){NET.handled.add('g'+L.id);startFromGo(L);}}}

/* ---- seats at a dining table ---- */
function diningSeats(t,n){const a=Math.PI/2,S={Lm:[t.x-.7,t.z-.3,a],Lp:[t.x-.7,t.z+.3,a],Rm:[t.x+.7,t.z-.3,-a],Rp:[t.x+.7,t.z+.3,-a]};
  const ord=n===2?[S.Lm,S.Rm]:n===3?[S.Lm,S.Rm,S.Rp]:[S.Lm,S.Rm,S.Lp,S.Rp];return ord.map(s=>({x:s[0],z:s[1],yaw:s[2]}));}
function seatedPose(P,t,reach,tgt){rest(P);sit(P,.46);const J=P.J;J.spine.rotation.x=.22;J.neck.rotation.x=.32;J.head.rotation.y=Math.sin(t*.4+P.ph)*.08;
  const f0=Math.sin(P.yaw),f1=Math.cos(P.yaw),r0=-Math.cos(P.yaw),r1=Math.sin(P.yaw);
  armIK(P,'l',_vt.set(P.x+f0*.3-r0*.13,.8,P.z+f1*.3-r1*.13),PTL);J.lHand.rotation.set(0,-1.5,0);
  const rx=P.x+f0*.3+r0*.13,rz=P.z+f1*.3+r1*.13;
  armIK(P,'r',_vt.set(lerp(rx,tgt.x,reach),lerp(.8,.81+Math.max(0,Math.sin(t*9))*.015,reach),lerp(rz,tgt.z,reach)),PTR);J.rHand.rotation.set(0,1.5,0);
  if(reach>.2)J.head.rotation.y=0;}

/* ---- the match itself ---- */
// Participants are in a fixed order (m.ids, the same on every screen); m.parts[i] is the character for m.ids[i].
const OPPL=['আসো আসো, আজ তোমার XP আমার!','দাঁড়াও, Ctrl+S করে নিই। চলো!','হারলে কিন্তু চা তোমার!','বস দেখলে বলবো তুমি জোর করে নিয়ে গেছো।','আমি গতকালই প্র্যাকটিস করেছি, সাবধান!','ঠিক আছে, তবে হারলে আমাকে বলতে পারবা না "টেবিল ঢালু ছিল"।'];
const OTHERL=['আসছি! 🏃','আমিও আছি!','দাঁড়াও, চশমাটা নিই।','চা-টা ঠান্ডা হোক, আসছি।'];
function spotsFor(m){
  if(m.game==='pool')return[POOL.wait[0],POOL.wait[1]];
  if(m.game==='carrom')return[[CARROM.T.cx,CARROM.T.cz+1.0],[CARROM.T.cx,CARROM.T.cz-1.0]];
  return m.seats.map(s=>[s.x,s.z]);}
function beginPool(m){const S=POOL,T=S.T,[A,B]=m.parts;
  m.saved={players:S.players,pn:[PN[0],PN[1]]};S.players.forEach(p=>{p.root.visible=false;});
  S.players=[A,B];PN[0]=shortName(m.pnames[0]);PN[1]=shortName(m.pnames[1]);if(PN[1]===PN[0])PN[1]=m.pnames[1];
  SRP=mulberry32(m.seed);
  S.rack();S.groups=[null,null];S.wins=[0,0];S.games=1;S.breakNext=true;S.wasBreak=false;S.ballInHand=false;S.hit=false;S.line=null;S.winner=null;S.shot=null;S.stand=null;S.onEight=false;T.potted=[];T.firstHit=null;
  S.breaker=S.shooter=SRP()<.5?0:1;for(const P of[A,B]){P.path=[];P.cheer=0;P.speed=1.05;}place(A,S.wait[0][0],S.wait[0][1],Math.PI/2);place(B,S.wait[1][0],S.wait[1][1],-Math.PI/2);
  S.state='plan';S.t=0;S.msg=PN[S.breaker]+' ব্রেক করবে।';m.limit=720;m.camPos=new THREE.Vector3(-1,3.5,2.8);m.camTo=new THREE.Vector3(3.2,.5,5.3);m.camDef=[m.camPos.clone(),m.camTo.clone()];
  // real shots: the players aim and shoot, everything else is replayed from the shared move log
  m.turnPool=true;m.humans=m.ids.map((id,i)=>i===m.meIdx||(m.live&&!(m.simIds||[]).includes(id)));m.moves=m.moves||[];m.mIdx=0;m.acc=0;m.blocked=false;m.waitSince=null;m.autoFor=-1;m.pui=null;m.limit=1800;}
function endPool(m){const S=POOL;poolAimOff(m);SRP=Math.random;S.players=m.saved.players;PN[0]=m.saved.pn[0];PN[1]=m.saved.pn[1];S.players.forEach(p=>{p.root.visible=true;p.path=[];});AMB.p.needs=true;}
function resetCoins(S){for(const c of S.coins){c.on=true;c.mesh.visible=true;c.x=c.home[0];c.z=c.home[1];c.vx=c.vz=0;}S.striker.on=true;S.striker.mesh.visible=true;S.striker.vx=S.striker.vz=0;S.cp=null;S.hit=false;S.over=false;S.turn=0;S.state='place';S.t=0;S.buzz=0;S.shot=null;S.T.potted=[];}
function beginCarrom(m){const S=CARROM,T=S.T,[A,B]=m.parts;
  m.saved={players:S.players};S.players.forEach(p=>{p.root.visible=false;});S.players=[A,S.players[1],B,S.players[3]];S.skip=[1,3];S.sc=[0,0,0,0];SRC=mulberry32(m.seed);
  resetCoins(S);for(const P of[A,B]){P.cheer=0;P.speed=1.05;}place(A,T.cx,T.cz+.72,Math.PI);place(B,T.cx,T.cz-.72,0);m.limit=480;m.camPos=new THREE.Vector3(.7,2.8,3.3);m.camTo=new THREE.Vector3(-1.8,.7,5);}
function endCarrom(m){const S=CARROM;SRC=Math.random;S.players=m.saved.players;S.players.forEach(p=>{p.root.visible=true;});S.skip=null;S.sc=null;AMB.c.needs=true;}

/* ---- dining table games: board, pieces and cards on the table ---- */
const TABLE_Y=.772;   // just above the little coaster that sits in the middle of each table
function canvasTex(w,h,draw){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;t.anisotropy=4;return t;}
function flatPlane(w,h,tex,y){const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshStandardMaterial({map:tex,roughness:.6}));m.rotation.x=-Math.PI/2;m.position.y=y||0;m.receiveShadow=true;return m;}
function disposeGroup(g){g.traverse(o=>{if(o.material){if(o.material.map)o.material.map.dispose();o.material.dispose&&o.material.dispose();}if(o.geometry&&!o.userData.shared)o.geometry.dispose();});g.parent&&g.parent.remove(g);}

let CG=null;   // chess geometry and materials, built once
function chessAssets(){if(CG)return CG;const sh=g=>{g.userData={};return g;};
  CG={base:new THREE.CylinderGeometry(.016,.017,.006,14),stemS:new THREE.CylinderGeometry(.007,.011,.022,12),stemM:new THREE.CylinderGeometry(.008,.012,.028,12),stemL:new THREE.CylinderGeometry(.008,.013,.036,12),
    ball:new THREE.SphereGeometry(.011,12,10),cap:new THREE.CylinderGeometry(.014,.012,.01,12),head:new THREE.BoxGeometry(.012,.02,.02),egg:new THREE.SphereGeometry(.011,12,10).scale(1,1.4,1),
    crown:new THREE.CylinderGeometry(.014,.009,.014,12),crossV:new THREE.BoxGeometry(.004,.016,.004),crossH:new THREE.BoxGeometry(.012,.004,.004),
    w:new THREE.MeshStandardMaterial({color:lin('#f1ece0'),roughness:.4}),b:new THREE.MeshStandardMaterial({color:lin('#2a2624'),roughness:.4})};
  for(const k of Object.keys(CG))if(CG[k].isBufferGeometry)CG[k].userData.shared=true;return CG;}
function chessPiece(t,isW){const G=chessAssets(),g=new THREE.Group(),m=isW?G.w:G.b;
  const add=(geo,y)=>{const e=new THREE.Mesh(geo,m);e.position.y=y;e.castShadow=true;g.add(e);return e;};
  add(G.base,.003);
  if(t==='p'){add(G.stemS,.017);add(G.ball,.032);}
  else if(t==='r'){add(G.stemM,.02);add(G.cap,.039);}
  else if(t==='n'){add(G.stemS,.017);add(G.head,.037).rotation.z=.5;}
  else if(t==='b'){add(G.stemM,.02);add(G.egg,.04);}
  else if(t==='q'){add(G.stemL,.024);add(G.crown,.05);add(G.ball,.06);}
  else{add(G.stemL,.024);add(G.crown,.05);add(G.crossV,.063);add(G.crossH,.064);}
  return g;}
function makeChessViz(m,c){const grp=new THREE.Group(),CELL=.0625,SIZE=CELL*8;grp.position.set(c.x,TABLE_Y,c.z);scene.add(grp);
  const whiteLeft=m.sim.who[0]===0;grp.rotation.y=whiteLeft?-Math.PI/2:Math.PI/2;
  const frame=new THREE.Mesh(new THREE.BoxGeometry(SIZE+.03,.008,SIZE+.03),new THREE.MeshStandardMaterial({color:lin('#4a2f1c'),roughness:.5}));frame.position.y=.003;grp.add(frame);
  const tex=canvasTex(512,512,(x,w)=>{for(let r=0;r<8;r++)for(let q=0;q<8;q++){x.fillStyle=(r+q)%2?'#8a5a3b':'#ecd9b0';x.fillRect(q*w/8,r*w/8,w/8,w/8);}});
  grp.add(flatPlane(SIZE,SIZE,tex,.0075));
  const sq=i=>new THREE.Vector3(((i&7)-3.5)*CELL,.0075,((i>>3)-3.5)*CELL);
  const pcs=[],at={};
  m.sim.b.forEach((p,i)=>{if(!p)return;const o=chessPiece(p.toLowerCase(),p===p.toUpperCase());o.position.copy(sq(i));grp.add(o);const pc={g:o,sq:i,w:p===p.toUpperCase(),t:p.toLowerCase()};pcs.push(pc);at[i]=pc;});
  const focus=new THREE.Vector3();
  return{grp,focus,anim:[],
    onEvent(ev){if(!ev||ev.end||ev.from==null)return;const pc=at[ev.from];if(!pc)return;
      if(at[ev.to]){at[ev.to].g.visible=false;at[ev.to].dead=true;}
      delete at[ev.from];at[ev.to]=pc;pc.sq=ev.to;
      if(ev.promo){pc.g.clear();const n=chessPiece('q',pc.w);while(n.children.length)pc.g.add(n.children[0]);pc.t='q';}
      this.anim.push({pc,t:0,from:pc.g.position.clone(),to:sq(ev.to)});
      grp.updateMatrixWorld(true);focus.copy(sq(ev.to)).applyMatrix4(grp.matrixWorld);},
    update(dt){for(const a of this.anim){a.t=Math.min(1,a.t+dt/.22);const k=a.t;a.pc.g.position.lerpVectors(a.from,a.to,k);a.pc.g.position.y=.0075+Math.sin(k*Math.PI)*.03;}
      this.anim=this.anim.filter(a=>a.t<1);},
    dispose(){disposeGroup(grp);}};}

/* ludo: a 15x15 board; the 52 squares of the ring, clockwise from the red start */
const LRING=[];{const seg=(c,r,dc,dr,n)=>{for(let i=0;i<n;i++)LRING.push([c+dc*i,r+dr*i]);};
  seg(1,6,1,0,5);seg(6,5,0,-1,6);seg(7,0,1,0,2);seg(8,1,0,1,5);seg(9,6,1,0,6);seg(14,7,0,1,2);seg(13,8,-1,0,5);seg(8,9,0,1,6);seg(7,14,-1,0,2);seg(6,13,0,-1,5);seg(5,8,-1,0,6);seg(0,7,0,-1,2);}
const LCOL=['#d32f2f','#2e9d4a','#f2c230','#1f5fbf'];
const lrot=(x,y,k)=>{for(let i=0;i<k;i++){const nx=15-y;y=x;x=nx;}return[x,y];};   // quarter turn clockwise about the board centre, in cell units
function ludoCell(corner,p,t){   // where a token is, in cell units (a cell's centre is c+.5, r+.5)
  if(p<0)return lrot([2,4,2,4][t]*1,[2,2,4,4][t]*1,corner);
  if(p<=50){const c=LRING[(13*corner+p)%52];return[c[0]+.5,c[1]+.5];}
  if(p<56)return lrot(p-50+.5,7.5,corner);
  return lrot(7.5+([-.25,.25,-.25,.25][t]),7.5+([-.25,-.25,.25,.25][t]),corner);}
function ludoTex(){return canvasTex(600,600,(x,w)=>{const u=w/15;x.fillStyle='#f6f3ea';x.fillRect(0,0,w,w);
  const corners=[[0,0],[9,0],[9,9],[0,9]];
  corners.forEach(([c,r],k)=>{x.fillStyle=LCOL[k];x.fillRect(c*u,r*u,6*u,6*u);x.fillStyle='#f6f3ea';x.fillRect((c+1)*u,(r+1)*u,4*u,4*u);});
  x.strokeStyle='#9a958a';x.lineWidth=1;
  for(const [c,r] of LRING){x.fillStyle='#fffdf7';x.fillRect(c*u,r*u,u,u);x.strokeRect(c*u,r*u,u,u);}
  for(let k=0;k<4;k++){x.fillStyle=LCOL[k];for(let p=51;p<=55;p++){const [cx,cy]=lrot(p-50+.5,7.5,k);x.fillRect((cx-.5)*u,(cy-.5)*u,u,u);x.strokeRect((cx-.5)*u,(cy-.5)*u,u,u);}
    const s=LRING[13*k];x.fillRect(s[0]*u,s[1]*u,u,u);x.strokeRect(s[0]*u,s[1]*u,u,u);
    x.beginPath();const a=lrot(6,6,k),b=lrot(6,9,k),c2=[7.5*1,7.5*1];x.moveTo(a[0]*u,a[1]*u);x.lineTo(b[0]*u,b[1]*u);x.lineTo(c2[0]*u,c2[1]*u);x.closePath();x.fill();}
  x.fillStyle='#8b857a';x.font=(u*.8)+'px sans-serif';x.textAlign='center';x.textBaseline='middle';
  for(const i of[8,21,34,47]){const c=LRING[i];x.fillText('★',(c[0]+.5)*u,(c[1]+.55)*u);}});}
function dieTex(n){return canvasTex(64,64,(x)=>{x.fillStyle='#fffdf7';x.beginPath();x.roundRect?x.roundRect(2,2,60,60,10):x.rect(2,2,60,60);x.fill();x.strokeStyle='#444';x.lineWidth=2;x.stroke();
  const P={1:[[32,32]],2:[[18,18],[46,46]],3:[[18,18],[32,32],[46,46]],4:[[18,18],[46,18],[18,46],[46,46]],5:[[18,18],[46,18],[32,32],[18,46],[46,46]],6:[[18,16],[46,16],[18,32],[46,32],[18,48],[46,48]]};
  x.fillStyle=n===6?'#d32f2f':'#222';for(const [a,b] of P[n]){x.beginPath();x.arc(a,b,5,0,7);x.fill();}});}
function makeLudoViz(m,c){const grp=new THREE.Group(),SIZE=.56,CELL=SIZE/15,sim=m.sim,n=sim.n;grp.position.set(c.x,TABLE_Y,c.z);scene.add(grp);
  grp.add(flatPlane(SIZE,SIZE,ludoTex(),.002));
  const die=flatPlane(.05,.05,dieTex(1),.003);die.position.set(0,.003,SIZE/2+.045);grp.add(die);
  const geo=new THREE.CylinderGeometry(.005,.011,.022,12),ball=new THREE.SphereGeometry(.008,12,10),toks=[];
  for(let pl=0;pl<n;pl++){const mat=new THREE.MeshStandardMaterial({color:lin(LCOL[sim.corner[pl]]),roughness:.35});toks.push([]);
    for(let t=0;t<4;t++){const g=new THREE.Group(),a=new THREE.Mesh(geo,mat),b=new THREE.Mesh(ball,mat);a.position.y=.011;b.position.y=.026;a.castShadow=b.castShadow=true;g.add(a,b);grp.add(g);toks[pl].push({g,tx:0,tz:0});}}
  const pos=(cx,cy)=>[(cx-7.5)*CELL,(cy-7.5)*CELL];
  const layout=()=>{const cnt={};for(let pl=0;pl<n;pl++)for(let t=0;t<4;t++){const p=sim.tok[pl][t],cell=ludoCell(sim.corner[pl],p,t),key=p<0?'b'+pl+t:cell[0].toFixed(1)+','+cell[1].toFixed(1),k=cnt[key]=(cnt[key]||0)+1,[x,z]=pos(cell[0],cell[1]);
      const o=toks[pl][t];o.tx=x+(k-1)*.006;o.tz=z-(k-1)*.006;o.ty=.003+(k-1)*.004;}};
  layout();for(const row of toks)for(const o of row){o.g.position.set(o.tx,o.ty,o.tz);}
  const focus=new THREE.Vector3();let sel=[],selPl=0;
  return{grp,focus,
    onEvent(ev){if(!ev)return;die.material.map.dispose();die.material.map=dieTex(ev.roll);die.material.needsUpdate=true;layout();
      grp.updateMatrixWorld(true);if(ev.moved){const o=toks[ev.pl][ev.t];focus.set(o.tx,.01,o.tz).applyMatrix4(grp.matrixWorld);}else focus.set(0,.01,SIZE/2+.045).applyMatrix4(grp.matrixWorld);},
    setSelectable(pl,list){selPl=pl;sel=list.slice();},
    pick(cx,cy){if(!sel.length)return-1;const r=renderer.domElement.getBoundingClientRect(),rc=new THREE.Raycaster();rc.setFromCamera(new THREE.Vector2(((cx-r.left)/r.width)*2-1,-((cy-r.top)/r.height)*2+1),camera);
      const meshes=[];for(const t of sel)toks[selPl][t].g.traverse(o=>{if(o.isMesh)meshes.push(o);});const hit=rc.intersectObjects(meshes,false)[0];if(!hit)return-1;
      for(const t of sel){let ok=false;toks[selPl][t].g.traverse(o=>{if(o===hit.object)ok=true;});if(ok)return t;}return-1;},
    update(dt){grp.updateMatrixWorld(true);for(const row of toks)for(const o of row){const p=o.g.position,k=Math.min(1,dt*14);p.x+=(o.tx-p.x)*k;p.z+=(o.tz-p.z)*k;p.y+=(o.ty-p.y)*k;}
      const k=performance.now()/1000;for(let pl=0;pl<n;pl++)for(let t=0;t<4;t++)toks[pl][t].g.scale.setScalar(pl===selPl&&sel.includes(t)?1+.25*Math.sin(k*9):1);},
    dispose(){disposeGroup(grp);}};}

const UCOLS={R:'#d32f2f',Y:'#f2c230',G:'#2e9d4a',B:'#1f5fbf',W:'#222222'};
const USYM={skip:'⊘',rev:'⇄',d2:'+2',wild:'★',w4:'+4'};
function unoTex(card,color){return canvasTex(128,192,(x,w,h)=>{x.fillStyle='#fffdf7';x.fillRect(0,0,w,h);x.fillStyle=UCOLS[card.c==='W'?color:card.c];x.fillRect(8,8,w-16,h-16);
  x.fillStyle='#fffdf7';x.save();x.translate(w/2,h/2);x.rotate(-.5);x.beginPath();x.ellipse(0,0,40,62,0,0,7);x.fill();x.restore();
  x.fillStyle=UCOLS[card.c==='W'?color:card.c];x.font='700 64px sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillText(USYM[card.v]||card.v,w/2,h/2+4);
  x.fillStyle='#fffdf7';x.font='700 26px sans-serif';x.fillText(USYM[card.v]||card.v,24,26);});}
function unoBackTex(){return canvasTex(64,96,(x,w,h)=>{x.fillStyle='#fffdf7';x.fillRect(0,0,w,h);x.fillStyle='#181818';x.fillRect(4,4,w-8,h-8);x.fillStyle='#d32f2f';x.beginPath();x.ellipse(w/2,h/2,18,28,-.5,0,7);x.fill();});}
function makeUnoViz(m,c){const grp=new THREE.Group(),sim=m.sim,n=sim.n;grp.position.set(c.x,TABLE_Y,c.z);scene.add(grp);
  const back=unoBackTex(),backMat=new THREE.MeshStandardMaterial({map:back,roughness:.6}),CW=.065,CH=.1;
  const deck=new THREE.Mesh(new THREE.BoxGeometry(CW,.02,CH),new THREE.MeshStandardMaterial({color:lin('#181818'),roughness:.6}));deck.position.set(-.05,.01,0);grp.add(deck);
  const dTop=flatPlane(CW,CH,back,.0205);dTop.position.x=-.05;grp.add(dTop);
  const pile=[];let topMesh=null;
  const setTop=(card,color)=>{const mesh=flatPlane(CW,CH,unoTex(card,color),.003+pile.length*.0007);mesh.position.x=.045+(Math.random()-.5)*.012;mesh.position.z=(Math.random()-.5)*.012;mesh.rotation.z=(Math.random()-.5)*.7;mesh.castShadow=true;grp.add(mesh);pile.push(mesh);
    if(pile.length>8){const o=pile.shift();o.material.map.dispose();grp.remove(o);}topMesh=mesh;};
  setTop(sim.top,sim.color);
  const rows=[];const wp=m.seats.map(s=>({x:s.x-c.x+(s.x<c.x?.34:-.34),z:s.z-c.z}));
  for(let i=0;i<n;i++){const g=new THREE.Group();g.position.set(wp[i].x,.002,wp[i].z);grp.add(g);rows.push(g);}
  const hand=(i)=>{const g=rows[i];while(g.children.length){const o=g.children[0];g.remove(o);o.geometry.dispose();o.material.dispose();}const k=Math.min(sim.hands[i].length,12);
    for(let q=0;q<k;q++){const p=flatPlane(.032,.048,back,0);p.position.set(0,.001+q*.0006,(q-(k-1)/2)*.017);p.rotation.z=Math.PI/2+(q%2?.05:-.05);g.add(p);}};
  for(let i=0;i<n;i++)hand(i);
  const focus=new THREE.Vector3(c.x,.78,c.z);
  return{grp,focus,
    onEvent(ev){if(!ev)return;if(ev.card)setTop(ev.card,ev.color);for(let i=0;i<n;i++)hand(i);focus.set(c.x+.02,.78,c.z);},
    update(){},dispose(){back.dispose();disposeGroup(grp);}};}

/* ---- slagging during the games: funny Bengali trash talk ---- */
// Who says what, and when, comes from the match's own seed and steps, so every screen shows the same insult at the same moment.
// {n} is replaced by the name of the person it is aimed at.
const BANTER={
  any:{
    idle:['এত আস্তে খেলছ কেন, আমার চা ঠান্ডা হয়ে গেল!','জিতলে কিন্তু ট্রিট দিতে হবে, আগেই বলে রাখলাম!','{n}, তোমার খেলা দেখে আমার ঘুম আসছে!','বস দেখলে আমাদের দুজনকেই উড়িয়ে দেবে, তাও খেলা চাই!','চুপচাপ খেলো, নইলে সবাইকে বলে দেব তুমি অফিস টাইমে খেলছ!','{n}, তুমি কি প্র্যাকটিস করেছ, নাকি ইউটিউবে দেখে এসেছ?','আজকের দিনটা আমার, কাল না হয় তোমার!','এই খেলায় হারলে কিন্তু রেজিগনেশন দিতে হবে… মজা করলাম!'],
    reply:['হা হা! আগে জেতো, তারপর কথা বলো!','বেশি কথা কেন? খেলা দেখাও!','দেখা যাবে শেষ পর্যন্ত, বন্ধু!','চুপ! মনোযোগ নষ্ট হচ্ছে!','আমাকে ভয় দেখাচ্ছ? আমি সিইওর সামনেও কথা বলি!','আরে আস্তে! {n} তো প্রচুর কথা বলে!','মুখে মুখে জিতলে তো তুমি চ্যাম্পিয়ন!','আগে হাত চালাও, মুখ না!'],
    victim:['আরে! এটা কি ন্যায্য খেলা?','আমি প্রতিশোধ নেব, লিখে রাখো!','এই শোধ আমি তুলবই!'],
  },
  pool:{
    pot:['দেখলি? এটাকে বলে প্রফেশনাল শট!','সরি, হাত কাঁপেনি… ইচ্ছা করেই ফেললাম!','{n}, চশমাটা মুছে নাও, আরও দেখতে হবে!','এটা শট না, এটা শিল্প!','আজ আমার টেবিল, আমার নিয়ম!','{n} ভাই, একটা চা অর্ডার করে রাখো, তোমার পয়সায়!'],
    foul:['ফাউল! সাদা বলকে এত ভালোবাসলে বিয়ে করে ফেলো!','আরে ভাই, বলটা পকেটে ফেলার কথা, নিজে ঢুকে গেল!','{n}, এটা পুল, গলফ না!','ফাউল ফাউল! রেফারি কই?','সাদা বলটা তোমার সাথে কী শত্রুতা করল?'],
    miss:['ওটা কি শট ছিল, নাকি টেবিল মুছছিলে?','বলটা এত ডানে গেল, ওয়াশরুমে পৌঁছে যাবে!','{n}, কিউটা উল্টো ধরোনি তো?','মিস! আমি তো ভেবেছিলাম তুমি ইচ্ছা করে মিস করলে!','এত জোরে মারলে বল ছাদে উঠবে!'],
  },
  carrom:{
    pot:['ঢুকে গেল! পাউডার না দিলেও আমি পারি!','{n}, পাউডার কম দিয়েছ, তাই স্ট্রাইকার পিছলে গেল!','এক ফ্লিকে কয়েন পকেটে, দেখে শেখো!','রানি আমার পকেটে, তোমার কপালে ঠনঠন!','{n}, তোমার কয়েনগুলো আমার সংগ্রহে যোগ হলো!'],
    miss:['স্ট্রাইকারকে এত জোরে মেরো না, ও ব্যথা পায়!','এটা ক্যারম, ক্রিকেট না, ছক্কা মারছ কেন?','কয়েনগুলো তো পালাচ্ছে না, ধরো!','{n}, আঙুল দিয়ে মারছ নাকি পা দিয়ে?'],
  },
  chess:{
    cap:['ঘোড়াটা তো গেল, এবার কি পায়ে হেঁটে যাবে?','ধন্যবাদ, উপহারের জন্য!','{n}, এটা ফ্রি-তে দিলে কেন, অফার চলছে নাকি?','মন্ত্রী গেল! এবার রাজা ঘুমাবে না!','তোমার ঘুঁটি এখন আমার হাতে, চা খাওয়ার আগেই!'],
    check:['চেক! রাজা সাহেব, দৌড় দাও!','রাজা কোথায় যাবে, দরজায় তো তালা!','এই যে চেক, চা খেয়ে এসে চাল দাও!'],
    promo:['দেখো, সৈনিক এখন রানি! প্রমোশন পেল, তোমার মতো না!','একটা প্রমোশন দিলাম, অফিসে তো পাও না!'],
    mate:['চেকমেট! চা-নাশতা কনফার্ম!','রাজা শহীদ হলেন! সবাই মিনিট নীরবতা পালন করো!'],
    idle:['চাল দিতে এত সময় নিচ্ছ, টাইমআউট হবে তো!','ভাবছ? মাথায় তো কিছু নেই, শুধু ভাবছ!','এই চালটা কি ইন্টারনেট থেকে কপি করলে?','তোমার ঘুঁটিগুলো সব ছুটিতে নাকি?','{n}, দাবা না খেলে লুডু খেলো, তোমার জন্য সহজ!'],
  },
  ludo:{
    cap:['ফিরে যা ঘরে, এখন ছয় না পেলে বের হতে পারবি না!','কাটা পড়ল! বাসায় গিয়ে একটু ঘুমাও!','এই কাটার জন্য আমি সারা জীবন অপেক্ষা করেছি!','{n}, এত তাড়াতাড়ি এগোলে তো কাটা পড়বেই!'],
    victim:['আরে! আমার গুটিটা কাটলে কেন!','এটা কি ন্যায্য খেলা? ডাইসে জাদু করা আছে!','আমি প্রতিশোধ নেব, লিখে রাখো!','আমার গুটি কাটার ঋণ সুদে-আসলে শোধ করব!'],
    six:['ছক্কা! ডাইস আমার পকেটে!','আবার ছয়! আমি জন্মেছি লুডুর জন্য!','ছয় ছয় ছয়, তোমার পালা কবে আসবে?'],
    home:['ঘরে ঢুকে গেলাম, দরজা বন্ধ!','একটা গুটি ঘরে, বাকিগুলো ঘরে যেতে অপেক্ষা করছে!'],
    idle:['তোমার ডাইস কি ছুটিতে? এক-দুইয়ের বেশি উঠছে না!','{n}, লুডুতেও কি ভাগ্য লাগে? তোমার তো লাগে না দেখছি!','এই ছক্কা কি তুমি পকেটে নিয়ে বসে আছ?'],
  },
  uno:{
    attack:['ফ্রি কার্ড নাও! হাত ভরবে তবে মন ভরবে না!','{n}, কার্ড তোলো আর কাঁদো!','ওয়াইল্ড চার! ধন্যবাদ বলো আমাকে!','+ দুই! উপহার পাঠালাম!'],
    skip:['তোমার পালা স্কিপ, চায়ের কাপ নিয়ে বসে থাকো!','আজ তোমার কপালে স্কিপ!','{n}, একটু বিশ্রাম নাও, আমি চালাচ্ছি!'],
    rev:['উল্টে দিলাম! এবার তোমার পালা আমার হাতে!','রিভার্স! দুনিয়াটাই উল্টে গেল!'],
    uno:['UNO! আমি এক কার্ড দূরে, ভয় পেলে স্বাভাবিক!','সাবধান, আমার হাতে মাত্র একটা কার্ড, কিন্তু সেটা তোমার সর্বনাশ!','এক কার্ড! মিষ্টি কিনে রাখো, আমি জিতছি!'],
    draw:['কার্ড নেই! আমার ভাগ্যটাই এমন!','উনো ডেকটা কি আমার সাথে শত্রুতা করছে?','আরেকটা তুলতে হলো, হাতটা তো দোকান হয়ে গেল!'],
    idle:['{n}, তোমার হাতে কত কার্ড? ওগুলো কি রেশন নাকি?','কার্ড সাজাতে সাজাতে খেলাটাই ভুলে গেলে?','এই খেলায় লুকোনোর কিছু নেই, শুধু হারানোর আছে!'],
  },
};
// one of the players says something to another; whoever it is aimed at sometimes snaps back a moment later
function banter(m,idx,cat,target,replyCat,chance){
  const now=simElapsed(m);if(now-(m.lastTalk===undefined?-99:m.lastTalk)<(m.talkGap||5))return;   // nobody talks over anyone
  if(chance!==undefined&&m.talkRng()>chance)return;
  m.lastTalk=now;
  const L=(BANTER[m.game]&&BANTER[m.game][cat])||BANTER.any[cat];if(!L)return;
  const tg=target==null||target===idx?(idx+1)%m.ids.length:target,nm=i=>shortName(m.pnames[i]);
  const text=L[Math.floor(m.talkRng()*L.length)].replace('{n}',nm(tg));
  const R=(BANTER[m.game]&&BANTER[m.game][replyCat])||BANTER.any[replyCat||'reply'],again=replyCat?true:m.talkRng()<.55,back=R[Math.floor(m.talkRng()*R.length)].replace('{n}',nm(idx));
  if(!m.watching)return;
  say(m.parts[idx],text,3.4);
  if(again)m.talkQ.push({at:performance.now()+2300,idx:tg,text:back});}
function talkTick(m){const now=performance.now();for(const q of m.talkQ.slice()){if(q.at<=now){m.talkQ.splice(m.talkQ.indexOf(q),1);if(m.parts[q.idx])say(m.parts[q.idx],q.text,3);}}}
function diningTalk(m,ev){const sim=m.sim;
  if(m.game==='chess'){
    if(ev.end){if(!sim.draw)banter(m,sim.winner,'mate',sim.winner===sim.who[0]?sim.who[1]:sim.who[0]);return;}
    const spk=sim.who[ev.side],oth=sim.who[1-ev.side];
    if(ev.promo)banter(m,spk,'promo',oth);else if(ev.cap)banter(m,spk,'cap',oth,undefined,.6);else if(ev.check)banter(m,spk,'check',oth,undefined,.7);else if(m.simN%14===0)banter(m,spk,'idle',oth,undefined,.6);}
  else if(m.game==='ludo'){
    if(ev.caught&&ev.caught.length)banter(m,ev.pl,'cap',ev.caught[0].pl,'victim');
    else if(ev.moved&&ev.to===56)banter(m,ev.pl,'home',null,undefined,.6);
    else if(ev.roll===6)banter(m,ev.pl,'six',null,undefined,.2);
    else if(m.simN%25===0)banter(m,ev.pl,'idle',null,undefined,.5);}
  else{
    if(ev.card&&(ev.card.v==='d2'||ev.card.v==='w4'))banter(m,ev.pl,'attack',null);
    else if(ev.msg&&ev.msg.includes('UNO!'))banter(m,ev.pl,'uno',null,undefined,.9);
    else if(ev.card&&ev.card.v==='skip')banter(m,ev.pl,'skip',null,undefined,.7);
    else if(ev.card&&ev.card.v==='rev')banter(m,ev.pl,'rev',null,undefined,.6);
    else if(ev.drew&&!ev.card)banter(m,ev.pl,'draw',null,undefined,.35);
    else if(m.simN%9===0)banter(m,ev.pl,'idle',null,undefined,.5);}}
// pool and carrom: react to what the game itself reports (a ball potted, a foul, a missed shot, a coin scored)
function tableTalk(m){const nm=m.pnames.map(shortName);
  if(m.game==='pool'){const msg=POOL.msg||'';
    if(msg!==m.lastMsg){m.lastMsg=msg;
      if(msg.includes('ফাউল')){const i=nm.findIndex(n=>msg.includes(n+' পেল'));if(i>=0)banter(m,i,'foul',1-i);}
      else if(msg.includes('আবার খেলবে')){const i=nm.findIndex(n=>msg.startsWith(n));if(i>=0)banter(m,i,'pot',1-i);}
      else if(msg.includes('মিস')){const i=nm.findIndex(n=>msg.includes(n+' এর পালা'));if(i>=0)banter(m,i,'miss',1-i);}}}
  else{const sc=CARROM.sc,prev=m.lastSc||[0,0,0,0];
    if(sc[0]>prev[0])banter(m,0,'pot',1);else if(sc[2]>prev[2])banter(m,1,'pot',0);
    m.lastSc=sc.slice();}
  if(m.simN%900===0&&m.simN>0)banter(m,Math.floor(m.talkRng()*2),'idle',null,undefined,.7);}
/* ---- ludo and uno are played for real: you choose your own tokens and cards ---- */
// The engines hold the whole game; every choice anyone makes goes into one shared move log (m.moves, kept on the server for live games),
// and each screen replays that log, so everyone sees the same game. Anyone who isn't a real player (a simulated colleague) is played by the computer.
const TURN_SECS=20;
function assistIdx(m,exclude){const l=m.humans.map((h,i)=>h&&i!==exclude&&(i===m.meIdx||NET.players.has(m.ids[i]))?i:-1).filter(i=>i>=0);return l.length?l[0]:-1;}
async function postMove(m,a,p){
  if(!m.liveId){m.moves.push(Object.assign({p},a));return;}
  const seq=m.moves.length,r=await livePost({action:'move',id:m.liveId,seq,p,a});
  if(MT!==m)return;
  if(r.ok&&r.d&&r.d.entry){if(m.moves.length===seq)m.moves.push(r.d.entry);}
  else if(r.d&&r.d.stale)sendPresence();}   // somebody else's copy of this move got there first: the next beat brings the log up to date
function chooseToken(m,t){if(!m.waitingMine)return;m.waitingMine=false;turnUI(m,null);postMove(m,{t},m.meIdx);}
function playCard(m,i,col){if(!m.waitingMine)return;m.waitingMine=false;m.wildPick=null;postMove(m,col?{c:i,col}:{c:i},m.meIdx);}
function drawCard(m){if(!m.waitingMine)return;m.waitingMine=false;postMove(m,{draw:1},m.meIdx);}
function turnUI(m,w){const box=byId('turnui'),me=m.meIdx,mine=!!w&&w.player===me;
  if(m.game==='uno'){renderHand(m,w,mine);return;}
  box.textContent='';m.waitingMine=mine;
  if(m.viz&&m.viz.setSelectable)m.viz.setSelectable(me,mine?w.tokens:[]);
  if(!mine){box.hidden=true;return;}
  box.hidden=false;box.className='turnui';
  const h=document.createElement('div');h.className='tu-h';h.innerHTML='🎲 <b>'+bnd(w.roll)+'</b> উঠেছে, কোন গুটি চালবেন? <span id="turnT"></span>';box.appendChild(h);
  const row=document.createElement('div');row.className='tu-row';const seen=new Set();
  for(const t of w.tokens){const p=m.sim.tok[me][t];if(seen.has(p))continue;seen.add(p);
    const b=document.createElement('button');b.type='button';b.className='tu-b';
    b.textContent=p<0?'ঘর থেকে বের করুন':(p+w.roll>=56?'ঘরে পৌঁছান 🏠':'গুটি: '+bnd(p+1)+' ধাপে → '+bnd(p+1+w.roll));
    b.addEventListener('click',()=>chooseToken(m,t));row.appendChild(b);}
  box.appendChild(row);}
function renderHand(m,w,mine){const box=byId('turnui'),sim=m.sim,hand=sim.hands[m.meIdx];m.waitingMine=mine;
  box.textContent='';box.hidden=false;box.className='turnui uno';
  const h=document.createElement('div');h.className='tu-h';h.innerHTML=(mine?'🃏 <b>আপনার পালা!</b> একটা কার্ড বেছে নিন':'🃏 আপনার কার্ড ('+bnd(hand.length)+'টা)')+' <span id="turnT"></span>';box.appendChild(h);
  const row=document.createElement('div');row.className='tu-hand';
  hand.forEach((c,i)=>{const b=document.createElement('button');b.type='button';b.className='ucard'+(c.c==='W'?' wild':'');b.style.background=UCOLS[c.c];
    b.textContent=USYM[c.v]||c.v;const ok=mine&&w.playable.includes(i);b.disabled=!ok;
    b.addEventListener('click',()=>{if(c.c==='W'){m.wildPick=i;renderHand(m,w,mine);}else playCard(m,i);});row.appendChild(b);});
  box.appendChild(row);
  if(mine&&m.wildPick!=null){const ch=document.createElement('div');ch.className='tu-row';const l=document.createElement('span');l.textContent='কোন রং? ';ch.appendChild(l);
    for(const col of['R','Y','G','B']){const b=document.createElement('button');b.type='button';b.className='ucol';b.style.background=UCOLS[col];b.textContent=UNO_NAMES[col];b.addEventListener('click',()=>playCard(m,m.wildPick,col));ch.appendChild(b);}box.appendChild(ch);}
  if(mine&&!w.playable.length){const d=document.createElement('button');d.type='button';d.className='tu-b';d.textContent='খেলার মতো কার্ড নেই, একটা তুলুন';d.addEventListener('click',()=>drawCard(m));box.appendChild(d);}}
function turnStep(m,dt){const sim=m.sim,now=performance.now();m.viz.update(dt);
  if(!sim.done&&sim.steps>(m.game==='ludo'?3500:800))sim.forceEnd();   // failsafe so a game can never run forever
  if(!sim.done&&now>=m.nextAt){
    const ev=sim.step(m.moves);
    if(ev){m.simN++;m.waitSince=null;m.autoFor=-1;m.wildPick=null;
      m.nextAt=now+(m.game==='ludo'?(ev.phase==='roll'?(ev.pass?950:700):550):900);
      m.active=ev.pl;m.reachT=.5;m.viz.onEvent(ev);m.msg=shortName(m.pnames[ev.pl])+' · '+ev.msg;m.watching=true;diningTalk(m,ev);sfx.play(m.game==='ludo'&&ev.phase==='roll'?'click':'pop',.25);
      turnUI(m,null);}
    else if(sim.waiting){const w=sim.waiting;
      if(m.waitSince==null){m.waitSince=now;m.wildPick=null;turnUI(m,w);}
      const mine=w.player===m.meIdx,idle=(now-m.waitSince)/1000;
      m.msg=mine?'আপনার পালা!':shortName(m.pnames[w.player])+' এর পালা…';
      const te=byId('turnT');if(te)te.textContent='⏱ '+bnd(Math.max(0,Math.ceil(TURN_SECS-idle)));
      // a player who takes too long is played by the computer; if they left the game, the first player still here does it for them
      if(m.autoFor!==m.moves.length&&((mine&&idle>TURN_SECS)||(!mine&&assistIdx(m,w.player)===m.meIdx&&idle>TURN_SECS+6))){m.autoFor=m.moves.length;postMove(m,{auto:1},w.player);}}}
  m.reachT=Math.max(0,m.reachT-dt);const t=performance.now()/1000;
  m.parts.forEach((P,i)=>{seatedPose(P,t,i===m.active&&m.reachT>0?Math.min(1,m.reachT/.25):0,m.viz.focus);});}
function beginDining(m){const n=m.ids.length,t=DTABLES[m.table],seats=m.seats,parts=m.parts,c=n===2?{x:t.x,z:t.z-.3}:{x:t.x,z:t.z};
  parts.forEach((P,i)=>{P.path=[];place(P,seats[i].x,seats[i].z,seats[i].yaw);P.speed=1.05;});
  const rng=mulberry32(m.seed);
  if(m.game==='chess'){const w=rng()<.5?0:1;m.sim=createChess(w,1-w,[.55,.55],rng);m.viz=makeChessViz(m,c);m.stepDt=.25;m.limit=400;}
  else{const humans=m.ids.map((id,i)=>i===m.meIdx||(m.live&&!(m.simIds||[]).includes(id)));   // real players choose their own moves
    if(m.game==='ludo'){m.sim=createLudo(n,rng,humans);m.viz=makeLudoViz(m,c);}else{m.sim=createUno(n,rng,humans);m.viz=makeUnoViz(m,c);}
    Object.assign(m,{turnGame:true,humans,stepDt:.6,limit:1e5,moves:m.moves||[],nextAt:0,waitSince:null,wallStart:performance.now(),autoFor:-1,waitingMine:false});}
  m.active=0;m.reachT=0;m.msg='খেলা শুরু!';const chessy=m.game==='chess';
  m.camPos=new THREE.Vector3(t.x+.1,chessy?2.15:2.75,t.z+(chessy?.8:1.3));m.camTo=new THREE.Vector3(c.x,.75,c.z);}
function endDining(m){if(m.viz)m.viz.dispose();m.viz=null;}
// the match clock: every screen derives the same step number from the shared start time, so everyone sees the same game
function simElapsed(m){if(m.turnGame)return(performance.now()-m.wallStart)/1000;return m.fixed?m.simN/60:m.simN*(m.stepDt||0);}
function diningStep(m,dt){if(m.turnGame)return turnStep(m,dt);const sim=m.sim,target=Math.min(Math.floor(m.limit/m.stepDt),Math.floor((nowMs(m)-m.startAt)/(m.stepDt*1000)));
  while(m.simN<target&&!sim.done){m.simN++;const ev=sim.step();if(!ev)break;
    m.active=m.game==='chess'?(ev.side!=null?sim.who[ev.side]:m.active):ev.pl;m.reachT=m.stepDt*.9;m.viz.onEvent(ev);
    m.msg=m.game==='chess'?sim.msg:shortName(m.pnames[ev.pl])+' · '+ev.msg;
    m.watching=target-m.simN<3;diningTalk(m,ev);
    if(m.simN>target-3)sfx.play(m.game==='ludo'?'click':'pop',.2);}
  m.viz.update(dt);
  m.reachT=Math.max(0,m.reachT-dt);const t=performance.now()/1000;
  m.parts.forEach((P,i)=>{const act=i===m.active&&m.reachT>0;seatedPose(P,t,act?Math.min(1,m.reachT/(m.stepDt*.45)):0,m.viz.focus);});}
const TABLE_SPEED=2.5;   // pool and carrom play at 2.5x so a full game takes a couple of minutes to watch; every screen uses the same factor
const POOL_SECS=30;
// the pool match with real shots: the simulation only runs while it has something to do, and waits for the shooter's move otherwise
function poolStep(m,dt){const S=POOL;
  const fast=S.state==='plan'||S.state==='walk'||S.state==='turn'||S.state==='over';
  m.acc=Math.min(m.acc+dt*60*(fast?2:1),30);m.blocked=false;let k=0;
  while(m.acc>=1&&!m.blocked&&k++<60){m.acc--;m.simN++;poolUpdate(m.simN/60,1/60);tableTalk(m);}
  if(m.blocked)m.acc=0;m.watching=true;
  const waiting=S.state==='await',mine=waiting&&S.shooter===m.meIdx,now=performance.now();
  if(!waiting){if(m.waitSince!=null){m.waitSince=null;m.pui=null;poolAimOff(m);byId('poolui').hidden=true;}
    if(m.camDef){m.camPos.copy(m.camDef[0]);m.camTo.copy(m.camDef[1]);}return;}
  if(m.waitSince==null){m.waitSince=now;m.autoFor=-1;m.pui=mine?poolAimInit(m):null;}
  const idle=(now-m.waitSince)/1000,left=Math.max(0,Math.ceil(POOL_SECS-idle));
  if(m.autoFor!==m.moves.length&&((mine&&idle>POOL_SECS)||(!mine&&assistIdx(m,S.shooter)===m.meIdx&&idle>POOL_SECS+6))){m.autoFor=m.moves.length;postMove(m,{auto:1},S.shooter);}
  if(mine&&m.pui)poolAimTick(m,dt,left);else{poolAimOff(m);byId('poolui').hidden=true;}}
function tableStep(m,dt){if(m.turnPool)return poolStep(m,dt);const target=Math.floor((nowMs(m)-m.startAt)/1000*60*TABLE_SPEED);let k=0;
  while(m.simN<target&&m.simN<m.limit*60&&k++<400){m.simN++;(m.game==='pool'?poolUpdate:carromUpdate)(m.simN/60,1/60);m.watching=target-m.simN<20;tableTalk(m);}}

function startPlay(){const m=MT,me=PROFILE.empId;
  m.pnames=m.ids.map(id=>id===me?window.CB_PLAYER.name:m.pinfo[id].name);
  m.parts=m.ids.map((id,i)=>i===m.meIdx?player:m.opps.find(o=>o.emp.empId===id).P);
  m.fixed=m.game==='pool'||m.game==='carrom';m.simN=0;m.talkRng=mulberry32((m.seed+99)>>>0);m.talkQ=[];m.watching=false;m.lastTalk=undefined;m.rng=mulberry32((m.seed^0x5bd1e995)>>>0);
  if(!m.live)m.startAt=nowMs(m);
  if(m.game==='pool')beginPool(m);else if(m.game==='carrom')beginCarrom(m);else beginDining(m);
  m.state='play';m.t=0;m.look=camera.position.clone().add(camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(3));
  m.tags=m.parts.map((P,i)=>mkTip(P,'mtag',i===m.meIdx?'আপনি':shortName(m.pnames[i]),1e9,.28));
  byId('mhud').hidden=false;byId('mhT').textContent=GAMEDEF[m.game].em+' '+GAMEDEF[m.game].bn+' · '+m.pnames.map(shortName).join(' বনাম ')+(m.live?' · 🟢 লাইভ':'');}
// ids of everyone who played, best first (null while the match is still going)
function matchOutcome(m){
  const ids=m.ids,over=m.simN>=m.limit*(m.fixed?60:1/m.stepDt);
  if(m.game==='pool'){const S=POOL;let w=null;if(S.winner!=null&&m.simN>360)w=S.winner;
    else if(over){const g0=S.groups[0],g1=S.groups[1];w=m.rng()<.5?0:1;if(g0&&g1){const l0=ballsOn(S.T,b=>b.kind===g0).length,l1=ballsOn(S.T,b=>b.kind===g1).length;if(l0!==l1)w=l0<l1?0:1;}}
    return w===null?null:{order:[ids[w],ids[1-w]],draw:false};}
  if(m.game==='carrom'){if(!over&&!CARROM.over)return null;const S=CARROM,w=S.sc[0]!==S.sc[2]?(S.sc[0]>S.sc[2]?0:1):(m.rng()<.5?0:1);return{order:[ids[w],ids[1-w]],draw:false};}
  const sim=m.sim;if(!sim.done&&!over)return null;if(!sim.done&&m.game==='chess')sim.forceEnd();
  return{order:sim.order().map(i=>ids[i]),draw:!!sim.draw};}
/* ---- aiming a pool shot ---- */
let AIM=null;   // the line and the cue-ball ghost, built once
function aimObjs(){if(AIM)return AIM;const r=.0286;
  const lg=new THREE.BufferGeometry();lg.setAttribute('position',new THREE.BufferAttribute(new Float32Array(12),3));
  const line=new THREE.Line(lg,new THREE.LineBasicMaterial({color:0xffffff,transparent:true,opacity:.9,depthTest:false}));line.frustumCulled=false;line.renderOrder=20;
  const ring=new THREE.Mesh(new THREE.RingGeometry(r*.86,r,28),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.9,side:THREE.DoubleSide,depthTest:false}));ring.rotation.x=-Math.PI/2;ring.renderOrder=20;
  const ghost=new THREE.Mesh(new THREE.SphereGeometry(r,20,14),new THREE.MeshStandardMaterial({color:0xfaf7ee,roughness:.25}));
  const g=new THREE.Group();g.add(line,ring,ghost);g.visible=false;scene.add(g);return AIM={g,line,ring,ghost};}
function poolAimOff(m){if(AIM)AIM.g.visible=false;const S=POOL;if(S&&S.cue&&S.cue.on)S.cue.mesh.visible=true;if(m)m.pui=null;}
function aimTrace(S,x,z,ang){const T=S.T,r=S.cue.r,dx=Math.cos(ang),dz=Math.sin(ang);let best=1e9,hit=null;
  for(const b of T.balls){if(!b.on||b.cue)continue;const fx=b.x-x,fz=b.z-z,pr=fx*dx+fz*dz;if(pr<=0)continue;const d2=fx*fx+fz*fz-pr*pr,R=2*r;if(d2>=R*R)continue;const t=pr-Math.sqrt(R*R-d2);if(t<best){best=t;hit=b;}}
  const lx=T.hx-r,lz=T.hz-r;let tw=1e9;
  if(dx>1e-6)tw=Math.min(tw,(lx-x)/dx);else if(dx<-1e-6)tw=Math.min(tw,(-lx-x)/dx);if(dz>1e-6)tw=Math.min(tw,(lz-z)/dz);else if(dz<-1e-6)tw=Math.min(tw,(-lz-z)/dz);
  if(best>tw){best=tw;hit=null;}return{t:best,hit,px:x+dx*best,pz:z+dz*best};}
function poolAimInit(m){const S=POOL,T=S.T,free=S.ballInHand||S.breakNext,x=S.breakNext?-T.hx/2:S.cue.x,z=S.breakNext?0:S.cue.z;
  let ang=0;if(!S.breakNext){const tg=legalTargets(S);if(tg.length){const b=tg.reduce((a,c)=>Math.hypot(c.x-x,c.z-z)<Math.hypot(a.x-x,a.z-z)?c:a);ang=Math.atan2(b.z-z,b.x-x);}}
  const u={ang,pw:.55,x,z,free,phase:S.ballInHand&&!S.breakNext?'place':'aim',sent:false,rot:0,down:false};
  if(u.phase==='place'){const q=fitCue(S,x,z);u.x=q[0];u.z=q[1];}
  byId('puPow').value=Math.round(u.pw*100);return u;}
function poolAimTick(m,dt,left){const S=POOL,T=S.T,u=m.pui,ui=byId('poolui'),A=aimObjs();
  if(u.sent){ui.hidden=true;if(!u.free){A.g.visible=false;S.cue.mesh.visible=true;}return;}
  if(u.rot)u.ang+=u.rot*(u.fine?.22:.8)*dt;
  const y=T.y+S.cue.r+.003,place=u.phase==='place';
  S.cue.mesh.visible=false;A.g.visible=true;A.ghost.position.set(T.cx+u.x,T.y+S.cue.r,T.cz+u.z);
  const tr=aimTrace(S,u.x,u.z,u.ang),pos=A.line.geometry.attributes.position.array,ox=T.cx+u.x,oz=T.cz+u.z,px=T.cx+tr.px,pz=T.cz+tr.pz;
  pos[0]=ox;pos[1]=y;pos[2]=oz;pos[3]=px;pos[4]=y;pos[5]=pz;
  if(tr.hit){const b=tr.hit;let nx=b.x-tr.px,nz=b.z-tr.pz;const l=Math.hypot(nx,nz)||1;pos[6]=px;pos[7]=y;pos[8]=pz;pos[9]=px+nx/l*.3;pos[10]=y;pos[11]=pz+nz/l*.3;}
  else{pos[6]=pos[9]=px;pos[7]=pos[10]=y;pos[8]=pos[11]=pz;}
  A.line.geometry.attributes.position.needsUpdate=true;A.line.visible=!place;A.ring.visible=!place;A.ring.position.set(px,y,pz);
  // a fixed view from above the table, so aiming by touch never fights the camera
  m.camPos.set(T.cx,T.y+1.5,T.cz+1.55);m.camTo.set(T.cx,T.y,T.cz-.05);
  ui.hidden=false;byId('puMsg').textContent=place?'⚪ সাদা বলটা যেখানে খুশি বসান (টেবিলে ট্যাপ/ক্লিক করুন)':S.breakNext?'💥 ব্রেক করুন! টেবিলে ট্যাপ করে দিক ঠিক করুন, জোর দিয়ে মারুন':'🎯 আপনার পালা! টেবিলে ট্যাপ করে দিক ঠিক করুন';
  byId('puT').textContent='⏱ '+bnd(left);byId('puMove').hidden=!u.free;byId('puMove').textContent=place?'🎯 লক্ষ্য ঠিক করি':'⚪ সাদা বল সরাই';
  byId('puShoot').textContent=place?'✔ এখানেই বসাই':'🎱 মারুন!';}
function poolAimPoint(e){const m=MT;if(!m||!m.pui||m.pui.sent)return null;const S=POOL,T=S.T,r=renderer.domElement.getBoundingClientRect(),rc=new THREE.Raycaster();
  rc.setFromCamera(new THREE.Vector2(((e.clientX-r.left)/r.width)*2-1,-((e.clientY-r.top)/r.height)*2+1),camera);
  const o=rc.ray.origin,d=rc.ray.direction,yy=T.y+S.cue.r;if(Math.abs(d.y)<1e-5)return null;const t=(yy-o.y)/d.y;if(t<=0)return null;return[o.x+d.x*t-T.cx,o.z+d.z*t-T.cz];}
function poolAimTo(e){const m=MT,u=m&&m.pui,q=poolAimPoint(e);if(!u||!q)return;
  if(u.phase==='place'){const f=fitCue(POOL,q[0],q[1]);u.x=f[0];u.z=f[1];}
  else if(Math.hypot(q[0]-u.x,q[1]-u.z)>.05)u.ang=Math.atan2(q[1]-u.z,q[0]-u.x);}
async function poolShoot(){const m=MT,u=m&&m.pui;if(!u||u.sent||!poolMatch())return;
  if(u.phase==='place'){u.phase='aim';return;}
  u.sent=true;const a={ang:u.ang,pw:u.pw};if(u.free){a.cx=u.x;a.cz=u.z;}
  const n=m.moves.length;sfx.play('click');await postMove(m,a,m.meIdx);
  if(MT===m&&m.pui===u&&m.moves.length===n)u.sent=false;}   // it didn't get through: let them try again
function wirePoolUI(){
  const el=byId('poolui'),cv=renderer.domElement;
  for(const t of['keydown','keyup'])el.addEventListener(t,e=>e.stopPropagation());
  cv.addEventListener('pointerdown',e=>{const u=MT&&MT.pui;if(!u||MT.game!=='pool')return;u.down=true;poolAimTo(e);});
  cv.addEventListener('pointermove',e=>{const u=MT&&MT.pui;if(u&&u.down)poolAimTo(e);});
  addEventListener('pointerup',()=>{const u=MT&&MT.pui;if(u)u.down=false;});
  const hold=(id,v)=>{const b=byId(id);b.addEventListener('pointerdown',e=>{const u=MT&&MT.pui;if(u){u.rot=v;u.fine=e.shiftKey;}});for(const t of['pointerup','pointerleave','pointercancel'])b.addEventListener(t,()=>{const u=MT&&MT.pui;if(u)u.rot=0;});};
  hold('puL',-1);hold('puR',1);
  byId('puPow').addEventListener('input',e=>{const u=MT&&MT.pui;if(u)u.pw=e.target.value/100;});
  byId('puMove').addEventListener('click',()=>{const u=MT&&MT.pui;if(u)u.phase=u.phase==='place'?'aim':'place';});
  byId('puShoot').addEventListener('click',poolShoot);
  addEventListener('keydown',e=>{const u=MT&&MT.pui;if(!u||u.sent||byId('poolui').hidden)return;let used=true;
    if(e.code==='ArrowLeft'||e.code==='KeyA'){u.rot=-1;u.fine=e.shiftKey;}else if(e.code==='ArrowRight'||e.code==='KeyD'){u.rot=1;u.fine=e.shiftKey;}
    else if(e.code==='ArrowUp'||e.code==='KeyW'){u.pw=Math.min(1,u.pw+.05);byId('puPow').value=Math.round(u.pw*100);}
    else if(e.code==='ArrowDown'||e.code==='KeyS'){u.pw=Math.max(.05,u.pw-.05);byId('puPow').value=Math.round(u.pw*100);}
    else if(e.code==='Space'||e.code==='Enter'){poolShoot();}else used=false;
    if(used){e.preventDefault();e.stopPropagation();}},true);
  addEventListener('keyup',e=>{const u=MT&&MT.pui;if(!u)return;if(['ArrowLeft','ArrowRight','KeyA','KeyD'].includes(e.code))u.rot=0;},true);}
function updMHud(m){const el=Math.floor(simElapsed(m)),mm=Math.floor(el/60),ss=String(el%60).padStart(2,'0');
  byId('mhM').textContent=m.game==='pool'?(POOL.msg||'')+(POOL.state==='await'&&POOL.shooter!==m.meIdx&&m.humans&&m.humans[POOL.shooter]?' · '+shortName(m.pnames[POOL.shooter])+' লক্ষ্য করছে…':''):m.game==='carrom'?('স্কোর: '+shortName(m.pnames[0])+' '+bnN(CARROM.sc[0])+' · '+shortName(m.pnames[1])+' '+bnN(CARROM.sc[2])):(m.msg||'');
  byId('mhC').textContent='সময় '+bnd(mm)+':'+bnd(ss);}
function matchCam(dt){const m=MT,k=Math.min(1,dt*2.2);camera.position.lerp(m.camPos,k);m.look.lerp(m.camTo,k);camera.lookAt(m.look);}
// the player's own steps while the game walks them somewhere (called from updateWalk)
function autoStep(P,dt){return autoWalk(P,dt,MT);}
function autoWalk(P,dt,m){if(!m||!m.auto)return[0,0];const tg=m.auto[0];if(!tg){m.auto=null;m.arrived=true;return[0,0];}
  const dx=tg[0]-P.x,dz=tg[1]-P.z,d=Math.hypot(dx,dz);if(d<.12){m.auto.shift();m.lastD=undefined;if(!m.auto.length){m.auto=null;m.arrived=true;}return[0,0];}
  if(m.lastD===undefined||d<m.lastD-.01){m.lastD=d;m.stuck=0;}else m.stuck+=dt;
  if(m.stuck>.7){P.x=tg[0];P.z=tg[1];m.auto.shift();m.lastD=undefined;m.stuck=0;if(!m.auto.length){m.auto=null;m.arrived=true;}return[0,0];}   // snagged on something: hop to the waypoint
  let df=Math.atan2(-dx,-dz)-P.cam;df=Math.atan2(Math.sin(df),Math.cos(df));P.cam+=df*Math.min(1,dt*5);const s=Math.min((m.speed||3)*dt,d);return[dx/d*s,dz/d*s];}
function matchUpdate(dt){const m=MT;if(!m)return;m.t+=dt;const U=player,O=m.opp&&m.opp.P;
  const faceEach=()=>{turnTo(O,Math.atan2(U.x-O.x,U.z-O.z),dt);turnTo(U,Math.atan2(O.x-U.x,O.z-U.z),dt);};
  switch(m.state){
    case'toLive':{const p=NET.players.get(m.target);
      if(!p||!p.inOffice||m.t>60){sendLive(m);break;}
      const d=Math.hypot(U.x-p.x,U.z-p.z);
      if(d<1.8){m.auto=null;sendLive(m);break;}
      m.routeT-=dt;if(m.routeT<=0&&(!m.planAt||m.arrived||Math.hypot(p.x-m.planAt[0],p.z-m.planAt[1])>1.2)){m.routeT=1;m.arrived=false;m.planAt=[p.x,p.z];m.auto=route(U.x,U.z,p.x,p.z);}
      break;}
    case'waitLive':{const r=NET.remote.get(m.target);if(r)turnTo(U,Math.atan2(r.x-U.x,r.z-U.z),dt);
      const L=m.liveInfo;if(L&&!L.players.some(p=>p.state==='invited')||m.t>LIVE_WAIT)goLive(m);break;}
    case'toDesk':if(m.arrived){m.arrived=false;m.state='ask';m.t=0;showChallenge();}else if(m.t>40){place(U,m.stand[0],m.stand[1],m.face);m.auto=null;m.arrived=true;}break;
    case'ask':turnTo(U,m.face,dt);turnTo(O,Math.atan2(U.x-O.x,U.z-O.z),dt);break;
    case'say1':faceEach();if(m.t>2.3){const L=OPPL[Math.floor(Math.random()*OPPL.length)];say(O,L,2.6);
        m.opps.slice(1).forEach((o,i)=>setTimeout(()=>{if(MT===m)say(o.P,OTHERL[(i+Math.floor(Math.random()*4))%4],2);},400+i*500));m.state='say2';m.t=0;}break;
    case'say2':faceEach();if(m.t>2.8){
        const me=PROFILE.empId,ids=[me,...m.emps.map(e=>e.empId)];
        enterGo(m,{id:null,order:ids,seed:Math.floor(Math.random()*2147483646)+1,startAtMs:0,table:m.table,simIds:ids.slice(1),parts:[{empId:me,name:window.CB_PLAYER.name,nickname:'',gender:PROFILE.gender,model:PROFILE.model},...m.emps]});}break;
    case'walk':{for(const o of m.opps)if(!o.done){o.done=moveAlong(o.P,dt);if(o.done)rest(o.P);}
      const all=m.opps.every(o=>o.done),due=nowMs(m)>=m.startAt;
      if(m.t>45||(m.live&&nowMs(m)>m.startAt+3000)){m.auto=null;m.arrived=true;for(const o of m.opps)o.done=true;}
      if(m.arrived&&all&&due)startPlay();break;}
    case'play':{matchCam(dt);m.hudT=(m.hudT||0)-dt;
      if(m.fixed)tableStep(m,dt);else diningStep(m,dt);
      talkTick(m);
      if(m.hudT<=0){m.hudT=.3;updMHud(m);}
      const r=simElapsed(m)>6?matchOutcome(m):null;
      if(r){m.state='result';m.t=0;m.hudT=0;updMHud(m);showResult(r);}break;}
    case'result':matchCam(dt);if(m.viz)m.viz.update(dt);break;}
  if(MT)updTips(dt);}
async function showResult(r){const m=MT,me=PROFILE.empId,n=r.order.length,place=r.order.indexOf(me)+1,gd=GAMEDEF[m.game];byId('mhud').hidden=true;byId('turnui').hidden=true;byId('poolui').hidden=true;poolAimOff(m);m.waitingMine=false;
  const medal=['🥇','🥈','🥉','🏅'],nm=id=>id===me?'আপনি':shortName((m.pinfo[id]||{}).name);
  const win=place===1&&!r.draw;
  byId('rBig').textContent=r.draw?'🤝':win?'🏆':n>2&&place<n?medal[place-1]:'😭';
  byId('rTitle').textContent=r.draw?'ম্যাচ ড্র!':win?'আপনি জিতেছেন!':n>2?'আপনি '+bnd(place)+' নম্বরে শেষ করেছেন':'আপনি হেরে গেছেন!';
  byId('rText').textContent=(n>2?'র‍্যাঙ্কিং: '+r.order.map((id,i)=>medal[i]+' '+nm(id)).join(' · ')+'। ':'')+(r.draw?'কেউ হারেনি, কেউ জেতেওনি। চা দুজনেই খাবেন।':win?'অফিসে আপনার নাম ছড়িয়ে পড়ল। চা-নাশতার বিল এবার অন্যদের।':place===n?'চা-নাশতার বিল আপনার, আর কেউ জিজ্ঞেস করলে বলবেন টেবিল ঢালু ছিল।':'মন্দ না! পরের বার ঠিকই জিতবেন।');
  const xp=byId('rXp');xp.className='rxp';xp.textContent=gd.bn+' রেটিং হিসাব হচ্ছে…';byId('rAgain').disabled=true;byId('rOk').disabled=true;byId('mres').hidden=false;sfx.play(win?'ok':r.draw?'pop':'fail');
  try{const res=await fetch('/api/match',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({game:m.game,order:r.order,draw:r.draw})}),d=await res.json().catch(()=>null);
    if(!res.ok||!d||!d.ok)throw new Error(d&&d.error||'');
    if(PROFILE){PROFILE.xp=d.xp;PROFILE.ratings=d.ratings;}
    const dl=d.rating.delta;xp.className='rxp '+(dl>0?'up':dl<0?'down':'');
    xp.textContent=gd.em+' '+gd.bn+' রেটিং '+bnd(d.rating.before)+' → '+bnd(d.rating.after)+' ('+(dl>=0?'+':'−')+bnd(Math.abs(dl))+') · XP '+(d.xpDelta>=0?'+':'−')+bnd(Math.abs(d.xpDelta))+' · মোট '+bnd(d.xp);}
  catch(e){xp.textContent=(e&&e.message)||'রেটিং সেভ হয়নি। নেটওয়ার্ক দেখুন।';}
  byId('rAgain').disabled=false;byId('rOk').disabled=false;}
function endMatch(again){const m=MT;if(!m)return;if(PROFILE)setPlayerModel(PROFILE.gender,PROFILE.model,PROFILE.look);byId('mres').hidden=true;byId('mhud').hidden=true;byId('turnui').hidden=true;byId('poolui').hidden=true;for(const t of m.tips.slice())rmTip(t);
  const dine=GAMEDEF[m.game].dine;
  if(m.game==='pool')endPool(m);else if(m.game==='carrom')endCarrom(m);else endDining(m);
  let tx,tz,f;
  if(dine){const t=DTABLES[m.table];tx=t.x;tz=t.z;f=nearFree(t.x-1.5,t.z);}
  else{const sp=spotsFor(m);tx=m.game==='pool'?POOL.T.cx:CARROM.T.cx;tz=m.game==='pool'?POOL.T.cz:CARROM.T.cz;f=nearFree(sp[m.meIdx][0],sp[m.meIdx][1]);}
  place(player,f[0],f[1],0);player.cam=Math.atan2(-(tx-f[0]),-(tz-f[1]));player.wph=0;
  for(const o of m.opps){const P=o.P;P.speed=2.6;rest(P);
    if(o.seat){P.path=route(P.x,P.z,o.seat[0],o.seat[1]);RET.push({P,seat:o.seat});}   // the simulated colleagues go back to their desks
    else scene.remove(P.root);}                                                          // live colleagues are simply you looking at them again
  MT=null;lastZone='~';
  if(again)setTimeout(()=>openPicker(m.game,dine),300);}
function retUpdate(dt){for(const r of RET.slice()){if(moveAlong(r.P,dt)){scene.remove(r.P.root);r.seat.taken=false;RET.splice(RET.indexOf(r),1);}}}
function wireMatchUI(){
  byId('mpickClose').addEventListener('click',closePick);byId('mpickQ').addEventListener('input',()=>{if(EMPS)renderPick();});
  byId('mpick').addEventListener('click',e=>{if(e.target===byId('mpick'))closePick();});
  byId('mpickGo').addEventListener('click',()=>{const es=pickSel.map(id=>EMPS.find(e=>e.empId===id)).filter(Boolean);if(!es.length)return;closePick();beginInvite(es,pickGame,pickTable);});
  for(const id of['mpick','mres','minvite']){const el=byId(id);el.addEventListener('keydown',e=>e.stopPropagation());el.addEventListener('keyup',e=>e.stopPropagation());}
  addEventListener('keydown',e=>{if(e.key==='Escape'&&!byId('mpick').hidden){e.stopPropagation();closePick();}},true);
  byId('invYes').addEventListener('click',()=>answerInvite(true));byId('invNo').addEventListener('click',()=>answerInvite(false));
  renderer.domElement.addEventListener('pointerdown',e=>{const m=MT;if(!m||m.state!=='play'||m.game!=='ludo'||!m.waitingMine||!m.viz)return;const t=m.viz.pick(e.clientX,e.clientY);if(t>=0)chooseToken(m,t);});
  wirePoolUI();
  byId('rOk').addEventListener('click',()=>endMatch(false));byId('rAgain').addEventListener('click',()=>endMatch(true));}

/* ================= the bosses' rounds: CEO, HR and the manager walk around the office ================= */
// Which boss walks where, and when, comes from the shared clock, so everybody sees the same boss in the same place.
// If one corners the game room and asks "কাজ কাম নাই?", everyone in there bolts, and you have to run to your desk before you are caught.
const BOSS_PERIOD=210,BOSS_SPEED=1.3,BOSS_RUN=3.5,BOSS_IDS=['ceo','hr','mgr'];
const BOSSES={
  ceo:{bn:'সিইও স্যার',em:'🎩',cut:10,origin:[-13.8,3.9],mk:()=>mkMan({style:'shirt',top:'#f4f4f2',bot:'#1e1f24',tie:'#7e2c3a',glasses:true,beard:false,mous:true,hs:'short',sleeve:'long',h:.93})},
  hr:{bn:'এইচআর আপা',em:'📋',cut:7,origin:[16.4,4],mk:()=>mkWoman({top:'#2e5a8c',glasses:true,hs:'bun',sandal:false})},
  mgr:{bn:'ম্যানেজার ভাই',em:'🧑‍💼',cut:5,origin:[1,-12.6],mk:()=>mkMan({style:'shirt',top:'#cfe0f2',bot:'#2a2f3a',tie:'#1f3b6e',glasses:false,beard:true,sleeve:'long'})}};
const BS={plan:null,people:{},tags:{},cue:null,mark:null,chase:{on:false}};
const CHASE=BS.chase;
const LETTERS={
  ceo:{title:'শো-কজ নোটিশ',body:'প্রতি: {name}\nবিষয়: কর্মঘণ্টায় গেমিং রুমে আড্ডা প্রসঙ্গে কারণ দর্শানো\n\nআপনাকে অফিস চলাকালীন গেমিং রুমে পাওয়া গেছে, অথচ আপনার ল্যাপটপে দুটো ট্যাব খোলা, কোনোটাতেই কাজ নেই। এই আচরণ কোম্পানির "আমরা একটা পরিবার" নীতির পরিপন্থী নয়, তবে সিইওর চা-ঠান্ডা-না-হওয়া নীতির পরিপন্থী।\n\nঅতএব, আপনি কেন চাকরিতে থাকবেন, তা ৩ কর্মদিবসের মধ্যে লিখিতভাবে জানান।',sign:'ইতি, সিইও (স্বাক্ষর: হিজিবিজি)'},
  hr:{title:'সতর্কবার্তা',body:'প্রিয় {name},\n\nআমরা একটা পরিবার, আর পরিবারে কাজ ফাঁকি দেওয়া চলে না (ঈদের ছুটি ছাড়া)। আজ আপনাকে গেমিং রুমে পাওয়া গেছে। আপনি নিশ্চয়ই বলবেন, "ম্যাডাম, ব্রেন রিফ্রেশ করছিলাম।" আমরা বুঝি, কিন্তু রেকর্ডে তো কিছু লিখতে হবে।\n\nএই চিঠি আপনার ফাইলে সংরক্ষিত থাকবে, প্রোমোশনের সময় আবার দেখা হবে। 🙂',sign:'শুভকামনায়, এইচআর বিভাগ'},
  mgr:{title:'ম্যানেজারের ব্যক্তিগত বার্তা',body:'{name},\n\nআমি কিছু বলছি না। শুধু বলছি, ডেডলাইন কাল ছিল, আর তুমি ক্যারম খেলছ। আমি রাগ করিনি, আমি শুধু হতাশ। এবং একটু রাগও।\n\nএবার থেকে ক্যারম খেলতে চাইলে আমাকে আগে বলবে, আমিও যাব।',sign:'—তোমার ম্যানেজার'}};

function bossPerson(id){let P=BS.people[id];if(P)return P;
  P=BOSSES[id].mk();P.root.visible=false;P.speed=BOSS_SPEED;BS.people[id]=P;
  const el=document.createElement('div');el.className='bub on rtag boss';bubbleLayer().appendChild(el);BS.tags[id]=el;return P;}
function bossCue(){if(BS.cue)return BS.cue;const g=new THREE.Group();
  const sh=new THREE.Mesh(cylG(.0065,.012,1.0,10),mat('#d2ae72',.5));sh.rotation.x=Math.PI/2;sh.position.z=-.5;g.add(sh);
  const bt=new THREE.Mesh(cylG(.012,.015,.45,10),mat('#2a1a10',.4));bt.rotation.x=Math.PI/2;bt.position.z=-1.225;g.add(bt);
  g.visible=false;scene.add(g);return BS.cue=g;}
// the ring on the floor that shows where your desk is
function bossMark(){if(BS.mark)return BS.mark;const g=new THREE.Group(),m=new THREE.MeshBasicMaterial({color:0x2ecc59,transparent:true,opacity:.75});
  const ring=new THREE.Mesh(new THREE.TorusGeometry(.55,.05,8,28),m);ring.rotation.x=Math.PI/2;ring.position.y=.06;g.add(ring);
  const beam=new THREE.Mesh(new THREE.CylinderGeometry(.5,.5,3,20,1,true),new THREE.MeshBasicMaterial({color:0x2ecc59,transparent:true,opacity:.22,side:THREE.DoubleSide}));beam.position.y=1.5;g.add(beam);
  g.visible=false;scene.add(g);return BS.mark=g;}

/* ---- the plan for one round: who, where to, what they do there, all worked out from the slot number ---- */
function pathLen(pts){const cum=[0];for(let i=1;i<pts.length;i++)cum.push(cum[i-1]+Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]));return cum;}
function posOn(pts,cum,d){d=Math.max(0,Math.min(cum[cum.length-1],d));let i=1;while(i<pts.length-1&&cum[i]<d)i++;
  const a=pts[i-1],b=pts[i],seg=cum[i]-cum[i-1]||1,u=(d-cum[i-1])/seg;return{x:a[0]+(b[0]-a[0])*u,z:a[1]+(b[1]-a[1])*u,yaw:Math.atan2(b[0]-a[0],b[1]-a[1])};}
function bossPlan(k){if(BS.plan&&BS.plan.k===k)return BS.plan;
  const rng=mulberry32(k*104729+7),id=BOSS_IDS[k%3],b=BOSSES[id],r=rng();let kind='visit',dest='visit',spot,face;
  if(r<.5){dest='game';const q=rng();kind=q<.5?'ask':q<.75?'watch':'play';
    if(kind==='play'){spot=[2.6,3.55];face=[2.6,5];}else if(kind==='watch'){spot=[.6,4.1];face=[2.6,5];}else{spot=[.4,4.8];face=[-.5,5.2];}}
  else{const z=r<.7?ZONES.find(q=>q.id==='work'):r<.8?ZONES.find(q=>q.id==='bal'):r<.9?ZONES.find(q=>q.id==='dine'):ZONES.find(q=>q.id==='lounge');spot=[z.c[0],z.c[1]];face=[z.c[0],z.c[1]+3];}
  const o=nearFree(b.origin[0],b.origin[1]),d=nearFree(spot[0],spot[1]),pts=[o,...route(o[0],o[1],d[0],d[1])],cum=pathLen(pts),L=cum[cum.length-1],walkT=L/BOSS_SPEED;
  const tStart=2,tArr=tStart+walkT,dwell=kind==='ask'?31:kind==='visit'?14:34;
  return BS.plan={k,id,kind,dest,pts,cum,L,face,tStart,tArr,tAsk:tArr+3,tLeave:tArr+dwell,tEnd:tArr+dwell+walkT,fired:false,fleeOn:false};}

/* ---- the people in the game room bolt when the boss shouts ---- */
const fleeList=()=>(MT&&MT.state==='play')?[]:[...POOL.players,...CARROM.players,...CARROM.watchers];
function bossFlee(off,plan){if(plan.kind!=='ask')return;
  const active=off>=plan.tAsk&&off<plan.tLeave+2,list=fleeList();
  if(!active){if(plan.fleeOn){plan.fleeOn=false;for(const P of list){P.root.visible=true;P.root.position.set(P.x,0,P.z);P.root.rotation.y=P.yaw;P.fl=null;}}return;}
  if(!plan.fleeOn){plan.fleeOn=true;plan.late=off>plan.tAsk+7;
    list.forEach(P=>{if(plan.late){P.fl=null;return;}const pts=[[P.x,P.z],...route(P.x,P.z,.3,-4.5)];P.fl={pts,cum:pathLen(pts)};});}
  list.forEach((P,i)=>{if(plan.late){P.root.visible=false;return;}const f=P.fl;if(!f)return;
    const d=(off-plan.tAsk-.3-i*.15)*3.4,L=f.cum[f.cum.length-1];if(d<=0)return;
    if(d>=L){P.root.visible=false;return;}
    const q=posOn(f.pts,f.cum,d);P.root.visible=true;P.root.position.set(q.x,0,q.z);P.root.rotation.y=q.yaw;rest(P);walkPose(P,d*1.9,1);P.J.spine.rotation.x=.22;});}

/* ---- walking, standing and doing their thing ---- */
function bossStand(P,plan,off,t){rest(P);const J=P.J,fx=plan.face[0]-P.x,fz=plan.face[1]-P.z;P.yaw=Math.atan2(fx,fz);P.root.rotation.y=P.yaw;
  if(plan.kind==='ask'){
    if(off>=plan.tAsk&&off<plan.tAsk+3.5){J.rSh.rotation.set(-2.5,0,-.3);J.rEl.rotation.x=-.3;J.lSh.rotation.set(-.3,0,.7);J.neck.rotation.x=-.12;talk(P,t,true);}
    else{J.lSh.rotation.set(-.35,0,.45);J.lEl.rotation.x=-1.6;J.rSh.rotation.set(-.35,0,-.45);J.rEl.rotation.x=-1.6;J.neck.rotation.y=Math.sin(t*.6)*.5;}}   // hands on hips, glaring
  else if(plan.kind==='watch'){J.lSh.rotation.set(-.6,0,.5);J.lEl.rotation.x=-1.9;J.rSh.rotation.set(-.6,0,-.5);J.rEl.rotation.x=-1.9;J.neck.rotation.y=Math.sin(t*.4)*.35;}   // arms folded, watching
  else if(plan.kind==='play'){const cue=bossCue(),c=(t*.5)%1,back=.04+.11*(.5-.5*Math.cos(Math.min(1,c*1.6)*Math.PI*2)),k=Math.min(1,c*4,(1-c)*4+.2);
    poolPose(P,back,Math.min(1,k));P.root.updateMatrixWorld(true);J.rHand.getWorldPosition(_v);
    const fx0=Math.sin(P.yaw),fz0=Math.cos(P.yaw);cue.visible=true;cue.position.set(_v.x+fx0*.3,_v.y-.02,_v.z+fz0*.3);cue.lookAt(_v.x+fx0,_v.y-.1,_v.z+fz0);}
  else J.neck.rotation.y=Math.sin(t*.5)*.6;}
function bossShape(plan,off,t){   // where the boss is right now on the round, or null when they are not out
  if(off<plan.tStart||off>plan.tEnd)return null;
  if(off<plan.tArr){const d=(off-plan.tStart)*BOSS_SPEED,q=posOn(plan.pts,plan.cum,d);return{x:q.x,z:q.z,yaw:q.yaw,walk:d};}
  if(off<plan.tLeave){const q=plan.pts[plan.pts.length-1];return{x:q[0],z:q[1],stand:true};}
  const d=plan.L-(off-plan.tLeave)*BOSS_SPEED,q=posOn(plan.pts,plan.cum,d),e=posOn(plan.pts,plan.cum,Math.max(0,d-.3));return{x:q.x,z:q.z,yaw:Math.atan2(e.x-q.x,e.z-q.z),walk:d};}
function bossTag(id,P,show,html){const el=BS.tags[id];if(!el)return;
  if(!show){el.style.visibility='hidden';return;}
  P.J.neck.getWorldPosition(_v);_v.y+=.3;const dist=camera.position.distanceTo(_v);_v.project(camera);
  if(dist>(mode==='walk'?22:60)||_v.z>1||_v.z<-1||Math.abs(_v.x)>1.1||Math.abs(_v.y)>1.1){el.style.visibility='hidden';return;}
  if(el.dataset.h!==html){el.dataset.h=html;el.innerHTML=html;}
  el.style.visibility='';const w=stage.clientWidth,h=stage.clientHeight,bw=el.offsetWidth,x=Math.max(bw/2+6,Math.min(w-bw/2-6,(_v.x*.5+.5)*w)),y=(-_v.y*.5+.5)*h;
  el.style.transform='translate('+x+'px,'+y+'px) translate(-50%,-100%)';}
function bossUpdate(t,dt){
  if(!PROFILE)return;
  const w=worldT(),k=Math.floor(w/BOSS_PERIOD),off=w-k*BOSS_PERIOD,plan=bossPlan(k);
  for(const id of BOSS_IDS){if(id!==plan.id&&BS.people[id]){BS.people[id].root.visible=false;BS.tags[id].style.visibility='hidden';}}
  const P=bossPerson(plan.id),B=BOSSES[plan.id];
  if(BS.cue)BS.cue.visible=false;
  bossFlee(off,plan);
  if(CMP.on&&CMP.kind==='trouble'&&CMP.boss===plan.id){P.root.visible=true;troubleEscort(P,dt,t);bossTag(plan.id,P,true,'<b class="shout">'+(CMP.stage==='speak'?'এত বড় সাহস?! 😡':'আমার সাথে চলো! 😡')+'</b>');return;}
  if(CHASE.on&&CHASE.slot===k){chaseUpdate(P,plan,dt,t);return;}
  const st=bossShape(plan,off);
  if(!st){P.root.visible=false;if(BS.cue)BS.cue.visible=false;bossTag(plan.id,P,false);return;}
  P.root.visible=true;
  if(plan.kind==='ask'&&!plan.fired&&off>=plan.tAsk&&off<plan.tAsk+4){plan.fired=true;
    sfx.play('fail');sfx.play('door');if(mode==='walk'&&lastZone==='game'&&!MT&&!CHASE.on)startChase(plan,k,P);}
  if(off>plan.tAsk+4)plan.fired=true;
  P.x=st.x;P.z=st.z;
  if(st.stand){bossStand(P,plan,off,t);P.root.position.set(st.x,0,st.z);}
  else{P.yaw=st.yaw;P.root.position.set(st.x,0,st.z);P.root.rotation.y=st.yaw;rest(P);walkPose(P,st.walk*3.4,1);if(BS.cue)BS.cue.visible=false;}
  life(P,t,dt);
  const shouting=plan.kind==='ask'&&off>=plan.tAsk&&off<plan.tAsk+3.5;
  bossTag(plan.id,P,true,shouting?'<b class="shout">কাজ কাম নাই?! 😡</b>':'<b>'+B.em+' '+B.bn+'</b><small>'+(st.stand?(plan.kind==='play'?'খেলছেন':plan.kind==='watch'?'খেলা দেখছেন':'পরিদর্শনে'):'অফিস ঘুরছেন')+'</small>');}

/* ---- the chase ---- */
function startChase(plan,k,B){panel.classList.add('folded');syncFold();const d=myDeskSpot();
  Object.assign(CHASE,{on:true,slot:k,boss:plan.id,t:0,desk:d,path:null,repath:0,wph:0,over:false});
  B.root.visible=true;const m=bossMark();m.visible=true;m.position.set(d.stand[0],0,d.stand[1]);
  keys.run=true;byId('bRun').setAttribute('aria-pressed','true');
  byId('chase').hidden=false;toast(BOSSES[plan.id].bn+' জিজ্ঞেস করলেন "কাজ কাম নাই?" — দৌড় দিন, ডেস্কে যান!',4000);}
function endChase(msg){CHASE.on=false;byId('chase').hidden=true;if(BS.mark)BS.mark.visible=false;keys.run=false;byId('bRun').setAttribute('aria-pressed','false');if(msg)toast(msg,4500);}
function chaseUpdate(B,plan,dt,t){
  CHASE.t+=dt;const U=player;if(BS.mark)BS.mark.position.y=Math.sin(t*4)*.05;
  const dd=Math.hypot(U.x-CHASE.desk.stand[0],U.z-CHASE.desk.stand[1]);
  byId('chaseD').textContent='ডেস্ক এখান থেকে '+bnd(Math.round(dd))+' মিটার · বস '+bnd(Math.round(Math.hypot(U.x-B.x,U.z-B.z)))+' মিটার পেছনে';
  keys.run=true;
  if(CHASE.t<2.2){turnTo(B,Math.atan2(U.x-B.x,U.z-B.z),dt);B.root.position.set(B.x,0,B.z);life(B,t,dt);}
  else{CHASE.repath-=dt;if(CHASE.repath<=0||!CHASE.path||!CHASE.path.length){CHASE.repath=.35;CHASE.path=route(B.x,B.z,U.x,U.z);}
    const tg=CHASE.path[0];if(tg){const dx=tg[0]-B.x,dz=tg[1]-B.z,d=Math.hypot(dx,dz),s=BOSS_RUN*dt;
      if(d<=s){B.x=tg[0];B.z=tg[1];CHASE.path.shift();}else{B.x+=dx/d*s;B.z+=dz/d*s;}
      let df=Math.atan2(dx,dz)-B.yaw;df=Math.atan2(Math.sin(df),Math.cos(df));B.yaw+=df*Math.min(1,dt*10);}
    rest(B);CHASE.wph+=dt*BOSS_RUN*3.4;walkPose(B,CHASE.wph,1);B.J.spine.rotation.x=.25;B.root.position.set(B.x,0,B.z);B.root.rotation.y=B.yaw;life(B,t,dt);}
  bossTag(plan.id,B,true,'<b class="shout">'+(CHASE.t<2.2?'কাজ কাম নাই?! 😡':'দাঁড়াও! 😠')+'</b>');
  if(Math.hypot(U.x-B.x,U.z-B.z)<.8&&CHASE.t>2.2){CHASE.over=true;caught(plan.id);return;}
  if(dd<1.1){endChase('বেঁচে গেলেন! ডেস্কে বসে এখন কাজের ভান করুন 😅');return;}
  if(CHASE.t>45)endChase('বস হাল ছেড়ে দিলেন। এবারের মতো বেঁচে গেলেন!');}
async function caught(id){const b=BOSSES[id],L=LETTERS[id],name=window.CB_PLAYER.name;endChase();sfx.play('fail');
  byId('lTitle').textContent=L.title;byId('lBody').textContent=L.body.replace('{name}',name);byId('lSign').textContent=L.sign;
  const cut=byId('lCut');cut.className='lcut';cut.textContent='এমপ্লয়মেন্ট রেটিং কাটা হচ্ছে…';byId('lOk').disabled=true;byId('lOk').textContent='ক্ষমা চাইলাম 🙏';byId('lNo').disabled=false;byId('mletter').hidden=false;
  try{const r=await fetch('/api/warning',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({boss:id})}),d=await r.json().catch(()=>null);
    if(!r.ok||!d||!d.ok)throw new Error(d&&d.error||'');
    if(PROFILE)PROFILE.employment=d.employment;cut.className='lcut bad';cut.textContent='এমপ্লয়মেন্ট রেটিং '+bnd(d.before)+' → '+bnd(d.employment)+' (−'+bnd(d.delta)+')';}
  catch(e){cut.textContent=(e&&e.message)||'রেটিং কাটা যায়নি, নেটওয়ার্ক দেখুন।';}
  byId('lOk').disabled=false;}
function wireBossUI(){byId('lOk').addEventListener('click',()=>{byId('mletter').hidden=true;});byId('lNo').addEventListener('click',defy);
  const m=byId('mletter');m.addEventListener('keydown',e=>e.stopPropagation());m.addEventListener('keyup',e=>e.stopPropagation());}

/* ================= multiplayer: who is online and what they are doing ================= */
// Everyone's browser reports its position to /api/presence about twice a second and gets back everyone else who is online.
// Colleagues in the office are drawn as characters you can see walking, sitting and playing; the rest just show a green dot.
const NET={on:false,busy:false,last:null,players:new Map(),remote:new Map(),timer:0,moved:0,skew:0,handled:new Set(),accepted:new Set(),inviteId:null};
const zoneBn=id=>{const z=ZONES.find(q=>q.id===id);return z?z.bn:'';};
function myState(){
  let act='',pose='stand';const walk=mode==='walk'&&player&&!!window.CB_PLAYER;
  if(CHASE.on)act='🏃 বসের হাত থেকে ডেস্কে পালাচ্ছে!';
  const z=walk?zoneAt(player.x,player.z):null;
  if(MT){const g=GAMEDEF[MT.game];
    if(MT.state==='play'||MT.state==='result'){act=g.em+' '+g.bn+' খেলছে ('+MT.pnames.map(shortName).join(', ')+')';if(g.dine)pose='sit';}
    else act='🤝 '+shortName(MT.emp.name)+' কে '+g.bn+' খেলতে ডাকছে';}
  else if(CHASE.on){}
  else if(!walk)act='👀 অফিস ঘুরে দেখছে';
  if(SMOKE.on){pose='smoke';act=SMOKE.buddy?'🚬 '+SMOKE.buddy+' এর সাথে সিগারেট খাচ্ছে':'🚬 বারান্দায় সিগারেট খাচ্ছে';}
  else if(PAIR.on)act=PAIR.kind==='beg'?'🙏 সিগারেট নিয়ে মজার কথা চলছে':'🚬 একসাথে সিগারেট ধরাচ্ছে';
  else if(SETUP.state==='run')act='💻 ডেস্কে ল্যাপটপ সাজাচ্ছে';
  else if(SETUP.state==='bag'&&walk)act='🎒 ব্যাগ নিয়ে ডেস্কে যাচ্ছে';
  else if(SIT.on){pose=SIT.c&&SIT.c.desk?'type':'sit';act=SIT.c&&SIT.c.desk?'💻 নিজের ডেস্কে কাজ করছে':'🪑 বসে আছে';}
  else if(CMP.on&&CMP.kind==='trouble')act='😱 বসের হাতে ধরা পড়েছে!';
  else if(CMP.on&&CMP.stage!=='done'&&CMP.kind!=='smokejoin')act='😭 এইচআরে অভিযোগ করতে যাচ্ছে';
  const x=walk?player.x:0,zz=walk?player.z:0,L=NET.last,walking=!!L&&Math.hypot(x-L.x,zz-L.z)>.03,fx=performance.now()<FXS.until?FXS.cur:'';
  return{x:+x.toFixed(2),z:+zz.toFixed(2),y:+((walk&&player.y)||0).toFixed(2),yaw:+(walk?player.yaw:0).toFixed(2),walking,inOffice:walk,pose,zone:z?z.id:'',act,fx,bag:SETUP.state==='bag'||(SETUP.state==='run'&&!!player.bag)};}
async function sendPresence(){if(!NET.on||NET.busy)return;NET.busy=true;const s=myState();
  try{const r=await fetch('/api/presence',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(s)});const d=await r.json().catch(()=>null);
    if(r.ok&&d&&d.ok){NET.last=s;applyPlayers(d.players);applyLive(d.live||[],d.serverNow||Date.now());applySlaps(d.slapped||[]);applyNotices(d.notices||[]);applySocialIn(d.socialIn||[]);applySocialOut(d.socialOut||[]);}}
  catch(e){/* offline for a moment: the next beat tries again */}
  NET.busy=false;}
function startNet(){if(NET.on)return;NET.on=true;loadDeskOwners();byId('whoBtn').hidden=false;sendPresence();
  const beat=()=>{sendPresence();setTimeout(beat,document.hidden?4000:(MT&&MT.liveId&&MT.turnGame&&MT.state==='play'?300:600));};setTimeout(beat,600);
  addEventListener('pagehide',()=>{try{navigator.sendBeacon('/api/presence',new Blob([JSON.stringify({leave:true})],{type:'application/json'}));}catch(e){}});}
function applyPlayers(list){
  NET.players=new Map(list.map(p=>[p.empId,p]));
  byId('whoN').textContent=bnd(list.length);
  for(const p of list){if(!p.inOffice)continue;let r=NET.remote.get(p.empId);
    if(!r){const P=mkModel(p.gender,p.model,p.look);place(P,p.x,p.z,p.yaw);r={sig:p.model+'|'+JSON.stringify(p.look||{}),P,x:p.x,z:p.z,yaw:p.yaw,tx:p.x,tz:p.z,tyaw:p.yaw,yy:p.y||0,ty:p.y||0,lastFx:'',pose:p.pose,walking:false,wph:Math.random()*6,el:document.createElement('div'),p};
      r.el.className='bub on rtag';bubbleLayer().appendChild(r.el);NET.remote.set(p.empId,r);}
    {const sig=p.model+'|'+JSON.stringify(p.look||{});if(r.sig!==sig){scene.remove(r.P.root);r.P=mkModel(p.gender,p.model,p.look);place(r.P,r.x,r.z,r.yaw);r.sig=sig;}}   // somebody changed their look
    r.tx=p.x;r.tz=p.z;r.ty=p.y||0;r.tyaw=p.yaw;r.pose=p.pose;r.p=p;r.walking=p.walking;
    if(!p.fx)r.lastFx='';else if(p.fx!==r.lastFx){r.lastFx=p.fx;if(p.fx.startsWith('slap')||p.fx.startsWith('kick')){r.slapT=0;r.kick=p.fx.startsWith('kick');}else if(p.fx.startsWith('hit')){r.hitAge=0;r.hitKind=p.fx.includes('kick')?'kick':p.fx.includes('desk')?'desk':'slap';}else if(p.fx.startsWith('offer'))r.offerT=0;}
    const act=p.act||('📍 '+zoneBn(p.zone));
    if(r.shown!==p.name+act){r.shown=p.name+act;r.el.textContent='';const b=document.createElement('b');b.textContent='🟢 '+(p.nickname||shortName(p.name));const s=document.createElement('small');s.textContent=act;r.el.append(b,s);}}
  for(const [id,r] of NET.remote){const p=NET.players.get(id);if(!p||!p.inOffice){scene.remove(r.P.root);r.el.remove();NET.remote.delete(id);}}
  syncDesks();
  if(!byId('mwho').hidden)renderWho();}
function remoteUpdate(dt,t){const w=stage.clientWidth,h=stage.clientHeight,maxD=mode==='walk'?18:45;
  for(const r of NET.remote.values()){const P=r.P;
    const busy=MT&&MT.ids&&MT.ids.includes(r.p.empId);P.root.visible=!busy;if(busy){r.el.style.visibility='hidden';continue;}   // in a match with you: shown as the local player instead
    const dx=r.tx-r.x,dz=r.tz-r.z,d=Math.hypot(dx,dz);
    if(d>6){r.x=r.tx;r.z=r.tz;}else{const k=Math.min(1,dt*5);r.x+=dx*k;r.z+=dz*k;}
    let dy=(d>.04?Math.atan2(dx,dz):r.tyaw)-r.yaw;dy=Math.atan2(Math.sin(dy),Math.cos(dy));const moving=d>.04||r.walking;
    r.yaw+=dy*Math.min(1,dt*8);r.yy+=((r.ty||0)-r.yy)*Math.min(1,dt*10);P.x=r.x;P.z=r.z;P.yaw=r.yaw;P.root.position.set(r.x,r.yy,r.z);P.root.rotation.y=r.yaw;
    const paired=PAIR.on&&PAIR.ready&&r.p.empId===PAIR.buddyId;
    if(paired)pairPose(P,PAIR.role==='host'?'guest':PAIR.role==='guest'?'host':PAIR.role==='asker'?'giver':'asker',nowS()-PAIR.t0,player,t,dt);
    else if(r.pose==='sit')seatedPose(P,t,0,_vt.set(r.x,.8,r.z));
    else if(r.pose==='type'){P.v='type';P.seat=.48;P.kbd=.6;aType(P,t,dt);}
    else if(moving){r.wph+=dt*(d>.04?Math.min(d/dt,3.2):1.8)*4.6;rest(P);walkPose(P,r.wph,1);}
    else{rest(P);
      if(r.pose==='smoke'){if(!P.cigTip)addCig(P);P.cigGroup.visible=true;if(!r.smokeAge)P.cigLit=false;r.smokeAge=(r.smokeAge||0)+dt;smokePose(P,r.smokeAge,t,dt);}}
    if(r.pose!=='smoke'){r.smokeAge=0;}
    if(!paired&&r.pose!=='smoke'&&P.cigGroup&&!(r.offerT>=0))P.cigGroup.visible=false;
    if(!paired&&r.pose!=='smoke'&&P.lighter)P.lighter.visible=false;
    if(r.p.bag)addBag(P);else removeBag(P);
    if(r.yy>.08&&r.pose!=='sit')airPose(P);
    if(r.slapT>=0){r.slapT+=dt;const du=r.kick?.8:.62;(r.kick?kickPose:slapPose)(P,r.slapT/du);if(r.slapT>du){r.slapT=-1;}}
    if(r.hitAge>=0){r.hitAge+=dt;const du=r.hitKind==='kick'?1.7:r.hitKind==='desk'?1.2:1.4;if(r.hitAge<du){const v=victimPose(P,r.hitAge,r.hitKind);P.root.position.y+=v.dy;P.root.position.x-=Math.sin(P.yaw)*v.back;P.root.position.z-=Math.cos(P.yaw)*v.back;}else r.hitAge=-1;}
    if(r.offerT>=0){if(!P.cigTip)addCig(P);P.cigGroup.visible=true;r.offerT+=dt;offerPose(P,r.offerT/1.6);if(r.offerT>1.6)r.offerT=-1;}
    life(P,t,dt);
    // name tag over the head
    P.J.neck.getWorldPosition(_v);_v.y+=.3;const dist=camera.position.distanceTo(_v);_v.project(camera);
    if(dist>maxD||_v.z>1||_v.z<-1||Math.abs(_v.x)>1.1||Math.abs(_v.y)>1.1){r.el.style.visibility='hidden';continue;}
    r.el.style.visibility='';const bw=r.el.offsetWidth,x=Math.max(bw/2+6,Math.min(w-bw/2-6,(_v.x*.5+.5)*w)),y=(-_v.y*.5+.5)*h;
    r.el.style.transform='translate('+x+'px,'+y+'px) translate(-50%,-100%)';}}

/* ---- who's online list ---- */
function renderWho(){const q=byId('mwhoQ').value.trim().toLowerCase(),L=byId('mwhoList');if(!EMPS){L.textContent='লোড হচ্ছে…';return;}L.textContent='';
  const rows=EMPS.map(e=>Object.assign({},e,{online:e.online||NET.players.has(e.empId),act:(NET.players.get(e.empId)||{}).act||e.act})).filter(e=>!q||(e.name+' '+e.nickname+' '+e.designation).toLowerCase().includes(q))
    .sort((a,b)=>(b.online-a.online)||a.name.localeCompare(b.name));
  for(const e of rows){const row=document.createElement('div');row.className='wrow';
    const dot=document.createElement('i');dot.className='dot '+(e.online?'on':'off');dot.title=e.online?'অনলাইন':'অফলাইন';
    const av=document.createElement('span');av.className='cav';av.textContent=e.avatar;av.style.background=e.avatarBg;
    const tx=document.createElement('span');tx.className='ctx';const n=document.createElement('b');n.textContent=e.name;const s=document.createElement('small');s.textContent=e.online?(e.act||'অনলাইন'):(e.designation||'অফলাইন');tx.append(n,s);
    row.append(dot,av,tx);L.appendChild(row);}
  const on=rows.filter(e=>e.online).length;byId('mwhoInfo').textContent='🟢 '+bnd(on)+' জন অনলাইন · 🔴 '+bnd(rows.length-on)+' জন অফলাইন';}
async function openWho(){byId('mwho').hidden=false;byId('mwhoQ').value='';renderWho();await refreshEmps();renderWho();
  clearInterval(NET.whoT);NET.whoT=setInterval(async()=>{if(byId('mwho').hidden){clearInterval(NET.whoT);return;}await refreshEmps();renderWho();},5000);}
async function refreshEmps(){try{const r=await fetch('/api/employees'),d=await r.json();if(r.ok&&d.ok)EMPS=d.employees;}catch(e){}}
function wireNetUI(){
  byId('whoBtn').addEventListener('click',openWho);byId('mwhoClose').addEventListener('click',()=>{byId('mwho').hidden=true;});
  byId('mwho').addEventListener('click',e=>{if(e.target===byId('mwho'))byId('mwho').hidden=true;});
  byId('mwhoQ').addEventListener('input',renderWho);
  const m=byId('mwho');m.addEventListener('keydown',e=>e.stopPropagation());m.addEventListener('keyup',e=>e.stopPropagation());
  addEventListener('keydown',e=>{if(e.key==='Escape'&&!m.hidden){e.stopPropagation();m.hidden=true;}},true);}

/* ================= profile ================= */
const AVATARS=['🧑‍💻','👩‍💻','🥷','🧙','🦸','🧞','🧛','🤖','👽','🐱','🐵','🦊','🐼','🐸','🦁','🐧','🐯','🐰','🦄','💩'];
const AV_BG=['#ffd9a8','#ffc2c2','#c8e6c9','#bbdefb','#e1bee7','#fff59d','#b2ebf2','#d7ccc8'];
let PROFILE=null,profInit=false;
function initProfile(emp){
  PROFILE=emp;const $=id=>document.getElementById(id);
  const pbtn=$('pbtn'),modal=$('pmodal'),view=$('pview'),form=$('pform'),msg=$('pmsg'),save=$('psave');
  let av=emp.avatar,bg=emp.avatarBg,mdl=emp.model||0,lk=Object.assign({},emp.look||{});
  const paint=(el,a,c)=>{el.textContent=a;el.style.background=c;};
  const refresh=()=>{const p=PROFILE;paint(pbtn,p.avatar,p.avatarBg);paint($('pavBig'),p.avatar,p.avatarBg);
    $('ptitle').textContent=p.name;$('pnick').textContent=p.nickname?'“'+p.nickname+'”':'ডাকনাম এখনো দেননি';$('pbio').textContent=p.bio||'';$('pbio').hidden=!p.bio;
    const rows=[['আইডি',p.empId],['XP',bnN(p.xp||0)+' · '+rankOf(p.xp||0)],['এমপ্লয়মেন্ট রেটিং',bnd(p.employment==null?100:p.employment)+'/১০০'],['ইমেইল',p.email],['পদবী',p.designation],['ক্যারেক্টার',modelOf(p.gender,p.model).n],...['pool','carrom','uno','chess','ludo'].map(g=>['রেটিং · '+GAMEDEF[g].bn,'⭐ '+bnd((p.ratings&&p.ratings[g])||1000)]),['ডিপার্টমেন্ট',p.department],['ব্রাঞ্চ',p.branch],['প্রিয় নাশতা',p.snack],['ফোন',p.phone]].filter(r=>r[1]);
    const dl=$('pdl');dl.textContent='';for(const [k,v] of rows){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=k;dd.textContent=v;dl.append(dt,dd);}};
  const open=()=>{modal.hidden=false;showView();};
  const close=()=>{modal.hidden=true;};
  const showView=()=>{refresh();view.hidden=false;form.hidden=true;};
  const mkLook=()=>{const box=$('plook'),prev=$('plookPrev'),g=PROFILE.gender==='f'?'f':'m',eff=lookFix(g,modelOf(g,mdl).o,lk);box.textContent='';prev.textContent='';prev.appendChild(modelSvg(g,{o:eff}));
    const set=(k,v)=>{if(v===undefined)delete lk[k];else lk[k]=v;mk();};
    const sect=t=>{const h=document.createElement('div');h.className='lkh';h.textContent=t;box.appendChild(h);const r=document.createElement('div');r.className='lkrow';box.appendChild(r);return r;};
    const sw=(t,list,key,cur)=>{const r=sect(t);for(const c of list){const b=document.createElement('button');b.type='button';b.className='lksw';b.style.background=c;b.setAttribute('aria-label','রং');b.setAttribute('aria-pressed',String(String(cur()||'').toLowerCase()===c.toLowerCase()));b.addEventListener('click',()=>set(key,c));r.appendChild(b);}};
    const ch=(t,opts,pick,cur)=>{const r=sect(t);for(const [v,l] of opts){const b=document.createElement('button');b.type='button';b.className='lkch';b.textContent=l;b.setAttribute('aria-pressed',String(cur()===v));b.addEventListener('click',()=>pick(v));r.appendChild(b);}};
    const yn=(t,key)=>ch(t,[[true,'হ্যাঁ'],[false,'না']],v=>set(key,v),()=>!!eff[key]);
    sw('চামড়ার রং',SKIN_TONES,'skin',()=>eff.skin);
    if(g==='f'){
      ch('চুলের স্টাইল',[['long','খোলা চুল'],['bun','খোঁপা'],['hijab','হিজাব']],v=>set('hs',v),()=>eff.hs);
      if(eff.hs==='hijab')sw('হিজাবের রং',HIJAB_COLS,'hijab',()=>eff.hijab);else sw('চুলের রং',HAIR_COLS,'hair',()=>eff.hair||'#141010');
      sw('কামিজের রং',TOP_F,'top',()=>eff.top);
      if(eff.hs!=='hijab'){ch('ওড়না',[[true,'আছে'],[false,'নেই']],v=>set('orna',v?(eff.orna||ORNA_COLS[0]):null),()=>!!eff.orna);if(eff.orna)sw('ওড়নার রং',ORNA_COLS,'orna',()=>eff.orna);}
      sw('সালোয়ারের রং',BOT_F,'bot',()=>eff.bot);
      yn('চশমা','glasses');yn('স্যান্ডেল','sandal');}
    else{
      ch('চুলের স্টাইল',[['short','ছোট চুল'],['bald','টাক']],v=>set('hs',v),()=>eff.hs||'short');
      if(eff.hs!=='bald')sw('চুলের রং',HAIR_COLS,'hair',()=>eff.hair||'#16110e');
      yn('চশমা','glasses');yn('দাড়ি','beard');yn('গোঁফ','mous');
      ch('পোশাক',[['tee','টি-শার্ট'],['polo','পোলো'],['shirt','ফরমাল শার্ট']],v=>set('style',v),()=>eff.style||'tee');
      ch('হাতা',[['short','হাফ হাতা'],['long','ফুল হাতা']],v=>set('sleeve',v),()=>eff.sleeve||'short');
      sw('জামার রং',TOP_M,'top',()=>eff.top);
      ch('প্যান্ট',[[true,'জিন্স'],[false,'ফরমাল প্যান্ট']],v=>set('jeans',v),()=>!!eff.jeans);
      sw('প্যান্টের রং',BOT_M,'bot',()=>eff.bot);}};
  const mk=()=>{const A=$('pavs'),C=$('pcols'),Mo=$('pmods');A.textContent='';C.textContent='';Mo.textContent='';mkLook();
    modelList(PROFILE.gender).forEach((m,i)=>{const b=document.createElement('button');b.type='button';b.setAttribute('aria-pressed',String(i===mdl));b.setAttribute('aria-label',m.n);b.appendChild(modelSvg(PROFILE.gender,m));const sm=document.createElement('small');sm.textContent=m.n;b.appendChild(sm);b.addEventListener('click',()=>{mdl=i;mk();});Mo.appendChild(b);});
    AVATARS.forEach(a=>{const b=document.createElement('button');b.type='button';b.textContent=a;b.setAttribute('aria-pressed',String(a===av));b.addEventListener('click',()=>{av=a;mk();});A.appendChild(b);});
    AV_BG.forEach(c=>{const b=document.createElement('button');b.type='button';b.style.background=c;b.setAttribute('aria-label','রং');b.setAttribute('aria-pressed',String(c===bg));b.addEventListener('click',()=>{bg=c;mk();});C.appendChild(b);});};
  const edit=()=>{const p=PROFILE;av=p.avatar;bg=p.avatarBg;mdl=p.model||0;lk=Object.assign({},p.look||{});$('fNick').value=p.nickname;$('fBio').value=p.bio;$('fSnack').value=p.snack;$('fPhone').value=p.phone;msg.textContent='';msg.className='pmsg';mk();view.hidden=true;form.hidden=false;};
  if(!profInit){profInit=true;
    $('plookReset').addEventListener('click',()=>{lk={};mk();});
    pbtn.addEventListener('click',open);$('pclose').addEventListener('click',close);$('pedit').addEventListener('click',edit);$('pcancel').addEventListener('click',showView);
    modal.addEventListener('click',e=>{if(e.target===modal)close();});
    addEventListener('keydown',e=>{if(e.key==='Escape'&&!modal.hidden){e.stopPropagation();close();}},true);
    // typing in the form must not move the player
    modal.addEventListener('keydown',e=>e.stopPropagation());modal.addEventListener('keyup',e=>e.stopPropagation());
    form.addEventListener('submit',async e=>{e.preventDefault();save.disabled=true;msg.className='pmsg';msg.textContent='সেভ হচ্ছে…';
      try{const r=await fetch('/api/profile',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({nickname:$('fNick').value,bio:$('fBio').value,snack:$('fSnack').value,phone:$('fPhone').value,avatar:av,avatarBg:bg,model:mdl,look:lk})});
        const d=await r.json().catch(()=>null);
        if(!r.ok||!d||!d.ok){msg.className='pmsg bad';msg.textContent=(d&&d.error)||'সেভ হয়নি। আবার চেষ্টা করুন।';sfx.play('fail');}
        else{PROFILE=Object.assign(PROFILE,d.profile);if(!MT)setPlayerModel(PROFILE.gender,PROFILE.model,PROFILE.look);if(window.CB_PLAYER)window.CB_PLAYER.nickname=d.profile.nickname;sfx.play('ok');showView();toast('প্রোফাইল আপডেট হয়েছে!',2500);}}
      catch(err){msg.className='pmsg bad';msg.textContent='নেটওয়ার্ক সমস্যা। আবার চেষ্টা করুন।';}
      save.disabled=false;});}
  refresh();pbtn.hidden=false;
}
function toast(t,ms){const el=document.getElementById('toast');el.textContent=t;el.hidden=false;clearTimeout(toast.h);toast.h=setTimeout(()=>{el.hidden=true;},ms||4000);}
/* ================= start ================= */
function resize(){syncTouchUI();const w=stage.clientWidth||innerWidth,h=stage.clientHeight||innerHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
function start(){
  build();
  player=mkMan({top:'#b3261e',bot:'#2a2f3a',glasses:false,beard:false,tie:null});place(player,1,-12.2,0);player.cam=Math.PI;player.root.visible=false;
  bake(staticG);bake(wallsG);bake(tallG);setWalls(false);makeLabels();wireUI();resize();addEventListener('resize',resize);
  loading.hidden=true;initLogin();
  const reduce=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
  let last=performance.now(),tt=0;/*DBG*/
  function frame(now){if(PAUSE3D){last=now;requestAnimationFrame(frame);return;}const raw=Math.min(.05,(now-last)/1000),dt=raw*TS.k;last=now;tt=worldT();if(TS.t>0){TS.t-=raw;if(TS.t<=0)TS.k=1;}
    for(const a of acts){a.fn(a.P,tt,dt);if(!a.P.noBlink)life(a.P,tt,dt);}
    ambUpdate(tt);for(const P of POOL.players)life(P,tt,dt);for(const P of CARROM.players)life(P,tt,dt);
    if(!reduce){for(const f of fans)f.rotation.y=(tt*6)%(Math.PI*2);}
    const onBal=mode==='walk'&&lastZone==='bal';
    for(const v of traffic){const px0=v.g.position.x,nx=((v.x0+v.dir*v.speed*tt+58)%116+116)%116-58;v.g.position.x=nx;if(onBal&&(px0-player.x)*(nx-player.x)<0&&Math.abs(nx-px0)<5)sfx.vehicle(Math.max(.3,Math.min(1,1.3-Math.abs(v.g.position.z-player.z)/22)),v.kind);}
    updSmoke(dt);gateUpdate(tt,dt);
    if(MT&&(MT.state==='play'||MT.state==='result')){}else if(mode==='walk')updateWalk(tt,dt);else{updFly(dt);controls.update();}
    clockTick(dt);matchUpdate(dt);retUpdate(dt);remoteUpdate(dt,tt);bossUpdate(tt,dt);cmpUpdate(dt);hitUpdate(dt);gawk();tbUpdate(dt);pairNpc(tt,dt);
    updateLabels();updateTalk(dt);renderer.render(scene,camera);requestAnimationFrame(frame);}
  updBoard();requestAnimationFrame(frame);
}
const fr=(document.fonts&&document.fonts.load)?document.fonts.load('600 30px "Hind Siliguri"'):Promise.resolve();
Promise.race([fr,new Promise(r=>setTimeout(r,2500))]).then(start,start);

}
