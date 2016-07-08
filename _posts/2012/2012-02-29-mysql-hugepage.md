---
layout: post
category : MySQL
tags : [Hugepage]
title: MySQL启用hugepage及相关监控How to
---
{% include JB/setup %}
**原文来源：** [http://www.mysqlsky.com/201202/mysql_enable_hugepage_howto](http://www.mysqlsky.com/201202/mysql_enable_hugepage_howto)

a.确认支持huge page

    grep -i page /proc/meminfo

如下：

    AnonHugePages:       0 kB
    HugePages_Total:     0
    HugePages_Free:      0
    HugePages_Rsvd:      0
    HugePages_Surp:      0
    Hugepagesize:     2048 kB

b.修改预分配的hugepages大小

    sysctl -w vm.nr_hugepages=18000
    grep -i huge /proc/meminfo

如下：

    AnonHugePages:       0 kB
    HugePages_Total: 18000
    HugePages_Free:  18000
    HugePages_Rsvd:      0
    HugePages_Surp:      0
    Hugepagesize:     2048 kB

c.查看mysql用户的组信息

    id mysql
    uid=502(mysql) gid=501(dba) groups=501(dba)

d.配置使用大页内存的用户组

    sysctl -w  vm.hugetlb_shm_group=501

e.修改ulimit

    vi /etc/security/limits.conf
    @mysql soft memlock unlimited
    @mysql hard memlock unlimited

f.修改/etc/sysconfig.conf

    #Increase the amount of shmem allowed per segment
    #This depends upon your memory, remember your
    kernel.shmmax = 68719476736
    #Increase total amount of shared memory.
    kernel.shmall = 4294967296

g.修改my.cnf

    [mysqld]
    large_pages

h.监测TLB miss的情况

    sudo perf stat -e dTLB-load-misses -p `pidof /u01/mysql/bin/mysqld`

i.监测内存页面交换

    sar -B 10


**开启大页内存的好处：**

    1.减少内存置换
    2.减少TLB miss次数
    3.减少swap

Translation Lookaside Buffer是内存页表的硬件cache，没有tbl每次内存访问都有两个过程（从页表得到物理地址+取数据）；

当TLB命中时，可以节约扫page table的耗时

![Alt text](/assets/images/2012/02/22522644_thumb.jpg)

**参考文档：**

[http://en.wikipedia.org/wiki/Page_table](http://en.wikipedia.org/wiki/Page_table)

[http://www.cyberciti.biz/tips/linux-hugetlbfs-and-mysql-performance.html](http://www.cyberciti.biz/tips/linux-hugetlbfs-and-mysql-performance.html)

[http://lwn.net/Articles/423584/](http://lwn.net/Articles/423584/)


**MySQL开启Hugepage性能对比**

**原文来源：** [http://www.mysqlsky.com/201202/mysql_hugepage_diff](http://www.mysqlsky.com/201202/mysql_hugepage_diff)

![Alt text](/assets/images/2012/02/image_thumb1.png)

pgpgin/s:表示每秒从磁盘或SWAP置换到内存的字节数(KB)

pgfree/s:每秒被放入空闲队列中的页个数

pgpgout/s:表示每秒从内存置换到磁盘或SWAP的字节数(KB) pgscank/s:每秒被kswapd扫描的页个数fault/s:每秒钟系统产生的缺页数,即主缺页与次缺页之和(major + minor)majflt/s:每秒钟产生的主缺页数

