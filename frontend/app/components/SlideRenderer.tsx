'use client';
import React, { forwardRef } from 'react';
import { CarouselSlide, CodeBlockVisual, StatsGridVisual, DiagramVisual, StepsListVisual } from '../types';

interface Props { slide: CarouselSlide; slideNumber: number; totalSlides: number; forExport?: boolean; }

function highlightCode(code: string): React.ReactNode[] {
  return code.split('\n').map((line, li) => {
    const tokens: React.ReactNode[] = [];
    let rem = line, ti = 0;
    while (rem.length > 0) {
      const comment = rem.match(/^(\/\/.*|#.*)/);
      if (comment) { tokens.push(<span key={ti++} style={{color:'#6B7280'}}>{comment[0]}</span>); rem = rem.slice(comment[0].length); continue; }
      const str = rem.match(/^("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)/);
      if (str) { tokens.push(<span key={ti++} style={{color:'#A8FF78'}}>{str[0]}</span>); rem = rem.slice(str[0].length); continue; }
      const kws = ['const','let','var','function','async','await','return','import','from','export','default','if','else','for','while','class','new','def','with','as','in','True','False','None','print','pass','raise'];
      const kw = rem.match(new RegExp(`^(${kws.join('|')})(?=\\s|\\(|:|$|,|\\))`));
      if (kw) { tokens.push(<span key={ti++} style={{color:'#FF6B35'}}>{kw[0]}</span>); rem = rem.slice(kw[0].length); continue; }
      const type = rem.match(/^([A-Z][a-zA-Z0-9_]*)/);
      if (type) { tokens.push(<span key={ti++} style={{color:'#79B8FF'}}>{type[0]}</span>); rem = rem.slice(type[0].length); continue; }
      const num = rem.match(/^(\d+\.?\d*)/);
      if (num) { tokens.push(<span key={ti++} style={{color:'#B8FF79'}}>{num[0]}</span>); rem = rem.slice(num[0].length); continue; }
      tokens.push(<span key={ti++} style={{color:'#E6EDF3'}}>{rem[0]}</span>); rem = rem.slice(1);
    }
    return <div key={li} style={{display:'flex',minHeight:'1.5em'}}><span style={{color:'#4B5563',userSelect:'none',marginRight:'16px',minWidth:'24px',textAlign:'right',flexShrink:0}}>{li+1}</span><span style={{flex:1}}>{tokens.length>0?tokens:<span>&nbsp;</span>}</span></div>;
  });
}

const SlideRenderer = forwardRef<HTMLDivElement, Props>(({ slide, slideNumber, totalSlides, forExport=false }, ref) => {
  const W = forExport ? 1080 : 540, H = forExport ? 1350 : 675, sc = W/1080;
  const PH = 48*sc, PV = 36*sc, AV = 56*sc;
  const hasVis = slide.visual?.type !== 'none' && !!slide.visual?.type;
  const paras = (slide.text||'').split('\n\n').filter(Boolean);
  const chars = (slide.text||'').length;
  const fs = chars > 120 ? 32*sc : chars > 80 ? 36*sc : 40*sc;

  return (
    <div ref={ref} style={{width:`${W}px`,height:`${H}px`,backgroundColor:'#000000',position:'relative',overflow:'hidden',flexShrink:0,fontFamily:'Inter,-apple-system,BlinkMacSystemFont,sans-serif'}}>
      <div style={{position:'absolute',top:0,left:0,right:0,height:'30%',background:'linear-gradient(to bottom,rgba(255,107,53,0.03),transparent)',pointerEvents:'none'}} />
      <div style={{position:'relative',height:'100%',display:'flex',flexDirection:'column',padding:`${PV}px ${PH}px`}}>
        {/* Header */}
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
          <div style={{display:'flex',alignItems:'center',gap:`${12*sc}px`}}>
            <div style={{width:`${AV}px`,height:`${AV}px`,borderRadius:'50%',background:'linear-gradient(135deg,#FF6B35,#FF8C5A)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
              <span style={{color:'white',fontWeight:800,fontSize:`${16*sc}px`,letterSpacing:'-0.02em'}}>NC</span>
            </div>
            <div>
              <div style={{display:'flex',alignItems:'center',gap:`${5*sc}px`}}>
                <span style={{color:'white',fontWeight:700,fontSize:`${17*sc}px`,lineHeight:1.2}}>Nick Cornelius</span>
                <span style={{fontSize:`${14*sc}px`,color:'#1D9BF0'}}>✓</span>
              </div>
              <div style={{color:'#9CA3AF',fontSize:`${14*sc}px`,marginTop:`${2*sc}px`}}>@thenickcornelius</div>
            </div>
          </div>
          {slideNumber > 1 && <div style={{color:'#6B7280',fontSize:`${15*sc}px`,fontWeight:500}}>{slideNumber}/{totalSlides}</div>}
        </div>

        {/* Text */}
        <div style={{flex:hasVis?'none':1,display:'flex',flexDirection:'column',justifyContent:'center',marginTop:`${28*sc}px`}}>
          {paras.map((p,i) => (
            <p key={i} style={{margin:0,marginBottom:i<paras.length-1?`${18*sc}px`:0,fontSize:`${fs}px`,fontWeight:700,color:'white',lineHeight:1.35,letterSpacing:'-0.02em'}}>{p}</p>
          ))}
        </div>

        {/* Visual */}
        {hasVis && (
          <div style={{marginTop:`${16*sc}px`,flex:1,overflow:'hidden',display:'flex',flexDirection:'column',justifyContent:'center'}}>
            {slide.visual.type === 'code_block' && (() => { const v = slide.visual as CodeBlockVisual; return (
              <div style={{backgroundColor:'#0D1117',borderRadius:`${12*sc}px`,overflow:'hidden',border:'1px solid rgba(255,255,255,0.08)'}}>
                <div style={{display:'flex',alignItems:'center',gap:`${6*sc}px`,padding:`${10*sc}px ${14*sc}px`,backgroundColor:'#161B22',borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
                  {['#FF5F56','#FFBD2E','#27C93F'].map((c,i) => <div key={i} style={{width:`${10*sc}px`,height:`${10*sc}px`,borderRadius:'50%',backgroundColor:c}} />)}
                  <span style={{marginLeft:`${8*sc}px`,fontSize:`${10*sc}px`,color:'#6B7280',fontFamily:'JetBrains Mono,monospace'}}>{v.language||'python'}</span>
                </div>
                <div style={{padding:`${14*sc}px ${16*sc}px`,fontFamily:'"JetBrains Mono","Courier New",monospace',fontSize:`${11*sc}px`,lineHeight:1.6}}>{highlightCode(v.code||'')}</div>
              </div>
            );})()}
            {slide.visual.type === 'stats_grid' && (() => { const v = slide.visual as StatsGridVisual; return (
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:`${10*sc}px`}}>
                {(v.stats||[]).slice(0,4).map((s,i) => (
                  <div key={i} style={{backgroundColor:'#111111',borderRadius:`${12*sc}px`,padding:`${14*sc}px ${12*sc}px`,border:'1px solid rgba(255,255,255,0.06)'}}>
                    <div style={{fontSize:`${22*sc}px`,marginBottom:`${6*sc}px`,lineHeight:1}}>{s.icon}</div>
                    <div style={{fontSize:`${24*sc}px`,fontWeight:800,color:'#FF6B35',lineHeight:1,marginBottom:`${4*sc}px`}}>{s.value}</div>
                    <div style={{fontSize:`${10*sc}px`,color:'#9CA3AF',textTransform:'uppercase',letterSpacing:'0.05em'}}>{s.label}</div>
                  </div>
                ))}
              </div>
            );})()}
            {slide.visual.type === 'diagram' && (() => { const v = slide.visual as DiagramVisual; const nW=140*sc,nH=36*sc,gap=52*sc,sW=280*sc; const pos: Record<string,{x:number;y:number}> = {}; (v.nodes||[]).forEach((n,i)=>{pos[n.id]={x:sW/2-nW/2,y:i*(nH+gap)};}); const colors: Record<string,{bg:string;border:string;text:string}> = {input:{bg:'rgba(29,155,240,0.15)',border:'#1D9BF0',text:'#1D9BF0'},process:{bg:'rgba(255,107,53,0.15)',border:'#FF6B35',text:'#FF6B35'},output:{bg:'rgba(34,197,94,0.15)',border:'#22C55E',text:'#22C55E'}}; const sH=(v.nodes||[]).length*(nH+gap); return (
              <div>
                {v.title && <div style={{textAlign:'center',fontSize:`${11*sc}px`,color:'#6B7280',marginBottom:`${10*sc}px`,textTransform:'uppercase',letterSpacing:'0.08em'}}>{v.title}</div>}
                <svg width={sW} height={sH} style={{display:'block',margin:'0 auto',overflow:'visible'}}>
                  {(v.edges||[]).map((e,i)=>{ const f=pos[e.from],t=pos[e.to]; if(!f||!t) return null; const x1=f.x+nW/2,y1=f.y+nH,x2=t.x+nW/2,y2=t.y; return <g key={i}><line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#2D2D2D" strokeWidth={1.5*sc}/><polygon points={`${x2},${y2} ${x2-5*sc},${y2-8*sc} ${x2+5*sc},${y2-8*sc}`} fill="#2D2D2D"/></g>;})}
                  {(v.nodes||[]).map(n=>{ const p=pos[n.id]; if(!p) return null; const c=colors[n.type]||colors.process; return <g key={n.id}><rect x={p.x} y={p.y} width={nW} height={nH} rx={8*sc} fill={c.bg} stroke={c.border} strokeWidth={1*sc}/><text x={p.x+nW/2} y={p.y+nH/2} textAnchor="middle" dominantBaseline="middle" fill={c.text} fontSize={11*sc} fontFamily="Inter,sans-serif" fontWeight="600">{n.label}</text></g>;})}
                </svg>
              </div>
            );})()}
            {slide.visual.type === 'steps_list' && (() => { const v = slide.visual as StepsListVisual; return (
              <div style={{display:'flex',flexDirection:'column',gap:`${10*sc}px`}}>
                {(v.steps||[]).slice(0,3).map((s,i) => (
                  <div key={i} style={{display:'flex',gap:`${12*sc}px`,alignItems:'flex-start'}}>
                    <div style={{width:`${28*sc}px`,height:`${28*sc}px`,borderRadius:'50%',backgroundColor:'#FF6B35',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,fontSize:`${12*sc}px`,fontWeight:800,color:'white'}}>{s.number}</div>
                    <div style={{flex:1,paddingTop:`${2*sc}px`}}>
                      <div style={{fontSize:`${13*sc}px`,fontWeight:700,color:'white',marginBottom:`${3*sc}px`,lineHeight:1.3}}>{s.title}</div>
                      <div style={{fontSize:`${11*sc}px`,color:'#9CA3AF',lineHeight:1.4}}>{s.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            );})()}
          </div>
        )}

        <div style={{flex:1}} />
        {/* Mute icon */}
        <div style={{display:'flex',justifyContent:'flex-end',flexShrink:0,marginTop:`${8*sc}px`}}>
          <div style={{width:`${36*sc}px`,height:`${36*sc}px`,borderRadius:'50%',backgroundColor:'rgba(255,255,255,0.08)',display:'flex',alignItems:'center',justifyContent:'center'}}>
            <svg width={16*sc} height={16*sc} viewBox="0 0 24 24" fill="none">
              <path d="M11 5L6 9H2v6h4l5 4V5z" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M17 9l4 4m0-4l-4 4" stroke="#6B7280" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
});
SlideRenderer.displayName = 'SlideRenderer';
export default SlideRenderer;
