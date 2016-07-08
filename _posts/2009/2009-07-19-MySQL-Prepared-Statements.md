---
layout: post
category : MySQL
tags : [MySQL]
title: Prepared Statements 个人理解
---
{% include JB/setup %}
**来自：[http://hi.baidu.com/ytjwt/item/dac4c2feda39fe11ff35820a](http://hi.baidu.com/ytjwt/item/dac4c2feda39fe11ff35820a)**

[http://dev.mysql.com/doc/refman/5.1/en/sql-syntax-prepared-statements.html](http://dev.mysql.com/doc/refman/5.1/en/sql-syntax-prepared-statements.html)

**一：介绍**

从 5.1开始，mysql支持服务器端的Prepared Statements，他使用在client/server更有优势的binary protocol，（mysql的传统的协议中，再把数据通过网络传输前，需要把一切数据都转换成strings，这样就比原始数据大很多，最后，在服务器端，还必须把string转化成正确的数据格式而binary protocol去除了转换的开销，在被传输前，所有类型都转换成本地的binary类型，这样就减少了cpu转换的开销跟网络的使用）在C API php APT 中都能支持使用 Prepared Statements，而在交互式的sql接口中也支持，但是他不能使用binary protocol，所以他一般只用在测试或者本地不支持api的情况下。

Prepared Statements的sql语法是基于三个sql 语法：

	1：PREPARE prepares a statement for execution
	2：EXECUTE executes a prepared statement
	3：DEALLOCATE PREPARE releases a prepared statement

下面使用使用prepared statement两种的方法来计算直角三角行的斜边

1：使用字符串声明来创建prepared statement

	mysql> PREPARE stmt1 FROM 'SELECT SQRT(POW(?,2) + POW(?,2)) AS hypotenuse';
	mysql> SET @a = 3;
	mysql> SET @b = 4;
	mysql> EXECUTE stmt1 USING @a, @b;
	+------------+
	| hypotenuse |
	+------------+
	|          5 |
	+------------+
	mysql> DEALLOCATE PREPARE stmt1;

2：跟上面一样，但是是使用用户变量来声明

	mysql> SET @s = 'SELECT SQRT(POW(?,2) + POW(?,2)) AS hypotenuse';
	mysql> PREPARE stmt2 FROM @s;
	mysql> SET @a = 6;
	mysql> SET @b = 8;
	mysql> EXECUTE stmt2 USING @a, @b;
	+------------+
	| hypotenuse |
	+------------+
	|         10 |
	+------------+
	mysql> DEALLOCATE PREPARE stmt2;

下面的例子是演示：当表名是通过用户变量存储时，如何选择表名来运行query。

	mysql> USE test;
	mysql> CREATE TABLE t1 (a INT NOT NULL);
	mysql> INSERT INTO t1 VALUES (4), (8), (11), (32), (80);

	mysql> SET @table = 't1';
	mysql> SET @s = CONCAT('SELECT * FROM ', @table);

	mysql> PREPARE stmt3 FROM @s;
	mysql> EXECUTE stmt3;
	+----+
	| a  |
	+----+
	|  4 |
	|  8 |
	| 11 |
	| 32 |
	| 80 |
	+----+
	mysql> DEALLOCATE PREPARE stmt3;


**二：为什么要使用 Prepared Statements**

在应用程序中，使用Prepared Statements有很多好点，包括安全跟性能原因

1:安全

Prepared Statements通过sql逻辑与数据的分离来增加安全，sql逻辑与数据的分离能防止普通类型的sql注入攻击（SQL injection attack），在一些特殊的query中，提交从客户端那接受来的数据时，应该很注意，在使用麻烦字符（如：single quote, double quote, and backslash characters）时这注意是很有必要的。在这里，Prepared Statements使用不是很有必要，但数据的分离允许MySQL的自动考虑到这些字符，使他们并不需使用任何特殊功能来要转义

2：性能

第一:Prepared Statements只语法分析一次，你初始话Prepared Statements时，mysql将检查语法并准备语句的运行，当你执行query 多次时，这样就不会在有额外的负担了，如果，当运行query 很多次的时候（如：insert）这种预处理有很大的性能提高。第二：就是上面说的他使用binary protocol协议，这样更能提高效率。但是我使用Prepared Statements，并不是因为上面两个原因，我是因为在存储过程中，有的语句语法并不能使用动态的变量，（如:select的limit，alter 语句）就只有用 Prepared Statements来解决这个问题了。如：

	set @stmt=concat('alter table weekstock add week',@weekname,' int(4)');
	prepare s1 from @stmt;
	execute s1;
	deallocate prepare s1;


**三：注意：**

如果prepared statement在session级别被新建时，如果你关闭session，就会自动deallocates。在session中也能使用全局的prepared statement，如果你在这存储过程中使用新建prepared statement，当存储过程结束时候，他是不会自动deallocates 故为了限制在瞬间新建大量的prepared statements，mysql通过 max_prepared_stmt_count 变量来控制，当设为0时，是限制使用prepared statements。

下面语法能被使用在 prepared statements中： ALTER TABLE, CALL, COMMIT, CREATE INDEX, CREATE TABLE, DELETE, DO, DROP INDEX, DROP TABLE, INSERT, RENAME TABLE, REPLACE, SELECT, SET, UPDATE, and most SHOW statements.例外有的statements 会在后续版本中添加进来。