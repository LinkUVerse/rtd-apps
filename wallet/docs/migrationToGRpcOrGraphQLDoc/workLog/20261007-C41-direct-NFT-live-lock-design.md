# C41 NFT 跨窗口竞争：直接持有分支

沿用 TX-04 M3，不新增 98 个父任务。先验环境03／账户07通过；使用新建受控收款人 profile，原 C39 pending、历史交易、账户密文和原测试 profile 均不动。只延迟已通过源码映射绑定的真实 account.signData 返回，不伪造签名、服务响应或 journal。

- [x] L1 当前 C41 全产物、受控账户正常导入和保护、直接 NFT 新鲜 Fullnode 所有权、真实资产准入核验。
- [x] L2 第一真实 Wallet Standard 原两 EN​​ABLED 模拟与原生签名返回暂存；第二 NFT 真实路由明确 execution-lock 拒绝，无法准备／批准，原生 ifAvailable 验证占用，完整三 store 保持且新增模拟为零。
- [x] L3 超过原 30 秒结果期限后释放，原结果关闭式拒绝；通过 NFT 页真实恢复动作（按钮或产品正常lifetime恢复）恢复正常表单，准备原直接 NFT 的新只读预览，核对 canonical bytes／sender／gas／route 与正式模拟，不点击发送。
- [x] L4 原生函数恢复、正常返回／重锁、全部 journal 保持；独立核验所有原始模拟帧、生产源码／UI／worker 哈希和实际新鲜对象。原失败材料保留。本子合同不关闭 Kiosk／Personal／OriginByte 全分支、持久 pending 或父 TX-04。

[30真实检查与完整独立限定审核](./20261007-C41-direct-NFT-live-lock-progress.md)完成L1–L4。首次按钮等待、第二次kind费用断言失败保持。父TX04及其他NFT分支仍开放。
