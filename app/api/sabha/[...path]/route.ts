import { bridgeSabha } from "@/lib/anu/sabha-bridge";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export const maxDuration=60;
async function handle(request:Request,context:{params:Promise<{path:string[]}>}){
 const {path}=await context.params;
 const endpoint=path.length===1?path[0]:"";
 const allowed:Record<string,string[]>={chat:["POST"],actions:["POST"],history:["GET","DELETE"],conversations:["GET"]};
 if(!allowed[endpoint]?.includes(request.method))return Response.json({error:"Unsupported Sabha request."},{status:404,headers:{"Cache-Control":"no-store"}});
 return bridgeSabha(request,endpoint as "chat"|"actions"|"history"|"conversations");
}
export const GET=handle;
export const POST=handle;
export const DELETE=handle;
