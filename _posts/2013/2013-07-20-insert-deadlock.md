---
layout: post
category : Hardware
tags : [Deadlock, Deadlock]
title: 有趣的insert死锁
---
{% include JB/setup %}
**有趣的insert死锁**

来自：[http://blog.csdn.net/gtuu0123/article/details/5651493](http://blog.csdn.net/gtuu0123/article/details/5651493)

昨天看到一个很有意思的死锁，拿来记录下：

	环境:deadlock on
	事务隔离级别:read commited

表结构：

	root@test 08:34:01>show create table lingluo\G
	*************************** 1. row ***************************
		   Table: lingluo
	Create Table: CREATE TABLE `lingluo` (
	  `a` int(11) NOT NULL DEFAULT '0',
	  `b` int(11) DEFAULT NULL,
	  `c` int(11) DEFAULT NULL,
	  `d` int(11) DEFAULT NULL,
	  PRIMARY KEY (`a`),
	  UNIQUE KEY `uk_bc` (`b`,`c`)
	) ENGINE=InnoDB DEFAULT CHARSET=gbk
	1 row in set (0.00 sec)

session 1:

	root@test 08:45:51>select * from lingluo;
	+--------+------+------+------+
	| a      | b    | c    | d    |
	+--------+------+------+------+
	|      1 |    2 |    3 |    4 |
	|    500 |  100 |  200 |   43 |
	|   1000 |   10 |   20 |   43 |
	|  10001 |   21 |   21 |   32 |
	| 100202 |  213 |  213 |  312 |
	| 100212 |  214 |  214 |  312 |
	+--------+------+------+------+
	6 rows in set (0.00 sec)

	root@test 08:46:38>begin;
	Query OK, 0 rows affected (0.00 sec)

	root@test 08:47:04>insert into lingluo values(100213,215,215,312);
	Query OK, 1 row affected (0.00 sec)

session 2:

	root@test 08:46:02>begin;
	Query OK, 0 rows affected (0.00 sec)

	root@test 08:47:20>insert into lingluo values(100214,215,215,312);
	Query OK, 1 row affected (12.77 sec)

session3:

	root@test 08:46:24>begin;
	Query OK, 0 rows affected (0.00 sec)

	root@test 08:47:23>insert into lingluo values(100215,215,215,312);

session 1 rollback前:

	---TRANSACTION 4F3D6F33, ACTIVE 3 sec inserting
	mysql tables in use 1, locked 1
	LOCK WAIT 2 lock struct(s), heap size 376, 1 row lock(s), undo log entries 1
	MySQL thread id 18124715, OS thread handle 0x7fea34912700, query id 1435660081 localhost root update
	insert into lingluo values(100215,215,215,312)
	------- TRX HAS BEEN WAITING 3 SEC FOR THIS LOCK TO BE GRANTED:
	RECORD LOCKS space id 3351 page no 4 n bits 80 index `uk_bc` of table `test`.`lingluo` trx id 4F3D6F33 lock mode S waiting
	------------------
	TABLE LOCK table `test`.`lingluo` trx id 4F3D6F33 lock mode IX
	RECORD LOCKS space id 3351 page no 4 n bits 80 index `uk_bc` of table `test`.`lingluo` trx id 4F3D6F33 lock mode S waiting
	---TRANSACTION 4F3D6D24, ACTIVE 5 sec inserting
	mysql tables in use 1, locked 1
	LOCK WAIT 2 lock struct(s), heap size 376, 1 row lock(s), undo log entries 1
	MySQL thread id 18124702, OS thread handle 0x7fe706fdf700, query id 1435659684 localhost root update
	insert into lingluo values(100214,215,215,312)
	------- TRX HAS BEEN WAITING 5 SEC FOR THIS LOCK TO BE GRANTED:
	RECORD LOCKS space id 3351 page no 4 n bits 80 index `uk_bc` of table `test`.`lingluo` trx id 4F3D6D24 lock mode S waiting
	------------------
	TABLE LOCK table `test`.`lingluo` trx id 4F3D6D24 lock mode IX
	RECORD LOCKS space id 3351 page no 4 n bits 80 index `uk_bc` of table `test`.`lingluo` trx id 4F3D6D24 lock mode S waiting
	---TRANSACTION 4F3D4423, ACTIVE 33 sec
	2 lock struct(s), heap size 376, 1 row lock(s), undo log entries 1
	MySQL thread id 18124692, OS thread handle 0x7fe73c89a700, query id 1435651549 localhost root
	TABLE LOCK table `test`.`lingluo` trx id 4F3D4423 lock mode IX
	RECORD LOCKS space id 3351 page no 4 n bits 80 index `uk_bc` of table `test`.`lingluo` trx id 4F3D4423 lock_mode X locks rec but not gap

/**

session1 上的转为显式锁：lock_mode X locks rec but not gap

session2 等待的锁：lock mode S waiting

session3 等待的锁：lock mode S waiting

**/

session1 rollback

session2 插入成功

session3 ERROR 1213 (40001): Deadlock found when trying to get lock; try restarting transaction

这个时候show engine innodb status:

	5 lock struct(s), heap size 1248, 3 row lock(s), undo log entries 1
	MySQL thread id 18124702, OS thread handle 0x7fe706fdf700, query id 1435659684 localhost root
	TABLE LOCK table `test`.`lingluo` trx id 4F3D6D24 lock mode IX
	RECORD LOCKS space id 3351 page no 4 n bits 80 index `uk_bc` of table `test`.`lingluo` trx id 4F3D6D24 lock mode S
	RECORD LOCKS space id 3351 page no 4 n bits 80 index `uk_bc` of table `test`.`lingluo` trx id 4F3D6D24 lock mode S
	RECORD LOCKS space id 3351 page no 4 n bits 80 index `uk_bc` of table `test`.`lingluo` trx id 4F3D6D24 lock_mode X insert intention
	RECORD LOCKS space id 3351 page no 4 n bits 80 index `uk_bc` of table `test`.`lingluo` trx id 4F3D6D24 lock mode S locks gap before rec

死锁信息：

	------------------------
	LATEST DETECTED DEADLOCK
	------------------------
	130701 20:47:57
	*** (1) TRANSACTION:
	TRANSACTION 4F3D6D24, ACTIVE 13 sec inserting, thread declared inside InnoDB 1
	mysql tables in use 1, locked 1
	LOCK WAIT 4 lock struct(s), heap size 1248, 2 row lock(s), undo log entries 1
	MySQL thread id 18124702, OS thread handle 0x7fe706fdf700, query id 1435659684 localhost root update
	insert into lingluo values(100214,215,215,312)
	*** (1) WAITING FOR THIS LOCK TO BE GRANTED:
	RECORD LOCKS space id 3351 page no 4 n bits 80 index `uk_bc` of table `test`.`lingluo` trx id 4F3D6D24 lock_mode X insert intention waiting
	*** (2) TRANSACTION:
	TRANSACTION 4F3D6F33, ACTIVE 11 sec inserting, thread declared inside InnoDB 1
	mysql tables in use 1, locked 1
	4 lock struct(s), heap size 1248, 2 row lock(s), undo log entries 1
	MySQL thread id 18124715, OS thread handle 0x7fea34912700, query id 1435660081 localhost root update
	insert into lingluo values(100215,215,215,312)
	*** (2) HOLDS THE LOCK(S):
	RECORD LOCKS space id 3351 page no 4 n bits 80 index `uk_bc` of table `test`.`lingluo` trx id 4F3D6F33 lock mode S
	*** (2) WAITING FOR THIS LOCK TO BE GRANTED:
	RECORD LOCKS space id 3351 page no 4 n bits 80 index `uk_bc` of table `test`.`lingluo` trx id 4F3D6F33 lock_mode X insert intention waiting
	*** WE ROLL BACK TRANSACTION (2)

原因:

s1 , type_mode=1059 //s2为s1转换隐式锁为显式锁

s2,  type_mode=1282 //检查重复键，需要加共享锁，被s1 block住，等待S锁

s3,  type_mode=1282 // 被s1 block住，等待S锁


s1, type_mode=547   //s1回滚，删除记录，lock_update_delete锁继承，

s2, type_mode=546   //创建s锁  LOCK_GAP | LOCK_REC | LOCK_S

s3, type_mode=546   //创建s锁   LOCK_GAP | LOCK_REC | LOCK_S


s2, type_mode=2819  // LOCK_X | LOCK_GAP | LOCK_INSERT_INTENTION

s3, type_mode=2819  //  LOCK_X | LOCK_GAP | LOCK_INSERT_INTENTION

当s1回滚后，s2和s3获得s锁，但随后s2和s3又先后请求插入意向锁，因此锁队列为：

s2(S GAP)<—s3(S GAP)<—s2(插入意向锁)<–s3(插入意向锁)   s3(s锁),s2(x锁),s3(x锁)形成死锁。

这样的死锁不光出现在unique key，还包括primary key（unique key的特殊形式）

[印风的博客](http://mysqllover.com/?p=431)里有更详细的代码级别的记录，有兴趣的可以看下

另外如果：deadlock off的话,即使session 1rollback了，session 2和session 3还是处于等待的状态，除非超过了innodb_lock_wait_timeout的时间，报

	ERROR 1205 (HY000): Lock wait timeout exceeded; try restarting transaction
