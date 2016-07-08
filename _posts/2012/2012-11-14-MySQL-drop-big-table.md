---
layout: post
category : MySQL
tags : [MySQL]
title: MySQL安全删除大表
---
{% include JB/setup %}
**来自[http://www.mysqlsky.com/201211/large-tbl-drop](http://www.mysqlsky.com/201211/large-tbl-drop)**

**[问题隐患]**

由于业务需求不断变化，可能在DB中存在超大表占用空间或影响性能；对这些表的处理操作，容易造成mysql性能急剧下降，IO性能占用严重等。先前有在生产库drop table造成服务不可用；rm 大文件造成io跑满，引发应用容灾；对大表的操作越轻柔越好
 
**[解决办法]**

    1.通过硬链接减少mysql DDL时间，加快锁释放
    2.通过truncate分段删除文件，避免IO hang
 
**[生产案例]**

某对mysql主备，主库写入较大时发现空间不足，需要紧急清理废弃大表，但不能影响应用访问响应

    $ll /u01/mysql/data/test/tmp_large.ibd
    -rw-r—– 1 mysql dba 289591525376 Mar 30  2012 tmp_large.ibd

270GB的大表删除变更过程如下：

    #(备库先做灰度)
    ln tmp_large.ibd /u01/bak/tmp_tbl.ibd  #建立硬链接
    -rw-r—– 2 mysql dba 289591525376 Mar 30  2012 tmp_large.ibd
    set session sql_log_bin=0;  #不计入bin log节省性能，并且防止主备不一致
    desc test.tmp_large;
    drop table test.tmp_large;
    Query OK, 0 rows affected (10.46 sec)
    mysql -uroot -e "start slave;"

删除文件

    cd /u01/bak;screen -S weixi_drop_table
    for i in `seq 270 -1 1 ` ;do sleep 2;truncate -s ${i}G tmp_tbl.ibd;done
    rm -rf tmp_tbl.ibd
 
**[性能比较]**

中间ctrl-C一次，可以看到truncate前后io的对比情况,基本上影响不大

文件大小也成功更新

**[工具介绍]**

truncate – shrink or extend the size of a file to the specified size

    #来自coreutils工具集
    wget http://ftp.gnu.org/gnu/coreutils/coreutils-8.9.tar.gz
    tar -zxvf coreutils-8.9.tar.gz
    cd coreutils-8.9
    ./configure
    make
    sudo cp src/truncate /usr/bin/ 
