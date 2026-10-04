import {createServer} from 'node:http';
import {readFile, stat} from 'node:fs/promises';
import {watch} from 'node:fs';
import {dirname, extname, resolve, sep} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)), '../dist');
const port=Number(process.env.PORT || 8000);
if(!Number.isInteger(port)||port<1||port>65535)throw new Error('PORT must be an integer from 1 to 65535.');
const clients=new Set();
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpeg':'image/jpeg','.jpg':'image/jpeg','.zip':'application/zip','.md':'text/plain; charset=utf-8','.tsx':'text/plain; charset=utf-8','.ts':'text/plain; charset=utf-8'};
const refresh='<script>const updates=new EventSource("/__dev/events");updates.addEventListener("reload",()=>location.reload());</script>';

const server=createServer(async(req,res)=>{
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='GET'&&req.method!=='HEAD'){
    res.writeHead(405,{'Allow':'GET, HEAD'}).end('Method not allowed');
    return;
  }
  let pathname;
  try{pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);}
  catch{res.writeHead(400).end('Invalid URL');return;}
  if(pathname==='/__dev/events'&&req.method==='GET'){
    res.writeHead(200,{'Content-Type':'text/event-stream','Connection':'keep-alive'});
    res.write(': connected\n\n');
    clients.add(res);
    req.on('close',()=>clients.delete(res));
    return;
  }
  let path=resolve(root,`.${pathname}`);
  if(path!==root&&!path.startsWith(root+sep)){
    res.writeHead(403).end('Forbidden');
    return;
  }
  try{
    if((await stat(path)).isDirectory()){
      if(!pathname.endsWith('/')){
        res.writeHead(302,{'Location':pathname+'/'}).end();
        return;
      }
      path=resolve(path,'index.html');
    }
    const extension=extname(path);
    let body=await readFile(path);
    if(extension==='.html')body=Buffer.from(body.toString().replace('</body>',refresh+'</body>'));
    res.writeHead(200,{'Content-Type':types[extension]||'application/octet-stream','Content-Length':body.length});
    res.end(req.method==='HEAD'?undefined:body);
  }catch(error){
    const status=error.code==='ENOENT'||error.code==='ENOTDIR'?404:error.code==='EACCES'?403:500;
    if(status===500)console.error(error);
    res.writeHead(status).end(status===404?'Not found':status===403?'Forbidden':'Server error');
  }
});

let pending;
const watcher=watch(root,{recursive:true},()=>{
  clearTimeout(pending);
  pending=setTimeout(()=>{for(const client of clients)client.write('event: reload\ndata: changed\n\n');},100);
});
const heartbeat=setInterval(()=>{for(const client of clients)client.write(': heartbeat\n\n');},30000);
server.on('error',error=>{
  console.error(error.code==='EADDRINUSE'?`Port ${port} is busy. Stop the other server or use PORT=4173 npm run dev.`:error.message);
  watcher.close();clearInterval(heartbeat);process.exitCode=1;
});
server.listen(port,'127.0.0.1',()=>console.log(`Funnel Spine\nKit: http://127.0.0.1:${port}/\nLab: http://127.0.0.1:${port}/lab/\nChanges in dist/ refresh the browser automatically.`));
function shutdown(){watcher.close();clearTimeout(pending);clearInterval(heartbeat);for(const client of clients)client.end();server.close();}
process.on('SIGINT',shutdown);
process.on('SIGTERM',shutdown);
