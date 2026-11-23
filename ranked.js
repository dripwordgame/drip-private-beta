/* DRIP Global Ranked. Never place a Supabase secret/service_role key in client code. */
(() => {
'use strict';
const el = id => document.getElementById(id);
const URL = window.DRIP_SUPABASE_URL;
const KEY = window.DRIP_SUPABASE_PUBLISHABLE_KEY;
const ready = URL && KEY && !URL.includes('YOUR_') && !KEY.includes('YOUR_') && window.supabase?.createClient;
let client=null, current=null, polling=null, clock=null, busy=false, active=false;
const scores=[100,70,45,25,10];
function msg(s){el('rankNotice').textContent=s;}
function setBusy(v){busy=v;['rankStart','rankGuess','rankSkip','rankNext','rankRefresh'].forEach(id=>el(id).disabled=v);}
async function rpc(name,args){const {data,error}=await client.rpc(name,args);if(error)throw new Error(error.message);return data;}
function text(id,v){el(id).textContent=String(v);}
function renderBoard(rows){const node=el('rankBoard');node.replaceChildren();if(!rows?.length){const p=document.createElement('p');p.textContent='No completed ranked runs yet. Be the first!';node.append(p);return;}
 rows.forEach(item=>{const r=document.createElement('div');r.className='rank-player';const left=document.createElement('span');left.textContent=`#${item.rank}  ${item.country}  ${item.nickname}`;const right=document.createElement('b');right.textContent=`${item.score}/500`;r.append(left,right);node.append(r)})}
async function board(){if(!client)return;try{const [rows,personal]=await Promise.all([rpc('drip_leaderboard',{}),rpc('drip_my_rank',{})]);renderBoard(rows);const rank=el('personalRank'),detail=el('personalDetail');if(personal?.rank){rank.textContent='#'+personal.rank;detail.textContent=`${personal.score}/500 points · ${personal.players} completed players worldwide today · official result saved.`;}else{rank.textContent='—';detail.textContent=personal?.players?`${personal.players} completed players so far. Finish your daily ranked run to join them.`:'Be the first on today’s leaderboard. Complete all five mysteries to get your rank.';}}catch(e){msg('Leaderboard: '+e.message);el('personalRank').textContent='—';el('personalDetail').textContent='Could not load your world ranking.'}}
function showSection(status){el('rankInGame').hidden=status==='idle';el('rankReady').hidden=status!=='idle';}
function render(data){const previous=current;current=data;showSection(data.status);if(data.status==='complete'){window.dripAudio?.scene('results');if(previous?.status!=='complete')window.dripAudio?.effect('finish')}else{if(!previous||previous.status==='complete')window.dripAudio?.scene('ranked');window.dripAudio?.intensity(Math.max(0,(data.clue_index||1)-1));if(data.status==='reveal'&&previous?.status==='playing')window.dripAudio?.effect(data.last_result?.points?'win':'bad');else if(data.status==='playing'&&previous?.clue_index!==data.clue_index)window.dripAudio?.effect('drop')}el('rankClues').replaceChildren();el('rankFeedback').hidden=true;el('rankAnswerArea').hidden=true;el('rankNext').hidden=true;el('rankTimer').hidden=true;el('rankShare').hidden=true;
 text('rankScore',`${data.score}/500`);
 if(data.status==='complete'){
   text('rankMode','RANKED COMPLETE');text('rankNumber','TODAY’S OFFICIAL SCORE');text('rankDescription',`You scored ${data.score} / 500. Your ranked result is locked in for today (UTC).`);
   el('rankFeedback').hidden=false;el('rankFeedback').textContent='🏆 Great run! Come back tomorrow for five new mysteries.';
   el('rankNext').hidden=true;el('rankShare').hidden=false;board();return;
 }
 text('rankNumber',`MYSTERY ${data.position} / 5`);text('rankMode','GLOBAL RANKED · 15s PER CLUE · ONE ATTEMPT DAILY');
 if(data.status==='reveal'){
   text('rankDescription',`Answer: ${data.answer}`);
   const p=data.last_result?.points||0;el('rankFeedback').hidden=false;el('rankFeedback').textContent=p?`🎯 Correct! +${p} points`:'💧 Out of clues. +0 points';
   el('rankNext').hidden=false;el('rankNext').textContent=data.position===5?'LOCK IN MY SCORE →':'NEXT MYSTERY →';
   return;
 }
 text('rankDescription',`CLUE ${data.clue_index} / 5 · WORTH ${scores[data.clue_index-1]} POINTS`);
 for(const [i,clue] of data.clues.entries()){const li=document.createElement('li');li.className='rank-clue';li.textContent=`${i+1}. ${clue}`;el('rankClues').append(li)}
 el('rankAnswerArea').hidden=false;el('rankTimer').hidden=false;
 el('rankGuessText').focus({preventScroll:true});
}
async function send(action,guess=null){if(busy||!client)return;setBusy(true);
 try{const d=await rpc('drip_ranked',{p_action:action,p_guess:guess});render(d);if(action==='guess'){el('rankGuessText').value=''}msg(d.status==='complete'?'Official score saved to the worldwide leaderboard.':'Your score and timing are checked by the server.');}
 catch(e){msg('Could not update game: '+e.message)}finally{setBusy(false)}}
async function connect(){if(!ready){msg('Offline preview. Add your Supabase URL and publishable key in config.js to activate ranked mode.');el('rankStart').disabled=true;el('rankRefresh').disabled=true;return}
 client=window.supabase.createClient(URL,KEY,{auth:{persistSession:true,autoRefreshToken:true}});
 try{let {data:{session}}=await client.auth.getSession();if(!session){const {data,error}=await client.auth.signInAnonymously();if(error)throw error;session=data.session;}
 if(!session)throw Error('Session not available');
 msg('Connected to Supabase. Pick a nickname and start your 15-second ranked challenge.');el('rankStart').disabled=false;el('rankRefresh').disabled=false;
 await board();
 }catch(e){msg('Online ranked mode unavailable: '+e.message+'. Practice still works. The beta owner may need to enable Anonymous Sign-Ins in Supabase.');el('rankStart').disabled=true;}
}
el('rankStart').addEventListener('click',async()=>{if(busy||!client)return;setBusy(true);try{
 const nick=el('rankNickname').value.trim();const country=el('rankCountry').value;
 await rpc('drip_profile',{p_nickname:nick,p_country:country});
 try{localStorage.setItem('dripRankNick',nick)}catch{}
 const d=await rpc('drip_ranked',{p_action:'start'});render(d);active=true;msg('Daily ranked competition is live. Good luck!');
 }catch(e){msg(e.message)}finally{setBusy(false)}});
el('rankGuess').addEventListener('click',()=>send('guess',el('rankGuessText').value));
el('rankGuessText').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();send('guess',el('rankGuessText').value)}});
el('rankSkip').addEventListener('click',()=>send('skip'));
el('rankNext').addEventListener('click',()=>send('next'));
el('rankRefresh').addEventListener('click',board);
el('rankShare').addEventListener('click',async()=>{const t=`DRIP! 🌍 Global Daily ${current?.day}\n${current?.score}/500\nTry to beat me! ${location.origin==='null'?'':location.origin}`;try{await navigator.clipboard.writeText(t);msg('Your score was copied!')}catch{msg('Clipboard access is unavailable here.')}});
clock=setInterval(()=>{if(current?.status!=='playing')return;const time=Math.max(0,(new Date(current.due_at).getTime()-Date.now())/1000);text('rankTimer',time.toFixed(1)+'s');if(time===0&&!busy)send('state');},150);
try{el('rankNickname').value=localStorage.getItem('dripRankNick')||''}catch{}
connect();
})();
