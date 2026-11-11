const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../music.js'),'utf8');
const ctx={window:{},URL};vm.createContext(ctx);vm.runInContext(source,ctx);
const parse=ctx.window.MusicPlayer.youtubeId;

test('YouTube watch, share, shorts, live and embed URLs resolve to the video ID',()=>{
  for(const url of ['https://www.youtube.com/watch?v=M7lc1UVf-VE&list=abc','https://youtu.be/M7lc1UVf-VE?si=123','https://youtube.com/shorts/M7lc1UVf-VE','https://youtube.com/live/M7lc1UVf-VE','https://www.youtube-nocookie.com/embed/M7lc1UVf-VE','https://music.youtube.com/watch?v=M7lc1UVf-VE'])assert.equal(parse(url),'M7lc1UVf-VE');
});
test('Untrusted hosts and invalid/playlist-only links are rejected',()=>{
  for(const url of ['https://youtube.com.evil.test/watch?v=M7lc1UVf-VE','javascript:alert(1)','https://example.com/M7lc1UVf-VE','https://youtube.com/watch?v=short','https://youtube.com/playlist?list=abc','not a URL'])assert.equal(parse(url),null);
});
function mountTest(tracks) {
  const nodes={};
  class Element {
    constructor(){this.children=[];this.events={};this.attributes={};this.hidden=false;}
    querySelector(s){return nodes[s]||(nodes[s]=new Element());}appendChild(e){this.children.push(e)}append(...e){this.children.push(...e)}replaceChildren(...e){this.children=e}setAttribute(k,v){this.attributes[k]=v}addEventListener(k,f){this.events[k]=f}
  }
  const instances=[];
  const mockYT={Player: function(frame,options){
    this.events=options.events;this.played=0;this.paused=0;this.destroyed=false;
    this.playVideo=()=>this.played++;this.pauseVideo=()=>this.paused++;
    this.seekTo=n=>this.seek=n;this.destroy=()=>this.destroyed=true;instances.push(this);
  }};
  const sandbox={window:{YT:mockYT,SITE:{music:{tracks}}},URL,document:{createElement:()=>new Element()}};
  vm.createContext(sandbox);vm.runInContext(source,sandbox);
  const cleanup=sandbox.window.MusicPlayer.mount(new Element());
  return {nodes,instances,cleanup};
}
const example={title:'Example',artist:'Artist',url:'https://youtu.be/M7lc1UVf-VE'};
const second={title:'Second',artist:'Artist',url:'https://youtu.be/hGqYdubpcCM'};

test('First track is selected on entry without autoplay, play/pause toggle, errors and cleanup work',async ()=>{
  const {nodes,instances,cleanup}=mountTest([example]);
  assert.equal(nodes['.music-now'].textContent,'Example — Artist');
  assert.equal(nodes['.music-play'].disabled,true);
  const iframe=nodes['.music-player'].children[0];
  assert.equal(iframe.src,'https://www.youtube.com/embed/M7lc1UVf-VE?playsinline=1&enablejsapi=1');
  assert.equal(iframe.referrerPolicy,'strict-origin-when-cross-origin');
  await Promise.resolve();
  const p=instances[0];p.events.onReady({target:p});
  assert.equal(p.played,0);
  nodes['.music-play'].onclick();assert.equal(p.played,1);
  p.events.onStateChange({data:1});
  assert.equal(nodes['.music-play'].textContent,'Ⅱ 일시정지');
  nodes['.music-play'].onclick();assert.equal(p.paused,1);
  p.events.onStateChange({data:2});
  assert.equal(nodes['.music-play'].textContent,'▶ 재생');
  nodes['.music-play'].onclick();assert.equal(p.played,2);
  p.events.onError({data:153});assert.equal(nodes['.music-footnote'].textContent,'재생되지 않는 영상은 ‘YouTube에서 보기’로 열어 주세요.');
  assert.equal(nodes['.music-play'].disabled,true);
  cleanup();assert.equal(nodes['.music-player'].children.length,0);assert.equal(p.destroyed,true);
});

test('Ended track advances automatically; final track stops unless repeat-all is enabled',async ()=>{
  const {nodes,instances,cleanup}=mountTest([example,second]);
  await Promise.resolve();
  instances[0].events.onStateChange({data:0});
  assert.equal(nodes['.music-now'].textContent,'Second — Artist');
  await Promise.resolve();
  const last=instances[1];last.events.onReady({target:last});assert.equal(last.played,1);
  last.events.onStateChange({data:0});assert.equal(instances.length,2);
  assert.equal(nodes['.music-footnote'].textContent,'재생되지 않는 영상은 ‘YouTube에서 보기’로 열어 주세요.');
  nodes['.music-repeat'].onclick();
  assert.equal(nodes['.music-repeat'].attributes['aria-pressed'],'true');
  last.events.onStateChange({data:0});
  assert.equal(nodes['.music-now'].textContent,'Example — Artist');
  await Promise.resolve();
  const first=instances[2];first.events.onReady({target:first});assert.equal(first.played,1);
  cleanup();
});

test('Empty playlist leaves playback controls disabled',()=>{
  const {nodes,instances,cleanup}=mountTest([]);
  assert.equal(nodes['.music-play'].disabled,true);
  assert.equal(nodes['.music-empty'].hidden,false);
  assert.equal(instances.length,0);cleanup();
});
