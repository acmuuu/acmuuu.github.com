---
layout: post
category : MySQL
tags : [MySQL]
title: MySQL tpcc测试
---
{% include JB/setup %}
**来自[http://imysql.cn/2012/08/04/tpcc-for-mysql-manual.html](http://imysql.cn/2012/08/04/tpcc-for-mysql-manual.html)**

**一、 下载工具包**

安装bazaar

    rpm -Uvh http://dl.fedoraproject.org/pub/epel/5/i386/epel-release-5-4.noarch.rpm
    yum install bzr 

之后，就可以开始用bzr客户端下载tpcc-mysql源码了。

    cd tmp
    bzr branch lp:~percona-dev/perconatools/tpcc-mysql

**二、编译安装**

    cd /tmp/tpcc-mysql/src
    make

然后就会在 /tmp/tpcc-mysql 下生成 tpcc 命令行工具 tpcc_load 、 tpcc_start

**三、开始加载测试数据**

初始化测试库环境

    cd /tmp/tpcc-mysql
    mysqladmin create tpcc1000
    mysql tpcc1000 < create_table.sql
    mysql tpcc1000 < add_fkey_idx.sql

初始化完毕后，就可以开始加载测试数据了，tpcc_load用法

    tpcc_load [server] [DB] [user] [pass] [warehouse]

或者

    tpcc_load [server] [DB] [user] [pass] [warehouse] [part] [min_wh] [max_wh]

选项 warehouse 意为指定测试库下的仓库数量。

因此，启动命令非常简单

    ./tpcc_load localhost tpcc1000 root "" 1000

在这里，需要注意的是 tpcc 默认会读取 /var/lib/mysql/mysql.sock 这个socket位置，因此如果你的socket不在相应路径的话，就需要做个软连接，或者通过TCP/IP的方式连接测试服务器。

**四、进行测试**

tpcc_start的用法也比较简单

    tpcc_start -h server_host -P port -d database_name -u mysql_user -p mysql_password -w warehouses -c connections -r warmup_time -l running_time -i report_interval -f report_file

几个选项稍微解释下

    -w 指定仓库数量
    -c 指定并发连接数
    -r 指定开始测试前进行warmup的时间，进行预热后，测试效果更好
    -l 指定测试持续时间
    -I 指定生成报告间隔时长
    -f 指定生成的报告文件名

现在我们来开启一个测试案例

    tpcc_start  -hlocalhost  -d tpcc1000  -u root  -p '' -w 1000  -c  32  -r 120   -l  3600 -ftpcc_mysql_20120314
    #使用tpcc_start 进行16个线程的测试,热身时间为60秒, 测试时间为10分钟, 可根据自己需要调整

测试结果解读

    time ./tpcc_start -h localhost -d tpcc1000 -u root -p '' -w 1000 -c 32 -r 120 -l 3600 -f tpcc_mysql_20120314
     
    ***************************************
    *** ###easy### TPC-C Load Generator ***
    ***************************************
    option h with value 'localhost'
    option d with value 'tpcc1000'
    option u with value 'root'
    option p with value ''
    option w with value '1000'
    option c with value '32'
    option r with value '120'
    option l with value '3600'
    option f with value 'tpcc_mysql_20120314'

         [server]: localhost
           [port]: 3306
         [DBname]: tpcc1000
           [user]: root
           [pass]: 
      [warehouse]: 1000
     [connection]: 32
         [rampup]: 120 (sec.)
        [measure]: 3600 (sec.)
     
    RAMP-UP TIME.(120 sec.)
    MEASURING START.
     
      10, 197(0):1.804|2.188, 205(0):0.435|0.574, 19(0):0.270|0.315, 19(0):1.941|2.253, 19(0):5.906|6.555
      20, 198(0):1.664|1.852, 188(0):0.407|0.440, 20(0):0.209|0.210, 20(0):1.873|1.913, 21(0):5.443|5.498
      ... 
    3600, 308(0):1.876|1.994, 312(0):0.452|0.581, 32(0):0.296|0.309, 30(0):1.924|2.093, 29(0):5.724|5.965
     
    STOPPING THREADS................................
     
    <Raw Results>
      [0] sc:93257  lt:0  rt:0  fl:0 
      [1] sc:93265  lt:0  rt:0  fl:0 
      [2] sc:9326  lt:0  rt:0  fl:0 
      [3] sc:9324  lt:0  rt:0  fl:0 
      [4] sc:9323  lt:0  rt:0  fl:0 
     in 3600 sec.
     
    <Raw Results2(sum ver.)>
      [0] sc:93257  lt:0  rt:0  fl:0 
      [1] sc:93268  lt:0  rt:0  fl:0 
      [2] sc:9326  lt:0  rt:0  fl:0 
      [3] sc:9324  lt:0  rt:0  fl:0 
      [4] sc:9323  lt:0  rt:0  fl:0 
     
    <Constraint Check> (all must be [OK])
    [transaction percentage]
            Payment: 43.48% (>=43.0%) [OK]
       Order-Status: 4.35% (>= 4.0%) [OK]
           Delivery: 4.35% (>= 4.0%) [OK]
        Stock-Level: 4.35% (>= 4.0%) [OK]
    [response time (at least 90% passed)]
          New-Order: 100.00%  [OK]
            Payment: 100.00%  [OK]
       Order-Status: 100.00%  [OK]
           Delivery: 100.00%  [OK]
        Stock-Level: 100.00%  [OK]
     
    <TpmC>
                     1554.283 TpmC
        
    real    62m1.975s
    user    1m21.824s
    sys     1m44.828s
