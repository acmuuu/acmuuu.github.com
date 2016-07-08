---
layout: post
category : MySQL
tags : [InnoDB, Concurrency, my.cnf]
title: InnoDB线程并发检查机制
---
{% include JB/setup %}
**来自：[http://www.taobaodba.com/html/368_about_innodb_thread_concurrency.html](http://www.taobaodba.com/html/368_about_innodb_thread_concurrency.html)**

InnoDB在接受MySQL线程调用时，有一个并发线程的检查机制，通过**innodb_thread_concurrency**参数进行控制。如果参数设置大于0，则表示检查机制开启，允许进入的线程数就是参数的值。等于0则禁用并发检查。

在新的MySQL线程调用Innodb接口前，Innodb会检查已经接受的请求线程数，如已经超过innodb_thread_concurrency设置的限制，则该请求线程会等待**innodb_thread_sleep_delay**微秒后尝试重新请求，如果第二次请求还是无法获得，则该线程会进入线程队列休眠。重试两次的机制是为了减少CPU的上下文切换的次数，以降低CPU消耗，这和Oracle中latch的spin机制是同样的道理。如果请求被Innodb接受，则会获得一个次数为**innodb_concurrency_tickets**(默认500次)的通行证，在次数用完之前，该线程重新请求时无须再进行前面所说innodb_thread_concurrency的检查。

上述检查逻辑在源码**storage/innobase/srv/srv0srv.c**(Innodb很多参数都可以在该文件中找到定义)的**srv_conc_enter_innodb**函数中，有兴趣的可以仔细阅读一下，代码比较浅显，不难理解。另外，如果是一个已经持有lock的线程，则通过调用**srv_conc_force_enter_innodb**函数可以无视该检查，这是为了避免线程长时间持有锁影响性能，且可能增加死锁的机率。除此之外，slave线程也是有无视检查直接通行的权限。

简单思考一下上述机制，可以得出一个初步的推论：在数据库并发请求较小的情况下，从性能上来说禁用检查机制应该是更好的，毕竟执行检查机制本身也需要加锁(Mutex)。当并发线程很高的情况下，则开启检查机制对性能更有利。至于具体innodb_thread_concurrency设置为多少，可能就需要在不同的条件下实际的做一下测试了，不同的硬件环境，不同的MySQL版本和Innodb版本，应该都会有一些区别。

源代码中对于innodb_thread_concurrency参数的注释如下：

	/* The following controls how many threads we let inside InnoDB concurrently:
	threads waiting for locks are not counted into the number because otherwise
	we could get a deadlock. MySQL creates a thread for each user session, and
	semaphore contention and convoy problems can occur withput this restriction.
	Value 10 should be good if there are less than 4 processors + 4 disks in the
	computer. Bigger computers need bigger values. Value 0 will disable the
	concurrency check. */

ulong   srv_thread_concurrency  = 0;
因为检查机制需要Mutex保护(Mutex-based Model)，所以开启检查本身也有性能消耗，并且扩展性也会受到限制，在MySQL5.4版本中引入了一种新的机制（Timer-based Model），这里就不讨论了，有兴趣的可以参考[这里](http://mikaelronstrom.blogspot.com/2009/05/mysql-54-patches-innodb-thread.html)（需要翻墙），实际上[XtraDB存储引擎](http://www.ningoo.net/html/2009/xtradb_storage_engine.html)里已经包含Timer-based Model，通过参数**innodb_thread_concurrency_timer_based**可以开启，默认为OFF。在MySQL5.4的srv0srv.c的源代码中的注释中，可以看到Google和Percona的版权声明，看来MySQL5.4中吸引了很多第三方的改进代码，值得期待。