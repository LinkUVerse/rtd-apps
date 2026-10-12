# C41 直接 NFT 真实跨窗口竞争完成范围

[实施前 L1–L4](./20261007-C41-direct-NFT-live-lock-design.md)限定子合同已通过[真实扩展03](./20261007-C41-direct-NFT-live-lock-chrome-03.json)和[独立审核01](./20261007-C41-direct-NFT-live-lock-independent-audit-01.json)：30 项实际 UI 检查、4 组 ENABLED 原始模拟请求／响应、当前 C41 源码与 UI／worker／生产 maps、最新 8 个 debug 产物核验一致。

受控收款人用正常 UI 导入并保护至新 profile；直接 Display NFT 的新鲜 canonical Object BCS、版本269844／digest／AddressOwner 保持。原 Wallet Standard 只签名在两次正式模拟后真实完成一次私有 account.signData，只延迟结果交付；同作用域 native ifAvailable 在两个实际窗口均不可获取。第二 NFT 路由明确显示 execution-lock 拒绝，无法输入收款地址或批准，新增模拟／签名／Execute 为零。

原结果超过实际30秒有效期后释放并关闭式拒绝；第二 NFT 路由通过产品正常 lifetime 恢复出表单。费用估算使用原 transaction-kind 和 doGasSelection=true；随后最终 bytes 以 doGasSelection=false 再正式模拟。独立审核校验这两步的同一对象版本／digest、唯一收款地址／TransferObjects、原费用选择与最终 sender／gasOwner／全部gas objects／price／budget、chain-bound Validity 的 minEpoch／maxEpoch／nonce／allowedProposers 完整一致。最终预览后正常 Back，未点击发送，正常重锁、完整三 store 保持。两个真实资产窗口229798／229997及digest另由新鲜Fullnode核验。

原只签名实际digest为 `3yp9Tzg8yHt5B8riPDr6r23MXAHcbFYGNXrB8PUTsvCt`，NFT仅预览digest为 `ExEhpbfZ1agvQr7zXBQ5kmFpvvfLJQmDxnQkq3nBWGrw`；均不广播／不重发。私有签名没有输出，独立审核不声称验签该私有结果。运行器旧继承字段 originalDigest 仅是历史seed摘要；审核明确保留 legacyHarnessSeedDigest，实际当前批准摘要完全取 originalApprovedTransaction 的 canonical bytes，而非继承字段。

[失败01](./20261007-C41-direct-NFT-live-lock-chrome-01.json)保留：签名锁拒绝21检查成立，但只等待恢复按钮30秒，漏掉正常页面lifetime自动恢复。v2等候真实按钮或正常表单，未插入journal或调用替代准备方法。[失败02](./20261007-C41-direct-NFT-live-lock-chrome-02.json)保留：29实际检查／正常预览返回重锁已成立，末尾旧断言误将transaction-kind费用选择要求为最终bytes。v3分别断言实际kind费用选择与最终bytes，完整重测30项通过；不是放宽生产合同。所有原 pending／历史 profile 不打开、不清除。

本阶段只完成 TX-04 M3 的直接持有 live-lock／正常恢复预览子项。framework／Personal／OriginByte 的完整 live-lock与durable矩阵、质押赎回、当前最终确认全矩阵仍开放，不勾父 TX-04／TX-01／RPC-22 等。**84/98，14项开放，trial_ready=false**。本阶段业务产品源码未改变，沿用C41产物；新增的是实际测试和独立核验工具。
