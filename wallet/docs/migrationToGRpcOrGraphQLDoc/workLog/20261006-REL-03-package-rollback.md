# REL-03 生产包回滚有限验证

父任务仍开放，总体64/98。当前产品1106文件／SHA609dfb4e保持，原开发C19及原七journal不变。

## 已执行范围

[第11轮真实浏览器证明](./20261006-REL-03-package-rollback-11.json)51检查通过。使用同一个全新独立Chrome profile、固定安装路径和extension ID：原生产C19→带独立发布registry的生产候选03→原生产C19。三次UI均实际加载3脚本，background实际SHA为956e8037→5d3cacc0→956e8037；升级／回滚的worker确实需要正常reload，不能据磁盘替换推断来源。

通过真实UI导入随机未注资密钥、设置随机密码，重启后锁定，错误密码不能解锁或导出，正确密码解锁并在内存核对实际解密密钥。证据只写公开地址和加密字段SHA，未持久化／打印明文测试密钥或密码。

独立profile显式播种公共schema2 dummy记录及pending占用到未来version3库；播种有效但未授权保存的公共profile配置。三阶段完整journal全部store逻辑SHA、加密账户字段SHA和实际`wallet_network_v2`／`wallet_custom_profile_v2`配置SHA均一致。`recoverPreparedTransaction`明确返回交易恢复存储不可用。直接播种并非真实广播pending、真实配置保存或磁盘断电证明。

[6份158项正式代码测试](./20261006-REL-03-current-targeted-01.log)通过，涵盖coordinator、journal／reader、profile、网络绑定及后台执行合同。[候选最终目录只读回归](./20261006-REL-03-helper-readonly-01.json)再次实际核对UI／worker，启动零外部／forbidden请求、零页面错误；HTTP Fullnode身份成功，三个HTTPS仍未通过。此轮0签名／模拟／Execute／CA改动／原profile打开／dev重启。

## 首次失败与口径整改

[保留清单](./20261006-REL-03-retained-failures-01.json)记录1–9轮原profile、产物及日志；不删现场。1轮UI过早枚举，2轮更新后worker核验失败；3–8轮确认在已渲染UI后连接后台Debugger会使后续UI枚举为空，源核验调整为先后台、后新UI。扩展资源性能条目为空，不能拿它替代实际Debugger字节。

第9轮扩展Secure Preferences中的disable reason为16777216。官方源码枚举对应开发者模式关闭的未打包扩展禁用原因，见[保存的官方源码](./20261006-REL-03-chromium-disable-reason.h.txt)和[来源摘要](./20261006-REL-03-chromium-source.json)。第10／11轮通过普通Chrome扩展管理页启用开发者模式；未修改偏好文件、TLS或CA。

第10轮虽完成51项，但配置快照漏掉实际网络选择键，且未保存预检拒绝原因，因此不能据它宣布配置／错链完整通过。第11轮修正后证明实际拒绝原因为“请先在网络设置中授权这些服务地址”；`wrongGenesisAccepted=false`、`actualProfileSaveAccepted=false`。先前“错H0已被实际Fullnode拒绝”的口头归因不足，在此更正；不得把权限失败记为链身份失败。

## 后续必需

- 在独立profile完成正常host permission授权和普通CA验证，再进行实际custom profile预检／确认／新revision回退；真实错H0必须到达身份检查并明确拒绝。
- 保留数据的新revision回退、不同绑定的pending暂停及完整原digest恢复按Task剩余合同验证；不降revision、不写旧网络存储快照、不清库。
- 两侧技术方案的发布包与配置回滚操作补充已逐字对齐；父REL-03及完整资金／TLS验收继续开放。
