#!/usr/bin/env python3
"""Apply source-checked current-contract corrections; retain every prior document."""
from pathlib import Path
from datetime import datetime, timezone
import hashlib
import json

W=Path(__file__).resolve().parents[1]
R=W.parents[1]
D=W/'migrationToGRpcOrGraphQLDoc'
A=R/'rtd-archive-service/docs/wallet'
L=D/'workLog'
B=L/'20261012-C290-document-originals'
changes={}


def edit(p, old, new):
    content=changes.get(p,p.read_text())
    assert content.count(old)==1,(p,old,content.count(old))
    changes[p]=content.replace(old,new)


def paired(number, old, new):
    merged=next(D.glob(f'{number:02}-*.md'))
    original=next(A.glob(f'{number-1:02}-*.md'))
    for p in [merged,original]:edit(p,old,new)


old='> 合并核对：2026-10-03。当前实施基线见 01 与 evidence；历史局部改动已撤销，以下功能合同是待实现要求。完成状态仅以 Task.md、totalProgress.md 和 workLog 的当前证据为准。'
for p in D.glob('[0-1][0-9]-*.md'):
    if old in p.read_text():
        edit(p,old,'> 2026-10-03 初始合并基线：当时的局部改动撤销与待实施状态保留为历史。正文功能合同继续有效，现行完成状态由 Task.md、totalProgress.md 和 workLog 的最新证据决定。')

paired(5,'wallet/src/shared/rpc/execution-journal.ts、execution-journal-browser.ts、execution-coordinator.ts','wallet/src/shared/rpc/execution-journal.ts（直接封装 IndexedDB）、execution-coordinator.ts 与 wallet/src/background/execution.ts')
paired(5,'实施建议把授权、journal 状态变更和 dispatch 的协调放到 background；UI 负责展示与用户操作。现有部分协调在 UI signer 中，实现迁移必须处理 popup 关闭／worker 中止；不能仅移动函数后声称具备全程事务性。','现行授权与 dispatch 由 background/execution.ts、dapp-execution.ts 和 shared/rpc/execution-coordinator.ts 协调，UI 负责展示与用户操作。初版 UI signer 的缺口已经迁移；popup 关闭／worker 中止仍须按实际 journal 与恢复证据核验，不能仅凭函数位置声称全程事务性。')
paired(5,'### 3.1 新 journal 合同（建议 version 2）','### 3.1 现行 journal 合同（version 2）')
paired(5,'旧代码保留至 v1数据迁移完成，之后发布中移除旧执行实现。','旧 v1 数据保留并隔离未知身份，不能启动旧执行实现重放；现行 version 2 的 records／locks／meta 由 IndexedDB 事务维护。')
paired(6,'所有必需已提交KV流水线的最小水位；作为同链最低可读下界','所有必需已提交KV流水线的最小水位；作为共同已覆盖的可读上界，最早保留位置另按 readerLo／最低可用字段核验')
paired(4,'SendTokenForm、PreviewTransfer、WalletSigner、receipt','SendTokenForm、PreviewTransfer、background/execution.ts、execution-coordinator.ts、receipt')
paired(4,'walletTransactionHistoryPage、useQueryTransactionsByAddress、archiveAccountHistory','useQueryTransactionsByAddress、account-history-reader.ts、ledger-reader.ts')
paired(4,'address-input、nameService、archiveNameService','address-input、useAppResolveRtdnsName、name-reader.ts')
paired(4,'核心改动路径：wallet 的 shared/rtd-client、api-env、NetworkEnv、ApiProvider、WalletSigner、recovery 映射、WalletStandardInterface、余额／coin／history／receipt／recipient／stake Hook；','现行核心路径：wallet 的 shared/rpc 领域 reader／session／journal／coordinator、background/execution 与 dApp 授权、WalletStandardInterface、余额／coin／history／receipt／recipient／stake Hook；')
paired(7,'下列是现有脚本与未来验收建议，**本轮未执行**。实施时先固定依赖与测试网络：','下列命令保留 2026-10-02 设计时点的建议，不能视为当前一键验收或复跑指令。实际已执行命令、版本、结果以对应 workLog 为准；环境启动仍只使用已核验的 link-u-smart-contract 脚本：')
paired(7,'当前名称fixture仅证明dev读协议；钱包转账名称验收需受控同链registry和有效／过期记录，不能宣称生产名称注册商业流程已上线。','名称验收使用受控同链registry和有效／过期记录；C279已完成当前dev名称转账、续期、改名及错误恢复。这不表示生产名称注册商业流程已上线。')
paired(7,'设计审核后，建议从W00–01落地；本轮未实施上述工作包，未生成编码／Chrome通过证据。','以上为2026-10-02设计交付时点；后续W00–W07实施证据已按98项Task逐步登记。本段不覆盖当前编码、Chrome实证及仍待完成的网络生命周期验收。')
paired(8,'初版日期：2026-10-02；服务归属补充：2026-10-03（北京时间）。**状态：源码核验及设计补充已完成；钱包迁移编码、协议桥接及 Chrome 验收尚未完成。**','初版日期：2026-10-02；服务归属补充：2026-10-03（北京时间）。初版未实施的状态仅属于该时点；现行C278的编码、桥接和业务Chrome验收已由C281汇总，完整网络生命周期及最终交付仍见leftProgress。')
paired(8,'原生服务没有内置 gRPC-Web；03 文档规划的协议桥接完成后 Chrome 才能直读；不是已有浏览器验收能力','原生服务仍为HTTP/2；受控gRPC-Web桥接已经部署，C281/C280有实际Chrome读取及冷恢复证据')
paired(8,'待开发的钱包／共享 core 领域读组合','已实现的 shared/rpc/staking-reader.ts 领域读组合')
paired(8,'按当前仓库 dev 部署配置（配置核对，不是本次启动或健康验收）：','以下端口来自2026-10-03归属核对，不是当前G4配置；现行入口见合并方案第14章，独立accountHistoryUrl明确配置：')
paired(8,'上述 `graphql`、网关及账户历史子服务由 `rtd-archive-events-hbase3` Compose 项目管理；端口是 dev 配置，生产使用同一职责划分并配置实际域名。','上述为初版 `rtd-archive-events-hbase3` Compose 的逻辑子服务关系。当前G3/G4验收把指定rtd最新debug查询进程与各自中间件/网关组合启动；Compose项目名和native/Docker边界以当前绑定清单为准，不能直接启动另一套旧配置。生产使用同一职责划分并配置实际域名。')
paired(8,'本轮实际安装为 **2.31.3／1.4.13**，旧源码尚未适配。','2026-10-03实际安装为 **2.31.3／1.4.13**，该时点旧源码尚未适配。')
paired(8,'同一 RPC 在页面与交易构建中的职责不同，服务列明确区分调用场景；这些是选定的目标路由，不是随机故障切换选项。源码列列出代表位置；全部 59 个非误报调用候选及测试位置见第 3 节与 JSON 证据。','同一RPC在页面与构建中的职责不同；服务列是约束，不能随机切换。源码列保留迁移前代表位置；新SDK列同时说明通用API与领域组合，不表示现行wallet必定直接调用每一个SDK方法。现行源码位置由C269/C281及最终追溯表核对，旧59个候选保留在第3节与JSON证据。')
paired(8,'`resolveNameServiceAddress({name})` → `address(name:$name){address}`；需要过期／registry 合同使用 `nameRecord(name)` typed query','通用SDK可用 `resolveNameServiceAddress`／`address(name)`；现行钱包按显式registry读取 `address.dynamicField` 的NameRecord BCS和0x6时钟，并以Fullnode当前对象逐项核对（name-reader.ts）')
paired(8,'当前调用 `limit:1` → `defaultNameServiceName({address})` → `address(address:$address).defaultNameRecord{domain}`','旧调用为 `limit:1`；通用SDK默认名称用defaultNameServiceName，现行钱包显式读取reverseRegistry动态字段，再读取正向记录并核对当前Fullnode（name-reader.ts）')
paired(8,'前者委托同名 SDK 请求；后者轮询 getTransactionBlock，当前 WalletSigner 有自定义恢复轮询','前者在旧基线委托同名SDK请求；后者在旧基线轮询getTransactionBlock。现行WalletSigner已移除，恢复由background与execution-coordinator/journal实现')

p=D/'10-RTD-SDK与前端现状审计.md'
edit(p,'## 2. 实际依赖版本与导出边界','## 2. 2026-09-24 依赖快照与导出边界')
edit(p,"import { RtdJsonRpcClient } from 'rtd-typescript/jsonRpc'; // 仅迁移过渡","import { RtdJsonRpcClient } from 'rtd-typescript/jsonRpc'; // 仅展示旧SDK能力；本钱包禁止导入或回退")
edit(p,'## 4. Wallet 与 `rtd-apps-core` 的 JSON-RPC 调用面','## 4. 2026-09-24 Wallet 与 `rtd-apps-core` 的旧调用面')
p=D/'11-数据服务拓扑与历史保留.md'
edit(p,'## 3. 本地两代源码与当前索引服务的真实关系','## 3. 2026-09-24 两代源码与旧索引服务的关系')
edit(p,'**不能把“索引器已经归档 checkpoint”理解成“历史细节已经有 GraphQL 或 gRPC 接口”。** 当前 `rtd-indexer` 项目','**不能把“索引器已经归档 checkpoint”理解成“历史细节已经有 GraphQL 或 gRPC 接口”。** 以下 `rtd-indexer` 的部署缺口属于2026-09-24快照；当前钱包使用rtd-archive-service体系的HBase/PG/Rocks、GraphQL与Ledger接口，实际G4启动与读取见C280。历史 `rtd-indexer` 项目')
edit(p,'过渡期间可以由可信服务端/BFF 仅对已验证覆盖的历史点查调用 29102；','对本次范围以外仍处于渐进迁移的应用，可信服务端/BFF可在独立验收后对已验证历史点查调用29102；本钱包禁止该兼容路线。')
edit(p,'图中 `ALG` 是**目标态**，不是当前已部署服务；','该图是2026-09-24生产拓扑建议；当前钱包dev已经部署归档Ledger，生产HA并未在本次签认。图中 `ALG` 是逻辑服务；')
edit(p,'以下行号来自本次只读检查。`rtd`（本轮 dev 必须使用最新源码编译的 debug 产物） 是新链源码；`rtd` 是当前 `rtd-indexer` 固定使用的旧 fork。','以下链接/行号保留2026-09-24只读检查及其两代源码语境，重定位路径不保证旧提交内容仍与当前文件相同。当前本任务统一使用指定rtd工作区的C274八个debug产物；rtd-indexer历史固定提交不代表当前rtd工作树，不能据此复用旧二进制。')
p=D/'12-前端迁移实施方案.md'
edit(p,'| 钱包 `getLatestRtdSystemState`/质押/验证者收益等       | `getCurrentSystemState` 或原生服务/应用索引                                    | 不是所有旧聚合字段都有直接对应；单独核算收益定义和系统状态的 UI 依赖。                       |','| 钱包 `getLatestRtdSystemState`/质押/验证者收益等 | 固定S的0x5 wrapper/内层BCS、pool/rates领域组合；Fullnode独立查询当前epoch | 依照04/08及staking-reader，不把Epoch起始systemState当当前快照；无历史资料显示未知。 |')
p=D/'14-开发验收包安装与回归说明.md'
edit(p,'## 当前 G4 开发网络','## 当前 G4 开发网络\n\n2026-10-12 C286验收临时状态：C51当前选用了独立只读 `c286-actual-network-lifecycle` profile，四入口经41957 `/c286/` 路径转发到G4；该入口禁止执行/模拟，不能用于正常发交易。macOS锁屏后已恢复全部真实G4上游，但钱包原profile仍待通过UI切回。临时进程定时于北京时间03:50左右退出，届时临时URL不可用；下表是必须恢复的原G4绑定，不是已经完成恢复的声明。见[C286实际状态](./workLog/20261012-C286-network-lifecycle-partial.md)。')

assert not B.exists()
B.mkdir()
manifest=[]
for p,new in changes.items():
    old=p.read_bytes();before=B/(('archive-' if p.is_relative_to(A) else 'wallet-')+p.name)
    before.write_bytes(old);p.write_text(new)
    manifest.append({'path':str(p),'before':str(before),'beforeSha256':hashlib.sha256(old).hexdigest(),'afterSha256':hashlib.sha256(p.read_bytes()).hexdigest()})
(L/'20261012-C290-document-edits-01.json').write_text(json.dumps({'at':datetime.now(timezone.utc).isoformat(),'scope':'Current contract corrections supported by source and existing scoped acceptance; full semantic qualification separate.','files':manifest},ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'updated':len(changes),'originalsPreserved':True}))
