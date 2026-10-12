# 当前 C39 名称正面与发送目标验收

沿用已认证的 G3 suins-v1 根与六 pin profile、seed checkpoint 68041。当前共同索引已超过 seed，但生产名称读取器还要求四项 NAME_COVERAGE 覆盖当前 Fullnode 高度；超过 seed 仅足以检查保留的历史夹具，不足以准入正面名称。名称门槛与 framework placement 180806 分别验证。全部测试使用新隔离 Chrome profile，原 pending／执行 profile 保留；本阶段不签名或广播。

- [ ] N1：使用生产 `WalletNameReader`、当前 profile 和真实四服务查询，分别验证正向主域／leaf、默认反向及过期／缺失／无目标／错误祖先；与原规范 BCS 目标一致，记录实际 snapshot 与拒绝。
- [ ] N2：实际加载 C39 UI／worker，受控账户正常导入／保护，币发送输入正面名称，检查名称展示与最终地址分别正确；缺失／过期名称禁止检查。
- [ ] N3：只点击实际检查，核验正式 ENABLED 模拟原字节、唯一发送目标、费用／最终确认页；禁止点击发送，0 签名／Execute，完整 journal 不变并重锁。
- [ ] N4：独立核验当前加载字节、实际查询／模拟帧、规范目标与全部拒绝，更新 Task／日志；续期改名、迟到／错链全部矩阵另验，不能据此完成 QA-A15 或 RPC-23。

本清单不复用原链 profile5 的 lag 拒绝作为 G3 正面验收，不重新播种名称，也不以 native 根字段存在替代 indexed／Chrome 解析。


N1实际尝试[02](./20261007-C39-positive-name-reader-02.json)在首个主域解析前按生产SnapshotReadError拒绝：实际Fullnode195091、四项名称范围0–106698，未产出目标、0模拟／签名／Execute。首轮仅控制台失败未生成通过文件；诊断工具追加真实原生高度／serviceConfig证据。N1–N4保持开放，不放宽minimumCheckpoint或20 checkpoint新鲜度合同，不用原生根字段替代indexed解析。
