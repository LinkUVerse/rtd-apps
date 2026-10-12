# NET-12／RPC-03：隐藏偏好隔离与持久化

2026-10-03。现有HiddenAssetsProvider使用全局hidden-asset-ids，切账户／链沿用旧列表，撤销分支可能覆盖其他修改。已切为按完整H0、generation和规范化账户地址的版本2键；endpoint、profile alias和revision变化不丢失同链偏好。作用域来自显式配置，不冒充网络实时身份证明。

旧全局记录缺少来源，保留但不自动应用到任何账户。新存储对格式／地址／条数严格校验；损坏记录拒绝覆盖。idb-keyval.update原子读改写防止多窗口覆盖，撤销仅增删目标ID。持久化成功后更新UI，失败保留已知状态并提示，不做二次错误写回。无消费的setHiddenAssetIds接口已移除。

Provider切账户／网络时重挂载，读取成功前不渲染资产子树；迟到读取不进入新作用域，旧toast回调退出后失效。加载失败明确提示并提供重试，中英文已添加。BroadcastChannel通知同作用域窗口刷新，聚焦也重新读盘。

验证：

- 3文件18项通过，含存储格式／遗留记录保留／作用域隔离、撤销保留其他修改、React迟到读取／旧回调失效／持久化先于UI。日志20261003-hidden-preferences-tests.log。存储单测mock只证明转换行为。
- scripts/test-hidden-assets-storage.cjs使用Chromium153两个真实标签页与原生IndexedDB，并发添加20项无丢失，单项撤销后19项，刷新保持19项，其他账户／链为空，旧全局键不变。日志20261003-hidden-preferences-browser.log。其scope明确不是扩展UI验收。
- 完整TypeScript通过，20261003-hidden-preferences-typecheck.log。初次缺少common.retry文案键已补齐后复验。
- 开发版Webpack通过，20261003-hidden-preferences-build.log。

双方SDK迁移矩阵同步补充规则。NET-12、RPC-03和QA-A22保持未完成：仍需完整query持久缓存升级审计、实际扩展资产操作及相关接口整体验收。本批没有推进OriginByte包部署；已确认指定合约仓库无现成OriginByte／Kiosk fixture，后续需补齐受控部署和ABI证明，不能以不支持分支作为完成迁移的替代。
