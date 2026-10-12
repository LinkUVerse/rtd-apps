# TX-10 iframe边界与消息流存活

## 实施

当前manifest未启用all_frames，因此只在顶层页面注入钱包。新增实际Chromium测试，分别载入同源和不同端口的跨来源iframe，验证子页面没有独立钱包账户／Connect不可用，直接向parent发送get-account、acquire-permissions和disconnect-app不会返回账户／弹窗／撤销父页面授权；随后父页面get-account往返仍成功。

检查发现WindowMessageStream直接访问message.data.target：普通网页发送null可使RxJS消息流报错中断。增加入口包络结构校验，畸形消息忽略，合法请求和ErrorPayload继续通过。校验不代替后台逐方法授权，也不声称完整负载schema校验。

## 验证

- 首轮20261004-dapp-frames.log：原产物同源／跨来源frame测试通过。
- 新增WindowMessageStream.test.ts两项：畸形消息后的合法请求和错误仍接收；不同source与target不接收。
- 最终全量122文件1302项通过，钱包完整tsc退出0，dev Webpack构建成功（60184ms），四入口静态审计通过，日志前缀20261004-window-message-*。
- 20261004-dapp-frames-final.log实际Chromium通过，两个frame检查、畸形消息后网络往返、随后正常PersonalMessage验签／拒绝／撤权与整浏览器重启均通过。零模拟、零提交。构建哈希见20261004-window-message-artifacts.json。后台没有本轮变化，因此background SHA仍a962022a43d34d77a08ba5f5921a81f9aac100ae73f0d6ee1052070b9fc87ca5；改动在content-script和dapp-interface。

## 边界

同源iframe可通过同源JavaScript访问父页面，其脚本不构成独立来源安全边界；这里只证明来自子window的直接postMessage被拒绝。未增加iframe钱包支持，未修改host权限。仍是临时档案、编译Local和精确dev SPKI例外，不是正常CA／自定义权限验收，保留执行档案未触碰。切账户、提交后切网恢复等仍待，TX-10不勾选，总数40/98。
