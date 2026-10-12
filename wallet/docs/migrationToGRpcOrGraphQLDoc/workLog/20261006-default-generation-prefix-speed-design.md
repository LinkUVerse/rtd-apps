# 新链精确前缀索引提速 F1–F6

原吞吐候选 96 次实际请求均通过，但 6/12 并发平均吞吐比仅 1.04，因此不安装 12 消费名额／16 准入配置。现有每次认证读多次重复扫描正式发布账本的完整前缀；改用已在真实 PostgreSQL 差分／篡改／清理测试中验证、且源码 SHA 仍一致的精确辅助索引。辅助表不代表缓存认证结果，所有实时账本状态、固定版本、SHA、副本及 mTLS 检查保持。

- [ ] F1：新 scope 独立 DDL 事务，锁内比对全部原 checkpoint 行 SHA 和 chain 行不变；实际只读 TLS indexed/fullscan facts 完全一致，提交后生成新 H0/bucket/catalog proof。保护两原生／两 publisher／旧六新六消费者／adapter／八 debug／keys/pending/config。
- [ ] F2：独立 immutable guard image FROM 精确当前 image，仅替换 ledger_snapshot 函数并添加索引读取模块和新 scope proof；AST 证明其他算法不变，image 字节和原 layers 保持，实际单元与真实原生只读正反例通过。
- [ ] F3：单独切换新 guard image revision；保留原 image/compose/证据；零 consumer 重启、不改持久数据、名额、租约、水位、Display 绑定。
- [ ] F4：实际并发认证读取与错误路径/未来/缺证书拒绝、实时 catalog 校验、持续持久水位观察；提速按实际数值记录。
- [ ] F5：索引进入 NFT seed/mint checkpoint 后，生产 WalletAssetReader 与真实 BCS/对象/collectibles/unsigned 两分支及 Chrome NFT 隐藏、PersonalKiosk、Display 回归。
- [ ] F6：四角色、核心交易链和当前产物绑定回归，更新总体进度；没有完整父合同证据不勾选 98 项父任务。

F1 实际 `20261006-default-generation-prefix-ddl-01.json` 通过：61,688 条原 checkpoint 行与全部 chain 行锁内不变；4.405 秒提交，新 H0/catalog proof；正式 published=60072，与实际 TLS readonly fullscan 完全一致。没有消费者重启或钱包交易。

F2 [build01](./20261006-default-generation-prefix-build-01.json)：image `554cdd2073510d8357d29fa279d4a155eae99a3ce1a442e690106df73ca91a18`；真实 image 24／host 34 单元通过，genesis／100／60072 exact SHA及三拒绝通过。F3 [finalize01](./20261006-default-generation-prefix-finalize-01.json)通过：apply01首次监听URLError失败保留，仅只读 finalize，不重复切换，零 consumer 重启。

F4 当前 [baseline02](./20261006-default-generation-prefix-baseline-02.json)实际48请求30成功／18容量拒绝；[after01](./20261006-default-generation-prefix-after-01.json)实际48请求24成功／24容量拒绝，成功吞吐5.258→3.098/s，不宣称整体加速。guard8和六现有消费 plus 六测试请求产生竞争，首次 baseline01错误要求48全成功而失败；真实503空body按门禁拒绝记录，没有重标记。新 [window01](./20261006-default-generation-prefix-window-01.json)consistent10333–17406、Ledger14580，尚未进入NFT54771。继续独立 indexed guard16 候选，要求认证点读取与真实名额竞争重新评估，不借旧全扫描候选的吞吐结论。
