'use strict';
const crypto=require('node:crypto');
const plain=(value,max)=>typeof value==='string'?value.trim().slice(0,max):'';
const fail=(message,status=400)=>Object.assign(new Error(message),{status});
function cleanCommunityReport(item){
  if(!item||typeof item!=='object'||typeof item.id!=='string')return null;
  const seen=new Set(),replies=(Array.isArray(item.replies)?item.replies:[]).slice(-100).flatMap(reply=>{
    if(!reply||typeof reply.id!=='string'||seen.has(reply.id)||!plain(reply.text,4000))return [];
    seen.add(reply.id);
    return [{id:plain(reply.id,100),authorId:plain(reply.authorId,100),authorName:plain(reply.authorName,40),authorRole:plain(reply.authorRole,40),text:plain(reply.text,4000),createdAt:Math.max(0,Number(reply.createdAt)||Date.now())}];
  }).sort((a,b)=>a.createdAt-b.createdAt);
  return {id:plain(item.id,100),reporterId:plain(item.reporterId,100),reporterName:plain(item.reporterName,40),title:plain(item.title,120),details:plain(item.details,4000),page:plain(item.page,300),createdAt:Math.max(0,Number(item.createdAt)||Date.now()),updatedAt:Math.max(Number(item.updatedAt)||Number(item.createdAt)||0,...replies.map(reply=>reply.createdAt)),status:item.status==='resolved'?'resolved':'open',replies};
}
function createCommunityReports({getAccounts,getAccount,readBody,send,save,isStaff,normalize}){
  let pending=Promise.resolve();
  function all(){
    const index=new Map();
    for(const account of getAccounts())for(const value of account.community?.bugReports||[]){
      const report=cleanCommunityReport(value);if(!report)continue;
      const existing=index.get(report.id);
      if(!existing){index.set(report.id,report);continue;}
      const latest=report.updatedAt>=existing.updatedAt?report:existing;
      const replies=new Map([...existing.replies,...report.replies].map(reply=>[reply.id,reply]));
      index.set(report.id,{...latest,replies:[...replies.values()].sort((a,b)=>a.createdAt-b.createdAt).slice(-100)});
    }
    return [...index.values()].sort((a,b)=>a.updatedAt-b.updatedAt);
  }
  function transaction(change){const task=pending.catch(()=>{}).then(change);pending=task;return task;}
  async function store(report,recipients){
    const before=recipients.map(account=>[account,account.community?.bugReports]);
    try{
      for(const account of recipients){normalize(account);account.community.bugReports=[...account.community.bugReports.filter(item=>item.id!==report.id),structuredClone(report)].slice(-100);}
      await save();
    }catch(error){for(const [account,reports]of before)account.community.bugReports=reports||[];throw error;}
  }
  async function handle(req,res,pathname){
    const create=pathname==='/api/community/bug-report'&&req.method==='POST';
    const listing=pathname==='/api/community/bug-reports'&&req.method==='GET';
    const action=/^\/api\/community\/bug-reports\/([a-f0-9-]{36})\/(reply|status)$/i.exec(pathname);
    if(!create&&!listing&&!(action&&req.method==='POST'))return false;
    const account=await getAccount(req);if(!account)throw fail('Log in to use report threads.',401);
    if(listing){
      const mine=new URL(req.url,'http://localhost').searchParams.get('scope')==='mine';
      const reports=all().filter(report=>isStaff(account)&&!mine||report.reporterId===account.id);
      send(res,200,{reports});return true;
    }
    const input=await readBody(req);
    const result=await transaction(async()=>{
      if(create){
        const title=plain(input.title,120),details=plain(input.details,4000);
        if(!title||!details)throw fail('Add a short title and describe what happened.');
        const staff=getAccounts().filter(isStaff);if(!staff.length)throw fail('The studio report inbox is unavailable right now.',503);
        const report={id:crypto.randomUUID(),reporterId:account.id,reporterName:account.profile.username,title,details,page:plain(input.page,300),createdAt:Date.now(),updatedAt:Date.now(),status:'open',replies:[]};
        await store(report,[...new Set([...staff,account])]);
        return {report,message:'Your report was sent. Replies will appear in My reports.'};
      }
      const report=all().find(item=>item.id===action[1]);if(!report)throw fail('This report was not found.',404);
      if(!isStaff(account)&&report.reporterId!==account.id)throw fail('You can only view or reply to your own reports.',403);
      if(action[2]==='status'){
        if(!isStaff(account))throw fail('Only the studio team can change report status.',403);
        if(!['open','resolved'].includes(input.status))throw fail('Choose Open or Resolved.');
        report.status=input.status;
      }else{
        const text=plain(input.text,4000);if(!text)throw fail('Write a reply before sending.');
        if(report.replies.length>=100)throw fail('This report has reached its 100 reply limit.');
        report.replies.push({id:crypto.randomUUID(),authorId:account.id,authorName:account.profile.username,authorRole:account.role==='owner'?'owner':account.profile.primaryRole||'member',text,createdAt:Date.now()});
      }
      report.updatedAt=Date.now();
      const recipients=getAccounts().filter(user=>isStaff(user)||user.id===report.reporterId);
      await store(report,recipients);
      return {report,message:action[2]==='reply'?'Reply sent.':report.status==='resolved'?'Report resolved.':'Report reopened.'};
    });
    send(res,create?201:200,result);return true;
  }
  return {handle};
}
module.exports={cleanCommunityReport,createCommunityReports};
