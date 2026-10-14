window.__ModuleLoader__.load({
  id: "dsh-artifact-center",
  factory(require) {
    const React = require("react"),
      h = React.createElement,
      { useState, useEffect, useRef, useSyncExternalStore } = React;
    const en = {
      panel: "Artifact center",
      subtitle: "Files, with their conversation history.",
      search: "Find a file or conversation",
      content: "Search text content",
      refresh: "Refresh history",
      validate: "Check files",
      all: "All artifacts",
      recent: "Recent",
      today: "Today",
      week: "Past 7 days",
      month: "Past 30 days",
      workspaces: "Workspaces",
      types: "File types",
      tags: "Tags",
      starred: "Favorites",
      missing: "Missing files",
      trashed: "System trash",
      time: "Newest first",
      name: "Name",
      size: "Size",
      workspace: "Workspace",
      conversation: "Conversation",
      source: "Source",
      export: "Export list",
      csv: "CSV",
      markdown: "Markdown",
      empty: "No matching artifacts",
      emptyHint: "Clear filters, or refresh to index conversation history.",
      clear: "Clear filters",
      preview: "Preview",
      open: "Open with default app",
      otherApps: "Open with…",
      reveal: "Show in file manager",
      copy: "Copy path",
      copyLink: "Copy Markdown link",
      favorite: "Favorite",
      unfavorite: "Unfavorite",
      addTags: "Tags, separated by commas",
      save: "Save",
      note: "Note",
      versions: "History",
      versionsHint:
        "History records when this path was produced. Previous file contents are not stored.",
      noPreview: "Open this file in another application",
      noPreviewHint:
        "Office documents and binary files are opened in your own applications. Files are never converted.",
      tooLarge:
        "This file exceeds the preview limit. Open it in another application.",
      missingHint:
        "This file is unavailable. Restore it to its original path, then check files again.",
      trashHint:
        "Retrieve the file from your system trash, then check files to restore its index status.",
      trash: "Move to system trash",
      confirmTitle: "Move selected files to system trash?",
      confirmHint:
        "The file on disk will be moved, including all conversation references to the same path. You can retrieve it from your system trash.",
      cancel: "Cancel",
      confirm: "Move to trash",
      close: "Close",
      selected: "selected",
      items: "artifacts",
      indexing: "Indexing history",
      ready: "Ready",
      degraded: "Needs attention",
      starting: "Starting",
      processed: "sessions processed",
      persistent: "Index is saved locally",
      temporary: "Index persistence is unavailable",
      checkTime: "Last file check",
      cleanMissing: "Remove missing index entries",
      cleanTitle: "Remove missing entries from the index?",
      cleanHint:
        "Only index entries are removed. No files are changed. Trashed entries are retained.",
      batch: "Batch output",
      inferred: "Inferred from workspace changes",
      present: "Delivered",
      write: "Written",
      edit: "Edited",
      snapshot: "Detected",
      manual: "Added",
      doc: "Documents",
      sheet: "Spreadsheets",
      slide: "Presentations",
      image: "Images",
      web: "Web pages",
      data: "Data",
      code: "Code",
      media: "Audio & video",
      archive: "Archives",
      other: "Other",
      loading: "Loading…",
      copied: "Copied",
      saved: "Saved",
      done: "Completed",
      truncated: "Preview shows the first part of this file.",
      error: "Operation failed",
      zoom: "Image scale",
      rules: "Automatic tag rules",
      ruleName: "Tag name",
      ruleValue: "Pattern, extension, or conversation text",
      addRule: "Add rule",
      rulesHint:
        "Configured in cordis.patch.yml: autoTags. Rules apply when a file is indexed.",
      collapse: "Toggle categories",
      searchHint: "Text search reads a bounded prefix of text files.",
      countLimit: "Results are capped at the configured index limit.",
      readableFormats: "Readable formats",
      readableHint: "Choose supported extensions in cordis.patch.yml.",
    };
    const zh = {
      panel: "产物中心",
      subtitle: "从文件找回它的对话与交付记录。",
      search: "搜索文件或所属对话",
      content: "搜索文本内容",
      refresh: "刷新历史",
      validate: "校检文件",
      all: "全部产物",
      recent: "最近",
      today: "今天",
      week: "最近 7 天",
      month: "最近 30 天",
      workspaces: "按工作区",
      types: "按类型",
      tags: "按标签",
      starred: "收藏",
      missing: "失效文件",
      trashed: "系统回收站",
      time: "时间倒序",
      name: "名称",
      size: "大小",
      workspace: "工作区",
      conversation: "所属对话",
      source: "来源",
      export: "导出清单",
      csv: "CSV",
      markdown: "Markdown",
      empty: "没有匹配的产物",
      emptyHint: "清除筛选，或刷新历史以索引对话产物。",
      clear: "清除筛选",
      preview: "预览",
      open: "用默认程序打开",
      otherApps: "打开方式…",
      reveal: "在文件管理器中显示",
      copy: "复制路径",
      copyLink: "复制 Markdown 链接",
      favorite: "收藏",
      unfavorite: "取消收藏",
      addTags: "标签，用逗号分隔",
      save: "保存",
      note: "备注",
      versions: "产出历史",
      versionsHint: "历史记录该路径何时被产出，不保存旧版本的文件内容。",
      noPreview: "用其他应用打开此文件",
      noPreviewHint:
        "Office 文档与二进制文件交给本机应用打开，产物中心不转换文件格式。",
      tooLarge: "此文件超过预览大小限制，请用其他应用打开。",
      missingHint: "文件当前不可用。恢复至原路径后，再校检文件。",
      trashHint: "可从系统回收站取回文件，取回后重新校检即可恢复索引状态。",
      trash: "移入系统回收站",
      confirmTitle: "将选中文件移入系统回收站？",
      confirmHint:
        "磁盘上的文件会被移入回收站，同一路径的全部对话引用都会受影响。之后可从系统回收站取回。",
      cancel: "取消",
      confirm: "移入回收站",
      close: "关闭",
      selected: "项已选",
      items: "项产物",
      indexing: "正在回填历史",
      ready: "就绪",
      degraded: "需要检查",
      starting: "正在启动",
      processed: "个对话已处理",
      persistent: "索引已在本机保存",
      temporary: "索引持久化不可用",
      checkTime: "最后校检",
      cleanMissing: "清理失效索引",
      cleanTitle: "从索引移除失效条目？",
      cleanHint: "仅清理索引，不修改磁盘文件，已移入回收站的条目会保留。",
      batch: "批量产出",
      inferred: "从工作区文件变化推断",
      present: "显式交付",
      write: "写入",
      edit: "编辑",
      snapshot: "快照推断",
      manual: "手动添加",
      doc: "文档",
      sheet: "表格",
      slide: "演示",
      image: "图片",
      web: "网页",
      data: "数据",
      code: "代码",
      media: "音视频",
      archive: "压缩包",
      other: "其他",
      loading: "正在加载…",
      copied: "已复制",
      saved: "已保存",
      done: "已完成",
      truncated: "预览仅显示文件的前半部分。",
      error: "操作失败",
      zoom: "图片缩放",
      rules: "自动标签规则",
      ruleName: "标签名",
      ruleValue: "目录模式、扩展名或对话关键词",
      addRule: "添加规则",
      rulesHint: "在 cordis.patch.yml 的 autoTags 中配置，文件入库时自动应用。",
      collapse: "展开或收起分类",
      searchHint: "内容检索只读取文本文件的有限长度。",
      countLimit: "结果数量受配置的索引上限限制。",
      readableFormats: "可读取格式",
      readableHint: "可在 cordis.patch.yml 中从支持的扩展名里选择。",
    };
    const css = `
.ac-nav{background:color-mix(in srgb,var(--dsw-alias-bg-layer-2) 38%,transparent);padding:14px 10px 18px}.ac-nav>button:first-child{margin-bottom:4px}.ac-nav details{margin:8px 0 0;border-top:1px solid color-mix(in srgb,var(--dsw-alias-border-l2) 65%,transparent);padding-top:5px}.ac-nav summary{font-size:10px;letter-spacing:.08em;text-transform:uppercase}.ac-nav details button{padding:7px 9px;border-radius:7px}.ac-nav details button:hover{background:color-mix(in srgb,var(--dsw-alias-interactive-bg-hover) 72%,transparent)}.ac-nav .ac-active{box-shadow:inset 3px 0 var(--dsw-alias-brand-primary);background:color-mix(in srgb,var(--dsw-alias-brand-primary) 10%,transparent)}.ac-source-badge{font-size:10px!important;line-height:16px!important;padding:0 5px!important;border-radius:4px!important;white-space:nowrap}.ac-format-list{display:flex;flex-wrap:wrap;gap:4px;padding:6px 8px 9px}.ac-format-list code{font-size:10px;color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l2);border-radius:4px;padding:2px 5px}.ac-format-hint{padding:0 8px 8px;color:var(--dsw-alias-label-secondary);font-size:10px;line-height:1.4}
.ac-root{height:100%;min-height:0;display:flex;flex-direction:column;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font-family:inherit;font-size:13px;overflow:hidden}
.ac-root *{box-sizing:border-box}.ac-root button,.ac-root input,.ac-root select,.ac-root textarea{font:inherit;color:inherit}.ac-root button,.ac-root select{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);border-radius:6px;padding:7px 10px;cursor:pointer}.ac-root button:hover{background:var(--dsw-alias-interactive-bg-hover)}.ac-root button:disabled{opacity:.45;cursor:default}.ac-root :focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px}.ac-root .ac-primary{background:var(--dsw-alias-brand-primary);color:var(--dsw-alias-bg-layer-1);border-color:var(--dsw-alias-brand-primary)}
.ac-head{padding:22px 24px 16px;border-bottom:1px solid var(--dsw-alias-border-l2)}.ac-heading{display:flex;align-items:center;gap:12px;margin-bottom:18px}.ac-heading h1{font-size:23px;letter-spacing:-.6px;font-weight:650;margin:0}.ac-subtitle{color:var(--dsw-alias-label-secondary);font-size:12px;margin-top:4px}.ac-heading .ac-status{margin-left:auto}.ac-status{display:flex;align-items:center;gap:6px;color:var(--dsw-alias-label-secondary);font-size:12px}.ac-dot{width:7px;height:7px;border-radius:50%;background:var(--dsw-alias-brand-primary)}.ac-toolbar{display:flex;align-items:center;gap:10px;flex-wrap:wrap}.ac-search{flex:1;min-width:160px;max-width:560px;position:relative}.ac-search input{width:100%;padding:10px 12px 10px 34px;border:1px solid var(--dsw-alias-border-l2);border-radius:7px;background:var(--dsw-alias-bg-layer-2)}.ac-search svg{position:absolute;left:11px;top:12px}.ac-toggle{display:flex;align-items:center;gap:6px;white-space:nowrap}.ac-toggle input{accent-color:var(--dsw-alias-brand-primary)}.ac-body{flex:1;min-height:0;display:flex}.ac-nav{width:210px;flex-shrink:0;overflow:auto;padding:12px;border-right:1px solid var(--dsw-alias-border-l2)}.ac-nav button{border:0;background:none;display:flex;align-items:center;width:100%;text-align:left;padding:9px;gap:8px}.ac-nav .ac-active{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-brand-primary);font-weight:600}.ac-nav .ac-count{margin-left:auto;font-size:11px;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums}.ac-nav details{margin-top:8px}.ac-nav summary{cursor:pointer;color:var(--dsw-alias-label-secondary);font-size:11px;font-weight:600;padding:10px 8px;list-style-position:inside}.ac-main{flex:1;min-width:0;display:flex;flex-direction:column}.ac-listbar{display:flex;gap:8px;align-items:center;padding:12px 18px;border-bottom:1px solid var(--dsw-alias-border-l2)}.ac-listbar .ac-total{margin-right:auto;color:var(--dsw-alias-label-secondary)}.ac-scroll{flex:1;overflow:auto;min-height:140px;position:relative}.ac-columns,.ac-row{display:grid;grid-template-columns:28px minmax(180px,2.2fr) minmax(105px,1fr) minmax(130px,1.2fr) 82px 94px;gap:10px;align-items:center;padding:0 18px}.ac-columns{height:34px;color:var(--dsw-alias-label-secondary);font-size:11px;background:var(--dsw-alias-bg-layer-2);border-bottom:1px solid var(--dsw-alias-border-l2);position:sticky;top:0;z-index:1;min-width:720px}.ac-row{height:68px;border-bottom:1px solid var(--dsw-alias-border-l1);min-width:720px}.ac-row:hover,.ac-row.ac-selected{background:var(--dsw-alias-interactive-bg-hover)}.ac-root .ac-link{background:none;border:0;padding:0;text-align:left;color:inherit;min-width:0;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.ac-file{display:flex;gap:10px;align-items:center;min-width:0}.ac-fileinfo{min-width:0;flex:1}.ac-fileinfo .ac-link{font-weight:600;width:100%;font-size:13px}.ac-path{color:var(--dsw-alias-label-secondary);font-family:ui-monospace,monospace;font-size:10px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-top:5px}.ac-glyph{width:30px;height:34px;border:1px solid var(--dsw-alias-border-l3);border-radius:4px;display:flex;align-items:center;justify-content:center;flex-shrink:0;color:var(--dsw-alias-brand-primary);font-size:9px;font-weight:700;text-transform:uppercase}.ac-meta{color:var(--dsw-alias-label-secondary);font-size:11px;overflow:hidden}.ac-badge{display:inline-flex;border:1px solid var(--dsw-alias-border-l2);border-radius:4px;padding:2px 5px;font-size:10px;margin:2px 3px 0 0;max-width:90px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.ac-version{color:var(--dsw-alias-brand-primary);font-size:10px;margin-left:5px}.ac-empty{padding:70px 24px;text-align:center;color:var(--dsw-alias-label-secondary)}.ac-empty h2{color:var(--dsw-alias-label-primary);font-size:17px}.ac-footer{padding:8px 18px;border-top:1px solid var(--dsw-alias-border-l2);font-size:11px;color:var(--dsw-alias-label-secondary);display:flex;gap:12px;flex-wrap:wrap}.ac-notice{padding:10px 18px;background:var(--dsw-alias-bg-layer-3);border-bottom:1px solid var(--dsw-alias-border-l2);display:flex;gap:10px;align-items:center}.ac-notice span{flex:1;white-space:pre-wrap}.ac-preview{width:42%;min-width:320px;max-width:700px;border-left:1px solid var(--dsw-alias-border-l2);display:flex;flex-direction:column;background:var(--dsw-alias-bg-layer-2);overflow:auto}.ac-previewhead{padding:16px;border-bottom:1px solid var(--dsw-alias-border-l2)}.ac-previewhead h2{font-size:15px;margin:0 0 8px;overflow-wrap:anywhere}.ac-actions{display:flex;gap:6px;flex-wrap:wrap;margin-top:12px}.ac-actions button{font-size:11px;padding:5px 7px}.ac-previewbody{padding:16px;overflow:auto;flex:1;min-height:240px}.ac-previewbody img{max-width:100%;height:auto;display:block;margin:auto}.ac-previewbody iframe{width:100%;height:440px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1)}.ac-previewbody audio,.ac-previewbody video{width:100%}.ac-previewbody pre{white-space:pre-wrap;overflow-wrap:anywhere;font:12px/1.65 ui-monospace,monospace;margin:0}.ac-previewbody table{border-collapse:collapse;font-size:12px}.ac-previewbody td,.ac-previewbody th{border:1px solid var(--dsw-alias-border-l2);padding:6px 8px}.ac-previewbody blockquote{border-left:3px solid var(--dsw-alias-brand-primary);padding-left:12px;color:var(--dsw-alias-label-secondary)}.ac-previewbody a{color:var(--dsw-alias-brand-primary)}.ac-previewbody svg{max-width:100%;height:auto}.ac-keyword{color:var(--dsw-alias-brand-primary);font-weight:600}.ac-previewmeta{padding:16px;border-top:1px solid var(--dsw-alias-border-l2)}.ac-previewmeta input,.ac-previewmeta textarea{width:100%;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);padding:8px;border-radius:5px;margin:5px 0 8px}.ac-previewmeta textarea{resize:vertical;min-height:60px}.ac-timeline{list-style:none;padding:0;margin:12px 0}.ac-timeline li{border-left:2px solid var(--dsw-alias-border-l3);padding:0 0 12px 12px;font-size:11px;line-height:1.6}.ac-timeline .ac-link{color:var(--dsw-alias-brand-primary)}.ac-muted{color:var(--dsw-alias-label-secondary);font-size:11px;line-height:1.6}.ac-dialog{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l3);border-radius:10px;max-width:620px;width:calc(100% - 40px);padding:24px;max-height:80vh;overflow:auto}.ac-dialog::backdrop{background:var(--dsw-alias-bg-mask)}.ac-dialog h2{font-size:18px;margin:0 0 12px}.ac-dialog ul{padding:0;list-style:none}.ac-dialog li{padding:10px 0;border-bottom:1px solid var(--dsw-alias-border-l2);overflow-wrap:anywhere}.ac-dialog .ac-actions{justify-content:flex-end}.ac-progress{height:3px;background:var(--dsw-alias-border-l2)}.ac-progress div{height:100%;background:var(--dsw-alias-brand-primary);transition:width .2s}
@media(max-width:1100px){.ac-preview{width:46%;min-width:290px}.ac-nav{width:170px}.ac-head{padding:16px}.ac-heading h1{font-size:20px}}@media(max-width:760px){.ac-nav{width:150px}.ac-preview{position:absolute;inset:0;width:100%;max-width:none;z-index:5}.ac-body{position:relative}.ac-subtitle{display:none}.ac-heading{margin-bottom:12px}.ac-toolbar{gap:7px}.ac-heading .ac-status{font-size:10px}.ac-head{padding:12px}.ac-nav button{font-size:12px}}@media(prefers-reduced-motion:reduce){.ac-progress div{transition:none}}
`;
    function Icon({ kind = "folder", size = 18 }) {
      const paths = {
        folder: "M3 7h6l2 2h10v11H3z M3 7V4h6l2 3",
        search: "M15 15l5 5 M17 10a7 7 0 1 1-14 0a7 7 0 0 1 14 0",
        star: "m12 3 3 6 6 1-4.5 4.5 1 6.5-5.5-3-5.5 3 1-6.5L3 10l6-1z",
        clock: "M12 7v5l3 2 M21 12a9 9 0 1 1-18 0a9 9 0 0 1 18 0",
        file: "M6 3h8l4 4v14H6z M14 3v5h4 M9 12h6 M9 16h6",
      };
      return h(
        "svg",
        {
          width: size,
          height: size,
          viewBox: "0 0 24 24",
          fill: "none",
          stroke: "currentColor",
          strokeWidth: 1.5,
          "aria-hidden": true,
        },
        h("path", { d: paths[kind] ?? paths.file }),
      );
    }
    async function api(action, data, signal) {
      const res = await fetch(`/artifact-center/api/${action}`, {
        credentials: "same-origin",
        signal,
        ...(data !== undefined
          ? {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify(data),
            }
          : {}),
      });
      const value = await res.json();
      if (!res.ok) throw new Error(value.error ?? `${res.status}`);
      return value;
    }
    const renderers = new Map();
    function loadRenderer(name) {
      if (renderers.has(name)) return renderers.get(name);
      const p = new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = `/artifact-center/vendor/${name}.min.js`;
        script.onload = () => resolve();
        script.onerror = () => {
          renderers.delete(name);
          script.remove();
          reject(new Error("Could not load preview renderer"));
        };
        document.head.appendChild(script);
      });
      renderers.set(name, p);
      return p;
    }
    function bytes(n) {
      if (n === undefined) return "—";
      if (n < 1024) return `${n} B`;
      if (n < 1048576) return `${(n / 1024).toFixed(1)} KB`;
      return `${(n / 1048576).toFixed(1)} MB`;
    }
    function csvRows(text, sep = ",") {
      const rows = [];
      let row = [],
        cell = "",
        quoted = false;
      for (let i = 0; i < text.length; i++) {
        const c = text[i];
        if (c === '"') {
          if (quoted && text[i + 1] === '"') {
            cell += '"';
            i++;
          } else quoted = !quoted;
        } else if (!quoted && c === sep) {
          row.push(cell);
          cell = "";
        } else if (!quoted && (c === "\n" || c === "\r")) {
          if (c === "\r" && text[i + 1] === "\n") i++;
          row.push(cell);
          rows.push(row);
          row = [];
          cell = "";
          if (rows.length >= 500) break;
        } else cell += c;
      }
      if (cell || row.length) {
        row.push(cell);
        rows.push(row);
      }
      return rows;
    }
    function highlighted(text) {
      return text
        .split(
          /(\b(?:const|let|var|function|return|import|export|class|if|else|async|await|true|false|null|def|from|for|while)\b)/g,
        )
        .map((s, i) =>
          h("span", { key: i, className: i % 2 ? "ac-keyword" : undefined }, s),
        );
    }
    function PreviewContent({ record: r, t, config }) {
      const [text, setText] = useState(null),
        [error, setError] = useState(""),
        [markup, setMarkup] = useState(""),
        [truncated, setTruncated] = useState(false),
        [scale, setScale] = useState(100);
      const diagram = useRef(null);
      const url = `/artifact-center/file?id=${encodeURIComponent(r.id)}`;
      useEffect(() => {
        setText(null);
        setMarkup("");
        setError("");
        setTruncated(false);
        setScale(100);
        const ctl = new AbortController();
        if (
          !r.missing &&
          !r.burst &&
          (r.size ?? 0) <= config.previewMaxBytes &&
          (["code", "data"].includes(r.kind) ||
            (["doc"].includes(r.kind) && [".md", ".txt"].includes(r.ext)))
        )
          api(`text?id=${encodeURIComponent(r.id)}`, undefined, ctl.signal)
            .then(async (v) => {
              if (ctl.signal.aborted) return;
              setText(v.text);
              setTruncated(v.truncated);
              if (r.ext === ".md") {
                await Promise.all([
                  loadRenderer("markdown-it"),
                  loadRenderer("purify"),
                ]);
                if (!ctl.signal.aborted)
                  setMarkup(
                    window.DOMPurify.sanitize(
                      window
                        .markdownit({ html: false, linkify: true })
                        .render(v.text),
                      { FORBID_TAGS: ["img", "iframe", "style", "script"] },
                    ),
                  );
              }
            })
            .catch((e) => {
              if (e.name !== "AbortError") setError(e.message);
            });
        return () => ctl.abort();
      }, [r.id, r.mtime, r.missing, config.previewMaxBytes]);
      useEffect(() => {
        if (text === null || (!markup && r.ext !== ".mmd")) return;
        let alive = true;
        (async () => {
          const nodes =
            r.ext === ".mmd"
              ? [diagram.current]
              : [
                  ...(diagram.current?.querySelectorAll(
                    "pre > code.language-mermaid",
                  ) ?? []),
                ];
          if (!nodes.length) return;
          await Promise.all([loadRenderer("mermaid"), loadRenderer("purify")]);
          window.mermaid.initialize({
            startOnLoad: false,
            securityLevel: "strict",
            theme: "neutral",
          });
          for (const [i, node] of nodes.entries()) {
            const code = r.ext === ".mmd" ? text : node.textContent;
            const rendered = await window.mermaid.render(
              `acdiagram${Date.now()}_${i}`,
              code,
            );
            if (alive && node) {
              const sanitized = window.DOMPurify.sanitize(rendered.svg, {
                USE_PROFILES: { svg: true, svgFilters: true },
                FORBID_TAGS: ["foreignObject"],
              });
              if (r.ext === ".mmd") node.innerHTML = sanitized;
              else node.parentElement.innerHTML = sanitized;
            }
          }
        })().catch((e) => {
          if (alive) setError(e.message);
        });
        return () => {
          alive = false;
        };
      }, [text, markup, r.ext]);
      if (r.burst)
        return h(
          "div",
          null,
          h("h3", null, t("batch")),
          h("p", null, `${r.count} ${t("items")}`),
          ...Object.entries(r.distributions ?? {}).map(([k, v]) =>
            h("p", { key: k, className: "ac-muted" }, `${k} · ${v}`),
          ),
        );
      if (r.missing)
        return h(
          "p",
          { className: "ac-muted" },
          t(r.trashed ? "trashHint" : "missingHint"),
        );
      if ((r.size ?? 0) > config.previewMaxBytes && r.kind !== "media")
        return h("p", null, t("tooLarge"));
      if (error) return h("p", { role: "alert" }, error);
      let child;
      if (r.kind === "image")
        child = h(
          "div",
          null,
          h(
            "label",
            { className: "ac-muted" },
            t("zoom"),
            h("input", {
              type: "range",
              min: 25,
              max: 200,
              value: scale,
              onChange: (e) => setScale(Number(e.target.value)),
            }),
          ),
          h("img", {
            src: url,
            alt: r.name,
            style: { width: `${scale}%`, maxWidth: "none" },
            onError: () => setError(t("error")),
          }),
        );
      else if (r.ext === ".pdf")
        child = h("iframe", { src: url, title: r.name });
      else if (r.kind === "web")
        child = h("iframe", {
          src: url,
          title: r.name,
          sandbox: "",
          referrerPolicy: "no-referrer",
        });
      else if (r.kind === "media")
        child = h(
          [".mp4", ".webm", ".mov"].includes(r.ext) ? "video" : "audio",
          { src: url, controls: true, preload: "metadata" },
        );
      else if (r.ext === ".md")
        child = markup
          ? h("div", {
              ref: diagram,
              dangerouslySetInnerHTML: { __html: markup },
            })
          : h("p", null, t("loading"));
      else if (r.ext === ".mmd")
        child = h("div", { ref: diagram }, text === null ? t("loading") : text);
      else if ([".csv", ".tsv"].includes(r.ext))
        child =
          text === null
            ? h("p", null, t("loading"))
            : h(
                "table",
                null,
                h(
                  "tbody",
                  null,
                  ...csvRows(text, r.ext === ".tsv" ? "\t" : ",").map(
                    (row, i) =>
                      h(
                        "tr",
                        { key: i },
                        ...row.map((v, j) =>
                          h(i === 0 ? "th" : "td", { key: j }, v),
                        ),
                      ),
                  ),
                ),
              );
      else if (text !== null) child = h("pre", null, highlighted(text));
      else if (["code", "data"].includes(r.kind) || r.ext === ".txt")
        child = h("p", null, t("loading"));
      else
        child = h(
          "div",
          null,
          h(Icon, { kind: "file", size: 40 }),
          h("h3", null, t("noPreview")),
          h("p", { className: "ac-muted" }, t("noPreviewHint")),
        );
      return h(
        React.Fragment,
        null,
        child,
        truncated && h("p", { className: "ac-muted" }, t("truncated")),
      );
    }
    function ConfirmDialog({ modal, t, busy, onCancel, onConfirm }) {
      const ref = useRef();
      useEffect(() => {
        ref.current?.showModal();
      }, []);
      return h(
        "dialog",
        {
          ref,
          className: "ac-dialog",
          "aria-labelledby": "ac-confirm-title",
          onCancel: (e) => {
            e.preventDefault();
            if (!busy) onCancel();
          },
        },
        h(
          "h2",
          { id: "ac-confirm-title" },
          t(modal.kind === "clean" ? "cleanTitle" : "confirmTitle"),
        ),
        h(
          "p",
          { className: "ac-muted" },
          t(modal.kind === "clean" ? "cleanHint" : "confirmHint"),
        ),
        h(
          "ul",
          null,
          ...modal.records.map((r) =>
            h(
              "li",
              { key: r.id },
              h("strong", null, r.name),
              h(
                "div",
                { className: "ac-path", style: { whiteSpace: "normal" } },
                r.path,
              ),
              h(
                "div",
                { className: "ac-muted" },
                `${bytes(r.size)} · ${r.sessionTitle ?? "—"} · ×${r.versions?.length ?? 1}`,
              ),
            ),
          ),
        ),
        h(
          "div",
          { className: "ac-actions" },
          h(
            "button",
            { autoFocus: true, disabled: busy, onClick: onCancel },
            t("cancel"),
          ),
          h(
            "button",
            { className: "ac-primary", disabled: busy, onClick: onConfirm },
            busy
              ? t("loading")
              : t(modal.kind === "clean" ? "cleanMissing" : "confirm"),
          ),
        ),
      );
    }
    function InlineTags({record,t,onSave}) {
      const [editing,setEditing]=useState(false),[value,setValue]=useState('');
      if(!editing)return h('button',{className:'ac-badge',title:t('addTags'),'aria-label':`${t('tags')} ${record.name}`,onClick:()=>{setValue((record.tags??[]).join(', '));setEditing(true);}},'+');
      const save=async()=>{await onSave({id:record.id,patch:{tags:value.split(/[,，]/).map(v=>v.trim()).filter(Boolean)}});setEditing(false);};
      return h('span',null,h('input',{value,autoFocus:true,'aria-label':t('addTags'),style:{width:120,maxWidth:'70%',border:'1px solid var(--dsw-alias-border-l2)',background:'var(--dsw-alias-bg-layer-1)',padding:'2px 4px'},onChange:e=>setValue(e.target.value),onKeyDown:e=>{if(e.key==='Enter'){e.preventDefault();save();}if(e.key==='Escape')setEditing(false);}}),h('button',{className:'ac-badge',onClick:save},t('save')));
    }
    function createPage(ctx) {
      return function ArtifactPage() {
        const locale = useSyncExternalStore(
          (listener) => ctx.locale.subscribe(listener),
          () => ctx.locale.getSnapshot(),
        );
        const t = ctx.locale.bind("artifact-center");
        const language = locale.active === "zh" ? "zh-CN" : "en-US";
        const [status, setStatus] = useState({
            phase: "starting",
            workspaces: [],
            config: { previewMaxBytes: 20971520 },
          }),
          [rows, setRows] = useState([]),
          [total, setTotal] = useState(0),
          [query, setQuery] = useState(""),
          [content, setContent] = useState(false),
          [filter, setFilter] = useState({}),
          [sort, setSort] = useState("time"),
          [loading, setLoading] = useState(true),
          [notice, setNotice] = useState(""),
          [selected, setSelected] = useState(new Set()),
          [preview, setPreview] = useState(null),
          [scroll, setScroll] = useState(0),
          [height, setHeight] = useState(500),
          [collapsed, setCollapsed] = useState(false),
          [modal, setModal] = useState(null),
          [busy, setBusy] = useState(false),
          [apps, setApps] = useState(null),
          [tags, setTags] = useState(""),
          [note, setNote] = useState(""),
          [revision, setRevision] = useState(0);
        const listRef = useRef(),
          lastCount = useRef(-1);
        useEffect(() => {
          const ctl = new AbortController();
          const update = () =>
            api("status", undefined, ctl.signal)
              .then((s) => {
                setStatus(s);
                const stamp=`${s.count}:${s.recordRevision??0}:${s.phase}:${s.lastValidatedAt??''}`;
                if (lastCount.current !== stamp) {
                  lastCount.current = stamp;
                  setRevision((v) => v + 1);
                }
              })
              .catch((e) => {
                if (e.name !== "AbortError") setNotice(e.message);
              });
          update();
          const timer = setInterval(update, 3000);
          return () => {
            ctl.abort();
            clearInterval(timer);
          };
        }, []);
        useEffect(() => {
          const ctl = new AbortController();
          const timer = setTimeout(() => {
            setLoading(true);
            const params = new URLSearchParams({
              query,
              content: String(content),
              sort,
              limit: "50000",
            });
            for (const [k, v] of Object.entries(filter))
              if (Array.isArray(v)) v.forEach((x) => params.append(k, x));
              else params.set(k, String(v));
            api(`list?${params}`, undefined, ctl.signal)
              .then((v) => {
                setRows(v.records);
                setTotal(v.total);
                setLoading(false);
              })
              .catch((e) => {
                if (e.name !== "AbortError") {
                  setNotice(e.message);
                  setLoading(false);
                }
              });
          }, 180);
          return () => {
            clearTimeout(timer);
            ctl.abort();
          };
        }, [query, content, filter, sort, revision]);
        useEffect(() => {
          setScroll(0);
          if (listRef.current) listRef.current.scrollTop = 0;
        }, [query, filter, sort]);
        useEffect(() => {
          const el = listRef.current;
          if (!el) return;
          const obs = new ResizeObserver(() => setHeight(el.clientHeight));
          obs.observe(el);
          return () => obs.disconnect();
        }, []);
        const current = preview
          ? (rows.find((r) => r.id === preview.id) ?? preview)
          : null;
        useEffect(() => {
          setTags(current?.tags?.join(", ") ?? "");
          setNote(current?.note ?? "");
          setApps(null);
        }, [current?.id, current?.tags?.join(","), current?.note]);
        const refresh = () => setRevision((v) => v + 1);
        const act = async (action, data) => {
          setBusy(true);
          try {
            const value = await api(action, data);
            setNotice(t("done"));
            refresh();
            return value;
          } catch (e) {
            setNotice(e.message);
            return null;
          } finally {
            setBusy(false);
          }
        };
        const copy = async (text) => {
          try {
            await navigator.clipboard.writeText(text);
            setNotice(t("copied"));
          } catch (e) {
            setNotice(e.message);
          }
        };
        const choose = (f) => {
          if(f.tag&&!Array.isArray(f.tag))f={...f,tag:[f.tag]};
          setFilter(f);
          setSelected(new Set());
        };
        const matches = (f) => JSON.stringify(filter) === JSON.stringify(f);
        const nav = (label, f, count, icon) =>
          h(
            "button",
            {
              key: label,
              className: matches(f) ? "ac-active" : undefined,
              onClick: () => choose(f),
              "aria-pressed": matches(f),
            },
            icon && h(Icon, { kind: icon, size: 15 }),
            h("span", null, label),
            count !== undefined && h("span", { className: "ac-count" }, count),
          );
        const typeCounts = status.counts?.types ?? {};
        const allTags = Object.keys(status.counts?.tags ?? {}).sort();
        const date = (n) => {
          const d = new Date();
          if (n === 0) d.setHours(0, 0, 0, 0);
          else d.setDate(d.getDate() - n);
          return d.toISOString();
        };
        const openSession = (id) => {
          try {
            const workspace = ctx.get("uiWorkspace");
            if (!workspace)
              throw new Error("Conversation navigation unavailable");
            workspace.openSession(id);
          } catch (e) {
            setNotice(e.message);
          }
        };
        const exportList = (format) => {
          const field = (v) => `"${String(v ?? "").replaceAll('"', '""')}"`;
          const text =
            format === "csv"
              ? "\uFEFF" +
                [
                  "name,path,workspace,conversation,time,size",
                  ...rows.map((r) =>
                    [
                      r.name,
                      r.path,
                      r.workspaceTitle,
                      r.sessionTitle,
                      new Date(r.lastSeenAt).toISOString(),
                      r.size,
                    ]
                      .map(field)
                      .join(","),
                  ),
                ].join("\r\n")
              : `# ${t("panel")}\n\n` +
                rows
                  .map(
                    (r) =>
                      `- [${r.name.replaceAll("[", "\\[").replaceAll("]", "\\]")}](<${r.path.replaceAll(">", "%3E")}>) — ${r.workspaceTitle} · ${r.sessionTitle ?? "—"} · ${new Date(r.lastSeenAt).toISOString()} · ${bytes(r.size)}`,
                  )
                  .join("\n");
          const url = URL.createObjectURL(
            new Blob([text], {
              type:
                format === "csv"
                  ? "text/csv;charset=utf-8"
                  : "text/markdown;charset=utf-8",
            }),
          );
          const a = document.createElement("a");
          a.href = url;
          a.download = `artifacts.${format === "csv" ? "csv" : "md"}`;
          a.click();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        };
        const start = Math.max(0, Math.floor(scroll / 68) - 4),
          end = Math.min(rows.length, start + Math.ceil(height / 68) + 9),
          visible = rows.slice(start, end);
        const toggle = (id) =>
          setSelected((old) => {
            const next = new Set(old);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
          });
        const confirm = async () => {
          const m = modal;
          if (m.kind === "clean") await act("clean-missing", { confirm: true });
          else {
            const value = await act("trash", {
              ids: m.records.map((r) => r.id),
              confirm: true,
            });
            if (value) {
              setNotice(
                value.results
                  .filter((r) => !r.ok)
                  .map((r) => r.error)
                  .join("\n") || t("trashHint"),
              );
              setSelected(new Set());
            }
          }
          setModal(null);
        };
        const formatTime = (v) =>
          new Date(v).toLocaleString(language, {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          });
        return h(
          "section",
          { className: "ac-root", "aria-label": t("panel") },
          h(
            "header",
            { className: "ac-head" },
            h(
              "div",
              { className: "ac-heading" },
              h(Icon, { kind: "folder", size: 27 }),
              h(
                "div",
                null,
                h("h1", null, t("panel")),
                h("div", { className: "ac-subtitle" }, t("subtitle")),
              ),
              h(
                "div",
                { className: "ac-status", title: status.errors?.join("\n") },
                h("span", { className: "ac-dot" }),
                t(status.phase === "backfill" ? "indexing" : status.phase),
              ),
            ),
            h(
              "div",
              { className: "ac-toolbar" },
              h(
                "button",
                {
                  "aria-label": t("collapse"),
                  onClick: () => setCollapsed((v) => !v),
                },
                "☰",
              ),
              h(
                "label",
                { className: "ac-search" },
                h(Icon, { kind: "search", size: 16 }),
                h("input", {
                  type: "search",
                  value: query,
                  placeholder: t("search"),
                  "aria-label": t("search"),
                  onChange: (e) => setQuery(e.target.value),
                }),
              ),
              h(
                "label",
                { className: "ac-toggle", title: t("searchHint") },
                h("input", {
                  type: "checkbox",
                  role: "switch",
                  "aria-checked": content,
                  checked: content,
                  onChange: (e) => setContent(e.target.checked),
                }),
                t("content"),
              ),
              h(
                "button",
                {
                  disabled: busy || status.phase === "backfill",
                  onClick: () => act("refresh", {}),
                },
                t("refresh"),
              ),
              h(
                "button",
                { disabled: busy, onClick: () => act("validate", {}) },
                t("validate"),
              ),
            ),
          ),
          status.phase === "backfill" &&
            h(
              "div",
              {
                className: "ac-progress",
                role: "progressbar",
                "aria-valuemin": 0,
                "aria-valuemax": status.total,
                "aria-valuenow": status.processed,
                "aria-label": t("indexing"),
              },
              h("div", {
                style: {
                  width: `${status.total ? (status.processed / status.total) * 100 : 0}%`,
                },
              }),
            ),
          notice &&
            h(
              "div",
              { className: "ac-notice", role: "status" },
              h("span", null, notice),
              h(
                "button",
                { "aria-label": t("close"), onClick: () => setNotice("") },
                "×",
              ),
            ),
          h(
            "div",
            { className: "ac-body" },
            !collapsed &&
              h(
                "nav",
                { className: "ac-nav", "aria-label": t("panel") },
                nav(t("all"), {}, status.count, "folder"),
                nav(t("starred"), { starred: true }, undefined, "star"),
                h(
                  "details",
                  { open: true },
                  h("summary", null, t("recent")),
                  nav(t("today"), { since: date(0) }, undefined, "clock"),
                  nav(t("week"), { since: date(7) }),
                  nav(t("month"), { since: date(30) }),
                ),
                h(
                  "details",
                  { open: true },
                  h("summary", null, t("workspaces")),
                  ...status.workspaces.map((w) =>
                    nav(w.title, { workspace: w.id }, status.counts?.workspaces[w.id] ?? 0),
                  ),
                ),
                h(
                  "details",
                  { open: true },
                  h("summary", null, t("types")),
                  ...Object.keys(en)
                    .filter((k) =>
                      [
                        "doc",
                        "sheet",
                        "slide",
                        "image",
                        "web",
                        "data",
                        "code",
                        "media",
                        "archive",
                        "other",
                      ].includes(k),
                    )
                    .map((k) => nav(t(k), { type: k }, typeCounts[k] ?? 0)),
                ),
                h(
                  "details",
                  null,
                  h("summary", null, t("tags")),
                  ...allTags.map((tag) =>
                    h(
                      "label",
                      {
                        key: tag,
                        className: "ac-toggle",
                        style: { padding: "7px" },
                      },
                      h("input", {
                        type: "checkbox",
                        checked:
                          Array.isArray(filter.tag) && filter.tag.includes(tag),
                        onChange: (e) =>
                          choose({
                            tag: e.target.checked
                              ? [...(filter.tag ?? []), tag]
                              : (filter.tag ?? []).filter((v) => v !== tag),
                          }),
                      }),
                      tag,
                    ),
                  ),
                ),
                h(
                  "details",
                  null,
                  h("summary", null, t("readableFormats")),
                  h(
                    "div",
                    { className: "ac-format-list", title: t("readableHint") },
                    ...(status.config?.readableExtensions ?? []).map((ext) =>
                      h("code", { key: ext }, `.${ext}`),
                    ),
                  ),
                  h("div", { className: "ac-format-hint" }, t("readableHint")),
                ),
                nav(t("missing"), { missing: true }),
                nav(t("trashed"), { trashed: true }),
              ),
            h(
              "div",
              { className: "ac-main" },
              h(
                "div",
                { className: "ac-listbar" },
                h(
                  "span",
                  { className: "ac-total" },
                  loading ? t("loading") : `${total} ${t("items")}`,
                ),
                selected.size > 0 &&
                  h(
                    "button",
                    {
                      disabled: busy,
                      onClick: () =>
                        setModal({
                          kind: "trash",
                          records: rows.filter(
                            (r) => selected.has(r.id) && !r.missing && !r.burst,
                          ),
                        }),
                    },
                    `${t("trash")} · ${selected.size}`,
                  ),
                h(
                  "select",
                  {
                    value: sort,
                    "aria-label": t("time"),
                    onChange: (e) => setSort(e.target.value),
                  },
                  ...["time", "name", "size", "workspace"].map((k) =>
                    h("option", { key: k, value: k }, t(k)),
                  ),
                ),
                h(
                  "select",
                  {
                    value: "",
                    "aria-label": t("export"),
                    onChange: (e) => {
                      if (e.target.value) exportList(e.target.value);
                    },
                  },
                  h("option", { value: "" }, t("export")),
                  h("option", { value: "markdown" }, t("markdown")),
                  h("option", { value: "csv" }, t("csv")),
                ),
                filter.missing &&
                  h(
                    "button",
                    {
                      disabled: busy,
                      onClick: () => setModal({ kind: "clean", records: [] }),
                    },
                    t("cleanMissing"),
                  ),
              ),
              h(
                "div",
                {
                  className: "ac-scroll",
                  ref: listRef,
                  onScroll: (e) => setScroll(e.currentTarget.scrollTop),
                },
                h(
                  "div",
                  { className: "ac-columns" },
                  h("input", {
                    type: "checkbox",
                    "aria-label": t("selected"),
                    checked:
                      rows.some((r) => !r.missing && !r.burst) &&
                      rows
                        .filter((r) => !r.missing && !r.burst)
                        .every((r) => selected.has(r.id)),
                    onChange: (e) =>
                      setSelected(
                        e.target.checked
                          ? new Set(
                              rows
                                .filter((r) => !r.missing && !r.burst)
                                .map((r) => r.id),
                            )
                          : new Set(),
                      ),
                  }),
                  h("span", null, t("name")),
                  h("span", null, t("workspace")),
                  h("span", null, t("conversation")),
                  h("span", null, t("source")),
                  h("span", null, t("size")),
                ),
                rows.length === 0 && !loading
                  ? h(
                      "div",
                      { className: "ac-empty" },
                      h(Icon, { kind: "file", size: 36 }),
                      h("h2", null, t("empty")),
                      h("p", null, t("emptyHint")),
                      h(
                        "button",
                        {
                          onClick: () => {
                            choose({});
                            setQuery("");
                          },
                        },
                        t("clear"),
                      ),
                    )
                  : h(
                      "div",
                      {
                        style: {
                          height: rows.length * 68,
                          position: "relative",
                        },
                      },
                      h(
                        "div",
                        {
                          style: {
                            position: "absolute",
                            top: start * 68,
                            left: 0,
                            right: 0,
                          },
                        },
                        ...visible.map((r) =>
                          h(
                            "div",
                            {
                              key: r.id,
                              className: `ac-row${current?.id === r.id ? " ac-selected" : ""}`,
                            },
                            h("input", {
                              type: "checkbox",
                              "aria-label": `${t("selected")} ${r.name}`,
                              disabled: r.missing || r.burst,
                              checked: selected.has(r.id),
                              onChange: () => toggle(r.id),
                            }),
                            h(
                              "div",
                              { className: "ac-file" },
                              h(
                                "span",
                                { className: "ac-glyph" },
                                r.burst ? "Σ" : r.ext.slice(1) || "FILE",
                              ),
                              h(
                                "div",
                                { className: "ac-fileinfo" },
                                h(
                                  "button",
                                  {
                                    className: "ac-link",
                                    onClick: () => setPreview(r),
                                    title: r.path,
                                  },
                                  r.starred ? "★ " : "",
                                  r.burst ? t("batch") : r.name,
                                  (r.versions?.length ?? 0) > 1 &&
                                    h(
                                      "span",
                                      { className: "ac-version" },
                                      `×${r.versions.length}`,
                                    ),
                                ),
                                h(
                                  "div",
                                  { className: "ac-path" },
                                  r.relPath ?? r.path,
                                ),
                                h(
                                  "div",
                                  null,
                                  h(InlineTags,{record:r,t,onSave:data=>act('patch',data)}),
                                   ...(r.tags ?? [])
                                    .slice(0, 3)
                                    .map((tag) =>
                                      h(
                                        "button",
                                        {
                                          key: tag,
                                          className: "ac-badge",
                                          onClick: () => choose({ tag }),
                                        },
                                        tag,
                                      ),
                                    ),
                                ),
                              ),
                            ),
                            h(
                              "button",
                              {
                                className: "ac-link ac-meta",
                                onClick: () =>
                                  choose({ workspace: r.workspaceId }),
                              },
                              r.workspaceTitle,
                            ),
                            h(
                              "button",
                              {
                                className: "ac-link ac-meta",
                                onClick: () =>
                                  r.sessionId && openSession(r.sessionId),
                                title: `${r.sessionTitle} · ${r.turn ?? "—"} · ${formatTime(r.lastSeenAt)}`,
                              },
                              r.sessionTitle ?? "—",
                            ),
                            h(
                              "div",
                              null,
                              h(
                                "span",
                                {
                                  className: "ac-badge ac-source-badge",
                                  title:
                                    r.source === "snapshot"
                                      ? t("inferred")
                                      : t(r.source),
                                },
                                t(r.source),
                              ),
                              r.missing &&
                                h(
                                  "span",
                                  { className: "ac-muted" },
                                  t(r.trashed ? "trashed" : "missing"),
                                ),
                            ),
                            h(
                              "div",
                              { className: "ac-meta" },
                              bytes(r.size),
                              h(
                                "div",
                                {
                                  title: new Date(r.lastSeenAt).toISOString(),
                                  style: { marginTop: 5, fontSize: 10 },
                                },
                                formatTime(r.lastSeenAt),
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
              ),
              h(
                "footer",
                { className: "ac-footer" },
                h(
                  "span",
                  null,
                  t(status.persistent ? "persistent" : "temporary"),
                ),
                status.phase === "backfill" &&
                  h(
                    "span",
                    null,
                    `${status.processed}/${status.total} ${t("processed")}`,
                  ),
                status.lastValidatedAt &&
                  h(
                    "span",
                    null,
                    `${t("checkTime")} · ${formatTime(status.lastValidatedAt)}`,
                  ),
                status.errors?.length > 0 &&
                  h(
                    "details",
                    null,
                    h("summary", null, t("degraded")),
                    ...status.errors.map((e, i) => h("p", { key: i }, e)),
                  ),
                status.warnings?.length > 0 &&
                  h("span", null, status.warnings.join(" · ")),
              ),
            ),
            current &&
              h(
                "aside",
                { className: "ac-preview", "aria-label": t("preview") },
                h(
                  "header",
                  { className: "ac-previewhead" },
                  h(
                    "div",
                    {
                      style: { display: "flex", gap: 12, alignItems: "start" },
                    },
                    h("h2", { style: { flex: 1 } }, current.name),
                    h(
                      "button",
                      {
                        "aria-label": t("close"),
                        onClick: () => setPreview(null),
                      },
                      "×",
                    ),
                  ),
                  h(
                    "div",
                    { className: "ac-path", title: current.path },
                    current.path,
                  ),
                  h(
                    "div",
                    { className: "ac-actions" },
                    h(
                      "button",
                      {
                        disabled: busy || current.missing || current.burst,
                        onClick: () => act("open", { id: current.id }),
                      },
                      t("open"),
                    ),
                    h(
                      "button",
                      {
                        disabled: current.missing || current.burst,
                        onClick: async () => {
                          try {
                            setApps(await api(`applications?id=${current.id}`));
                          } catch (e) {
                            setNotice(e.message);
                          }
                        },
                      },
                      t("otherApps"),
                    ),
                    h(
                      "button",
                      {
                        disabled: busy || current.missing || current.burst,
                        onClick: () =>
                          act("open", { id: current.id, action: "reveal" }),
                      },
                      t("reveal"),
                    ),
                    h(
                      "button",
                      { onClick: () => copy(current.path) },
                      t("copy"),
                    ),
                    h(
                      "button",
                      {
                        onClick: () =>
                          copy(`[${current.name}](<${current.path}>)`),
                      },
                      t("copyLink"),
                    ),
                    h(
                      "button",
                      {
                        disabled: busy,
                        onClick: () =>
                          act("patch", {
                            id: current.id,
                            patch: { starred: !current.starred },
                          }),
                      },
                      t(current.starred ? "unfavorite" : "favorite"),
                    ),
                    h(
                      "button",
                      {
                        disabled: busy || current.missing || current.burst,
                        onClick: () =>
                          setModal({ kind: "trash", records: [current] }),
                      },
                      t("trash"),
                    ),
                  ),
                  apps &&
                    h(
                      "div",
                      { className: "ac-actions" },
                      ...apps.map((a) =>
                        h(
                          "button",
                          {
                            key: a.id,
                            disabled: busy,
                            onClick: () =>
                              act("open", {
                                id: current.id,
                                application: a.id,
                              }),
                          },
                          a.name,
                        ),
                      ),
                    ),
                ),
                h(
                  "div",
                  { className: "ac-previewbody" },
                  h(PreviewContent, {
                    record: current,
                    t,
                    config: status.config,
                  }),
                ),
                h(
                  "section",
                  { className: "ac-previewmeta" },
                  h(
                    "label",
                    null,
                    t("tags"),
                    h("input", {
                      value: tags,
                      placeholder: t("addTags"),
                      onChange: (e) => setTags(e.target.value),
                    }),
                  ),
                  h(
                    "label",
                    null,
                    t("note"),
                    h("textarea", {
                      value: note,
                      onChange: (e) => setNote(e.target.value),
                    }),
                  ),
                  h(
                    "button",
                    {
                      disabled: busy,
                      onClick: () =>
                        act("patch", {
                          id: current.id,
                          patch: {
                            tags: tags
                              .split(/[,，]/)
                              .map((v) => v.trim())
                              .filter(Boolean),
                            note,
                          },
                        }),
                    },
                    t("save"),
                  ),
                  h(
                    "details",
                    { style: { marginTop: 16 } },
                    h("summary", null, t("versions")),
                    h("p", { className: "ac-muted" }, t("versionsHint")),
                    h(
                      "ol",
                      { className: "ac-timeline" },
                      ...[...(current.versions ?? [])]
                        .reverse()
                        .map((v, i) =>
                          h(
                            "li",
                            { key: i },
                            h(
                              "div",
                              null,
                              formatTime(v.time),
                              " · ",
                              t(v.source),
                              " · ",
                              bytes(v.size),
                            ),
                            h(
                              "button",
                              {
                                className: "ac-link",
                                onClick: () =>
                                  v.sessionId && openSession(v.sessionId),
                              },
                              v.sessionTitle ?? v.sessionId,
                            ),
                            " · ",
                            v.turn ?? "—",
                          ),
                        ),
                    ),
                  ),
                ),
              ),
          ),
          modal &&
            h(ConfirmDialog, {
              modal,
              t,
              busy,
              onCancel: () => setModal(null),
              onConfirm: confirm,
            }),
        );
      };
    }
    return {
      inject: ["slots", "layout", "locale"],
      apply(ctx) {
        ctx.effect(
          () => ctx.locale.register("artifact-center", { zh, en }),
          "artifact-center: dictionaries",
        );
        ctx.effect(() => {
          const style = document.createElement("style");
          style.textContent = css;
          style.dataset.artifactCenter = "true";
          document.head.appendChild(style);
          return () => style.remove();
        }, "artifact-center: styles");
        const Page = createPage(ctx),
          t = ctx.locale.bind("artifact-center");
        ctx.slots.inject("main", () =>
          ctx.slots.register(
            { name: "main", key: "artifact-center", locale: "artifact-center" },
            Page,
          ),
        );
        ctx.slots.inject("sidebar.panellist", () =>
          ctx.slots.register(
            {
              name: "sidebar.panellist",
              id: "artifact-center",
              order: 60,
              locale: "artifact-center",
              label: () => t("panel"),
            },
            () => h(Icon, { kind: "folder", size: 20 }),
          ),
        );
      },
    };
  },
});
