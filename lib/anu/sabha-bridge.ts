import "server-only";
import { cookies } from "next/headers";
import { memberIdentity } from "./auth";
const json=(body:object,status=200)=>Response.json(body,{status,headers:{"Cache-Control":"private, no-store",Vary:"Cookie"}});
export async function bridgeSabha(request:Request,path:"chat"|"actions"|"history"|"conversations"){
 try{
  if(request.method!=="GET"&&request.headers.get("origin")!==new URL(request.url).origin)return json({error:"Invalid request origin."},403);
  const member=await memberIdentity();if(!member)return json({error:"Sign in with Devvrats to connect to Sabha."},401);
  const secret=process.env.ANU_INTEGRATION_SECRET;if(!secret)return json({error:"Anu’s Sabha connection is not configured."},503);
  const base=new URL(process.env.SABHA_PUBLIC_URL||"https://sabha.devvrats.in");
  const local=process.env.NODE_ENV!=="production"&&["localhost","127.0.0.1","[::1]"].includes(base.hostname);
  if(base.username||base.password||base.pathname!=="/"||base.search||base.hash||(!local&&(base.protocol!=="https:"||base.hostname!=="sabha.devvrats.in"))||(local&&!['http:','https:'].includes(base.protocol)))return json({error:"Anu’s Sabha connection is not configured."},503);
  // Forward only this project's shared Supabase auth cookies to their intended Sabha origin.
  const project=new URL(process.env.NEXT_PUBLIC_SUPABASE_URL||"").hostname.split(".")[0];
  const prefix=`sb-${project}-auth-token`;
  const cookie=(await cookies()).getAll().filter(({name})=>name===prefix||(name.startsWith(prefix+".")&&/^\d+$/.test(name.slice(prefix.length+1)))).map(({name,value})=>`${name}=${value}`).join("; ");
  if(!cookie)return json({error:"Sign in again with Devvrats to connect your Sabha session."},401);
  const target=new URL(`/api/anu/${path}`,base);
  const input=new URL(request.url);
  for(const key of ["scope","q"])if(input.searchParams.has(key))target.searchParams.set(key,input.searchParams.get(key)!);
  const headers:Record<string,string>={"Content-Type":"application/json",Cookie:cookie,"x-anu-integration-key":secret,"x-anu-member":member.id};
  let body:string|undefined;
  if(request.method!=="GET"){
   body=await request.text();if(new TextEncoder().encode(body).length>60000)return json({error:"Please shorten this request."},413);
  }
  const response=await fetch(target,{method:request.method,headers,body,cache:"no-store",redirect:"error",signal:AbortSignal.timeout(58_000)});
  const result=await response.json().catch(()=>null);
  if(!result||typeof result!=="object")return json({error:"Sabha could not respond. Please try again."},502);
  return json(result,response.status);
 }catch{return json({error:"Anu couldn’t connect to Sabha. Please try again."},503);}
}
