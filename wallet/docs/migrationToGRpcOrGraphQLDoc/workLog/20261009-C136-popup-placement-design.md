# C136审批窗口定位修复实施前合同

C134-05实际第二Wallet Standard请求明确返回Chrome窗口边界错误，已完成Connect、交易input为正常3nano sign-only，但窗口创建失败；不是签名竞争拒绝通过。独立prefix02核对840已捕获响应、两个完整ENABLED模拟、一原生验签及密码学校验、真实signData一次持有、Coin竞争拒绝、31秒后原结果封闭失败、锁/signer恢复、三journal/密文/C133关闭profile与正常relock，12反例拒绝。两个质押竞争和释放后预览未执行，全采集/M5保持未通过；03/05均不重批准/重签/重发。

当前Window.show根据最后聚焦窗口计算left+width-450并复用top。连续popup的最后聚焦窗口本身只有360宽，该计算会继续向左移；实际Chrome明确拒绝边界。仅修改Window.ts，去掉人为left/top和相应getLastFocused，让Chrome按窗口管理器默认位置创建，保留url/focus/width/height/type、窗口ID/关闭观察及所有交易授权/原31秒期限不变。Chrome官方API将left/top定义为可选，省略时由浏览器自然定位：[Chrome windows.create](https://developer.chrome.com/docs/extensions/reference/api/windows#method-create)。

修改前保存完整1122文件manifest、Window原文与旧生产产物/开发dist；完整逆变换证明只有该产品文件变化，其余1121文件保持。运行相关审批/签名回归与完整生产类型、隔离production编译及全部源码映射闭包。旧C131来源守卫应拒绝新source，不能覆盖旧资格或产物。

真实浏览器验证须观察连续两个正常审批窗口创建、正常Reject/关闭元数据和三journal/密文保持；随后用不同于03/05及C133的全新明确摘要继续四入口live/31秒释放后预览，不能重放旧已批准请求。NFT业务专项和普通Chrome桌面验收按原顺序；CFT不替代普通Chrome。只清理本批已停用三query/guard，原两组链/indexer/工作发布者和六恢复中间件保持。

P136-1：修复前全源/产物封存与一文件完整逆变换；P136-2：相关回归/完整类型/production构建/源码图闭包及新来源资格；P136-3：当前真实连续审批窗口与正常关闭；P136-4：新当前四入口live完整独立/限定范围/原进度及双方方案同步。准备不计业务通过。
