import {createServer} from 'node:http';
import {readFile, stat, mkdir, writeFile, rename} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {parseStudy} from '../dist/lab/vertical-particles/study-config.js';
import {watch} from 'node:fs';
import {dirname, extname, resolve, sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {watchLab} from './build-lab.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)), '../dist');
const port=Number(process.env.PORT || 8000);
if(!Number.isInteger(port)||port<1||port>65535)throw new Error('PORT must be an integer from 1 to 65535.');
const labBuilder=await watchLab();
const clients=new Set();
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpeg':'image/jpeg','.jpg':'image/jpeg','.zip':'application/zip','.md':'text/plain; charset=utf-8','.tsx':'text/plain; charset=utf-8','.ts':'text/plain; charset=utf-8'};
const refresh='<script>const updates=new EventSource("/__dev/events");updates.addEventListener("reload",()=>location.reload());</script>';
const savePath=resolve(root,'../designs/vertical-particles/latest.json');
function json(res,status,value){res.writeHead(status,{'Content-Type':'application/json'}).end(JSON.stringify(value));}
async function studyRequest(req,res){
  if(req.method==='GET'){
    try{json(res,200,{config:parseStudy(JSON.parse(await readFile(savePath,'utf8'))),path:savePath});}
    catch(error){if(error.code==='ENOENT')json(res,200,{config:null,path:savePath});else{console.error(error);json(res,500,{error:'Saved configuration could not be loaded.'});}}
    return;
  }
  if(req.method!=='POST'){json(res,405,{error:'Use GET or POST.'});return;}
  if(![`http://127.0.0.1:${port}`,`http://localhost:${port}`].includes(req.headers.origin)){json(res,403,{error:'Save from this local particle study.'});return;}
  if(req.headers['content-type']!=='application/json'){json(res,415,{error:'Send a JSON configuration.'});return;}
  let config;
  try{
    const chunks=[];let bytes=0;
    for await(const chunk of req){bytes+=chunk.length;if(bytes>50000){json(res,413,{error:'Configuration exceeds 50 KB.'});return;}chunks.push(chunk);}
    config=parseStudy(JSON.parse(Buffer.concat(chunks).toString()));
  }catch(error){json(res,400,{error:error.message});return;}
  try{
    await mkdir(dirname(savePath),{recursive:true});
    const temporary=resolve(dirname(savePath),`.${randomUUID()}.json`);
    await writeFile(temporary,JSON.stringify(config,null,2)+'\n');
    await rename(temporary,savePath);
    json(res,200,{path:savePath});
  }catch(error){console.error(error);json(res,500,{error:'Configuration could not be written.'});}
}

const server=createServer(async(req,res)=>{
  res.setHeader('Cache-Control','no-store');
  let pathname;
  try{pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);}
  catch{res.writeHead(400).end('Invalid URL');return;}
  if(pathname==='/__dev/vertical-particles'){await studyRequest(req,res);return;}
  if(req.method!=='GET'&&req.method!=='HEAD'){
    res.writeHead(405,{'Allow':'GET, HEAD'}).end('Method not allowed');
    return;
  }
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
  void labBuilder.dispose();
});
server.listen(port,'127.0.0.1',()=>console.log(`Funnel Spine\nKit: http://127.0.0.1:${port}/\nLab: http://127.0.0.1:${port}/lab/\nChanges in dist/ refresh the browser automatically.`));
function shutdown(){watcher.close();clearTimeout(pending);clearInterval(heartbeat);for(const client of clients)client.end();server.close();void labBuilder.dispose();}
process.on('SIGINT',shutdown);
process.on('SIGTERM',shutdown);
