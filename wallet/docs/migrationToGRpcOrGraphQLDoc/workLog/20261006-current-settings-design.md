# QA-A22：当前生产包本地设置与普通浏览器重启

使用 C26／名称 profile5 已认证独立 production、全新保留 Chrome profile 和原受控已有资金账户。本案读取真实余额，但阻止所有 Simulate／Execute／JSON-RPC／公网请求；不会打开原用户／失败 profile 或改变证书信任。

- [ ] U1 精确 UI／worker、实际导入／保护／本地选择及 1.5 WMIG 元数据展示。
- [ ] U2 英文／中文实际切换，HTML lang、radio 与界面文字一致；真实页面 reload 保持英文。
- [ ] U3 四主题实际点击、DOM／colorScheme／持久偏好一致；reload 保持主题。
- [ ] U4 八设置链接可见及目的地址保持，Escape 关闭设置；仅检查目的地址，不导航外部网页。
- [ ] U5 实际 UI 锁定账户，普通关闭／重新启动同 Chrome profile，新 worker 精确来源、同账户仍锁定、语言和主题保持。
- [ ] U6 全请求／失败审核；0 模拟／签名／派发，全部原包及原 profile 保持。

NFT 隐藏／直接 Display 和受支持应用全入口仍独立待验，因此本案不能单独勾选 QA-A22 或 RPC-03。失败原记录保留，只有实际完成子项才勾选。
