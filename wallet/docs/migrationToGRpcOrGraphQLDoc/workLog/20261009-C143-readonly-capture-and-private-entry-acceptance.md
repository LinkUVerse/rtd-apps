# C143 非NFT冷验收观察工具限定验收

一期所有非NFT验收优先；NFT专项仍后置。本批不打开任何旧钱包profile、不重跑C138 creator、不导入账户、不签名或执行交易，不修改C136产品源码/产物。完整非NFT M5及原98父合同继续保持。

当前C136空生产worker实际绑定三个私有signData入口，source-map定位回当前ImportedAccount/MnemonicAccount/ZkLoginAccount首条语句（TS第116/126/93行），完整实际Debugger来源字节与磁盘相同。真实无加密异步样例计数0→1→3，零暂停；三个生产入口空环境计数为零，工具自己的断点与临时内存状态正常移除，本工具空Chrome for Testing profile正常关闭。实际01及独立01/24反例通过；这里只证明工具，不把空环境零当原pending已零调用。

正文采集在实际route.fetch禁止重定向/重试、不覆盖原URL/方法/正文/头参数后，先完整保存identity entity，再尝试fulfill。独立保存原请求/原响应头数组、原正文base64/长度/SHA、所有中间记录和浏览器交付结果；128MiB是留存上限，Playwright内部缓冲不由本工具限制，不宣称已捕获压缩wire bytes。截断、超限、压缩encoding和未知/执行/模拟/验签/旧RPC/错误恢复digest封闭拒绝，不扩大C133白名单。

实际APIRequestContext/loopback测试02通过17用例、11普通fixture HTTP及一个单独固定digest fixture查询，保存86个事件。取消交付仍保留完整正面正文，断连和超时均只有一次服务器请求，401无凭据没有认证重试，302正文保留且拒绝交付、redirect target没有被访问，两个超限/一个压缩响应及六个禁止请求按实际拒绝。浏览器交付在此测试中是明确adapter，不能据此声称真实浏览器取消通过。实际01原错误302期望失败保留；helper v2只补拒绝交付302，完整两producer逆变换成立。独立01原漏拒中间实体变异失败保留；独立v2审核全部中间实体与最终SHA一致，独立02及33反例通过。

真实独立空Chrome for Testing测试02使用真实page fetch/AbortController和requestfinished/requestfailed：三份完整identity正文均保留（正常、落盘后取消、上游读取中取消），一个正常浏览器实际收到原正文；两个实际net::ERR_ABORTED且AbortError，取消请求没有被记成已交付。v3观察器要求实际requestfinished与fulfill共同成立，单凭fulfill返回不能接受交付。实际独立01/28反例通过，所有中间记录、同请求/正文SHA和取消相对时序一致。首轮本机地址解析配置失败01实际零服务器请求保持；v2只增加127.0.0.1 loopback例外，完整原源逆变换成立。自有临时浏览器与HTTP监听已正常关闭、数据留存；无原RTD/indexer/publisher/C139信号和新容器。

这三层证据是工具及独立fixture验收；原C138未知1417字节正文、旧失败、旧profile/creator/摘要保持。实际原pending冷验收仍须新的完整查询归属和fresh七门，再用原固定摘要做只读观察；直接三个入口真实计数及全部原正文/控制流程/journal/密文必须同时成立。P138-3/4、完整M5、普通Chrome/TLS/权限、物理归档/WAL/名称及原父项均未据此勾选。原89/98、细分剩余9.18%、trial_ready=false保持。

证据：20261009-C143-current-private-entry-observation-01.json / independent-01.json；20261009-C143-readonly-body-transport-01/02.json / independent-01/02.json；20261009-C143-actual-browser-cancellation-01/02.json / independent-01.json。
