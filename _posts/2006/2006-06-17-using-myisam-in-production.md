---
layout: post
category : MySQL
tags : [MyISAM]
title: Using MyISAM in production
---
{% include JB/setup %}
**来自[http://www.mysqlperformanceblog.com/2006/06/17/using-myisam-in-production/](http://www.mysqlperformanceblog.com/2006/06/17/using-myisam-in-production/)**

There were recently number of posts about MyISAM, for example Arjen wrote pretty nice article about MyISAM features so I thought I would share my own view on using MyISAM in production.

For me it is not only about table locks. Table locks is only one of MyISAM limitations you need to consider using it in production.Especially if you’re comming from “traditional” databases you’re likely to be shocked by MyISAM behavior (and default MySQL behavior due to this) – it will be corrupted by unproper shutdown, it will fail with partial statement execution if certain errors are discovered etc.

You should not think about this however as about bugs, as many MySQL features it is designed for particular load cases when it shines and it might not be good choice for others.

In 1999 for my production application (storing billions of rows in tens of thousands tables) Innodb was better choice mainly because of thouse other behaviors … well table locks was the problem at very early stage but it was solved by using this significant number of tables.

I still have the same view on Storage Engines – Innodb is my oppinion is better choise for general purpose storage engine – it better matches what you would expect from database server and saves you from a lot of gotchas – this might be more important than performance for small application. As load increases you might convert certain tables to MyISAM and other storage engines for performance reasons…. of course keeping all limits in mind.

So here is my list of items you need to keep into account while using MyISAM tables.

**Recovery.** MySQL was running stable for us, giving us false sense of security but when it crashed (or was it power failure?) It took many hours to check recover our tables. If this happened make sure you have decent myisam_sort_buffer_size and large myisam_max_sort_file_size otherwise recovery may be done by key_cache rather than sort which can take even longer.

**Be careful with myisam_recover.** This is great option to automate recovery but it can give you couple of nice surprises. First – if you have many tables which are being repaired, each may allocate myisam_sort_buffer_size and MySQL could crash or go swapping. Second – table will be locked while repair is going. If this is frequently used table you may have all your connections become busy waiting on this table to become available effectively bringing down. Much better solution for us was to move out all databases out of MySQL directory to other location, check them by myisamchk prioritizing more important databases first an then rename them back to MySQL database directory. This way accesses to non-checked tables fail with table does not exist error rather than wait forever.

**Hidden corruptions. **If could be bad memory OS or MySQL bugs but corruption may happen and go for long unnoticed with MyISAM storage engine. This hidden corruption may later cause crashes wrong query results and further data corruption.

**Partial updates. **MyISAM is does not have transactions this is well understood but it also does not have atomic statement execution, if you run UPDATE which updates 1000000 rows after crash only 500000 of rows may end up being updated, and you might not know which ones.

**Concurrency.** MyISAM uses table locks and has concurrent inserts which can go concurrently with selects. This is sometimes presented as great concurrency for inserts but in reality it means only one INSERT is allowed to happen at the same time. It can happen concurrently to select statements but it has to be one insert at the time. Happily inserts in MyISAM are rather fast so it rarely is the problem The other misconception about table locks is if you have 95% reads table locks are not going to be the problem. It might be truth if you only have short reads or writes but you’re in great trouble if you need to run some bulk operations. For example running full table scan query to compute some stats is often impossible in production as it would block all updates to the table. Even worse with bulk updates queries. You do not have to have a lot of such queries to get into trouble. Just one is enough.

**Lock priorities. **By default MySQL treats updates as higher priority operations. You can use SELECT HIGH_PRIORITY or UPDATE LOW_PRIORITY to adjust that or you can simply set low_priority_updates option. Anyway default behavior means any UPDATE statement which is blocked by long running select will also block further selects from this table – they will have to wait until UPDATE is executing which is waiting on SELECT to complete. This is often not accounted for and people think – “OK. I write my script so it does short updates so it will not block anything” – it still may cause total block if there are long selects running.

**Fragmentation. **This is common problem for pretty much all storage engines. It is however also different. MyISAM has in-row fragmentation which means single row may be stored in many pieces. In extreme cases I’ve seen over 10 pieces in average per row – this is when rows contain some data which constantly growths in size. It does not happen for all applications and there are ways to fight it but still watch out.

**Lack of row cache.** MyISAM tables only have indexes cached in key_buffer while data is cached in OS cache. It is performance issue as system call is needed to get data from Operation System even when it is in cache but it is only part of the problem. The other problem is – it is hard to manage resources, especially if you have some other processes going on the same server. Backup process may go ahead and wipe OS cache which you hoped for causing unexpected slowdowns.

**delay_key_writes.** Whatever way you enable this option – globally, for table or for set of statements (by using LOCK TABLES/UNLOCK TABLES) be careful. This option may improve performance dramatically in certain cases by avoiding flushing dirty index blocks from key_buffer to disk, but it also comes at great danger if MySQL Server crashes or power goes down. In case crash happens without this option is enabled in most cases table corruption will be mild, especially on low loaded servers. Many users do not even know you need to check MyISAM tables after crash and have been running for years survining many crashes. If you enable delay_key_writes it drastically changes. Now in case of crash your index and data will likely be very much out of sync and if you do not repair the table you will very likely observe very serious corruption with queries failing to run, wrong result sets or crashes.

Here is my list what I think MyISAM tables are good to be used for. This list is not inclusive and every system has its own risk tolerance factor and performance requirements, not to mention different load:

**Log tables. **Now Archive storage engine can be even better.

**Read only data, especially packed with myisampack. **This can’t be corrupted or updated and as you see this is where our problems reside.

**Cache/Session tables **(you can throw them away if it server crashes). You can use multiple of cache tables to avoid concurrency issues.

**Temporary tables** used in batch processing and other means

**Exported data** If you export data from OLTP system for example to perform data analyses – MyISAM will be great fit. Even if you get the crash during export you normally can start over and most of the time data is read only anyway.

Tables which contain data which is quick to regenerate

Generally tables which you can throw away without any trouble.

Tables with data you do not need to be 100% correct and always available. For example statistical data.

**Data on slave servers. **If it crashes you can simply re-clone it. Make sure however to have at least one proper master to fall back to. Also be worried about replication with different storage engines.

**Then performance improvements are worth the risk.**