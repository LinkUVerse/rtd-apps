# C163 独立审核器的原生 GasCoin 与重复副本校验补齐

C163 实测已通过 54 行、6 收款变化、282 原生模拟，11035 完整原实体、全部实际浏览器终态和三个私有入口零调用。首次独立审核在只读赞助 gas 对象上失败，原因是继承的 C84 nativeObjects 只允许 Move.type=Other；当前规范 BCS 的 GasCoin 是独立合法判别。该失败与堆栈保留，不重跑已完成的实际矩阵。

新 C177 nativeObjects 保留请求/对象ID、HTTP状态、重复对象拒绝、完整期待集合，并使用已有 C114 v3 的完整 Object/Move/Owner/内容/version/previousTransaction/storageRebate/typed digest/规范类型检查，支持 GasCoin、StakedRtd、Coin 和 Other。没有把 GasCoin 转写成 Other，也没有改变原始正文。

282 个浏览器重复响应副本读取失败原样保留；全部原始身份实体及中间事件已经持久化，全部请求有实际终态。新实体审核使用 C173 的严格原实体/finished/route.fulfill/绑定/实际长度/content-type/已有H0及grpc字段关联规则，每项失败均显式列出，不填造浏览器 body。除了原12项缺证反例，新增4项同改原报告与network记录的长度/ServiceWorker来源/bodyReadError/content-type反例。

只读审核通过之前不勾选参数矩阵或父项。新文件为 audit-C163-current-internal-nft-authorization-v3.cjs、C177-canonical-current-native-objects.cjs、C177-nft-complete-entities.cjs，原实测及独立01不改。

第二轮审核进一步发现赞助 GetObject 的实际 read_mask 未请求 storage_rebate。其完整 Object BCS 内真实 rebate=988000，protobuf 字段依约未返回。新 v2 原生对象审核器保留完整 canonical BCS，并仅对实际请求的 protobuf rebate 要求存在与相等，其他全量对象合同不变；不把未请求的字段填写成已返回。独立02和原v3解析器保留失败，新独立03使用 v4 审核器与原生对象v2。

第三次只读审核发现 C93 oracle 的 frameworkCap/personalCap 仅提供 objectId，不含 version/digest。v5 保留原 cap ID 验证，再以本次14对象中已经完整BCS/native核验的 fresh cap 引用逐字段验证实际 inputs；没有默认或凭空生成 version/digest。原独立03保留失败，实际RPC/字节均不重跑。

独立04已完整验证全部参数/BCS/效果，但全帧覆盖的旧审核错误假设六次收款检查全部排在54参数行之后；实测按每场景9行后立即做收款变化。v6 不重排原帧，逐captureId验证282帧唯一一一完整覆盖，并在每一行/收款变化内验证原准备→故障→重新准备的真实先后顺序。原独立04保留，新的05继续完整审核。

最终 independent-05 已完整通过，实际12缺证反例。此批282个未读重复副本均对应真实failed/cancelled终态，finished副本缺证为零，因此条件式额外4项未适用、不计为已执行。C173原durable的一项finished副本缺证才实际执行17反例。两个批次的数量与适用范围严格区分。
