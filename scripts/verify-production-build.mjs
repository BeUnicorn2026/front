import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";

const outputDirectory = path.resolve("dist");
const html = await readFile(path.join(outputDirectory, "index.html"), "utf8");
if (/(?:src|href)="https?:\/\//.test(html)) {
  throw new Error("프로덕션 HTML에 콘텐츠 차단기의 영향을 받는 외부 실행 자산이 있습니다.");
}
const assetPaths = [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map((match) => match[1]);
if (!assetPaths.length) throw new Error("프로덕션 HTML이 빌드 자산을 참조하지 않습니다.");
await Promise.all(assetPaths.map((assetPath) => access(path.join(outputDirectory, assetPath))));

const entryScriptMatch = html.match(/<script\b[^>]*\btype="module"[^>]*\bsrc="(\/assets\/[^"]+\.js)"/);
if (!entryScriptMatch) throw new Error("프로덕션 HTML에 module 엔트리 스크립트가 없습니다.");
const entryScriptPath = entryScriptMatch[1];
const entrySource = await readFile(path.join(outputDirectory, entryScriptPath), "utf8");
const reactVendorImport = entrySource.match(/from["'](\.\/react-vendor-[^"']+\.js)["']/);
if (!reactVendorImport) {
  throw new Error(`${path.basename(entryScriptPath)}: 엔트리 청크가 React 런타임을 명시적으로 import하지 않습니다.`);
}
await access(path.resolve(path.dirname(path.join(outputDirectory, entryScriptPath)), reactVendorImport[1]));

const metadata = JSON.parse(await readFile(path.join(outputDirectory, "deployment.json"), "utf8"));
const expectedCommit = String(process.env.CF_PAGES_COMMIT_SHA || process.env.WORKERS_CI_COMMIT_SHA || process.env.GITHUB_SHA || "local");
if (metadata.commit !== expectedCommit) throw new Error("배포 메타데이터의 커밋이 빌드 환경과 일치하지 않습니다.");
if (!html.includes(`name="voice-partition-commit" content="${expectedCommit}"`)) {
  throw new Error("프로덕션 HTML에 배포 커밋 메타데이터가 없습니다.");
}

const headers = await readFile(path.join(outputDirectory, "_headers"), "utf8");
if (!headers.includes("/index.html") || !headers.includes("no-cache") || !headers.includes("/assets/*") || !headers.includes("immutable")) {
  throw new Error("Cloudflare 캐시 정책이 HTML 재검증과 해시 자산 불변 캐시를 보장하지 않습니다.");
}
for (const route of ["/record", "/documents", "/dictionary", "/settings"]) {
  if (!headers.includes(`${route}\n  Cache-Control: no-cache`)) {
    throw new Error(`${route}: Cloudflare 화면 경로에 HTML 재검증 정책이 없습니다.`);
  }
}
const redirects = await readFile(path.join(outputDirectory, "_redirects"), "utf8");
if (!redirects.split(/\r?\n/).some((line) => line.trim() === "/* /index.html 200")) {
  throw new Error("Cloudflare SPA fallback이 설정되지 않았습니다.");
}

const javascriptFiles = (await readdir(path.join(outputDirectory, "assets")))
  .filter((file) => file.endsWith(".js"));
for (const file of javascriptFiles) {
  const source = await readFile(path.join(outputDirectory, "assets", file), "utf8");
  const withoutLiterals = source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/[^\n\r]*/g, "")
    .replace(/(["'`])(?:\\.|(?!\1)[\s\S])*\1/g, "");
  if (/(?<![.$\w])React\s*[.(\[]/.test(withoutLiterals)) {
    throw new Error(`${file}: 번들에 연결되지 않은 전역 React 참조가 남아 있습니다.`);
  }
}

console.log(`Verified production build for ${expectedCommit.slice(0, 12)} (${assetPaths.length} linked assets, ${javascriptFiles.length} scripts, explicit React runtime).`);
