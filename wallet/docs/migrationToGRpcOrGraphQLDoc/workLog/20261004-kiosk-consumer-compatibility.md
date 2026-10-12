# NET-10 Kiosk 消费对象与 Display 兼容整改

日期：2026-10-04。

## 当前源码核查

共享 core 完整类型检查本轮修改前已通过（`20261004-core-current-check.log`），不能继续沿用较早“core还有19条错误”的状态。Explorer 修改前仍101条诊断。

本地 SDK `packages/kiosk/src/query/client-utils.ts/getAllObjects` 已将现代对象 display.output 转为 KioskDisplay.data，错误映射成字符串；因此不是缺少 output→data 转换。真正的消费者不兼容是 KioskItem.data 内的 BCS Uint8Array、带 $kind 的所有权、字符串 Display 错误与 Explorer 旧 RtdObjectResponse 合同不同。旧 OriginByte 分支还将旧响应数组强制断言为 KioskItem。Display v2 的字段可以是结构化JSON，Explorer多处直接作为React文本或URL使用。

## 修改

- core 新增 `utils/explorer-kiosk.ts`，将原生 KioskItem 明确转换为已有 Explorer 展示 DTO，保留ID／版本／摘要／类型／前交易与Display数据、结构化displayError；缺失对象或ID／类型不一致直接失败。该DTO不包含推测出来的Move JSON或所有权，不用于构建交易。真实调用消费者核对为Explorer OwnedObjects。
- core旧useGetKioskContents两分支统一展示合同；OriginByte移除Promise数组类型断言，缺失Kiosk对象拒绝；原有disableOriginByteKiosk参数现实际跳过该分支。
- Explorer四种藏品展示和图片排序只消费字符串字段；详情卡片使用不修改原始数据的文本投影，结构化元数据仍保留在原对象上。
- 视频解析使用明确类型优先，修正原`??`与三元运算结合导致显式Move类型误判为package的问题；只允许已认可包和字符串video_url。
- 选择Kiosk时，其读取错误显示错误，不再自动切回普通资产列表；普通视图仍使用自己的查询状态，未选过滤器默认普通视图。

钱包继续使用独立WalletRpcContext领域hooks，本批未给钱包加入旧协议fallback。未修改链API或双方迁移技术合同。

## 验证

- 两文件18项测试通过：现代Kiosk对象展示转换、缺失/错ID/错类型拒绝、部分Display错误、结构化值拒绝作为文本、视频包校验、真实React Query hook禁用OriginByte/缺失对象错误，以及既有core显式注入。`20261004-kiosk-consumer-tests-complete.log`。
- core与wallet完整类型检查通过：`20261004-kiosk-consumer-core-complete.log`、`20261004-kiosk-consumer-wallet-complete.log`。
- Explorer完整类型检查仍退出2，诊断 **101→79**。去掉位置行列后无新增诊断：`20261004-kiosk-consumer-before.log`、`20261004-kiosk-consumer-explorer-complete.log`、`20261004-kiosk-consumer-diagnostics.json`。
- 首次core检查因闭包内kiosk.data可能为空出现1条诊断，改为先保存已验证kioskId后修复，失败日志保留`20261004-kiosk-consumer-core.log`。中间Explorer日志保留，不替代最终检查。
- 现有四入口产物Provider审计通过，Explorer context不可达：`20261004-kiosk-consumer-wallet-audit.json`。本轮未重新构建钱包；这仅是现有产物隔离检查，不是本轮新构建证据。

未启动或变更dev服务，未签名/提交链交易；未进行Explorer浏览器渲染验收或完整生产构建。NET-10仍未完成，旧Kit及剩余Explorer诊断继续处理。总体46/98，trial_ready=false。
