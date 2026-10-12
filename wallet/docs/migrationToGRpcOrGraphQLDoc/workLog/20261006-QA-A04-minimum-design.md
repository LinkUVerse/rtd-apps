# QA-A04：实际归档最小高度矩阵

只读、固定当前8 debug/持久bounded桥接审计后运行。binary/text两种传输分别验证省略、创世高度0（H0摘要另验）、已观察H；各条件均读取checkpoint0并与原genesis digest相等，证明最小高度不改变历史选择器。不可满足u64最大值返回Unavailable；负数、空白、加号、前导零、小数、科学计数、非数及u64溢出返回InvalidArgument。伪造可信上界/role仍不能突破不可满足最小高度。

每次成功均检查末status和trailers；所有调用严格只允许Ledger的身份/历史checkpoint读取，无模拟/签名/Execute。沿用原公开CA仅在Node子进程信任，不修改浏览器/系统信任；正常Chrome CA仍归ENV-07/QA-A19。先核对图/renderer/原manifest/当前源码，再以新鲜审核、原H0和完整矩阵收口本项。真实故障/取消/方法白名单/Move方法仍由QA-A03独立承担。
