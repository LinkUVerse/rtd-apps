# C173 原 HTTP 实体与浏览器重复副本的独立关联修正

C162 durable 622 个原 HTTP 实体均已在交给浏览器前完整原文／SHA／长度／headers／全部七事件保存，浏览器全部请求均有真实终态。旧关联器还要求每一个 Playwright response.body 重复副本都可再次读取；其中一次 GetServiceInfo 在 finished 后副本读取报错。因此旧判断将已经完整留存的原实体误当作缺失，不能据此声称原实体缺失，也不能声称该浏览器副本读取成功。

新关联器保持所有原实体／来源／原请求／实际终态／持久 fsync／三私有入口断言。只对存在精确 routeBinding 的直接浏览器回复，要求原实体完整、真实 route.fulfill 与 requestfinished 均已观察、browserRequestOutcome finished、正文长度与浏览器真实 content-length 相等、相关实际响应头一致，才接受原实体与实际交付关联；单独披露 duplicateBrowserCopiesNotRead。不填补或改写原 bodyReadError，不补造任何 body、终态或事件。ServiceWorker 无 binding 的副本不可用不能套此分支。所有正向模拟／对象／完整 BCS 仍根据真实原实体独立验证。

原 C162 live 的12个缺终态请求继续拒绝；C166 unknown 上游 GraphQL 正文继续拒绝。旧失败记录保留。此修正只改独立审核器的重复副本假设，不改变钱包／服务／原验证合同的完整原实体与实际终态要求；不重签或重发旧摘要。完成前须实际原资料通过独立全业务审核及缺证反例。
