# C166 四路 NFT 完整冷恢复补测

C162 durable 实际冷恢复四路通过，但独立审核发现启动期一个 GetServiceInfo 的浏览器副本读取失败，虽然完整上游原文、finished 事件及七个采集事件均在。原证据继续保留，不能将缺失副本改写为成功。增加 UI 导航前的真实请求和 body 采集收尾等待，并在新独立 profile 创建不同 gasBudget 105000166 的唯一自然 pending。新摘要必须不同于 C162 已批准摘要；从未转发 Execute。仍须完整冷关闭、锁定重启、正常解锁、四路 pending 禁用与三 store/密文/三私有入口核对。原 NFT、原签名、原 pending 不重放、不清理。

仅完整实测和独立原帧审核通过后才计 four_durable 完成。本次准备不计完成。
