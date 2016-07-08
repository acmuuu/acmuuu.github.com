---
layout: post
category : MySQL
tags : [MySQL, SWAP]
title: MySQL如何避免使用swap
---
{% include JB/setup %}
**MySQL如何避免使用swap**

**来自[http://www.realzyy.com/?p=923](http://www.realzyy.com/?p=923)**

Linux有很多很好的内存、IO调度机制，但是并不会适用于所有场景。对于DBA来说Linux比较让人头疼的一个地方是，它不会因为MySQL很重要就避免将分配给MySQL的地址空间映射到swap上。对于频繁进行读写操作的系统而言，数据看似在内存而实际上在磁盘是非常糟糕的，响应时间的增长很可能直接拖垮整个系统。这篇blog主要讲讲我们作为DBA，怎样尽量避免MySQL惨遭swap的毒手。

首先我们要了解点基础的东西，比如说为什么会产生swap。假设我们的物理内存是16G，swap是4G。如果MySQL本身已经占用了12G物理内存，而同时其他程序或者系统模块又需要6G内存，这时候操作系统就可能把MySQL所拥有的一部分地址空间映射到swap上去。

cp一个大文件，或用mysqldump导出一个很大的数据库的时候，文件系统往往会向Linux申请大量的内存作为cache，一不小心就会导致L使用swap。这个情景比较常见，以下是最简单的三个调整方法：

1、/proc/sys/vm/swappiness的内容改成0（临时），/etc/sysctl.conf上添加vm.swappiness=0（永久）

这个参数决定了Linux是倾向于使用swap，还是倾向于释放文件系统cache。在内存紧张的情况下，数值越低越倾向于释放文件系统cache。当然，这个参数只能减少使用swap的概率，并不能避免Linux使用swap。

2、修改MySQL的配置参数innodb_flush_method，开启O_DIRECT模式。

这种情况下，InnoDB的buffer pool会直接绕过文件系统cache来访问磁盘，但是redo log依旧会使用文件系统cache。值得注意的是，Redo log是覆写模式的，即使使用了文件系统的cache，也不会占用太多。

3、添加MySQL的配置参数memlock

这个参数会强迫mysqld进程的地址空间一直被锁定在物理内存上，对于os来说是非常霸道的一个要求。必须要用root帐号来启动MySQL才能生效。

还有一个比较复杂的方法，指定MySQL使用大页内存（Large Page）。Linux上的大页内存是不会被换出物理内存的，和memlock有异曲同工之妙。

具体的配置方法可以参考：http://harrison-fisk.blogspot.com/2009/01/enabling-innodb-large-pages-on-linux.html


之前介绍了MySQL如何避免使用swap的四个方法。这里需要补充一下**原理和实现机制**，对于Linux api不感兴趣的同学可以直接跳过。

**一、操作系统设置swap的目的**

程序运行的一个必要条件就是足够的内存，而内存往往是系统里面比较紧张的一种资源。为了满足更多程序的要求，操作系统虚拟了一部分内存地址，并将之映射到swap上。对于程序来说，它只知道操作系统给自己分配了内存地址，但并不清楚这些内存地址到底映射到物理内存还是swap。

物理内存和swap在功能上是一样的，只是因为物理存储元件的不同（内存和磁盘），性能上有很大的差别。操作系统会根据程序使用内存的特点进行换入和换出，尽可能地把物理内存留给最需要它的程序。但是这种调度是按照预先设定的某种规则的，并不能完全符合程序的需要。一些特殊的程序（比如MySQL）希望自己的数据永远寄存在物理内存里，以便提供更高的性能。于是操作系统就设置了几个api，以便为调用者提供“特殊服务”。

**二、Linux提供的几个api**

1、mlockall()和munlockall()

这一对函数，可以让调用者的地址空间常驻物理内存，也可以在需要的时候将此特权取消。mlockall()的flag位可以是MCL_CURRENT和MCL_FUTURE的任意组合，分别代表了“保持已分配的地址空间常驻物理内存”和“保持未来分配的地址空间常驻物理内存”。对于Linux来说，这对函数是非常霸道的，只有root用户才有权限调用。

2、shmget()和shmat()

这一对函数，可以向操作系统申请使用大页内存（Large Page）。大页内存的特点是预分配和永驻物理内存，因为使用了共享内存段的方式，page table有可能会比传统的小页分配方式更小。对于多进程共享内存的程序（比如ORACLE），大页内存能够节省很多page table开销；而对于MySQL来说，性能和资源开销都没有显著变化，好处就在于减少了内存地址被映射到swap上的可能。至于为什么是减少，而不是完全避免，之后再讲解。

3、O_DIRECT和posix_memalign()

以上两个方法都不会减少内存的使用量，调用者的本意是获取更高的系统特权，而不是节约系统资源。O_DIRECT是一种更加理想化的方式，通过避免double buffer，节省了文件系统cache的开销，最终减少swap的使用率。O_DIRECT是Linux IO调度相关的标志，在open函数里面调用。通过O_DIRECT标志打开的文件，读写都不会用到文件系统的cache。传统的数据库（ORACLE、MySQL）基本都有O_DIRECT相关的开关，在提高性能的同时，也减少了内存的使用。至于posix_memalign()，是用来申请对齐的内存地址的。只有用posix_memalign()申请的内存地址，才能用来读写O_DIRECT模式下的文件描述符。

4、madvise()和fadvise()

这对函数也是比较温和的，可以将调用者对数据访问模式的预期传递给Linux，以期得到更好的性能。
我们比较感兴趣的是MADV_DONTNEED和FADV_NOREUSE这两个flag。前者会建议Linux释放指定的内存区域，而后者会建议文件系统释放指定文件所占用的cache。

**三、MySQL内存使用相关的一些代码**

1、memlock

在MySQL的源码目录里面查询memlock，可以知道这个参数的作用是使MySQL调用mlockall()。在源码里面匹配可以得知NDB、MyISAM和mysqld都调用了mlockall()。NDB是可以独立于MySQL而存在的存储引擎，此处按下不表。mysqld调用mlockall()的方式有点出乎意料，在init_server_components()函数里传给mlockall()的flag是MCL_CURRENT，也就是说之后申请的内存一概不用锁住。再看看MyISAM的调用顺序是：mlockall() <- lock_memory() <- mi_repair()，MyISAM只有修复的时候会调用mlockall()函数。

2、large-pages

根据Linux的内核文档，大页内存有两种方法可以用到：一种是创建hugetlb类型的文件，并将它mmap到程序的内存地址里面，然后进行正常的读写操作。另外一种是之前说到的shmget()+shmat()，也正是MySQL采用的方式。在MySQL的源码目录里面匹配shmget，可以发现BDB、NDB、InnoDB、MyISAM都调用了这个函数。接着看一下比较常用的InnoDB和MyISAM引擎。

在InnoDB里面可以找到os_mem_alloc_large()调用了shmget()，而调用os_mem_alloc_large()的函数只有buf_pool_init()——InnoDB Buffer Pool的初始化函数。根据观察得到的结论是，InnoDB会根据配置参数在Buffer Pool里面使用大页内存，Redo log貌似就没有这个待遇了。

对于MyISAM，在storage层级的代码里面找不到对shmget()的直接调用。这是因为MyISAM是MySQL的原生存储引擎，很多函数存放在上一层的mysys目录里面。通过搜索shmget()，我们可以找到MyISAM的调用顺序是这样的：shmget() <- my_large_malloc_int() <- my_large_malloc() <- init_key_cache()。也就是说MyISAM只有索引缓存用到了大页内存，这是很容易理解，因为MyISAM的数据是直接扔给文件系统做缓存的，没法使用大页内存。

3、innodb_flush_method

O_DIRECT是BDB、NDB、InnoDB特有的参数，在这里只讨论InnoDB这个比较常见的引擎。在InnoDB的源码目录里面匹配O_DIRECT，很容易找到一个叫做os_file_set_nocache()的函数，而这个函数作用是将文件的打开方式改为O_DIRECT模式。再跟踪一下，会发现只有os_file_create()函数调用了os_file_set_nocache()。虽然函数名里面还有create，实际上os_file_create()会根据传入参数的不同，选择打开或者新建一个文件。同时os_file_create()还会根据MySQL的配置，来调用os_file_set_nocache()关闭文件系统的相应cache。在os_file_create()函数里面有如下一段代码：

    /* We disable OS caching (O_DIRECT) only on data files */
    if (type != OS_LOG_FILE &&
      srv_unix_file_flush_method == SRV_UNIX_O_DIRECT)
    {
        os_file_set_nocache(file, name, mode_str);
    }

这段代码的意思是，只有InnoDB的数据文件有资格使用O_DIRECT模式，Redo log是不能使用的。

以上的分析基于5.0.85版本的原版MySQL，InnoDB是Innobase。
版本不同情况下可能会有一些出入，欢迎参与讨论。

**参考文献：**

[Virtual memory@wiki](http://en.wikipedia.org/wiki/Virtual_memory)

[All about Linux swap space](http://www.linux.com/news/software/applications/8208-all-about-linux-swap-space)

[HugeTLB – Large Page Support in the Linux Kernel](http://linuxgazette.net/155/krishnakumar.html)

[Page table@wiki](http://en.wikipedia.org/wiki/Page_table)