---
layout: post
category : MySQL
tags : [MySQL, mysqldump, Error]
title: mysqldump意外终止的原因以及解决方法
---
{% include JB/setup %}
**来自：[http://www.realzyy.com/?p=491](http://www.realzyy.com/?p=491)**

**mysqldump意外终止的原因以及解决方法**

mysqldump是非常重要的MySQL备份工具。然而在长年累月的使用过程中，TAOBAO多次出现了因mysqldump意外终止而导致备份失败的情况。

以下是我们经常遇到的问题：

1、Lost connection to MySQL server at ‘reading initial communication packet’：

这个主要是因为DNS不稳定导致的。如果做了网络隔离，MySQL处于一个相对安全的网络环境，那么开启skip-name-resolve选项将会最大程度避免这个问题。

2、Lost connection to MySQL server at ‘reading authorization packet’：

从MySQL获取一个可用的连接是多次握手的结果。在多次握手的过程中，网络波动会导致握手失败。增加connect_timeout可以解决这个问题；然而增加connect_timeout并不能防止网络故障的发生，反而会引起MySQL线程占用。最好的解决办法是让mysqldump重新发起连接请求。

3、Lost connection to MySQL server during query：

这个问题具备随机性，而淘宝MySQL的应用场景决定了我们无法多次备份数据以便重现问题。

然而我们注意到这个问题一般会在两种情况下会发生。一种是mysqldump **** | gzip ****；另外一种是mysqldump **** > /nfs-file

注意，不管是gzip还是nfs都有一种特点，那就是它们影响了mysqldump的速度。从这个角度思考，是不是mysqldump从MySQL接受数据包的速度不够快导致Lost connection to MySQL server during query错误呢？

为了定位到问题，我搭建了一个测试环境，192.168.0.1：

    test@192.168.0.1：3306
    CREATE TABLE `test` (
        `id` bigint(20) NOT NULL auto_increment,
        `b` varchar(2000) default NULL,
        `c` varchar(2000) default NULL,
        `d` varchar(2000) default NULL,
        `e` varchar(2000) default NULL,
        PRIMARY KEY (`id`)
    ) ENGINE=MyISAM DEFAULT CHARSET=utf8;

    insert into test(b,c,d,e) values (lpad(‘a’,1900,’b'), lpad(‘a’,1900,’b'), lpad(‘a’,1900,’b'), lpad(‘a’,1900,’b'));

多次复制数据使测试环境达到一定数据量。

编写一个c++程序，192.168.0.2：

    #include <stdio.h>
    #include <mysql.h>

    using namespace std;

    int main(){
        MYSQL conn;
        MYSQL_RES *result;
        MYSQL_ROW row;
        my_bool reconnect = 0;

        mysql_init(&conn);
        mysql_options(&conn, MYSQL_OPT_RECONNECT, &reconnect);

        if(!mysql_real_connect(&conn, “192.168.0.1″, “test”, “test”, “test”, 3306, NULL, 0)){
            fprintf(stderr, “Failed to connect to database: %s\n”, mysql_error(&conn));
            exit(0);
        }
        else{
            fprintf(stdout, “Success to connect\n”);
        }

        mysql_query(&conn, “show variables like ‘%timeout%’”);
        result = mysql_use_result(&conn);
        while(row=mysql_fetch_row(result)){
            fprintf(stdout, “%-10s: %s\n”, row[0], row[1]);
        }
        mysql_free_result(result);
        fprintf(stderr, “\n”);

        mysql_query(&conn, “select SQL_NO_CACHE * from test.test”);
        result = mysql_use_result(&conn);
        while((row=mysql_fetch_row(result))!=NULL){
            fprintf(stderr, “Error %d: %s\n”, mysql_errno(&conn), mysql_error(&conn));
            fprintf(stdout, “%s\n”, row[0]);
            sleep(100);
        }
        fprintf(stderr, “Error %d: %s\n”, mysql_errno(&conn), mysql_error(&conn));
        mysql_free_result(result);
        mysql_close(&conn);
        return 1;
    }

在这段代码里，sleep函数用来模拟NFS的网络延迟和gzip的运算时间。执行一段时间之后，Lost connection to MySQL server during query出现了，程序意外终止。在数据处理足够快的情况下，又会是怎样的结果？

将sleep的时间改为1，重新编译后发现程序能够完整跑完。根据如下对net_write_timeout的解释，我们可以发现，mysqldump处理数据过慢（NFS、gzip引起）会导致MySQL主动断开连接，此时mysqldump就会报Lost connection to MySQL server during query错误。经过多次测试，确定这个错误是由于net_write_timeout设置过短引起。


**MySQL Timeout解析**

“And God said, Let there be network: and there was timeout”

在使用MySQL的过程中，你是否遇到了众多让人百思不得其解的Timeout？

先看一下比较常见的MySQL Timeout参数和相关解释：

connect_timeout

The number of seconds that the mysqld server waits for a connect packet before responding with Bad handshake.

interactive_timeout

The number of seconds the server waits for activity on an interactive connection before closing it.

wait_timeout

The number of seconds the server waits for activity on a noninteractive connection before closing it.

net_read_timeout

The number of seconds to wait for more data from a connection before aborting the read.

net_write_timeout

The number of seconds to wait for a block to be written to a connection before aborting the write.

从以上解释可以看出，connect_timeout在获取连接阶段（authenticate）起作用，interactive_timeout和wait_timeout在连接空闲阶段（sleep）起作用，而net_read_timeout和net_write_timeout则是在连接繁忙阶段（query）起作用。

获取MySQL连接是多次握手的结果，除了用户名和密码的匹配校验外，还有IP->HOST->DNS->IP验证，任何一步都可能因为网络问题导致线程阻塞。为了防止线程浪费在不必要的校验等待上，超过connect_timeout的连接请求将会被拒绝。

即使没有网络问题，也不能允许客户端一直占用连接。对于保持sleep状态超过了wait_timeout（或interactive_timeout，取决于CLIENT_INTERACTIVE标志）的客户端，MySQL会主动断开连接。

即使连接没有处于sleep状态，即客户端忙于计算或者存储数据，MySQL也选择了有条件的等待。在数据包的分发过程中，客户端可能来不及响应（发送、接收、或者处理数据包太慢）。为了保证连接不被浪费在无尽的等待中，MySQL也会选择有条件（net_read_timeout和net_write_timeout）地主动断开连接。

这么多Timeout足以证明MySQL是多么乐于断开连接。而乐于断开连接的背后，主要是为了防止服务端共享资源被某客户端（mysql、mysqldump、页面程序等）一直占用。