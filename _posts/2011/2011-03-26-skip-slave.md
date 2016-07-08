---
layout: post
category : MySQL
tags : [MySQL, Binlog]
title: Skip Slave Error
---
{% include JB/setup %}

**跳过MYSQL数据库复制错误**

在MYSQL进行Replication的时候，有时候会由于主从端的POS点不同，导致复制的SQL进程出现错误，从而导致主从复制失败。比如在主端复制一个ID是100的到从端，而此时由于某种原因从端已经有了ID=100的记录，这时进行INSERT操作的时候，就会主键重复，插入失败。这时候需要跳过这条错误。方法如下

**1：停止SLAVE 服务**

    mysql> STOP SLAVE;

**2：设置跳过的EVENT个数**

    mysql> SET GLOBAL SQL_SLAVE_SKIP_COUNTER = 1;

**3：启动SLAVE服务**

    mysql> START SLAVE;

**4：总之**

    mysql> STOP SLAVE;SET GLOBAL SQL_SLAVE_SKIP_COUNTER = 1;START SLAVE;SHOW SLAVE STATUS\G

 

**下面阐述下N的意思，转帖**

大家都知道，当slave出现错误时，可以通过SET GLOBAL sql_slave_skip_counter = N来跳过错误，但是这个N，又真正代表什么呢，开始时，理解错了，以为对于事务型，N代表N个事务，而非事务型，代表一条sql 语句。后经过linuxtone曹哥指导发现，其实并不是这么回事，文档中有介绍说（http://dev.mysql.com/doc/refman/ ... e-skip-counter.html）：

    This statement skips the next N events from the master

即他是跳过N个events，这里最重要的是理解event的含义，在mysql中，对于sql的 binary log 他实际上是由一连串的event组成的一个组，即事务组。
我们在master上可以通过：

    SHOW BINLOG EVENTS; 

来查看一个sql里有多少个event。
通过例子来说明下，真正的event的含义：
在slave上

    show slave status 
    Last_Errno: 1062
      Last_Error: Error 'Duplicate entry '193' for key 'PRIMARY'' on query. Default database: 'ssldb'. Query: 'insert slave_no_skip1  values (193,'y10')'
    Skip_Counter: 0

在 master 上，执行

    mysql> SHOW BINLOG EVENTS in 'mysql-bin.000010' from 46755013;
      +------------------+----------+------------+-----------+-------------+--------------------------------------------------------+
      | Log_name         | Pos      | Event_type | Server_id | End_log_pos | Info                                                   |
      +------------------+----------+------------+-----------+-------------+--------------------------------------------------------+
      | mysql-bin.000010 | 46755013 | Query      |         1 |    46755082 | BEGIN                                                  | 
    1 | mysql-bin.000010 | 46755082 | Query      |         1 |    46755187 | use `ssldb`; insert slave_no_skip1  values (193,'y10') | 
    2 | mysql-bin.000010 | 46755187 | Xid        |         1 |    46755214 | COMMIT /* xid=4529451 */                               | 
    3 | mysql-bin.000010 | 46755214 | Query      |         1 |    46755283 | BEGIN                                                  | 
    4 | mysql-bin.000010 | 46755283 | Query      |         1 |    46755387 | use `ssldb`; insert slave_no_skip1 values (194,'y11')  | 
    5 | mysql-bin.000010 | 46755387 | Xid        |         1 |    46755414 | COMMIT /* xid=4529452 */                               | 
    6 | mysql-bin.000010 | 46755414 | Query      |         1 |    46755483 | BEGIN                                                  | 
    7 | mysql-bin.000010 | 46755483 | Query      |         1 |    46755587 | use `ssldb`; insert slave_no_skip1 values (195,'y12')  | 
    8 | mysql-bin.000010 | 46755587 | Xid        |         1 |    46755614 | COMMIT /* xid=4529453 */                               | 
    9 | mysql-bin.000010 | 46755614 | Query      |         1 |    46755683 | BEGIN                                                  | 
    10| mysql-bin.000010 | 46755683 | Query      |         1 |    46755788 | use `ssldb`; insert slave_no_skip1  values (196,'y13') | 
    11| mysql-bin.000010 | 46755788 | Xid        |         1 |    46755815 | COMMIT /* xid=4529454 */                               | 
    12| mysql-bin.000010 | 46755815 | Query      |         1 |    46755884 | BEGIN                                                  | 
    13| mysql-bin.000010 | 46755884 | Query      |         1 |    46755989 | use `ssldb`; insert slave_no_skip1  values (197,'y14') | 
    14| mysql-bin.000010 | 46755989 | Xid        |         1 |    46756016 | COMMIT /* xid=4529455 */                               | 
    15| mysql-bin.000010 | 46756016 | Query      |         1 |    46756085 | BEGIN                                                  | 
    16| mysql-bin.000010 | 46756085 | Query      |         1 |    46756190 | use `ssldb`; insert slave_no_skip1  values (198,'y15') | 
    17| mysql-bin.000010 | 46756190 | Xid        |         1 |    46756217 | COMMIT /* xid=4529456 */                               | 
    18| mysql-bin.000010 | 46756217 | Query      |         1 |    46756286 | BEGIN                                                  | 
    19| mysql-bin.000010 | 46756286 | Query      |         1 |    46756391 | use `ssldb`; insert slave_no_skip1  values (199,'y16') | 
    20| mysql-bin.000010 | 46756391 | Xid        |         1 |    46756418 | COMMIT /* xid=4529457 */                               | 
    21| mysql-bin.000010 | 46756418 | Query      |         1 |    46756487 | BEGIN                                                  | 
      | mysql-bin.000010 | 46756487 | Query      |         1 |    46756592 | use `ssldb`; insert slave_no_skip1  values (190,'y17') | 
      | mysql-bin.000010 | 46756592 | Xid        |         1 |    46756619 | COMMIT /* xid=4529458 */                               | 
      +------------------+----------+------------+-----------+-------------+--------------------------------------------------------+
      24 rows in set (0.00 sec)          
   
通过错误可知，他是**use `ssldb`; insert slave_no_skip1  values (193,'y10')**这条语句导致错误了
如果我们想跳到最后一条语句**use `ssldb`; insert slave_no_skip1  values (190,'y17')**的话 ，我们必须简单计算下中间有多少个event
很明显，是21，那么我们可以执行**SET GLOBAL sql_slave_skip_counter =21（这里你SET GLOBAL sql_slave_skip_counter =19或者20都可以）**
在slave 在次执行show slave status查看 

    Last_Errno: 1062
       Last_Error: Error 'Duplicate entry '190' for key 'PRIMARY'' on query. Default database: 'ssldb'. Query: 'insert slave_no_skip1  values (190,'y17')'
    Skip_Counter: 0

可见 他已经如我所愿，跳到**use `ssldb`; insert slave_no_skip1  values (190,'y17')**这里了。