---
layout: post
category : MySQL
tags : [MySQL, InnoDB]
title: SHOW INNODB STATUS
---
{% include JB/setup %}
**原文来源：** [http://www.mysqlperformanceblog.com/2006/07/17/show-innodb-status-walk-through/](http://www.mysqlperformanceblog.com/2006/07/17/show-innodb-status-walk-through/)

**叶金荣译：** [http://imysql.com/2008_05_22_walk_through_show_innodb_status](http://imysql.com/2008_05_22_walk_through_show_innodb_status)

**首先，让我们来了解一下 SHOW INNODB STATUS 输出的基础**

它打印了很多关于 InnoDB 内部性能相关的计数器、统计、事务处理信息等。在 MySQL 5 中，InnoDB 的性能统计结果也在 SHOW STATUS 结果中显示了。大部分和 SHOW INNODB STATUS 的其他信息相同，在旧版本中还没有这个功能。

SHOW INNODB STATUS 中的很多统计值都是每秒更新一次的，如果你打算利用这些统计值的话，那么最好统计一段时间内的结果。InnoDB 首先输出以下信息：

    1.=====================================
    2.060717  3:07:56 INNODB MONITOR OUTPUT
    3.=====================================
    4.Per second averages calculated from the last 44 seconds

首先要确认这是至少统计了 20-30 秒的样本数据。如果平均统计间隔是0或1秒，那么结果就没什么意义了。
说实在的我不喜欢InnoDB提供的平均值，因为很难取得合理的平均间隔统计值，如果你是写脚本来取得 SHOW INNODB STATUS 结果的话，那么最好取得全局的统计结果，然后取得平均值。当然了，直接查看输出的结果信息也是很有用的。

**下一部分显示了信号(Semaphores)相关信息**

    1. ----------
    2. SEMAPHORES
    3. ----------
    4. OS WAIT ARRAY INFO: reservation count 13569, signal count 11421
    5. --Thread 1152170336 has waited at ./../include/buf0buf.ic line 630 for 0.00 seconds the semaphore:
    6. Mutex at 0x2a957858b8 created file buf0buf.c line 517, lock var 0
    7. waiters flag 0
    8. wait is ending
    9. --Thread 1147709792 has waited at ./../include/buf0buf.ic line 630 for 0.00 seconds the semaphore:
    10.Mutex at 0x2a957858b8 created file buf0buf.c line 517, lock var 0
    11.waiters flag 0
    12.wait is ending
    13.Mutex spin waits 5672442, rounds 3899888, OS waits 4719
    14.RW-shared spins 5920, OS waits 2918; RW-excl spins 3463, OS waits 3163

这段可以分成2个部分。一部分是当前的等待，这部分只是包含了在高并发环境下的全部记录，因此 InnoDB 会频繁回退到系统等待。如果等待是通过自旋锁来解决的话，那么这些信息就就不会显示了。

通过这部分信息，你就会知道系统负载的热点在哪了。不过这需要了解一下源码相关的知识，从上面的信息中就可以看出来是哪个源码文件中的哪行(不同的版本结果可能不同)，只是从这里却看不出来任何信息。尽管如此，还是可以从文件名中猜到一些东西，比如本例中，文件名 "buf0buf.ic" 预示着和一些缓冲池争夺有关系。如果想了解更多，就去看源码吧。

还有一些关于等待的更多细节。"lock var" 表示当前的 mutex 对象的值(被锁住 = 1 / 释放 = 0) 值，"waiters flag" 表示当前的等待个数。另外，本例中还可以看到等待状态信息 "wait is ending"，这表示 mutex 已经释放，但是系统调度线程还正在处理。

第二块是事件统计，"reservation count" 和 "signal count" 显示了 innodb 使用内部同步阵列的活跃程度，时间片(slot)分配以及线程信号使用同步阵列的频繁程度。这些统计信息可以用于表示 innodb 回退到系统等待的频率。还有关于系统等待的直接相关信息，可以看到"OS Waits"的互斥信号灯(mutexes)，以及读写锁。这些信息中显示了互斥锁和共享锁。系统等待和 "保留(reservation)" 不完全一样，在回退到用 sync_array 的复杂等待模式前，innodb 会尝试 "输出(yield)" 到系统，希望下一次调度时间对象里命名线程已经释放了。系统等待相对较慢，如果每秒发生了上万次系统等待，则可能会有问题。另一个观察方法是查看系统状态中的上下文(context)交换频率。

另一块重要的信息是 "spin waits" 和 "spin rounds" 的数量。相较于系统等待，自旋锁是低成本的等待；不过它是一个活跃的等待，会浪费一些cpu资源。因此如果看到大量的自旋等待和自旋轮转，则很显然它浪费了很多cpu资源。浪费cpu时间和无谓的上下文切换之间可以用 innodb_sync_spin_loops 来平衡。

**接下来的这段显示死锁状况**

    1. ------------------------
    2. LATEST DETECTED DEADLOCK
    3. ------------------------
    4. 060717  4:16:48
    5. *** (1) TRANSACTION:
    6. TRANSACTION 0 42313619, ACTIVE 49 sec, process no 10099, OS thread id 3771312 starting index read
    7. mysql tables in use 1, locked 1
    8. LOCK WAIT 3 lock struct(s), heap size 320
    9. MySQL thread id 30898, query id 100626 localhost root Updating
    10.update iz set pad='a' where i=2
    11.*** (1) WAITING FOR THIS LOCK TO BE GRANTED:
    12.RECORD LOCKS space id 0 page no 16403 n bits 72 index `PRIMARY` of table `test/iz` trx id 0 42313619 lock_mode X locks rec but not gap waiting
    13.Record lock, heap no 5 PHYSICAL RECORD: n_fields 4; compact format; info bits 0
    14. 0: len 4; hex 80000002; asc     ;; 1: len 6; hex 00000285a78f; asc       ;; 2: len 7; hex 00000040150110; asc    @   ;; 3: len 10; hex 61202020202020202020; asc a         ;;
    15. 
    16.*** (2) TRANSACTION:
    17.TRANSACTION 0 42313620, ACTIVE 24 sec, process no 10099, OS thread id 4078512 starting index read, thread declared inside InnoDB 500
    18.mysql tables in use 1, locked 1
    19.3 lock struct(s), heap size 320
    20.MySQL thread id 30899, query id 100627 localhost root Updating
    21.update iz set pad='a' where i=1
    22.*** (2) HOLDS THE LOCK(S):
    23.RECORD LOCKS space id 0 page no 16403 n bits 72 index `PRIMARY` of table `test/iz` trx id 0 42313620 lock_mode X locks rec but not gap
    24.Record lock, heap no 5 PHYSICAL RECORD: n_fields 4; compact format; info bits 0
    25. 0: len 4; hex 80000002; asc     ;; 1: len 6; hex 00000285a78f; asc       ;; 2: len 7; hex 00000040150110; asc    @   ;; 3: len 10; hex 61202020202020202020; asc a         ;;
    26. 
    27.*** (2) WAITING FOR THIS LOCK TO BE GRANTED:
    28.RECORD LOCKS space id 0 page no 16403 n bits 72 index `PRIMARY` of table `test/iz` trx id 0 42313620 lock_mode X locks rec but not gap waiting
    29.Record lock, heap no 4 PHYSICAL RECORD: n_fields 4; compact format; info bits 0
    30. 0: len 4; hex 80000001; asc     ;; 1: len 6; hex 00000285a78e; asc       ;; 2: len 7; hex 000000003411d9; asc     4  ;; 3: len 10; hex 61202020202020202020; asc a         ;;
    31. 
    32.*** WE ROLL BACK TRANSACTION (2)

这里显示了 Innodb 最后检测到事务引发的死锁，包括发生死锁时的状态，加了什么锁，在等待什么锁释放，以及 Innodb 决定哪个事务会被回滚。注意，innodb只显示了事务持有锁的相关简单信息。并且只显示了每个事务最后执行的语句，发生死锁的记录就是由于这些语句引起的。查看复杂的死锁信息还需要查看日志文件，才能找到真正引发冲突的语句。大部分情况下，SHOW INNODB STATUS 显示的信息基本足够了。

**下面是关于外键约束引发的死锁信息**

    1. ------------------------
    2. LATEST FOREIGN KEY ERROR
    3. ------------------------
    4. 060717  4:29:00 Transaction:
    5. TRANSACTION 0 336342767, ACTIVE 0 sec, process no 3946, OS thread id 1151088992 inserting, thread declared inside InnoDB 500
    6. mysql tables in use 1, locked 1
    7. 3 lock struct(s), heap size 368, undo log entries 1
    8. MySQL thread id 9697561, query id 188161264 localhost root update
    9. insert into child values(2,2)
    10.Foreign key constraint fails for table `test/child`:
    11.,
    12.  CONSTRAINT `child_ibfk_1` FOREIGN KEY (`parent_id`) REFERENCES `parent` (`id`) ON DELETE CASCADE
    13.Trying to add in child table, in index `par_ind` tuple:
    14.DATA TUPLE: 2 fields;
    15. 0: len 4; hex 80000002; asc     ;; 1: len 6; hex 000000000401; asc       ;;
    16. 
    17.But in parent table `test/parent`, in index `PRIMARY`,
    18.the closest match we can find is record:
    19.PHYSICAL RECORD: n_fields 3; 1-byte offs TRUE; info bits 0
    20. 0: len 4; hex 80000001; asc     ;; 1: len 6; hex 0000140c2d8f; asc     - ;; 2: len 7; hex 80009c40050084; asc    @   ;;

Innodb会显示引发错误的语句。外键约束定义失败，以及定义关系最密切的父表。有很多嵌接信息都是用16进制表示，不过对于问题诊断并不是太重要，它们主要用于给 Innodb 的开发者来查看或者用于调试目的。

**接下来是显示 Innodb 当前活跃的事务**

    1. ------------
    2. TRANSACTIONS
    3. ------------
    4. Trx id counter 0 80157601
    5. Purge done for trx's n:o <0 80154573 undo n:o <0 0
    6. History list length 6
    7. Total number of lock structs in row lock hash table 0
    8. LIST OF TRANSACTIONS FOR EACH SESSION:
    9. ---TRANSACTION 0 0, not started, process no 3396, OS thread id 1152440672
    10.MySQL thread id 8080, query id 728900 localhost root
    11.show innodb status
    12.---TRANSACTION 0 80157600, ACTIVE 4 sec, process no 3396, OS thread id 1148250464, thread declared inside InnoDB 442
    13.mysql tables in use 1, locked 0
    14.MySQL thread id 8079, query id 728899 localhost root Sending data
    15.select sql_calc_found_rows  * from b limit 5
    16.Trx read view will not see trx with id>= 0 80157601, sees <0 80157597
    17.---TRANSACTION 0 80157599, ACTIVE 5 sec, process no 3396, OS thread id 1150142816 fetching rows, thread declared inside InnoDB 166
    18.mysql tables in use 1, locked 0
    19.MySQL thread id 8078, query id 728898 localhost root Sending data
    20.select sql_calc_found_rows  * from b limit 5
    21.Trx read view will not see trx with id>= 0 80157600, sees <0 80157596
    22.---TRANSACTION 0 80157598, ACTIVE 7 sec, process no 3396, OS thread id 1147980128 fetching rows, thread declared inside InnoDB 114
    23.mysql tables in use 1, locked 0
    24.MySQL thread id 8077, query id 728897 localhost root Sending data
    25.select sql_calc_found_rows  * from b limit 5
    26.Trx read view will not see trx with id>= 0 80157599, sees <0 80157595
    27.---TRANSACTION 0 80157597, ACTIVE 7 sec, process no 3396, OS thread id 1152305504 fetching rows, thread declared inside InnoDB 400
    28.mysql tables in use 1, locked 0
    29.MySQL thread id 8076, query id 728896 localhost root Sending data
    30.select sql_calc_found_rows  * from b limit 5
    31.Trx read view will not see trx with id>= 0 80157598, sees <0 80157594

如果当前连接不是很多，则会显示全部事务列表；如果有大量连接，则 Innodb 只会显示他们的数量，减少输出的列表信息，使得输出结果不会太多。

事务ID是当前事务的标识，事务的id每次都会增加。Purge done for trx's n:o 是指净化(purge)线程已经完成的事务数。Innodb仅清除那些被当前事务认为不再需要的旧版本数据。那些未提交的旧事务可能会阻塞净化线程并且消耗资源。通过查看2次清除事务数之差，就可以知道是否发生了这种情况。少数情况下，净化线程可能难以跟上更新的速度，2次查看值之差可能会越来越大；那么，innodb_max_purge_lag 就派得上用场了。 "undo n:o" 显示了净化线程当前正在处理的回滚日志号，如果当前不处于活跃状态，则它的值是 0。

History list length 6 是指在回滚空间中的未清除事务数。随着事务的提交，它的值会增加；随着清除线程的运行，它的值会减小。

Total number of lock structs in row lock hash table 是指事务分配过的行锁结构总数。它和曾经被锁住过的行总数不一定相等，通常是一个锁结构对应多行记录。

MySQL中，每个连接如果没有活动的事务，则它的状态是 not started，如果有活动的事务，则是 ACTIVE。注意，尽管事务是活动的，但是其连接的状态却可能是 "睡眠(sleep)"，如果是在一个有多条语句的事务里的话。Innodb 会同时显示系统的线程号以及进程号，这有助于利用gdb来调试或者其他类似用途。另外，事务的状态也会根据当前实际状态来显示，例如 "读取记录(fetching rows)"，em>"更新(updating)"等等。"Thread declared inside InnoDB 400" 的意思是 Innodb 内核正在运行该线程，并且还需要400个票。Innodb 会根据 innodb_thread_concurrency 的值来限制同时并发的线程数不超过它。如果线程当前不在 Innodb 的内核中运行，则它的状态可能是 "waiting in InnoDB queue" 或 "sleeping before joining InnoDB queue"。后面这个状态有点意思，Innodb 为了避免有太多的线程同时抢着要进入运行队列，那么就会尝试让这些线程进入等待状态(如果没有足够的空闲插槽(slot)的话)。这就可能会导致 Innodb 内核中当前活跃的线程数可能比 innodb_thread_concurrency 的值还小。某种负载环境下，这可能有助于减小线程进入队列的时间。可以通过调整 innodb_thread_sleep_delay 来实现，它的单位是微妙。

mysql tables in use 1, locked 0 是指事务中已经用过的数据表个数(已经访问过了的)，以及被锁的个数。Innodb 一般情况不会锁表，因此锁表数一般是0，除非是 ALTER TABLE 或者其他类似 LOCK TABLES 的语句。

除了Innodb相关的特定信息外，一些基本信息可以通过 来查看，例如正在执行什么语句，查询ID号，查询状态等。

**下面这部分显示的是跟IO相关的具体信息**

    1. --------
    2. FILE I/O
    3. --------
    4. I/O thread 0 state: waiting for i/o request (insert buffer thread)
    5. I/O thread 1 state: waiting for i/o request (log thread)
    6. I/O thread 2 state: waiting for i/o request (read thread)
    7. I/O thread 3 state: waiting for i/o request (write thread)
    8. Pending normal aio reads: 0, aio writes: 0,
    9. ibuf aio reads: 0, log i/o's: 0, sync i/o's: 0
    10.Pending flushes (fsync) log: 0; buffer pool: 0
    11.17909940 OS file reads, 22088963 OS file writes, 1743764 OS fsyncs
    12.0.20 reads/s, 16384 avg bytes/read, 5.00 writes/s, 0.80 fsyncs/s

本部分显示了IO助手线程状态，插入缓冲线程，日志线程，读、写线程。它们分别对应插入缓冲合并，异步日志刷新，预读以及刷新脏数据。源自查询的正常读取是由正在运行的查询执行的。在Unix/Linux平台下，总能看见4个线程，在Windows上可以通过 innodb_file_io_threads 来调整。每个线程准备好之后都能看到其状态：waiting for i/o request 或者正在执行特定的操作。

每个线程都会显示正在进行的操作数量，同时正要执行或者正在执行的操作数量。另外，正在执行的 fsync 操作数量也会显示出来。有写数据时，Innodb需要确保数据最终被写到磁盘上，只是把它们放在系统缓存里是不够的。通常是调用 fsync() 来完成的。如果它的值一直很高，那意味这Innodb可能是处于IO负载较高状态。注意，由线程执行请求引发的IO请求是不计算在内的，因此尽管系统的IO负载较高，但是它们的值却可能为 0。

接下来显示的是IO操作的平均统计值，它们对于图形显示或者监控很有用。"16384 avg bytes/read" 是读请求的平均值。随机IO的话，每个页的大小是16K，全表扫描或索引扫描时的预读会导致这个值明显的增加。因此，它体现了预读的效率。

**本部分显示了插入缓冲以及自适应哈希索引的状态**

    1.-------------------------------------
    2.INSERT BUFFER AND ADAPTIVE HASH INDEX
    3.-------------------------------------
    4.Ibuf for space 0: size 1, free list len 887, seg size 889, is not empty
    5.Ibuf for space 0: size 1, free list len 887, seg size 889,
    6.2431891 inserts, 2672643 merged recs, 1059730 merges
    7.Hash table size 8850487, used cells 2381348, node heap has 4091 buffer(s)
    8.2208.17 hash searches/s, 175.05 non-hash searches/s

第一行显示了插入缓冲的状态，段的大小以及空闲列表，以及缓冲中有多少记录。接下来显示了缓冲中已经完成了多少次插入，有多少记录已经合并，有多少次合并已经完成。合并次数除以插入次数得到的比率可以反映出插入缓冲的效率如何。

Innodb采用哈希索引建立内存页索引形成自适应哈希索引而不是采 B-tree 索引，得以加速行记录到内存页的检索。这里显示了哈希表的大小，以及自适应哈希索引使用了多少单元和缓冲。可以通过计算利用哈希索引检索的次数以及没利用它检索的次数来了解哈希索引的效率。

当前对自适应哈希索引基本没有什么办法可以调整它，主要还是用于查看。

**接下来显示的是Innodb的日志子系统相关信息**

    1.---
    2.LOG
    3.---
    4.Log sequence number 84 3000620880
    5.Log flushed up to   84 3000611265
    6.Last checkpoint at  84 2939889199
    7.0 pending log writes, 0 pending chkp writes
    8.14073669 log i/o's done, 10.90 log i/o's/second

可以看到当前的日志序列号，相当于Innodb自从表空间开始创建直到现在已经写入日志文件的总字节数。还可以看到日志已经刷新到哪个点，同样也可以根据最后检查点计算出还有多少日志没有刷新到文件中去。Innodb采用模糊检查点，因此这行显示的是已经从缓冲池中刷新到文件的日志序列号。由于更高的日志序列号可能不会被立刻刷新到日志文件中去，因此日志序列号不能被覆盖掉。通过监控刷新到哪个日志的日志序列，可以判定 innodb_log_buffer_size 的设置是否合理，如果看到超过 30% 的日志还没有刷新到日志文件中，则需要考虑增加它的值了。

另外，还能看到日志写入以及检查点的数目。根据日志 I/O 操作的数目可以区分开表空间相关的IO请求和日志IO请求数量，进而可以确定到底需要几个日志文件。注意，innodb_flush_log_at_trx_commit 的值可以影响到日志写操作的代价高或低。如果 innodb_flush_logs_at_trx_commit=2，则日志是写到系统缓存，然后再顺序写到日志文件中，因此相对会快很多。

**这部分显示了缓冲池和内存的利用率相关信息**

    1. ----------------------
    2. BUFFER POOL AND MEMORY
    3. ----------------------
    4. Total memory allocated 4648979546; in additional pool allocated 16773888
    5. Buffer pool size   262144
    6. Free buffers       0
    7. Database pages     258053
    8. Modified db pages  37491
    9. Pending reads 0
    10.Pending writes: LRU 0, flush list 0, single page 0
    11.Pages read 57973114, created 251137, written 10761167
    12.9.79 reads/s, 0.31 creates/s, 6.00 writes/s
    13.Buffer pool hit rate 999 / 1000

可以看到Innodb分配的所有内存(有些时候可能比你设置的还要多点)，以及额外的内存池分配情况(可以检查它的大小是否正好)，缓冲池总共有多少个内存页，有多少空闲内存页，数据库分配了多少个内存页以及有多少个脏内存页。从这些信息中，就可以判断内存缓冲池是否设定合理，如果总是有大量空闲内存页，则不需要设置那么多内存，可以适当减小一点。如果空闲内存页为 0，这种情况下数据库内存页就不一定会和缓冲池的总数一致，因为缓冲池还需要保存锁信息，自适应哈希索引以及其他系统结构等信息。

等待中的读写是指内存缓冲池级别的请求。Innodb可能会把多个文件级别的请求合并到一个上，因此各不相同。我们还可以看到Innodb提交的各种不同类型的IO，LRU内存页中需要刷新的页即脏内存页，它们不会被长时间存取；刷新列表，检查点进程处理完之后需要刷新的旧内存页；独立内存页，独立的写内存页。

我们还可以看到内存页总共读写了多少次。已经创建的内存页是当前一个内存页中的内容没有读取到内存缓冲池中时，专门为新数据创建的空内存页。

最后我们可以看到缓冲池的命中率，它预示着缓冲池的效率。1000/1000 相当于 100% 的命中率。不过这样也很难说明缓冲池的命中率就足够高了，这要需要根据不同的负载环境而定。通常情况下，950/1000 就够了，有些时候在IO负载较高的环境下，命中率可能为 995/1000。

**最后一部分，显示了数据行操作以及一些系统信息相关情况**

    1.--------------
    2.ROW OPERATIONS
    3.--------------
    4.0 queries inside InnoDB, 0 queries in queue
    5.1 read views open inside InnoDB
    6.Main thread process no. 10099, id 88021936, state: waiting for server activity
    7.Number of rows inserted 143, updated 3000041, deleted 0, read 24865563
    8.0.00 inserts/s, 0.00 updates/s, 0.00 deletes/s, 0.00 reads/s

一开始显示了Innodb线程队列状态，有多少线程处于等待或活跃的。Innodb内部打开了多少读视图，这是在事务开始后，但是当前还没有活跃语句的情况，Innodb主线程的状态控制了系统操作调度的数量，刷新脏内存页、检查点、净化线程、刷新日志、合并插入缓冲等。 "state" 的值则表示了主线程当前的状态。

接下来可以看到自从系统启动以来，所有的数据行操作数量及其平均值。它们可以很方便地用于监控以及画出系统状态图，数据行操作次数可以很好的衡量Innodb的负载。不是所有的数据行操作带来的负载都是一样的，存取10字节的行比10Mb的行相比会小了很多，不过相对于查询的总次数来说这个信息可是有用的多了，差别也很大。

还有一点需要注意的是，SHOW INNODB STATUS 不是一成不变的，有些时间点上可能会不相符。SHOW INNODB STATUS结果中，不同时间可能会显示不同结果，因此有些时候可能会看到冲突的信息。这是由于设计时需要由全局锁提供一致性信息，导致了大量的开销。
