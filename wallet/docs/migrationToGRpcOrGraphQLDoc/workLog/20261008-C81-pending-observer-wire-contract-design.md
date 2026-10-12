# C81 实际 timeout 状态协议对齐

本地当前 publisher-loop-dev.py 的 TimeoutExpired 分支写 waiting_timeout／reasonCode=PUBLICATION_TIMEOUT，但不写 through。C66 的通用 hint 错误要求 through 整数，因此不会进入符合政策的自然 timeout 窗口。原五实现、134完整政策和所有真实fresh门都正确，保持。

1. 只对已独立绑定的自有观察器35045、working原发布器／child及交接阶段缺失的精确条件下发一次SIGINT；保留非自然结束、未attempt／安装、0原publisher／child信号的终态，并独立复核。
2. 全新C81唯一观察器保留C66实际hand-off／plan／五实现；waiting_timeout hint仅接纳该实际reasonCode及缺省through，published／idle仍要求原整数through。hint不是安全资格，完整fresh SQL／版本／prepared0／精确锁0／无child及TLS前后门仍决定是否可发信号。
3. 使用当前源码原write_state函数在临时目录实际生成状态，证明旧hint拒绝、后继hint匹配；错误reason／through／时间／pid／working等拒绝，政策134不变。
4. 新唯一实际3600秒PID／cwd／解释器／源码绑定后才等待自然窗口；失败后不自动重试，实际authority与后续推进独立验收。
