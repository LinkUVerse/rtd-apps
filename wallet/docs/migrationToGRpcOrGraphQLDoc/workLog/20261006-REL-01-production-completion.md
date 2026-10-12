# REL-01：实际生产依赖与全部输出审计完成

按[实施前范围](./20261006-REL-01-production-design.md)，[production构建03](./20261006-REL-01-production-build-03.json)实际exit0，1084份产品源码SHA36698f9a与当前C16一致，源/profile/launcher稳定；原dist所有文件逐字保持。生产输出在独立私有production-extension-20261006-03目录，未替换已加载C16、未上传source map、未进行服务或交易操作。生产manifest不携带开发固定key，不能据此冒称其扩展ID、安装及浏览器功能已验收。

[完整审计05](./20261006-REL-01-production-audit-05.json)实际exit0：四入口及四个输出JS、所有配套source map、5780条展开模块记录（含嵌套/重复归属记录，非5780个唯一模块）、2005份去重或按入口区分的源码内容。39个旧RTD线协议方法及对应Sui拼写、旧transport/Kit、旧客户端调用、测试/fixture、raw源码缺失和输出变动均受检查。Webpack compilation-graph摘要和全部文件清单绑定构建证据；入口到chunk完整核对。审计输入的源码、文档和构建证据固定摘要，执行前后不变。

唯一jsonrpc属性例外是精确@metamask/utils/dist/json.cjs的结构校验schema，实际源码未含fetch/XMLHttpRequest/WebSocket调用；它不是网络请求器。四chunk SHA：background0945203c、UI fc6602fd、content-script3ed62fd3、dapp-interface dce5fda9。[7项反例测试03](./20261006-REL-01-audit-tests-03.log)实际通过，覆盖全部旧方法别名、藏入新增源码的旧请求器/alias、fixture、validator新增网络调用、嵌套及被折叠模块、TS泛型与TSX、增加/变化chunk及symlink。

原失败保留：audit01将原始TS泛型按TSX解析拒绝；audit02发现2967个orphan模块被默认统计折叠；补显式orphan/dependent/runtime/cached和无限统计空间后重建03；audit03发现Webpack各入口bootstrap共享相同map名但内容不同。最终逐个审核所有runtime内容并按入口计数，原应用源码仍要求跨chunk一致。build01/02均为实际成功编译，但图不完整，未据此收口。此前构建和审计脚本字节均保留。

production构建有3个Webpack体积建议warning（background1.46MiB、UI3.74MiB及entrypoint建议）；默认.env缺失、旧Browserslist数据和Tailwind歧义提示也保留，未改写为无warning。compiled Local profile逐字匹配既有revision2，仅是配置一致性；不代表部署权限或真实网络准入。

REL-01静态合同完成，父计数55/98（56.1%）。此证据证明当前生产依赖与产物的旧请求器/Kit闭包，不证明动态拼接请求的所有实际流量；完整钱包功能抓包仍由REL-02负责。正常CA、最终dApp出口授权、共同S、全部接口/TRY/QA仍开放，trial_ready=false。
