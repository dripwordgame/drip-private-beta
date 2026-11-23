/* DRIP 3.2 SOUND EDITION — original procedural soundtrack, no audio assets.
   Browser AudioContext is ONLY started after a user gesture. No tracking or uploads. */
(() => {
'use strict';
const STORAGE = 'dripAudio32';
const defaults={music:true,effects:true,countdown:false,musicVolume:35,fxVolume:65};
let pref={...defaults};
try{pref={...defaults,...JSON.parse(localStorage.getItem(STORAGE)||'{}')}}catch{}
let ctx=null,master=null,musicBus=null,fxBus=null,sceneBus=null,playing=false,scene='menu',step=0,nextNote=0,interval=null,focusWasActive=false,intensity=0,lastScene='menu',lastControl=null;
const $=id=>document.getElementById(id);
const clamp=(x,min,max)=>Math.max(min,Math.min(max,Number(x)||0));
const save=()=>{try{localStorage.setItem(STORAGE,JSON.stringify(pref))}catch{}};
const level=(value)=>Math.max(.00001,value);
function ramp(g,value,when,duration=.16){if(!g)return;const t=when??ctx.currentTime;g.gain.cancelScheduledValues(t);g.gain.setTargetAtTime(level(value),t,Math.max(.01,duration/3));}
function init(){if(ctx)return true;const C=window.AudioContext||window.webkitAudioContext;if(!C)return false;
try{ctx=new C();master=ctx.createGain();musicBus=ctx.createGain();fxBus=ctx.createGain();sceneBus=ctx.createGain();const comp=ctx.createDynamicsCompressor();comp.threshold.value=-18;comp.knee.value=15;comp.ratio.value=3;comp.attack.value=.008;comp.release.value=.19;sceneBus.connect(musicBus);musicBus.connect(master);fxBus.connect(master);master.connect(comp);comp.connect(ctx.destination);master.gain.value=.75;musicBus.gain.value=.00001;fxBus.gain.value=.00001;sceneBus.gain.value=.00001;updateLevels();return true;}catch(e){ctx=null;return false}}
function updateLevels(){if(!ctx)return;const t=ctx.currentTime;const music=playing&&pref.music?Math.pow(clamp(pref.musicVolume,0,100)/100,1.5)*.43:0;const fx=playing&&pref.effects?Math.pow(clamp(pref.fxVolume,0,100)/100,1.25)*.52:0;ramp(musicBus,music,t,.15);ramp(fxBus,fx,t,.08);ramp(sceneBus,scene==='tutorial'?.42:1,t,.4)}
function tone(hz,start,duration,opt={}){if(!ctx||!playing||!Number.isFinite(hz)||hz<20)return;const gain=ctx.createGain(),osc=ctx.createOscillator();let output=gain;const bus=opt.bus==='fx'?fxBus:sceneBus;
if(opt.filter){const lp=ctx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=opt.filter;gain.connect(lp);lp.connect(bus)}else gain.connect(bus);
osc.type=opt.wave||'sine';osc.frequency.setValueAtTime(hz,start);if(opt.end&&opt.end>10)osc.frequency.exponentialRampToValueAtTime(opt.end,start+duration*.8);osc.connect(gain);const amp=clamp(opt.amp??.08,0,.4);gain.gain.setValueAtTime(.00001,start);gain.gain.exponentialRampToValueAtTime(level(amp),start+Math.min(.045,duration*.2));gain.gain.exponentialRampToValueAtTime(.00001,start+duration);osc.start(start);osc.stop(start+duration+.01);osc.onended=()=>{try{osc.disconnect();gain.disconnect()}catch{}}}
const midi=n=>440*Math.pow(2,(n-69)/12);
// Original two-bar motifs; menu pentatonic major vs gameplay minor. These are
// small synthesized sequences, not samples or third-party songs.
const menuNotes=[69,null,72,76,null,74,72,null,69,null,67,72,null,64,67,null];
const gameNotes=[57,null,null,60,64,null,60,null,57,null,65,null,64,null,60,null];
const resultsNotes=[69,null,72,null,76,null,79,null,76,null,72,null,81,null,76,null];
function scheduleMusic(){if(!ctx||!playing)return;if(!pref.music){nextNote=ctx.currentTime+.08;return}const bpm=scene==='menu'?100:scene==='game'||scene==='ranked'?113:96;const tick=60/bpm/2;const now=ctx.currentTime;
while(nextNote<now+.18){const beat=step%16;const mode=scene==='tutorial'?'menu':scene;const notes=mode==='game'||mode==='ranked'?gameNotes:mode==='results'?resultsNotes:menuNotes;
const note=notes[beat];if(note!=null){tone(midi(note),nextNote,tick*(mode==='menu'?1.8:1.2),{wave:mode==='menu'?'sine':'triangle',amp:mode==='menu'?.07:.056,filter:mode==='game'||mode==='ranked'?850:1600});if(mode==='menu'&&beat%4===0)tone(midi(note-12),nextNote,tick*3,{wave:'sine',amp:.024})}
if(beat%4===0){const roots=mode==='menu'?[45,43,48,43]:mode==='results'?[45,48,52,48]:[45,41,43,40];tone(midi(roots[Math.floor(step/4)%4]),nextNote,tick*2.8,{wave:'sine',amp:mode==='game'||mode==='ranked'?.055:.042})}
if(mode==='game'||mode==='ranked'){if(beat%4===2)tone(145,nextNote,.09,{wave:'triangle',amp:.020+intensity*.007,end:85});if(intensity>=2&&beat%2===0)tone(680,nextNote,.027,{wave:'sine',amp:.009});if(intensity>=4&&beat%4===3)tone(midi(83),nextNote,.09,{wave:'triangle',amp:.017})}
if(mode==='menu'&&beat%4===2)tone(790,nextNote,.07,{wave:'sine',amp:.015});
step++;nextNote+=tick;}
}
function scheduleStart(){if(interval)clearInterval(interval);if(!ctx||!playing)return;step=0;nextNote=ctx.currentTime+.08;interval=setInterval(scheduleMusic,75);scheduleMusic()}
async function enable(){if(!init()){status('Sound is not supported by this browser.');return}playing=true;try{await ctx.resume()}catch{}if(ctx.state!=='running'){playing=false;status('Tap Enable Sound again if your browser blocked playback.');updateUI();return}updateLevels();scheduleStart();effect('enabled');updateUI()}
function disable(){playing=false;if(interval)clearInterval(interval);interval=null;updateLevels();updateUI()}
function toggle(){if(playing)disable();else enable()}
function sceneSet(value){if(!['menu','game','ranked','tutorial','results'].includes(value))return;lastScene=scene;scene=value;intensity=0;if(ctx&&playing){ramp(sceneBus,.00001,ctx.currentTime,.13);setTimeout(()=>{if(!playing||scene!==value)return;step=0;nextNote=ctx.currentTime+.04;ramp(sceneBus,1,ctx.currentTime,.28)},155)}updateUI()}
function intensitySet(value){intensity=clamp(value,0,4)}
function effect(type){if(!playing||!pref.effects||!init())return;const t=ctx.currentTime+.009;const s=(hz,delay,duration,amp,other={})=>tone(hz,t+delay,duration,{bus:'fx',amp,...other});
if(type==='drop'){s(540,0,.16,.14,{end:315});s(930,.12,.16,.055,{end:570});}
else if(type==='bad'){s(290,0,.10,.15,{end:220});s(210,.08,.14,.07,{end:145});}
else if(type==='win'||type==='perfect'||type==='enabled'){const notes=type==='perfect'?[76,81,88,93]:type==='enabled'?[76,81]:[72,76,81];notes.forEach((n,i)=>s(midi(n),i*.085,.22,.10,{wave:'triangle'}));if(type==='perfect'){s(174,.36,.33,.085);s(midi(100),.35,.36,.07)}}
else if(type==='finish'){[69,72,76,81,88].forEach((n,i)=>s(midi(n),i*.09,.28,.09,{wave:'triangle'}));}
else if(type==='tick'){s(670,0,.065,.045,{wave:'sine',end:530});}}
function countdown(sec){if(playing&&pref.countdown&&sec<=5&&sec>=1)effect('tick')}
function status(message){if($('audioStatus'))$('audioStatus').textContent=message}
function updateUI(){if($('sound')){$('sound').textContent=playing?'🔊':'🔇';$('sound').setAttribute('aria-label',playing?'Mute all sound':'Enable sound');$('sound').setAttribute('aria-pressed',String(playing));$('sound').title=playing?'Mute music and effects':'Enable soundtrack'}if($('audioEnable'))$('audioEnable').textContent=playing?'🔇 MUTE EVERYTHING':'🔊 ENABLE SOUND & PREVIEW';status(playing?`Now playing: ${scene==='menu'?'chilled menu':scene==='results'?'celebration':scene==='tutorial'?'gentle tutorial':'focused gameplay'} soundtrack.`:'Sound is off. Tap Enable Sound to hear the game.');}
function bind(){const checkbox=[['audioMusic','music'],['audioEffects','effects'],['audioCountdown','countdown']];checkbox.forEach(([id,k])=>{const node=$(id);node.checked=!!pref[k];node.addEventListener('change',()=>{pref[k]=node.checked;save();updateLevels();if(k==='effects'&&node.checked)effect('drop')})});const volumes=[['audioMusicVolume','audioMusicValue','musicVolume'],['audioFxVolume','audioFxValue','fxVolume']];volumes.forEach(([id,value,key])=>{const slider=$(id),output=$(value);slider.value=pref[key];output.textContent=pref[key]+'%';slider.addEventListener('input',()=>{pref[key]=clamp(slider.value,0,100);output.textContent=pref[key]+'%';save();updateLevels()})});
const modal=$('audioModal');const close=()=>{modal.hidden=true;document.body.style.overflow='';lastControl?.focus({preventScroll:true})};$('audioSettingsBtn').addEventListener('click',()=>{lastControl=document.activeElement;modal.hidden=false;document.body.style.overflow='hidden';$('audioClose').focus()});$('audioClose').onclick=close;modal.addEventListener('click',e=>{if(e.target===modal)close()});document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!modal.hidden)close()});$('audioEnable').onclick=toggle;
// Browsers must not start audible audio until an explicit player action.
// Existing sound preference is remembered, but not auto-resumed across reloads.
updateUI();document.addEventListener('visibilitychange',()=>{if(!ctx||!playing)return;if(document.hidden){ctx.suspend();focusWasActive=true}else if(focusWasActive){/* no forced resumption: next explicit user interaction can resume */focusWasActive=false}});
document.addEventListener('pointerdown',()=>{if(playing&&ctx?.state==='suspended')ctx.resume().catch(()=>{})},{passive:true});
const rank=$('rankInGame');if(rank){new MutationObserver(()=>{if(!rank.hidden&&$('play').hidden&&$('end').hidden)sceneSet('ranked')}).observe(rank,{attributes:true,attributeFilter:['hidden']})}
}
window.dripAudio={toggle,enable,scene:sceneSet,effect,intensity:intensitySet,countdown};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind);else bind();
})();
