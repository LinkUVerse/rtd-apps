# RPC-03／RPC-22 现有拥有对象的 Chrome 页面核对

日期：2026-10-04。使用既有 dev 链、编译的 Local profile 与当前构建产物；没有部署、铸造或转移资产。新建的临时浏览器目录仅做只读账户导入和查询，未触及任何保留执行 profile。

新增 `scripts/lib/test-owned-assets-ui.cjs`，通过 `RTD_TEST_OWNED_ASSETS=1` 接入实际扩展生命周期脚本。该模式要求指定现有 dev keystore，禁止同时启用 dApp、质押、转账预览／执行等模式。私钥和随机密码不输出到证据。

## 已取得的初次证据

`20261004-owned-assets-ui.log`：exit 0，真实 GraphQL 快照 S96309，部署账户 13 个拥有对象。10 个非视觉对象的完整类型与 Explorer 对象链接逐项匹配；Coin 没有混入非视觉列表，唯一 OwnerToken 显示为 Kiosk 卡片，点击进入对应 Kiosk 路由。回包 hasNextPage=false，页面集合是完整单页。本次不是强制多页浏览器验收。

实际扩展导入、密码设置、锁定、错误密码拒绝、解锁、整个浏览器重启后保持账户并从锁定状态解锁均通过。全程 0 次 SimulateTransaction、0 次 ExecuteTransaction。此模式没有核验余额金额格式，不继承普通 funded 模式的余额显示通过结论。

初次成功只证明 Kiosk 导航。随后扩充空内容与详情链接断言，`20261004-owned-assets-details-ui.log` 和 `20261004-owned-assets-details-diagnostic.log` 均失败并保留。诊断页面确实显示“Kiosk 中暂无资产”、资产数量 0 和 Kiosk ID，继续定位具体自动化断言，不能将失败运行记为通过。

## 定向回归

- `20261004-owned-assets-ui-tests.log`：实际执行 kiosk-reader 1 文件 16 项通过。命令中的 nft-assets.test.ts 不存在，没有把它计为执行。
- `20261004-owned-assets-ui-hooks-tests.log`：补用存在的 nft-hooks.test.ts，1 文件 8 项通过。
- 两个 CJS 脚本语法检查通过。本次无业务源码或构建产物改动，不重复构建。

UI SHA256：71f5931fd7daa80c7c92ff8683fea773481410151e14f7b8286345bb1498a49d。
background SHA256：3a85161e43e83c72be22dc6808dd20feea7b021ad3605c65bf31d7e45263eb10。

## 验收边界

使用已核验 dev GraphQL 叶证书精确 SPKI 例外，不代表正常 CA 或自定义网络原生权限通过。尚未验证直接 NFT display、隐藏资产、非空 Kiosk 详情、PersonalKiosk 或 NFT 转出。RPC-03／RPC-22 不勾选，总体保持 41/98，trial_ready=false。


## 最终详情核验

收窄详情 Explorer 链接定位为首个匹配链接后，`20261004-owned-assets-details-final.log` exit 0：真实快照 S96880，全部 10 个非视觉对象仍匹配，Kiosk 空内容提示及详情对象链接可见，返回 emptyKioskDetails=true；同时校验每个渲染对象 ID 均存在于本次真实完整 ownedObjects 回包。原生账户生命周期和浏览器重启检查再次通过，0 模拟／0 提交。没有修改业务页面，前两次失败不能单凭诊断文字归因为链或服务故障。
