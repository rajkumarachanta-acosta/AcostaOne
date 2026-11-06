"use client";
import {useEffect,useState} from "react";
import {ArrowUpRight,BookOpenCheck,ChartNoAxesCombined,ChevronLeft,ChevronRight,FileSpreadsheet,PlayCircle,Sparkles,X} from "lucide-react";
type Tool="generator"|"audit"|"planner"|"pulse"|"creative";
const modules=[
 {id:"pulse" as Tool,name:"Pulse",short:"Pulse",description:"Synthetic leadership prototype — illustrative OE scores and account investigations.",src:"/pulse.html",icon:ChartNoAxesCombined,steps:[
  ["Review portfolio health","Explore 15 fictional accounts and filter by health or comparison period.","All data and OE scoring are illustrative."],
  ["Investigate an account","Open an account and select Investigate ROAS to see metric drivers and synthetic ASIN contributions.","Possible causes require validation. No campaign changes are made."]]},
 {id:"generator" as Tool,name:"Campaign Generator",short:"Build",description:"Turn source reports into upload-ready Amazon campaign bulk files.",src:"/campaign-generator.html",icon:FileSpreadsheet,steps:[
  ["Start with your source files","Upload your product workbook or CSV with ASIN, Brand, Category and Ad Group. Add keywords or extract them from product titles.","Your files stay in this browser session."],
  ["Set the campaign rules","Review naming, budget, bid and targeting controls before generating. The defaults are a starting point—not a substitute for your strategy.","Use the validation messages to correct missing fields."],
  ["Generate and review","Run the generator, inspect the campaign and ad-group preview, then download the completed Amazon bulk file.","Review the preview before uploading to Amazon Ads."],
  ["Return to a clean slate","Use Reset whenever you want to remove the current files, settings and generated output.","Reset clears this module only."]]},
 {id:"audit" as Tool,name:"Audit Tool",short:"Audit",description:"Analyse account structure and performance across nine action-oriented views.",src:"/audit-tool.html",icon:BookOpenCheck,steps:[
  ["Upload the four required reports","Add the Bulk Campaign Report, Amazon Benchmark Report, ASIN-Level Sales Report and ASIN-Level Traffic Report.","All four files must be ready before Audit is enabled."],
  ["Run the complete audit","Select Run complete audit. The engine reads the bulk report for Sponsored Products, Brands and Display data automatically.","You do not need separate sponsored-ad uploads."],
  ["Work through all nine tabs","Review the analysis, evidence, insights and next steps in every tab—from Executive Summary through Ad Hygiene.","Prioritise high-impact findings first."],
  ["Export or reset","Download the nine-sheet Excel audit for sharing, or select Reset to remove every uploaded report and result.","Reset returns the Audit Tool to a clean slate."]]},
 {id:"planner" as Tool,name:"Media Planner",short:"Plan",description:"Model investment, channel allocation and a 12-month growth plan.",src:"/media-planner.html",icon:ChartNoAxesCombined,steps:[
  ["Load the two planning sources","Upload the Amazon Advertising report and Vendor Central ASIN Sales report.","CSV and Excel files are supported."],
  ["Choose the growth ambition","Select one or more growth scenarios, then adjust Sponsored Products, Brands and Display budget shares.","Optional custom targets can override the model."],
  ["Build and examine the plan","Select Build plan to unlock metrics, product intelligence, trends, forecasts and recommendations.","The 12-month plan accounts for key retail events."],
  ["Export or start again","Download the Excel plan when ready. Use Reset to clear files, targets, allocations and results.","Reset affects the Media Planner only."]]},
 {id:"creative" as Tool,name:"Creative Studio",short:"Creative Studio",description:"Create and review Amazon product images, A+ content, Brand Story, Sponsored Brands and Store assets.",src:"https://shelf-ready-creative.lovable.app",icon:Sparkles,steps:[
  ["Open your creative workspace","Shelf Ready Creative, your Lovable app, is loaded here with its published workflow and features unchanged.","The Lovable project remains separate and unchanged. Sign-in may be required; use Open in new tab if your browser blocks embedded content."],
  ["Create and review assets","Choose a project, provide product details and brand inputs, and use the studio’s existing creation and review flow.","The app retains its own sign-in and project flow."]]}
];
function AcostaOneLogo({large=false}:{large?:boolean}){return <div className={`acosta-logo ${large?"large":""}`} aria-label="Acosta One"><span className="acosta-word">acosta</span><span className="pixel-mark" aria-hidden="true"><i/><i/><i/><i/><i/></span><span className="one-word">one</span></div>}
export default function HomePage(){
 const [tool,setTool]=useState<Tool>("generator"),[intro,setIntro]=useState(true),[tour,setTour]=useState(false),[step,setStep]=useState(0);const current=modules.find(m=>m.id===tool)!;
 useEffect(()=>{const t=window.setTimeout(()=>setIntro(false),3100);return()=>window.clearTimeout(t)},[]);
 useEffect(()=>{if(!intro&&!localStorage.getItem(`acosta-one-tour-v2-${tool}`)){setStep(0);setTour(true)}},[tool,intro]);
 function closeTour(){localStorage.setItem(`acosta-one-tour-v2-${tool}`,"seen");setTour(false);setStep(0)}
 const copy=current.steps[step];
 return <main className="clean-app">
  {intro&&<div className="cinematic-intro" role="status" aria-label="Launching Acosta One"><div className="intro-stage"><div className="intro-acosta"><span>acosta</span><span className="pixel-mark"><i/><i/><i/><i/><i/></span></div><div className="intro-line"/><div className="intro-one"><AcostaOneLogo large/><small>Retail Media Intelligence</small></div></div></div>}
  <header className="suite-header"><div className="suite-brand"><AcostaOneLogo/><small>Retail Media Intelligence</small></div><nav aria-label="Acosta One modules">{modules.map(m=>{const Icon=m.icon;return <button key={m.id} className={tool===m.id?"active":""} onClick={()=>{setTour(false);setStep(0);setTool(m.id)}}><Icon size={17}/><span>{m.name}</span></button>})}</nav><div className="header-actions"><button className="tour-button" onClick={()=>{setStep(0);setTour(true)}}><PlayCircle size={17}/>Tutorial</button><div className="suite-user"><span>RA</span><div><b>Raj Achanta</b><small>Administrator</small></div></div></div></header>
  <div className="module-ribbon"><div><b>{current.name}</b><span>{current.description}</span></div><div className="ribbon-actions">{tool==="creative"&&<a className="standalone-link" href={current.src} target="_blank" rel="noopener noreferrer">Open in new tab<ArrowUpRight size={14}/></a>}<span className="secure-label"><i/>{tool==="creative"?"Creative Studio workspace":"Session-only processing"}</span></div></div>
  <section className="embedded-tool"><iframe key={tool} title={`Acosta One ${current.name}`} src={current.src}/></section>
  {tour&&<div className="tour-backdrop" role="dialog" aria-modal="true" aria-labelledby="tour-title"><section className="tour-card"><header><div><span className="tour-kicker">FIRST-TIME GUIDE · {current.short.toUpperCase()}</span><h2 id="tour-title">{copy[0]}</h2></div><button aria-label="Close tutorial" onClick={closeTour}><X size={20}/></button></header><div className="tour-progress">{current.steps.map((_,i)=><i key={i} className={i<=step?"on":""}/>)}</div><p>{copy[1]}</p><aside>{copy[2]}</aside><footer><span>{step+1} of {current.steps.length}</span><div>{step>0&&<button className="secondary" onClick={()=>setStep(step-1)}><ChevronLeft size={16}/>Back</button>}<button className="primary" onClick={()=>step===current.steps.length-1?closeTour():setStep(step+1)}>{step===current.steps.length-1?"Open module":"Next"}{step<current.steps.length-1&&<ChevronRight size={16}/>}</button></div></footer></section></div>}
 </main>
}
