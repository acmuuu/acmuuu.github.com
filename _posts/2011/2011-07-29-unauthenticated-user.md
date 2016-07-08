---
layout: post
category : MySQL
tags : [MySQL]
title: unauthenticated user
---
{% include JB/setup %}

有时候我们执行SHOW PROCESSLIST的时候可以看到MySQL一些连接显示unauthenticated user，如下：

    +-----+----------------------+--------------------+------+---------+------+-------+------------------+
    | Id  | User                 | Host               | db   | Command | Time | State | Info             |
    +-----+----------------------+--------------------+------+---------+------+-------+------------------+
    | 235 | unauthenticated user | 10.10.2.74:53216   | NULL | Connect | NULL | login | NULL             |
    | 236 | unauthenticated user | 10.120.61.10:51721 | NULL | Connect | NULL | login | NULL             |
    | 237 | user                 | localhost          | NULL | Query   | 0    | NULL  | show processlist |
    +-----+----------------------+--------------------+------+---------+------+-------+------------------+

谁是这些未认证的用户呢？他们为什么出现在连接数据库列表里面？他们为什么没有被认证呢？

MySQL客户端连接服务端分为4个步骤，熟悉mysql-proxy的人应该非常熟悉这4个步骤了，因为在mysql-proxy中的Lua脚本中有4个function对应着这4个步骤，熟悉这4个步骤对于解决MySQL客户端连接服务端失败很有帮助。

第一步：MySQL客户端发送一个握手连接请求到MySQL服务端，这个请求里面不包含任何认证信息。但是，这不是意味着你可以连接一个你可以连接一个根本不存在的MySQL服务器或者服务端口，否则MySQL客户端将会报告一下信息

    ERROR 2003 (HY000): Can't connect to MySQL server on '[host]' (111)

第二步：MySQL服务端分配一个连接并且返回握手，返回的信息包括mysqld版本，线程id，MySQL服务端的主机地址和端口号，MySQL客户端的主机地址和端口号，还有一个“scramble buffer”（为了加盐认证）。

第二步的期间这次MySQL客户端到MySQL服务端的连接就会在SHOW PROCESSLIST命令中显示。至此这些连接还没有被MySQL服务端认证，但是他们已经连接上来了，如果认证认证出现了什么问题，这些连接将会停在这个阶段。大多数停留在这个阶段的连接都是因为DNS反向解析不能正确的返回结果，skip-name-resolve这个参数可以停止MySQL服务端进行DNS反向解析，可以解决大多数这样的问题。

第三步：MySQL客户端发送认证信息到MySQL服务端，其中包括用户名，密码（加盐并作哈希运输过的）和默认数据库。如果MySQL发送了错误的包，或者发送的认证信息没有包含connect_timeout的参数设置，MySQL服务端就认为这个连接失败了并且增加Aborted_connects这个变量的计数统计。

第四步：MySQL服务端返回认证是否成功，如果认证失败MySQL服务端增加Aborted_connects这个变量的计数统计，并且返回如下错误信息：

    ERROR 1045 (28000): Access denied for user 'user'@'host' (using password: [YES/NO])


**原文地址： [http://www.pythian.com/news/1166/what-is-an-unauthenticated-user/](http://www.pythian.com/news/1166/what-is-an-unauthenticated-user/)**

Every so often we have a client worrying about unauthenticated users. For example, as part of the output of SHOW PROCESSLIST they will see:

    +-----+----------------------+--------------------+------+---------+------+-------+------------------+
    | Id  | User                 | Host               | db   | Command | Time | State | Info             |
    +-----+----------------------+--------------------+------+---------+------+-------+------------------+
    | 235 | unauthenticated user | 10.10.2.74:53216   | NULL | Connect | NULL | login | NULL             |
    | 236 | unauthenticated user | 10.120.61.10:51721 | NULL | Connect | NULL | login | NULL             |
    | 237 | user                 | localhost          | NULL | Query   | 0    | NULL  | show processlist |
    +-----+----------------------+--------------------+------+---------+------+-------+------------------+

Who are these unauthenticated users, how do they get there, and why aren’t they authenticated?

The client-server handshake in MySQL is a 4-step process. Those familiar with mysql-proxy already know these steps, as there are four functions that a Lua script in mysql-proxy can override. The process is useful to know for figuring out exactly where a problem is when something breaks.

Step 1: Client sends connect request to server. There is no information here (as far as I can tell). However, it does mean that if you try to connect to a host and port of a mysqld server that is not available, you will get

    ERROR 2003 (HY000): Can't connect to MySQL server on '[host]' (111)

Step 2: The server assigns a connection and sends back a handshake, which includes the server’s mysqld version, the thread id, the server host and port, the client host and port, and a “scramble buffer” (for salting authentication, I believe).

It is during Step 2 where the connections show up in SHOW PROCESSLIST. They have not been authenticated yet, but they are connected. If there are issues with authentication, connections will be stuck at this stage. Most often stuck connections are due to DNS not resolving properly, which the skip-name-resolve option will help with.

Step 3: Client sends authentication information, including the username, the password (salted and hashed) and default database to use. If the client sends an incorrect packet, or does not send authentication information within connect_timeout seconds, the server considers the connection aborted and increments its Aborted_connects status variable.

Step 4: Server sends back whether the authentication was successful or not. If the authentication was not successful, mysqld increments its Aborted_connects status variable and sends back an error message:

    ERROR 1045 (28000): Access denied for user 'user'@'host' (using password: [YES/NO])