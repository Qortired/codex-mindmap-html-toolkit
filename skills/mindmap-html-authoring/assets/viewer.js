/* ============================
   Data and Constants
   ============================ */
const H_GAP  = 56;   // Horizontal gap between levels
const V_GAP  = 20;   // Vertical gap between sibling nodes
const DUR    = 220;  // Animation duration in ms
const COLORS = [
  '#e05c5c','#27ae60','#e67e22','#8e44ad',
  '#16a085','#2980b9','#c0392b','#f39c12','#1abc9c'
];

/* ============================
   State
   ============================ */
let collapsed = {};          // id -> bool
let nodeEls   = {};          // id -> div (persistent, updated incrementally)
let posData   = {};          // id -> {x,y,w,h}
let colorMap  = {};          // id -> color (grouped by first-level subtree)
let nodeById  = {};          // id -> tree node object (fast lookup)
let measuredH = {};          // id -> measured rendered height (persistent cache)
let edgeEls   = {};          // 'pid|cid' -> SVGPathElement (persistent edges)
let scale=1, tx=60, ty=80;
let dragging=false, midDrag=false, mx0=0, my0=0;

const wrap  = document.getElementById('wrap');
const stage = document.getElementById('stage');
const svgEl = document.getElementById('links');

/* ============================
   Helpers
   ============================ */
function esc(s){
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
function isCollapsed(id){ return !!collapsed[id]; }
function hasKids(n){ return n.c && n.c.length > 0; }
function visKids(n){ return isCollapsed(n.i) ? [] : (n.c||[]); }

/* Assign a color to each first-level subtree */
function assignColors(root){
  (root.c||[]).forEach((c,i)=>{
    const col = COLORS[i % COLORS.length];
    function paint(n){ colorMap[n.i]=col; (n.c||[]).forEach(paint); }
    paint(c);
  });
  colorMap[root.i] = '#2d6a9f';
}

/* ============================
   Layout (uses estimated node size)
   ============================ */
function subtreeH(n){
  const kids = visKids(n);
  if(!kids.length) return n.h;
  const sum = kids.reduce((s,c) => s + subtreeH(c) + V_GAP, -V_GAP);
  return Math.max(n.h, sum);
}

function layoutTree(n, x, cy){
  posData[n.i] = { x, y: cy - n.h/2, w: n.w, h: n.h };
  const kids = visKids(n);
  if(!kids.length) return;
  const total = kids.reduce((s,c) => s + subtreeH(c) + V_GAP, -V_GAP);
  let curY = cy - total/2;
  const cx2 = x + n.w + H_GAP;
  kids.forEach(c => {
    const ch = subtreeH(c);
    layoutTree(c, cx2, curY + ch/2);
    curY += ch + V_GAP;
  });
}

/* ============================
   Node element factory (create only)
   ============================ */
function createNodeEl(n, depth){
  const col = colorMap[n.i] || '#90cdf4';
  const pos = posData[n.i];
  const div = document.createElement('div');
  div.className = 'nd d' + Math.min(depth, 7);
  div.dataset.id = n.i;
  div.style.left  = pos.x + 'px';
  div.style.top   = pos.y + 'px';
  div.style.width = pos.w + 'px';
  if(depth > 0) div.style.setProperty('--bc', col);
  let inner = '';
  if(n.t) inner += '<div>' + esc(n.t) + '</div>';
    if(n.p!=null) inner += '<img src="'+IMG[n.p]+'" width="'+(n.pw||200)+'" height="'+(n.ph||100)+'" style="max-width:100%;height:auto" loading="lazy"/>';
  div.innerHTML = inner;
  if(hasKids(n)){
    const btn = document.createElement('div');
    btn.className = 'tog';
    btn.style.setProperty('--bc', col);
    btn.textContent = isCollapsed(n.i) ? '+' : '−';
    btn.onclick = e => { e.stopPropagation(); toggle(n.i); };
    div.appendChild(btn);
    div.style.cursor = 'pointer';
    div.onclick = () => toggle(n.i);
  }
  if(n.lnk){
    const lbtn=document.createElement('div');
    lbtn.className='lnk-btn';
    lbtn.textContent='↗ Jump to linked node';
    lbtn.onclick=function(e){e.stopPropagation();jumpToNode(n.lnk);};
    div.appendChild(lbtn);
  }
  return div;
}

/* ============================
   Incremental SVG edge updates
   ============================ */
function updateEdges(){
  const active = new Set();
  function walk(n){
    const pp = posData[n.i]; if(!pp) return;
    visKids(n).forEach(c => {
      const cp = posData[c.i]; if(!cp) return;
      const key = n.i+'|'+c.i;
      active.add(key);
      const x1=pp.x+pp.w, y1=pp.y+pp.h/2;
      const x2=cp.x,       y2=cp.y+cp.h/2;
      const mx=(x1+x2)/2;
      const d='M'+x1+','+y1+' C'+mx+','+y1+' '+mx+','+y2+' '+x2+','+y2;
      if(edgeEls[key]){
        edgeEls[key].setAttribute('d', d);
      } else {
        const col=colorMap[c.i]||'#4a9edd';
        const sw=Math.max(1.5,3-(c._depth*0.4));
        const path=document.createElementNS('http://www.w3.org/2000/svg','path');
        path.setAttribute('d',d); path.setAttribute('stroke',col);
        path.setAttribute('stroke-width',sw); path.setAttribute('fill','none');
        path.setAttribute('opacity','.6');
        svgEl.appendChild(path);
        edgeEls[key]=path;
      }
      walk(c);
    });
  }
  walk(RAW_TREE);
  Object.keys(edgeEls).forEach(key=>{
    if(!active.has(key)){ svgEl.removeChild(edgeEls[key]); delete edgeEls[key]; }
  });
}
function getDepth(n){ return n._depth || 0; }

/* ============================
   Rebuild (incremental DOM + persistent cache + animation)
   ============================ */
function rebuild(animate){
  // Restore measured heights from the persistent cache
  Object.keys(measuredH).forEach(id=>{ if(nodeById[id]) nodeById[id].h=measuredH[id]; });

  // Compute the new visible set
  const newVisible = new Set();
  (function collect(n){ newVisible.add(n.i); visKids(n).forEach(collect); })(RAW_TREE);

  // Classify nodes: leaving vs entering
  const removingIds = Object.keys(nodeEls).filter(id=>!newVisible.has(id));
  const addingIds   = [...newVisible].filter(id=>!nodeEls[id]);

  // Snapshot previous positions for animation
  const oldSnap = {};
  if(animate){
    Object.keys(nodeEls).forEach(id=>{
      oldSnap[id]={ el:nodeEls[id], x:parseFloat(nodeEls[id].style.left), y:parseFloat(nodeEls[id].style.top) };
    });
  }

  // Remove exiting nodes from nodeEls (keep DOM briefly when animating)
  removingIds.forEach(id=>{
    if(!animate) stage.removeChild(nodeEls[id]);
    delete nodeEls[id];
  });

  // Pass 1: layout using cached heights for known nodes and estimated heights for new nodes
  posData = {};
  layoutTree(RAW_TREE, 0, subtreeH(RAW_TREE)/2);

  // Create new nodes and append them to the stage
  addingIds.forEach(id=>{
    const n=nodeById[id]; if(!n) return;
    const el=createNodeEl(n,n._depth);
    stage.appendChild(el);
    nodeEls[id]=el;
  });

  // Measure only the new nodes and save the results in the persistent cache
  if(addingIds.length>0){
    void stage.offsetHeight;
    addingIds.forEach(id=>{
      const el=nodeEls[id];
      if(el){ const h=el.offsetHeight; measuredH[id]=h; nodeById[id].h=h; }
    });
    // Pass 2: relayout with measured heights
    posData={};
    layoutTree(RAW_TREE, 0, subtreeH(RAW_TREE)/2);
  }

  // Update coordinates for all visible nodes without rebuilding the DOM
  newVisible.forEach(id=>{
    const el=nodeEls[id], pos=posData[id];
    if(el&&pos){ el.style.left=pos.x+'px'; el.style.top=pos.y+'px'; }
  });

  // Sync the collapse button labels
  newVisible.forEach(id=>{
    if(!hasKids(nodeById[id])) return;
    const btn=nodeEls[id]?.querySelector('.tog');
    if(btn) btn.textContent=isCollapsed(id)?'+':'−';
  });

  // Incrementally update SVG edges
  updateEdges();

  // SVG dimensions
  let mnX=Infinity,mnY=Infinity,mxX=-Infinity,mxY=-Infinity;
  Object.values(posData).forEach(p=>{
    mnX=Math.min(mnX,p.x); mnY=Math.min(mnY,p.y);
    mxX=Math.max(mxX,p.x+p.w); mxY=Math.max(mxY,p.y+(p.h||0));
  });
  const totalW=mxX-mnX+120, totalH=mxY-mnY+120;
  svgEl.style.width=totalW+'px'; svgEl.style.height=totalH+'px';
  svgEl.setAttribute('viewBox','0 0 '+totalW+' '+totalH);
  svgEl.setAttribute('width',totalW); svgEl.setAttribute('height',totalH);

  if(!animate) return;

  // Animation
  const exitSnaps = removingIds.map(id=>oldSnap[id]).filter(Boolean);
  const enterEls  = addingIds.map(id=>nodeEls[id]).filter(Boolean);
  const flipItems = [...newVisible]
    .filter(id=>oldSnap[id]&&posData[id])
    .map(id=>({el:nodeEls[id], dx:oldSnap[id].x-posData[id].x, dy:oldSnap[id].y-posData[id].y}))
    .filter(({dx,dy})=>Math.abs(dx)>0.5||Math.abs(dy)>0.5);

  exitSnaps.forEach(({el,x,y})=>{
    el.style.transition='none'; el.style.opacity='1'; el.style.transform='scale(1)';
    el.style.left=x+'px'; el.style.top=y+'px';
    stage.insertBefore(el,stage.firstChild);
  });
  enterEls.forEach(el=>{
    el.style.transition='none'; el.style.opacity='0'; el.style.transform='scale(0.85)';
  });
  flipItems.forEach(({el,dx,dy})=>{
    el.style.transition='none'; el.style.transform=`translate(${dx}px,${dy}px)`;
  });

  void stage.offsetHeight;

  const T=`opacity ${DUR}ms ease,transform ${DUR}ms ease`;
  exitSnaps.forEach(({el})=>{
    el.style.transition=T; el.style.opacity='0'; el.style.transform='scale(0.85)';
    setTimeout(()=>{ if(el.parentNode) el.parentNode.removeChild(el); }, DUR+30);
  });
  enterEls.forEach(el=>{
    el.style.transition=T; el.style.opacity='1'; el.style.transform='scale(1)';
    setTimeout(()=>{ el.style.transition=''; el.style.transform=''; }, DUR+30);
  });
  flipItems.forEach(({el})=>{
    el.style.transition=`transform ${DUR}ms ease`;
    el.style.transform='translate(0,0)';
    setTimeout(()=>{ el.style.transition=''; el.style.transform=''; }, DUR+30);
  });
}
/* ============================
   Internal link navigation
   ============================ */
function jumpToNode(id){
  const target=nodeById[id];
  if(!target){ alert('Target node not found'); return; }
  // Expand all ancestors of the target node
  let cur=target._parent;
  while(cur){ collapsed[cur.i]=false; cur=cur._parent; }
  rebuild(true);
  // Pan to center the target
  const p=posData[id];
  if(p){ tx=wrap.clientWidth/2-(p.x+p.w/2)*scale; ty=wrap.clientHeight/2-(p.y+p.h/2)*scale; applyT(); }
  // Flash highlight
  const el=nodeEls[id];
  if(el){
    el.classList.remove('flash');
    void el.offsetWidth;
    el.classList.add('flash');
    setTimeout(()=>el.classList.remove('flash'),950);
  }
}

/* ============================
   Expand and collapse
   ============================ */
function toggle(id){
  collapsed[id] = !collapsed[id];
  rebuild(true);
}
function expandAll(){
  Object.keys(collapsed).forEach(k=>{ collapsed[k]=false; });
  rebuild(true);
}
function collapseLevel(lv){
  function rec(n,d){ if(d>=lv&&hasKids(n)) collapsed[n.i]=true; (n.c||[]).forEach(c=>rec(c,d+1)); }
  rec(RAW_TREE,0);
  rebuild(true);
}

/* ============================
   Pan and zoom
   ============================ */

function applyT(){
  stage.style.transform = 'translate('+tx+'px,'+ty+'px) scale('+scale+')';
  document.getElementById('zoom-info').textContent = Math.round(scale*100)+'%';
}
wrap.addEventListener('mousedown',e=>{
  if(e.button===1){
    e.preventDefault();
    dragging=true; midDrag=true; mx0=e.clientX-tx; my0=e.clientY-ty; wrap.classList.add('drag');
    return;
  }
  if(e.button!==0) return;
  // Drag only when the background is clicked
  const t = e.target;
  if(t===wrap||t===stage||t===svgEl||t.tagName==='path'||t.tagName==='svg'){
    dragging=true; mx0=e.clientX-tx; my0=e.clientY-ty; wrap.classList.add('drag');
  }
});
window.addEventListener('mousemove',e=>{
  if(!dragging) return; tx=e.clientX-mx0; ty=e.clientY-my0; applyT();
});
window.addEventListener('mouseup',()=>{ dragging=false; midDrag=false; wrap.classList.remove('drag'); });
wrap.addEventListener('wheel',e=>{
  e.preventDefault();
  if(midDrag) return;
  const r=wrap.getBoundingClientRect();
  const px=e.clientX-r.left, py=e.clientY-r.top;
  const d=e.deltaY>0?0.88:1.12;
  const ns=Math.max(0.05, scale*d); // Allow deep zoom, minimum 5%
  tx=px-(px-tx)*(ns/scale); ty=py-(py-ty)*(ns/scale); scale=ns; applyT();
},{passive:false});

/* Touch */
let td0=0,ttx,tty,tsx,tsy;
wrap.addEventListener('touchstart',e=>{
  if(e.touches.length===1){
    const touch=e.touches[0];
    wasTap=true;
    ttx=tx;tty=ty;tsx=touch.clientX;tsy=touch.clientY;
  }
  else if(e.touches.length===2){
    td0=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);
    wasTap=false;
  }
},{passive:false});
wrap.addEventListener('touchmove',e=>{
  e.preventDefault();
  if(e.touches.length===1){wasTap=false;tx=ttx+(e.touches[0].clientX-tsx);ty=tty+(e.touches[0].clientY-tsy);applyT();}
  else if(e.touches.length===2){
    const cx=(e.touches[0].clientX+e.touches[1].clientX)/2;
    const cy=(e.touches[0].clientY+e.touches[1].clientY)/2;
    const r=wrap.getBoundingClientRect();
    const px=cx-r.left, py=cy-r.top;
    const d=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);
    if(td0>0){
      const ns=Math.max(0.05, scale*d/td0);
      tx=px-(px-tx)*(ns/scale);
      ty=py-(py-ty)*(ns/scale);
      scale=ns;
      applyT();
    }
    td0=d;
  }
},{passive:false});

/* ============================
   Fit view
   ============================ */
function goHome(){
  fitView();
}

function fitView(){
  let mnX=1e9,mnY=1e9,mxX=-1e9,mxY=-1e9;
  Object.values(posData).forEach(p=>{
    mnX=Math.min(mnX,p.x); mnY=Math.min(mnY,p.y);
    mxX=Math.max(mxX,p.x+p.w); mxY=Math.max(mxY,p.y+p.h);
  });
  if(mnX===1e9) return;
  const vw=wrap.clientWidth-80, vh=wrap.clientHeight-60;
  scale = Math.max(0.05, Math.min(vw/(mxX-mnX), vh/(mxY-mnY))); // Allow deep zoom, minimum 5%
  tx = 40 - mnX*scale;
  ty = 30 - mnY*scale + (vh-(mxY-mnY)*scale)/2;
  applyT();
}

/* ============================
   Search and sidebar
   ============================ */
function buildPath(n){
  const parts=[];
  let cur=n._parent;
  while(cur&&cur._parent){ parts.unshift(esc(cur.t||'…')); cur=cur._parent; }
  return parts.join(' › ');
}

function navToNode(id){
  document.querySelectorAll('.sb-item').forEach(el=>el.classList.remove('active'));
  const item=document.querySelector('.sb-item[data-id="'+id+'"]');
  if(item){ item.classList.add('active'); item.scrollIntoView({block:'nearest',behavior:'smooth'}); }
  document.querySelectorAll('.hit,.hit1').forEach(el=>el.classList.remove('hit','hit1'));
  const el=nodeEls[id]; if(el) el.classList.add('hit1');
  const p=posData[id];
  if(p){ tx=wrap.clientWidth/2-(p.x+p.w/2)*scale; ty=wrap.clientHeight/2-(p.y+p.h/2)*scale; applyT(); }
}

function closeSidebar(){
  document.getElementById('sidebar').classList.remove('open');
  document.querySelectorAll('.hit,.hit1').forEach(el=>el.classList.remove('hit','hit1'));
  document.getElementById('search').value='';
  document.getElementById('s-info').textContent='';
  document.getElementById('sb-list').innerHTML='';
}

function doSearch(q){
  document.querySelectorAll('.hit,.hit1').forEach(el=>el.classList.remove('hit','hit1'));
  document.getElementById('s-info').textContent='';
  const sb=document.getElementById('sidebar');
  const sbList=document.getElementById('sb-list');
  const sbCount=document.getElementById('sb-count');
  if(!q.trim()){ sb.classList.remove('open'); sbList.innerHTML=''; return; }
  const lo=q.toLowerCase();
  const hits=[];
  function walk(n){ if((n.t||'').toLowerCase().includes(lo)) hits.push(n); (n.c||[]).forEach(walk); }
  walk(RAW_TREE);
  document.getElementById('s-info').textContent = hits.length ? hits.length+' matches' : 'No results';
  if(!hits.length){
    sbCount.textContent='No results';
    sbList.innerHTML='<div style="padding:18px 14px;color:rgba(255,255,255,.28);font-size:.8rem;text-align:center">No matching nodes found</div>';
    sb.classList.add('open'); return;
  }
  hits.forEach(n=>{ let cur=n; while(cur){ collapsed[cur.i]=false; cur=cur._parent; } });
  rebuild();
  hits.forEach((n,i)=>{ const el=nodeEls[n.i]; if(el) el.classList.add(i===0?'hit1':'hit'); });
  const p=posData[hits[0].i];
  if(p){ tx=wrap.clientWidth/2-(p.x+p.w/2)*scale; ty=wrap.clientHeight/2-(p.y+p.h/2)*scale; applyT(); }
  sbCount.textContent=hits.length+' results';
  const reQ=new RegExp('('+q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+')','gi');
  sbList.innerHTML=hits.map((n,i)=>{
    const titleEsc=esc(n.t||'');
    const titleHl=titleEsc.replace(reQ,'<mark>$1</mark>');
    const path=buildPath(n);
    const id=n.i.replace(/\\/g,'\\\\').replace(/'/g,"\\'");
    return '<div class="sb-item'+(i===0?' active':'')+'" data-id="'+n.i+'" onclick="navToNode(\''+id+'\')">'
      +'<div class="sb-item-title">'+titleHl+'</div>'
      +(path?'<div class="sb-item-path">'+path+'</div>':'')
      +'</div>';
  }).join('');
  sb.classList.add('open');
}

/* ============================
   Parent pointers and initialization
   ============================ */
function linkParents(n, parent, depth){
  n._parent = parent;
  n._depth  = depth || 0;
  nodeById[n.i] = n;
  (n.c||[]).forEach(c => linkParents(c, n, (depth||0)+1));
}
linkParents(RAW_TREE, null, 0);
assignColors(RAW_TREE);
// Collapse to level 2 by default
(function colL2(n,d){ if(d>=2&&hasKids(n)) collapsed[n.i]=true; (n.c||[]).forEach(c=>colL2(c,d+1)); })(RAW_TREE,0);
rebuild();
setTimeout(fitView, 80);

/* Mobile floating zoom buttons */
function zoomBy(factor){
  const wrap=document.getElementById('wrap');
  const r=wrap.getBoundingClientRect();
  const px=r.width/2, py=r.height/2;
  const ns=Math.max(0.05, scale*factor);
  tx=px-(px-tx)*(ns/scale);
  ty=py-(py-ty)*(ns/scale);
  scale=ns;
  applyT();
}
/* Double-click zoom toggle (desktop + mobile) */
let lastTap=0,lastTapX=0,lastTapY=0,wasTap=true;
document.getElementById('wrap').addEventListener('dblclick',function(e){
  e.preventDefault();
  const r=this.getBoundingClientRect();
  const px=e.clientX-r.left, py=e.clientY-r.top;
  const factor=scale>1.5?Math.min(1/scale,0.5):2;
  const ns=Math.max(0.05, scale*factor);
  tx=px-(px-tx)*(ns/scale);
  ty=py-(py-ty)*(ns/scale);
  scale=ns;
  applyT();
});
/* Mobile double-tap detection (only for clean taps with no remaining touches) */
document.getElementById('wrap').addEventListener('touchend',function(e){
  // When switching from two fingers back to one, reset the drag anchor to avoid jumps
  if(e.touches.length===1){
    const touch=e.touches[0];
    ttx=tx;tty=ty;tsx=touch.clientX;tsy=touch.clientY;
    return;
  }
  if(e.touches.length!==0)return; // Still touching the screen, do not trigger
  const now=Date.now(),touch=e.changedTouches[0];
  if(wasTap&&now-lastTap<320&&Math.abs(touch.clientX-lastTapX)<30&&Math.abs(touch.clientY-lastTapY)<30){
    e.preventDefault();
    const r=this.getBoundingClientRect();
    const px=touch.clientX-r.left, py=touch.clientY-r.top;
    const factor=scale>1.5?Math.min(1/scale,0.5):2;
    const ns=Math.max(0.05, scale*factor);
    tx=px-(px-tx)*(ns/scale);
    ty=py-(py-ty)*(ns/scale);
    scale=ns;
    applyT();
    lastTap=0;
    return;
  }
  lastTap=now;lastTapX=touch.clientX;lastTapY=touch.clientY;
});
