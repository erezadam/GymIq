import fs from 'fs'
const OPENAI_API_KEY = process.env.OPENAI_API_KEY
if (!OPENAI_API_KEY) { console.error('no key'); process.exit(1) }
const systemPrompt = fs.readFileSync('/tmp/prod_systemPrompt.txt','utf8')
const poolOrig = JSON.parse(fs.readFileSync('pool.json','utf8')) // [{idx,id,nameHe,muscle,eq}] real alphabetical order
const muscles = JSON.parse(fs.readFileSync('muscles_clean.json','utf8'))
const upper = ['back','biceps_brachii','chest','shoulders','triceps']
const upperNames = upper.map(id => (muscles.find(m=>m.id===id)||{}).nameHe)

function buildUserPrompt(pool){
  const strengthCount = 9
  const exercisesJson = JSON.stringify(pool.map((e,i)=>({idx:i+1, nameHe:e.nameHe, muscle:e.muscle, eq:e.eq||'other'})),null,0)
  const musclesJson = JSON.stringify(muscles.map(m=>({id:m.id,nameHe:m.nameHe,region:m.bodyRegion})),null,0)
  const setsSection = upper.map(id=>{const m=muscles.find(x=>x.id===id);return `${m.nameHe}: 1 אימונים, ~10 סטים/אימון (~4 תרגילים)`}).join('\n')
  return `צור 1 אימונים:

**הגדרות:**
- מבנה: Upper/Lower Split
- משך: 60 דקות
- תרגילי כוח: בדיוק ${strengthCount} לכל אימון (בלי חימום ובלי ליבה — הם מנוהלים בנפרד)
- סה"כ באימון: ${strengthCount} (${strengthCount} כוח)


**שרירים לכל אימון (חובה לעקוב!):**
אימון 1 (פלג עליון): ${upperNames.join(', ')}

**חלוקת סטים (10 סטים/שריר/שבוע):**
${setsSection}

**תרגילים זמינים (השתמש ב-idx כ-exerciseId!):**
${exercisesJson}

**שרירים:**
${musclesJson}

**אל תכלול (נעשו אתמול, לפי idx):**
[]

**היסטוריית אימונים (5 אחרונים):**
[]

**היסטוריית ביצוע:** אין נתונים - משתמש חדש, המלץ משקלות שמרניים
**חובה:**
- לכל תרגיל: recommendation עם weight, repRange, sets, reasoning
- כל אימון: בדיוק **${strengthCount} תרגילי כוח** (בלי חימום, בלי core — הם מנוהלים בנפרד!)
- עקוב אחרי חלוקת השרירים לכל אימון!
- אל תחזור על תרגילים בין אימונים ככל האפשר
- לכל שריר — כל התרגילים מאותו סוג ציוד (eq). בחר ציוד אחד per muscle per workout
- החזר JSON בלבד`
}

async function run(pool){
  const body={ model:'gpt-4.1', max_tokens:8192, response_format:{type:'json_object'},
    messages:[{role:'system',content:systemPrompt},{role:'user',content:buildUserPrompt(pool)}] }
  const r=await fetch('https://api.openai.com/v1/chat/completions',{method:'POST',headers:{'Authorization':`Bearer ${OPENAI_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify(body)})
  const j=await r.json()
  if(!j.choices){console.error('ERR',JSON.stringify(j).slice(0,300));return null}
  const parsed=JSON.parse(j.choices[0].message.content)
  const ex=(parsed.workouts&&parsed.workouts[0]&&parsed.workouts[0].exercises)||[]
  // map idx->pool entry
  return ex.map(e=>{const i=Number(e.exerciseId)-1;const p=pool[i];return p?{id:p.id,eq:p.eq,nameHe:p.nameHe,muscle:p.muscle}:{id:'?'+e.exerciseId}}).filter(Boolean)
}
function shuffle(a,seed){a=a.slice();let s=seed;const rnd=()=>{s=(s*1103515245+12345)&0x7fffffff;return s/0x7fffffff};for(let i=a.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}

const results={fixed:[],shuffled:[]}
for(let k=0;k<3;k++){ const picks=await run(poolOrig); results.fixed.push(picks); console.log('FIXED run',k+1,'done, picks:',picks.length) }
for(let k=0;k<3;k++){ const picks=await run(shuffle(poolOrig,k+7)); results.shuffled.push(picks); console.log('SHUFFLED run',k+1,'done, picks:',picks.length) }
fs.writeFileSync('experiment_results.json',JSON.stringify(results,null,1))

function eqDist(picks){const h={};picks.forEach(p=>h[p.eq]=(h[p.eq]||0)+1);return h}
function overlap(runs){const sets=runs.map(r=>new Set(r.map(p=>p.id)));const inter=[...sets[0]].filter(x=>sets.every(s=>s.has(x)));const union=new Set(runs.flatMap(r=>r.map(p=>p.id)));return {interAll:inter.length,sizes:sets.map(s=>s.size),unionSize:union.size,pctVsAvg:(inter.length/(sets.reduce((a,s)=>a+s.size,0)/sets.length)*100).toFixed(0)}}
console.log('\n=== EQUIPMENT DISTRIBUTION ===')
;['fixed','shuffled'].forEach(g=>{results[g].forEach((p,i)=>console.log(g,'run'+(i+1),JSON.stringify(eqDist(p)),'ids:',p.map(x=>x.id).join(',')))})
console.log('\n=== OVERLAP (exercise ids in ALL 3 runs of a group) ===')
console.log('fixed   ',JSON.stringify(overlap(results.fixed)))
console.log('shuffled',JSON.stringify(overlap(results.shuffled)))
