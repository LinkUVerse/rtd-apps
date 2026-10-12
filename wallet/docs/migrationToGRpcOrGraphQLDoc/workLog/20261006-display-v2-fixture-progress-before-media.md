# 当前Display V2夹具进展

当前78/98。按[实施前设计](./20261006-display-v2-fixture-design.md)完成D1–D3：最新RTD源码49a05a0de323b45a49d067a855c419e98d071afc及diff e6702a206c6d0a4780ccb2f8d9c869317c65d006e96c3acf2da213f5df5571b3、最新8个安装debug、实际ABI／同链H0均绑定。Move源码、编译材料及部署工具位于link-u-smart-contract/all-in-one-deploy/localDeploy；旧夹具、数据库和pending保留。

发布01–04均在新执行前失败，未产生新交易。发布05只有一次Execute，原调用随后即时读取失败，原摘要恢复确认成功checkpoint1001373，没有重发。铸造01在归档503预检阶段停止，没有新模拟／签名／执行；铸造02一次模拟、一次签名、一次Execute成功，checkpoint1002694，独立原BCS／effects／签名恢复通过。

新package为0x2091c46ae2c85c6098b8537c3cf8047181664708b0fc2906eda648feab7dd5b3。两件DisplayNFT直接属于受控source账户0x11e90d26087af15981c5e7d0739ce58886755f1ac83ebaeb1f7c643b87e5f614：

- 0x3bba16f12a623a4ce062d529e9c16ccadd3943521c0cee8fcce55b708901e9df，serial1，图片http://127.0.0.1:41718/display-v2.png。
- 0x97c2b5d0be7009b524ddc37fc6cff06b4d16e4c4fc8caa7dfdce1282f2fbfd9a，serial2，图片字段为空。

共享Display 0x09ee26c43cc00f597107ab190a781b97d804933c59a3fb2979411e9dbc665c8a的name／image_url／description模板、DisplayCap及owner经[真实原生BCS核验02](./20261006-display-v2-fixture-native-02.json)确认。首轮空键BCS假设失败保留；当前链ABI的DisplayKey包含dummy_field:bool，false编码00与[Sui官方实现](https://github.com/MystenLabs/sui/blob/main/crates/sui-types/src/display_registry.rs)一致，非产品故障。

D4／D5仍待：媒体服务尚未启动，GraphQL真实认证快照尚未覆盖铸造高度，不声称实际图片、隐藏／取消隐藏或重启保持已通过。最近有限消费者采样上界690404，SQL持久管线726884等待认证发布；原publisher仍验证至907824，不中断或重写高度。独立debug候选在1024个真实checkpoint上约2.93倍加速、30项正负验证通过，尚未安装，不能代称完整吞吐。当前C26 UI／worker和四个查询角色同链证明已通过；原HTTPS、完整RPC-03及最终试用仍开放。
