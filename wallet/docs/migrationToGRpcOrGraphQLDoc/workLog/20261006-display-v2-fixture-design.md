# RPC-03 当前 Display V2 直接 NFT 夹具

当前78/98；已有MigrationNFT未创建Display，因此当前实际display=null符合链事实。不得为了通过验收把该对象伪造成有图NFT。

依据[Sui官方Display V2](https://docs.sui.io/develop/objects/display/display-overview)与[创建Display](https://docs.sui.io/develop/objects/display/using-display)，已核对当前RTD框架同名模块；实链只读预检01确认new_with_publisher/set/share和共享注册表0xd实际存在。新夹具只从当前RTD框架及debug CLI构建，脚本与Move源均位于link-u-smart-contract/all-in-one-deploy/localDeploy。

- [x] D1 当前源码HEAD/diff/变更文件、安装debug来源、实际ABI/H0及独立材料目录绑定；编译Display V2夹具。
- [x] D2 最终publish bytes经正式启用校验的原生模拟、签名前同链复验；原摘要/pending耐久保存后只dispatch一次；异常只恢复原摘要。原夹具/合约不覆盖。
- [x] D3 原发布成功回执/Publisher/新package ABI复核；独立setup_and_mint一次性创建V2 Display、两件直接拥有NFT（本机图片和空图片），只使用已控制的dev账户；0公网请求。
- [ ] D4 等实际认证GraphQL覆盖到mint checkpoint后固定S读取Display、owner、全分页与分类；当前C26 Chrome实际图/缺图、详情、隐藏/取消隐藏/重启保持，以及0旧RPC抓包。
- [ ] D5 全部RPC-03原合同独立审核，源码/产品/证据原字节留存后才能勾父项；不据此代称全部Kiosk转移、TLS或最终试用。

设计时的零执行状态保留于历史记录；当前D1–D3已有真实单次发布／铸造和原摘要恢复证据，见[进展](./20261006-display-v2-fixture-progress.md)。D4／D5没有勾选，原pending和运行数据库保持。
