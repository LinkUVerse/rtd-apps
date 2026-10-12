# C210 浏览器异步准入与查询复用

主人批准 C209 升级后，普通 Chrome 首页实际仍为 8 GraphQL；原 reader 直接并发测试为 4 次。C209 安装、字节及原生 HAR 证据保留，不将该性能目标记为已验收。

根因：WalletReadAdmission.run 的读取前检查分别发起 IndexedDB capture，两个回调落在不同任务，后续 GraphQL 请求无法在同一 microtask 合并。新增真正异步存储回调测试先复现 8 而非 4（20261010-C210-reproduction-01.log）。

修复仅在同一个 WalletReadAdmission 实例中，为 balances/coinMetadata 合并同代次、尚未开始的原生 capture。开始调用 store.capture 前立即清除共享引用，不复用在途或完成的结果。每个调用仍自行验证记录、领域依赖、代次、粘滞负向状态、会话及取消；业务读取完成后仍重新 capture。其他领域、刷新、资金准备及授权保持原路径；没有固定延时或请求次数上限。

测试：异步准入后四次 GraphQL；未发出的采集共享；已发出的/完成的采集不共享；代次变化隔离；局部领域拒绝和调用者取消隔离。原“早到负向、晚到正向”测试新增等待第一次原生采集真正开始，保留原竞争条件，不依赖调用同步启动。第一次定向回归此旧时序测试超时保留；第二轮 57 项通过。最终 2171 tests /120 files、RPC 与生产两项类型检查通过。

构建/审核：production-build-01 0 errors /2 既有体积警告；完整闭包 5292 modules /2038 sources /7 chunks。相比 C209，生产产物只有 read-admission.ts 改变，0 新增/删除模块，后台模块无变化；manifest、profile、release registry 不变。源码指纹 49ed7704783bf13c32d9bc51b59ecc72036b335ae9dafd8a02b267fac8aa1de7（1127 文件）。

候选目录：/Users/changzechuan/.local/state/rtd-wallet-migration/dev-20261006-03/certified-positive-production-C210-20261010-01。用户明确批准后已原路径安装，完整 C209 保存在原路径后缀 `-C209-retained-by-C210-20261010-01`。原账户、扩展 ID 与权限保留。实际 UI/后台静态字节检查通过，用户再次本地解锁后继续原生 Chrome 验收。

## 普通 Chrome 实际验收

三轮刷新各 **4 GraphQL +1 GetServiceInfo**，相比 C209 的 8 GraphQL 减少 50%。15 条响应全部 200，无不完整响应、无 GraphQL 错误。三轮均正常显示 0 RTD；各批量文档通过 AST 还原两个原逻辑域后，独立核验 H0、固定 S/digest、coverage、owner、余额终页和元数据 decimals=9。快照分别 851176、851205、851257，刷新至最终复验分别 3.835/4.907/4.652 秒；只宣称请求数减少，不宣称固定延迟提速。

证据：`20261010-C210-home-three-refresh-01.har`、`20261010-C210-ordinary-balance-har-audit-01.json`；审核脚本 `scripts/audit-C210-ordinary-balances.mjs`。前置安装、用户确认、原生停用、浏览器绑定及实际字节分别保存在本轮同前缀证据中。

质押入口实际进入 validator-0 列表及数量页，可用 0 RTD，预览交易 disabled；没有提交交易。原生 `20261010-C210-stake-navigation-01.har` 含列表、数量页和后台周期，共 50 条完整 200 响应、0 GraphQL 错误；该总数不代表一次进入请求数。首个完整质押周期仍为 13 GraphQL，不声称已经减少。数量页 Fullnode 读取为 GetServiceInfo / GetBalance / GetServiceInfo，保持读后检查。切到应用页、清空 Network 后观察仍无新链查询，原质押轮询停止。

本轮 P210-4 首页及页面切换验收完成。P209-6 的全页面范围仍开放：活动页内部耗时、质押串行读取/复验、非空 NFT/Kiosk/收据和真实资金条件未通过本次空账户验收。总体 92/98 保持，不能将本次性能改善等同于剩余迁移父项完成。
