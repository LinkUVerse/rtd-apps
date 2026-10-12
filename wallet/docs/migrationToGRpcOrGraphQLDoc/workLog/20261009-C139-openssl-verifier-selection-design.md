# C139证书审核工具选择修正

第二次审核的错误位于openssl verify -verify_ip参数，系统/usr/bin/openssl打印usage并返回1；client purpose验证已返回0。它是系统LibreSSL旧命令不支持该参数，不能据此判定证书失败，也不能删除SAN检查来通过。

本机已存在的/opt/homebrew/opt/openssl@3/bin/openssl实际版本/verify_ip命令已经读取，使用该工具进行同样的根CA、sslserver/sslclient用途和127.0.0.1 SAN验证。只派生新版审核器绑定这个绝对可执行路径和其SHA；原审核源码/失败、所有证书字节及原CA保持，不更换或安装软件、不改系统信任，不启动消费者。完整准备资格须重新通过全部检查。
