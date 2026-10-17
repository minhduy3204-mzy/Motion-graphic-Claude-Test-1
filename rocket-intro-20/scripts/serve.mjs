import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export function createServer(port=4180){
 const types={'.html':'text/html','.css':'text/css','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.woff2':'font/woff2','.ttf':'font/ttf','.wav':'audio/wav','.mp4':'video/mp4'};
 const server=http.createServer((req,res)=>{
  let rel=decodeURIComponent(new URL(req.url,'http://local').pathname);if(rel==='/')rel='/editor.html';
  const file=path.resolve(root,'.'+rel);if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
  fs.stat(file,(err,st)=>{
   if(err||!st.isFile()){res.writeHead(404);res.end('Not found');return;}
   const range=req.headers.range?.match(/bytes=(\d+)-(\d*)/),headers={'Content-Type':types[path.extname(file)]||'application/octet-stream','Accept-Ranges':'bytes','Cache-Control':'no-store'};
   if(range){const start=Number(range[1]),end=range[2]?Math.min(Number(range[2]),st.size-1):st.size-1;if(start> end){res.writeHead(416);res.end();return;}res.writeHead(206,{...headers,'Content-Length':end-start+1,'Content-Range':`bytes ${start}-${end}/${st.size}`});fs.createReadStream(file,{start,end}).pipe(res);}
   else{res.writeHead(200,{...headers,'Content-Length':st.size});fs.createReadStream(file).pipe(res);}
  });
 });
 return new Promise(resolve=>server.listen(port,'127.0.0.1',()=>resolve(server)));
}
if(process.argv[1]===fileURLToPath(import.meta.url)){await createServer(Number(process.env.PORT)||4180);console.log('Rocket Film editor: http://127.0.0.1:4180/editor.html');}
