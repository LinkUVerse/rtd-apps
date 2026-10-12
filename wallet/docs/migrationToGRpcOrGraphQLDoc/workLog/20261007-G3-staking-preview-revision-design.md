# TX-01 质押数量修改后的新批准预览

完整TX-01仍开放，本子项不代替gas改动／全部内部入口／实际C42浏览器验收。保留C41的staking／background运行叶由当前C42完整差异证明未变，使用新受控fixture，原成功／pending profile不打开。

- [x] B1：当前debug guard／G3 H0、fresh canonical V2系统inner匹配最新原生后验；正常新profile导入保护、实际验证者选择，原三store全部为空。
- [x] B2：正常1RTD表单预览，界面金额／validator／sender／digest与真实prepared state和canonical bytes一致；正式kind费用选择及最终ENABLED模拟成功。只观察批准按钮，不点击。
- [x] B3：真实Back撤销旧approval，正常修改到2RTD再预览，request ID／digest／bytes必须变化；新一组费用及最终模拟，原scope和sender保持，旧可见approved state不残留，不以React旧alternate堆内存残留作为可批准状态。
- [x] B4：两原始模拟对和最终BCS／sender／gas／Validity／系统shared／精确数量与验证者独立核验；两次Back、正常重锁、完整journal保持及零sign／Execute。gas budget若相同不能称为发生gas变化，持久恢复／赎回／C42全部运行验收仍待。

[实际Chrome03](./20261007-G3-staking-preview-revision-retained-C41-chrome-03.json)12检查、4原始正式模拟和[独立审核02](./20261007-G3-staking-preview-revision-independent-02.json)3 fresh native帧通过：1／2RTD不同request／digest／canonical bytes，同binding和readSession，真实Gas coin version2／digest／owner一致。预算均3419224 MIST，gasBudgetChanged=false。失败01／02保留；当前React root／请求去重及真实键盘输入修正仅在测试工具，产品未改。独立01工具误用了不存在的fullnode-selected枚举，CLI失败记录明确补存，02按实际coins合同只读修正。
