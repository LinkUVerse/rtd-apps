# C205 原站点权限恢复与 ENV-07 完整收口

用户明确答复“允许恢复测试前权限并继续”（call_ca3f3cabe8764ec59c0b82bc5ea02621）。通过普通Chrome原生扩展详情将独立C51的“点击时”恢复为“在所有网站上”，再次核验设置；没有新增域名或修改系统信任。

恢复后真正重新加载钱包，导出脱敏HAR并离线严格解析：UI 50/50完整成功响应，包含原生gRPC 28、HTTPS归档4、GraphQL17、账户接口1；其中5个原生和3个归档ServiceInfo、16个GraphQL创世摘要、1个账户覆盖响应完整核验同一H0。另通过正常设置表单只读预检，worker三个入口均HTTP200，两个gRPC消息的唯一grpc-status为0、GraphQL创世摘要相同。返回修改并关闭设置，没有保存下一版本2，原revision1保持。

当前钱包余额准入提示仍可见。本次证明入口、TLS和权限恢复，不把身份预检等同余额/历史覆盖或完整业务可用。UI/worker均未签名、Execute或发起业务写入。

## 审核与范围

`audit-C205-env-completion.py`逐项检查C202正确CA/错误SAN、C203权限取消、C204完整重启/撤权、C205恢复后真实响应及各输入SHA。独立完整收口报告为`20261010-C205-env-completion-01.json`。因此仅完成ENV-07，指定dev环境与浏览器协议8/8（100%），总92/98（93.9%）。QA-A19的demo网页CORS仍需要实际正反例；没有以扩展host permission替代网页CORS。

本轮只读环境守恒检查通过：36个指定进程、116个容器、24个必要基础中间件健康，原source/debug及其他容器启动身份保持。没有新起/杀死进程或清理仍有用途的容器。全重放与发布状态沿用C204历史观察，尚未在本轮重采，未声明推进到完成。

## 证据

- `20261010-C205-site-restoration-observation-01.json`：用户授权、原生恢复、配置保留。
- `20261010-C205-restored-ui-https-01.har`及`20261010-C205-restored-ui-audit-01.json`：UI完整50响应。
- `20261010-C205-restored-worker-preflight-01.har`及`20261010-C205-restored-worker-audit-01.json`：worker完整3响应。
- `20261010-C205-env-completion-01.json`：ENV-07合同与输入哈希汇总。

- [x] 权限恢复与原配置保留。
- [x] UI/worker实际HTTPS与完整同链响应。
- [x] ENV-07父项及细分包完整收口。
- [ ] QA-A19 demo网页CORS及独立完整矩阵。
