---
layout: post
category : MySQL
tags : [MySQL, InnoDB]
title: MySQL InnoDB的数据预热
---
{% include JB/setup %}

**MySQL InnoDB的数据预热 [http://dbahacker.com/mysql/mysql-5-0-5-1-下innodb的预热方法](http://dbahacker.com/mysql/mysql-5-0-5-1-下innodb的预热方法)**
之前在做一个项目的MySQL数据库极限压测， 有部分场景是涉及到MySQL重启的，而这个项目使用的是InnoDB存储引擎。
重启完毕后，一开始十几分钟的性能是非常差的，原因是因为InnoDB有innodb buffer pool(简称ibf)的概念
和innodb buffer pool相关的参数innodb_buffer_pool_size，size越大，可以放到内存的数据越多，而大多数的项目都会有热点数据的存在，当热点数据经过LRU算法进入到buffer pool之后，读磁盘的次数减少，读的都是内存，速度是最快的。
问题来了，数据库一重启，热点数据都被清空，bf里面都是空的。等待app的sql请求过来让bf填满数据是一个方法，但30分钟内很难把热点数据都装载进来。
这个时候，我们可以采取人工预热的办法来让bf满足我们的需求

**MySQL 5.0的数据预热**
方法1 : 在MySQL重启后 执行

    SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES;

经过我在一台5.0 MySQL的实验在重启后查看show innodb status\G 和执行完这条语句后 Free buffers的页数会减少。
这个count语句有何作用呢?
InnoDB的存储格式和MyISAM不一样， innodb会在mysql启动后的第一次访问表的时候，统计表的索引基数等相关信息，如果表很多的话，这也是一个巨大的开销.所以在正式提供服务之前，就把表打开，放入到bp里面。


**MySQL 5.1的数据预热**
我在一台5.1.48的MySQL进行了重启，测试了同样的

    SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES

但发现free buffers的页数没有变少，情况和mysqlperformanceblog.com作者所说的一样这个方法在5.1之后就无法达到我们的需求了。
可以采用另外一种方法:获得数据库里面的库和对应的表，来进行预热，核心代码是这一句

    SELECT table_schema, table_name FROM information_schema.tables;

可以用perl或者python来获取库和表 然后执行 select * from db.table limit 1 来实现我们的方法。
最后提一下，我们可以再my.cnf 加入init-file=/mysql/init.sql ，在每次mysql重启的时候就自动执行这个预热的sql 当然了 sql是要我们自己生成的。