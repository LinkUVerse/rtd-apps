# C129新质押发送方授权及双签执行验收

P129-4限定完成：本次新的普通质押经过真实Wallet Standard sign-only Approve返回一个发送方签名，外部仅一个新赞助签名和一个Execute，checkpoint1028207确认；新StakedRtd为0x15086509841a6a386d5cebd033d37a887c49caa4c691650476e71107a1f1e3ea，本金1000000000，pool为原已确认active validator池，activationEpoch3/执行epoch2。发送方Coin和总余额只减少本金，赞助方Coin和总余额只承担实际gas3417104。原C43仓位完整规范Object字节未变，未参与changedObjects。

[发送方实跑01](./20261009-C129-fresh-sponsored-stake-ui-01.json)保留passed=false：377已捕获响应、两完整同byte ENABLED模拟、一次原生Verify和一个实际签名均已完成，末尾因启动阶段一个GetServiceInfo正文不可捕获而失败，原因未确认；不能写成整轮全部响应捕获通过。已fsync保存原approval-before/sender-signed及stock-after/runtime-before-after，未重签或重复批准这个digest。[只读后查](./20261009-C129-stake-sender-current-source-01.json)重新实查相同受控profile实际UI/worker加载字节、账户锁定/密文、空journal及无待签请求、实际当前链身份，0模拟/验签/签名/Execute。[独立发送方授权](./20261009-C129-delivered-stake-sender-independent-01.json)只接受实际发送方交付及全部关键原帧/规范bytes/原生验签/旧模板两ref唯一逆变换，10篡改事实拒绝；fullUiCaptureAccepted=false、原全采集失败保持，旁路缺帧不算已捕获或验证。

[实际执行03](./20261009-C129-fresh-sponsored-stake-executed-03.json)通过；早期v2从失败UI摘要读取未保存字段，在fetch/key之前拒绝且execute目录空，失败和空目录保留，v3只从原fsync delivery/native记录读取，用唯一execute-v3目录，先固定digest未提交核验、fresh原七门、原refs/stock/epoch/activepool，再一次赞助签名/双方同byte原生验签，独占fsync pending和dispatch-intent后唯一广播。确认仅固定digest读取；无自动重发。[独立执行01](./20261009-C129-sponsored-stake-execution-independent-01.json)核验25原生帧、五个实际规范ObjectWrite、TransactionData/Effects/两完整提交签名/双方原生验签/新stake UID-pool-本金-epoch-owner和费用总余额；8事实变异及8双签改payload拒绝。完整当前C124/1122及原运行保护保持，0NFT业务/原服务信号。

新仓位赎回仍需最新native对象与epoch、pending且非preactive条件、重新正常钱包批准，绝不使用旧C43仓位或质押前签名。P129-5–7、原完整M5与其他一期开放；当前三query/guard用于后续，结束时按确切CID/出生清理。原89/98、fine9.18%、trial_ready=false；普通Chrome、索引归档新checkpoint及完整物理/WAL/cold不据此通过，NFT专项第二阶段。
