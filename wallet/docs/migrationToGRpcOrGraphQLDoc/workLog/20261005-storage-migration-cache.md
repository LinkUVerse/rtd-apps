# 2026-10-05：切网清缓存后的页面就绪检查恢复

任务：NET-07／11、TRY-02／05，隶属L5；父项仍48/98，trial_ready=false。

## 问题与修复

当前Local产物已内置审核profile，Chrome实际GraphQL准入／固定S都成功，仍无余额查询。脱敏诊断确认同H0、S188012及全部连续范围；实际tokens页面为空白，[截图](./20261005-reviewed-local-page-state.png)及[失败原记录](./20261005-reviewed-local-chrome-page.log)保留。

切网changeActiveNetwork清空QueryClient；useStorageMigrationStatus此前在读到ready后将enabled永久设false。组件继续挂载而就绪缓存被移除时，disabled查询没有data，App的就绪门禁返回null，页面停滞。真实React／QueryClient／该hook回归先复现1项失败1项通过：[修复前](./20261005-storage-migration-cache-before.log)。

现effect根据response.data是否ready同步enabled；缓存缺失重新向后台核验，ready仍停止轮询。保留切网清缓存和现有会话隔离、完整快照准入与预算；没有为页面通过删除门禁或接受旧链数据。

## 验证

- 3文件14项定向通过，含真实QueryClient清缓存后的恢复、ready停止轮询、Provider余额／完整分页／切换取消以及读取预算：[定向](./20261005-storage-migration-cache-tests.log)。
- 钱包全量132文件1418项通过：[最终全量](./20261005-storage-migration-all-tests-final.log)。第一次全量1418个案例通过但1个文件收集失败，原因是独立node:test脚本被Vitest发现；保留[原失败](./20261005-storage-migration-all-tests.log)，将该文件改为显式执行的.node-check.cjs后重新完整运行通过。4项AST校验单独证据保持，不混入1418项计数。
- 完整tsc exit0：[类型](./20261005-storage-migration-tsc.log)。开发Webpack及构建期间钱包／core／TypeScript SDK和配置输入摘要保持，双入口AST按完整JSON比对审核profile：[构建](./20261005-storage-migration-local-build.json)。新脚本build-reviewed-local-extension.py保存原dist、调用完整profile验证、显式传Local环境、生成源码／artifact证明，避免遗漏构建参数。
- 当前四入口provider及39个wire方法静态闭包通过：[provider](./20261005-storage-migration-provider-audit.json)、[wire](./20261005-storage-migration-wire-audit.json)。
- 最新真实headless Chrome扩展通过：余额实际读取S189657、digest ECJGzKwYg1sVNhJLc1N6aoNzC55nkjMP6LwGfHNetptj；10个非视觉对象及链接、视觉Kiosk卡片、空详情和链接均验证；密码错误拒绝、正确解锁、整浏览器重启保留账户并默认锁定、重启后解锁通过。0模拟0广播，[实际完整报告](./20261005-storage-migration-chrome-assets.log)。后台实际worker摘要与磁盘当前产物匹配。

当前UI SHA c446dd353574351169480316ddeaf521340f644e0bbe347da3e257564cc59acd；后台SHA05b4e235093f20812ad0385db7db9af9dfd19f890608ef5987b0038fecab1f24。90c2d／05b4及更早未配置产物保留；历史失败不能由新成功覆盖。

## 限制与下一项

Chrome采用compiled Local及精确开发叶证书SPKI例外，不证明正常系统CA或自定义host授权。上述NFT／Kiosk范围只有现有非视觉对象和空Kiosk；不证明直接NFT display、隐藏状态持久化、非空Kiosk页面或实际NFT签名转出。独立OriginByte两个账户的123请求／新鲜对象比对／两条未签名路由通过，见[资产与入口日志](./20261005-current-assets-window.md)。

监听队列修复后的本机突发测试已通过，但Docker原入口间歇建连超时尚未全面解决；隔离2秒／5秒对照都40/40成功，不支持擅自延长生产超时。Display v1历史D2–D6继续按权威事件合同实施；其余六个RPC及TX／ENV／TRY完整门槛仍未完成。核心及原生消费者本批未再重启、无原交易重发。
