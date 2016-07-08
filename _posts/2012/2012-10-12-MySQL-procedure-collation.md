---
layout: post
category : MySQL
tags : [MySQL]
title: MySQL存储过程字符集
---
{% include JB/setup %}
当做show create procedure xxx查看存储过程创建信息的时候

    mysql> show create procedure BATCH_INSERT\G
    *************************** 1. row ***************************
               Procedure: BATCH_INSERT
                sql_mode: 
        Create Procedure: CREATE DEFINER=`root`@`localhost` PROCEDURE `BATCH_INSERT`(IN init INT, IN loop_time INT)
    BEGIN
    DECLARE num INT;
    DECLARE id INT;
    SET num = 0;
    SET id = init;
    WHILE num < loop_time DO
    INSERT INTO employee(employee_id, employee_name) VALUES(id, 'Garry');
    SET id = id + 1;
    SET num = num + 1;
    END WHILE;
    END
    character_set_client: utf8
    collation_connection: utf8_general_ci
      Database Collation: utf8_general_ci
    1 row in set (0.00 sec)

    mysql> 

可以看到如下三行

    character_set_client: utf8
    collation_connection: utf8_general_ci
      Database Collation: utf8_general_ci

他们代表什么意思呢：

character_set_client: 存储过程创建的时的候会话变量 character_set_client 的值。

collation_connection: 存储过程创建的时的候会话变量 collation_connection 的值。

Database Collation: 存储过程相关的数据库的字符校对规则。

这些信息是在MySQL 5.1.21中添加的。

**来自：[http://dev.mysql.com/doc/refman/5.1/en/show-create-procedure.html](http://dev.mysql.com/doc/refman/5.1/en/show-create-procedure.html)**
