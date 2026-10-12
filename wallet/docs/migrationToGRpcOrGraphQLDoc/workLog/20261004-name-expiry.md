# RPC-21 名称确认有效期补充

状态：局部编码与回归已完成，RPC-21尚未勾选。

## 问题与修复

Coin和NFT签前重新解析名称后仍需等待交易模拟，原实现未在模拟完成时检查名称结果有效期。现在入口拒绝非有限／已到期结果，模拟结束再次检查解析结果保存的单调时钟期限；到期要求重新预览。Coin同时在模拟返回后复查取消信号。没有重建bytes、签名或提交交易。

## 权威与文档

本轮在线读取固定 Sui 源码 `c860146823abcedef45a1b5a9c766920be98a29c/crates/sui-name-service/src/lib.rs`，核对 NameRecord BCS字段、叶节点父NFT关系和严格小于的过期条件。钱包期限属于额外保守策略，未把它误称为链上规则。钱包04和archive03同步补充。

## 验证

- 97项定向测试通过，包括Coin和NFT模拟期间期限耗尽时拒绝继续的新回归。
- 完整钱包tsc退出0。
- 修改后全量99文件1057项测试通过，包含上一批历史／收据页面变更。
- dev Webpack构建成功（33.919秒），四入口静态审计通过；见20261004-name-expiry-webpack.log及20261004-name-expiry-built-audit.json。文档完整性验证通过，不替代动态网络抓包或运行验收。
- 日志：20261004-name-expiry-tests.log、20261004-name-expiry-typecheck.log、20261004-name-expiry-full-regression.log。

## 尚未验证

当前保存的dev profile未配置名称registry，本轮未部署名称合约、未做名称实链发送，未执行Chrome扩展完整验收。任务总体仍29/98，trial_ready=false。
