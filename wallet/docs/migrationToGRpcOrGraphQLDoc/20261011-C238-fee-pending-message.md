# C238：费用等待期间不再误报余额不足

C237非空发送表单中，费用尚未返回时 gasPreview=null，hasEnoughBalance=false，界面因此短暂显示余额不足；随后真实模拟成功。现仅在 gasAtomic 已取得且余额判断确实不足时展示该提示。未知费用时“检查”仍禁用，原预览、余额与执行校验不变。

29项定向、2856项完整回归、两项类型检查、生产构建和依赖闭包通过。相对C236仅SendTokenForm.tsx一个生产模块变化，后台、manifest、权限、网络配置不变。按用户持续授权原路径升级独立C51，完整保留C236，两个账户及扩展ID保留；实际UI和后台静态字节核验通过，并按既有授权解锁。

普通Chrome复验：暂时使用DevTools 3G将输入从0.01改为0.02 RTD，实际观测费用为“--”、没有余额不足提示、“检查”禁用；费用返回0.002988 RTD后按钮启用。已恢复No throttling、返回首页999.89 RTD。没有签名或执行。本次慢网仅用于可见等待状态，不用于性能耗时比较。

[原生UI证据](./workLog/20261011-C238-native-fee-ui-01.json)、[构建及模块审核](./workLog/20261011-C238-source-and-checks-01.json)、[安装](./workLog/20261011-C238-ordinary-upgrade-installed-01.json)。P238全部完成，父项仍93/98。
