---
layout: post
category : MySQL
tags : [MySQL, Cache]
title: MySQL Query Cache Summary
---
{% include JB/setup %}
**来自[http://www.schooner-ht.com/2011/05/31/mysql-query-cache-summary/](http://www.schooner-ht.com/2011/05/31/mysql-query-cache-summary/)**

Query Cache 模块在 MySQL 中是一个非常重要的模块。顾名思义，它的主要功能是将客户端提交给MySQL 的 Select 类 query 请求以及其返回结果集做一个HASH映射后保存到内存中。本文主要是总结一下query cache的一些特性以及这些特性对性能的影响。


从性能方面来看，对一些简单的主键查询语句来说，query cache可以提高至2倍的性能。当然如果执行一些结果相对较小的复杂查询语句时，query cache可以得到远高于2倍的性能提升。

那是不是意味着Query Cache 就真的是“尚方宝剑”呢?我们可以看看下面的一组测试结果。

![Alt text](/assets/images/2011/05/query_cache.jpg)

从上面的图中可以看出，Query cache并不是一定会提高性能。

为了了解Query cache对性能的影响，本文总结了以下几点：

	1. MySQL query cache的配置和维护。
	2. Query Cache的一些优点。
	3. Query Cache的一些限制。
	4. 如何设置合适的Query Cache。

**首先来了解一下MySQL query cache的配置参数和系统状态参数：**

MySQL query cache的配置参数：

* query_cache_limit：

允许 Cache 的单条 Query 结果集的最大容量，默认是1MB，超过此参数设置的 Query 结果集将不会被 Cache

* query_cache_min_res_unit：

设置 Query Cache 中每次分配内存的最小空间大小，也就是每个 Query 的 Cache 最小占用的内存空间大小。默认值为4k。

* query_cache_size：

设置 Query Cache 所使用的内存大小，默认值为0，大小必须是1024的整数倍，如果不是整数倍，MySQL 会自动调整降低最小量以达到1024的倍数。

* query_cache_type：

控制 Query Cache 功能的开关，可以设置为0(OFF),1(ON)和2(DEMAND)三种，默认值为1。三种设置的意义分别如下：

0(OFF)：关闭 Query Cache 功能，任何情况下都不会使用 Query Cache

1(ON)：开启 Query Cache 功能，但是当 SELECT 语句中使用的 SQL_NO_CACHE 提示后，将不使用Query Cache

2(DEMAND)：开启 Query Cache 功能，但是只有当 SELECT 语句中使用了 SQL_CACHE 提示后，才使用 Query Cache

* query_cache_wlock_invalidate：

控制当有写锁定发生在表上的时刻是否先失效该表相关的 Query Cache，如果设置为 1(TRUE)，则在写锁定的同时将失效该表相关的所有 Query Cache，如果设置为0(FALSE)则在锁定时刻仍然允许读取该表相关的 Query Cache。

MySQL Query Cache 的当前状态，具体系统状态参数如下：

* Qcache_free_blocks：

目前还处于空闲状态的 Query Cache 中内存 Block 数目

* Qcache_free_memory：

目前还处于空闲状态的 Query Cache 内存总量

* Qcache_hits：

Query Cache 命中次数

* Qcache_inserts：

向 Query Cache 中插入新的 Query Cache 的次数，也就是没有命中的次数

* Qcache_lowmem_prunes：

当 Query Cache 内存容量不够，需要从中删除老的 Query Cache 以给新的 Cache 对象使用的次数

* Qcache_not_cached：

没有被 Cache 的 SQL 数，包括无法被 Cache 的 SQL 以及由于 query_cache_type 设置的不会被 Cache 的 SQL

* Qcache_queries_in_cache：

目前在 Query Cache 中的 SQL 数量

* Qcache_total_blocks：

Query Cache 中总的 Block 数量

MySQL的Query Cache对MySQL的性能优化非常重要。但是除了知道它可以提高性能之外，还有一些知识是你在使用和配置query cache的相关参数时需要了解的。

**Query Cache的一些优点：**

a. Transparent Caching：

对于应用层来说，query cache是完全透明的，最重要的一点是cache完全不会改变查询语句的语义，这意味着你将得到真实的查询结果。实际上这里MySQL也是有一些小动作的。例如参数query_cache_wlock_invalidate：控制当有写锁定发生在表上的时刻是否先失效该表相关的 Query Cache，如果设置为 1(TRUE)，则在写锁定的同时将失效该表相关的所有 Query Cache，如果设置为0(FALSE)则在锁定时刻仍然允许读取该表相关的 Query Cache。

b.Works on packet level:

Query Cache是捕获从客户端向服务器端发送的packets来存储的，因而在命中时不需要进行任何的额外处理即可快速的返回，有助于性能提升。

c. Works before parsing

Query cache高效率的原因之一是因为在进行SQL query解析前就查找query cache。如果在命中的话，那么就省掉了解析等步骤。

与此同时，MySQL Query cache还有一些限制，在使用时需要**注意的一些特性**：

a.Caching full queries only:

Query Cache 是以客户端请求提交的 Query 为对象来处理的，只要客户端请求的是一个 Query，无论这个 Query 是一个简单的单表查询还是多表 Join，亦或者是带有子查询的复杂 SQL，都被当作成一个 Query，不会被分拆成多个 Query 来进行 Cache。这就表示query cache不会缓存子查询，内嵌视图，部分的UNION。

b. 查询语句必须与query cache中的查询语句完全一致才能命中。

因为在从query cache中匹配的时候不会将其解析为规范的query语句。因此查询语句必须和query cache中的语句完全一致，每一个字节都相匹配时，才会被query cache命中。这就意味着，如果你在query中添加了一些动态的注释，或者有多余的空格，或者使用了不同的大小写，query cache都会认为他们是不同的query语句。

c.只有select queries才会被cache。SHOW命令和调用存储过程都不会被query cache捕获。就算存储过程只是从table中进行简单的select查询也不会被cache。

d. Avoid comment (and space) in the start of the query

在query的开始尽量避免使用注释和空格。query cache在检查query是否能够被cache时做一些简单的优化。曾提到过只有select query才能够被cache。因此，query cache会去查找query的第一个字母，检查是否是以’S'or’s'开头的，如果是的，则在query cache中进行查找。如果不是，则跳过搜索query cache这一步。因此，query开始的注释和空格很有可能会导致该query被query cache忽略。

e.query cache不支持prepared 语句和游标cursors。

f.有可能不支持事务

对数据库进行操作时，由于执行update操作的顺序不同，或者基于不同的snapshot进行不同的事务得到的结果可能不同。如果在事务外面进行select语句，这样被cache的机会会比较大。

g.Query must be deterministic

对于大部分的查询query来说，如果数据不变，不管执行多少次，得到的结果都很有可能是一样的。但是如果使用一些非确定性的实时相关的函数,例如UUID(), RAND(), CONNECTION_ID()等等，那么该查询是不会被cache的。

h.Table level granularity in invalidation

在失效判断时是表级别的粒度

如果对某表进行了更新，那么cache中关于该表的所有query全部都会成为invalid。这里的表修改，不仅仅是指数据的更新，表结构的修改也会导致query cache失效。实际上在对表进行更新时，大部分的查询结果都很有可能是不会改变的，但是MySQL没有办法确认哪些query的结果是有变化，哪些是没有变化的，只能将该表相关的所有query全部丢弃。query cache的这个特点也是限制了的效率的一个重大因素。如果是一个拥有高写操作的应用，例如论坛，那么query cache的效率就会很低了。同样需要注意的是，在进行表更改时，关于这个表的query需要全部从cache中删掉。因此如果大量的query被cache起来，那么会对更新操作的速度有一定的影响。

i.Fragmentation over time

长时间的query cache之后很有可能产生内存碎片，这样会降低query cache的效率。是否产生碎片可以通过Qcache_free_blocks 和 Qcache_free_memory的值来判断。FLUSH QUERY CACHE这个命令可以用来对query cache进行碎片整理。但是由于该命令有可能会阻塞query cache 很长一段时间，所以一般不适合在线上产品上使用。

j.Limited amount of usable memory

query cache中的缓存的query会因为表的更新而被清除cache。因此就算有大量的query在MySQL上运行，query cache中的query数目应该不会太多，query cache使用的内存也不会无限制的增长。当然，在特殊情况下，某些表是从来不被更新的，这样query cache就有可能不够用，但是这样的情况是非常少见的。因此如果你想将query cache设置为一个合理的值，那么就要观察以下两个系统状态参数的值：Qcache_free_memory 和 Qcache_lowmem_prunes。

* Qcache_free_memory：目前还处于空闲状态的 Query Cache 内存总量

* Qcache_lowmem_prunes：当 Query Cache 内存容量不够，需要从中删除老的 Query Cache 以给新的 Cache 对象使用的次数

如果Qcache_lowmem_prunes的值比较小，而Qcache_free_memory的值一直比较高的话，就可以将query cache适当的减小。反之，可以增大qeury cache的值，看看是否性能有所提高。

k. Demand operating mode

按需操作的工作模式：

* query_cache_type：控制 Query Cache 功能的开关，可以设置为0(OFF),1(ON)和2(DEMAND)三种，意义分别如下：

0(OFF)：关闭 Query Cache 功能，任何情况下都不会使用 Query Cache

1(ON)：开启 Query Cache 功能，但是当 SELECT 语句中使用的 SQL_NO_CACHE 提示后，将不使用Query Cache

2(DEMAND)：开启 Query Cache 功能，但是只有当 SELECT 语句中使用了 SQL_CACHE 提示后，才使用 Query Cache

query_cache_type默认设置为1，表示将所有select query都cache起来。当然，也可以在query中使用SQL_NO_CACHE，表示不要将对该query使用query cache。有一些情况下，你可能只希望cache部分的指定的query，这样就要使用DEMAND模式了。

l.Counting query cache efficiency

怎么判断query cache是否有效

有好几种方法去检查query cache是否高效。首先查看你的selects的命令的数目：Com_select，并查看有多少被cache。query cache的有效率可以这样算出来：Qcache_hits/(Com_select+Qcache_hits)。从公式中可以看出来，计算select的总数时，要加上query hits的数目。因为当query cache命中时，com_select的数目是不会增加的。

m. 查询query cache的代价

Query 语句的 hash 运算以及 hash 查找资源消耗。当我们使用 Query Cache 之后,每条 SELECT类型的 Query 在到达 MySQL 之后,都需要进行一个 hash 运算然后查找是否存在该 Query 的Cache,虽然这个 hash 运算的算法可能已经非常高效了,hash 查找的过程也已经足够的优化了,对于一条 Query 来说消耗的资源确实是非常非常的少,但是当我们每秒都有上千甚至几千条 Query 的时候,我们就不能对产生的 CPU 的消耗完全忽视了。

**综合以上的这些特点，这里有一些设置query cache的建议：**

a. 如果准备要使用query cache，那么从小的设置开始,比如10-20M。然后，检测打开query cache后对你的TPS/TQS或者反应时间的影响。如果性能下降了，那么query cache可能就不是很符合你的worklaod需求。

b. 如果你的workload是read/write混合型的，那么由于写操作而导致的query cache失效的代价就会比较大，而显示不出query cache的功效。

c. 如何去验证query cache打开了呢？

“SHOW VARIABLES LIKE ‘%query_cache%’;”

如果have_query_cache=TRUE 并且query_cache_size 大于0，那么query cache就是enabled的。

如果have_query_cache=FALSE或者query_cache_size 等于0，那么query cache就是disabled的。

d.确认打开后，如何去验证当前设置的query cache的size是合适的呢？

* Hit rate = Qcache_hits / (Qcache_hits + Com_select)

* Insert rate = Qcache_inserts / (Qcache_hits + Com_select)

* Prune rate = Qcache_lowmem_prunes / Qcache_inserts

这些参数最好是在系统的cache到达一个稳定状态下获得。因此最好是可以让你的产品开始工作10到30分钟后，读取这些状态参数信息较为准确。

关于命中率：hit rate，要注意的是相对较低的命中率也有可能会对性能有实质性的提升，因为命中的query可能是一些cost非常大的复杂查询。因此我们对于innodb buffer pool的命中率可能要高达到90%以上，但是如果query cache的命中率就算不到50%也可能是很正常的。但是另一方面，如果你的命中率一直低于10%的话，就要真正的怀疑打开query cache的价值了。因为对于每个select query都需要查找cache，这个查询的代价有时也是不可忽略的。当然，这样的情况下，仍然可以通过得到TPS的吞吐量和反应时间来衡量打开query cache后带来的是正面影响还是负面影响。

关于插入率:insert rate，要注意的是相对较低的插入率对性能会有很大的提升,因为更新cache的cost也是非常大的。如果这个插入率的值高于10%的话，就需要测试一下打开query cache和关闭query cache的性能比较了。

关于替换率:prune rate，如果这个值偏大时就表明要适当的增加query cache的大小了。在增大query cache的大小时，要注意到增大query cache的size也会导致query之前的查询query cache的代价随之提高，因此，如果真的要增加时，要注意以较小的增幅去调整，观察状态参数，进行性能比较后再确定增加的大小。

**参考资料：**

[http://www.mysqlperformanceblog.com/2006/07/27/mysql-query-cache/](http://www.mysqlperformanceblog.com/2006/07/27/mysql-query-cache/)

[http://blogs.oracle.com/dlutz/entry/mysql_query_cache_sizing](http://blogs.oracle.com/dlutz/entry/mysql_query_cache_sizing)

[http://isky000.com/database/mysql-query-cache-summary](http://isky000.com/database/mysql-query-cache-summary)