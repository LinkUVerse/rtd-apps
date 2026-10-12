# 2026-10-04 原生认证发布与实际副本验证

## 实现

指定合约部署目录新增 `run_wallet_certified_publisher.py`：固定当前 debug verifier、原始 lease、source 配置／发布身份／replica reader 哈希和私有文件 manifest；独立 native runtime，不复用旧 Docker publisher。复用现有 publisher-loop 的 certificate、staging version、object fence、PG 提交和 replica-complete 逻辑，所有运行均显式携带 admission／replica gate。配置为完整独立 profile，只有 PG／S3 端点有效，其余 API 保持不可用，校验命令返回失败，不能当公开 query-stack 配置。

`dev_certified_publisher` 将原初始准入转换提取为内部共享函数，Docker 入口仍先 inspect，原生入口先验证自身完整配置。保留 advisory lock、初始空边界、epoch、admission revision CAS，后续暂停及被替代的 lease 不得通过初始化重新开启。原生入口同样拒绝 probe-only workspace。

新增 `verify_wallet_certified_publication.py`：独立读取 PG 完整有界 checkpoint 行、逐项按 PG 保存的 published versionId 读取源／副本，检查 COMPLETED／REPLICA、字节相等和 SHA-256；将回读 published blobs 再送当前原生证书校验；核对交易总数、committed marker 固定版本／高度及 PG 前后边界。

## 实链执行证据

- H0 `3tEPxLxUysGx4gfr8UEycvH7xohMWuwKVbTX5np4TCYj`，generation `dev-20261003-01`。
- 关闭 gate 时运行返回 `admission_closed`，through -1。
- 初始 admission request `1ad1d49a-0f16-53e8-9d87-08b5b3067e99`，revision 1，enabled true；仅认证发布准入，不是公开查询准入。
- 首次 once 返回 `published`，through／stagingHi 100；随后再次 once 返回 `idle`，未提高边界。
- 独立逐对象复验通过：0–100 共101个检查点、867笔交易，publisher epoch1，PG active、pending_hi为空。
- 源与同机副本全部指定版本／字节一致；committed marker version `8dd921f2-5a07-4648-a37c-0e3299b4b21c` 也已复制并核验。
- [结构化证据](../evidence/20261004-certified-publication.json)包含101项版本和摘要，无私有凭据。每次 publisher 原始诊断保留在 runtime 下0600独立日志。

## 测试与剩余范围

4项新增原生入口守卫通过：probe-only拒绝、非native源拒绝、产物构建证据漂移先于服务访问拒绝、已有配置或lease绑定变化拒绝。原有5项初始准入守卫通过：busy／superseded／later pause／非空初始边界／probe-only拒绝。

本批证明有界认证发布＋同机实际复制；不证明持续跟链、异机灾备、公开查询准入、accountHistory或Chrome试用。当前没有常驻native publisher；下一步接持续源／publisher生命周期，再接publication-guard与查询栈。旧authority引导入口默认要求准入关闭，已发布环境不应再调用其identity／replica引导阶段。Docker整栈生成器仍只接受source v2，不可把native目录伪装成Docker组件。

工作清单仍18/98；ENV／TRY未完整验收，不勾选。长期Python运行环境仍有LibreSSL兼容警告，本次真实TLS操作成功不代表该警告已处理。
