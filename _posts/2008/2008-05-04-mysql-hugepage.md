---
layout: post
category : MySQL
tags : [Hugepage]
title: 设置MySQL使用大内存页面
---
{% include JB/setup %}
**原文来源：** [http://qroom.blogspot.hk/2008/05/mysql.html](http://qroom.blogspot.hk/2008/05/mysql.html)

一般情况下使用的内存为每页4K，使用 huge page 的话默认是每页 2M。如果设置MySQL使用 huge page 至少有两个好处，一个是可以减少 Translation Lookaside Buffer (TLB) 失误以提高性能，另一个是利用 huge page不会swap的特性保证MySQL的内存不会被交换到swap中。

MySQL 5.0.3之后在linux上支持huge page，可以使用 large-page 选项启动MySQL。

当然还有一些相关的系统设置。

	echo 400 > /proc/sys/vm/nr_hugepages

这个指定总共huge page的页数，可以放到/etc/rc.local中。由于分配时需要有连续的内存空间，所以如果在运行了一段时间的系统上执行，可能无法分配到指定的数量，即使还有足够的内存。

之后还需要设置内核参数kernel.shmmax和kernel.shmall，否则MySQL启动时会报22的错误

	InnoDB: HugeTLB: Warning: Failed to allocate 536887296 bytes. errno 22

shmmax是最大的共享内存段的大小，单位是字节，默认32M，肯定是不够的，这个应该比innodb_buffer_pool要大。

shmall是共享内存的总大小，单位是页，默认2097152（8G）。

可以使用sysctl -w或者在/etc/sysctl.conf中设置。

除此还需要设max locked memory，使用ulimit -l或设置/etc/security/limits.conf，否则会报12的错误：

	Warning: Failed to allocate 31457280 bytes from HugeTLB memory. errno 12

MySQL启动之后可以使用

	grep Huge /proc/meminfo

查看huge page的使用情况。

	HugePages_Total:   400
	HugePages_Free:    128
	Hugepagesize:      2048 kB