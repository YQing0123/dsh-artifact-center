import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

// Fixture-only browser regression. No write is forwarded to Host storage or OS APIs.
export async function browserRegression(page) {
  const checks = [], check = (name, ok) => checks.push({ name, ok: Boolean(ok) });
  const viewport = page.viewportSize(), key = "dsh.artifact-center.visible-formats.v1";
  const preference = await page.evaluate(key => localStorage.getItem(key), key);
  const stamp = Date.now();
  const types = [["md","doc"],["csv","data"],["tsv","data"],["svg","image"],["html","web"],["docx","doc"],["wav","media"],["pdf","doc"],["json","data"],["mmd","code"]];
  let records = types.map(([ext, kind], i) => ({
    id: (i + 1).toString(16).padStart(32, "0"), name: `fixture.${ext}`, path: `/ui-regression/fixture.${ext}`,
    relPath: `fixture.${ext}`, ext: `.${ext}`, kind, workspaceId: "ui-regression", workspaceTitle: 'UI regression, "quoted"',
    source: "present", size: 200, mtime: stamp, lastSeenAt: stamp,
    tags: i ? ["shared"] : ["seed"], note: i ? "" : "saved note",
    versions: i ? [{ time: stamp, source: "present", size: 200 }] : [{ time: stamp-300000, source: "write", size: 100, sessionId: "ui-regression-earlier", sessionTitle: "Earlier fixture conversation" },
      { time: stamp, source: "present", size: 200, sessionTitle: "Newest fixture conversation" }],
  }));
  const texts = { ".md": "# Fixture heading\n\n```mermaid\ngraph TD; A-->B;\n```\n\n<script>window.__artifactTestXSS=true</script>",
    ".csv": 'name,value\r\n"hello, world","line one\nline two"\r\n"quote ""inside""",42',
    ".tsv": "name\tvalue\n中文\t数据", ".json": '{"fixture":true}', ".mmd": "graph TD; A-->B;" };
  const wav = Buffer.alloc(1644);
  wav.write("RIFF"); wav.writeUInt32LE(1636,4); wav.write("WAVEfmt ",8); wav.writeUInt32LE(16,16);
  wav.writeUInt16LE(1,20); wav.writeUInt16LE(1,22); wav.writeUInt32LE(8000,24); wav.writeUInt32LE(16000,28);
  wav.writeUInt16LE(2,32); wav.writeUInt16LE(16,34); wav.write("data",36); wav.writeUInt32LE(1600,40);
  const stream = "BT /F1 12 Tf 20 100 Td (Fixture PDF) Tj ET";
  const objects = ["<< /Type /Catalog /Pages 2 0 R >>", "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 200] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"];
  let pdf = "%PDF-1.4\n"; const offsets = [];
  for (const [i,obj] of objects.entries()) { offsets.push(Buffer.byteLength(pdf)); pdf += `${i+1} 0 obj\n${obj}\nendobj\n`; }
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 6\n0000000000 65535 f \n${offsets.map(n=>`${String(n).padStart(10,"0")} 00000 n \n`).join("")}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  let attempts = 0, savedTags = [], textFailure = false, textCalls = 0; const fileRequests = new Set();
  const pattern = /\/artifact-center\/(?:api\/[^/]+|file)(?:\?.*)?$/;
  const handler = async route => {
    const request = route.request(), url = new URL(request.url()), action = url.pathname.split("/").at(-1);
    const json = data => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(data) });
    if (action === "status") return json({ phase: "ready", processed: 1, total: 1, count: records.length, persistent: true,
      recordRevision: 1, workspaces: [{ id: "ui-regression", title: "UI regression" }],
      counts: { tags: { seed:1,shared:9 }, workspaces: { "ui-regression":10 }, types:{} },
      config: { readableExtensions: types.map(([ext])=>ext), previewMaxBytes:20971520 } });
    if (action === "list") return json({ records, total: records.length });
    const record = records.find(r => r.id === url.searchParams.get("id"));
    if (action === "text" && record) {
      textCalls++;
      if (textFailure) return route.fulfill({status:503,contentType:"application/json",body:JSON.stringify({error:"Fixture preview failure"})});
      return json({ text: texts[record.ext] ?? "", truncated: false });
    }
    if (action === "applications") return json([{ id:"fixture-app",name:"Fixture app" }]);
    if (action === "patch") {
      const body = request.postDataJSON(); attempts++;
      if (attempts === 1) return route.fulfill({ status:503,contentType:"application/json",body:JSON.stringify({error:"Fixture save failure"}) });
      const index = records.findIndex(r=>r.id===body.id); if(index<0) throw new Error("Non-fixture write");
      savedTags = body.patch.tags ?? []; records = records.map((r,i)=>i===index?{...r,...body.patch}:r);
      return json(records[index]);
    }
    if (action === "file" && record) {
      fileRequests.add(record.ext);
      const files = { ".svg":["image/svg+xml",'<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100"><rect width="200" height="100" fill="#3478f6"/></svg>'],
        ".html":["text/html",'<h1>HTML fixture</h1><script>window.top.__artifactTestXSS=true</script>'],
        ".wav":["audio/wav",wav], ".pdf":["application/pdf",Buffer.from(pdf)] };
      const [contentType,body] = files[record.ext] ?? ["application/octet-stream","fixture"];
      return route.fulfill({status:200,contentType,body});
    }
    return route.fulfill({status:409,contentType:"application/json",body:JSON.stringify({error:"Blocked non-fixture action"})});
  };
  const toolbar = () => page.locator(".ac-preview-tools");
  const close = () => toolbar().getByRole("button",{name:/^(关闭|Close)$/}).click();
  const open = ext => page.locator(`.ac-row .ac-fileinfo button[title="/ui-regression/fixture.${ext}"]`).click();
  try {
    await page.route(pattern,handler); await page.evaluate(key=>localStorage.removeItem(key),key);
    await page.setViewportSize({width:1400,height:1000}); await page.reload();
    await page.getByRole("button",{name:/^(产物中心|Artifact center)$/}).click();
    await page.getByRole("button",{name:/^(全选|Select all)$/}).click();
    await page.locator(".ac-row").first().waitFor({state:"visible"});
    check("single readable-formats section",await page.getByText(/^(可读取格式|Readable formats)$/).count()===1);
    await page.setViewportSize({width:1100,height:560});
    const nav=page.locator(".ac-nav");
    await nav.evaluate(el=>{el.querySelectorAll("details").forEach(d=>d.open=true);el.scrollTop=0;});
    await nav.hover(); await page.mouse.wheel(0,1800);
    await page.waitForFunction(()=>document.querySelector(".ac-nav")?.scrollTop>0);
    check("expanded sidebar scrolls with wheel",await nav.evaluate(el=>el.scrollHeight>el.clientHeight&&el.scrollTop>0));
    await nav.evaluate(el=>el.scrollTop=0); await nav.focus(); await page.keyboard.press("End");
    await page.waitForFunction(()=>document.querySelector(".ac-nav")?.scrollTop>0);
    check("sidebar supports keyboard scrolling",await nav.getAttribute("tabindex")==="0");
    await page.setViewportSize({width:1400,height:1000});
    await open("md"); await page.locator(".ac-rendered-document h1").waitFor({state:"visible"});
    await page.locator(".ac-rendered-document svg").waitFor({state:"visible"});
    check("Markdown and Mermaid render",await page.locator(".ac-rendered-document h1").innerText()==="Fixture heading");
    check("Markdown script inert",await page.evaluate(()=>window.__artifactTestXSS!==true));
    const area=await page.locator(".ac-previewbody").boundingBox(),shell=await page.locator(".ac-body").boundingBox();
    check("expanded preview uses content width",area.width/shell.width>0.85);
    check("metadata initially hidden",await page.locator(".ac-previewmeta").count()===0);
    await toolbar().getByRole("button",{name:/^(文件信息|File information)$/}).click();
    const note=page.locator(".ac-note-label textarea"); await note.fill("Unsaved note draft");
    await page.locator(".ac-file-menu > summary").click();
    check("more menu opens",await page.locator(".ac-file-menu").getAttribute("open")!==null);
    await page.locator(".ac-file-menu-items").getByRole("button",{name:/^(编辑标签|Edit tags)$/}).click();
    const dialog=page.locator(".ac-tag-dialog"),input=dialog.locator("#ac-tag-input");
    await input.fill("x".repeat(81)); await input.press("Enter");
    check("tag limit retains draft",(await input.inputValue()).length===81&&await dialog.getByRole("alert").isVisible());
    await input.fill("输入法"); await input.dispatchEvent("keydown",{key:"Enter",code:"Enter",isComposing:true});
    check("IME Enter does not submit",await input.inputValue()==="输入法"&&attempts===0);
    await input.fill("alpha, alpha"); await dialog.getByRole("button",{name:/^(保存标签|Save tags)$/}).click();
    await dialog.getByRole("alert").filter({hasText:"Fixture save failure"}).waitFor({state:"visible"});
    check("failed save retains input",await input.inputValue()==="alpha, alpha");
    await dialog.getByRole("button",{name:/^(保存标签|Save tags)$/}).click(); await dialog.waitFor({state:"hidden"});
    await page.waitForFunction(()=>[...document.querySelectorAll(".ac-info-tags")].some(n=>n.textContent.includes("alpha")));
    check("tags deduplicated on retry",savedTags.join(",")==="seed,alpha"&&attempts===2);
    check("tag save preserves unsaved note",await note.inputValue()==="Unsaved note draft");
    const toast=page.locator(".ac-toast");
    check("success feedback is floating toast",await toast.evaluate(el=>getComputedStyle(el).position==="absolute")&&await toast.getAttribute("role")==="status");
    await page.mouse.move(0,0); await toast.waitFor({state:"hidden",timeout:7000});
    check("success toast dismisses automatically",await toast.count()===0);
    await page.locator(".ac-file-menu > summary").click(); await page.keyboard.press("Escape");
    check("Escape closes menu and restores focus",await page.locator(".ac-file-menu").getAttribute("open")===null&&await page.locator(".ac-file-menu > summary").evaluate(el=>document.activeElement===el));
    await close(); await open("md");
    check("reopening preview preserves note draft",await note.inputValue()==="Unsaved note draft"&&await page.locator(".ac-draft-hint").isVisible());
    await toolbar().getByRole("button",{name:/^(收藏|Favorite)$/}).click();
    await toolbar().getByRole("button",{name:/^(取消收藏|Unfavorite)$/}).waitFor({state:"visible"});
    check("favorite updates pressed state",await toolbar().getByRole("button",{name:/^(取消收藏|Unfavorite)$/}).getAttribute("aria-pressed")==="true"&&records[0].starred===true);
    await toolbar().getByRole("button",{name:/^(取消收藏|Unfavorite)$/}).click();
    await toolbar().getByRole("button",{name:/^(收藏|Favorite)$/}).waitFor({state:"visible"});
    check("unfavorite preserves unsaved note",records[0].starred===false&&await note.inputValue()==="Unsaved note draft");
    const saveNote=page.locator(".ac-previewmeta").getByRole("button",{name:/^(保存|Save)$/});
    await saveNote.click(); await page.waitForFunction(()=>document.querySelector(".ac-previewmeta textarea")?.value==="Unsaved note draft"&&[...document.querySelectorAll(".ac-previewmeta button")].some(b=>/^(保存|Save)$/.test(b.textContent)&&b.disabled));
    check("note saves and becomes clean",records[0].note==="Unsaved note draft"&&await saveNote.isDisabled());
    const history=page.locator(".ac-timeline li");
    check("history is newest first",await history.count()===2&&(await history.first().innerText()).includes("Newest fixture conversation"));
    check("history navigation respects missing session",await history.first().getByRole("button").isDisabled()&&await history.last().getByRole("button").isEnabled());
    await toolbar().getByRole("button",{name:/^(分栏预览|Split preview)$/}).click();
    check("split restores list",await page.locator(".ac-main").isVisible());
    await toolbar().getByRole("button",{name:/^(展开预览|Expand preview)$/}).click();
    await toolbar().getByRole("button",{name:/^(文件信息|File information)$/}).click();
    await page.setViewportSize({width:760,height:900}); const narrow=await page.locator(".ac-previewbody").boundingBox();
    check("narrow preview fits",narrow.width>250&&narrow.x+narrow.width<=761);
    await page.setViewportSize({width:1400,height:1000}); await close();
    await page.locator(".ac-format-filter").getByRole("button",{name:/^(清空|Clear selection)$/}).click();
    await page.getByRole("checkbox",{name:/^(显示|Show) \.md$/}).check();
    await page.waitForFunction(()=>document.querySelectorAll(".ac-row").length===1);
    check("readable format selection filters list",await page.getByRole("button",{name:/^fixture\.md/}).count()===1);
    await page.reload(); await page.getByRole("button",{name:/^(产物中心|Artifact center)$/}).click();
    await page.getByRole("button",{name:/^fixture\.md/}).waitFor({state:"visible"});
    check("format selection survives reload",await page.locator(".ac-row").count()===1&&await page.getByRole("checkbox",{name:/^(显示|Show) \.md$/}).isChecked());
    await page.evaluate(()=>{
      window.__artifactDownloads=[];
      const create=URL.createObjectURL,click=HTMLAnchorElement.prototype.click;
      URL.createObjectURL=function(blob){
        if(["text/csv;charset=utf-8","text/markdown;charset=utf-8"].includes(blob.type))
          Promise.all([blob.text(),blob.arrayBuffer()]).then(([text,buffer])=>window.__artifactDownloads.push({text,mime:blob.type,bom:[...new Uint8Array(buffer).slice(0,3)]}));
        return create.call(URL,blob);
      };
      HTMLAnchorElement.prototype.click=function(){ if(!this.download) return click.call(this); };
    });
    const exporter=page.getByRole("combobox",{name:/^(导出清单|Export list)$/});
    await exporter.selectOption("csv"); await page.waitForFunction(()=>window.__artifactDownloads.length===1);
    const csvExport=await page.evaluate(()=>window.__artifactDownloads[0]);
    check("CSV export only includes visible rows",csvExport.text.split("\r\n").length===2&&csvExport.text.includes('"fixture.md"')&&!csvExport.text.includes("fixture.csv"));
    check("CSV export escapes quotes and includes UTF8 BOM",csvExport.text.includes('"UI regression, ""quoted"""')&&csvExport.bom.join(",")==="239,187,191");
    await exporter.selectOption("markdown"); await page.waitForFunction(()=>window.__artifactDownloads.length===2);
    const mdExport=await page.evaluate(()=>window.__artifactDownloads[1]);
    check("Markdown export only includes visible rows",mdExport.text.includes("[fixture.md](</ui-regression/fixture.md>)")&&!mdExport.text.includes("fixture.csv"));
    await page.locator(".ac-format-filter").getByRole("button",{name:/^(全选|Select all)$/}).click();
    await page.waitForFunction(()=>document.querySelectorAll(".ac-row").length===10);
    check("select all restores all configured formats",await page.locator(".ac-row").count()===10);
    await open("csv"); await page.locator(".ac-previewbody td").first().waitFor({state:"visible"});
    check("CSV quoting multiline cells",(await page.locator(".ac-previewbody td").allTextContents()).join("|")==='hello, world|line one\nline two|quote "inside"|42');
    await close(); await open("tsv"); await page.locator(".ac-previewbody td").first().waitFor({state:"visible"});
    check("TSV Unicode",(await page.locator(".ac-previewbody td").allTextContents()).join("|")==="中文|数据");
    await close(); await open("svg"); await page.waitForFunction(()=>document.querySelector(".ac-image-preview img")?.naturalWidth===200);
    check("image native size",await page.locator(".ac-image-preview img").evaluate(img=>img.naturalHeight===100));
    await close(); await open("html"); await page.frameLocator(".ac-previewbody iframe").getByRole("heading",{name:"HTML fixture"}).waitFor({state:"visible"});
    check("HTML sandbox",await page.locator(".ac-previewbody iframe").getAttribute("sandbox")==="");
    check("HTML script inert",await page.evaluate(()=>window.__artifactTestXSS!==true));
    await close(); await open("docx");
    check("Office native fallback",await page.getByText(/^(用其他应用打开此文件|Open this file in another application)$/).isVisible());
    await close(); await open("wav"); await page.waitForFunction(()=>document.querySelector(".ac-previewbody audio")?.readyState>=1);
    check("audio metadata loaded",await page.locator(".ac-previewbody audio").getAttribute("controls")!==null);
    await close(); const response=page.waitForResponse(r=>r.url().includes(`/artifact-center/file?id=${records.find(r=>r.ext===".pdf").id}`)&&r.status()===200);
    await open("pdf"); await response;
    check("PDF frame and response",await page.locator(".ac-previewbody iframe").getAttribute("title")==="fixture.pdf"&&fileRequests.has(".pdf"));
    await close(); await open("mmd"); await page.locator(".ac-rendered-document svg").waitFor({state:"visible"});
    check("standalone Mermaid",await page.locator(".ac-rendered-document svg").count()===1);
    await close(); await open("json"); await page.locator(".ac-rendered-code").waitFor({state:"visible"});
    check("code text preview",await page.locator(".ac-rendered-code").innerText()===texts[".json"]);
    await close(); textFailure = true; await open("json");
    await page.locator(".ac-previewbody").getByRole("alert").filter({hasText:"Fixture preview failure"}).waitFor({state:"visible"});
    check("preview read failure is visible",await page.locator(".ac-previewbody").getByRole("alert").count()===1);
    await close(); textFailure = false;
    records = records.map(r=>r.ext===".json"?{...r,size:20971521}:r);
    const oversizeResponse = page.waitForResponse(r=>r.url().includes("/artifact-center/api/list?")&&r.status()===200);
    await page.getByRole("combobox",{name:/^(时间倒序|Newest first)$/}).selectOption("name"); await oversizeResponse;
    await page.waitForFunction(()=>[...document.querySelectorAll(".ac-row")].some(row=>row.querySelector(".ac-fileinfo button")?.textContent==="fixture.json"&&row.textContent.includes("20.0 MB")));
    const beforeBoundary = textCalls;
    await open("json");
    await page.getByText(/^(此文件超过预览大小限制|This file exceeds the preview limit)/).waitFor({state:"visible"});
    check("oversize preview explains limit",textCalls===beforeBoundary);
    await close();
    records = records.map(r=>r.ext===".json"?{...r,size:200,missing:true}:r);
    const missingResponse = page.waitForResponse(r=>r.url().includes("/artifact-center/api/list?")&&r.status()===200);
    await page.getByRole("combobox",{name:/^(时间倒序|Newest first)$/}).selectOption("time"); await missingResponse;
    await page.waitForFunction(()=>document.querySelector('input[aria-label$=" fixture.json"]')?.disabled===true);
    await open("json");
    await page.getByText(/^(文件当前不可用|This file is unavailable)/).waitFor({state:"visible"});
    check("missing preview explains restore",await toolbar().getByRole("button",{name:/^(用默认程序打开|Open with default app)$/}).isDisabled());
    check("unavailable previews never read text",textCalls===beforeBoundary);
    await close();
    const base = {...records[0],versions:[]};
    records = Array.from({length:10000},(_,i)=>({...base,id:(i+100).toString(16).padStart(32,"0"),name:`performance-${String(i).padStart(5,"0")}.md`,path:`/ui-regression/performance-${i}.md`,relPath:`performance-${i}.md`}));
    const loadStart = Date.now();
    await page.getByRole("combobox",{name:/^(时间倒序|Newest first)$/}).selectOption("name");
    await page.waitForFunction(()=>document.querySelector(".ac-total")?.textContent.includes("10000"));
    const loadMs = Date.now()-loadStart;
    const virtualRows = await page.locator(".ac-row").count();
    check("10000 records stay virtualized",virtualRows>0&&virtualRows<50);
    await page.locator(".ac-scroll").evaluate(node=>node.scrollTop=node.scrollHeight);
    await page.getByRole("button",{name:"performance-09999.md",exact:true}).waitFor({state:"visible"});
    check("virtual list reaches last record",await page.getByRole("button",{name:"performance-09999.md",exact:true}).count()===1);
    return {fixtureOnly:true,metrics:{records:10000,virtualRows,loadMs},checks,passed:checks.filter(c=>c.ok).length,failed:checks.filter(c=>!c.ok).map(c=>c.name)};
  } finally {
    await page.unroute(pattern,handler); if(viewport) await page.setViewportSize(viewport);
    await page.evaluate(({key,value})=>value===null?localStorage.removeItem(key):localStorage.setItem(key,value),{key,value:preference});
    await page.reload();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const result=spawnSync(process.execPath,["scripts/p0-browser.mjs","run-code",browserRegression.toString()],{encoding:"utf8"});
  process.stdout.write(result.stdout??""); process.stderr.write(result.stderr??"");
  const match=(result.stdout??"").match(/### Result\n([^\n]+)/),report=match?JSON.parse(match[1]):null;
  process.exitCode=result.status||(!report||report.failed.length?1:0);
}
