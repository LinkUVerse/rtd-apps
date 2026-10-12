#!/usr/bin/env python3
"""Trace every legacy method and route, preserving untested/excluded branches."""
from pathlib import Path
from datetime import datetime, timezone
import collections, hashlib, json, re, subprocess

W=Path(__file__).resolve().parents[1]; D=W/'migrationToGRpcOrGraphQLDoc'; L=D/'workLog'
inputs={}
def sha(p): return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def bind(p):
    p=Path(p).resolve(); inputs[str(p)]=sha(p); return p
def read(p): return json.loads(bind(p).read_text())
def proof(name):
    p=L/name; value=read(p); assert value.get('passed'),name
    return {'path':str(p),'sha256':sha(p),'originalScope':value.get('scope'),
            'observedAt':value.get('observedAt'),'notRerun':True}

# These are evidence groups, not substitutes for the original acceptance scope.
groups={
 'account':('C19 reviewed production; account modules unchanged in C278',[
  '20261006-QA-A01-completion-audit-03.json','20261006-QA-A01-reviewed-upgrade-07.json']),
 'settings':('C40 actual preferences/lock; C241 ordinary Chrome read-only',[
  '20261007-QA-A22-current-C40-completion-audit-01.json','20261011-C243-readonly-pages-traffic-01.json']),
 'balances':('C250 ordinary Chrome; later C278 real transfer',[
  '20261011-C250-browser-balances-audit-01.json','20261012-C278-name-transfer-closure-01.json',
  '20261006-QA-A05-completion-audit-03.json']),
 'assets':('C231/C241 ordinary Chrome; C257/C275 writes and read-after-write',[
  '20261011-C237-assets-audit-02.json','20261011-C237-kiosk-audit-01.json',
  '20261011-C237-nft-detail-audit-01.json','20261011-C252-nft-restrictions-audit-01.json',
  '20261011-C275-nft-browser-audit-01.json']),
 'fields':('C25 fixed-S actual data and Chrome; C237 later asset traffic',[
  '20261006-QA-A06-completion-audit-02.json']),
 'history':('C41 full declared account-history scope; C237/C276 later nonempty UI',[
  '20261007-QA-A13-current-completion-audit-01.json','20261011-C237-activity-audit-01.json',
  '20261011-C276-withdraw-post-write-audit-01.json']),
 'archive':('Historical same-chain native proof; C102 complete API and browser',[
  '20261006-QA-A11-completion-audit-01.json','20261008-C102-five-parent-completion-01.json']),
 'execution':('C250/C257/C275/C276/C278 original transactions, not re-executed',[
  '20261011-C249-execution-audit-02.json','20261011-C258-nft-execution-audit-01.json',
  '20261011-C259-execution-audit-01.json','20261011-C275-stake-audit-01.json',
  '20261011-C276-withdraw-audit-01.json','20261012-C278-name-transfer-closure-01.json']),
 'paging':('C19 actual fixed-S indexed lists plus separately labelled fault fixtures',[
  '20261006-QA-A12-completion-audit-01.json']),
 'names':('Current C278/G4 full name scope and ordinary Chrome',[
  '20261012-C279-name-completion-01.json']),
 'staking':('C275 stake; C276 composition/withdraw/current UI',[
  '20261011-C275-stake-audit-01.json','20261011-C276-withdraw-closure-01.json',
  '20261011-C276-withdraw-post-write-audit-01.json']),
 'dapp':('C241 connection/rejection/messages; C257 original real execution',[
  '20261011-C248-browser-dapp-audit-01.json','20261011-C259-execution-audit-01.json']),
 'hidden':('C257 ordinary Chrome account/generation scoped persistence',[
  '20261011-C262-hidden-audit-01.json','20261011-C270-qualification-01.json']),
 'traffic':('C281 re-audit of 25 retained captures across original versions',[
  '20261012-C281-business-traffic-01.json','20261012-C281-source-applicability-01.json']),
}
for k,(version,names) in list(groups.items()):
    groups[k]={'versions':version,'evidence':[proof(n) for n in names]}

# Independently rebind the existing current-source and HAR audit inputs.
rebound=[]
for n in ['20261012-C281-source-applicability-01.json','20261012-C281-business-traffic-01.json']:
    j=read(L/n)
    for path,digest in j['inputsSha256'].items(): assert sha(path)==digest,path
    rebound.append({'path':str(L/n),'unchangedInputCount':len(j['inputsSha256'])})

def modules(root):
    result={}
    for p in sorted(root.glob('*.js.map')):
        j=read(p)
        for n,s in zip(j['sources'],j['sourcesContent']):
            if n.startswith('webpack:///./'):
                if n in result: assert result[n]==s
                result[n]=s
    return result
current=modules(Path(read(L/'20261012-C278-ordinary-upgrade-installed-01.json')['compilerOutput']))
prefixes=['ui/app/pages/accounts/','background/accounts/','background/account-sources/',
          'ui/app/components/accounts/']
account_names=[n for n in current if any(n.startswith('webpack:///./'+p) for p in prefixes)]
assert len(account_names)==54
account_versions=[]
for n in ['20261006-NET-04-reviewed-production-build-03.json','20261007-default-generation-positive-C40-build-01.json']:
    j=read(L/n);old=modules(Path(j['output']))
    assert all(current[k]==old[k] for k in account_names)
    account_versions.append({'build':n,'unchangedAccountModules':len(account_names)})

index=read(L/'20261011-C269-release-inventory-01.json')
method_groups=[['assets','archive'],['assets','archive'],['assets'],['balances','assets'],
 ['balances'],['balances'],['balances'],['fields','assets'],['history','archive'],
 ['execution'],['execution'],['history','paging'],['paging'],['names'],['names'],
 ['staking'],['staking'],['staking'],['traffic'],['execution'],['execution']]
limits=[
 'Current object, fixed-S object and explicit historical version are separate contracts.',
 'Missing/version slots retain per-object status; a batch envelope is not all-slot success.',
 'Indexed snapshot ownership is not the final current native owner; transfer revalidates.',
 'Spendable coins are current Fullnode objects; indexed asset objects do not authorize spending.',
 'Home uses current Fullnode balance; GraphQL snapshot balance is independently scoped.',
 'Current amount uses integer atomic units; error is never zero.',
 'Metadata-null keeps atomic units; no fabricated symbol or decimals.',
 'Historical fixed-S data preserves its original generation and checkpoint.',
 'Fullnode miss is not absence; archive exact bytes/receipt validation remains explicit.',
 'C256 original unknown digest remains pending and is not resent; later successes do not resolve it.',
 'Simulation success is not execution; final bytes/gas and consent remain distinct.',
 'Account coverage flags remain qualified; no claim of global/all-account completeness.',
 'No standalone events UI route; actual reader data and synthetic pagination failures are separate.',
 'Registry and freshness binding required; labels never replace final recipient address.',
 'Reverse name must agree with forward address; null/expiry are normal negative results.',
 'Fixed-S system BCS and current native epoch are distinct; governance fault states include fixtures.',
 'Real G4 stake/withdraw covered; not every governance state physically induced on chain.',
 'APY derived from validated pools/rates; formula fixtures not a new native getValidatorsApy call.',
 'Native height and indexed readable window are separate; no single global ready guarantee.',
 'Wallet resolves gas via simulation; generic SDK GetEpoch is a separate available method.',
 'Wallet resolves Move inputs via simulation; generic SDK GetFunction is not a claimed wallet request.',
]
methods=[]
for row,gs,limit in zip(index['methods'],method_groups,limits):
    anchors=[]
    for a in row['anchors']:
        p=bind(a['path']);text=p.read_text();assert a['token'] in text
        anchors.append({**a,'line':text[:text.index(a['token'])].count('\n')+1,'sha256':sha(p),
                        'unchangedSinceC269':sha(p)==a['sha256']})
    methods.append({'id':row['id'],'legacy':row['legacy'],'route':row['currentRoute'],
                    'anchors':anchors,'evidenceGroups':gs,'exception':limit})
assert len(methods)==21

routes=json.loads(subprocess.check_output(['node',str(W/'scripts/inventory-C269-routes.cjs')],text=True,cwd=W))
assert len(routes)==54
assert [(r['file'],r['attributes']) for r in routes]==[(r['file'],r['attributes']) for r in index['routes']]
route_rows=[]
for i,row in enumerate(routes,1):
    p=bind(row['file']);a=row['attributes'];path=a.get('path','index');e=a['element']
    groups_used=[];kind='business';note='C281 binds current C278 sources; prior test versions and scope remain as recorded.'
    if 'menu/content/' in str(p):
        groups_used=['settings'];kind='settings' if 'Navigate' not in e else 'redirect'
    elif 'Navigate' in e:
        kind='redirect';note='Source-declared redirect only; no independent RPC/business operation.'
    elif 'qredo' in path or 'Qredo' in e:
        kind='excluded';note='07 scope excludes remote Qredo success. Source retained; no real remote-provider acceptance claimed.'
    elif 'RestrictedPage' in e:
        kind='local-unmeasured';note='Local restriction message/initialization guard. No separate actual navigation proof found.'
    elif 'UsdcPromo' in e:
        kind='defect';note='Direct route still loads an external promo image and navigates to absent /swap; must align with disabled homepage exchange. No successful exchange evidence.'
    elif 'ForgotPassword' in e or any(x in e for x in ['RecoverPage','RecoverManyPage','ResetWarningPage','ResetPasswordPage']):
        kind='local-unmeasured';groups_used=['account'];note='54 account modules match historical builds, but create/import tests do not prove forgot-password reset UI. Local/background credential flow; no new chain RPC. Not labelled tested.'
    elif 'OnrampPage' in e:
        kind='unsupported-ui';groups_used=['settings'];note='Actual unavailable UI evidence only; no fiat merchant transaction acceptance.'
    elif 'HomePage' in e:
        kind='container';groups_used=['balances','dapp'];note='Shared layout represented by child-page tests; not a separate business query.'
    elif 'AccountsPage' in e and 'Manage' not in e:
        kind='container';groups_used=['account']
    elif '/pages/home/tokens/index.tsx' in str(p):
        kind='source-only';note='Declared router source retained; App currently imports TokenDetailsPage directly. These declarations do not prove separate mounted pages.'
    elif any(x in e for x in ['WalletSettings','NetworkSettings','AutoLock','LanguageSettings','ThemeSettings','MoreOptions']):groups_used=['settings']
    elif any(x in e for x in ['WelcomePage','AddAccountPage','ImportPassphrase','ImportPrivateKey','ProtectAccount','BackupMnemonic','ExportAccount','ExportPassphrase']):groups_used=['account']
    elif 'ManageAccountsPage' in e:groups_used=['account','settings']
    elif any(x in e for x in ['AppsPage','AppsPlayGround','ConnectedAppsCard']):groups_used=['settings','dapp']
    elif 'HiddenAssetsPage' in e:groups_used=['hidden']
    elif 'NftTransferPage' in e:groups_used=['assets','execution']
    elif any(x in e for x in ['KioskDetails','NFTDetails','AssetsPage','NftsPage']):groups_used=['assets']
    elif 'ReceiptPage' in e:groups_used=['execution','archive','history']
    elif any(x in e for x in ['TransferCoinPage','CoinsSelectorPage']):groups_used=['balances','execution','names']
    elif any(x in e for x in ['Staking','Validators','DelegationDetail','StakePage']):groups_used=['staking']
    elif 'TokenDetailsPage' in e:groups_used=['balances']
    elif 'TransactionBlocksPage' in e:groups_used=['history']
    elif any(x in e for x in ['SiteConnectPage','ApprovalRequestPage']):groups_used=['dapp']
    else: raise AssertionError(row)
    assert kind!='business' or groups_used,row
    route_rows.append({'id':f'ROUTE-{i:02}',**row,'sourceSha256':sha(p),'kind':kind,
                       'evidenceGroups':groups_used,'exception':note})

traffic=read(L/'20261012-C281-business-traffic-01.json')
bind(__file__)
result={'passed':True,'observedAt':datetime.now(timezone.utc).isoformat(),
 'scope':'Complete 21-method/54-declaration traceability, including explicit defects and unmeasured/excluded local branches. Not all-route browser success or final acceptance.',
 'traceabilityComplete':True,'allRoutesBrowserTested':False,'allRequiredAcceptanceComplete':False,
 'acceptedPackage':None,'openDefect':'Direct usdc-promo route must show exchange unavailable; qualify successor source/build.',
 'methods':methods,'routes':route_rows,'groups':groups,'accountVersionApplicability':account_versions,
 'reboundExistingEvidence':rebound,'retainedTrafficExceptions':traffic['exceptions'],
 'routeClasses':dict(collections.Counter(r['kind'] for r in route_rows)),
 'newLiveRequests':0,'newSignatures':0,'newExecuteRequests':0,'parentCompletion':False,'inputsSha256':inputs}
out=L/'20261012-C291-rpc-page-traceability-01.json';assert not out.exists()
out.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
lines=['# C291 RPC与页面逐项追溯','','21项旧RPC与54条Route声明均已有来源、版本、实际证据及例外映射。当前安装为C278；本轮是保留材料和当前源码核对，没有新增浏览器测试或交易。发现USDC直接路由缺陷，REL-05.5暂不收口。',
 '', '## 版本与边界','',
 'C281的649个来源/流量输入SHA仍一致。账户页面、账户后台、账户来源及账户组件共54个模块，与C19及C40保留生产source map逐字相同。当前C278与C257的7个变化沿用C281逐项适用性裁决。',
 '', '密码恢复6条路由、受限提示页和两个未由当前App挂载的旧Token路由未找到逐页实际验收；明确保留未测，不把创建/导入通过扩写成密码重置通过。Qredo远端成功在07章原范围之外；容器和跳转不增加业务功能数。USDC路由属于真实待修复问题。',
 '', '## RPC逐项','', '| 原项 | 当前实现 | 证据组 | 例外／边界 |','| --- | --- | --- | --- |']
for r in methods:lines.append(f"| {r['id']} {r['legacy']} | {r['route']} | {', '.join(r['evidenceGroups'])} | {r['exception']} |")
lines+=['','## 全部路由声明','','路径是所属路由器中的声明；不擅自拼成绝对URL。编号固定本次AST顺序。','','| 编号 | 声明位置 | 局部路径／组件 | 类别／证据 | 例外 |','| --- | --- | --- | --- | --- |']
for r in route_rows:
    e=re.sub(r'\s+',' ',r['attributes']['element']);path=r['attributes'].get('path','index')
    lines.append(f"| {r['id']} | [{Path(r['file']).relative_to(W)}]({r['file']}:{r['line']}) | `{path}` / `{e}` | {r['kind']} / {', '.join(r['evidenceGroups']) or '无实操证据'} | {r['exception']} |")
lines+=['','## 证据组与原版本','']
for k,g in groups.items():
    links='、'.join(f"[{Path(p['path']).name}](./{Path(p['path']).name})" for p in g['evidence'])
    lines.append(f"- **{k}**：{g['versions']}。{links}")
lines+=['','全部原始例外保留在[机器清单](./20261012-C291-rpc-page-traceability-01.json)：254条非成功/正文不足捕获未算成功。C256原未知摘要继续持久待定，不重发。QA-A17与最终交付仍独立开放。','']
md=L/'20261012-C291-rpc-page-traceability.md';assert not md.exists();md.write_text('\n'.join(lines))
print(json.dumps({'passed':True,'methods':len(methods),'routes':len(route_rows),'classes':result['routeClasses'],'accountModulesUnchanged':54,'packageComplete':False}))
