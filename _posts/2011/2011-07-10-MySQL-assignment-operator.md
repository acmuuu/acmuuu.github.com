---
layout: post
category : MySQL
tags : [MySQL]
title: MySQL赋值语句中=和:=的区别
---
{% include JB/setup %}
在set定义变量的时候 = 和 := 没区别

    mysql> set @a=1;
    Query OK, 0 rows affected (0.00 sec)

    mysql> select @a;
    +------+
    | @a   |
    +------+
    |    1 |
    +------+
    1 row in set (0.00 sec)

    mysql> set @a:=2;
    Query OK, 0 rows affected (0.00 sec)

    mysql> select @a;
    +------+
    | @a   |
    +------+
    |    2 |
    +------+
    1 row in set (0.00 sec)
    
但是在SQL语句中定义变量只能用 := ，因为 = 在SQL语句中还表示比较

    mysql> select @i=@i+1,user,host from mysql.user,(select @i:=0) t ; 
    +---------+-----------+-------------+
    | @i=@i+1 | user      | host        |
    +---------+-----------+-------------+
    |       0 | reporting | 127.0.0.1   |
    |       0 | root      | 127.0.0.1   |
    |       0 | cwg       | 218.1.21.94 |
    |       0 | root      | ::1         |
    |       0 |           | localhost   |
    |       0 | root      | localhost   |
    |       0 |           | nh120-179   |
    |       0 | root      | nh120-179   |
    +---------+-----------+-------------+
    8 rows in set (0.00 sec)

    mysql> select @i:=@i+1,user,host from mysql.user,(select @i:=0) t ;
    +----------+-----------+-------------+
    | @i:=@i+1 | user      | host        |
    +----------+-----------+-------------+
    |        1 | reporting | 127.0.0.1   |
    |        2 | root      | 127.0.0.1   |
    |        3 | cwg       | 218.1.21.94 |
    |        4 | root      | ::1         |
    |        5 |           | localhost   |
    |        6 | root      | localhost   |
    |        7 |           | nh120-179   |
    |        8 | root      | nh120-179   |
    +----------+-----------+-------------+
    8 rows in set (0.00 sec)