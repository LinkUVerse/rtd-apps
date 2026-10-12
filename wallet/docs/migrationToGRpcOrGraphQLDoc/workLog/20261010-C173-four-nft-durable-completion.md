# C173 四路 NFT 持久恢复验收（2026-10-10）

本次独立审核通过原 C162 durable 实测，不重签、不重播 Execute，不修改原证据。两次模拟、一次原 ImportedAccount 私有签名、一次被拦截的发送及实际冷重启后四路 pending 均有完整证据；重启后全部三个私有签名入口为零，实际转发 Execute 为零。三份 journal 与加密来源保持，14 个原对象及 gas 当前原生引用保持。

全部 626 个原 HTTP 实体和 4246 个中间事件逐个关联。一个 GetServiceInfo 浏览器响应重复副本读取失败明确保留：原实体完整持久化、浏览器 requestfinished、route.fulfill 完成、请求关联及浏览器原 content-length/content-type/H0 均实际一致，未补写浏览器 body。17 项真实缺证/篡改反例拒绝，包含重复副本的长度、ServiceWorker 来源、缺 bodyReadError 和 H0 篡改。原设计详见 [原实体与重复副本](./20261010-C173-original-entity-versus-browser-copy-design.md)。没有终态或原实体丢失的 C162 live、C166 失败结果仍不接受。

最终独立证据为 [independent-02](./20261010-C173-current-four-nft-durable-independent-02.json)，审核后所有输入哈希逐一再次核对。independent-01 生成时工具新增了反例，不能证明新 17 反例，保留历史，不作为本次完成依据。

本项完成 TX-04 的 four_durable 子标准（35%）；四路 live 和全部入口 M5 汇总仍待完成，原 TX-04 父任务尚未勾选。
