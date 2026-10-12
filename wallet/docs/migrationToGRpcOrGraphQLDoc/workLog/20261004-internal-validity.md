# TX-01 内部批准页固定字节有效期

日期：2026-10-04。

## 发现与修复

dApp批准页已有TransactionValidity，但币转账、NFT、质押／赎回的内部批准页没有展示最终BCS的expiration。三个入口现复用同一组件，从prepared.bytesBase64解析；展示None、Epoch、ValidDuring／Validity及已有委员会约束文案。按钮与执行处理函数都检查canApproveTransactionValidity，无法解析或当前不支持的时间戳限制不允许继续批准。

币转账页面的Transaction.from原先在useMemo内无保护，准备字节损坏时先崩溃，无法展示准入错误；现捕获解析失败，transaction置空，保留有效期错误和禁用批准状态。不改字节，不自动重建／重试签名，也不把UI语法检查当成当前链epoch有效性证明。

钱包05与archive04执行章节同步相同合同说明。最终模拟、后台授权与持久协调器仍负责实际签名／提交边界。

## 验证

- 四文件36项通过：共享有效期组件8项、NFT表单10项、staking表单13项、币转账页面5项，见`20261004-internal-validity-tests-verified.log`。
- 三个内部页面新增实际React组件测试：精确显示9007199254740993；无效BCS与不支持的timestamp显示错误／约束并禁用按钮。NFT与staking继续断言此时不调用revalidate／execute。旧页面测试替身的reviewedBytes改为真实可解析BCS；未用模拟有效期组件绕开解析。
- 完整钱包tsc通过，见`20261004-internal-validity-typecheck-final.log`。
- Chrome币预览脚本增加有效期标题及None／maxEpoch可见断言；仍只预览返回，不点击发送。

## 新构建

最终开发Webpack成功，34630ms；Provider及四入口AST线协议审计通过。对应`20261004-internal-validity-build-final.log`、`provider-audit.json`、`wire-audit.json`。当前UI SHA256为9dc73b3cb54c97a5b7d74eb3b382c8f5317d249139c3936f5bcbdf0d38e68f11，后台仍5498869640f084dfda4cc0773995bdb58c9eb9a821206d67c88fcfa827a36c05；四入口摘要另存build-hashes.json。

## 实际 Chrome 币预览

新UI实际读取认证快照116171，1原子单位自转预览通过；有效期标题及对应None／maxEpoch内容实际可见，批准按钮可用，返回表单成功，账户锁定／密码／整浏览器重启通过。2次正式模拟，0批准、0提交。见`20261004-internal-validity-chrome.log`。

该测试复用现有compiled Local配置和精确dev证书SPKI例外；不代表普通CA／自定义host权限或NFT、staking实际批准页全部验收。未操作保留pending以重新发送。

## 范围

TX-01保持未完成：本批补齐内部有效期展示与批准守卫，未证明完整赞助、gas、请求绑定及全部实链授权矩阵。未执行链交易或修改dev服务。总体46/98，trial_ready=false。
