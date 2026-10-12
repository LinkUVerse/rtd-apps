# F2c.2b当前SDK＋native存储观察协调：编码前设计

上轮[实际收口](./20261005-network-admission-observation.md)的2317全量／32新增和原ticket控制流已经完成。当前120源码直接哈希未变；本轮只新增isolated browser harness和执行器，不改生产源码、旧证明、SDK或部署／journal。先存本设计，不计验收。

1. 用隔离Chromium profile及回环CSP页面，实际生产observeReadCapabilities／ReadSession／NetworkAdmissionStore／ReadAdmission、原生IDB strict事务和WebLocks执行。SDK读合同以明确合成protobuf／BCS夹具响应验证，禁止外部网络；只配置Fullnode，GraphQL／Archive／Account保持unconfigured，不冒作四入口或链上验收。
2. 正常真实SDK＋IDB begin先提交、完整有限报告才complete同原ticket；capture读回pending空、Fault空，不作为签名授权。多context读取门槛在producer pending时拒绝新事实；取消和迟到响应不空complete，新实例／正常浏览器重启保留pending。
3. 在真实put之后注入native tx.abort，分别验证普通正常完成及明确错链负面完成失败。前者不可发布报告，后者保持quarantined局部视图，原pending仍持久；没有第二次空complete。真实错链与在途兄弟请求竞争保存全局负面；default production store也覆盖，不用memory替代。
4. 输出仅固定case名称、协议请求／Fault／pending／业务回调计数、有限视图phase；不得输出profile／地址／账户／交易字节／签名或keystore。所有失败保持case／有限错误名及临时浏览器profile，成功才清理。无扩展安装、物理崩溃／掉电、真实链请求或新交易，已有C9／回放PID66145保持。
5. 原生合成协议验证通过只补当前SDK＋native观察协调有限证据；后台同审核ABI、最终原子授权竞争、四入口／normal CA／当前扩展核心Chrome继续待，父49/98、trial_ready=false不预提升。
