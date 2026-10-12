# C203 普通 Chrome UI/worker HTTPS 与权限实测

C201 已保存同链自定义配置 c51-tls-acceptance revision1：fullnode41750、GraphQL41957、archive HTTPS41903/archive、account41959/account/graphql，H0与原测试链及合约配置一致。未保存localhost revision2候选。HTTPS127.0.0.1/localhost两次权限弹窗在工具返回外部窗口变更后进入允许预检路径，未把这两次计作代理点击拒绝或显式文本授权。没有自动修改Chrome profile数据库。

- 后台原生Service Worker Network导出HAR：20261010-C203-ordinary-worker-preflight-01.har。后台实际background.js发起3条请求，完整GraphQL H0及两个gRPC正文/唯一grpc-status:0 trailers通过离线审核。证据20261010-C203-ordinary-worker-audit-01.json。
- UI原生Network导出HAR：20261010-C203-ordinary-ui-https-01.har。60请求，57完整响应逐方法解码/GraphQL解析成功，3不完整明确排除。7原生及4归档ServiceInfo同H0、19GraphQL创世和账户覆盖检查成立；未把全部请求计成功。证据20261010-C203-ordinary-ui-https-audit-01.json。
- 新候选https://127.0.0.2权限弹窗使用Escape取消，实际显示“未授权网络服务地址，配置未保存”。关闭并重开表单，原https://127.0.0.1:41903/archive和下一revision2保持；候选没有保存。
- C201新增活动页阻断提示在切网及重载期间实际可见，随后可回到覆盖窗口/空记录；更新先前仅有定向回归的边界，不覆写早期观察。

原生UI事实：20261010-C203-custom-profile-permission-observation-01.json。普通完整浏览器重启后证书/配置持久性正在C204补验；尚未据此勾选ENV-07。QA-A19仍保留demo网页CORS等完整合同，不以扩展host权限代替普通网页CORS。
