# TX-04 当前实际跨窗口竞争限定进展（2026-10-06）

父任务仍开放，**79/98，19项剩余，trial_ready=false**。产品源码保持 C28 的1113文件 / `4ccafc8f1fb55685171a6b1516aaae014e8324087a500ffc12d32e2d914a5a06`。本批只新增验证工具与证据；[入口清单](./20261006-TX04-current-entry-matrix-design.md)区分 live lock、durable pending 和各实际业务入口。

## 已验证

[当前币竞争06](./20261006-TX04-current-coin-lock-06.json)22项实际检查与[独立审核03](./20261006-TX04-current-coin-lock-audit-03.json)11项通过。新建受控profile真实UI导入原受控key7账户，使用 profile5；当前真实worker和两UI全加载JS与磁盘精确匹配。实际 Wallet Standard 可见批准及交易摘要固定后，在当前生产 source map 精确定位真实 account.signData 调用点，原始签名完成后仅延迟其返回，不导出密钥，不篡改原始字节或签名。第二实际币转账表单填写自己的真实地址和1原子RTD后显示“当前链账户正在签名或恢复，请稍后查看结果”，检查按钮禁用。同源 native ifAvailable 在两UI都实际拒绝相同 `[2,H0,generation,account]` execution scope。

[币/质押/赎回竞争07](./20261006-TX04-current-coin-staking-lock-07.json)28项实际检查与[独立审核04](./20261006-TX04-current-coin-staking-lock-audit-04.json)11项通过。第二UI进入真正质押及赎回路由，两者都在只读恢复原交易阶段显示同scope占用错误，不展示业务准备或批准按钮，native锁继续实际不可获取。[native当前受控持有预检02](./20261006-TX04-current-stake-owned-preflight-02.json)确认该账户当前确实持有 StakedRtd `0x388d0bfbac8ce867c21766eda5ea015760b8e0550adc6cffec8c598f683b8dc4`、当前Fullnode同H0、类型与owner匹配，非空全页。质押validator参数仍来自已留存历史夹具；恢复守卫在业务读取前拒绝，不把此案称为当前完整验证者、持仓或业务准备合同。

两次各只有原请求的2次 checks=ENABLED正式模拟、1份原只签名返回，**0 Execute／0公网／0证书修改／0打开原用户profile**。竞争入口新增正式模拟与signData调用均0。释放后原字节签名通过SDK独立验签，原scope实际可重新获取，原方法恢复，账户重新锁定。独立审核解码两组真正请求/响应帧，响应 transaction.bcs与原签名TransactionData一致、transaction.digest及effects.transactionDigest均与原摘要一致、effects.status.success=true。不会把缺失的响应顶层digest误判为无摘要。

运行器实际读取初始全部journal stores并断言空journal/pending，之后对held/final与初始作完整深比较；私有proof保存了held和final全部stores，未保存最初原始快照。独立审核可直接核验held/final相等与空journal/pending、SHA绑定的运行器比较断言；**不能声称独立读取了最初未落盘的快照**。签名和原始帧仅存在0600证据，不在控制台打印。

## 失败与未完成

- 竞争01、02：币表单12项已通过，但错误要求dApp可见界面展示底层互斥消息全文；实际授权UI使用统一费用失败提示。原工具/profile/输出保留。
- 竞争03：[原失败](./20261006-TX04-current-coin-dapp-lock-03.json)记录第二真实dApp批准禁用，后台返回“当前查询范围尚有未完成的身份或合同观察”，尚未达到测试期望的execution-lock错误。
- 竞争04：测试脚本路径错误，原[日志](./20261006-TX04-current-coin-dapp-lock-04.log)保留；没有执行该浏览器矩阵。工具工作目录引用错误已修正为绝对路径。
- 竞争05：[十次真实后台拒绝及只读原生准入快照](./20261006-TX04-current-coin-dapp-lock-05.json)保留，仍是身份观察pending拒绝。快照中identity tickets发生正常更替，owners为空；不能把暂时clear或快照推成全时段无pending，更不能把它归因于execution锁。没有手清pending、更新数据或产品逻辑。此轮13项不代表M1b完成。
- 独立审核01因缺少未落盘initialJournal字段失败；02把响应顶层digest当必有字段而失败。两[原日志01](./20261006-TX04-current-coin-lock-audit-01.log)、[02](./20261006-TX04-current-coin-lock-audit-02.log)及工具保留；03/04按真实protobuf transaction/effects字段和已记录快照完成明确范围的审核。
- native持仓首次命令只报告TypeError，未生成proof，不写通过；重试02明确转换BigInt并验证实际owner/type/H0后留证。没有声称已独立证明首次错误根因。

尚需当前完整dApp竞争、durable pending关闭窗口后的实际所有入口、NFT直接/NativeKiosk/Personal/OriginByte、当前完整质押/赎回准备竞争。M1a可单独完成，M1b/M2/M3/M4/M5及父TX-04继续；全矩阵完成前不勾选父任务。

## 追加09：第二dApp拒绝与过期原结果退出

[实际09](./20261006-TX04-current-coin-dapp-expired-09.json)28项与[独立审核05](./20261006-TX04-current-coin-dapp-expired-audit-05.json)11项通过。第二真实dApp popup加载字节独立匹配当前包，统一费用失败、批准禁用，后台明确在身份观察pending层拒绝；native执行scope是否被占用在该popup独立验证，不将其拒绝归因于execution lock。竞争没有新增模拟、signData或派发；第二请求拒绝、关闭后真实读取准入已pending0/fault0/owner0。

原真实signData仍仅1次私下完成；原返回实际继续持有31,264ms后释放进原始授权代码，原demo收到“网络准入记录未通过精确合同，已停止本次操作”，**0签名返回／0 Execute**，原scope随后确实释放，方法复原并重新锁定账户。30s只是结果egress lease的有效期，绝不是Web Lock占用TTL或偷锁依据。真实source中lease.capturedAt在signData之前，因此大于31s的原签名返回延迟已超过最大lease窗口；并发context变动亦可能失效批准，泛化state错误不用于宣称唯一根因。原批准TransactionData和两组真正ENABLED模拟帧的相同BCS、transaction/effects摘要与success均独立核验。最初／held／final所有journal stores本案全保存在proof，三份相等、journal/pending均空。

[原08失败](./20261006-TX04-current-coin-dapp-layer-08.json)完整20项、原始UI诊断和初始/held快照保留：测试错误要求长时间等待后原签名仍返回；原页面实际按准入合同拒绝而非签名返回，没有把其失败改写为通过。09单独证明过期结果拒绝合同，不代表原08恢复有效签名、硬件签名延迟、二次审批成功、full durable pending或所有业务入口。M1b的明确execution-lock拒绝限定仍未完成，父任务继续开放。
