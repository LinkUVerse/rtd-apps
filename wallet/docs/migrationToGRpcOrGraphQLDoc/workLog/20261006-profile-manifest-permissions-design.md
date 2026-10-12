# 内置 profile 打包权限 M1–M5

真实 C28 配置回退01在预检失败，实际permissionBefore=false；未保存配置、未播种future journal、0模拟／签名／Execute。此前“localhost已由manifest授权”的假设不成立，不能记为通过。当前manifest仍是旧5001／旧域名，与06文档要求“由profile需要的受控origin生成”不符。

Chrome官方[跨源请求](https://developer.chrome.com/docs/extensions/develop/concepts/network-requests)要求扩展UI／worker声明host permissions；[匹配规则](https://developer.chrome.com/docs/extensions/develop/concepts/match-patterns)包含可选端口，host权限忽略path、使用/*。据此内置权限只来自实际已配置、完整验证的built-in profiles，不默认授予任意custom origin。外部导航URL不计为fetch权限。

- [x] M1：完整profile校验／origin提取与custom申请共享相同纯函数；未知／无效registry拒绝，不留旧域名fallback。
- [x] M2：Webpack使用与客户端同一dotenv实例的有效registry生成host_permissions（相同defaults／系统优先级／expand）；实际生产环境系统registry编译一致通过，不冒称已单独执行所有.env组合。
- [x] M3：旧静态权限移除；13新增／43定向及184文件2586全量单测通过，RPC与完整钱包类型检查通过。不同端口／同origin合并／faucet／explorer隔离／非法及空配置均有定向用例。
- [x] M4：原dist与C28保留；[C29生产01](./20261006-default-generation-positive-C29-build-01.json)0错误／2既有warning，1116产品文件SHA ab6a6b6a...；[闭包01](./20261006-default-generation-positive-C29-audit-01.json)5283模块／2035源码／7JS／39旧方法审核通过。manifest只有实际Local五个端口origin，原RTD源码与8debug不改。
- [x] M5：实际新包Chrome权限contains与四角色只读、真实custom revision回退及拒绝合同；普通Chrome可选权限新申请／原HTTPS仍独立验收，不以manifest新增已知内置origin代替用户批准未知origin。

只修06已规定的打包缺口，不取消custom用户手势、身份预检或revision规则，不改keys／journal／旧产物／RTD源码。索引有限追平并行继续，父项重新按当前证据审计；旧C28验证保留为旧产物范围。

M5当前实际[权限01](./20261006-positive-C29-origin-probe-01.json)、[严格Origin审核](./20261006-positive-C29-edge-audit-01.json)、[四角色Chrome](./20261006-positive-C29-assets-chrome-01.json)与[配置／包独立审核](./20261006-positive-C29-rollback-audit-02.json)均通过限定合同。新origin实际测量后只替换owned edge，保留C28白名单和原Account TLS；普通Chrome的任意custom新权限与原HTTPS仍没有验收。
