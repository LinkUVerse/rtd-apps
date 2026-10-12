# C31 Kiosk 复合读取期限

依据当前 C30 实际 QueryCache 15 次采样：session/快照 61401 固定、准入 observed/无 blocked，wallet-kiosks 20 秒后 TimeoutError。直接当前生产 reader 的只读耗时诊断 02 在 source kiosk 失败，25 次完成的 HTTP 请求中连续 GraphQL 约 1.1–1.7 秒。两种独立路径均失败，不把旧 180 秒浏览器轮换归因全部归结于这个问题。

- [x] K1：完整 Kiosk/native/discovery/OriginByte 复合集合期限改为 60 秒，各嵌套分支继续合并外层 signal；单次 HTTP 期限、4 个实际并发 permit、完整分页、owner/BCS/登记/Display/最终快照复核保留。
- [x] K2：实际复合入口 21 秒慢 ownedObjects 仍完成；调用方取消立即终止；60 秒截止拒绝、不暴露部分成功。全相关测试及类型通过。
- [x] K3：当前 source 独立生产 artifact/闭包/精确 Origin 配置/真实 UI 与 worker，真实 indexed Kiosk 两个条目和 direct NFT 展示。
- [ ] K4：C31 当前 pending/cancel/recovery 与完整业务矩阵回归；98 父任务不能仅凭 K1–K3 关闭。

权威调度依据：[TanStack Query 官方 polling 文档](https://tanstack.com/query/latest/docs/framework/react/guides/polling)。本次属于客户端有界复合读取期限，不修改 Sui/RTD Kiosk 合约语义或服务实际覆盖水位。

第一轮相关 4 文件 73 测试通过。完整测试第一轮 2597 通过/1 失败，失败为既有 network-capabilities 总 deadline 用例的真实墙钟断言（552.55ms 超过 525ms）；该用例已观察 TimeoutError 与正确身份请求数之前停在墙钟断言，不将其抹去或记整套通过。RPC 和完整钱包类型检查均 exit0。当前生产构建执行后，将复测该 deadline 用例及完整测试，保留第一轮材料。

[编码核验01](./20261006-C31-coding-verification-01.json)：第二轮完整 184 文件 2598 测试通过，相关 4 文件 73 通过、单独 deadline 22 通过、两套类型 exit0、独立构建/闭包通过。第一轮墙钟失败与修改前慢集合失败保留；K3 当前真实 Chrome 仍执行。

C31 Chrome NFT01 实际通过12检查：精确当前UI/worker、独立空journal受控profile导入、真实Local/余额/共同快照、OriginByte card/两件内容/direct无Display非视觉列表、正常锁定与journal不变、0公网或旧RPC或页面错误/0模拟/0签名/0Execute。隐藏持久化、Display正面与转移仍开放，K4未完成。
