---
layout: post
category : MySQL
tags : [Replication]
title: MySQL Semi-Synchronous Replication
---
{% include JB/setup %}
**来自[http://www.cnblogs.com/minglog/archive/2011/06/13/2079873.html](http://www.cnblogs.com/minglog/archive/2011/06/13/2079873.html)**

**A)Overview**

MySQL Replication是MySQL中最常用也是最重要的结构之一。不象市场上其它的产品，它拥有即装即用、易配置、免费等特点。

在很多大中小型应用场景下都用它来进行"scale-out"扩展。另外也用它来进行异地备份。

在开始之前，需要先理解"Semi-Synchronous Replication"的概念。"Synchronous(同步)"是什么,为什么它只是"Semi(半)"。
 

**B)Asynchronous VS. Synchronous**

**Synchronous：**每个写事务(insert\update\delete)会立即被复制至所有slave上，但这并不意味着事务已经完成，直到所有的slave确认它们都已经收到该事务数据(甚至是将其刷新至块设备)。

如果这其中有一个slave复制失败了，那么该事务被认定为失败，将在所有的server上进行回滚操作并向应用程序返回事务执行失败。

优点：冗余(Redundancy);我们可以确保数据被可靠的存储在多台服务器上。

缺点：性能\效率(Performance);每个事务可能会花费一定的时间直至所有的slave服务器向master确认该事务已被复制并完成。 

 

**Asynchronous：**写事务会向master的块设备与一些用来复制的日志(mysql中被称为"binary log")写入记录。当完成上述操作后即向应用程序发出事务完成的确认信息，master并不关心该事务是否已经被slaves复制。

对于slaves来说，它们将会在另外的时间里，从master上拿到自己所需要的数据进行复制。

这意味着master并不知道它的slaves的复制情况，甚至是它们是否还在正常工作。

优点：性能(Performance);事务只需要等待master的刷新和确认。

缺点：冗余(Redundancy);我们不知道数据是否已经复制到所有的slave上。

在以前,"Performance"与"Redundancy"，鱼翅与熊掌难兼得矣。但现在，随着技术的发展，情况有所改善。

Async Replication没什么好讲，mysql直接装上就可以用。

Sync Replication可以通过DRBD和Linux-HA来实现。

SemiSync可以通过mysql server5.5实现。 

 

那么"SemiSync"是什么意思呢？

在"SemiSync replication"中，master保存事务与"Sync replication"大致相同，不同的地方在于它仅需要等待slaves中的任一台slave回复确认信息即可。这台回复的slave，它仅仅需要将该事务日志记录从master取回，写入至自己的中继日志(relay log)并将日志刷新至块设备。所以并不意味着该事务数据已经在数据库中执行(在mysql中就是sql thread是否已执行)。master一收到slave的确认消息即向应用程序返回事务已完成。 


**C)实验演示 **

**Preparing the environment **

We need at least couple of MySQL Servers version 5.5 or later (either Enterprise or Community) with the SemiSync plugin. (If you download from Oracle eDelivery or MySQL site, it’ll already be inside)

**Loading SemiSync Replication plugin **

On the master,以拥有'super'权限的用户执行：

    mysql> INSTALL PLUGIN rpl_semi_sync_master SONAME 'semisync_master.so'; 

On the slave，以拥有'super'权限的用户执行： 

    mysql> INSTALL PLUGIN rpl_semi_sync_slave SONAME 'semisync_slave.so'; 

分别检查一下加载后的情况：

    mysql> SHOW plugins;

如果返回如下错误： 

    ERROR 1126 (HY000): Can’t open shared library 

follow the instructions on

[http://dev.mysql.com/doc/refman/5.5/en/replication-semisync-installation.html](http://dev.mysql.com/doc/refman/5.5/en/replication-semisync-installation.html)
[http://dev.mysql.com/doc/refman/5.5/en/install-plugin.html](http://dev.mysql.com/doc/refman/5.5/en/install-plugin.html)
 

**Setting Asynchronous Replication**

搭建一个Async Replication环境，这是第一步，SemiSync replication是在Async Replication基础之上实现的。 

On the master:

编辑/etc/my.cnf

    [mysqld]
    log-bin=mysql-bin
    server-id=1

重启mysql

    # /etc/init.d/mysql restart
    Shutting down MySQL..                                      [  OK  ]
    Starting MySQL..                                           [  OK  ]

建立用来复制任务的用户 

    mysql> CREATE USER 'repl'@'%' IDENTIFIED BY 'slave';
    mysql> GRANT REPLICATION SLAVE ON *.* TO 'repl'@'%';
    mysql> FLUSH PRIVILEGES;

On the slave:

编辑/etc/my.cnf 

    [mysqld]
    server-id=2
    Restart the server as root 
    
重启mysql

    # /etc/init.d/mysql restart
    Shutting down MySQL..                                      [  OK  ]
    Starting MySQL..                                           [  OK  ]

Initiating the replication

在master,确保master可以进行 Async replication 

    mysql> SHOW MASTER STATUS;
    +------------------+----------+--------------+------------------+
    | File             | Position | Binlog_Do_DB | Binlog_Ignore_DB |
    +------------------+----------+--------------+------------------+
    | mysql-bin.000001 |      524 |              |                  |
    +------------------+----------+--------------+------------------+


在slave上，我们使用CHANGE MASTER TO & START SLAVE commands让其开始进行Async replication

    mysql> CHANGE MASTER TO
      MASTER_HOST='192.168.0.136',
      MASTER_USER='repl',
      MASTER_PASSWORD='slave',
      MASTER_PORT=3306,
      MASTER_LOG_FILE='mysql-bin.000001',
      MASTER_CONNECT_RETRY=10;
    Query OK, 0 rows affected (0.01 sec)
     
    mysql> START SLAVE;
    Query OK, 0 rows affected (0.00 sec)
     
    mysql> SHOW slave STATUS\G
    *************************** 1. row ***************************
                   Slave_IO_State: Waiting FOR master TO send event
                      Master_Host: 192.168.0.136
                      Master_User: repl
                      Master_Port: 3306
                    Connect_Retry: 10
                  Master_Log_File: mysql-bin.000001
              Read_Master_Log_Pos: 1264
                   Relay_Log_File: slave-relay-bin.000003
                    Relay_Log_Pos: 253
            Relay_Master_Log_File: mysql-bin.000001
                 Slave_IO_Running: Yes
                Slave_SQL_Running: Yes
                  Replicate_Do_DB:
              Replicate_Ignore_DB:
               Replicate_Do_Table:
           Replicate_Ignore_Table:
          Replicate_Wild_Do_Table:
      Replicate_Wild_Ignore_Table:
                       Last_Errno: 0
                       Last_Error:
                     Skip_Counter: 0
              Exec_Master_Log_Pos: 1264
                  Relay_Log_Space: 1295
                  Until_Condition: None
                   Until_Log_File:
                    Until_Log_Pos: 0
               Master_SSL_Allowed: No
               Master_SSL_CA_File:
               Master_SSL_CA_Path:
                  Master_SSL_Cert:
                Master_SSL_Cipher:
                   Master_SSL_Key:
            Seconds_Behind_Master: 0
    Master_SSL_Verify_Server_Cert: No
                    Last_IO_Errno: 0
                    Last_IO_Error:
                   Last_SQL_Errno: 0
                   Last_SQL_Error:
      Replicate_Ignore_Server_Ids:
                 Master_Server_Id: 1
    1 row IN SET (0.00 sec)

现在Async replication已经开始工作

On the slave: 

    mysql>use test;
    mysql> SHOW TABLES;
    Empty SET (0.00 sec)

On the Master:

    mysql> CREATE TABLE test1 (id INT, name VARCHAR(50));
    mysql> SHOW TABLES;
    +----------------+
    | Tables_in_test |
    +----------------+
    | test1          |
    +----------------+

On the slave:

    mysql> SHOW TABLES;
    +----------------+
    | Tables_in_test |
    +----------------+
    | test1          |
    +----------------+

On the master:

    mysql> INSERT INTO test1 VALUES (1,'Test 1');
    mysql> SELECT * FROM test1;
    +------+--------+
    | id   | name   |
    +------+--------+
    |    1 | Test 1 |
    +------+--------+

On the slave:

    mysql> SELECT * FROM test1;
    +------+--------+
    | id   | name   |
    +------+--------+
    |    1 | Test 1 |
    +------+--------+

现在让我们阻止master与slave之间的连接，在slave上的shell中：

    iptables -A INPUT -s 192.168.0.136 -j DROP

现在我们在master上插入新记录并检查slave 

    mysql> INSERT INTO test1 VALUES (2,'Test 2');
    Query OK, 1 row affected (0.00 sec)
     
    mysql> INSERT INTO test1 VALUES (3,'Test 3');
    Query OK, 1 row affected (0.03 sec)
     
    mysql> SELECT * FROM test1;
    +------+--------+
    | id   | name   |
    +------+--------+
    |    1 | Test 1 |
    |    2 | Test 2 |
    |    3 | Test 3 |
    +------+--------+

On the slave:

    mysql> SELECT * FROM test1;
    +------+--------+
    | id   | name   |
    +------+--------+
    |    1 | Test 1 |
    +------+--------+

数据没有被复制，通过"SHOW SLAVE STATUS" command检查不会有任何错误消息。slave并不知道它现在的网络情况，master也不了解slave的情况，所以事务仍然会在master上继续。

现在修改iptables，去除阻止规则：

    iptables -D INPUT -s 192.168.0.136 -j DROP

On the slave:

重启slave服务

    mysql> START SLAVE;
    Query OK, 0 rows affected, 1 warning (0.00 sec)
     
    mysql> SELECT * FROM test1;
    +------+--------+
    | id   | name   |
    +------+--------+
    |    1 | Test 1 |
    |    2 | Test 2 |
    |    3 | Test 3 |
    +------+--------+

**Moving into Semi-Synchronous Replication**

我们之前已经加载过其插件，在这步要对其进行设置，我们可以进行动态加载也可以写入my.cnf。 

On the master:

    mysql> SET GLOBAL rpl_semi_sync_master_enabled = 1;
    Query OK, 0 rows affected (0.00 sec)
     
    mysql> SET GLOBAL rpl_semi_sync_master_timeout = 10000;
    Query OK, 0 rows affected (0.00 sec)

On the slave:

    mysql> SET GLOBAL rpl_semi_sync_slave_enabled = 1;
    Query OK, 0 rows affected (0.00 sec)
     
    mysql> STOP SLAVE IO_THREAD; START SLAVE IO_THREAD;
    Query OK, 0 rows affected (0.02 sec)
    Query OK, 0 rows affected (0.00 sec)

检查是否正常工作

On  the master:

    mysql> SHOW VARIABLES LIKE 'rpl_semi_sync%';
    +------------------------------------+-------+
    | Variable_name                      | Value |
    +------------------------------------+-------+
    | rpl_semi_sync_master_enabled       | ON    |
    | rpl_semi_sync_master_timeout       | 10000 |
    | rpl_semi_sync_master_trace_level   | 32    |
    | rpl_semi_sync_master_wait_no_slave | ON    |
    +------------------------------------+-------+
    4 rows IN SET (0.00 sec)
     
    mysql> SHOW STATUS LIKE 'Rpl_semi_sync%';
    +--------------------------------------------+-------+
    | Variable_name                              | Value |
    +--------------------------------------------+-------+
    | Rpl_semi_sync_master_clients               | 1     |
    | Rpl_semi_sync_master_net_avg_wait_time     | 0     |
    | Rpl_semi_sync_master_net_wait_time         | 0     |
    | Rpl_semi_sync_master_net_waits             | 0     |
    | Rpl_semi_sync_master_no_times              | 0     |
    | Rpl_semi_sync_master_no_tx                 | 0     |
    | Rpl_semi_sync_master_status                | ON    |
    | Rpl_semi_sync_master_timefunc_failures     | 0     |
    | Rpl_semi_sync_master_tx_avg_wait_time      | 0     |
    | Rpl_semi_sync_master_tx_wait_time          | 0     |
    | Rpl_semi_sync_master_tx_waits              | 0     |
    | Rpl_semi_sync_master_wait_pos_backtraverse | 0     |
    | Rpl_semi_sync_master_wait_sessions         | 0     |
    | Rpl_semi_sync_master_yes_tx                | 0     |
    +--------------------------------------------+-------+
    14 rows IN SET (0.00 sec)

关注一下以下三个参数：

    Rpl_semi_sync_master_status – Whether semisynchronous replication currently is operational on the master.
    Rpl_semi_sync_master_yes_tx – The number of commits that were acknowledged successfully by a slave.
    Rpl_semi_sync_master_no_tx – The number of commits that were not acknowledged successfully by a slave.

具体含义可参照：[http://dev.mysql.com/doc/refman/5.5/en/server-status-variables.html#statvar_Rpl_semi_sync_master_status](http://dev.mysql.com/doc/refman/5.5/en/server-status-variables.html#statvar_Rpl_semi_sync_master_status)
 
On the slave:

    mysql> SHOW VARIABLES LIKE 'rpl_semi_sync%';
    +---------------------------------+-------+
    | Variable_name                   | Value |
    +---------------------------------+-------+
    | rpl_semi_sync_slave_enabled     | ON    |
    | rpl_semi_sync_slave_trace_level | 32    |
    +---------------------------------+-------+
    2 rows IN SET (0.00 sec)
     
    mysql> SHOW STATUS LIKE 'Rpl_semi_sync%';
    +----------------------------+-------+
    | Variable_name              | Value |
    +----------------------------+-------+
    | Rpl_semi_sync_slave_status | ON    |
    +----------------------------+-------+
    1 row IN SET (0.00 sec)

接下来实验"Semi"，我们会分别在m/s连接通畅的情况下与阻止网络连接的情况下，插入新记录，看看会发生什么： 

On the master:

    mysql> INSERT INTO test1 VALUES (4,'Test 4');
    Query OK, 1 row affected (0.00 sec)
     
    mysql> SELECT * FROM test1;
    +------+--------+
    | id   | name   |
    +------+--------+
    |    1 | Test 1 |
    |    2 | Test 2 |
    |    3 | Test 3 |
    |    4 | Test 4 |
    +------+--------+
    4 rows IN SET (0.00 sec)
     
    mysql> SHOW STATUS LIKE 'Rpl_semi_sync%';
    +--------------------------------------------+-------+
    | Variable_name                              | Value |
    +--------------------------------------------+-------+
    | Rpl_semi_sync_master_clients               | 1     |
    | Rpl_semi_sync_master_net_avg_wait_time     | 602   |
    | Rpl_semi_sync_master_net_wait_time         | 602   |
    | Rpl_semi_sync_master_net_waits             | 1     |
    | Rpl_semi_sync_master_no_times              | 0     |
    | Rpl_semi_sync_master_no_tx                 | 0     |
    | Rpl_semi_sync_master_status                | ON    |
    | Rpl_semi_sync_master_timefunc_failures     | 0     |
    | Rpl_semi_sync_master_tx_avg_wait_time      | 0     |
    | Rpl_semi_sync_master_tx_wait_time          | 0     |
    | Rpl_semi_sync_master_tx_waits              | 0     |
    | Rpl_semi_sync_master_wait_pos_backtraverse | 0     |
    | Rpl_semi_sync_master_wait_sessions         | 0     |
    | Rpl_semi_sync_master_yes_tx                | 1     |
    +--------------------------------------------+-------+
    14 rows IN SET (0.00 sec)

注意Rpl_semi_sync_master_yes_tx 现在是1 

On the slave:

    mysql> SELECT * FROM test1;
    +------+--------+
    | id   | name   |
    +------+--------+
    |    1 | Test 1 |
    |    2 | Test 2 |
    |    3 | Test 3 |
    |    4 | Test 4 |
    +------+--------+
    4 rows IN SET (0.00 sec)

现在我们开始阻断网络连接 

On the slave:

    iptables -A INPUT -s 192.168.0.136 -j DROP 

On the master:

    mysql> INSERT INTO test1 VALUES (5,'Test 5');
    Query OK, 1 row affected (10.00 sec)
     
    mysql> SELECT * FROM test1;
    +------+--------+
    | id   | name   |
    +------+--------+
    |    1 | Test 1 |
    |    2 | Test 2 |
    |    3 | Test 3 |
    |    4 | Test 4 |
    |    5 | Test 5 |
    +------+--------+
    5 rows IN SET (0.00 sec)
     
    mysql> SHOW STATUS LIKE 'Rpl_semi_sync%';
    +--------------------------------------------+-------+
    | Variable_name                              | Value |
    +--------------------------------------------+-------+
    | Rpl_semi_sync_master_clients               | 1     |
    | Rpl_semi_sync_master_net_avg_wait_time     | 602   |
    | Rpl_semi_sync_master_net_wait_time         | 602   |
    | Rpl_semi_sync_master_net_waits             | 1     |
    | Rpl_semi_sync_master_no_times              | 1     |
    | Rpl_semi_sync_master_no_tx                 | 1     |
    | Rpl_semi_sync_master_status                | OFF   |
    | Rpl_semi_sync_master_timefunc_failures     | 0     |
    | Rpl_semi_sync_master_tx_avg_wait_time      | 0     |
    | Rpl_semi_sync_master_tx_wait_time          | 0     |
    | Rpl_semi_sync_master_tx_waits              | 0     |
    | Rpl_semi_sync_master_wait_pos_backtraverse | 0     |
    | Rpl_semi_sync_master_wait_sessions         | 0     |
    | Rpl_semi_sync_master_yes_tx                | 1     |
    +--------------------------------------------+-------+
    14 rows IN SET (0.00 sec)

仔细看，此事务花费了10s尝试完成，最终写入数据库，但是有两个参数值发生了变化：

    Rpl_semi_sync_master_status is OFF
    Rpl_semi_sync_master_no_tx increased from 0 to 1

当"SemiSync replication"发生失败后，它会回退至异步模式(Async mode),可以通过检查"Rpl_semi_sync_master_status"来进行确认。

我们将其修复回SemiSync状态 

On the slave :

    iptables -D INPUT -s 192.168.0.136 -j DROP

On the slave:
    
    mysql> SELECT * FROM test1;
    +------+--------+
    | id   | name   |
    +------+--------+
    |    1 | Test 1 |
    |    2 | Test 2 |
    |    3 | Test 3 |
    |    4 | Test 4 |
    +------+--------+
    4 rows IN SET (0.00 sec)
     
    mysql> STOP SLAVE IO_THREAD; START SLAVE IO_THREAD;
    Query OK, 0 rows affected (0.02 sec)
     
    Query OK, 0 rows affected (0.00 sec)
     
    mysql> SELECT * FROM test1;
    +------+--------+
    | id   | name   |
    +------+--------+
    |    1 | Test 1 |
    |    2 | Test 2 |
    |    3 | Test 3 |
    |    4 | Test 4 |
    |    5 | Test 5 |
    +------+--------+
    5 rows IN SET (0.00 sec)

On the master:

    mysql> SHOW STATUS LIKE 'Rpl_semi_sync%';
    +--------------------------------------------+----------+
    | Variable_name                              | Value    |
    +--------------------------------------------+----------+
    | Rpl_semi_sync_master_clients               | 1        |
    | Rpl_semi_sync_master_net_avg_wait_time     | 28584321 |
    | Rpl_semi_sync_master_net_wait_time         | 57168643 |
    | Rpl_semi_sync_master_net_waits             | 2        |
    | Rpl_semi_sync_master_no_times              | 1        |
    | Rpl_semi_sync_master_no_tx                 | 1        |
    | Rpl_semi_sync_master_status                | ON       |
    | Rpl_semi_sync_master_timefunc_failures     | 0        |
    | Rpl_semi_sync_master_tx_avg_wait_time      | 0        |
    | Rpl_semi_sync_master_tx_wait_time          | 0        |
    | Rpl_semi_sync_master_tx_waits              | 0        |
    | Rpl_semi_sync_master_wait_pos_backtraverse | 0        |
    | Rpl_semi_sync_master_wait_sessions         | 0        |
    | Rpl_semi_sync_master_yes_tx                | 1        |
    +--------------------------------------------+----------+
    14 rows IN SET (0.00 sec)
     
    mysql> INSERT INTO test1 VALUES (6,'Test 6');
    Query OK, 1 row affected (0.01 sec)

原文：[http://blog.ronenb.com/2011/02/23/mysql-semisynchronous-replication/#codesyntax_1](http://blog.ronenb.com/2011/02/23/mysql-semisynchronous-replication/#codesyntax_1)