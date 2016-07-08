---
layout: post
category : MySQL
tags : [InnoDB, Lock]
title: Innodb Table Locks
---
{% include JB/setup %}
**来自[http://www.mysqlperformanceblog.com/2012/07/31/innodb-table-locks/](http://www.mysqlperformanceblog.com/2012/07/31/innodb-table-locks/)**

Innodb uses row level locks right ? So if you see locked tables reported in SHOW ENGINE INNODB STATUS you might be confused and rightfully so as Innodb table locking is a bit more complicated than traditional MyISAM table locks.
Let me start with some examples. First lets run SELECT Query:

    ---TRANSACTION 12303, ACTIVE 26 sec
    mysql tables in use 2, locked 0
    MySQL thread id 53038, OS thread handle 0x7ff759b22700, query id 3918786 localhost root Sending data
    select count(*) from sbtest,sbtest x
    Trx read view will not see trx with id >= 12304, sees < 12301

As you can see in this case the query self joins the table so we observe 2 table instances (note – same table gets counted twice) in use but zero tables are locked. Innodb does not need any row locks for conventional selects it will just use MVCC to handle updates if they were to happen concurrently.
Lets now try same select but add LOCK IN SHARE MODE so it performs locking reads to validate our theory:

    ---TRANSACTION 12305, ACTIVE 9 sec
    mysql tables in use 2, locked 2
    8316 lock struct(s), heap size 1948088, 10008317 row lock(s)
    MySQL thread id 53173, OS thread handle 0x7ff75963b700, query id 3936362 localhost root Sending data
    select count(*) from sbtest,sbtest x lock in share mode
    TABLE LOCK table `sbtest`.`sbtest` trx id 12305 lock mode IS
    RECORD LOCKS space id 84 page no 38 n bits 1272 index `k` of table `sbtest`.`sbtest` trx id 12305 lock mode S
    RECORD LOCKS space id 84 page no 39 n bits 1272 index `k` of table `sbtest`.`sbtest` trx id 12305 lock mode S
    RECORD LOCKS space id 84 page no 55 n bits 1272 index `k` of table `sbtest`.`sbtest` trx id 12305 lock mode S
    RECORD LOCKS space id 84 page no 73 n bits 1272 index `k` of table `sbtest`.`sbtest` trx id 12305 lock mode S

Aha! Now we have 2 tables in use and 2 tables locked reported. If we go down to see details about locks held (feature available in Percona Server) we can see the table is locked in “IS” mode and there are number of row level locks in “S” mode. What does it mean ? Well we asked Innodb to do locking reads so it has to lock all the rows which are being touched. However with Innodb’s lock hierarchy this also means the table need to be locked in “IS” mode. “IS” means Intent-Share – locking the table with intent to lock some of the rows in Shared mode. Intention locks are very loose IS lock on the table does not conflict with any other locks other than X lock on the whole table, which would only be set if you’re doing table level operations, such as dropping the table.

If you’re attentive you will also note the locks are set on index “k” – this is because Innodb decided to do index scan to resolve this query, so it is locking the entries in this index rather than primary key.

Lets now see about writes:

    ---TRANSACTION 12304, ACTIVE 3 sec fetching rows
    mysql tables in use 1, locked 1
    9417 lock struct(s), heap size 915896, 696679 row lock(s)
    MySQL thread id 53173, OS thread handle 0x7ff75963b700, query id 3929840 localhost root Updating
    update sbtest set c=concat(c,'c')
    TABLE LOCK table `sbtest`.`sbtest` trx id 12304 lock mode IX
    RECORD LOCKS space id 84 page no 6 n bits 144 index `PRIMARY` of table `sbtest`.`sbtest` trx id 12304 lock_mode X
    RECORD LOCKS space id 84 page no 7 n bits 144 index `PRIMARY` of table `sbtest`.`sbtest` trx id 12304 lock_mode X
    RECORD LOCKS space id 84 page no 8 n bits 144 index `PRIMARY` of table `sbtest`.`sbtest` trx id 12304 lock_mode X
    RECORD LOCKS space id 84 page no 11 n bits 144 index `PRIMARY` of table `sbtest`.`sbtest` trx id 12304 lock_mode X
    RECORD LOCKS space id 84 page no 14 n bits 144 index `PRIMARY` of table `sbtest`.`sbtest` trx id 12304 lock_mode X
    RECORD LOCKS space id 84 page no 15 n bits 144 index `PRIMARY` of table `sbtest`.`sbtest` trx id 12304 lock_mode X
    RECORD LOCKS space id 84 page no 16 n bits 144 index `PRIMARY` of table `sbtest`.`sbtest` trx id 12304 lock_mode X

When updating the table it also gets “locked”, now with IX lock… this is because update needs to lock the rows in exclusive mode. Similar to IS lock IX is rather lose – I can have multiple update queries running on the table each locking it in IX mode, which will not conflict unless they touch the same rows.

Now finally lets illustrate how MySQL and Innodb level locks play together with each other. To do this we can issue LOCK TABLE sbtest WRITE and repeat our update query. We will still see table reported as locked in “IX” in SHOW ENGINE INNODB STATUS while concurrent updates to this table will be prevented until it is unlocked. What does this illustrate ? Very simple – SHOW INNODB STATUS does not know anything about MySQL level locks, so table locked on MySQL level with LOCK TABLES will not show up out there.

Now you may spotted important difference between MyISAM and Innodb when it comes to Table Level Locks. For MyISAM tables running UPDATE query on the table is essentially equivalent to locking table for write (on MySQL Level) before operation and unlocking it straight after. Not so for Innodb. Unless table is being locked explicitly Innodb “converts” table lock to “no lock” hence eliminating conflicts on MySQL level table locks for most queries.

Summary: MySQL Table level locks and Innodb Table Level locks are two separate beings. You almost never will run into problems with Innodb table level locks because innodb will only set intentional level locks for everything by DDL operations. If you’re having locking issues with Innodb chances are it is row level locks or auto increment table level lock (mostly with MySQL 5.0 and older MySQL versions). MySQL level locks are entirely different story. Explicitly locking tables on MySQL

level will prevent tables from being accessed and will not show up in SHOW ENGINE INNODB STATUS. It is a good practice not to use LOCK TABLES when you’re using Innodb Tables.
