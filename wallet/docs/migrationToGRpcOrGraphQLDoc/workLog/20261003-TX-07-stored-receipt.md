# TX-07／RPC-18 已确认记录独立发现推进

日期：2026-10-03。RPC-18、TX-06／07／08／11继续推进；本批未增加完整任务勾选，总体13/98=13.3%。

## 编码结果

journal.confirmedReceipt在现有scope索引进行readonly查询，不修改数据库版本。每条验证记录和effects BCS，最多10000条；全H0／generation／账户隔离，URL别名／revision不能绕过。pending不会被当confirmed；同摘要多条终态的状态／epoch／effects／两个已知checkpoint必须一致，否则拒绝。返回显式公共字段白名单，不暴露原request／origin或signedpayload；该查询不终結后来pending，不解除互斥。

新增readStoredReceipt extension UI命令及background接口。参数包含当前完整binding、accountId和digest，backend从真实选中账户确定scope；允许锁定只读，读取后重新authorize。同时将授权地址固定为初始捕获值并核对实际account.id，防止同对象引用的address变化逃过fresh校验。该路径不调用Fullnode／archive、签名／构建／dispatch或commitReceipt。仍由原有origin-checked UiConnection接入，不声称已完成dApp审批。

新纯查询hook缓存绑定profile／session／账户id及地址／digest，禁persist；10秒读预算、调用方取消与迟到拒绝、无终态只做有界readonly再查。UI账户/background适配独立，避免纯领域测试导入旧依赖闭包；完整钱包类型检查仍执行，旧依赖错误未隐藏为通过。

收据页面合并独立详情与已确认记录：成功／链失败终态在详情读取等待、NotFound或Unavailable时仍保留，展示digest／真实已知checkpoint与详情暂不可用；不伪造空余额／事件／旧DTO。新详情若与终态digest／status／epoch／checkpoint／effects BCS冲突，拒绝展示冲突详情并提示核验，journal不写。manual刷新同时重读详情与journal，持久终态不依赖旧request生命周期。

wallet05/archive04第11节逐字对齐，第9节旧未实现摘要同步修正。源目录和冻结文档仍保留。

## 命令与结果

- pnpm exec vitest run src/shared/rpc src/background/execution.test.ts src/background/accounts/zklogin/current-epoch.test.ts src/ui/app/hooks/useGetAllCoins.test.ts src/ui/app/i18n/index.test.ts src/ui/app/background-client/index.test.ts：470/470、37文件、exit0。新增21项实施测试并纳入2项既有port重连测试，无React act警告。
- 新故障分支：持久success／failure独立呈现、无终态不能确认、错binding／账户／digest／BCS、详情冲突、取消清理、切账户／切网迟到、background无广播／终态写入、实际message客户端与hook。
- node scripts/test-execution-journal.cjs：Chromium 153.0.8010.12，12项通过、exit0。新增重新打开终态发现／H0及generation和账户隔离、只读不清后来pending、同digest终态冲突拒绝；此前9项strict落盘／原子性／legacy保留／WebLocks／worker停止重启继续通过。loopback临时服务及文件退出清理。
- 定向tsc --project configs/ts/tsconfig.rpc.json --noEmit：exit0。首次新hook测试导入UI适配导致旧钱包依赖诊断扩入，保留initial-typecheck日志；拆分pure hook后定向通过，完整钱包仍exit2、158条旧迁移诊断，本批source／UI adapter／收据无诊断，Webpack尚未通过。
- 16文件prettier --check exit0；13章／14冻结源／21RPC／22QA文档核验通过；git diff --check无空白错误。新增合同两边一致。
- AST：630文件、45生产方法名候选、3wire字面量，不能视为生产bundle／真实抓包清零。

早期取消测试误认为once监听只能调用一次remove（happy-dom自动移除及finally显式清理都会调用），断言已修正为核验abort监听清理；失败原日志保留。初始scope扩大诊断同样保留，不记通过。

日志：stored-receipt-all-tests.log、stored-receipt-tests.log、stored-receipt-hooks-tests.log、stored-receipt-browser.log、stored-receipt-typecheck.log、after-stored-receipt-typecheck.log、stored-receipt-format.log、stored-receipt-inventory.log（日期前缀均20261003）。证据及SHA：evidence/20261003-stored-receipt-verification.json。

## 未完成事项

无新dev启动或合约部署；nativebrowser harness不能替代真实扩展／debug链。startup／popup／worker自动pending恢复、全签名入口、GraphQL写后读、NFT／质押／Kiosk、原生列表／全部归档选择器、依赖构建和试用包仍待完成。当前不可试用，目标继续进行。
