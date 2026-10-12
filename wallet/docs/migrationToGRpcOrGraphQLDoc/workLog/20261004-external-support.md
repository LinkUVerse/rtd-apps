# RPC-25 法币与硬件入口清理（2026-10-04）

## 实际缺口与修复

useOnrampProviders原先仅以远程wallet-onramp开关控制服务商探测，且可复用旧provider缓存；没有RTD实际网络／资产／结算对接证据。按照现行方案的未验证服务不宣称可用要求，新增本地RTD验证门槛false，远程开关不能单独启用。即使旧Query缓存返回MoonPay／Banxa key，hook仍返回空providers；不会访问服务商探测端点。直接访问法币页面显示中英暂不可用说明，普通资产页不会显示可购买入口。原服务商适配保留以供未来专门验收后启用，未对外执行任何购买。

Ledger的AccountType和factory没有硬件实现，却残留表单联合类型、创建mutation、ProtectAccountPage允许项、createAccounts消息类型。现已移除这些无效分支，没有更改已有账户数据库。首次类型检查指出ProtectAccountPage残留，补齐后完整钱包类型检查通过。

Qredo仍保留账户／连接和远程只读数据，本轮核查后台execution作用域会拒绝非isSigningAccount对象；未新增或宣称远程签名能力。其页面支持状态及所有远程入口的完整审计仍待补齐，RPC-25不勾选。

## 验证

真实React Query hook回归：功能开关true且预置旧provider缓存，仍返回unavailable=true与空providers，服务商功能查询和fetch调用为0。20261004-external-support-tests.log通过1项；20261004-external-support-typecheck.log为最终完整钱包类型检查，退出0。这不代表真实服务商、Ledger设备或Qredo远程验收。

最终开发Webpack构建成功（26.412秒），四入口产物静态审计通过，见20261004-external-support-webpack.log和20261004-external-support-built-audit.json；未替代Chrome或外部服务验收。
