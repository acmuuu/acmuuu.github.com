---
layout: post
category : Linux
tags : [iptables]
title: iptables启动不了
---
{% include JB/setup %}
**来自[http://bbs.chinaunix.net/thread-2126281-1-1.html](http://bbs.chinaunix.net/thread-2126281-1-1.html)**

**表现：**

新手学习iptables,装了FC4
    
    [root@localhost ~]# uname -a
    Linux localhost.localdomain 2.6.11-1.1369_FC4 #1 Thu Jun 2 22:55:56 EDT 2005 i686 i686 i386 GNU/Linux
    
    [root@localhost ~]# rpm -qa iptables
    iptables-1.3.0-2
    
在没有任何配置的情况下 
    
    service iptables start
    service iptables stop
    service iptables restart
    
屏幕没有任何反应

如果,我先输入

    iptables -L

然后

    service iptables start

就会有如下提示
    
    [root@localhost ~]# iptables -L

    Chain FORWARD (policy ACCEPT)
    target     prot opt source               destination
    
    Chain INPUT (policy ACCEPT)
    target     prot opt source               destination
    
    Chain OUTPUT (policy ACCEPT)
    target     prot opt source               destination
    
    [root@localhost ~]# service iptables start

    清除防火墙规则：                                           [  确定  ]
    把 chains 设置为 ACCEPT 策略：filter                       [  确定  ]
    正在卸载 Iiptables 模块：                                  [  确定  ]
    
每执行一个service iptables stop (start restart)

都必需执行一个iptables -L

但是我里面的规则是空的呀

同样光盘装的FC 我同事就没有问题,他不需要输入iptables -L ,就可以启动IPTABLES 


**原因：**

应该是你系统里面没有/etc/sysconfig/iptables这个文件，你touch /etc/sysconfig/iptables应该就可以看到启动确定的提示了

在安装系统时是否选择了配置防火墙，要是配置了，就有/etc/sysconfig/iptables这个文件，要是没有的话，这个文件是不存在的，要自己手动创建。
