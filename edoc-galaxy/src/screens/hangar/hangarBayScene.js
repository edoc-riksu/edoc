/* eslint-disable */
/* edoc hangar bay: real-time 3D scene (three.js, ported from the inventory-bay
   mockup's r128 vanilla-JS version to this project's three.js 0.187 via npm).
   createHangarScene(canvas, { onStatus, starfarer, reducedMotion, avatarUrl }) ->
   { setSuit, setAvatar, dispose }

   Two API changes from the original r128 version, both required - not a
   style choice - because they were removed/changed in modern three.js:
     - texture.encoding / renderer.outputEncoding -> texture.colorSpace /
       renderer.outputColorSpace (SRGBColorSpace is also now the renderer's
       default, so this is mostly for clarity).
     - the manual ShaderPass(ACESFilmicToneMappingShader) +
       ShaderPass(GammaCorrectionShader) pair is dropped in favour of the
       renderer's own renderer.toneMapping / toneMappingExposure - the
       modern renderer already converts its output to the correct colour
       space once, so keeping the old shader passes on top would apply
       gamma correction twice and wash the image out.

   The original mockup also let a visitor load their own .glb avatar file at
   runtime - dropped here on purpose: avatars are added by the team, not
   uploaded by players. */
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export function createHangarScene(canvas, opts) {
opts = opts || {};
var say = opts.onStatus || function () {};
var reduce = !!opts.reducedMotion;
var raf = 0;

/* ---------- helpers ---------- */
function rng(seed){ return function(){ seed|=0; seed=seed+0x6D2B79F5|0; var t=Math.imul(seed^seed>>>15,1|seed); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }
var R = rng(7);
function cvs(w,h){ var c=document.createElement('canvas'); c.width=w; c.height=h; return c; }
function tex(c, rx, ry, srgb){ var t=new THREE.CanvasTexture(c); t.wrapS=t.wrapT=THREE.RepeatWrapping; t.repeat.set(rx||1, ry||1); t.anisotropy=8; if(srgb!==false) t.colorSpace=THREE.SRGBColorSpace; return t; }
function grime(g,w,h,n,dark){ for(var i=0;i<n;i++){ var x=R()*w,y=R()*h,r=8+R()*60; var gr=g.createRadialGradient(x,y,0,x,y,r); gr.addColorStop(0, dark?'rgba(10,8,6,'+(0.08+R()*0.18)+')':'rgba(255,255,255,'+(0.03+R()*0.05)+')'); gr.addColorStop(1,'rgba(0,0,0,0)'); g.fillStyle=gr; g.fillRect(x-r,y-r,r*2,r*2);} }
function scratches(g,w,h,n){ g.lineWidth=1; for(var i=0;i<n;i++){ g.strokeStyle='rgba(220,228,240,'+(0.05+R()*0.12)+')'; var x=R()*w,y=R()*h,a=R()*Math.PI,l=10+R()*60; g.beginPath(); g.moveTo(x,y); g.lineTo(x+Math.cos(a)*l,y+Math.sin(a)*l); g.stroke(); } }

/* deck plating */
var deckC=cvs(1024,1024), dg=deckC.getContext('2d');
var roughC=cvs(512,512), rgc=roughC.getContext('2d');
rgc.fillStyle='#8a8a8a'; rgc.fillRect(0,0,512,512);
for(var py=0;py<4;py++) for(var px=0;px<4;px++){
  var l=38+Math.floor(R()*10); dg.fillStyle='hsl(218,10%,'+l+'%)'; dg.fillRect(px*256,py*256,256,256);
  if((px+py)%3===0){ dg.fillStyle='rgba(255,255,255,0.05)'; for(var yy=10;yy<256;yy+=18) for(var xx=(yy/18%2)*9;xx<256;xx+=18){ dg.save(); dg.translate(px*256+xx,py*256+yy); dg.rotate(0.6); dg.fillRect(-5,-1.5,10,3); dg.restore(); } }
  dg.fillStyle='#14171d'; dg.fillRect(px*256,py*256,256,5); dg.fillRect(px*256,py*256,5,256);
  dg.fillStyle='rgba(150,160,175,0.35)'; dg.fillRect(px*256+5,py*256+5,250,1.5);
  dg.fillStyle='#22262e'; [[16,16],[240,16],[16,240],[240,240]].forEach(function(p){ dg.beginPath(); dg.arc(px*256+p[0],py*256+p[1],4,0,7); dg.fill(); });
  rgc.fillStyle='rgba('+(R()>.5?60:200)+','+(R()>.5?60:200)+','+(R()>.5?60:200)+',0.25)'; rgc.fillRect(px*128,py*128,128,128);
}
grime(dg,1024,1024,420,true); scratches(dg,1024,1024,500);
dg.fillStyle='rgba(255,181,71,0.75)'; for(var s=0;s<1024;s+=48){ dg.save(); dg.translate(s,1000); dg.rotate(-0.8); dg.fillRect(0,0,22,60); dg.restore(); }
var deckMap=tex(deckC,3,3), deckRough=tex(roughC,3,3,false);

/* wall panels */
var wallC=cvs(1024,512), wg=wallC.getContext('2d');
wg.fillStyle='#3a414c'; wg.fillRect(0,0,1024,512);
for(var wx=0;wx<4;wx++) for(var wy=0;wy<2;wy++){
  var x0=wx*256+6,y0=wy*256+6; wg.fillStyle='hsl(216,9%,'+(30+R()*8)+'%)'; wg.fillRect(x0,y0,244,244);
  wg.strokeStyle='rgba(170,180,195,0.25)'; wg.strokeRect(x0+1,y0+1,242,242);
  if(R()>.55){ wg.fillStyle='#1b1f26'; for(var v=0;v<8;v++) wg.fillRect(x0+40,y0+60+v*16,164,7); }
  else if(R()>.5){ wg.fillStyle='#262b34'; wg.fillRect(x0+30,y0+30,184,184); wg.fillStyle='rgba(255,181,71,0.8)'; wg.fillRect(x0+30,y0+200,60,8); }
  wg.fillStyle='#1f232b'; [[12,12],[232,12],[12,232],[232,232]].forEach(function(p){ wg.beginPath(); wg.arc(x0+p[0],y0+p[1],4,0,7); wg.fill(); });
}
for(var st=0;st<26;st++){ var sx=R()*1024, gr2=wg.createLinearGradient(sx,0,sx,512); gr2.addColorStop(0,'rgba(0,0,0,0)'); gr2.addColorStop(0.4+R()*0.3,'rgba(20,14,8,'+(0.08+R()*0.15)+')'); gr2.addColorStop(1,'rgba(0,0,0,0)'); wg.fillStyle=gr2; wg.fillRect(sx,0,2+R()*8,512); }
grime(wg,1024,512,160,true); scratches(wg,1024,512,200);
var wallMap=tex(wallC,4,1);

/* hazard stripes */
var hzC=cvs(256,256), hg=hzC.getContext('2d'); hg.fillStyle='#1a1714'; hg.fillRect(0,0,256,256);
hg.fillStyle='#d99a2b'; for(var h=-256;h<512;h+=64){ hg.beginPath(); hg.moveTo(h,0); hg.lineTo(h+32,0); hg.lineTo(h+32-256,256); hg.lineTo(h-256,256); hg.closePath(); hg.fill(); }
grime(hg,256,256,60,true); scratches(hg,256,256,120);
var hazMap=tex(hzC,1,1);

/* cargo crate */
function crateTex(label, hue){ var c=cvs(512,512), g=c.getContext('2d'); g.fillStyle='hsl('+hue+',12%,32%)'; g.fillRect(0,0,512,512);
  g.fillStyle='hsl('+hue+',12%,22%)'; g.fillRect(0,0,512,40); g.fillRect(0,472,512,40); g.fillRect(0,0,40,512); g.fillRect(472,0,40,512);
  g.fillStyle='rgba(0,0,0,0.25)'; for(var i=80;i<472;i+=56) g.fillRect(40,i,432,10);
  g.fillStyle='#d9dde3'; g.font='bold 54px Arial, sans-serif'; g.textAlign='center'; g.fillText(label,256,270);
  g.fillStyle='#d99a2b'; g.fillRect(60,300,392,14);
  grime(g,512,512,90,true); scratches(g,512,512,160); return tex(c,1,1); }

/* hull */
var hullC=cvs(1024,512), hc=hullC.getContext('2d');
hc.fillStyle='#cfd4db'; hc.fillRect(0,0,1024,512);
hc.strokeStyle='rgba(90,100,115,0.55)'; hc.lineWidth=2;
for(var hx=0;hx<1024;hx+=128){ hc.beginPath(); hc.moveTo(hx,0); hc.lineTo(hx,512); hc.stroke(); }
for(var hy=0;hy<512;hy+=96){ hc.beginPath(); hc.moveTo(0,hy); hc.lineTo(1024,hy); hc.stroke(); }
hc.fillStyle='#e0592a'; hc.fillRect(0,250,1024,26); hc.fillStyle='#22304f'; hc.fillRect(0,282,1024,8);
hc.fillStyle='#22304f'; hc.font='bold 46px Arial, sans-serif'; hc.fillText('E-07',140,236); hc.fillText('E-07',660,236);
grime(hc,1024,512,140,true);
for(var sc=0;sc<6;sc++){ var cx=R()*1024, cy=150+R()*300, rr=40+R()*90, sg=hc.createRadialGradient(cx,cy,0,cx,cy,rr); sg.addColorStop(0,'rgba(15,10,6,0.85)'); sg.addColorStop(0.5,'rgba(40,24,12,0.4)'); sg.addColorStop(1,'rgba(0,0,0,0)'); hc.fillStyle=sg; hc.fillRect(cx-rr,cy-rr,rr*2,rr*2); }
scratches(hc,1024,512,260);
var hullMap=tex(hullC,1,1);

/* smoke sprite */
var smC=cvs(128,128), smg=smC.getContext('2d'), sgr=smg.createRadialGradient(64,64,0,64,64,64); sgr.addColorStop(0,'rgba(255,255,255,0.9)'); sgr.addColorStop(0.5,'rgba(255,255,255,0.35)'); sgr.addColorStop(1,'rgba(255,255,255,0)'); smg.fillStyle=sgr; smg.fillRect(0,0,128,128);
var smokeTex=new THREE.CanvasTexture(smC);

/* ---------- renderer / scene ---------- */
var renderer=new THREE.WebGLRenderer({canvas:canvas, antialias:true, powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.75));
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=0.82;
renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFSoftShadowMap;
var scene=new THREE.Scene();
scene.background=new THREE.Color(0x06080d);
scene.fog=new THREE.FogExp2(0x0b0f17,0.055);

var pm=new THREE.PMREMGenerator(renderer); var envRT=pm.fromScene(new RoomEnvironment(),0.04); scene.environment=envRT.texture; pm.dispose();

var camera=new THREE.PerspectiveCamera(38,1,0.1,80);
var camBase=new THREE.Vector3(0.4,1.7,7.4);
var lookBase=new THREE.Vector3(1.7,1.15,0);

function M(o){ var m=new THREE.MeshStandardMaterial(o); if(m.envMapIntensity!==undefined && o.envMapIntensity===undefined) m.envMapIntensity=0.35; return m; }
var mats={
  floor:M({map:deckMap, roughnessMap:deckRough, metalness:0.65, roughness:0.55}),
  wall:M({map:wallMap, metalness:0.55, roughness:0.62}),
  dark:M({color:0x1b1f27, metalness:0.8, roughness:0.45}),
  steel:M({color:0x8a919e, metalness:0.9, roughness:0.35}),
  copper:M({color:0xb3713f, metalness:1, roughness:0.35}),
  rubber:M({color:0x0d0f13, metalness:0, roughness:0.85}),
  red:M({color:0xa3241c, metalness:0.35, roughness:0.38}),
  cardboard:M({color:0x8a6a43, metalness:0, roughness:0.9}),
  haz:M({map:hazMap, metalness:0.4, roughness:0.6}),
  hull:M({map:hullMap, metalness:0.35, roughness:0.42, envMapIntensity:0.6}),
  glass:new THREE.MeshPhysicalMaterial({color:0x0a1422, metalness:0.1, roughness:0.06, clearcoat:1, clearcoatRoughness:0.05, envMapIntensity:1.2}),
  teal:new THREE.MeshStandardMaterial({color:0x000000, emissive:0x2ecc63, emissiveIntensity:1.3}),
  tealDim:new THREE.MeshStandardMaterial({color:0x000000, emissive:0x2ecc63, emissiveIntensity:0.55}),
  amber:new THREE.MeshStandardMaterial({color:0x000000, emissive:0xff3b1f, emissiveIntensity:2.4}),
  warm:new THREE.MeshStandardMaterial({color:0x000000, emissive:0xff5533, emissiveIntensity:2.6}),
  redLamp:new THREE.MeshStandardMaterial({color:0x000000, emissive:0xff2a1f, emissiveIntensity:2.5})
};

function box(w,h,d,mat,x,y,z,parent){ var m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat); m.position.set(x,y,z); m.castShadow=true; m.receiveShadow=true; (parent||scene).add(m); return m; }
function cyl(rt,rb,h,mat,x,y,z,parent,seg){ var m=new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,seg||24),mat); m.position.set(x,y,z); m.castShadow=true; m.receiveShadow=true; (parent||scene).add(m); return m; }

/* room shell: x -9..9, z -7..6, y 0..6 */
var floor=new THREE.Mesh(new THREE.PlaneGeometry(18,13),mats.floor); floor.rotation.x=-Math.PI/2; floor.position.z=-0.5; floor.receiveShadow=true; scene.add(floor);
var back=new THREE.Mesh(new THREE.PlaneGeometry(18,6),mats.wall); back.position.set(0,3,-7); back.receiveShadow=true; scene.add(back);
var lw=new THREE.Mesh(new THREE.PlaneGeometry(13,6),mats.wall); lw.rotation.y=Math.PI/2; lw.position.set(-9,3,-0.5); lw.receiveShadow=true; scene.add(lw);
var rw=lw.clone(); rw.rotation.y=-Math.PI/2; rw.position.x=9; scene.add(rw);
var ceil=new THREE.Mesh(new THREE.PlaneGeometry(18,13),mats.dark); ceil.rotation.x=Math.PI/2; ceil.position.set(0,6,-0.5); scene.add(ceil);

[-6,-4,-2,0,2,4].forEach(function(z){
  box(0.4,6,0.45,mats.dark,-8.8,3,z); box(0.4,6,0.45,mats.dark,8.8,3,z);
  box(18,0.4,0.45,mats.dark,0,5.8,z);
});
[-6.2,-2.6,1.0,4.6].forEach(function(x){ box(0.45,6,0.4,mats.dark,x,3,-6.8); });

/* floor-level light strips */
box(0.06,0.06,12,mats.teal,-8.55,0.18,-0.8); box(0.06,0.06,12,mats.teal,8.55,0.18,-0.8);
/* ceiling light panels (one dead, one flickering) */
var ceilLamps=[];
[[-3,-5],[0,-5],[3,-5],[-3,-1],[0,-1],[3,-1],[-3,3],[3,3]].forEach(function(p,i){
  var mat = (i===4)? mats.dark : (i===2? mats.warm.clone() : mats.warm);
  var m=box(1.2,0.05,0.35,mat,p[0],5.95,p[1]); if(i===2) ceilLamps.push(m);
});

/* pipes along left wall */
[3.4,3.75].forEach(function(y,i){ var p=cyl(i?0.08:0.13,i?0.08:0.13,13,mats.copper,-8.5,y,-0.5,null,20); p.rotation.x=Math.PI/2; });
[-5,-1,3].forEach(function(z){ var v=new THREE.Mesh(new THREE.TorusGeometry(0.18,0.035,10,24),M({color:0x9c1f17,metalness:0.4,roughness:0.5})); v.position.set(-8.3,3.4,z); v.rotation.y=Math.PI/2; scene.add(v); });

/* bulkhead door + catwalk on back wall */
box(5.2,4.2,0.5,mats.dark,0.6,2.1,-6.75);
box(2.3,3.8,0.2,mats.wall,-0.6,1.9,-6.45); box(2.3,3.8,0.2,mats.wall,1.8,1.9,-6.45);
var seam=box(0.3,3.8,0.22,mats.haz,0.6,1.9,-6.44);
box(3.2,0.1,0.1,mats.amber,0.6,4.15,-6.45);
box(18,0.12,1.2,mats.dark,0,4.6,-6.3);
for(var rx2=-8;rx2<=8;rx2+=1.0){ cyl(0.025,0.025,0.9,mats.steel,rx2,5.05,-5.75,null,8); }
var rail=cyl(0.03,0.03,17,mats.steel,0,5.5,-5.75,null,8); rail.rotation.z=Math.PI/2;
/* rotating beacons */
var beacons=[];
[[-2.1,4.25],[3.3,4.25]].forEach(function(p){
  cyl(0.12,0.14,0.22,mats.redLamp,p[0],p[1],-6.4);
  var sl=new THREE.SpotLight(0xff2014,1.8,11,0.26,0.5,1.5); sl.position.set(p[0],p[1],-6.3);
  var tgt=new THREE.Object3D(); scene.add(tgt); sl.target=tgt; scene.add(sl); beacons.push({l:sl,t:tgt,x:p[0],y:p[1]});
});

/* ---------- crashed shuttle ---------- */
var ship=new THREE.Group(); scene.add(ship);
ship.position.set(3.6,0.62,-5.0); ship.rotation.set(-0.03,-0.95,0.11); ship.scale.setScalar(0.9);
var prof=[[0.0,0],[0.32,0.18],[0.6,0.55],[0.74,1.1],[0.8,2.0],[0.76,2.8],[0.62,3.4],[0.5,3.75],[0.0,3.8]].map(function(p){return new THREE.Vector2(p[0],p[1]);});
var fus=new THREE.Mesh(new THREE.LatheGeometry(prof,48),mats.hull); fus.rotation.z=Math.PI/2; fus.position.x=1.9; fus.castShadow=true; fus.receiveShadow=true; ship.add(fus);
var canopy=new THREE.Mesh(new THREE.SphereGeometry(0.62,32,16,0,Math.PI*2,0,Math.PI/2.4),mats.glass); canopy.scale.set(1.25,0.48,0.72); canopy.position.set(1.15,0.5,0); ship.add(canopy);
var crack=new THREE.Mesh(new THREE.PlaneGeometry(0.4,0.02),M({color:0xdde6f0,metalness:0,roughness:0.3})); crack.position.set(0.9,0.84,0.12); crack.rotation.set(-1.2,0,0.5); ship.add(crack);
function wing(len, sweep){ var sh=new THREE.Shape(); sh.moveTo(0,0); sh.lineTo(len,sweep); sh.lineTo(len,sweep+0.35); sh.lineTo(0,1.2); sh.lineTo(0,0);
  var g=new THREE.ExtrudeGeometry(sh,{depth:0.07,bevelEnabled:true,bevelSize:0.02,bevelThickness:0.02,bevelSegments:2}); var m=new THREE.Mesh(g,mats.hull); m.castShadow=true; m.receiveShadow=true; return m; }
var wl=wing(1.6,0.7); wl.rotation.set(-Math.PI/2,0,Math.PI/2); wl.position.set(-0.6,-0.15,0.65); ship.add(wl);
var wr=wing(1.05,0.5); wr.rotation.set(Math.PI/2,0,-Math.PI/2+0.25); wr.position.set(-0.6,-0.2,-0.65); ship.add(wr);
var fin=wing(0.9,0.6); fin.rotation.set(0,0,Math.PI/2+0.35); fin.position.set(-1.1,0.55,-0.035); fin.scale.set(1,0.8,1); ship.add(fin);
[0.3,-0.3].forEach(function(z,i){ var e=cyl(0.2,0.24,0.5,mats.dark,-1.95,-0.05,z,ship,24); e.rotation.z=Math.PI/2;
  var g=new THREE.Mesh(new THREE.CircleGeometry(0.15,24), i? mats.dark : mats.tealDim); g.position.set(-2.21,-0.05,z); g.rotation.y=-Math.PI/2; ship.add(g); });
var leg1=cyl(0.05,0.05,0.7,mats.steel,0.9,-0.6,0.4,ship,10); leg1.rotation.x=0.2;
var leg2=cyl(0.05,0.05,0.35,mats.steel,-0.8,-0.55,-0.45,ship,10); leg2.rotation.z=1.0;
var engineLight=new THREE.PointLight(0x2ecc63,0.9,3.5,2); engineLight.position.set(-2.5,-0.05,0.3); ship.add(engineLight);
/* debris around ship */
for(var d=0;d<14;d++){ var db=box(0.1+R()*0.5,0.03+R()*0.06,0.1+R()*0.4,R()>.5?mats.hull:mats.dark,1.8+R()*4,0.03,-5.5+R()*3.5); db.rotation.set(R()*0.2,R()*3,R()*0.2); }

/* ---------- props ---------- */
/* rolling tool cabinet */
var cab=new THREE.Group(); scene.add(cab); cab.position.set(-6.3,0,-1.2); cab.rotation.y=0.5;
box(1.2,1.25,0.65,mats.red,0,0.72,0,cab); box(1.3,0.08,0.72,mats.dark,0,1.38,0,cab);
[0.3,0.55,0.8,1.05].forEach(function(y,i){ box(1.14,0.02,0.02,mats.dark,0,y,0.33,cab); var hnd=box(0.4,0.03,0.04,mats.steel,0,y+0.1,0.35,cab); });
box(1.1,0.2,0.6,mats.red,0,0.94,0.32,cab);
[[-0.5,-0.25],[0.5,-0.25],[-0.5,0.25],[0.5,0.25]].forEach(function(p){ var w=cyl(0.06,0.06,0.05,mats.rubber,p[0],0.06,p[1],cab,12); w.rotation.x=Math.PI/2; });
/* shelving with stock */
var shelf=new THREE.Group(); scene.add(shelf); shelf.position.set(-7.6,0,-4.6); shelf.rotation.y=0.25;
[[-1.2,-0.3],[1.2,-0.3],[-1.2,0.3],[1.2,0.3]].forEach(function(p){ box(0.06,2.6,0.06,mats.steel,p[0],1.3,p[1],shelf); });
[0.25,0.95,1.65,2.35].forEach(function(y){ box(2.5,0.04,0.7,mats.steel,0,y,0,shelf); });
var crateA=crateTex('CARGO 07-B',215), crateB=crateTex('MED KIT',150), crateC=crateTex('O2 CELL',30);
var crateMats=[M({map:crateA,metalness:0.5,roughness:0.55}),M({map:crateB,metalness:0.4,roughness:0.6}),M({map:crateC,metalness:0.4,roughness:0.6}),mats.cardboard];
[0.25,0.95,1.65].forEach(function(y){ var x=-1.05; while(x<1.0){ var w=0.3+R()*0.35, hh=0.25+R()*0.35; var b=box(w,hh,0.5,crateMats[Math.floor(R()*4)],x+w/2,y+0.02+hh/2,0,shelf); b.rotation.y=(R()-.5)*0.25; x+=w+0.05; } });
var fallen=box(0.45,0.35,0.45,mats.cardboard,-6.5,0.17,-3.6); fallen.rotation.set(0.1,0.7,0.35);
/* crate stack */
var cr1=box(1.0,1.0,1.0,crateMats[0],-4.6,0.5,-5.6); cr1.rotation.y=0.2;
var cr2=box(0.8,0.8,0.8,crateMats[2],-4.5,1.4,-5.5); cr2.rotation.y=-0.25;
var cr3=box(0.9,0.9,0.9,crateMats[1],-3.3,0.45,-5.9); cr3.rotation.y=0.6;
var tipped=box(0.8,0.8,0.8,crateMats[0],4.2,0.32,-2.6); tipped.rotation.set(0.0,0.4,0.9);
/* barrels */
cyl(0.32,0.32,0.95,M({color:0x2d4a63,metalness:0.6,roughness:0.5}),-5.4,0.48,-3.5,null,28);
var b2=cyl(0.32,0.32,0.95,M({color:0x6b2a1d,metalness:0.6,roughness:0.5}),-4.7,0.32,-2.9,null,28); b2.rotation.set(Math.PI/2,0,0.6);
/* open toolbox + wrench near podium */
var tb=new THREE.Group(); scene.add(tb); tb.position.set(2.5,0,0.5); tb.rotation.y=-0.5; tb.scale.setScalar(0.75);
box(0.7,0.28,0.32,mats.red,0,0.14,0,tb); var lid=box(0.7,0.04,0.32,mats.red,0,0.36,-0.2,tb); lid.rotation.x=-1.1;
var wr1=box(0.5,0.035,0.06,mats.steel,0.6,0.02,0.4,tb); wr1.rotation.y=0.8;
var wrh=new THREE.Mesh(new THREE.TorusGeometry(0.06,0.018,8,16,4.6),mats.steel); wrh.position.set(0.79,0.025,0.59); wrh.rotation.x=-Math.PI/2; tb.add(wrh);
for(var bo=0;bo<10;bo++){ cyl(0.02,0.02,0.05,mats.steel,1.6+R()*1.6,0.025,-0.4+R()*1.4,null,6).rotation.z=Math.PI/2; }

/* broken wall panel with exposed wiring (left wall) */
var hole=box(0.06,1.1,1.4,M({color:0x050608,metalness:0,roughness:1}),-8.97,2.7,0.6);
var ripped=box(0.04,1.2,1.0,mats.wall,-8.5,1.1,1.6); ripped.rotation.set(0.2,0.3,-0.5);
var wireMats=[M({color:0xa3241c,roughness:0.6}),M({color:0xd99a2b,roughness:0.6}),M({color:0x2b5bd9,roughness:0.6})];
wireMats.forEach(function(m,i){ var c=new THREE.CatmullRomCurve3([new THREE.Vector3(-8.95,3.1,0.3+i*0.2),new THREE.Vector3(-8.7,2.6,0.4+i*0.25),new THREE.Vector3(-8.55,2.2,0.7+i*0.15),new THREE.Vector3(-8.6,1.9+i*0.1,0.9+i*0.1)]); var t=new THREE.Mesh(new THREE.TubeGeometry(c,24,0.02,8),m); t.castShadow=true; scene.add(t); });
var sparkOrigin=new THREE.Vector3(-8.6,2.0,0.95);
/* emergency light */
box(0.12,0.2,0.5,mats.redLamp,-8.85,4.3,-1.4);
var redLight=new THREE.PointLight(0xff2a1f,1.5,9,2); redLight.position.set(-8.3,4.2,-1.4); scene.add(redLight);
/* hanging cables */
function hang(a,b,sag,r){ var mid=a.clone().add(b).multiplyScalar(0.5); mid.y-=sag; var c=new THREE.CatmullRomCurve3([a,mid,b]); var t=new THREE.Mesh(new THREE.TubeGeometry(c,32,r||0.035,8),mats.rubber); t.castShadow=true; scene.add(t); return t; }
hang(new THREE.Vector3(-5,5.9,-2),new THREE.Vector3(-1.5,5.9,-3),1.6,0.04);
hang(new THREE.Vector3(1.5,5.9,1),new THREE.Vector3(5,5.9,-0.5),1.2,0.05);
hang(new THREE.Vector3(-7,5.9,2),new THREE.Vector3(-4,5.9,3),0.9,0.03);
/* dangling ceiling panel */
var dangle=new THREE.Group(); dangle.position.set(1.4,5.9,-3.2); scene.add(dangle);
box(1.2,0.05,0.9,mats.wall,0.45,-0.95,0,dangle).rotation.set(0.15,0,-1.1);
cyl(0.012,0.012,0.7,mats.steel,0,-0.35,0,dangle,6);
/* swinging work lamp */
var lamp=new THREE.Group(); lamp.position.set(-2.4,6,0.6); scene.add(lamp);
cyl(0.01,0.01,1.5,mats.rubber,0,-0.75,0,lamp,6);
var shade=new THREE.Mesh(new THREE.ConeGeometry(0.22,0.22,24,1,true),M({color:0x3a414c,metalness:0.7,roughness:0.4,side:THREE.DoubleSide})); shade.position.y=-1.55; lamp.add(shade);
var bulb=new THREE.Mesh(new THREE.SphereGeometry(0.07,16,8),mats.warm.clone()); bulb.position.y=-1.64; lamp.add(bulb);
var lampLight=new THREE.PointLight(0xff4433,1.3,7,2); lampLight.position.y=-1.7; lampLight.castShadow=true; lampLight.shadow.mapSize.set(512,512); lampLight.shadow.bias=-0.003; lamp.add(lampLight);

/* ---------- extra damage: tools, cut wires, arc, alarm ---------- */
var tipObjs=[];
/* scorch + crack decals on the floor */
function decalTex(kind){ var c=cvs(256,256), g=c.getContext('2d');
  if(kind==='scorch'){ var gr=g.createRadialGradient(128,128,0,128,128,128); gr.addColorStop(0,'rgba(8,5,3,0.9)'); gr.addColorStop(0.45,'rgba(25,14,6,0.55)'); gr.addColorStop(1,'rgba(0,0,0,0)'); g.fillStyle=gr; g.fillRect(0,0,256,256); }
  else { g.strokeStyle='rgba(5,6,8,0.9)'; g.lineWidth=3; for(var b=0;b<5;b++){ var x=128,y=128; g.beginPath(); g.moveTo(x,y); for(var k=0;k<7;k++){ x+= (R()-0.5)*60; y+= (R()-0.5)*60; g.lineTo(x,y);} g.stroke(); } }
  var t=new THREE.CanvasTexture(c); t.colorSpace=THREE.SRGBColorSpace; return t; }
var scorchT=decalTex('scorch'), crackT=decalTex('crack');
function decal(t,x,z,sz,rot){ var m=new THREE.Mesh(new THREE.PlaneGeometry(sz,sz),new THREE.MeshStandardMaterial({map:t,transparent:true,depthWrite:false,roughness:0.9,polygonOffset:true,polygonOffsetFactor:-2})); m.rotation.set(-Math.PI/2,0,rot||0); m.position.set(x,0.006,z); m.receiveShadow=true; scene.add(m); }
decal(scorchT,2.2,-3.6,3.2,0); decal(scorchT,-8.2,1.2,2.2,0); decal(scorchT,-1.6,-2.8,1.4,1); decal(crackT,-1.8,1.4,1.8,0.4); decal(crackT,1.2,-1.8,2.2,1.9); decal(crackT,-4.2,0.2,1.6,2.7);

/* hand tools scattered on the floor */
var gripMats=[M({color:0xd13b2a,roughness:0.5}),M({color:0xe0a21f,roughness:0.5}),M({color:0x2a5bd1,roughness:0.5}),M({color:0x1c1f25,roughness:0.6})];
function onFloor(o,x,z,ry){ o.position.set(x,0,z); o.rotation.y=ry; o.traverse(function(m){ if(m.isMesh){m.castShadow=true;m.receiveShadow=true;} }); scene.add(o); return o; }
function hammer(){ var g=new THREE.Group(); var h=new THREE.Mesh(new THREE.CylinderGeometry(0.018,0.022,0.36,10),gripMats[3]); h.rotation.z=Math.PI/2; h.position.y=0.022; g.add(h); var hd=new THREE.Mesh(new THREE.BoxGeometry(0.05,0.05,0.14),mats.steel); hd.position.set(0.19,0.03,0); g.add(hd); return g; }
function screwdriver(col){ var g=new THREE.Group(); var h=new THREE.Mesh(new THREE.CylinderGeometry(0.018,0.018,0.12,10),gripMats[col]); h.rotation.z=Math.PI/2; h.position.y=0.019; g.add(h); var sh=new THREE.Mesh(new THREE.CylinderGeometry(0.005,0.005,0.16,6),mats.steel); sh.rotation.z=Math.PI/2; sh.position.set(0.14,0.019,0); g.add(sh); return g; }
function spanner(len){ var g=new THREE.Group(); var b=new THREE.Mesh(new THREE.BoxGeometry(len,0.012,0.04),mats.steel); b.position.y=0.008; g.add(b); var e=new THREE.Mesh(new THREE.TorusGeometry(0.035,0.012,8,16,4.8),mats.steel); e.rotation.x=-Math.PI/2; e.position.set(len/2+0.03,0.01,0); g.add(e); var e2=e.clone(); e2.position.x=-len/2-0.03; e2.rotation.z=Math.PI; g.add(e2); return g; }
function pliers(){ var g=new THREE.Group(); [0.35,-0.35].forEach(function(a){ var arm=new THREE.Mesh(new THREE.BoxGeometry(0.2,0.012,0.022),gripMats[0]); arm.rotation.y=a; arm.position.set(-0.05,0.008,0); g.add(arm); }); var jaw=new THREE.Mesh(new THREE.BoxGeometry(0.08,0.014,0.03),mats.steel); jaw.position.set(0.08,0.008,0); g.add(jaw); return g; }
function drill(){ var g=new THREE.Group(); var b=new THREE.Mesh(new THREE.BoxGeometry(0.22,0.08,0.07),M({color:0xe0a21f,roughness:0.45})); b.position.set(0,0.12,0); g.add(b); var hd=new THREE.Mesh(new THREE.BoxGeometry(0.06,0.14,0.06),gripMats[3]); hd.position.set(-0.05,0.05,0); g.add(hd); var ch=new THREE.Mesh(new THREE.CylinderGeometry(0.02,0.015,0.08,10),mats.steel); ch.rotation.z=Math.PI/2; ch.position.set(0.15,0.12,0); g.add(ch); g.rotation.z=1.45; g.position.y=0.04; return g; }
onFloor(hammer(),1.5,2.2,0.5).scale.setScalar(1.5); onFloor(screwdriver(1),0.6,2.7,2.2).scale.setScalar(1.5); onFloor(screwdriver(2),2.0,1.5,-0.7).scale.setScalar(1.5);
onFloor(spanner(0.22),2.5,2.4,1.2).scale.setScalar(1.5); onFloor(spanner(0.3),0.1,3.0,-0.3).scale.setScalar(1.5); onFloor(pliers(),1.2,3.2,2.6).scale.setScalar(1.5);
var dr=new THREE.Group(); dr.add(drill()); onFloor(dr,3.0,1.1,0.9).scale.setScalar(1.4);
onFloor(screwdriver(0),-1.4,2.4,-1.1).scale.setScalar(1.5); onFloor(hammer(),3.4,-0.6,2.4).scale.setScalar(1.5);
for(var gs=0;gs<18;gs++){ var sh=new THREE.Mesh(new THREE.TetrahedronGeometry(0.03+R()*0.04),mats.glass); sh.position.set(2.4+R()*2,0.02,-3.4+R()*1.6); sh.rotation.set(R()*3,R()*3,R()*3); scene.add(sh); }

/* cut wires hanging from the ceiling and back wall, with live ends */
function cutWire(top, pts, col, r){ var g=new THREE.Group(); g.position.copy(top); scene.add(g);
  var curve=new THREE.CatmullRomCurve3([new THREE.Vector3()].concat(pts)); var tube=new THREE.Mesh(new THREE.TubeGeometry(curve,40,r||0.022,8),M({color:col,roughness:0.6})); tube.castShadow=true; g.add(tube);
  var end=pts[pts.length-1]; var tip=new THREE.Mesh(new THREE.CylinderGeometry(0.006,0.01,0.06,6),mats.copper); tip.position.copy(end); tip.position.y-=0.03; g.add(tip);
  var glow=new THREE.Mesh(new THREE.SphereGeometry(0.015,8,6),mats.amber); glow.position.copy(end); glow.position.y-=0.06; g.add(glow);
  tipObjs.push({obj:glow,group:g}); return g; }
var cw1=cutWire(new THREE.Vector3(-1.4,6,-4.2),[new THREE.Vector3(0.2,-0.9,0.1),new THREE.Vector3(0.1,-1.8,0.3),new THREE.Vector3(0.25,-2.4,0.25)],0x15171c,0.03);
var cw2=cutWire(new THREE.Vector3(-1.3,6,-4.0),[new THREE.Vector3(-0.1,-0.8,0.0),new THREE.Vector3(-0.2,-1.5,0.1)],0xa3241c,0.018);
var cw3=cutWire(new THREE.Vector3(5.6,6,-1.8),[new THREE.Vector3(-0.2,-1.0,0.2),new THREE.Vector3(-0.1,-2.0,0.1),new THREE.Vector3(-0.3,-2.7,0.3)],0x15171c,0.035);
var cw4=cutWire(new THREE.Vector3(-4.2,4.5,-6.6),[new THREE.Vector3(0.2,-0.6,0.3),new THREE.Vector3(0.4,-1.1,0.45)],0xd99a2b,0.018);
var cutWires=[cw1,cw2,cw3,cw4];

/* electric arc on the back wall between a torn conduit */
var arcA=new THREE.Vector3(-3.7,2.65,-6.55), arcB=new THREE.Vector3(-2.75,2.0,-6.55);
[arcA,arcB].forEach(function(p,i){ var c=cyl(0.06,0.06,0.5,mats.dark,p.x+(i?0.25:-0.25),p.y,p.z,null,12); c.rotation.z=Math.PI/2+(i?0.35:-0.35); });
var burn=new THREE.Mesh(new THREE.PlaneGeometry(1.8,1.6),new THREE.MeshStandardMaterial({map:scorchT,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2})); burn.position.set(-3.2,2.35,-6.69); scene.add(burn);
var ARC_N=16, arcLines=[];
for(var al=0;al<3;al++){ var ag=new THREE.BufferGeometry(); ag.setAttribute('position',new THREE.BufferAttribute(new Float32Array(ARC_N*3),3)); var line=new THREE.Line(ag,new THREE.LineBasicMaterial({color:al?0x7fc8ff:0xffffff,transparent:true,opacity:al?0.7:1,blending:THREE.AdditiveBlending,depthWrite:false})); line.visible=false; scene.add(line); arcLines.push(line); }
var arcLight=new THREE.PointLight(0x2ecc63,0,6,2); arcLight.position.set(-3.2,2.35,-6.1); scene.add(arcLight);
var arcOn=0, arcNext=0.8;
function updateArc(){ arcLines.forEach(function(line,li){ var a=line.geometry.attributes.position.array; for(var k=0;k<ARC_N;k++){ var t=k/(ARC_N-1), env=Math.sin(Math.PI*t)*(0.16+li*0.03); a[k*3]=arcA.x+(arcB.x-arcA.x)*t+(Math.random()-0.5)*env; a[k*3+1]=arcA.y+(arcB.y-arcA.y)*t+(Math.random()-0.5)*env; a[k*3+2]=arcA.z+0.02*li; } line.geometry.attributes.position.needsUpdate=true; }); }
tipObjs.push({obj:new THREE.Object3D(),group:null,fixed:arcB.clone().add(new THREE.Vector3(0,0,0.1))});

/* red alarm beacon + alert sign on the back wall */
var alarm=new THREE.Group(); alarm.position.set(-3.5,4.1,-6.55); scene.add(alarm);
var abase=new THREE.Mesh(new THREE.CylinderGeometry(0.16,0.18,0.08,24),mats.dark); abase.rotation.x=Math.PI/2; alarm.add(abase);
var domeMat=new THREE.MeshStandardMaterial({color:0x330000,emissive:0xff1a10,emissiveIntensity:2,transparent:true,opacity:0.9,roughness:0.2});
var dome=new THREE.Mesh(new THREE.SphereGeometry(0.15,24,12,0,Math.PI*2,0,Math.PI/2),domeMat); dome.rotation.x=Math.PI/2; dome.position.z=0.04; alarm.add(dome);
var spinner=new THREE.Group(); spinner.position.z=0.12; alarm.add(spinner);
var alarmSpots=[0,Math.PI].map(function(a){ var sl=new THREE.SpotLight(0xff2014,2.6,16,0.32,0.55,1.4); spinner.add(sl); var tg=new THREE.Object3D(); tg.position.set(Math.cos(a)*4,Math.sin(a)*4,3); spinner.add(tg); sl.target=tg; return sl; });
var signC=cvs(512,128), sgc=signC.getContext('2d'); sgc.fillStyle='#120404'; sgc.fillRect(0,0,512,128); sgc.strokeStyle='#ff2a1f'; sgc.lineWidth=6; sgc.strokeRect(8,8,496,112); sgc.fillStyle='#ff3b30'; sgc.font='bold 52px Arial, sans-serif'; sgc.textAlign='center'; sgc.fillText('HULL BREACH',256,84);
var signT=new THREE.CanvasTexture(signC); signT.colorSpace=THREE.SRGBColorSpace;
var signMat=new THREE.MeshStandardMaterial({map:signT,emissive:0xffffff,emissiveMap:signT,emissiveIntensity:1.6,roughness:0.4});
var sign=new THREE.Mesh(new THREE.PlaneGeometry(1.6,0.4),signMat); sign.position.set(-3.5,3.5,-6.66); scene.add(sign);
var alarmWash=new THREE.PointLight(0xff1a10,0,18,2); alarmWash.position.set(-2,4.5,-3); scene.add(alarmWash);

/* ---------- more detail + emergency red lighting ---------- */
var redStrip=new THREE.MeshStandardMaterial({color:0x000000,emissive:0xff1a10,emissiveIntensity:1.5});
box(0.05,0.08,12,redStrip,-8.6,2.2,-0.8); box(0.05,0.08,12,redStrip,8.6,2.2,-0.8);
box(16,0.06,0.05,redStrip,0,0.1,-6.65);
[-6,-2,2].forEach(function(z){ box(0.3,0.08,0.18,redStrip,-4.5,5.6,z); box(0.3,0.08,0.18,redStrip,4.5,5.6,z); });
[-1.9,3.1].forEach(function(x){ box(0.08,0.4,0.08,redStrip,x,0.2,-6.4); });
var redPts=[new THREE.PointLight(0xff1a10,0,10,2),new THREE.PointLight(0xff1a10,0,10,2)];
redPts[0].position.set(-6,2.4,0.5); redPts[1].position.set(5,2.6,-1.5); redPts.forEach(function(l){scene.add(l);});
var fogBase=new THREE.Color(0x0b0f17), fogRed=new THREE.Color(0x2a0a0a);

/* fire extinguisher on a wall bracket */
var ext=new THREE.Group(); ext.position.set(-8.75,0,-2.6); scene.add(ext);
cyl(0.11,0.11,0.6,M({color:0xb3160f,metalness:0.4,roughness:0.3}),0.12,0.95,0,ext,24);
cyl(0.05,0.07,0.1,mats.dark,0.12,1.3,0,ext,12);
box(0.04,0.5,0.28,mats.steel,0,1.0,0,ext);
var hose=new THREE.Mesh(new THREE.TorusGeometry(0.1,0.015,8,20,3.2),mats.rubber); hose.position.set(0.2,1.15,0); hose.rotation.y=Math.PI/2; ext.add(hose);

/* damaged control console against the left wall */
function screenTex(kind){ var c=cvs(256,160), g=c.getContext('2d'); g.fillStyle='#050608'; g.fillRect(0,0,256,160);
  if(kind==='warn'){ g.fillStyle='#ff2a1f'; g.fillRect(0,0,256,30); g.fillStyle='#120404'; g.font='bold 20px Arial, sans-serif'; g.fillText('WARNING',12,22); g.fillStyle='#ff6a5c'; g.font='13px monospace'; ['HULL INTEGRITY  31%','O2 PRESSURE     LOW','POWER BUS 2     FAIL','BAY DOOR        SEALED'].forEach(function(l,i){ g.fillText(l,12,56+i*24); }); }
  else { g.strokeStyle='#3dd6c4'; g.lineWidth=2; g.beginPath(); for(var x=0;x<256;x+=8){ var y=90+Math.sin(x*0.08)*30*(R()*0.6+0.4); x? g.lineTo(x,y):g.moveTo(x,y);} g.stroke(); g.fillStyle='rgba(61,214,196,0.6)'; for(var b=0;b<10;b++) g.fillRect(14+b*23,140-R()*40,14,R()*40); }
  g.strokeStyle='rgba(230,240,255,0.55)'; g.lineWidth=1.2; for(var k=0;k<5;k++){ var x0=150+R()*60,y0=40+R()*60; g.beginPath(); g.moveTo(x0,y0); for(var q=0;q<4;q++){ x0+=(R()-0.5)*70; y0+=(R()-0.5)*70; g.lineTo(x0,y0);} g.stroke(); }
  var t=new THREE.CanvasTexture(c); t.colorSpace=THREE.SRGBColorSpace; return t; }
var con=new THREE.Group(); con.position.set(-8.2,0,-4.0); con.rotation.y=Math.PI/2; scene.add(con);
box(1.8,0.9,0.7,mats.dark,0,0.45,0,con);
var desk=box(1.8,0.06,0.6,M({color:0x2a313f,metalness:0.7,roughness:0.4}),0,0.95,0.12,con); desk.rotation.x=-0.35;
var scrMats=[];
[['warn',-0.45],['graph',0.45]].forEach(function(d){ var tx=screenTex(d[0]); var mm=new THREE.MeshStandardMaterial({map:tx,emissive:0xffffff,emissiveMap:tx,emissiveIntensity:1.1,roughness:0.25}); scrMats.push(mm);
  box(0.82,0.52,0.05,mats.dark,d[1],1.45,-0.18,con); var sc2=new THREE.Mesh(new THREE.PlaneGeometry(0.74,0.46),mm); sc2.position.set(d[1],1.45,-0.15); con.add(sc2); });
var btnMats=[mats.redLamp,mats.amber,mats.tealDim];
for(var bi=0;bi<14;bi++){ var bt=box(0.05,0.02,0.05,btnMats[bi%3],-0.75+bi*0.11,0.99,0.12+(bi%2)*0.12,con); bt.rotation.x=-0.35; }

/* oxygen tank rack */
var rack=new THREE.Group(); rack.position.set(-6.6,0,-6.3); scene.add(rack);
[[-0.4,0x2f7d52],[0,0xd9dde3],[0.4,0x2f7d52]].forEach(function(t){ cyl(0.16,0.16,1.4,M({color:t[1],metalness:0.5,roughness:0.35}),t[0],0.7,0,rack,24); var cap=new THREE.Mesh(new THREE.SphereGeometry(0.16,16,8,0,Math.PI*2,0,Math.PI/2),M({color:t[1],metalness:0.5,roughness:0.35})); cap.position.set(t[0],1.4,0); rack.add(cap); cyl(0.03,0.03,0.12,mats.steel,t[0],1.6,0,rack,8); });
box(1.3,0.06,0.06,mats.steel,0,1.0,0.17,rack); box(1.3,0.06,0.06,mats.steel,0,0.4,0.17,rack);
var fallenTank=cyl(0.16,0.16,1.4,M({color:0x2f7d52,metalness:0.5,roughness:0.35}),-5.6,0.16,-5.4,null,24); fallenTank.rotation.set(0,0.5,Math.PI/2);

/* spinning wall vent fan on the back wall */
var fan=new THREE.Group(); fan.position.set(5.2,2.6,-6.66); scene.add(fan);
var fr=new THREE.Mesh(new THREE.TorusGeometry(0.55,0.06,12,40),mats.dark); fan.add(fr);
var hub=new THREE.Mesh(new THREE.CylinderGeometry(0.1,0.1,0.08,16),mats.steel); hub.rotation.x=Math.PI/2; fan.add(hub);
var blades=new THREE.Group(); fan.add(blades);
for(var fb=0;fb<5;fb++){ var bl=new THREE.Mesh(new THREE.BoxGeometry(0.12,0.46,0.02),mats.steel); bl.position.y=0.27; var piv=new THREE.Group(); piv.rotation.z=fb/5*Math.PI*2; bl.rotation.y=0.4; piv.add(bl); blades.add(piv); }
var grill=new THREE.Mesh(new THREE.CircleGeometry(0.55,40),new THREE.MeshStandardMaterial({color:0x000000,roughness:1})); grill.position.z=-0.02; fan.add(grill);

/* floor vent grates with steam */
function grate(x,z,w,d){ var c=cvs(128,128), g=c.getContext('2d'); g.fillStyle='#08090c'; g.fillRect(0,0,128,128); g.fillStyle='#4a5260'; for(var i=0;i<128;i+=16) g.fillRect(i,0,8,128); var t=tex(c,w*3,d*3); var m=new THREE.Mesh(new THREE.PlaneGeometry(w,d),M({map:t,metalness:0.8,roughness:0.5})); m.rotation.x=-Math.PI/2; m.position.set(x,0.008,z); m.receiveShadow=true; scene.add(m); }
grate(-2.6,-1.2,0.9,0.6); grate(-6.5,1.6,1.2,0.6); grate(0.6,-5.3,2.2,0.5);

/* worn floor stencil near the bay door */
var stC=cvs(512,128), stg=stC.getContext('2d'); stg.fillStyle='rgba(0,0,0,0)'; stg.fillRect(0,0,512,128); stg.fillStyle='rgba(224,170,60,0.75)'; stg.font='bold 80px Arial, sans-serif'; stg.textAlign='center'; stg.fillText('KEEP CLEAR',256,96); stg.globalCompositeOperation='destination-out'; for(var w2=0;w2<220;w2++){ stg.fillRect(R()*512,R()*128,2+R()*8,2+R()*5); }
var stT=new THREE.CanvasTexture(stC); stT.colorSpace=THREE.SRGBColorSpace;
var sten=new THREE.Mesh(new THREE.PlaneGeometry(2.6,0.65),new THREE.MeshStandardMaterial({map:stT,transparent:true,depthWrite:false,roughness:0.9,polygonOffset:true,polygonOffsetFactor:-2})); sten.rotation.x=-Math.PI/2; sten.position.set(0.6,0.007,-4.4); scene.add(sten);

/* loose power cables snaking across the floor */
function floorCable(pts,r,col){ var c=new THREE.CatmullRomCurve3(pts.map(function(p){return new THREE.Vector3(p[0],r,p[1]);})); var t=new THREE.Mesh(new THREE.TubeGeometry(c,60,r,8),M({color:col,roughness:0.7})); t.castShadow=true; t.receiveShadow=true; scene.add(t); }
floorCable([[-8.4,-4],[-6.8,-3.2],[-5.2,-3.6],[-3.6,-2.2],[-2.2,-2.6],[-1.6,-4.4]],0.04,0x15171c);
floorCable([[-8.4,-3.8],[-7,-2.6],[-4.8,-1.6],[-3.2,0.2],[-1.8,0.4]],0.03,0xd99a2b);
floorCable([[1.6,-2.4],[2.6,-1.2],[3.8,-1.4],[4.6,0.4]],0.035,0x15171c);

/* ---------- more wiring: right side + on the crashed shuttle ---------- */
var V=function(x,y,z){return new THREE.Vector3(x,y,z);};
/* right side: cut cables from the ceiling with live ends */
cutWires.push(cutWire(V(3.6,6,-3.0),[V(0.1,-1.0,0.2),V(-0.15,-2.1,0.1),V(0.1,-2.9,0.3)],0x15171c,0.032));
cutWires.push(cutWire(V(3.75,6,-2.9),[V(-0.1,-0.9,0.05),V(0.05,-1.7,0.2)],0xa3241c,0.016));
cutWires.push(cutWire(V(5.0,6,-0.6),[V(0.2,-1.2,0.0),V(0.0,-2.4,0.25),V(0.25,-3.3,0.1)],0x15171c,0.04));
cutWires.push(cutWire(V(5.15,6,-0.5),[V(0.1,-0.8,0.1),V(-0.1,-1.6,0.0),V(0.0,-2.0,0.15)],0xd99a2b,0.016));
cutWires.push(cutWire(V(6.6,6,-3.8),[V(-0.2,-1.0,0.1),V(-0.1,-2.2,0.3)],0x2b5bd9,0.018));
/* right side: cable runs sagging between wall and ceiling */
hang(V(8.8,5.6,-6),V(8.8,5.6,-2.5),1.8,0.045);
hang(V(8.8,4.6,-1.5),V(6.2,5.9,-1.0),1.3,0.035);
hang(V(7.4,5.9,-6.4),V(4.2,5.9,-5.2),1.5,0.05);
hang(V(8.8,3.0,-4.5),V(8.8,3.2,0.5),0.9,0.03);

/* shuttle: maintenance umbilicals from the ceiling plugged into the hull */
ship.updateMatrixWorld(true);
function L(x,y,z){ return ship.localToWorld(V(x,y,z)); }
function tubeW(pts,r,col){ var c=new THREE.CatmullRomCurve3(pts); var t=new THREE.Mesh(new THREE.TubeGeometry(c,60,r,10),M({color:col,roughness:0.65})); t.castShadow=true; t.receiveShadow=true; scene.add(t); return t; }
tubeW([V(2.2,6,-3.6),V(2.4,3.6,-4.0),L(0.2,1.6,0.1),L(0.1,0.82,0.05)],0.06,0x1b1e24);
tubeW([V(3.2,6,-4.6),V(3.4,4.2,-4.9),L(-0.6,1.5,-0.2),L(-0.7,0.78,-0.1)],0.05,0xd99a2b);
/* cables draped over the fuselage and onto the deck */
var top1=L(-0.2,0.86,0), sideA=L(-0.2,0.35,0.86), sideB=L(-0.25,0.3,-0.88);
tubeW([V(sideA.x+0.4,0.04,sideA.z+0.7),V(sideA.x+0.1,0.2,sideA.z+0.25),sideA,top1,sideB,V(sideB.x-0.3,0.04,sideB.z-0.5)],0.04,0x15171c);
var top2=L(0.6,0.84,0), sA2=L(0.6,0.3,0.86);
tubeW([V(sA2.x+0.6,0.035,sA2.z+0.9),V(sA2.x+0.2,0.15,sA2.z+0.3),sA2,top2,L(0.7,0.5,-0.82),V(top2.x-0.2,0.035,top2.z-1.4)],0.03,0xa3241c);
/* floor cables from the right wall into the ship */
tubeW([V(8.8,0.05,-3.2),V(7.2,0.05,-2.8),V(6.0,0.05,-3.6),L(-1.6,-0.3,-0.4)],0.05,0x15171c);
tubeW([V(8.8,0.04,-1.6),V(7.0,0.04,-1.2),V(5.4,0.04,-2.2),L(-1.2,-0.35,0.5)],0.035,0xd99a2b);

/* ripped hull access hatch with wires spilling out and sparking */
var hatch=new THREE.Mesh(new THREE.BoxGeometry(0.55,0.36,0.05),new THREE.MeshStandardMaterial({color:0x050608,roughness:1})); hatch.position.set(0.35,0.12,0.8); ship.add(hatch);
var flap=new THREE.Mesh(new THREE.BoxGeometry(0.55,0.36,0.03),mats.hull); flap.position.set(0.35,-0.14,0.96); flap.rotation.x=1.2; flap.castShadow=true; ship.add(flap);
[[0xa3241c,0.18,-0.75],[0xd99a2b,0.3,-0.55],[0x2b5bd9,0.42,-0.7],[0x15171c,0.5,-0.85],[0x5ee08a,0.26,-0.45]].forEach(function(w,i){
  var start=V(w[1],0.18,0.8), mid=V(w[1]+0.05,0.0,0.95+i*0.03), end=V(w[1]+(i%2?0.08:-0.06),w[2],1.0+i*0.04);
  var c=new THREE.CatmullRomCurve3([start,mid,end]); var t=new THREE.Mesh(new THREE.TubeGeometry(c,20,0.012,6),M({color:w[0],roughness:0.6})); ship.add(t);
  var tip=new THREE.Mesh(new THREE.SphereGeometry(0.012,6,4),mats.amber); tip.position.copy(end); ship.add(tip);
  if(i%2===0) tipObjs.push({obj:tip,group:null});
});
var hatchLight=new THREE.PointLight(0xff5533,0.6,2.5,2); hatchLight.position.set(0.35,0.0,1.1); ship.add(hatchLight);

/* ---------- podium ---------- */
var pod=new THREE.Group(); scene.add(pod);
cyl(1.3,1.42,0.3,mats.dark,0,0.15,0,pod,72);
var top=cyl(1.2,1.2,0.04,M({color:0x2a313f,metalness:0.85,roughness:0.32}),0,0.32,0,pod,72);
var ring=new THREE.Mesh(new THREE.TorusGeometry(1.24,0.025,12,120),mats.teal); ring.rotation.x=Math.PI/2; ring.position.y=0.33; pod.add(ring);
var inner=new THREE.Group(); inner.position.y=0.345; pod.add(inner);
for(var k=0;k<24;k++){ var a=k/24*Math.PI*2; var seg=new THREE.Mesh(new THREE.BoxGeometry(0.16,0.01,0.04),mats.tealDim); seg.position.set(Math.cos(a)*0.85,0,Math.sin(a)*0.85); seg.rotation.y=-a; inner.add(seg); }
for(var k2=0;k2<16;k2++){ var a2=k2/16*Math.PI*2; var dot=new THREE.Mesh(new THREE.BoxGeometry(0.1,0.03,0.02),mats.amber); dot.position.set(Math.cos(a2)*1.37,0.12,Math.sin(a2)*1.37); dot.rotation.y=-a2+Math.PI/2; pod.add(dot); }
var podGlow=new THREE.PointLight(0x2ecc63,0.25,3.5,2); podGlow.position.set(0,0.7,-0.4); scene.add(podGlow);
var PODIUM_TOP=0.34;

/* a small red warning beacon right beside the podium, in plain view */
var podiumBeacon=new THREE.Group(); podiumBeacon.position.set(-1.35,0,0.55); scene.add(podiumBeacon);
cyl(0.05,0.06,0.9,mats.dark,0,0.45,0,podiumBeacon,10);
var podiumBeaconDome=new THREE.Mesh(new THREE.SphereGeometry(0.09,16,12),mats.redLamp); podiumBeaconDome.position.y=0.95; podiumBeacon.add(podiumBeaconDome);
var podiumBeaconLight=new THREE.PointLight(0xff2a1f,1.6,4,2); podiumBeaconLight.position.y=0.95; podiumBeacon.add(podiumBeaconLight);

/* ---------- avatar (placeholder mannequin until a GLB is loaded) ---------- */
var avatarRoot=new THREE.Group(); avatarRoot.position.y=PODIUM_TOP; scene.add(avatarRoot);
var suitMat=M({color:0xb7bdc8,metalness:0.15,roughness:0.5,envMapIntensity:0.6});
var trimMat=M({color:0x3dd6c4,metalness:0.2,roughness:0.4,emissive:0x0d3a35,emissiveIntensity:0.6});
var skinMat=M({color:0x9a7a64,metalness:0,roughness:0.65});
var mannequin=new THREE.Group(); avatarRoot.add(mannequin);
function limb(r,h,x,y,z,mat){ var g=new THREE.Group(); var c=new THREE.Mesh(new THREE.CylinderGeometry(r,r*0.92,h,20),mat); var s1=new THREE.Mesh(new THREE.SphereGeometry(r,20,10),mat); var s2=s1.clone(); s1.position.y=h/2; s2.position.y=-h/2; [c,s1,s2].forEach(function(m){m.castShadow=true;g.add(m);}); g.position.set(x,y,z); mannequin.add(g); return g; }
limb(0.075,0.72,-0.11,0.48,0,suitMat); limb(0.075,0.72,0.11,0.48,0,suitMat);
var torso=new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.16,0.62,24),suitMat); torso.position.y=1.17; torso.castShadow=true; mannequin.add(torso);
var chest=new THREE.Mesh(new THREE.SphereGeometry(0.21,24,12),suitMat); chest.scale.set(1,0.6,0.75); chest.position.y=1.45; chest.castShadow=true; mannequin.add(chest);
var la=limb(0.055,0.6,-0.29,1.12,0,suitMat); la.rotation.z=0.12; var ra=limb(0.055,0.6,0.29,1.12,0,suitMat); ra.rotation.z=-0.12;
var collar=new THREE.Mesh(new THREE.TorusGeometry(0.11,0.03,10,32),trimMat); collar.rotation.x=Math.PI/2; collar.position.y=1.56; mannequin.add(collar);
var head=new THREE.Mesh(new THREE.SphereGeometry(0.115,32,16),skinMat); head.scale.set(1,1.18,1.05); head.position.y=1.72; head.castShadow=true; mannequin.add(head);
var stripeL=new THREE.Mesh(new THREE.BoxGeometry(0.03,0.2,0.16),trimMat); stripeL.position.set(-0.19,1.32,0); mannequin.add(stripeL); var stripeR=stripeL.clone(); stripeR.position.x=0.19; mannequin.add(stripeR);
mannequin.traverse(function(o){ if(o.isMesh){o.castShadow=true;o.receiveShadow=true;} });

/* real pilot models (public/art/hangar/models/avatar-male.glb,
   avatar-female.glb) - each a single baked mesh/material covering the
   whole body (skin and suit share one texture), no rig, so a plain
   material.color tint would darken the face along with the suit. Instead,
   buildSuitMask() samples the model's own baked texture once per model,
   classifies each pixel as skin or not with a standard RGB skin-detection
   rule, and bakes that into a same-UV-space mask texture. A small shader
   patch (onBeforeCompile) then blends the suit tint in only where the
   mask says "not skin", leaving the face at its original baked colour.
   setAvatar(url) swaps the loaded model (used when the previewed
   explorer's gender changes) - the older model is disposed once the new
   one is in, not before, so a slow load never leaves the podium empty.
   Falls back to the primitive mannequin above if a file is missing or
   fails to load. */
var gltfLoader=new GLTFLoader();
var avatarModel=null, avatarTintMat=null, avatarUrl=null, avatarLoadToken=0, currentStarfarer=!!opts.starfarer, avatarPreSuited=false;
var maskCache={};
function isSkinPixel(r,g,b){
  // Peer et al.'s simple RGB rule - holds up across skin tones in flat lighting.
  var mx=Math.max(r,g,b), mn=Math.min(r,g,b);
  return r>95 && g>40 && b>20 && (mx-mn)>15 && Math.abs(r-g)>15 && r>g && r>b;
}
function buildSuitMask(map, key){
  if(maskCache[key]) return maskCache[key];
  var img=map && map.image;
  console.log('[suit-mask]', key, 'image:', img, 'width:', img && img.width);
  if(!img || !img.width){ console.warn('[suit-mask] no decoded image yet, skipping mask for', key); return null; }
  try {
    var SIZE=256, c=cvs(SIZE,SIZE), g=c.getContext('2d');
    g.drawImage(img,0,0,SIZE,SIZE);
    var data=g.getImageData(0,0,SIZE,SIZE).data;
    var mask=new Uint8Array(SIZE*SIZE), skinCount=0;
    for(var i=0,p=0;i<data.length;i+=4,p++){ var skin=isSkinPixel(data[i],data[i+1],data[i+2]); if(skin) skinCount++; mask[p]=skin?0:255; }
    console.log('[suit-mask]', key, 'skin pixels:', skinCount, '/', SIZE*SIZE, '(' + ((skinCount/(SIZE*SIZE)*100).toFixed(1)) + '%)');
    var maskTex=new THREE.DataTexture(mask,SIZE,SIZE,THREE.RedFormat,THREE.UnsignedByteType);
    maskTex.flipY=false; maskTex.wrapS=maskTex.wrapT=THREE.ClampToEdgeWrapping;
    maskTex.minFilter=THREE.LinearFilter; maskTex.magFilter=THREE.LinearFilter;
    maskTex.needsUpdate=true;
    maskCache[key]=maskTex;
    return maskTex;
  } catch(e){
    console.error('[suit-mask] failed to build mask for', key, e);
    return null;
  }
}
function wireSuitShader(mat, maskTex){
  mat.onBeforeCompile=function(shader){
    shader.uniforms.uSuitMask={ value: maskTex };
    shader.uniforms.uSuitTint={ value: new THREE.Color(0xffffff) };
    shader.uniforms.uSuitAmount={ value: 0 };
    shader.uniforms.uSkinDarken={ value: 1 };
    shader.fragmentShader='uniform sampler2D uSuitMask;\nuniform vec3 uSuitTint;\nuniform float uSuitAmount;\nuniform float uSkinDarken;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace(
      '#include <map_fragment>',
      '#include <map_fragment>\n#ifdef USE_MAP\n  float suitMaskV = texture2D( uSuitMask, vMapUv ).r;\n  diffuseColor.rgb = mix( diffuseColor.rgb, diffuseColor.rgb * uSuitTint, suitMaskV * uSuitAmount );\n  diffuseColor.rgb *= mix( 1.0, uSkinDarken, 1.0 - suitMaskV );\n#endif'
    );
    mat.userData.suitShader=shader;
    console.log('[suit-mask] onBeforeCompile fired, shader wired');
    applySuitTint(currentStarfarer); // re-apply now that the masked path is actually live
  };
  mat.needsUpdate=true;
}
function disposeObject3D(root){
  root.traverse(function(o){
    if(o.geometry) o.geometry.dispose();
    var ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
    ms.forEach(function(mt){ for(var k in mt){ if(mt[k] && mt[k].isTexture) mt[k].dispose(); } mt.dispose(); });
  });
}
var sceneDisposed=false;
function setAvatar(url, avatarOpts){
  if(!url || url===avatarUrl) return;
  avatarUrl=url;
  var preSuited=!!(avatarOpts && avatarOpts.preSuited);
  var token=++avatarLoadToken;
  gltfLoader.load(url, function(gltf){
    if(sceneDisposed || token!==avatarLoadToken) return; // scene torn down, or a newer swap started before this one finished
    var model=gltf.scene, tintMat=null;
    model.traverse(function(o){ if(o.isMesh){ o.castShadow=true; o.receiveShadow=true; if(o.material) tintMat=o.material; } });
    var old=avatarModel;
    avatarRoot.add(model);
    avatarModel=model; avatarTintMat=tintMat; avatarPreSuited=preSuited;
    mannequin.visible=false;
    // The mask/shader is wired for every model, pre-suited or not - it's
    // also how the face-brightness match below is applied consistently.
    // Pre-suited models just get uSuitAmount=0 so their baked suit colour
    // is never recoloured, only the face brightness is touched.
    if(tintMat && tintMat.map){
      var maskTex=buildSuitMask(tintMat.map, url);
      if(maskTex) wireSuitShader(tintMat, maskTex);
    }
    applySuitTint(currentStarfarer);
    if(old){ avatarRoot.remove(old); disposeObject3D(old); }
  }, undefined, function(){ say && say("Pilot model failed to load - showing placeholder."); });
}

function applySuitTint(star){
  if(!avatarTintMat) return;
  var shader=avatarTintMat.userData && avatarTintMat.userData.suitShader;
  if(shader){
    // mask-driven path: material.color must stay neutral so the only
    // tint is the masked (skin-excluding) one applied in the shader patch.
    avatarTintMat.color.set(0xffffff);
    shader.uniforms.uSuitTint.value.set(star?0x1e2a55:0x6b7580);
    // Pre-suited models already have the right suit colour baked into
    // their own texture - amount 0 leaves it alone either way.
    shader.uniforms.uSuitAmount.value=avatarPreSuited?0:(star?0.6:0.45);
    // Same face brightness for every suit and every character (including
    // a fully pre-suited model) so no pilot's face changes when they
    // change outfits or models.
    shader.uniforms.uSkinDarken.value=0.82;
  } else if(avatarPreSuited){
    avatarTintMat.color.set(0xffffff); // baked art, no runtime recolour
  } else {
    // mask not ready yet (texture still decoding) or no map to mask -
    // whole-body fallback, same as before this fix existed.
    avatarTintMat.color.set(star?0xb89368:0x7a7a7a);
  }
}
function setSuit(star){ currentStarfarer=star; suitMat.color.set(star?0x1e2a55:0x6b7580); trimMat.color.set(star?0xffb547:0x3dd6c4); trimMat.emissive.set(star?0x3a2405:0x0d3a35); applySuitTint(star); }
setSuit(!!opts.starfarer);
setAvatar(opts.avatarUrl || "/art/hangar/models/avatar-male.glb", { preSuited: !!opts.avatarPreSuited });

/* ---------- lighting ---------- */
scene.add(new THREE.HemisphereLight(0x5a2626,0x0a0c10,0.12));
var key=new THREE.SpotLight(0xff4d33,0.6,22,0.36,0.7,1.2); key.position.set(-3.6,5.4,4.6); key.target.position.set(0,1.0,0); scene.add(key); scene.add(key.target);
key.castShadow=true; key.shadow.mapSize.set(2048,2048); key.shadow.bias=-0.0004; key.shadow.camera.near=1; key.shadow.camera.far=20;
var rim=new THREE.SpotLight(0x2ecc63,0.8,12,0.5,0.8,1.5); rim.position.set(1.8,3.4,-2.8); rim.target.position.set(0,1.1,0); scene.add(rim); scene.add(rim.target);
var fill=new THREE.PointLight(0xff3322,0.25,14,2); fill.position.set(3,2.2,4.5); scene.add(fill);
var stripL=new THREE.PointLight(0x2ecc63,0.6,6,2); stripL.position.set(-8.2,0.4,-1); scene.add(stripL);
var shipKey=new THREE.SpotLight(0xff5a3c,1.0,14,0.5,0.7,1.5); shipKey.position.set(2.5,5.6,-1); shipKey.target=ship; scene.add(shipKey);

/* ---------- particles ---------- */
var DUST=500, dustGeo=new THREE.BufferGeometry(), dustPos=new Float32Array(DUST*3);
for(var i=0;i<DUST;i++){ dustPos[i*3]=-8+R()*16; dustPos[i*3+1]=R()*5.5; dustPos[i*3+2]=-6.5+R()*11; }
dustGeo.setAttribute('position',new THREE.BufferAttribute(dustPos,3));
var dust=new THREE.Points(dustGeo,new THREE.PointsMaterial({color:0xcfe2ff,size:0.018,transparent:true,opacity:0.55,depthWrite:false,blending:THREE.AdditiveBlending}));
scene.add(dust);

var SP=140, spGeo=new THREE.BufferGeometry(), spPos=new Float32Array(SP*3), spVel=[], spLife=new Float32Array(SP);
for(var j=0;j<SP;j++){ spVel.push(new THREE.Vector3()); spLife[j]=0; spPos[j*3+1]=-10; }
spGeo.setAttribute('position',new THREE.BufferAttribute(spPos,3));
var sparks=new THREE.Points(spGeo,new THREE.PointsMaterial({color:0xffb35a,size:0.045,transparent:true,opacity:1,depthWrite:false,blending:THREE.AdditiveBlending}));
scene.add(sparks);
var sparkLight=new THREE.PointLight(0xff5533,0,4,2); sparkLight.position.copy(sparkOrigin).add(new THREE.Vector3(0.3,0,0)); scene.add(sparkLight);
var nextBurst=1.2;
var _o=new THREE.Vector3();
function burst(){ var srcs=[{fixed:sparkOrigin,wall:true}].concat(tipObjs); var src=srcs[Math.floor(R()*srcs.length)];
  if(src.fixed) _o.copy(src.fixed); else src.obj.getWorldPosition(_o);
  var n=0, cnt=src.wall?36:22; for(var j=0;j<SP && n<cnt;j++){ if(spLife[j]<=0){ spLife[j]=0.5+R()*0.7; spPos[j*3]=_o.x; spPos[j*3+1]=_o.y; spPos[j*3+2]=_o.z; if(src.wall) spVel[j].set(0.6+R()*1.8,(R()-0.2)*1.6,(R()-0.5)*1.8); else spVel[j].set((R()-0.5)*1.6,R()*1.2,(R()-0.5)*1.6); n++; } }
  sparkLight.position.copy(_o); sparkLight.intensity=3; }

var smokes=[];
function smokeSource(pos,color,rate,rise,scale){ for(var k=0;k<14;k++){ var m=new THREE.SpriteMaterial({map:smokeTex,color:color,transparent:true,opacity:0,depthWrite:false}); var s=new THREE.Sprite(m); scene.add(s); smokes.push({s:s,o:pos,age:k/14*rate,rate:rate,rise:rise,scale:scale}); } }
smokeSource(new THREE.Vector3(2.4,0.75,-3.6),0x3a3e46,5,1.9,1.4);
smokeSource(new THREE.Vector3(-8.4,3.45,-3.2),0xcfd6e2,3.5,1.2,0.9);
smokeSource(new THREE.Vector3(-2.6,0.1,-1.2),0xbfc6d2,4,1.6,0.9);

/* ---------- post-processing ---------- */
var composer=new EffectComposer(renderer);
composer.addPass(new RenderPass(scene,camera));
var bloom=new UnrealBloomPass(new THREE.Vector2(256,256),0.42,0.5,0.96); composer.addPass(bloom);

/* ---------- interaction ---------- */
var mobile=false, mouse={x:0,y:0}, drag=null, spin=0;
function resize(){
  var w=canvas.clientWidth||window.innerWidth, h=canvas.clientHeight||window.innerHeight; mobile=window.innerWidth<900;
  renderer.setSize(w,h,false); camera.aspect=w/h;
  lookBase.set(mobile?0:1.7,1.15,0); camBase.set(mobile?0:0.4,1.7,mobile?8.6:7.4);
  camera.updateProjectionMatrix(); composer.setSize(w,h);
}
var ro = new ResizeObserver(resize); ro.observe(canvas); resize();
function onMove(e){ mouse.x=e.clientX/window.innerWidth-0.5; mouse.y=e.clientY/window.innerHeight-0.5; if(drag!==null){ spin+=(e.clientX-drag)*0.01; drag=e.clientX; } }
function onDown(e){ drag=e.clientX; canvas.setPointerCapture(e.pointerId); }
function onUp(){ drag=null; }
window.addEventListener('pointermove',onMove);
canvas.addEventListener('pointerdown',onDown);
window.addEventListener('pointerup',onUp);

/* ---------- loop ---------- */
var clock=new THREE.Clock(), t=0;
var flickerLamp=ceilLamps[0];
function loop(){
  var dt=Math.min(clock.getDelta(),0.05); t+=dt; var m=reduce?0:1;

  camera.position.set(camBase.x+mouse.x*0.35*m+Math.sin(t*0.3)*0.04*m, camBase.y-mouse.y*0.2*m+Math.sin(t*0.45)*0.025*m, camBase.z);
  camera.lookAt(lookBase);

  avatarRoot.rotation.y += (spin-avatarRoot.rotation.y)*0.12;
  if(m){ mannequin.position.y=Math.sin(t*1.6)*0.006; head.rotation.y=Math.sin(t*0.5)*0.15; }

  inner.rotation.y += dt*0.35*m;
  ring.material.emissiveIntensity = 2 + Math.sin(t*2.2)*0.4*m;

  beacons.forEach(function(b,i){ var a=t*(m?2.6:0)+i*Math.PI; b.t.position.set(b.x+Math.cos(a)*5, 3, -6.3+Math.abs(Math.sin(a))*3.5); });
  redLight.intensity = m ? 0.6+Math.max(0,Math.sin(t*3.6))*1.6 : 1.2;
  mats.redLamp.emissiveIntensity = 0.8+redLight.intensity;
  podiumBeaconLight.intensity = 0.9+redLight.intensity*0.6;

  var fl = m && (Math.sin(t*23)>0.85 || (t%4.3>2.6 && t%4.3<2.75)) ? 0.15 : 1;
  if(flickerLamp) flickerLamp.material.emissiveIntensity=2.6*fl;
  lamp.rotation.z = Math.sin(t*1.2)*0.08*m; lamp.rotation.x=Math.sin(t*0.9)*0.04*m;
  var lf = m && Math.random()<0.03 ? 0.25 : 1; lampLight.intensity=1.3*lf; bulb.material.emissiveIntensity=2.6*lf;
  dangle.rotation.z = Math.sin(t*0.7)*0.05*m;
  engineLight.intensity = m ? 0.5+Math.random()*0.6 : 0.8;

  if(m){ for(var i2=0;i2<DUST;i2++){ dustPos[i2*3+1]+=dt*0.03; dustPos[i2*3]+=Math.sin(t+i2)*dt*0.02; if(dustPos[i2*3+1]>5.6) dustPos[i2*3+1]=0; } dustGeo.attributes.position.needsUpdate=true; }

  if(m){ nextBurst-=dt; if(nextBurst<=0){ burst(); nextBurst=0.7+R()*1.6; } }
  if(m){ arcNext-=dt; if(arcNext<=0){ arcOn=0.08+R()*0.25; arcNext=0.9+R()*2.2; } }
  if(arcOn>0){ arcOn-=dt; updateArc(); arcLines.forEach(function(l){l.visible=Math.random()>0.15;}); arcLight.intensity=2+Math.random()*2.5; } else { arcLines.forEach(function(l){l.visible=false;}); arcLight.intensity=0; }
  spinner.rotation.z += dt*4.2*m;
  var ap=m? (0.5+0.5*Math.sin(t*4.2)) : 0.5; domeMat.emissiveIntensity=1.2+ap*2; alarmWash.intensity=ap*0.55; signMat.emissiveIntensity = m ? (Math.sin(t*4.2)>0?1.9:0.5) : 1.4;
  cutWires.forEach(function(w,i3){ w.rotation.z=Math.sin(t*0.8+i3)*0.05*m; w.rotation.x=Math.sin(t*0.6+i3*2)*0.04*m; });
  redStrip.emissiveIntensity = m ? 0.4+ap*2.4 : 1.4; redPts[0].intensity=ap*1.3; redPts[1].intensity=(m?(0.5+0.5*Math.sin(t*4.2+Math.PI)):0.5)*1.1;
  scene.fog.color.copy(fogBase).lerp(fogRed, ap*0.55); scene.background.copy(scene.fog.color);
  blades.rotation.z -= dt*(m?7:0);
  hatchLight.intensity = m ? (Math.random()<0.15 ? 1.6 : 0.3) : 0.6;
  scrMats.forEach(function(sm,i4){ sm.emissiveIntensity = (m && Math.random()<0.04) ? 0.2 : (i4===0 ? 0.9+ap*0.6 : 1.0); });
  for(var j2=0;j2<SP;j2++){ if(spLife[j2]>0){ spLife[j2]-=dt; spVel[j2].y-=9.8*dt; spPos[j2*3]+=spVel[j2].x*dt; spPos[j2*3+1]+=spVel[j2].y*dt; spPos[j2*3+2]+=spVel[j2].z*dt; if(spPos[j2*3+1]<0.02){ spPos[j2*3+1]=0.02; spVel[j2].y*=-0.3; spVel[j2].x*=0.5; } if(spLife[j2]<=0) spPos[j2*3+1]=-10; } }
  spGeo.attributes.position.needsUpdate=true; sparkLight.intensity=Math.max(0,sparkLight.intensity-dt*9);

  smokes.forEach(function(p){ p.age+= m?dt:0; var a=(p.age%p.rate)/p.rate; p.s.position.set(p.o.x-a*0.6, p.o.y+a*p.rise, p.o.z+Math.sin(a*6+p.rate)*0.15); var sc2=p.scale*(0.4+a*1.4); p.s.scale.set(sc2,sc2,1); p.s.material.opacity=Math.sin(a*Math.PI)*0.35; });

  composer.render();
  raf=requestAnimationFrame(loop);
}

raf=requestAnimationFrame(loop);

function dispose(){
  sceneDisposed=true;
  cancelAnimationFrame(raf); ro.disconnect();
  window.removeEventListener('pointermove',onMove); window.removeEventListener('pointerup',onUp); canvas.removeEventListener('pointerdown',onDown);
  scene.traverse(function(o){
    if(o.geometry) o.geometry.dispose();
    var ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
    ms.forEach(function(mt){ for (var k in mt){ if (mt[k] && mt[k].isTexture) mt[k].dispose(); } mt.dispose(); });
  });
  envRT.dispose(); composer.dispose(); renderer.dispose();
  for(var mk in maskCache){ maskCache[mk].dispose(); }
}

return { setSuit: setSuit, setAvatar: setAvatar, dispose: dispose };
}
