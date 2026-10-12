# NET-07四端点自定义网络实际验收计划

沿用隔离profile的真实扩展界面，使用当前C13产物及既有Fullnode、GraphQL、Archive、Account四个URL。不模拟chrome.permissions：在用户实际提交动作中调用产品原生request，记录提交前后contains及重启保留。Fullnode／GraphQL／Archive三角色H0预检；账户历史额外配置原样保存，并明确展示其覆盖仍需读取时验证，不用失败覆盖冒充身份成功。TLS使用三个精确leaf SPKI，normal CA归ENV-07，不能抬升。

实际预检后确认保存四端点版本1；重复版本1确认须拒绝且storage不变，版本2重新预检保存。随后以原生API撤销HTTPS权限，已准备的版本3确认须拒绝且storage仍版本2；通过新的实际用户提交恢复权限，不伪授予。完整browser重启后核对两个storage版本2profile逐字一致、permission contains真实保留、0模拟／Execute。已有旧空URL配置不猜新端点与36合同／旧配置重启证明仍独立保存。

若新host permission未被实际原生API接受、角色预检失败、源码／worker不匹配或任一保存／重启断言失败，则保留profile和失败，不勾NET-07。成功仅完成设置／storage范围，不声明账户历史覆盖、normal CA或钱包试用。

## 原生API实测后的合同修正

可见Chrome实际授权、三角色H0预检、四端点版本1及2保存已成立。原生remove返回“You cannot remove required permissions”，getAll含content_scripts.matches声明的required <all_urls>。Chrome官方[permissions说明](https://developer.chrome.com/docs/extensions/reference/api/permissions?hl=en)确认origins包括content scripts host且required不能用remove撤销。原设计把该host当可撤销optional，是harness假设错误；保留04/05失败及原设计。后续实际验收分别接受API成功撤销→产品拒绝保存，或精确required拒绝→contains与storage不变、返回修改、版本2全browser重启保留。后一分支明确不声称撤权后的产品拒绝实测；实际Chrome站点权限撤销与完整授权故障仍归ENV-07／TX-10，不以单测或required拒绝替代。NET-07父合同是自定义设置／storage迁移、真实多服务授权与保存切换，成功后按该合同收口。
