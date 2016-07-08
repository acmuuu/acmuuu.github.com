---
layout: post
category : MySQL
tags : [InnoDB, Concurrency, my.cnf]
title: Percona@Flash<1>:innodb_thread_concurrency
---
{% include JB/setup %}
**原文来源：** [http://www.mysqlsky.com/201201/percona_flash_innodb_thread_concurrency](http://www.mysqlsky.com/201201/percona_flash_innodb_thread_concurrency)

之前参考了Percona和FusionIO官方的PPT

[Tuning-For-Speed-Percona-Server-and-Fusion-io](http://vdisk.weibo.com/s/2cz5G)，[MySQL-Fusion-io Best Practices Guide](http://vdisk.weibo.com/s/2cz5S)，和[一篇博客](http://hatemysql.com/2011/11/04/percona%E5%8F%82%E6%95%B0%E8%AE%BE%E7%BD%AE%E6%A0%87%E5%87%86/)。

确定出的参数在实际测试场景中效果并不太好，随后我又对各个参数做单独测试，结合测试进行平衡性调整；

有一些收获，as follow:

**innodb_thread_concurrency**

当该参数为0时，以下参数作废innodb_spin_wait_delay，innodb_sync_spin_loops；

如果此时并发度非常高，会产生大量kernel_mutex等待，

cpu资源大量消耗在sys中，严重时qps会降为0；Percona的这篇文章对这三个参数做了benchmark，给出了纯内存访问的重现方法

MySQL最近的版本都在解决资源征用的问题，5.6将kernel mutex直接移除，但用上还是遥遥无期。

**关于innodb_thread_concurrency参数**

[http://dev.mysql.com/doc/refman/5.5/en/innodb-parameters.html#sysvar_innodb_thread_concurrency](http://dev.mysql.com/doc/refman/5.5/en/innodb-parameters.html#sysvar_innodb_thread_concurrency)

	Command-Line Format	--innodb_thread_concurrency=#
	Option-File Format	innodb_thread_concurrency
	Option Sets Variable	Yes, innodb_thread_concurrency
	Variable Name	innodb_thread_concurrency
	Variable Scope	Global
	Dynamic Variable	Yes
		Permitted Values
	Type	numeric
	Default	0
	Range	0 .. 1000
	
InnoDB tries to keep the number of operating system threads concurrently inside InnoDB less than or equal to the limit given by this variable. Once the number of threads reaches this limit, additional threads are placed into a wait state within a FIFO queue for execution. Threads waiting for locks are not counted in the number of concurrently executing threads.

The correct value for this variable is dependent on environment and workload. Try a range of different values to determine what value works for your applications. A recommended value is 2 times the number of CPUs plus the number of disks.

The range of this variable is 0 to 1000. A value of 0 (the default) is interpreted as infinite concurrency (no concurrency checking). Disabling thread concurrency checking enables InnoDB to create as many threads as it needs.

参数的含义是: InnoDB内部的并发线程数，可以动态修改。

具体解析: InnoDB 试图保持InnoDB内部的并发操作系统的线程数少于innodb_thread_concurrency设置的值，如果innodb并发线程数快要到达innodb_thread_concurrency=x，其他的innodb线程会被设置为等待状态，队列的算法是FIFO，处于等待拿锁状态的线程数，不会被计算入正在执行的并发线程数。innodb_thread_concurrency=x，x该设怎样的值，视服务器配置和服务器的负载情况。

默认推荐的值是: (cpu的数量+磁盘数量)x2 （我的理解，对于raid10的磁盘阵列，应该是磁盘总数/2)，参数取值范围 0-1000 当为默认值的时候，不是说0个并发线程。 而是被解释为无限并发(没有并发检查)。当innodb_thread_concurrency=0的时候，可以理解为 禁用线程并发检查，使InnoDB按照请求的需求, 创造尽可能多的线程.

单项测试：

	innodb_buffer_pool_size[15G] innodb_flush_log_at_trx_commit[1] innodb_flush_method[O_DIRECT]
	innodb_max_dirty_pages_pct[60] innodb_thread_concurrency[32] innodb_io_capacity[15000]

推荐配置：

	innodb_thread_concurrency    32
	
	innodb_spin_wait_delay    30
	innodb_sync_spin_loops    100

会有ut_delay产生，但会避免mutex严重到耗尽sys cpu。

建议在大促时根据系统情况适当调整。