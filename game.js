'use strict';
(() => {
const canvas=document.getElementById('world'),ctx=canvas.getContext('2d');
const $=id=>document.getElementById(id),W=360,H=540,GROUND=420,PX=68;
const GRAVITY=1100,JUMP=340,AIR=.91,MAX_SPEED=280,HOLD_LIMIT=.22;
const gameMode='platformer';
let jumpHeld=false,sustainAllowed=false,holdTime=0,activePointer=null,leftHeld=false,rightHeld=false;const heldKeys=new Set();
let introCount=0,difficultyTier=0;
let state='title',best=0,score=0,bonus=0,elapsed=0,distance=0,speed=200,spawnAt=420;
let selectedCharacter='squirrel';
let selectedSkin='classic',soundEnabled=true,musicEnabled=true,missionProgress=0,missionDone=false,selectedStartStage=0;
let y=GROUND,vy=0,land=0,obstacles=[],items=[],pits=[],projectiles=[],falling=false,particles=[],popups=[],clock=0,last=0,acc=0,crashTime=0,newBest=false,milestone=0,flash=0,combo=0,comboTimer=0,jumpsUsed=0,paused=false,bossShown=false,bossHits=0,attackCooldown=0;
let playerX=60,playerY=360,playerVX=0,playerVY=0,platformGrounded=false,cameraX=0,platforms=[],platformEnemies=[],goalX=3600,stageCleared=false;
try{best=Math.max(0,Number(localStorage.getItem('squirrel-adventure-best'))||0)}catch{}
try{selectedSkin=localStorage.getItem('squirrel-adventure-skin')||'classic';soundEnabled=localStorage.getItem('squirrel-adventure-sound')!=='off';musicEnabled=localStorage.getItem('squirrel-adventure-music')!=='off'}catch{}
const rand=(a,b)=>a+Math.random()*(b-a),pick=a=>a[Math.floor(Math.random()*a.length)];
const dailyMissions=[{key:'collect',target:12,label:'오늘의 미션: 먹이 12개 먹기'},{key:'score',target:2500,label:'오늘의 미션: 2,500점 달성'},{key:'combo',target:5,label:'오늘의 미션: 콤보 x5 만들기'}];
const stageNames=['GREEN WOODS','SUNSET RIDGE','NIGHT GROVE','SNOW PEAK'];
const stageGoals=['도토리 숲을 통과하세요','붉은 능선을 돌파하세요','밤의 수호자를 피하세요','보스의 둥지를 돌파하세요'];
const stageStories=['숲 가장자리에서 모험이 시작됩니다. 잃어버린 보물의 첫 단서를 찾아보세요.','붉은 능선 너머로 수상한 발자국이 이어집니다. 더 빠르게 달려야 합니다.','어둠 속 수호자가 길을 막고 있습니다. 공격을 아끼지 마세요.','눈 덮인 정상에 보물이 잠들어 있습니다. 마지막 보스를 돌파하세요.'];
function currentStage(){return Math.floor(score/1500)%4}
function updateStoryText(){const tigerText=selectedCharacter==='tiger'?'아기 호랑이와 함께 잃어버린 보물을 찾아 네 지역을 돌파하세요.':'다람쥐와 함께 잃어버린 보물을 찾아 네 지역을 돌파하세요.';const stage=state==='title'?selectedStartStage:currentStage();$('storyText').textContent=tigerText;$('mapDescription').textContent=stageStories[stage]+' '+stageGoals[stage];updateMapNodes()}
function updateMapNodes(){document.querySelectorAll('[data-stage]').forEach(node=>{const stage=Number(node.dataset.stage),unlocked=stage===0||best>=stage*1500;node.disabled=!unlocked;node.classList.toggle('selected',stage===selectedStartStage);const label=node.querySelector('small');if(label)label.textContent=unlocked?(stage===selectedStartStage?'선택됨':stageGoals[stage]):'기록 '+(stage*1500).toLocaleString()+'점 필요'})}
function todayKey(){const d=new Date();return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate()}
function currentMission(){const day=Number(todayKey().replaceAll('-',''));return dailyMissions[day%dailyMissions.length]}
function loadMission(){const m=currentMission();try{const raw=JSON.parse(localStorage.getItem('squirrel-adventure-mission')||'null');if(raw&&raw.day===todayKey()){missionProgress=raw.progress||0;missionDone=!!raw.done}}catch{};$('missionText').textContent=missionDone?m.label+' ✓':m.label+' ('+missionProgress+'/'+m.target+')'}
function updateMission(kind,value=1){const m=currentMission();if(m.key!==kind||missionDone)return;missionProgress=Math.max(missionProgress,value);if(missionProgress>=m.target){missionProgress=m.target;missionDone=true;popups.push({x:W/2,y:205,text:'MISSION COMPLETE!',life:1.5});flash=.5}try{localStorage.setItem('squirrel-adventure-mission',JSON.stringify({day:todayKey(),progress:missionProgress,done:missionDone}))}catch{};$('missionText').textContent=missionDone?m.label+' ✓':m.label+' ('+missionProgress+'/'+m.target+')'}
function resetPlatformLevel(){playerX=60;playerY=GROUND-28;playerVX=0;playerVY=0;platformGrounded=true;cameraX=0;goalX=3600;stageCleared=false;platformEnemies=[];platforms=[
 {x:0,y:GROUND,w:720,h:120},{x:820,y:GROUND,w:520,h:120},{x:1460,y:GROUND,w:560,h:120},{x:2180,y:GROUND,w:640,h:120},{x:3000,y:GROUND,w:720,h:120},
 {x:220,y:330,w:130,h:14},{x:480,y:270,w:120,h:14},{x:700,y:350,w:100,h:14},{x:940,y:320,w:150,h:14},{x:1190,y:250,w:120,h:14},{x:1390,y:345,w:110,h:14},{x:1600,y:300,w:150,h:14},{x:1850,y:220,w:130,h:14},{x:2050,y:350,w:100,h:14},{x:2320,y:315,w:140,h:14},{x:2580,y:245,w:130,h:14},{x:2860,y:340,w:120,h:14},{x:3200,y:285,w:150,h:14},{x:3450,y:225,w:120,h:14}
 ];
 [
  [560,GROUND-28],[1080,GROUND-28],[1730,GROUND-28],[2460,GROUND-28],[3260,GROUND-28]
 ].forEach(([x,y])=>platformEnemies.push({x,y,w:24,h:24,vx:35,min:x-50,max:x+50,alive:true}));
}
function platformRectHit(a,b){return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y}
function updatePlatform(dt){
 clock+=dt;
 if(state==='crash'){crashTime+=dt;if(crashTime>.65)gameOver();return}
 if(state!=='playing')return;
 attackCooldown=Math.max(0,attackCooldown-dt);comboTimer=Math.max(0,comboTimer-dt);if(comboTimer===0)combo=0;
 const move=(rightHeld?1:0)-(leftHeld?1:0);playerVX+=(move*560-playerVX)*Math.min(1,dt*10);if(!move)playerVX*=Math.pow(.001,dt);
 playerVY+=GRAVITY*dt;const oldY=playerY;playerX=Math.max(0,playerX+playerVX*dt);playerY+=playerVY*dt;
 const playerBox={x:playerX,y:playerY,w:24,h:28};let grounded=false;
 for(const p of platforms){if(playerVY>=0&&playerBox.x+playerBox.w>p.x+3&&playerBox.x<p.x+p.w-3&&oldY+playerBox.h<=p.y+3&&playerY+playerBox.h>=p.y){playerY=p.y-playerBox.h;playerVY=0;grounded=true;jumpsUsed=0}}
 platformGrounded=grounded;
 if(playerY>H+120){crash();return}
 for(const e of platformEnemies){if(!e.alive)continue;e.x+=e.vx*dt;if(e.x<e.min||e.x>e.max)e.vx*=-1;if(platformRectHit(playerBox,e)){if(selectedCharacter==='tiger'&&playerVY>40&&playerY+playerBox.h<e.y+18){e.alive=false;playerVY=-JUMP*.55;bonus+=150;popups.push({x:playerX-cameraX,y:playerY-16,text:'ROAR! +150',life:1});sound('smash')}else{crash();return}}}
 for(const p of projectiles){p.x+=p.vx*dt;p.life-=dt;for(const e of platformEnemies){if(e.alive&&p.x>e.x&&p.x<e.x+e.w&&p.y>e.y&&p.y<e.y+e.h){e.alive=false;p.life=0;bonus+=80;popups.push({x:e.x-cameraX,y:e.y-12,text:'+80',life:.7});sound('smash');puff(e.x-cameraX,e.y,8,'#ffd36e');break}}}
 projectiles=projectiles.filter(p=>p.life>0&&p.x<goalX+300);cameraX=Math.max(0,Math.min(goalX-W,playerX-W*.35));distance=playerX*12;score=Math.floor(distance/12)+bonus;updateMission('score',score);updateHud();
 if(playerX>=goalX){stageCleared=true;state='over';$('game').classList.remove('playing','paused');$('hud').hidden=true;$('over').hidden=false;$('over').querySelector('h2').textContent='STAGE CLEAR';$('finalScore').textContent=score.toLocaleString();$('finalBest').textContent=best.toLocaleString();sound('best')}
 for(const p of particles){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=100*dt}particles=particles.filter(p=>p.life>0);for(const p of popups){p.life-=dt;p.y-=22*dt}popups=popups.filter(p=>p.life>0);
}
const r=(x,y,w,h,c)=>{ctx.fillStyle=c;ctx.fillRect(Math.round(x),Math.round(y),w,h)};
function poly(points,c){ctx.fillStyle=c;ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.closePath();ctx.fill()}
// Original low-resolution sprites. Every symbol is a single pixel in a fixed palette.
const palette={o:'#5a3625',b:'#97542b',c:'#c87d3e',d:'#e7a95b',e:'#ffdc99',w:'#fff5d5',k:'#2a3022',g:'#6b8f42',h:'#a6c26a',s:'#728277',l:'#b3bb95',t:'#475e52',m:'#db764a',n:'#f6ce84',z:'#402e22',a:'#f1d2a0',f:'#b88c57',q:'#b94b45',u:'#f18a71'};
const squirrel=[
'                     oo   oo  ',
'                    obco obco ',
'                    occoocco  ',
'                   obbbbbbco  ',
'                  obcaaabbbco ',
'                 obbbzzzbddco',
'            ooooobcaaawkaddco',
'         ooobbbbobbbzzkkbdddoo',
'       oobcaaabbbbcaaaabdddeoo',
'      obbbzzzzzzzbbbbbbddeeo  ',
'     obcaaaaaaaaaaccdddeeeo   ',
'    obbbzzzzzzzzzzzcddeeeeo   ',
' ooobccaaaaaaaaaaccdddeeeo    ',
'obbcbbbzzzzzzzzbbccddeeeo     ',
'obcaaobcccccccccccdddeeo      ',
' obbzzoobccccccdddddeeo       ',
'  ooooo obbddddoooddbo        ',
'        obbcoo   obbco       ',
'       obffo     obffo       ',
'       ooooo     ooooo       '];
const art={
rock:['    tt      ','   tllt tt  ','  tlllstllt ',' tlllsllllst','tlllsssssstt','tttttttttttt'],
root:['       bb   ','   b   cb   ','  bcb bcb b ',' bccb bcb cb','bbccbbccbbcb','boooooooooob'],
log:[' bbbbbbbbbbb ','boocccccccboo','boedccccccoeb','boebbbbbbbeeb','boedccccccoeb',' booooooooob '],
mushroom:['    mmmmm    ','  mmwwmmmm   ',' mmwwmmmwwm  ','mmmmmmmwwwmmm',' ommmmmmmmmo ','     ee      ','     ee      ','    eeee     '],
thorn:['   g    g    ','   gg  gg g  ',' g ghg ghgg  ',' ggghgghghgg ',' ghghghghghg ','ggggggggggggg'],
bird:['      oo     ','     omoo    ','  bbboewko   ','obccccceeoo  ','  obbbbeoo   ','    oo       '],
acorn:['   bb   ','   cb   ',' bbbbb  ','bbbbbbb ',' beeed  ',' beedd  ','  bdd   ','   b    '],
peanut:['  bbb   ',' bdedb  ',' beedb  ',' bdddb  ','  bdb   ',' bdedb  ',' beedb  ',' bdddb  ','  bbb   '],
meat:['    zzz ','  zqqquz ',' zqqqqqz ','zqqqqqqz',' zqqqqqz ','  zqqqz  ','    zz   '],
steak:['     zzz ','   zqqquz ','  zqqqqqz ',' zqqqqqqz','zqqqqqqqz',' zqqqqqz ','  zqqqz  ','    zz   ']};
function sprite(data,x,y,scale=2,colors=palette){for(let row=0;row<data.length;row++)for(let col=0;col<data[row].length;col++){const c=colors[data[row][col]];if(c)r(x+col*scale,y+row*scale,scale,scale,c)}}
function squirrelLegacy(x,feet,t,pose){ctx.save();ctx.translate(Math.round(x-30),Math.round(feet-40));if(pose==='crash'){ctx.translate(24,18);ctx.rotate(-.6);ctx.translate(-24,-18)}const bounce=pose==='run'?Math.round(Math.sin(t*19)*1.5):0;const squish=pose==='land'?.86:1;ctx.scale(1, squish);for(let row=0;row<squirrel.length;row++)for(let col=0;col<squirrel[row].length;col++){const color=palette[squirrel[row][col]];if(color)r(col*2+(col<8?Math.round(Math.sin(t*10+row*.1)*2):0),row*2+bounce+(1-squish)*40,2,2,color)};if(pose==='run'){const step=Math.sin(t*19)>0;r(16,36+bounce,10,3,'#b88c57');r(step?16:22,38+bounce,9,2,'#402e22');r(step?37:32,36+bounce,8,3,'#402e22');}if(pose==='jump'){r(18,35,9,3,'#5a3625');r(34,34,9,3,'#5a3625')}if(pose==='crash'){r(35,11,2,2,'#fff5d5');r(39,15,2,2,'#fff5d5');r(39,11,2,2,'#fff5d5');r(35,15,2,2,'#fff5d5')}ctx.restore()}
// Six original pixel-art frames, aligned by their foot baselines.
const chipmunk=new Image();chipmunk.src='chipmunk-sprites.png';
const tiger=new Image();tiger.src='tiger-sprites-chipmunk-style.png';
const frames=[[17,144,495,305],[0,144,506,314],[29,143,479,316],[25,41,482,305],[31,109,481,305],[0,67,487,339]];
function squirrelDraw(x,feet,t,pose){
 const sheet=selectedCharacter==='tiger'?tiger:chipmunk;
 if(!sheet.complete||!sheet.naturalWidth){ctx.save();ctx.translate(x,feet);ctx.scale(.8,.8);squirrelLegacy(0,0,t,pose);ctx.restore();return}
 const f=pose==='crash'?5:pose==='land'?4:pose==='jump'?3:pose==='idle'?0:Math.floor(t*(9+speed/65))%3;
 const [sx,sy,sw,sh]=frames[f],dw=72*.8,dh=sh/sw*dw;
 if(selectedSkin==='gold'&&best>=3000)ctx.filter='sepia(1) saturate(2) hue-rotate(325deg) brightness(1.15)';
 ctx.drawImage(sheet,f%3*512+sx,Math.floor(f/3)*512+sy,sw,sh,Math.round(x-43*.8),Math.round(feet-dh),dw,dh);
 ctx.filter='none';
}
let audio=null,musicNext=0,musicStep=0;
function tone(freq,dur=.1,type='square',vol=.035,delay=0,end){if(!audio)return;const when=audio.currentTime+delay,o=audio.createOscillator(),g=audio.createGain();o.type=type;o.frequency.setValueAtTime(freq,when);if(end)o.frequency.exponentialRampToValueAtTime(end,when+dur);g.gain.setValueAtTime(vol,when);g.gain.exponentialRampToValueAtTime(.001,when+dur);o.connect(g);g.connect(audio.destination);o.start(when);o.stop(when+dur+.02)}
function sound(name){if(!soundEnabled)return;if(name==='jump')tone(270,.14,'square',.025,0,640);if(name==='land')tone(100,.045,'triangle',.05,0,50);if(name==='attack'){tone(520,.08,'square',.035,0,980);tone(180,.12,'sawtooth',.025,.04,80)}if(name==='smash'){tone(180,.08,'square',.05,0,70);tone(420,.12,'square',.04,.08,900)}if(name==='acorn'||name==='meat'){tone(880,.06);tone(1320,.09,'square',.025,.065)}if(name==='peanut'||name==='steak'){[660,880,1320,1760].forEach((f,i)=>tone(f,.07,'square',.024,i*.045))}if(name==='crash'){tone(145,.22,'sawtooth',.055,0,40)}if(name==='over'){[392,330,262,196].forEach((f,i)=>tone(f,.18,'triangle',.07,i*.13))}if(name==='best'){[523,659,784,1047].forEach((f,i)=>tone(f,.2,'square',.025,i*.11))}}
function initAudio(){try{if(!audio)audio=new(window.AudioContext||window.webkitAudioContext)();audio.resume();musicNext=audio.currentTime+.1;musicStep=0}catch{}}
const melody=[76,0,79,81,79,76,74,0,72,74,76,0,74,72,69,0,72,0,76,79,81,79,76,74,72,0,74,76,74,71,72,0];
function music(){if(!audio||!musicEnabled||state!=='playing'||document.hidden)return;if(musicNext<audio.currentTime-.2)musicNext=audio.currentTime;while(musicNext<audio.currentTime+.13){const n=melody[musicStep%melody.length],delay=Math.max(0,musicNext-audio.currentTime);if(n)tone(440*2**((n-69)/12),.115,'triangle',.032,delay);if(musicStep%4===0){const bass=[48,53,55,48][Math.floor(musicStep/8)%4];tone(440*2**((bass-69)/12),.21,'triangle',.044,delay)}musicStep++;musicNext+=.16}}
function puff(x,yy,count=6,color='#e7d9a0'){for(let i=0;i<count;i++)particles.push({x,y:yy,vx:rand(-45,25),vy:rand(-45,-10),life:rand(.2,.45),color,size:rand(2,4)})}
function start(){introCount=0;difficultyTier=selectedStartStage;jumpHeld=false;holdTime=0;heldKeys.clear();activePointer=null;state='playing';paused=false;const startScore=selectedStartStage*1500;elapsed=0;distance=startScore*12;bonus=0;score=startScore;combo=0;comboTimer=0;jumpsUsed=0;bossShown=false;bossHits=0;attackCooldown=0;speed=200;spawnAt=W+30;y=GROUND;vy=0;land=0;obstacles=[];items=[];pits=[];projectiles=[];falling=false;particles=[];popups=[];milestone=Math.floor(startScore/1000);flash=0;newBest=false;acc=0;resetPlatformLevel();$('mapOverlay').hidden=true;$('start').hidden=true;$('over').hidden=true;$('hud').hidden=false;$('over').querySelector('h2').textContent='GAME OVER';$('game').classList.remove('paused');$('game').classList.add('playing');$('pauseButton').textContent='PAUSE';initAudio();updateHud();}
function togglePause(){if(state==='playing'){state='paused';$('game').classList.remove('playing');$('game').classList.add('paused');$('pauseButton').textContent='RESUME'}else if(state==='paused'){state='playing';$('game').classList.remove('paused');$('game').classList.add('playing');$('pauseButton').textContent='PAUSE';last=0}}
function attack(){if(state!=='playing'||attackCooldown>0)return;attackCooldown=.28;if(gameMode==='platformer')projectiles.push({x:playerX+22,y:playerY+12,vx:390,life:1.15,type:selectedCharacter==='tiger'?'roar':'acornShot'});else projectiles.push({x:PX+18,y:y-25,vx:390,life:1.15,type:selectedCharacter==='tiger'?'roar':'acornShot'});sound('attack')}
function jump(){
 if(state!=='playing')return;
 if(gameMode==='platformer'){
  if(platformGrounded){playerVY=-JUMP;jumpsUsed=1;sound('jump');return}
  if(selectedCharacter==='squirrel'&&jumpsUsed<2){playerVY=-JUMP*.86;jumpsUsed=2;sound('jump')}
  return;
 }
 if(falling)return;if(y>=GROUND-.1&&vy===0){vy=-JUMP;jumpsUsed=1;sustainAllowed=true;holdTime=0;land=0;puff(PX-9,GROUND-2);sound('jump');return}if(selectedCharacter==='squirrel'&&y<GROUND&&jumpsUsed<2){vy=-JUMP*.86;jumpsUsed=2;sustainAllowed=true;holdTime=0;puff(PX-9,y-2,5,'#dce8b7');sound('jump')}
}
function pressJump(){if(jumpHeld)return;jumpHeld=true;jump()}
function releaseJump(){jumpHeld=false;sustainAllowed=false}
function clearInput(){releaseJump();heldKeys.clear();activePointer=null;leftHeld=false;rightHeld=false}
function updateHud(){$('score').textContent=String(score).padStart(6,'0');$('best').textContent=String(Math.max(best,score)).padStart(6,'0');$('combo').textContent='x'+Math.max(1,combo);$('comboHud').hidden=combo<2;$('stageHud').textContent=stageNames[currentStage()]}
function crash(){clearInput();state='crash';crashTime=0;sound('crash');newBest=score>best;if(newBest){best=score;try{localStorage.setItem('squirrel-adventure-best',String(best))}catch{};updateSkinControls()}puff(PX,y-15,12,'#ffde80')}
function gameOver(){state='over';$('game').classList.remove('playing','paused');$('hud').hidden=true;$('over').hidden=false;$('finalScore').textContent=score.toLocaleString();$('finalBest').textContent=best.toLocaleString();$('newBest').hidden=!newBest;sound('over');if(newBest)setTimeout(()=>{if(state==='over')sound('best')},600)}
function goHome(){clearInput();state='title';paused=false;last=0;acc=0;y=GROUND;vy=0;falling=false;crashTime=0;combo=0;comboTimer=0;attackCooldown=0;obstacles=[];items=[];pits=[];projectiles=[];particles=[];popups=[];$('game').classList.remove('playing','paused');$('mapOverlay').hidden=true;$('over').hidden=true;$('hud').hidden=true;$('start').hidden=false;$('pauseButton').textContent='PAUSE';loadMission();updateSkinControls();updateStoryText();}
const dimensions={thorn:[24,26],bird:[30,20],rock:[30,28],ice:[28,34],boss:[86,72]};
// Isolated hazards reserve the longest jump; short pairs deliberately reward early release.
function difficulty(points=score){const tier=Math.floor(points/1500);return{tier,targetSpeed:Math.min(MAX_SPEED,200+tier*18+(points%1500)/1500*4),recovery:Math.max(.10,.18-tier*.012),pitTime:Math.min(.46,.40+tier*.018),spikeTime:Math.min(.34,.29+tier*.012),pairChance:Math.min(.64,.56+tier*.01),count:Math.min(3,2+Math.floor(tier/3))}}
function minGap(){return Math.min(MAX_SPEED,speed+30)*(AIR+difficulty().recovery)+34}
function addObstacle(x,type,w,h){const d=dimensions[type];w=w||d[0];h=h||d[1];const bottom=type==='bird'?GROUND-8:GROUND;obstacles.push({x,y:bottom-h,w,h,type,baseY:bottom-h,hp:type==='boss'?3:0,extraSpeed:type==='bird'?38:0});}
function foodType(bonusFood=false){if(selectedCharacter==='tiger')return bonusFood?'steak':'meat';return bonusFood?'peanut':'acorn'}
function addItem(x,yy,type){items.push({x,y:yy,type,r:type==='peanut'||type==='steak'?9:8,phase:rand(0,6)})}
function generate(){const cfg=difficulty(),stage=cfg.tier+1,roll=Math.random(),x=spawnAt;let end=x;
// Exactly the first two hazards of every run are separated, low tap-jump spikes.
if(introCount<2){addObstacle(x,'thorn',20,17);addItem(x+7,GROUND-62,foodType());introCount++;spawnAt=x+Math.max(270,speed*1.25);return}
if(introCount===2){addObstacle(x,'thorn',56,23);addItem(x+28,GROUND-62,foodType());introCount++;spawnAt=x+56+minGap();return}
if(stage>=4&&!bossShown){bossShown=true;addObstacle(x+40,'boss');addItem(x+82,GROUND-100,foodType(true));end=x+150}
else if(stage===2&&roll<.16){addObstacle(x,'rock',30,28);addItem(x+15,GROUND-70,foodType());end=x+30}
else if(stage===3&&roll<.18){addObstacle(x,'ice',28,34);addItem(x+14,GROUND-78,foodType());end=x+28}
else if(roll<.02){for(let i=0;i<3;i++)addItem(x+i*24,GROUND-28,foodType());end=x+48}
else if(roll<.20){const width=Math.round(speed*cfg.pitTime);pits.push({x,w:width});for(let i=0;i<3;i++)addItem(x+width*(i+1)/4,GROUND-60-(i===1?12:0),i===1?foodType(true):foodType());end=x+width}
else if(roll<.40){
// Birds move independently. Reserve a full landing interval behind every earlier hazard.
const previousClear=Math.max(0,...obstacles.map(o=>(o.x+o.w-(PX-6))/(speed+(o.extraSpeed||0))),...pits.map(p=>(p.x+p.w-PX)/speed));
const bx=Math.max(x,PX+16+(speed+38)*(previousClear+.85));addObstacle(bx,'bird');end=bx+30+90;
}
else if(roll<cfg.pairChance){const gap=Math.min(MAX_SPEED,speed+45)*Math.max(.65,.72-cfg.tier*.015),count=cfg.count;for(let i=0;i<count;i++){const ox=x+i*gap;addObstacle(ox,'thorn',20,17);addItem(ox+7,GROUND-62,foodType());end=ox+20}}
else if(roll<.91){const width=Math.round(speed*cfg.spikeTime);addObstacle(x,'thorn',width,29);addItem(x+width/2,GROUND-70,Math.random()<.3?foodType(true):foodType());end=x+width}
else{const height=stage>=2?43:26;addObstacle(x,'thorn',26,height);addItem(x+12,GROUND-75,foodType());end=x+26}
spawnAt=end+minGap()+rand(0,stage===1?24:8);
}
function update(dt){if(gameMode==='platformer'){updatePlatform(dt);return}clock+=dt;if(state==='playing'){elapsed+=dt;comboTimer=Math.max(0,comboTimer-dt);if(comboTimer===0)combo=0;const targetSpeed=difficulty().targetSpeed;speed=Math.min(targetSpeed,speed+18*dt);distance+=speed*dt;if(elapsed>=2){spawnAt-=speed*dt;if(spawnAt<W+90)generate();}
for(const pit of pits)pit.x-=speed*dt;
const lift=vy<0&&jumpHeld&&sustainAllowed&&holdTime<HOLD_LIMIT;const gravity=vy<0?(lift?500:1500):GRAVITY;if(y<GROUND||vy<0)holdTime+=dt;vy+=gravity*dt;y+=vy*dt;const overPit=pits.some(p=>PX+4*.8>p.x&&PX+4*.8<p.x+p.w);if(y>=GROUND&&overPit)falling=true;if(y>=GROUND&&!falling){if(vy>100){puff(PX-7,GROUND-2,5);sound('land');land=.10}y=GROUND;vy=0;jumpsUsed=0}land=Math.max(0,land-dt);if(y>H+45)crash();
for(const o of obstacles){o.x-=(speed+(o.extraSpeed||0))*(o.type==='boss'?.72:1)*dt;if(o.type==='boss')o.y=o.baseY+Math.sin(clock*2.4)*24}for(const it of items)it.x-=speed*dt;attackCooldown=Math.max(0,attackCooldown-dt);for(const p of projectiles){p.x+=p.vx*dt;p.life-=dt;for(const o of obstacles){if(o.smashed)continue;if(p.x>o.x&&p.x<o.x+o.w&&p.y>o.y&&p.y<o.y+o.h){if(o.type==='boss'){o.hp=(o.hp||3)-1;if(o.hp<=0){o.smashed=true;bonus+=500;popups.push({x:o.x+o.w/2,y:o.y-18,text:'BOSS DEFEATED! +500',life:1.2})}else popups.push({x:o.x+o.w/2,y:o.y-18,text:'HIT! '+o.hp,life:.6})}else{o.smashed=true;bonus+=80;popups.push({x:o.x+o.w/2,y:o.y-12,text:'+80',life:.6})}p.life=0;sound('smash');puff(p.x,p.y,8,'#ffd36e');break}}}projectiles=projectiles.filter(p=>p.life>0&&p.x<W+30);
const box={x:PX-8,y:y-25,w:18,h:23};for(const o of obstacles){if(box.x+box.w>o.x+5&&box.x<o.x+o.w-5&&box.y+box.h>o.y+4&&box.y<o.y+o.h-3){const smashable=o.type==='thorn'&&o.h<=26||o.type==='boss';if(selectedCharacter==='tiger'&&smashable&&vy>35){o.smashed=true;vy=-JUMP*.55;y=Math.min(y,o.y-4);const smashPoints=o.type==='boss'?500:150;bonus+=smashPoints;combo=Math.min(9,combo+1);comboTimer=1.25;flash=.35;puff(o.x+o.w/2,o.y,12,'#ffd36e');popups.push({x:o.x+o.w/2,y:o.y-18,text:o.type==='boss'?'BOSS BREAK! +500':'ROAR! +150',life:1});sound('smash')}else{crash()}break}}
if(state==='playing'){for(const it of items){if(!it.taken&&Math.abs(it.x-(PX+4*.8))<it.r+15*.8&&Math.abs(it.y-(y-17*.8))<it.r+17*.8){it.taken=true;const rare=it.type==='peanut'||it.type==='steak';const basePoints=rare?300:100;combo=Math.min(9,combo+1);comboTimer=1.25;const points=basePoints*combo;bonus+=points;updateMission('collect',missionProgress+1);updateMission('combo',combo);sound(it.type);puff(it.x,it.y,10,rare?'#fff4bc':'#ffe277');popups.push({x:it.x,y:it.y-14,text:'+'+points+(combo>1?' x'+combo:''),life:.8})}}score=Math.floor(distance/12)+bonus;updateMission('score',score);const tier=Math.floor(score/1500);if(tier>difficultyTier){difficultyTier=tier;flash=.6;const stage=tier%4;popups.push({x:W/2,y:170,text:stageNames[stage],life:1.3});popups.push({x:W/2,y:190,text:stageGoals[stage],life:1.3})}const m=Math.floor(score/1000);if(m>milestone){milestone=m;flash=.45;popups.push({x:W/2,y:160,text:milestone*1000+'!',life:1.2})}updateHud()}
pits=pits.filter(p=>p.x+p.w>-25);obstacles=obstacles.filter(o=>!o.smashed&&o.x+o.w>-8);items=items.filter(it=>it.x>-30&&!it.taken);music();
}else if(state==='crash'){crashTime+=dt;if(crashTime>.65)gameOver()}
for(const p of particles){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=100*dt}particles=particles.filter(p=>p.life>0);for(const p of popups){p.life-=dt;p.y-=22*dt}popups=popups.filter(p=>p.life>0);flash=Math.max(0,flash-dt);}
function cloud(x,yy,s){r(x+9*s,yy,29*s,6*s,'#f6f4cb');r(x,yy+6*s,56*s,8*s,'#f6f4cb');r(x+5*s,yy+14*s,46*s,3*s,'#e8efbc')}
function crown(x,yy,s,c,light){r(x-19*s,yy,38*s,8*s,c);r(x-30*s,yy+8*s,60*s,11*s,c);r(x-39*s,yy+19*s,78*s,19*s,c);r(x-32*s,yy+38*s,63*s,13*s,c);r(x-20*s,yy+51*s,42*s,8*s,c);r(x-20*s,yy+6*s,26*s,6*s,light);r(x-29*s,yy+17*s,16*s,7*s,light);r(x+7*s,yy+12*s,13*s,5*s,light)}
function tree(x,base,scale,front=false){const bark=front?'#78673b':'#97aa64';r(x-5*scale,base-125*scale,11*scale,125*scale,bark);r(x-2*scale,base-105*scale,3*scale,105*scale,front?'#a58b4c':'#b1bc79');poly([[x,base-62*scale],[x-22*scale,base-90*scale],[x-17*scale,base-94*scale],[x+4*scale,base-70*scale]],bark);crown(x,base-155*scale,scale,front?'#49753c':'#89af64',front?'#648d46':'#a3c677');if(front)crown(x-21*scale,base-117*scale,.67*scale,'#4d7b3f','#709849')}
function background(){
 const d=state==='title'?clock*7:distance,stage=Math.floor(score/1500)%4;
 const themes=[
  {sky:'#d6e8bf',top:'#cce3be',sun:'#f7e9ae',hill:'#b6ce99',grass:'#a0ba78',edge:'#83a45a',soil:'#b78c59',soil2:'#ad8254',mark:'#bd9362'},
  {sky:'#f1c48e',top:'#e9a978',sun:'#ffe1a3',hill:'#d18d70',grass:'#b88759',edge:'#976044',soil:'#8f5d4a',soil2:'#75483e',mark:'#ad7458'},
  {sky:'#253653',top:'#182843',sun:'#e8d59a',hill:'#40516c',grass:'#34475f',edge:'#27374f',soil:'#4a3d45',soil2:'#382f3d',mark:'#625064'},
  {sky:'#d8edf1',top:'#b8dbe5',sun:'#fff5c7',hill:'#a9cbd2',grass:'#d8e8df',edge:'#abc8c2',soil:'#c5b39c',soil2:'#a99582',mark:'#e5d7bd'}
 ][stage];
 r(0,0,W,H,themes.sky);r(0,0,W,200,themes.top);r(266,157,30,30,themes.sun);
 if(stage!==2){cloud(30-(d*.012%470),160,.8);cloud(290-(d*.012%470),211,.6)}else{for(let i=0;i<14;i++){const sx=(i*71+29)%W,sy=35+(i*47)%220;r(sx,sy,2,2,'#dbe8ff')}}
 poly([[-30,350],[70,284],[110,284],[205,349],[280,300],[380,347],[380,420],[-30,420]],themes.hill);
 // Only a few softly colored distant trees move, at a small fraction of running speed.
 for(let i=-1;i<4;i++){const x=i*160-(d*.055%160);tree(x,GROUND-18,.68,false)}
 r(0,GROUND-24,W,24,themes.grass);r(0,GROUND-7,W,7,themes.edge);r(0,GROUND,W,5,stage===2?'#1e2a3c':'#4c6534');
 r(0,GROUND+5,W,H-GROUND-5,themes.soil);r(0,GROUND+31,W,H-GROUND-31,themes.soil2);
 // Sparse low-contrast ground marks communicate speed without a dense scrolling texture.
 for(let i=-1;i<5;i++){const x=i*112-(d%112);r(x,GROUND+43,16,2,themes.mark)}
 if(stage===3){for(let i=0;i<12;i++){const sx=(i*43+17-d*.02)%W,sy=230+(i*31)%150;r(sx,sy,3,3,'#f6fbff')}}
 for(const p of pits){r(p.x,GROUND-7,p.w,H-GROUND+7,'#18352c');r(p.x+4,GROUND+7,p.w-8,H-GROUND,'#102620');r(p.x-4,GROUND-7,4,12,'#d9bf87');r(p.x+p.w,GROUND-7,4,12,'#d9bf87');r(p.x-4,GROUND+5,4,16,'#805f42');r(p.x+p.w,GROUND+5,4,16,'#805f42')}
}
function drawSpikes(o){
 // Repeated sharp pixel silhouettes: width is legible even for long spike beds.
 const count=Math.max(1,Math.round(o.w/13)),unit=o.w/count;
 for(let i=0;i<count;i++){const left=o.x+i*unit;
  for(let row=0;row<o.h;row+=2){const half=Math.max(1,Math.round((row+2)/o.h*unit/2));const cx=Math.round(left+unit/2);r(cx-half,o.y+row,half*2,Math.min(2,o.h-row),'#333a31');if(half>3)r(cx-half+2,o.y+row,2,Math.min(2,o.h-row),'#87917c')}
 }
}
function drawRock(o){sprite(art.rock,o.x,o.y-2,2);r(o.x+5,o.y+o.h-3,o.w-10,3,'#405346')}
function drawIce(o){poly([[o.x,o.y+o.h],[o.x+o.w*.5,o.y],[o.x+o.w,o.y+o.h]],'#bfe9e8');r(o.x+o.w*.45,o.y+7,3,o.h-10,'#f4ffff');r(o.x+4,o.y+o.h-5,o.w-8,3,'#6ea6a8')}
function drawBoss(o){r(o.x+12,o.y+15,62,48,'#553d35');r(o.x+5,o.y+30,76,35,'#71483c');r(o.x+20,o.y+2,15,19,'#71483c');r(o.x+55,o.y+2,15,19,'#71483c');r(o.x+27,o.y+30,8,8,'#f8e9b2');r(o.x+57,o.y+30,8,8,'#f8e9b2');r(o.x+29,o.y+32,4,4,'#2a3022');r(o.x+59,o.y+32,4,4,'#2a3022');r(o.x+40,o.y+45,8,6,'#e38b68');r(o.x+25,o.y+63,16,7,'#402e22');r(o.x+52,o.y+63,16,7,'#402e22')}
function drawProjectile(p){if(p.type==='roar'){const flicker=Math.round(Math.sin(clock*28+p.x*.05)*2);poly([[p.x-7,p.y],[p.x-1,p.y-8-flicker],[p.x+6,p.y-4],[p.x+14,p.y-11+flicker],[p.x+11,p.y-1],[p.x+20,p.y+2],[p.x+10,p.y+6],[p.x+5,p.y+12+flicker],[p.x+1,p.y+4]],'#c7472d');poly([[p.x-1,p.y],[p.x+4,p.y-5-flicker],[p.x+10,p.y-2],[p.x+14,p.y-5],[p.x+12,p.y+2],[p.x+6,p.y+7],[p.x+3,p.y+3]],'#ffcf52');r(p.x+6,p.y-2,5,5,'#fff2a6')}else{r(p.x,p.y-4,8,8,'#5a3625');r(p.x+6,p.y-7,7,14,'#e7a95b');r(p.x+12,p.y-3,4,6,'#ffdc99')}}
function drawPlatform(){ctx.imageSmoothingEnabled=false;ctx.save();const t=selectedStartStage%4;const sky=['#cce3be','#e9a978','#253653','#b8dbe5'][t],far=['#b6ce99','#d18d70','#40516c','#a9cbd2'][t];r(0,0,W,H,sky);r(0,230,W,190,far);for(let i=-1;i<8;i++){const x=i*120-(cameraX*.18%120);tree(x,GROUND-18,.55,false)}for(let i=0;i<7;i++){const x=i*180-(cameraX*.38%180);r(x,GROUND-80,8,80,'#526d42');r(x-18,GROUND-112,45,30,'#5f8749')}for(const p of platforms){const sx=p.x-cameraX;if(sx>W||sx+p.w<0)continue;r(sx,p.y,p.w,p.h,p.y===GROUND?'#8c6547':'#5a7b4a');r(sx,p.y,p.w,5,p.y===GROUND?'#d5a66b':'#a7c96f')}for(const e of platformEnemies){if(!e.alive)continue;const sx=e.x-cameraX;if(sx<-30||sx>W+30)continue;r(sx,e.y+8,24,16,'#71483c');r(sx+3,e.y,7,10,'#71483c');r(sx+14,e.y,7,10,'#71483c');r(sx+5,e.y+8,4,4,'#f7e9ae');r(sx+15,e.y+8,4,4,'#f7e9ae')}const gx=goalX-cameraX;r(gx,GROUND-105,4,105,'#4c6534');poly([[gx+4,GROUND-105],[gx+42,GROUND-93],[gx+4,GROUND-80]],'#e6b84e');r(gx-9,GROUND-5,22,5,'#4c6534');for(const p of projectiles){const copy={...p,x:p.x-cameraX};drawProjectile(copy)}const pose=state==='crash'?'crash':playerVY<-20?'jump':Math.abs(playerVX)>20?'run':'idle';squirrelDraw(playerX-cameraX,playerY+28,clock,pose);for(const p of particles){ctx.globalAlpha=Math.min(1,p.life*4);r(p.x-cameraX,p.y,Math.round(p.size),Math.round(p.size),p.color)}ctx.globalAlpha=1;for(const p of popups){ctx.globalAlpha=Math.min(1,p.life*3);ctx.font='bold 13px monospace';ctx.textAlign='center';ctx.fillStyle='#4d512c';ctx.fillText(p.text,Math.round(p.x-cameraX)+1,Math.round(p.y)+1);ctx.fillStyle='#fff2ae';ctx.fillText(p.text,Math.round(p.x-cameraX),Math.round(p.y))}ctx.globalAlpha=1;ctx.restore()}
function drawBird(o){
 ctx.save();ctx.translate(Math.round(o.x+o.w),Math.round(o.y));ctx.scale(-1,1);
 sprite(art.bird,1,6,2,{...palette,o:'#273a50',b:'#397993',c:'#62adc4',e:'#ffe2a0',w:'#ffffff',k:'#192634',m:'#dc9650'});
 const flap=Math.sin(clock*18)>0;r(9,flap?1:10,12,4,'#273a50');r(11,flap?0:12,8,3,'#62adc4');ctx.restore();
}
function draw(){if(gameMode==='platformer'){drawPlatform();return}ctx.imageSmoothingEnabled=false;ctx.save();if(state==='crash'&&crashTime<.22)ctx.translate(Math.round(rand(-3,3)),Math.round(rand(-2,2)));background();for(const it of items){const bob=Math.round(Math.sin(clock*5+it.phase)*2);sprite(art[it.type],it.x-8,it.y-8+bob,2);if(Math.sin(clock*5+it.phase)>.5){r(it.x+10,it.y-12+bob,2,6,'#fff4b8');r(it.x+8,it.y-10+bob,6,2,'#fff4b8')}}for(const p of projectiles)drawProjectile(p);for(const o of obstacles){if(o.type==='bird')drawBird(o);else if(o.type==='rock')drawRock(o);else if(o.type==='ice')drawIce(o);else if(o.type==='boss')drawBoss(o);else drawSpikes(o);}
if(state==='title'){squirrelDraw(PX,GROUND,clock,'run');sprite(art[foodType()],197,GROUND-17,2);sprite(art[foodType(true)],286,GROUND-19,2)}else{squirrelDraw(PX,y,clock,state==='crash'||state==='over'?'crash':y<GROUND?'jump':land>0?'land':'run')}
for(const p of particles){ctx.globalAlpha=Math.min(1,p.life*4);r(p.x,p.y,Math.round(p.size),Math.round(p.size),p.color)}ctx.globalAlpha=1;for(const p of popups){ctx.globalAlpha=Math.min(1,p.life*3);ctx.font='bold 13px monospace';ctx.textAlign='center';ctx.fillStyle='#4d512c';ctx.fillText(p.text,Math.round(p.x)+1,Math.round(p.y)+1);ctx.fillStyle='#fff2ae';ctx.fillText(p.text,Math.round(p.x),Math.round(p.y))}ctx.globalAlpha=1;if(flash>0){ctx.strokeStyle='#ffe79c';ctx.lineWidth=4;ctx.globalAlpha=flash*1.6;ctx.strokeRect(3,3,W-6,H-6);ctx.globalAlpha=1}ctx.restore()}
function frame(now){if(!last)last=now;const delta=Math.min((now-last)/1000,.05);last=now;if(!document.hidden){acc+=delta;while(acc>=1/120){update(1/120);acc-=1/120}draw()}requestAnimationFrame(frame)}
 const characterButtons=[...document.querySelectorAll('[data-character]')];
 const skinButtons=[...document.querySelectorAll('[data-skin]')];
 function updateSkinControls(){const unlocked=best>=3000;skinButtons.forEach(button=>{const gold=button.dataset.skin==='gold';button.disabled=gold&&!unlocked;button.classList.toggle('selected',button.dataset.skin===selectedSkin&&(!gold||unlocked));button.textContent=gold?(unlocked?'황금 스킨':'황금 스킨 🔒'):'기본 스킨'})}
 function chooseSkin(name){if(name==='gold'&&best<3000)return;selectedSkin=name==='gold'?'gold':'classic';skinButtons.forEach(button=>button.classList.toggle('selected',button.dataset.skin===selectedSkin));try{localStorage.setItem('squirrel-adventure-skin',selectedSkin)}catch{}}
 skinButtons.forEach(button=>button.addEventListener('click',()=>chooseSkin(button.dataset.skin)));
 function chooseCharacter(name){
  if(name!=='squirrel'&&name!=='tiger')return;
  selectedCharacter=name;
 characterButtons.forEach(button=>{
   const active=button.dataset.character===name;
   button.classList.toggle('selected',active);
  button.setAttribute('aria-pressed',String(active));
  });
  $('abilityHint').textContent=name==='tiger'?'능력: 낮은 가시를 밟아 부수기':'능력: 공중 2단 점프';
  updateStoryText();
  try{localStorage.setItem('squirrel-adventure-character',name)}catch{}
 }
 characterButtons.forEach(button=>button.addEventListener('click',()=>chooseCharacter(button.dataset.character)));
 try{const saved=localStorage.getItem('squirrel-adventure-character');if(saved)chooseCharacter(saved)}catch{}
 loadMission();updateSkinControls();
 updateStoryText();
 $('mapButton').addEventListener('click',()=>{$('mapOverlay').hidden=false;updateStoryText()});
 $('mapClose').addEventListener('click',()=>{$('mapOverlay').hidden=true});
 document.querySelectorAll('[data-stage]').forEach(node=>node.addEventListener('click',()=>{const stage=Number(node.dataset.stage);if(node.disabled)return;selectedStartStage=stage;updateStoryText();$('mapOverlay').hidden=true}));
 const soundToggle=$('soundToggle'),musicToggle=$('musicToggle');
 function updateAudioButtons(){soundToggle.textContent='효과음 '+(soundEnabled?'ON':'OFF');musicToggle.textContent='음악 '+(musicEnabled?'ON':'OFF');soundToggle.classList.toggle('active',soundEnabled);musicToggle.classList.toggle('active',musicEnabled)}
 soundToggle.addEventListener('click',()=>{soundEnabled=!soundEnabled;try{localStorage.setItem('squirrel-adventure-sound',soundEnabled?'on':'off')}catch{};updateAudioButtons()});
 musicToggle.addEventListener('click',()=>{musicEnabled=!musicEnabled;try{localStorage.setItem('squirrel-adventure-music',musicEnabled?'on':'off')}catch{};updateAudioButtons()});
 updateAudioButtons();
 $('pauseButton').addEventListener('click',togglePause);
 $('attackButton').addEventListener('pointerdown',e=>{e.preventDefault();attack()});
 const bindMoveButton=(id,direction)=>{const button=$(id);const press=e=>{e.preventDefault();if(direction==='left')leftHeld=true;else rightHeld=true};const release=e=>{e.preventDefault();if(direction==='left')leftHeld=false;else rightHeld=false};button.addEventListener('pointerdown',press);button.addEventListener('pointerup',release);button.addEventListener('pointercancel',release);button.addEventListener('lostpointercapture',release)};
 bindMoveButton('leftButton','left');bindMoveButton('rightButton','right');
 $('startButton').addEventListener('click',start);$('restartButton').addEventListener('click',start);$('homeButton').addEventListener('click',goHome);
window.addEventListener('keydown',e=>{if(e.code==='ArrowLeft'||e.code==='KeyA'){e.preventDefault();leftHeld=true;return}if(e.code==='ArrowRight'||e.code==='KeyD'){e.preventDefault();rightHeld=true;return}if(e.code==='KeyP'){e.preventDefault();if(state==='playing'||state==='paused')togglePause();return}if(e.code==='KeyX'||e.code==='KeyZ'){e.preventDefault();if(!e.repeat)attack();return}if(e.code!=='Space'&&e.code!=='ArrowUp')return;e.preventDefault();if(e.repeat||heldKeys.has(e.code))return;if(state==='title'||state==='over'){start();return}if(state==='paused')return;heldKeys.add(e.code);pressJump()});
window.addEventListener('keyup',e=>{if(e.code==='ArrowLeft'||e.code==='KeyA'){leftHeld=false;return}if(e.code==='ArrowRight'||e.code==='KeyD'){rightHeld=false;return}if(e.code!=='Space'&&e.code!=='ArrowUp')return;e.preventDefault();heldKeys.delete(e.code);if(!heldKeys.size&&activePointer===null)releaseJump()});
$('game').addEventListener('pointerdown',e=>{if(e.target.closest('button')||state!=='playing'||activePointer!==null||e.isPrimary===false)return;e.preventDefault();activePointer=e.pointerId;try{$('game').setPointerCapture(e.pointerId)}catch{}pressJump()});
function endPointer(e){if(e.pointerId!==activePointer)return;activePointer=null;if(!heldKeys.size)releaseJump()}
window.addEventListener('pointerup',endPointer);window.addEventListener('pointercancel',endPointer);$('game').addEventListener('lostpointercapture',endPointer);
$('game').addEventListener('contextmenu',e=>e.preventDefault());
$('game').addEventListener('selectstart',e=>e.preventDefault());
$('game').addEventListener('dragstart',e=>e.preventDefault());
for(const name of ['touchstart','touchmove'])$('game').addEventListener(name,e=>{if(state==='playing'&&!e.target.closest('button')&&e.cancelable)e.preventDefault()},{passive:false});window.addEventListener('blur',clearInput);
document.addEventListener('visibilitychange',()=>{clearInput();last=0;acc=0;if(audio){if(document.hidden)audio.suspend();else if(state==='playing')audio.resume()}});
window.addEventListener('storage',e=>{if(e.key==='squirrel-adventure-best'){best=Math.max(best,Number(e.newValue)||0);updateHud()}});
resetPlatformLevel();
requestAnimationFrame(frame);
})();
