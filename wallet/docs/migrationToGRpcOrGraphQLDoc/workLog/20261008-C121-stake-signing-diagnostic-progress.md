# C121 质押签名前拒绝定位结果

原C119正常12组矩阵仍失败，前7组实际结果限定有效，第8组stake/ValidDuring在最终模拟前拒绝。按照[编码前方案](./20261008-C121-stake-signing-failure-diagnostic-design.md)完成两工具全源逆变换、单stake完整规范字节及12当前source-map日志点资格。首次离线资格误读expected.json而失败，原文件/失败01保留，只另存完整逆变换v2并通过资格02，不修改产品或旧方案。

[实际单场景诊断01](./20261008-C121-single-stake-signature-diagnostic-01.json)及[独立审核01](./20261008-C121-single-stake-signature-independent-01.json)通过：真实页面收到signDappPreparedResponse，512字节base64字符串长度、132签名字符串长度，请求至UI返回41290ms。实际dApp拿到当前质押ValidDuring签名，完整意图本地验签、同byte两规范模拟及一个原生验签、当前UI/worker源、原journal/密文/正常锁定/Disconnect均保持。租约在实际claim后的这次运行内成功发布，不能用它抹去原C118租约失败或C119整矩阵失败。诊断仅有公开ID/error/长度与不暂停日志点，所有值/响应原样；180秒close等待是定位标准，不是正常90秒或原30秒租约替代。

原失败此次没有复现、根因未确认，P121-1/2只计诊断完成。自有网关[原日志只读观察](./20261008-C119-current-owned-ingress-log-observation-01.json)记录三次上游connect timeout，其中两次GraphQL42031及一次archive42033，后者发生在失败组身份查询时段；仅是进一步定位连接路径的证据，不声称等于已确认根因。后续保留原完整12/39/12正常矩阵和全部原门重验，NFT业务验证继续第二阶段。原89/98、剩余9.18%、trial_ready=false保持。
