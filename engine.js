import * as T from 'three';
import {OrbitControls} from './OrbitControls.js';
const $=id=>document.getElementById(id), canvas=$('view');
const scene=new T.Scene(), camera=new T.PerspectiveCamera(38,1,.1,100);
let renderer;
try{renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:true});}catch(e){$('status').textContent='3D requires WebGL. Enable hardware acceleration or use another browser.';throw e;}
renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=T.SRGBColorSpace;
scene.add(new T.HemisphereLight(0xffffff,0x536878,3));
for(const [x,y,z,p] of [[4,8,5,4],[-5,4,-4,3]]){const l=new T.DirectionalLight(0xffffff,p);l.position.set(x,y,z);scene.add(l);}
const controls=new OrbitControls(camera,canvas);controls.enableDamping=true;controls.minDistance=3;controls.maxDistance=25;controls.target.set(0,1.2,0);
const all=[],pickables=[],categories=['Structure','Rotating assembly','Valvetrain','Fuel & air','Ignition','Cooling & oil'];
const colors={'Structure':0x216293,'Rotating assembly':0x8599a7,'Valvetrain':0xd3a14e,'Fuel & air':0xaebec4,'Ignition':0x983f33,'Cooling & oil':0x466c78};
let selected=null, isolated=false, amount=0;
const vec=(x,y,z)=>new T.Vector3(x,y,z);
function part(name,system,description,offset=[0,0,0],shell=false){let g=new T.Group();scene.add(g);const p={name,system,description,g,offset:vec(...offset),shell,hidden:false};all.push(p);return p;}
function mesh(p,geo,pos,rot=[0,0,0],color){const m=new T.Mesh(geo,new T.MeshStandardMaterial({color:color??colors[p.system],metalness:.5,roughness:.36}));m.position.set(...pos);m.rotation.set(...rot);m.userData.part=p;p.g.add(m);pickables.push(m);return m;}
const box=(p,size,pos,rot=[0,0,0],color)=>mesh(p,new T.BoxGeometry(...size),pos,rot,color);
const cyl=(p,r,len,pos,rot=[0,0,0],color)=>mesh(p,new T.CylinderGeometry(r,r,len,32),pos,rot,color);
function rod(p,a,b,r=.04,color){a=vec(...a);b=vec(...b);const m=cyl(p,r,a.distanceTo(b),a.clone().add(b).multiplyScalar(.5).toArray(),[0,0,0],color);m.quaternion.setFromUnitVectors(vec(0,1,0),b.sub(a).normalize());return m;}
function tube(p,pts,r=.045,color){return mesh(p,new T.TubeGeometry(new T.CatmullRomCurve3(pts.map(x=>vec(...x))),32,r,8,false),[0,0,0],[0,0,0],color);}
const block=part('Engine block','Structure','The main casting supports the cylinder bores, crankshaft, and camshaft. The two cylinder banks form a V.', [0,-.2,0],true);
box(block,[1.6,.6,3.45],[0,.15,0]);
for(let s of [-1,1]){box(block,[.79,1.22,3.45],[s*.57,.79,0],[0,0,-s*Math.PI/4]);for(let z of [-1.2,-.4,.4,1.2])cyl(block,.20,.03,[s*.89,.4,z],[0,0,Math.PI/2],0x8e9fa4);}
const crank=part('Crankshaft','Rotating assembly','Converts piston and connecting-rod forces into rotary output. The 289 uses a cross-plane crankshaft.',[0,-.65,0]);
cyl(crank,.12,3.95,[0,0,0],[Math.PI/2,0,0]);
const phases=[0,Math.PI/2,3*Math.PI/2,Math.PI];
for(let i=0;i<4;i++){const z=-1.2+i*.8,a=phases[i],x=.23*Math.sin(a),y=.23*Math.cos(a);cyl(crank,.115,.45,[x,y,z],[Math.PI/2,0,0]);for(let dz of [-.24,.24])box(crank,[.4,.5,.10],[x/2,y/2,z+dz],[0,0,-a]);}
for(let i=0;i<5;i++){const p=part('Main bearing cap '+(i+1),'Structure','Clamps the crankshaft main bearing to the block.',[0,-1,0]);box(p,[.65,.18,.15],[0,-.23,-1.6+i*.8]);}
const cam=part('Camshaft','Valvetrain','A single camshaft in the block operates sixteen lifters. It turns at half crankshaft speed.',[0,.25,1]);cyl(cam,.085,3.5,[0,.56,0],[Math.PI/2,0,0]);
for(let i=0;i<16;i++)cyl(cam,.14,.06,[.025*Math.sin(i),.56+.025*Math.cos(i),-1.5+i*.2],[Math.PI/2,0,0]);
for(const s of [-1,1]){
 const side=s===1?'Right bank':'Left bank', off=[s*1.2,.75,0],ang=-s*Math.PI/4;
 const head=part(side+' cylinder head','Structure','Contains the combustion chambers, intake and exhaust ports, and valves. Hidden in the internal view.',off,true);box(head,[.87,.32,3.5],[s*1.03,1.35,0],[0,0,ang]);
 const gasket=part(side+' head gasket','Structure','Seals combustion pressure, coolant, and oil between the head and block.',[s*.65,.4,0],true);box(gasket,[.88,.025,3.47],[s*.90,1.20,0],[0,0,ang],0x595954);
 const cover=part(side+' valve cover','Structure','Keeps oil around the rocker arms and excludes dirt.',[s*1.65,1.5,0],true);box(cover,[.79,.3,3.48],[s*1.24,1.61,0],[0,0,ang]);for(let i=-2;i<=2;i++)box(cover,[.025,.02,3.1],[s*1.24+i*.08,1.83-i*s*.08,0],[0,0,ang],0xa3b2be);
 const exhaust=part(side+' exhaust manifold','Fuel & air','Collects exhaust gas from four cylinders and directs it toward the exhaust system.',[s*1.8,0,0]);tube(exhaust,[[s*1.5,1.1,-1.4],[s*1.8,.7,0],[s*1.6,.5,1.7]],.13,0x655b54);
 for(let i=0;i<4;i++){
  const n=s===1?i+1:i+5,z=-1.2+i*.8+(s===-1?.10:0);
  const piston=part('Cylinder '+n+' piston','Rotating assembly','Receives combustion pressure and moves within the cylinder bore. Its rings seal against the cylinder wall.',[s*.5,0,0]);cyl(piston,.285,.35,[s*.48,.60,z],[0,0,ang]);
  const rings=part('Cylinder '+n+' piston rings','Rotating assembly','Compression rings limit combustion leakage. The oil-control ring regulates oil on the cylinder wall.',[s*.7,.1,0]);for(let h of [-.03,.04,.11]){const m=mesh(rings,new T.TorusGeometry(.286,.014,6,32),[s*(.48+h*.707),.60+h*.707,z]);m.rotation.set(Math.PI/2,ang,0);}
  const con=part('Cylinder '+n+' connecting rod','Rotating assembly','Connects the piston pin to a crankpin, transferring force to the crankshaft.',[s*.3,-.4,0]);rod(con,[s*.40,.48,z],[.23*Math.sin(phases[i]),.23*Math.cos(phases[i]),z],.065);
  const pin=part('Cylinder '+n+' piston pin','Rotating assembly','Allows the connecting rod to pivot within the piston.',[s*.9,0,0]);cyl(pin,.055,.5,[s*.48,.60,z],[Math.PI/2,0,0]);
  tube(exhaust,[[s*1.17,1.2,z],[s*1.65,1.05,z],[s*1.78,.73,z]],.07,0x655b54);
  for(let v=0;v<2;v++){
   const zz=z+(v===0?-.12:.12),type=v===0?'intake':'exhaust';
   const valve=part('Cylinder '+n+' '+type+' valve','Valvetrain',v===0?'Opens to admit the air–fuel mixture into the cylinder.':'Opens to release burnt gases into the exhaust port.',[s*.85,1.1,0]);rod(valve,[s*.81,1.07,zz],[s*1.20,1.64,zz],.027);cyl(valve,v===0?.12:.10,.035,[s*.81,1.07,zz],[0,0,ang]);
   const spring=part('Cylinder '+n+' '+type+' valve spring','Valvetrain','Returns the valve to its seat as the cam lobe moves away.',[s*1.2,1.5,0]);let pts=[];for(let k=0;k<=90;k++){let t=k/90,a=t*Math.PI*12;pts.push([s*(1.03+t*.14)+.075*Math.cos(a),1.39+t*.20,.075*Math.sin(a)+zz]);}tube(spring,pts,.013);
   const lifter=part('Cylinder '+n+' '+type+' lifter','Valvetrain','Follows a cam lobe and transfers lift to the pushrod. Lifter type varies by 289 specification.',[s*.4,.55,0]);cyl(lifter,.065,.16,[s*.18,.7,zz]);
   const push=part('Cylinder '+n+' '+type+' pushrod','Valvetrain','Carries cam motion from the lifter to the rocker arm.',[s*.6,.9,0]);rod(push,[s*.18,.76,zz],[s*.94,1.77,zz],.025);
   const rocker=part('Cylinder '+n+' '+type+' rocker arm','Valvetrain','Pivots to turn upward pushrod movement into valve-opening motion.',[s*1.1,1.8,0]);rod(rocker,[s*.94,1.77,zz],[s*1.27,1.68,zz],.055);
  }
  const spark=part('Cylinder '+n+' spark plug','Ignition','Produces the spark that ignites the compressed mixture.',[s*1.5,.4,0]);rod(spark,[s*1.19,1.10,z+.25],[s*1.52,1.22,z+.25],.045,0xe9e6d7);
 }
}
const intake=part('Intake manifold','Fuel & air','Distributes the carburetor mixture to the intake ports in both cylinder heads.',[0,1.5,0],true);box(intake,[1.3,.18,2.8],[0,1.52,0]);for(let s of [-1,1])for(let z of [-1.1,-.35,.4,1.15])tube(intake,[[0,1.6,0],[s*.5,1.5,z*.5],[s*.86,1.28,z]],.11);
const carb=part('Carburetor','Fuel & air','Meters fuel into incoming air. This model depicts a simplified four-barrel carburetor; equipment varies by engine option.',[0,2,0]);box(carb,[.66,.36,.72],[0,1.83,0]);for(let x of [-.18,.18])for(let z of [-.2,.2])cyl(carb,.12,.15,[x,2.08,z]);
const air=part('Air cleaner','Fuel & air','Filters incoming air before it enters the carburetor.',[0,2.7,0],true);cyl(air,.91,.22,[0,2.3,0],undefined,0x303b43);cyl(air,.96,.045,[0,2.43,0],undefined,0xb6c5cd);
const dist=part('Distributor','Ignition','Routes coil voltage to the spark plugs in firing order. Mounted at the front of the Ford small-block engine.',[0,.5,-1.4]);cyl(dist,.12,.6,[0,1.43,-1.53]);cyl(dist,.24,.25,[0,1.79,-1.53]);
const wires=part('Spark-plug wires','Ignition','Carry high voltage from the distributor to the eight spark plugs. Routing here is schematic.',[0,.8,-.4],true);for(let s of [-1,1])for(let i=0;i<4;i++)tube(wires,[[s*.12,1.93,-1.53],[s*.65,1.95,-.5+i*.2],[s*1.5,1.23,-.95+i*.8]],.021,0x343a40);
const coil=part('Ignition coil','Ignition','Steps up battery voltage to the high voltage needed for a spark.',[-1,.7,-1]);cyl(coil,.12,.4,[-.55,1.75,-1]);
const pan=part('Oil pan','Cooling & oil','Stores the oil supply beneath the crankcase. The front sump is simplified.',[0,-1.8,0],true);box(pan,[1.5,.18,3.4],[0,-.43,0]);box(pan,[1.4,.56,1.4],[0,-.73,-.91]);
const pump=part('Oil pump & pickup','Cooling & oil','Draws oil from the sump and pressurizes the lubrication system.',[-.5,-1,-.3]);box(pump,[.3,.25,.35],[-.28,-.42,-1.25]);tube(pump,[[-.28,-.5,-1.25],[0,-.75,-.8],[.35,-.8,-.8]],.04);cyl(pump,.18,.05,[.35,-.81,-.8]);
const timing=part('Timing chain & sprockets','Valvetrain','Connects crankshaft to camshaft with a 2:1 ratio. The larger cam sprocket turns once for two crank revolutions.',[0,0,-1.2]);cyl(timing,.24,.08,[0,.56,-1.84],[Math.PI/2,0,0]);cyl(timing,.12,.08,[0,0,-1.84],[Math.PI/2,0,0]);tube(timing,[[-.24,.56,-1.85],[0,.80,-1.85],[.24,.56,-1.85],[.12,0,-1.85],[0,-.12,-1.85],[-.12,0,-1.85],[-.24,.56,-1.85]],.025,0x343d43);
const timingCover=part('Timing cover','Structure','Encloses the timing chain and supports the front crankshaft seal.',[0,0,-1.8],true);box(timingCover,[1.05,1.1,.16],[0,.40,-1.97]);
const water=part('Water pump','Cooling & oil','Circulates coolant through the engine and radiator. Radiator and hoses are outside this engine-only model.',[0,.4,-2.1]);box(water,[.6,.35,.32],[0,.72,-2.18]);
const pulley=part('Front pulleys & drive belt','Cooling & oil','The crankshaft drives the water pump and alternator through the belt.',[0,0,-2.5]);for(const [x,y,r] of [[0,0,.33],[0,.72,.28],[-1.25,.8,.22]])cyl(pulley,r,.12,[x,y,-2.47],[Math.PI/2,0,0],0x343d43);tube(pulley,[[0,-.34,-2.48],[.34,0,-2.48],[.28,.72,-2.48],[0,1,-2.48],[-1.25,1.03,-2.48],[-1.48,.8,-2.48],[0,-.34,-2.48]],.025,0x171e24);
const damper=part('Crankshaft damper','Rotating assembly','Reduces torsional vibration of the crankshaft.',[0,-.3,-2]);cyl(damper,.35,.18,[0,0,-2.17],[Math.PI/2,0,0]);
const alt=part('Alternator','Ignition','Generates electrical power while the engine runs.',[-1.4,0,-1.2]);cyl(alt,.29,.55,[-1.25,.8,-2.07],[Math.PI/2,0,0]);
const fuel=part('Mechanical fuel pump','Fuel & air','Supplies fuel from the tank to the carburetor, driven mechanically by the engine.',[-1.1,0,-1]);cyl(fuel,.16,.32,[-.83,.46,-1.7]);
const filter=part('Oil filter','Cooling & oil','Removes suspended contaminants from circulating oil.',[-1.3,-.1,0]);cyl(filter,.20,.43,[-.95,.05,-1.15],[0,0,Math.PI/3],0xe2d9c4);
const fly=part('Flywheel','Rotating assembly','Stores rotational energy and provides the clutch interface in a manual-transmission installation. Automatic versions use a flexplate.',[0,0,1.7]);cyl(fly,.73,.12,[0,0,1.91],[Math.PI/2,0,0]);for(let i=0;i<72;i++){const a=i*Math.PI/36;box(fly,[.045,.075,.14],[.73*Math.cos(a),.73*Math.sin(a),1.91],[0,0,a]);}
const starter=part('Starter motor','Ignition','Engages the ring gear to crank the engine for starting.',[1.2,-.3,1]);cyl(starter,.22,.65,[.85,-.15,1.45],[Math.PI/2,0,0]);
all.forEach((p,i)=>{$('partList').add(new Option(p.name,String(i)));});
categories.forEach(c=>{const label=document.createElement('label'),input=document.createElement('input');input.type='checkbox';input.checked=true;input.dataset.system=c;input.onchange=()=>{isolated=false;update();};label.append(input,document.createTextNode(c));$('groups').append(label);});
function update(){for(const p of all){const enabled=[...$('groups').querySelectorAll('input')].find(i=>i.dataset.system===p.system).checked;p.g.visible=isolated?p===selected:enabled&&!p.hidden;p.g.position.copy(p.offset).multiplyScalar(amount);} $('count').textContent=all.filter(p=>p.g.visible).length+' of '+all.length+' selectable components visible';$('isolate').textContent=isolated?'Exit isolation':'Isolate part';}
function select(p){selected=p;for(const q of all)q.g.traverse(m=>{if(m.isMesh)m.material.emissive.setHex(q===p?0x704610:0);});$('partList').value=p?String(all.indexOf(p)):'';$('name').textContent=p?.name??'Explore from the outside in';$('description').textContent=p?.description??'Select a part to see its function.';$('hide').disabled=$('isolate').disabled=!p;if(p){p.hidden=false;[...$('groups').querySelectorAll('input')].find(i=>i.dataset.system===p.system).checked=true;}update();}
function mode(m){isolated=false;amount=m==='exploded'?.8:0;$('explode').value=amount*100;for(const p of all)p.hidden=m==='internal'&&p.shell;document.querySelectorAll('.groups input').forEach(x=>x.checked=true);for(const k of ['assembled','internal','exploded'])$(k).setAttribute('aria-pressed',String(k===m));update();}
for(const m of ['assembled','internal','exploded'])$(m).onclick=()=>mode(m);
$('partList').onchange=e=>select(e.target.value===''?null:all[Number(e.target.value)]);
$('explode').oninput=e=>{amount=Number(e.target.value)/100;update();};
$('isolate').onclick=()=>{if(selected){isolated=!isolated;update();}};
$('hide').onclick=()=>{if(selected){selected.hidden=true;isolated=false;update();}};
$('restore').onclick=()=>{isolated=false;all.forEach(p=>p.hidden=false);document.querySelectorAll('.groups input').forEach(x=>x.checked=true);update();};
function reset(){camera.position.set(6,4.6,-7.7);controls.target.set(0,1.1,0);controls.update();}reset();$('reset').onclick=reset;
$('full').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{$('status').textContent='Fullscreen is unavailable here. Use the separate viewer link.';}};
let down;canvas.addEventListener('pointerdown',e=>down=[e.clientX,e.clientY]);canvas.addEventListener('pointerup',e=>{if(!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>5)return;const r=canvas.getBoundingClientRect(),ray=new T.Raycaster();ray.setFromCamera(new T.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1),camera);const hit=ray.intersectObjects(pickables.filter(m=>m.userData.part.g.visible))[0];if(hit)select(hit.object.userData.part);});
canvas.addEventListener('keydown',e=>{let d=camera.position.clone().sub(controls.target),s=new T.Spherical().setFromVector3(d);if(e.key==='ArrowLeft')s.theta-=.12;else if(e.key==='ArrowRight')s.theta+=.12;else if(e.key==='ArrowUp')s.phi=Math.max(.1,s.phi-.12);else if(e.key==='ArrowDown')s.phi=Math.min(Math.PI-.1,s.phi+.12);else if(e.key==='+'||e.key==='=')s.radius=Math.max(3,s.radius*.9);else if(e.key==='-')s.radius=Math.min(25,s.radius*1.1);else return;e.preventDefault();camera.position.copy(controls.target).add(new T.Vector3().setFromSpherical(s));controls.update();});
new ResizeObserver(()=>{const r=canvas.parentElement.getBoundingClientRect();renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;camera.updateProjectionMatrix();}).observe(canvas.parentElement);
$('status').textContent='';update();renderer.setAnimationLoop(()=>{controls.update();renderer.render(scene,camera);});
if(document.modelContext?.registerTool){try{Promise.resolve(document.modelContext.registerTool({name:'inspect_engine_component',description:'Select and isolate a named engine component in the viewer.',inputSchema:{type:'object',properties:{name:{type:'string'}},required:['name'],additionalProperties:false},annotations:{readOnlyHint:false},execute(input){const p=all.find(p=>p.name===input.name);if(!p)throw Error('Unknown component');select(p);isolated=true;update();return {name:p.name,description:p.description};}})).catch(()=>{});}catch{}}
