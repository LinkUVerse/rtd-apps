# REL-03 包／配置回滚实施前设计

当前64/98，REL-03开放。只使用全新受控runtime浏览器profile与扩展安装目录，不打开或写入原七journal所属profile，不重启dev，不更换H0／generation。

- R1：原独立生产C19（无发布registry）→当前已审核生产候选03（有独立registry）→原生产C19，使用同一个安装路径与独立浏览器profile，保留相同extension ID。核验每次实际加载UI／background的字节，不能靠目录名证明更新。
- R2：通过真实扩展UI导入新生成且未注资的测试密钥，设置随机测试密码；保存加密密钥字段SHA及公开账户身份。后续重启应锁定，错误密码不可解锁或导出，正确密码解锁和在内存中比对导出密钥；不打印、复制或持久化明文密钥／密码。
- R3：仅在此新profile创建显式未来version3 journal，包含符合现有schema2结构的公共dummy pending记录。记录所有journal store逻辑SHA和版本。两产物都应拒绝打开未来库，recoverPreparedTransaction明确存储不可用，记录／pending／密钥不得删改。该fixture不是实际广播的pending或物理断电证明。
- R4：同四端点但错误完整H0的custom profile预检必须被实际Fullnode拒绝；保存的网络配置、加密密钥及journal保持。不得保存新错链配置、改generation、用失败预检返回值构建执行输入。
- R5：全过程抓包，禁止SimulateTransaction／ExecuteTransaction，零签名／提交；普通CA模式，无TLS例外、信任改动或真实资产读取通过宣称。保留每次失败及私有profile，不能删库绕过。
- R6：结合当前正式coordinator／journal／profile单测补充正常schema2 pending与错绑定暂停，更新回滚说明；实际库升级、旧JSON-RPC产物回退和未知schema转换不在允许范围。

全部规定范围验证完成才勾REL-03；不以可装载包或只读恢复代替所有资金业务验收。
