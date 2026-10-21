import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

test("workflow checks Electrobun feed names and encoded bundles for every platform", () => {
  const workflow = Bun.YAML.parse(readFileSync(
    fileURLToPath(new URL("../.github/workflows/build-desktop.yml", import.meta.url)), "utf8",
  )) as any;
  const step = workflow.jobs.deploy.steps.find((s: any) => s.name === "Verify public update feeds and bundles");
  const script = step.run.match(/python3 - <<'PY'\n([\s\S]*?)\nPY/)[1];
  const result = Bun.spawnSync(["python3", "-c", `
import io,json,os,sys
from unittest.mock import patch
from urllib.error import HTTPError
from urllib.request import Request
targets=['macos-arm64','win-x64','linux-x64']
feeds={'https://dipit-pt.github.io/DIPS-DESKTOP-GENERATOR/apps/test.app/stable-'+t+'-update.json':t for t in targets}
seen=[]
def fetch(request,timeout):
    url=request.full_url if isinstance(request,Request) else request
    seen.append(url)
    if isinstance(request,Request):
        assert request.method=='HEAD'
        assert url.endswith('A%2BTarefas.tar.zst'),url
        response=io.BytesIO()
        response.status=200
        return response
    base=url.split('?')[0]
    if base not in feeds: raise HTTPError(url,404,'Not Found',{},None)
    return io.BytesIO(json.dumps({'version':'1.2.44','identifier':'test.app','artifact':{'file':'stable-'+feeds[base]+'-A+Tarefas.tar.zst'}}).encode())
os.environ.update(MATRIX=json.dumps([{'id':'test.app','target':t} for t in ['macos-arm64','windows-x64','linux-x64']]),APP_VERSION='1.2.44',GITHUB_RUN_ID='123')
with patch('urllib.request.urlopen',fetch),patch('time.sleep'):
    exec(compile(sys.stdin.read(),'workflow','exec'))
assert len(seen)==6,seen
assert all(any(url.startswith(feed+'?') for url in seen) for feed in feeds),seen
`], { stdin: Buffer.from(script) });
  expect(result.stderr.toString()).toBe("");
  expect(result.exitCode).toBe(0);
  expect(result.stdout.toString().match(/Verified/g)?.length).toBe(3);
});
