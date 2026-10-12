# C201 交易活动页准入阻断状态反馈

普通Chrome活动页持续loading，余额随后已可读。源码确认history hook在walletReadAllowed=false时禁用query，但CompletedTransactions仍只根据isPending画loading，缺少与余额页同等的准入阻断反馈。先确定性复现后，仅修正页面反馈；不放宽准入、超时、覆盖、权限、签名或历史完成条件。

- [x] P201-1：回归复现checking/observed/unavailable三种准入阻断状态下无尽loading，并保护旧缓存不展示。
- [x] P201-2：中英提示及只影响history的准入判断，允许后恢复正常窗口/覆盖提示；定向回归和类型检查。
- [x] P201-3：完整生产构建/closure及普通Chrome实际新构建验证；已安装C198证据仍按C198来源保留。

## 修复与验证结果

修复前7项中3项分别在checking/observed/unavailable阻断状态失败；修复后活动页7项、history hook3项、读取准入10项、账户reader33项，共53/53通过。RPC与生产类型检查均exit0。1122原产品文件中仅3个生产UI/翻译文件和1个测试文件变化，1118文件不变；3个生产文件精确删除新增内容即可还原C198哈希。完整后台790个source-map模块集合及内容保持。

新C201构建source=6d51c28fe7e3b63b0725f9069b69f5a935a52f7d894eef3ae7b1dd8cd3beff9e；完整5285模块/2036源/7脚本闭包通过，manifest/profile/发布声明/权限不变。C198与C201的后台打包字节不同，首次资格检查对此拒绝的事实保留；随后明确逐模块核验，不能把源码相同称为bundle字节相同。

用户已明确批准原路径更新并实际完成；C198完整保留，实际普通Chrome UI/worker静态字节均核验一致。用户再次解锁后，活动页实际返回覆盖窗口及空结果；未直接观测阻断提示分支，该分支保留53项定向回归证据。旧C198/C188实测仍按原构建来源使用，不能称为C201实测；原依赖完整源码相等的历史工具不可直接套到新C201，须明确采用本次UI变更资格。

证据：20261010-C201-source-and-checks-01.json、ordinary-upgrade-prepared-01.json、20261010-default-generation-positive-C201-build-01.json、closure-01.json，及53项回归/两类型日志。
