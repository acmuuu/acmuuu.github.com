---
layout: post
category : MySQL
tags : [Benchmark]
title: MySQL压测工具mysqlslap
---
{% include JB/setup %}
在mysql5.1以后的版本：客户端带了个工具mysqlslap可以对mysql进行压力测试

可以使用mysqlslap --help来显示使用方法：

	Default options are read from the following files in the given order:
	/etc/mysql/my.cnf /etc/my.cnf ~/.my.cnf
	--concurrency代表并发数量，多个可以用逗号隔开，concurrency=10,50,100, 并发连接线程数分别是10、50、100个并发。
	--engines代表要测试的引擎，可以有多个，用分隔符隔开。
	--iterations代表要运行这些测试多少次。
	--auto-generate-sql 代表用系统自己生成的SQL脚本来测试。
	--auto-generate-sql-load-type 代表要测试的是读还是写还是两者混合的（read,write,update,mixed）
	--number-of-queries 代表总共要运行多少次查询。每个客户运行的查询数量可以用查询总数/并发数来计算。
	--debug-info 代表要额外输出CPU以及内存的相关信息。
	--number-int-cols ：创建测试表的 int 型字段数量
	--auto-generate-sql-add-autoincrement : 代表对生成的表自动添加auto_increment列，从5.1.18版本开始
	--number-char-cols 创建测试表的 char 型字段数量。
	--create-schema 测试的schema，MySQL中schema也就是database。
	--query  使用自定义脚本执行测试，例如可以调用自定义的一个存储过程或者sql语句来执行测试。
	--only-print 如果只想打印看看SQL语句是什么，可以用这个选项。

自动测试：

	mysqlslap -utest -p123456 --concurrency=100 --iterations=1 --auto-generate-sql --auto-generate-sql-add-autoincrement --auto-generate-sql-load-type=mixed --engine=myisam --number-of-queries=10 --debug-info 

或指定数据库和sql语句:

	mysqlslap -utest -p123456 --concurrency=100 --iterations=1 --create-schema='test' --query='select * from test;' --number-of-queries=10 --debug-info 

要是看到底做了什么可以加上：--only-print

	Benchmark
			Average number of seconds to run all queries: 25.225 seconds
			Minimum number of seconds to run all queries: 25.225 seconds
			Maximum number of seconds to run all queries: 25.225 seconds
			Number of clients running queries: 100
			Average number of queries per client: 0

以上表明100个客户端同时运行要25秒