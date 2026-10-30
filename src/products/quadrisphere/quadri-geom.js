
// ---------------------------------------------------------
// quadri-geom.js — Quadrisphère : géométrie (octaèdre, 4 pieds, 4 arches),
// débit avec connecteur et sans connecteur (moulinet type GoodKarma).
// Cas de contrôle : 5 m, 3V, arche 1,60 m, k 1,5 → 25 nœuds, 56 barres,
// 7 types avec connecteur (1529…2516 mm c/c), 14 sans connecteur.
// ---------------------------------------------------------
(function (global) {
'use strict';

const add=(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]], sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],
 mul=(a,s)=>[a[0]*s,a[1]*s,a[2]*s], dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],
 cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],
 len=a=>Math.hypot(a[0],a[1],a[2]), nrm=a=>mul(a,1/len(a));

function computeDome(p){
  // p: {side (m), nu, archRatio (h/side), k, lintel, b (mm, width in tangent plane), hub (mm)}
  const R=p.side/Math.SQRT2, nu=p.nu;
  const A=[[1,0,0],[0,1,0],[-1,0,0],[0,-1,0]], T=[0,0,1];
  const keyMap=new Map(), pts=[], faces=[];
  const addPt=q=>{const u=nrm(q);const k=u.map(x=>x.toFixed(6)).join(',');
    if(!keyMap.has(k)){keyMap.set(k,pts.length);pts.push(u)}return keyMap.get(k)};
  for(let f=0;f<4;f++){const P=A[f],Q=A[(f+1)%4],g={};
    for(let i=0;i<=nu;i++)for(let j=0;j<=nu-i;j++){const l=nu-i-j;
      g[i+','+j]=addPt(mul(add(add(mul(P,l),mul(Q,i)),mul(T,j)),1/nu))}
    for(let i=0;i<nu;i++)for(let j=0;j<nu-i;j++){
      faces.push([g[i+','+j],g[(i+1)+','+j],g[i+','+(j+1)]]);
      if(i+j<nu-1)faces.push([g[(i+1)+','+j],g[(i+1)+','+(j+1)],g[i+','+(j+1)]])}}
  const S=pts.map(u=>mul(u,R));
  const gfun=q=>{const th=Math.atan2(q[1],q[0]);const v=Math.abs(Math.sin(2*th));return v<1e-6?0:Math.sqrt(v)};
  const eq=S.map((q,i)=>Math.abs(q[2])<1e-9?i:-1).filter(i=>i>=0);
  const gs=eq.map(i=>gfun(S[i])).filter(x=>x>1e-4);const gmax=gs.length?Math.min(...gs):0;
  const hArch=p.archRatio*p.side, Alift=gmax>0?hArch/gmax:0;
  const V=S.map(q=>[q[0],q[1],q[2]+Alift*gfun(q)*Math.pow(Math.max(0,1-q[2]/R),p.k)]);
  const isSupport=S.map(q=>Math.abs(q[2])<1e-9&&gfun(q)<1e-9);
  const isEq=S.map(q=>Math.abs(q[2])<1e-9);
  // edges
  const eset=new Map();
  faces.forEach(f=>{for(let t=0;t<3;t++){const a=f[t],b=f[(t+1)%3],k=Math.min(a,b)+'-'+Math.max(a,b);
    if(!eset.has(k))eset.set(k,[Math.min(a,b),Math.max(a,b)])}});
  let edges=[...eset.values()];
  if(!p.lintel) edges=edges.filter(([a,b])=>!(isEq[a]&&isEq[b]&&!isSupport[a]&&!isSupport[b]));
  // vertex normals from incident faces (area weighted), outward
  const N=V.map(()=>[0,0,0]);
  faces.forEach(([a,b,c])=>{let n=cross(sub(V[b],V[a]),sub(V[c],V[a]));
    if(dot(n,add(add(S[a],S[b]),S[c]))<0)n=mul(n,-1);[a,b,c].forEach(i=>N[i]=add(N[i],n))});
  const Nn=N.map(nrm);
  // adjacency
  const adj=V.map(()=>[]);
  edges.forEach(([a,b],ei)=>{adj[a].push({o:b,ei});adj[b].push({o:a,ei})});
  // per vertex: tangent basis, sorted neighbours
  const w=p.b/2000, e=w; // m
  const endInfo={}; // key ei+':'+v -> {delta (m, + = beyond vertex), offset vector, cutAngle}
  V.forEach((v,vi)=>{
    const n=Nn[vi];let t1=Math.abs(n[2])<0.9?nrm(cross([0,0,1],n)):nrm(cross([1,0,0],n));const t2=cross(n,t1);
    const list=adj[vi].map(a=>{const u=nrm(sub(V[a.o],v));const d3=sub(u,mul(n,dot(u,n)));
      const d=[dot(d3,t1),dot(d3,t2)];const dl=Math.hypot(d[0],d[1]);
      return {...a,u,d:[d[0]/dl,d[1]/dl],ang:Math.atan2(d[1],d[0])}}).sort((x,y)=>x.ang-y.ang);
    const m=list.length;
    list.forEach((s,i)=>{
      const r=[-s.d[1],s.d[0]]; const o2=[-e*r[0],-e*r[1]];
      const off3=add(mul(t1,o2[0]),mul(t2,o2[1]));
      const cw=list[(i-1+m)%m];
      let gap=s.ang-cw.ang; if(gap<=0)gap+=2*Math.PI;
      let delta=0,cut=90,free=true;
      if(m>1&&gap<150*Math.PI/180){
        const rj=[-cw.d[1],cw.d[0]], oj=[-e*rj[0],-e*rj[1]];
        // solve o2 + s d_i = oj + s' d_j
        const det=s.d[0]*(-cw.d[1])-s.d[1]*(-cw.d[0]);
        const bx=oj[0]-o2[0], by=oj[1]-o2[1];
        const sI=(bx*(-cw.d[1])-by*(-cw.d[0]))/det;
        const sinA=Math.sin(gap);
        delta=-(sI+w/sinA); cut=gap*180/Math.PI; free=false;
      }
      endInfo[s.ei+':'+vi]={delta,off3,cut,free};
    });
  });
  const hub=p.hub/1000;
  const struts=edges.map(([a,b],ei)=>{
    const chord=len(sub(V[a],V[b])), u=nrm(sub(V[b],V[a]));
    const ax=Math.asin(Math.abs(dot(u,Nn[a])))*180/Math.PI, bx=Math.asin(Math.abs(dot(u,Nn[b])))*180/Math.PI;
    const hubLen=chord-2*hub;
    const ea=endInfo[ei+':'+a], eb=endInfo[ei+':'+b];
    const Pa=sub(add(V[a],ea.off3),mul(u,ea.delta)), Pb=add(add(V[b],eb.off3),mul(u,eb.delta));
    const gkLen=len(sub(Pb,Pa));
    const nm=nrm(add(Nn[a],Nn[b]));
    return {a,b,chord,hubLen,gkLen,axA:ax,axB:bx,Pa,Pb,ea,eb,nm,
      Ha:add(V[a],mul(u,hub)),Hb:sub(V[b],mul(u,hub))};
  });
  // types
  const groupBy=(keyf)=>{const m=new Map();struts.forEach((s,i)=>{const k=keyf(s);if(!m.has(k))m.set(k,[]);m.get(k).push(i)});
    return [...m.entries()].sort((x,y)=>struts[x[1][0]].chord-struts[y[1][0]].chord)};
  const hubTypes=groupBy(s=>Math.round(s.chord*1000)+'');
  const gkTypes=groupBy(s=>{const c=[[s.ea.cut,s.ea.free],[s.eb.cut,s.eb.free]].map(x=>x[1]?'F':Math.round(x[0])).sort().join('/');
    return Math.round(s.gkLen*1000)+'|'+c});
  // node types (hub mode): signature of incident chord lengths sorted + role
  const nodeSig=V.map((v,i)=>{const L=adj[i].map(a=>Math.round(struts[a.ei].chord*1000)).sort((x,y)=>x-y);
    const role=isSupport[i]?'pied':(i===V.reduce((bi,q,j)=>q[2]>V[bi][2]?j:bi,0)?'sommet':(isEq[i]?'rive':'courant'));
    return role+'|'+adj[i].length+'|'+L.join(',')});
  const nodeTypes=new Map();nodeSig.forEach((s,i)=>{if(!nodeTypes.has(s))nodeTypes.set(s,[]);nodeTypes.get(s).push(i)});
  const H=Math.max(...V.map(q=>q[2]));
  // arch clearance = highest point of the arch outline above the opening (min z of the opening polygon top)
  const archNodes=V.map((q,i)=>isEq[i]&&!isSupport[i]?q[2]:null).filter(x=>x!==null);
  return {R,V,S,Nn,faces,edges,struts,hubTypes,gkTypes,nodeTypes,isSupport,isEq,H,Alift,hArch,
    archMin:archNodes.length?Math.min(...archNodes):0, adj};
}
global.QuadriGeom = { computeDome };
})(typeof window !== 'undefined' ? window : globalThis);
