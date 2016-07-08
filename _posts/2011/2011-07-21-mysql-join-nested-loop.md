---
layout: post
category : MySQL
tags : [MySQL]
title: Mysql Join算法
---
{% include JB/setup %}

**Mysql Join算法 Nested Loop [http://hiying.net/post-24.html](http://hiying.net/post-24.html)**

JOIN算法 ：只支持Nested Loop方式，有2种类型

a). simple nested-loop join (NLJ)

假如有t1, t2, t3 3个表join，则算法为:

    for each row in t1 matching range {
      for each row in t2 matching reference key {
        for each row in t3 {
          if row satisfies join conditions,
              send to client
        }
      }
    }

即直接使用3个嵌套循环进行匹配

b). Block Nested-Loop Join (BNL)

具体算法描述为：

    for each row in t1 matching range {
      for each row in t2 matching reference key {
        store used columns from t1, t2 in join buffer
        if buffer is full {
          for each row in t3 {
            for each t1, t2 combination in join buffer {
              if row satisfies join conditions,
                 send to client
             }
         }
         empty buffer
       }
      }
    }

    if buffer is not empty {
      for each row in t3 {
        for each t1, t2 combination in join buffer {
          if row satisfies join conditions,
            send to client
        }
      }
    }

    
**使用BNL的条件:**

1、系统 参数join_buffer_size有设置；

2、MySQL的join类型为all（全表扫描）、index（全索引扫描）、range（索引区间扫描）；

3、进行join的记录能够放入join buffer中（记录太大无法放入join buffer无法使用BNL）；

4、内存 满足join buffer分配

因为MySQL只有Nested Loop Join，如果内层表（被驱动表）没有索引或者无法使用索引等，就根本不适合使用Nested Loop，BNL主要用于处理这种情况。上面例子中如果t3没有索引，采用NLJ算法时在最内层每次都要对t3全表扫描，而使用BNL时，假如join_buffer_size可以存储100条中间结果，与NLJ相比每100次全表扫描t3可以减少为1次

    mysql > show variables like '%join%';
    +-------------------+----------------------+
    | Variable_name     | Value                |
    +-------------------+----------------------+
    | join_buffer_size  | 1048576              |
    | max_join_size     | 18446744073709551615 |
    | sql_max_join_size | 18446744073709551615 |
    +-------------------+----------------------+
    3 rows in set (0.00 sec)

如果字段大于max_join_size，那么则不使用join buffer