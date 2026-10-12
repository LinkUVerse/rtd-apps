# C163 完整 unsigned 测试驱动修正

01 的 direct/sponsor 新预览没有进入模拟；正常先回 tokens 再进入 NFT 后，02 已通过 sponsor 与 None／Epoch／timestamp 八行。02 第九行损坏 BCS 已由生产页面明确拒绝，显示 Failed to execute atob ... not correctly encoded，零模拟／签名／Execute；驱动旧错误匹配未包含该真实错误，因此完整结果仍保留 failed。v3 扩展确切错误匹配，继续保留原批准不变、新 requestId、三 store／密文、全部原响应和三私有入口零调用。01／02 不作为完整矩阵完成。只读 unsigned 评审允许在新独立 profile 重新覆盖完整54行，未重复任何 UI Approve／链上转移。
