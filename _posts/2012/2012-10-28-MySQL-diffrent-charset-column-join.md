---
layout: post
category : MySQL
tags : [MySQL, Charset]
title: 不同字符集的表JOIN性能对比
---
{% include JB/setup %}
**MySQL信息**

    mysql> status;
    --------------
    mysql  Ver 14.12 Distrib 5.0.77, for redhat-linux-gnu (x86_64) using readline 5.1

    Connection id:          9
    Current database:
    Current user:           root@localhost
    SSL:                    Not in use
    Current pager:          stdout
    Using outfile:          ''
    Using delimiter:        ;
    Server version:         5.0.77 Source distribution
    Protocol version:       10
    Connection:             Localhost via UNIX socket
    Server characterset:    latin1
    Db     characterset:    latin1
    Client characterset:    latin1
    Conn.  characterset:    latin1
    UNIX socket:            /var/lib/mysql/mysql.sock
    Uptime:                 1 hour 10 min 21 sec

    Threads: 2  Questions: 440  Slow queries: 5  Opens: 84  Flush tables: 1  Open tables: 14  Queries per second avg: 0.104
    --------------

**表结构如下**

    mysql> show create table t1\G
    *************************** 1. row ***************************
           Table: t1
    Create Table: CREATE TABLE `t1` (
      `id` int(11) NOT NULL auto_increment,
      `c1` varchar(32) default NULL,
      PRIMARY KEY  (`id`),
      KEY `ind_c1` (`c1`)
    ) ENGINE=MyISAM AUTO_INCREMENT=2097153 DEFAULT CHARSET=utf8
    1 row in set (0.00 sec)

    mysql> show create table t2\G
    *************************** 1. row ***************************
           Table: t2
    Create Table: CREATE TABLE `t2` (
      `id` int(11) NOT NULL auto_increment,
      `c1` varchar(32) default NULL,
      PRIMARY KEY  (`id`),
      KEY `ind_c1` (`c1`)
    ) ENGINE=MyISAM AUTO_INCREMENT=524289 DEFAULT CHARSET=gbk
    1 row in set (0.01 sec)

    mysql> show create table t3\G 
    *************************** 1. row ***************************
           Table: t3
    Create Table: CREATE TABLE `t3` (
      `id` int(11) NOT NULL auto_increment,
      `c1` varchar(32) default NULL,
      PRIMARY KEY  (`id`),
      KEY `ind_c1` (`c1`)
    ) ENGINE=MyISAM AUTO_INCREMENT=524289 DEFAULT CHARSET=utf8
    1 row in set (0.00 sec)

**按如下方法填充数据**

    insert into t1(c1) values('测试1');
    set @i=1;
    insert into t1(c1) select concat(substr(c1,1,2),@i:=@i+1) from t1; -- 重复N次填充2^N行数据

**测试SQL语句如下**

    select sql_no_cache count(*) from t1,t2 where t1.c1=t2.c1;
    select sql_no_cache count(*) from t1,t3 where t1.c1=t3.c1;

**EXPLAIN如下，区别很明显**

    mysql> explain select sql_no_cache count(*) from t1,t2 where t1.c1=t2.c1;        
    +----+-------------+-------+-------+---------------+--------+---------+------+--------+--------------------------+
    | id | select_type | table | type  | possible_keys | key    | key_len | ref  | rows   | Extra                    |
    +----+-------------+-------+-------+---------------+--------+---------+------+--------+--------------------------+
    |  1 | SIMPLE      | t2    | index | NULL          | ind_c1 | 67      | NULL | 524288 | Using index              | 
    |  1 | SIMPLE      | t1    | ref   | ind_c1        | ind_c1 | 99      | func |     10 | Using where; Using index | 
    +----+-------------+-------+-------+---------------+--------+---------+------+--------+--------------------------+
    2 rows in set (0.00 sec)

    mysql> explain select sql_no_cache count(*) from t1,t3 where t1.c1=t3.c1;
    +----+-------------+-------+-------+---------------+--------+---------+------------+--------+--------------------------+
    | id | select_type | table | type  | possible_keys | key    | key_len | ref        | rows   | Extra                    |
    +----+-------------+-------+-------+---------------+--------+---------+------------+--------+--------------------------+
    |  1 | SIMPLE      | t3    | index | ind_c1        | ind_c1 | 99      | NULL       | 524288 | Using index              | 
    |  1 | SIMPLE      | t1    | ref   | ind_c1        | ind_c1 | 99      | test.t3.c1 |     10 | Using where; Using index | 
    +----+-------------+-------+-------+---------------+--------+---------+------------+--------+--------------------------+
    2 rows in set (0.00 sec)

**实际测试效果如下**

t2,t3表为262144行的时候（以下均为重复运行多次的典型表现）

    mysql> select sql_no_cache count(*) from t1,t2 where t1.c1=t2.c1;
    +----------+
    | count(*) |
    +----------+
    |   262144 | 
    +----------+
    1 row in set (2.77 sec)

    mysql> select sql_no_cache count(*) from t1,t3 where t1.c1=t3.c1;
    +----------+
    | count(*) |
    +----------+
    |   262144 | 
    +----------+
    1 row in set (2.70 sec)


t2,t3表为524288行的时候（以下均为重复运行多次的典型表现）

    mysql> select sql_no_cache count(*) from t1,t2 where t1.c1=t2.c1;
    +----------+
    | count(*) |
    +----------+
    |   524288 | 
    +----------+
    1 row in set (5.26 sec)

    mysql> select sql_no_cache count(*) from t1,t3 where t1.c1=t3.c1;
    +----------+
    | count(*) |
    +----------+
    |   524288 | 
    +----------+
    1 row in set (5.11 sec)

**PROFILING如下**

    mysql> set profiling=1;
    Query OK, 0 rows affected (0.00 sec)

    mysql> select sql_no_cache count(*) from t1,t2 where t1.c1=t2.c1;
    +----------+
    | count(*) |
    +----------+
    |   524288 | 
    +----------+
    1 row in set (5.30 sec)

    mysql> select sql_no_cache count(*) from t1,t3 where t1.c1=t3.c1;
    +----------+
    | count(*) |
    +----------+
    |   524288 | 
    +----------+
    1 row in set (5.09 sec)

    mysql> show profiles;
    +----------+------------+-----------------------------------------------------------+
    | Query_ID | Duration   | Query                                                     |
    +----------+------------+-----------------------------------------------------------+
    |        1 | 5.30675800 | select sql_no_cache count(*) from t1,t2 where t1.c1=t2.c1 | 
    |        2 | 5.08412700 | select sql_no_cache count(*) from t1,t3 where t1.c1=t3.c1 | 
    +----------+------------+-----------------------------------------------------------+
    2 rows in set (0.00 sec)

    mysql> show profile all for query 1;  
    +--------------------+----------+----------+------------+-------------------+---------------------+--------------+---------------+---------------+-------------------+-------------------+-------------------+-------+-----------------------+---------------+-------------+
    | Status             | Duration | CPU_user | CPU_system | Context_voluntary | Context_involuntary | Block_ops_in | Block_ops_out | Messages_sent | Messages_received | Page_faults_major | Page_faults_minor | Swaps | Source_function       | Source_file   | Source_line |
    +--------------------+----------+----------+------------+-------------------+---------------------+--------------+---------------+---------------+-------------------+-------------------+-------------------+-------+-----------------------+---------------+-------------+
    | starting           | 0.000067 | 0.000000 |   0.000000 |                 0 |                   0 |            0 |             0 |             0 |                 0 |                 0 |                 0 |     0 | NULL                  | NULL          |        NULL | 
    | Opening tables     | 0.000009 | 0.000000 |   0.000000 |                 0 |                   0 |            0 |             0 |             0 |                 0 |                 0 |                 0 |     0 | open_tables           | sql_base.cc   |        2664 | 
    | System lock        | 0.000003 | 0.000000 |   0.000000 |                 0 |                   0 |            0 |             0 |             0 |                 0 |                 0 |                 0 |     0 | mysql_lock_tables     | lock.cc       |         153 | 
    | Table lock         | 0.000005 | 0.000000 |   0.000000 |                 0 |                   0 |            0 |             0 |             0 |                 0 |                 0 |                 0 |     0 | mysql_lock_tables     | lock.cc       |         163 | 
    | init               | 0.000019 | 0.000000 |   0.000000 |                 0 |                   0 |            0 |             0 |             0 |                 0 |                 0 |                 0 |     0 | mysql_select          | sql_select.cc |        2274 | 
    | optimizing         | 0.000008 | 0.000000 |   0.000000 |                 0 |                   0 |            0 |             0 |             0 |                 0 |                 0 |                 0 |     0 | optimize              | sql_select.cc |         758 | 
    | statistics         | 0.000012 | 0.000000 |   0.000000 |                 0 |                   0 |            0 |             0 |             0 |                 0 |                 0 |                 0 |     0 | optimize              | sql_select.cc |         911 | 
    | preparing          | 0.000008 | 0.000000 |   0.000000 |                 0 |                   0 |            0 |             0 |             0 |                 0 |                 0 |                 0 |     0 | optimize              | sql_select.cc |         921 | 
    | executing          | 0.000003 | 0.000000 |   0.000000 |                 0 |                   0 |            0 |             0 |             0 |                 0 |                 0 |                 0 |     0 | exec                  | sql_select.cc |        1590 | 
    | Sending data       | 5.306599 | 5.244203 |   0.048993 |                12 |                 116 |            0 |             0 |             0 |                 0 |                 0 |                 0 |     0 | exec                  | sql_select.cc |        2114 | 
    | end                | 0.000009 | 0.000000 |   0.000000 |                 0 |                   0 |            0 |             0 |             0 |                 0 |                 0 |                 0 |     0 | mysql_select          | sql_select.cc |        2319 | 
    | end                | 0.000002 | 0.000000 |   0.000000 |                 0 |                   0 |            0 |             0 |             0 |                 0 |                 0 |                 0 |     0 | mysql_select          | sql_select.cc |        2321 | 
    | query end          | 0.000002 | 0.000000 |   0.000000 |                 0 |                   0 |            0 |             0 |             0 |                 0 |                 0 |                 0 |     0 | mysql_execute_command | sql_parse.cc  |        5344 | 
    | freeing items      | 0.000006 | 0.000000 |   0.000000 |                 0 |                   0 |            0 |             0 |             0 |                 0 |                 0 |                 0 |     0 | mysql_parse           | sql_parse.cc  |        6355 | 
    | closing tables     | 0.000003 | 0.000000 |   0.000000 |                 0 |                   0 |            0 |             0 |             0 |                 0 |                 0 |                 0 |     0 | dispatch_command      | sql_parse.cc  |        2321 | 
    | logging slow query | 0.000001 | 0.000000 |   0.000000 |                 0 |                   0 |            0 |             0 |             0 |                 0 |                 0 |                 0 |     0 | log_slow_statement    | sql_parse.cc  |        2379 | 
    | cleaning up        | 0.000002 | 0.000000 |   0.000000 |                 0 |                   0 |            0 |             0 |             0 |                 0 |                 0 |                 0 |     0 | dispatch_command      | sql_parse.cc  |        2344 | 
    +--------------------+----------+----------+------------+-------------------+---------------------+--------------+---------------+---------------+-------------------+-------------------+-------------------+-------+-----------------------+---------------+-------------+
    17 rows in set (0.00 sec)

    mysql> show profile all for query 2;
    +--------------------+----------+----------+------------+-------------------+---------------------+--------------+---------------+---------------+-------------------+-------------------+-------------------+-------+-----------------------+---------------+-------------+
    | Status             | Duration | CPU_user | CPU_system | Context_voluntary | Context_involuntary | Block_ops_in | Block_ops_out | Messages_sent | Messages_received | Page_faults_major | Page_faults_minor | Swaps | Source_function       | Source_file   | Source_line |
    +--------------------+----------+----------+------------+-------------------+---------------------+--------------+---------------+---------------+-------------------+-------------------+-------------------+-------+-----------------------+---------------+-------------+
    | starting           | 0.000048 | 0.000000 |   0.000000 |                 0 |                   0 |            0 |             0 |             0 |                 0 |                 0 |                 0 |     0 | NULL                  | NULL          |        NULL | 
    | Opening tables     | 0.000008 | 0.000000 |   0.000000 |                 0 |                   0 |            0 |             0 |             0 |                 0 |                 0 |                 0 |     0 | open_tables           | sql_base.cc   |        2664 | 
    | System lock        | 0.000002 | 0.000000 |   0.000000 |                 0 |                   0 |            0 |             0 |             0 |                 0 |                 0 |                 0 |     0 | mysql_lock_tables     | lock.cc       |         153 | 
    | Table lock         | 0.000004 | 0.000000 |   0.000000 |                 0 |                   0 |            0 |             0 |             0 |                 0 |                 0 |                 0 |     0 | mysql_lock_tables     | lock.cc       |         163 | 
    | init               | 0.000014 | 0.000000 |   0.000000 |                 0 |                   0 |            0 |             0 |             0 |                 0 |                 0 |                 0 |     0 | mysql_select          | sql_select.cc |        2274 | 
    | optimizing         | 0.000008 | 0.000000 |   0.000000 |                 0 |                   0 |            0 |             0 |             0 |                 0 |                 0 |                 0 |     0 | optimize              | sql_select.cc |         758 | 
    | statistics         | 0.000012 | 0.000000 |   0.000000 |                 0 |                   0 |            0 |             0 |             0 |                 0 |                 0 |                 0 |     0 | optimize              | sql_select.cc |         911 | 
    | preparing          | 0.000007 | 0.000000 |   0.000000 |                 0 |                   0 |            0 |             0 |             0 |                 0 |                 0 |                 0 |     0 | optimize              | sql_select.cc |         921 | 
    | executing          | 0.000003 | 0.000000 |   0.000000 |                 0 |                   0 |            0 |             0 |             0 |                 0 |                 0 |                 0 |     0 | exec                  | sql_select.cc |        1590 | 
    | Sending data       | 5.083990 | 5.023236 |   0.049992 |                10 |                 101 |            0 |             0 |             0 |                 0 |                 0 |                 0 |     0 | exec                  | sql_select.cc |        2114 | 
    | end                | 0.000017 | 0.000000 |   0.000000 |                 0 |                   0 |            0 |             0 |             0 |                 0 |                 0 |                 0 |     0 | mysql_select          | sql_select.cc |        2319 | 
    | end                | 0.000001 | 0.000000 |   0.000000 |                 0 |                   0 |            0 |             0 |             0 |                 0 |                 0 |                 0 |     0 | mysql_select          | sql_select.cc |        2321 | 
    | query end          | 0.000002 | 0.000000 |   0.000000 |                 0 |                   0 |            0 |             0 |             0 |                 0 |                 0 |                 0 |     0 | mysql_execute_command | sql_parse.cc  |        5344 | 
    | freeing items      | 0.000006 | 0.000000 |   0.000000 |                 0 |                   0 |            0 |             0 |             0 |                 0 |                 0 |                 0 |     0 | mysql_parse           | sql_parse.cc  |        6355 | 
    | closing tables     | 0.000003 | 0.000000 |   0.000000 |                 0 |                   0 |            0 |             0 |             0 |                 0 |                 0 |                 0 |     0 | dispatch_command      | sql_parse.cc  |        2321 | 
    | logging slow query | 0.000001 | 0.000000 |   0.000000 |                 0 |                   0 |            0 |             0 |             0 |                 0 |                 0 |                 0 |     0 | log_slow_statement    | sql_parse.cc  |        2379 | 
    | cleaning up        | 0.000001 | 0.000000 |   0.000000 |                 0 |                   0 |            0 |             0 |             0 |                 0 |                 0 |                 0 |     0 | dispatch_command      | sql_parse.cc  |        2344 | 
    +--------------------+----------+----------+------------+-------------------+---------------------+--------------+---------------+---------------+-------------------+-------------------+-------------------+-------+-----------------------+---------------+-------------+
    17 rows in set (0.00 sec)