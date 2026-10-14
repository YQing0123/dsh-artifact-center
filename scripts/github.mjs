import { spawnSync } from 'node:child_process';
const owner='YQing0123',repo='dsh-artifact-center';
const credential=spawnSync('git',['credential','fill'],{input:`protocol=https\nhost=github.com\npath=${owner}/${repo}.git\n\n`,encoding:'utf8',timeout:15000,env:{...process.env,GIT_TERMINAL_PROMPT:'0'}});
if(credential.status!==0)throw new Error('GitHub credential is not available in the local Git credential helper.');
const fields=Object.fromEntries(credential.stdout.trim().split('\n').map(line=>{const i=line.indexOf('=');return [line.slice(0,i),line.slice(i+1)];}));
const token=fields.password;if(!token)throw new Error('GitHub credential helper did not return a token.');
async function request(endpoint,method='GET',body){const res=await fetch(`https://api.github.com${endpoint}`,{method,headers:{authorization:`Bearer ${token}`,accept:'application/vnd.github+json','x-github-api-version':'2022-11-28',...(body?{'content-type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});const value=await res.json();if(!res.ok)throw new Error(`GitHub ${res.status}: ${String(value.message??'Request failed').replaceAll(token,'[redacted]')}`);return value;}
const command=process.argv[2]??'inspect';
if(command==='inspect'){const user=await request('/user');const project=await request(`/repos/${owner}/${repo}`);console.log(JSON.stringify({login:user.login,repository:project.full_name,createdAt:project.created_at,defaultBranch:project.default_branch,topics:project.topics},null,2));}
else if(command==='topic'){const project=await request(`/repos/${owner}/${repo}`);const names=[...new Set([...(project.topics??[]),'dsh-plugin','deepseek-harness','artifact'])];const value=await request(`/repos/${owner}/${repo}/topics`,'PUT',{names});console.log(JSON.stringify({repository:`${owner}/${repo}`,topics:value.names},null,2));}
else if(command==='submit'){
  const upstream='awesome-dsh-plugin/awesome-dsh-plugin';
  const me=await request('/user');
  let fork;try{fork=await request(`/repos/${me.login}/awesome-dsh-plugin`);}catch(e){if(!e.message.includes('404'))throw e;fork=await request(`/repos/${upstream}/forks`,'POST',{});}
  if(fork.parent?.full_name!==upstream)throw new Error('Existing awesome-dsh-plugin repository is not a fork of the requested directory.');
  const branch='add-dsh-artifact-center';
  const upstreamRepo=await request(`/repos/${upstream}`), base=upstreamRepo.default_branch;
  const ref=await request(`/repos/${upstream}/git/ref/heads/${base}`);
  try{await request(`/repos/${me.login}/awesome-dsh-plugin/git/refs`,'POST',{ref:`refs/heads/${branch}`,sha:ref.object.sha});}catch(e){if(!e.message.includes('422'))throw e;}
  const entryPath='data/plugins/YQing0123__dsh-artifact-center.yml';
  const yaml="url: https://github.com/YQing0123/dsh-artifact-center\nname: YQing0123/dsh-artifact-center\ncategory: ui\ndescription:\n  en: 'Artifact center: search, preview and open files produced by DSH conversations.'\n  zh: '产物中心：跨工作区检索、预览并打开对话产出的文件。'\n";
  let existing;try{existing=await request(`/repos/${me.login}/awesome-dsh-plugin/contents/${entryPath}?ref=${branch}`);}catch(e){if(!e.message.includes('404'))throw e;}
  if(!existing||Buffer.from(existing.content,'base64').toString('utf8')!==yaml)await request(`/repos/${me.login}/awesome-dsh-plugin/contents/${entryPath}`,'PUT',{message:'Add dsh-artifact-center',content:Buffer.from(yaml).toString('base64'),branch,...(existing?{sha:existing.sha}:{})});
  const prs=await request(`/repos/${upstream}/pulls?state=open&head=${encodeURIComponent(me.login+':'+branch)}`);
  const pr=prs[0]??await request(`/repos/${upstream}/pulls`,'POST',{title:'Add dsh-artifact-center',head:`${me.login}:${branch}`,base,body:'Adds Artifact Center, a DSH plugin for finding conversation-produced files across registered workspaces. It provides a global panel, conversation provenance, native previews, file opening, tags/favorites, missing-file checks, system-trash deletion and an artifact_search tool. The repository declares dsh.bundle and ships its client and lazy renderer assets.\n\nValidation: Node integration tests, clean-profile Host/browser acceptance, authenticated byte routes and npm package checks.'});
  console.log(JSON.stringify({pullRequest:pr.html_url},null,2));
}else throw new Error('Unknown GitHub action');
