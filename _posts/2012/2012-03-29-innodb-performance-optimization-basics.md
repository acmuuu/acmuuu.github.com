---
layout: post
category : MySQL
tags : [MySQL, InnoDB]
title: InnoDB优化基础
---
{% include JB/setup %}

**InnoDB优化基础，招聘好问题，来自 [http://www.mysqlperformanceblog.com/2007/11/01/innodb-performance-optimization-basics/](http://www.mysqlperformanceblog.com/2007/11/01/innodb-performance-optimization-basics/)**

Interviewing people for our Job Openings I like to ask them a basic question – if you have a server with 16GB of RAM which will be dedicated for MySQL with large Innodb database using typical Web workload what settings you would adjust and interestingly enough most people fail to come up with anything reasonable. So I decided to publish the answer I would like to hear extending it with basics of Hardware OS And Application optimization.
I call this Innodb Performance Optimization Basics so these are general guidelines which work well for wide range of applications, though the optimal settings of course depend on the workload.

**Hardware**

If you have large Innodb database size Memory is paramount. 16G-32G is the cost efficient value these days. From CPU standpoint 2*Dual Core CPUs seems to do very well, while with even just two Quad Core CPUs scalability issues can be observed on many workloads. Though this depends on the application a lot. The third is IO Subsystem – directly attached storage with plenty of spindles and RAID with battery backed up cache is a good bet. Typically you can get 6-8 hard drives in the standard case and often it is enough, while sometimes you may need more. Also note new 2.5″ SAS hard drives. They are tiny but often faster than bigger ones. RAID10 works well for data storage and for read-mostly cases when you still would like some redundancy RAID5 can work pretty well as well but beware of random writes to RAID5.

**Operating System**

First – run 64bit operating system. We still see people running 32bit Linux on 64bit capable boxes with plenty of memory. Do not do this. If using Linux setup LVM for database directory to get more efficient backup. EXT3 file system works OK in most cases, though if you’re running in particular roadblocks with it try XFS. You can use noatime and nodiratime options if you’re using innodb\_file\_per\_table and a lot of tables though benefit of these is minor. Also make sure you wrestle OS so it would not swap out MySQL out of memory.

**MySQL Innodb Settings**

The most important ones are:

**innodb\_buffer\_pool\_size** 70-80% of memory is a safe bet. I set it to 12G on 16GB box.
UPDATE: If you’re looking for more details, check out detailed guide on [tuning innodb buffer pool](http://www.mysqlperformanceblog.com/2007/11/03/choosing-innodb\_buffer\_pool\_size/)

**innodb\_log\_file\_size** – This depends on your recovery speed needs but 256M seems to be a good balance between reasonable recovery time and good performance

**innodb\_log\_buffer\_size=4M** 4M is good for most cases unless you’re piping large blobs to Innodb in this case increase it a bit.

**innodb\_flush\_log\_at\_trx\_commit=2** If you’re not concern about ACID and can loose transactions for last second or two in case of full OS crash than set this value. It can dramatic effect especially on a lot of short write transactions.

**innodb\_thread\_concurrency=8** Even with current Innodb Scalability Fixes having limited concurrency helps. The actual number may be higher or lower depending on your application and default which is 8 is decent start

**innodb\_flush\_method=O\_DIRECT** Avoid double buffering and reduce swap pressure, in most cases this setting improves performance. Though be careful if you do not have battery backed up RAID cache as when write IO may suffer.

**innodb\_file\_per\_table** – If you do not have too many tables use this option, so you will not have uncontrolled innodb main tablespace growth which you can’t reclaim. This option was added in MySQL 4.1 and now stable enough to use.

Also check if your application can run in READ-COMMITED isolation mode – if it does – set it to be default as **transaction-isolation=READ-COMMITTED**. This option has some performance benefits, especially in locking in 5.0 and even more to come with MySQL 5.1 and row level replication.

There are bunch of other options you may want to tune but lets focus only on Innodb ones today. You can check about [tuning other options](http://www.mysqlperformanceblog.com/2006/09/29/what-to-tune-in-mysql-server-after-installation/) here or read one of our [MySQL Presentations](http://www.mysqlperformanceblog.com/mysql-performance-presentations/).

**Application tuning for Innodb**

Especially when coming from MyISAM background there would be some changes you would like to do with your application. First make sure you’re using transactions when doing updates, both for sake of consistency and to get better performance. Next if your application has any writes be prepared to handle deadlocks which may happen. Third you would like to review your table structure and see how you can get advantage of Innodb properties – clustering by primary key, having primary key in all indexes (so keep primary key short), fast lookups by primary keys (try to use it in joins), large unpacked indexes (try to be easy on indexes).

With these basic innodb performance tunings you will be better of when majority of Innodb users which take MySQL with defaults run it on hardware without battery backed up cache with no OS changes and have no changes done to application which was written keeping MyISAM tables in mind.