# TX-01：C21完整gas／赞助／有效期有限实测完成

当前源码1108文件，SHA f867a8d4d44ff1c7b578c7e041b488fd2759b569d4553f651f18b9edbada4715。按[实施前合同](./20261006-TX-01-authorization-matrix-design.md)与[首轮根因修复](./20261006-sponsored-execute-design.md)推进。

[实际第三轮](./20261006-TX-01-authorization-matrix-03.json)真实Chrome普通助记词／导入账户88项通过，四阶段正常账户创建／重启／恢复及所属观察收尾，实际4消息签名、6交易签名、14启用检查的模拟、0Execute；独立全新账户各一次V2注资，未重复注资失败profile。两账户分别验证默认gas准备、显式GasData的None有效期、外部owner且未来epoch5的只签名。当前链epoch4／price1000，显式budget100000000，各Coin当前引用从Fullnode读取。四个完整fixture最终BCS／批准digest／sender／owner／price／budget／payment及expiration全部一致，每份签名的同BCS正式模拟恰好两次。

两次外部owner execute实际收到后台“赞助交易需要完整多方签名授权，当前入口不能单独提交”准备错误，UI共同签名要求明确，批准button实体disabled、拒绝可用并返回拒绝；0 execute模拟、0执行派发、journal前后为空且完全一致。这不是赞助双签执行，也没有在未知执行后按错误字符串清记录。按钮加载期间文本不可访问与批准禁用分别核对，未把忙碌状态作为拒绝唯一证据。

[离线独立验签](./20261006-TX-01-authorization-matrix-audit-01.json)再次验证四个新增完整fixture的实际签名者、原BCS、gas、expiration／digest与模拟次数；其余2默认交易和4消息签名由实际harness SDK验证，二者范围分开。离线审核无网络、签名、模拟或profile打开。[当前版本来源](./20261006-sponsored-execute-revision-audit-01.json)重建C20源码SHA、核验五份旧源加两新文件、C20候选／ZIP原字节保持和C21源码／开发及生产构建／179份2525测试／完整类型／当前ZIP普通Chrome来源。

首轮C20执行拒绝收尾超时8模拟、第二轮C21按钮名称检查失败7模拟，各2个已注资账户、0派发，失败日志和两个完整profile保留，未知签名数不计。[失败留存审核](./20261006-TX-01-retained-failures-01.json)明确记录早先只按basename保存源码时主harness与helper同名冲突：两份helper原字节保留，完整主harness单独快照未成立；不能声称失败输入全部精确保存。第三轮改为完整相对路径的三份独立字节快照。首轮demo辅助字段比较失败日志保留；21项最终BCS比较通过。

G1–G5有限矩阵完成；TX-01父仍开放，内部全部币／NFT／质押链路和gas变化再次授权的实际完整矩阵仍需审核。普通C21成功提交正在另一个全新profile回归，不能用C20的两成功提交称为C21当前结果。普通Chrome三HTTPS仍TypeError，CA无变更；66/98、trial_ready=false。
