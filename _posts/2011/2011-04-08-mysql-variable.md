---
layout: post
category : MySQL
tags : [MySQL]
title: MySQL用户变量
---
{% include JB/setup %}
**来自：[http://technoboy.iteye.com/blog/992078](http://technoboy.iteye.com/blog/992078)**

**1. 用户变量**
用户变量是指通过set语句：set @var_name = expr [, @var_name = expr]对指定变量名赋值，然后在以后引用它。用户变量的形式为@var_name，以后的引用也是这样。 
set语句注意点：
  
    1) 可以使用=或:=作为分配符。 
    2) 变量expr可以为整数、实数、字符串或者NULL值。 
    3) 可以使用非set语句代替set来为用户变量分配一个值，此时分配符必须为:=而不能用=。 
    4) 使用没有初始化的用户变量，其值为NULL,类型为字符串。 
  
用户变量注意点： 

    1) 用户变量和连接有关。(这意味着：一个客户端定义的变量不能被其它客户端看到或使用。当客户端退出时，该客户端连接的所有变量将自动释放。) 
    2) 用户变量不使用查询缓存。 
    3) 用户变量大小写不敏感。(mysql5.0及其以上版本) 
    4) 用户变量不能准确的指定类型。 

**2. 使用**

    mysql> SET @t1=0, @t2=0, @t3=0;  
    mysql> SELECT @t1:=(@t2:=1)+@t3:=4,@t1,@t2,@t3;  
    +----------------------+------+------+------+  
    | @t1:=(@t2:=1)+@t3:=4 | @t1  | @t2  | @t3  |  
    +----------------------+------+------+------+  
    |                    5 |    5 |    1 |    4 |  
    +----------------------+------+------+------+  
      
    mysql> select @t:=count(*) from admin;  
    +--------------+  
    | @t:=count(*) |  
    +--------------+  
    |            1 |  
    +--------------+  

注意：在SELECT语句中，表达式发送到客户端后才进行计算。 

**3. 变量使用的陷阱**

a.看一个官方文档的例子： 

    mysql> set @a='test';  
      
    mysql> select @a,(@a:=20) from admin;  
    +------+----------+  
    | @a   | (@a:=20) |  
    +------+----------+  
    | test |       20 |  
    +------+----------+  
      
    mysql> select @a;  
    +------+  
    | @a   |  
    +------+  
    |   20 |  
    +------+  

这个列子中，第一个set语句表示@a是一个字符串，并且将@a的所有访问转换为字符串，即使@a在第2行中被设置为一个数字。但是在执行select语句后，@a被视为下一语句的数字。 

b.一个行号的用户变量

    mysql> create table test (id int primary key, value int) ENGINE=InnoDB;  
    Query OK, 0 rows affected (0.03 sec)  
      
    mysql> insert into test values(1, 1), (2, 10), (3, 12), (4, 5), (5, 20);  
    Query OK, 5 rows affected (0.03 sec)  
    Records: 5  Duplicates: 0  Warnings: 0  
      
    mysql> set @rownum = 0;  
    Query OK, 0 rows affected (0.00 sec)  
      
    mysql> select @rownum := @rownum + 1 as rownum, id, value  
        -> from test where @rownum < 2;  
    +--------+----+-------+  
    | rownum | id | value |  
    +--------+----+-------+  
    |      1 |  1 |     1 |  
    |      2 |  2 |    10 |  
    +--------+----+-------+  
    2 rows in set (0.00 sec)  

我们执行的最后一条语句得到的结果不是我们想要的。为什么会这样？Mysql内部执行的过称是这样的：首先，判断where条件@rownum < 2,而第一次@rownum为0，返回一会结果，@rownum此时为1，小于2，又会返回一行,此时@rownum为2，结束。 

解决的办法是将条件写在where中： 

    mysql> select @rownum as rownum, id, value from test  
        -> where (@rownum := @rownum + 1) < 2;  

c.对于行号的用户变量延伸 

    mysql> set @rownum = 0;  
    mysql> select @rownum := @rownum + 1 as rownum, id, value  
        -> from test where @rownum < 2 order by value;  
    +--------+----+-------+  
    | rownum | id | value |  
    +--------+----+-------+  
    |      1 |  1 |     1 |  
    |      2 |  4 |     5 |  
    |      3 |  2 |    10 |  
    |      4 |  3 |    12 |  
    |      5 |  5 |    20 |  
    +--------+----+-------+  
    5 rows in set (0.00 sec)  

我们还是用刚才的数据，可是这次执行的结果更出乎我们的意料。Mysql内部执行的过称是这样的:首先where判断@rownum < 2,然后order by,最后select。(同上) 

解决的办法是将条件写在where中： 

    mysql> select @rownum as rownum, id, value from test  
        -> where (@rownum := @rownum + 1) < 2 order by value;  

对以上这几个问题产生原因的解释： 
我们同时在一条语句中对一个用户变量进行了赋值和取值，这样就有可能导致我们上面问题的存在！所以，一般原则是不要在语句的一个部分为用户变量分配一个值而在同一语句的其它部分使用该变量。 

注：本文mysql版本5.1.42。