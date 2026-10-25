(function(root,factory){
  'use strict';
  const rules=factory();
  if(typeof module==='object'&&module.exports)module.exports=rules;
  else root.HelunemiCfcRules=rules;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const actions=Object.freeze([
    {id:'open-cfc',label:'Open CFC',view:'preview'},
    {id:'add-friend',label:'Add friend',view:'full'},
    {id:'invite-party',label:'Invite to party',view:'full'},
    {id:'invite-group',label:'Invite to group',view:'full'},
    {id:'view-profile',label:'View profile',view:'full'},
    {id:'message',label:'Message',view:'full'}
  ].map(Object.freeze));
  const action=value=>actions.find(item=>item.id===value)||actions[0];
  // Clip the rotated button to the card. Off-card or transparent buttons cannot satisfy navigation.
  function buttonOnCard(layer,design){
    if(layer.visible===false||Number(layer.opacity??100)<=0)return false;
    const width=Number(design.width)||1000,height=Number(design.height)||1000;
    const w=Number(layer.width)/100*width,h=Number(layer.height)/100*height;
    if(!(w>0&&h>0))return false;
    const x=Number(layer.x)/100*width+w/2,y=Number(layer.y)/100*height+h/2;
    const angle=(Number(layer.rotation)||0)*Math.PI/180,cos=Math.cos(angle),sin=Math.sin(angle);
    let points=[[-w/2,-h/2],[w/2,-h/2],[w/2,h/2],[-w/2,h/2]].map(([a,b])=>({x:x+a*cos-b*sin,y:y+a*sin+b*cos}));
    for(const [axis,edge,insideGreater] of [['x',0,true],['x',width,false],['y',0,true],['y',height,false]]){
      const output=[],inside=point=>insideGreater?point[axis]>=edge:point[axis]<=edge;
      for(let index=0;index<points.length;index++){
        const from=points[index],to=points[(index+1)%points.length],a=inside(from),b=inside(to);
        if(a)output.push(from);
        if(a!==b){const t=(edge-from[axis])/(to[axis]-from[axis]);output.push({x:from.x+(to.x-from.x)*t,y:from.y+(to.y-from.y)*t});}
      }
      points=output;if(points.length<3)return false;
    }
    const area=Math.abs(points.reduce((sum,point,index)=>{const next=points[(index+1)%points.length];return sum+point.x*next.y-next.x*point.y;},0))/2;
    return area>.5;
  }
  function openButtonIssue(card){
    const design=card?.design,layers=design?.layers||[];
    const found=layers.some(layer=>layer.type==='button'&&action(layer.buttonAction).id==='open-cfc'&&layer.visibilityMode==='preview'&&buttonOnCard(layer,design));
    return found?'':'Cannot save or post: add a visible Open CFC button inside the Preview card. Keep it on the card, turn on its visibility, and set its opacity above zero.';
  }
  return Object.freeze({actions,action,buttonOnCard,openButtonIssue});
});
