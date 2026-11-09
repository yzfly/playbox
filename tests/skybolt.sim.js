const fs=require('fs'),vm=require('vm');
const html=fs.readFileSync(process.argv[2],'utf8');
const src=html.match(/<script>([\s\S]*)<\/script>/)[1];
const stub=new Proxy(function(){},{get:(t,k)=>k==='addColorStop'?()=>{}:(k in t?t[k]:stub),apply:()=>stub,set:()=>true});
const ctx2d=new Proxy({},{get:(t,k)=>k in t?t[k]:(()=>stub),set:(t,k,v)=>(t[k]=v,true)});
let now=0,raf=null;const store={};
const g={console,Math,JSON,Object,Array,Number,String,
 performance:{now:()=>now},requestAnimationFrame:f=>{raf=f},
 location:{search:''},innerWidth:1080,innerHeight:2400,devicePixelRatio:3,
 addEventListener:()=>{},localStorage:{getItem:k=>store[k]??null,setItem:(k,v)=>store[k]=String(v)},
 document:{createElement:()=>({width:0,height:0,getContext:()=>ctx2d}),getElementById:()=>({getContext:()=>ctx2d,style:{},getBoundingClientRect:()=>({left:0,top:0,width:360,height:640})}),addEventListener:()=>{},hidden:false}};
g.window=g;vm.createContext(g);
vm.runInContext(src+';globalThis.__g={get state(){return state},set state(v){state=v},reset,player,get stage(){return stage},get score(){return score},get enemies(){return enemies},get boss(){return boss},useBomb};',g);
const G=g.__g;G.reset();G.state='play';
let bosses=0,sawBoss=false,deaths=0,maxStage=1;
for(let i=0;i<60*600;i++){ // 600 秒游戏时间
  now+=16.7;
  // 无敌模式测试关卡推进：保持无敌，自动追踪敌人 x
  if(process.argv[3]==='god'){G.player.inv=1;const e=G.enemies[0];if(e)G.player.x+=Math.sign(e.x-G.player.x)*3;}
  if(i%600===0)G.useBomb();
  raf(now);
  if(G.boss&&!sawBoss){sawBoss=true;}
  if(!G.boss&&sawBoss){bosses++;sawBoss=false;}
  maxStage=Math.max(maxStage,G.stage);
  if(G.state==='over'){deaths++;G.reset();G.state='play';}
}
console.log({mode:process.argv[3]||'normal',bosses,maxStage,deaths,score:G.score});
