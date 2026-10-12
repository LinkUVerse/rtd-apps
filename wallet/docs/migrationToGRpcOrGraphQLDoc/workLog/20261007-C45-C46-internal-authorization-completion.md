# 内部授权实际回归与错误处理修复

当前 98 父项仍 **84/98**，`trial_ready=false`。C44 是当前安装来源；C45 是修复后的源码构建，C46 是相同产品源码、仅三个独立测试入口的临时实际 Chrome 构建。不能将 C46 回归称为 C44 已升级，或把三个内部 unsigned 场景代替完整 NFT／赞助／有效期／资金父合同。

## 已实际完成

- [C44真实页面02](./20261007-C44-internal-gas-authorization-chrome-02.json)与[独立01](./20261007-C44-internal-gas-authorization-audit-01.json)：币、质押、赎回三原预览／克隆 GasBudget+1000 拒绝／Back 后新 requestId，原批准与空 journal／密文保持。15 ENABLED 真实模拟，9 原始／故障帧、6规范 effects 和9补充 native 原帧独立审核；原1015私有文件保持、重锁／Chrome退出，零签名／Execute。
- 实际币 Send 按钮调用 mutateAsync，原错误由 onError 提示后仍以 Promise rejection 返回到点击回调。真实 Chrome pageerror 与[有效红灯03](./20261007-coin-revalidation-rejection-red-03.log)均复现：6个断言通过，但1个 unhandled rejection 使进程 exit1。修复只将按钮改为 mutate，既有重校验、批准 bytes、onError 和后台执行顺序保持。[44测试绿色02](./20261007-coin-revalidation-rejection-green-02.json)通过，0 unhandled；[精确全来源差异02](./20261007-C45-coin-error-delta-independent-02.json)反向重建全部1120个原 C44文件，仅页面一行与该页面回归测试变化。行为依据：[TanStack官方 mutations 文档](https://tanstack.com/query/latest/docs/framework/react/guides/mutations)，mutateAsync会抛出拒绝；事件回调使用已有 onError 的 mutate 流程。
- [C45构建01](./20261007-default-generation-positive-C45-build-01.json)／[独立闭包01](./20261007-default-generation-positive-C45-audit-01.json)：5285模块、2036源码、7脚本包，production0errors／2warnings。五权限与实测 fpnlgngdmnpfkbokmdhjgldhokkkhojp（以[原JSON来源](./20261007-positive-C45-origin-probe-01.json)为准）；新来源实际403，尚未在当前 C44网关准入。
- [C46受控配置独立01](./20261007-C46-controlled-transport-release-independent-01.json)：只改变三个 loopback 端口及显式独立绑定，六个合约版本／模块／原生证书与所有原输入pins保持；新旧绑定相互拒绝。[C46构建03](./20261007-default-generation-positive-C46-build-03.json)／[完整闭包03](./20261007-default-generation-positive-C46-audit-03.json)与 C45拥有相同1120产品来源 SHA `a03cb96c62e2ae6d7908a8506fc1411a0e92aa1a0cb27b69f49783659ab12521`。
- [自有临时网关启动01](./20261007-C46-isolated-gateway-started-01.json)只使用空闲41957／41958／41959与实测 `kiahlcbejlgmnbmcggnhagbccojnbkaa`；只读挂载原CA／client mTLS和固定nginx image，原三真实 HTTPS 后端、methods、body与未知路径规则保持。nginx -t 的一次性容器自动回收；原29／14及所有前继不替换。
- [真实21帧规则独立01](./20261007-C46-isolated-gateway-live-independent-01.json)：三入口200、18个方法／来源／路径规则检查。三个空体 Execute 路径探测均404、没有匹配执行上游；单独计为 denial probes，不能隐去这些请求。[空Chrome三入口01](./20261007-positive-C46-transport-chrome-01.json)及[规范原帧独立01](./20261007-positive-C46-transport-chrome-independent-01.json)验证实际 H0、unary完整protobuf／status0 trailer及account覆盖。
- [C46三内部实际页面01](./20261007-C46-internal-gas-authorization-chrome-01.json)／[独立02](./20261007-C46-internal-gas-authorization-audit-02.json)：12检查、15真实ENABLED模拟全部独立审核，9规范最终effects／6实际Gas选择／9补充native原帧。实际克隆故障保持原批准、真实拒绝、Back后新requestId，**pageErrors为空**；零签名／发送／原profile／CA操作。币场景新预览由既有 onError query refresh 在Back前生成，第二次Review批准它；该场景重复Review片段0帧，完整两帧实际存在于全局原收据并按BCS／digest关联，未声称额外发起模拟。质押／赎回各在Back后重做两帧。
- [临时网关正常清理01](./20261007-C46-isolated-gateway-cleanup-01.json)／[独立02](./20261007-C46-isolated-gateway-cleanup-independent-02.json)：只停止自有实例，actual exit0后精确rm；inspect／logs／配方保留、三端口空闲、原全局Docker配置／Mounts／Image／StartedAt和29／14保持，无force／卷／镜像删除。累计确认退役人工清理 **48**。
- [最终环境01](./20261007-C44-runtime-C45-final-environment-01.json)：29钱包容器运行／14健康、原29进程／listener、两原链／最新源码八debug、1015私有文件保持。观察全局110＝105运行／5退出；外部容器状态按实际记录，不自行清理5个用途未确认退出实例。

## 保留失败与范围

C44 browser01读取 React旧alternate root造成2批准断言失败；v2改为 committed root，旧记录保持。组件red01／02的 overlay title／未挂载节点断言错误原记录保持；red03的6断言全部通过而真实未捕获Promise使失败，才是产品缺陷证据。

[初始端口前置失败](./20261007-C46-isolated-gateway-prepared-01-failure.json)、[原绑定拒绝／CLI环境分析](./20261007-C46-release-binding-failure-analysis-01.json)、[启动工具unpack失败](./20261007-C46-isolated-gateway-started-01-failure.json)均发生在容器创建前。原实现保留；受控新配置及v3启动没有绕过绑定或来源。C45差异独立01漏掉两列缩进变化，02完整原聚合重建通过。C46原帧独立01误要求币Review后额外两模拟帧，02按完整原15帧真实BCS关联并说明事件时间。清理独立01的Python3.9纳秒时间解析失败保留；v2按完整原timestamp的Decimal秒精确比较，没有额外Docker操作。

[自然观察01](./20261007-C44-publisher-handoff-watch-01.json)30分钟结束，无activation／信号／切换。[新鲜窗口04](./20261007-C44-publisher-successor-window-04.json)正式401214／pending434325、prepared33111、原publisher working，自然边界不成立。[七覆盖11](./20261007-C44-nonempty-kiosk-readiness-11.json)仍未覆盖424677；自然终态、pending=null、native-current、minimumCheckpoint、S+20及完整资金门不降低。C44构建未原地覆盖，C45／C46未正式交付；继续正式publication恢复、完整NFT／赞助／expiry／UI／普通CA和其余14父项验收。
