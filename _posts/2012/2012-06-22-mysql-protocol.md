---
layout: post
category : MySQL
tags : [MySQL, Protocol]
title: MySQL协议分析
---
{% include JB/setup %}
**来自：[http://www.hoterran.info/mysql-protocol-soucecode-2](http://www.hoterran.info/mysql-protocol-soucecode-2)**

MySQL协议分析,主要参考MySQL Forge上的[WIKI](http://forge.mysql.com/wiki/MySQL_Internals_ClientServer_Protocol)和源码.协议的全图见[这里](http://huaban.com/pins/8262295/zoom/), 给同事分享的PPT见[这里](https://docs.google.com/presentation/pub?id=1vGZkiZUDHVLye5_WdAT3dV2LHOoB2cLRl6g36x8nnHQ&start=false&loop=false&delayms=3000),下载见[这里](http://vdisk.weibo.com/s/7lpaF)

**MySQL协议分析**

    议程
    协议头
    协议类型
    网络协议相关函数
    NET缓冲
    VIO缓冲
    MySQL API

![Alt text](/assets/images/2012/06/structure.png)

**协议头**

    ● 数据变成在网络里传输的数据,需要额外的在头部添加4 个字节的包头. 
        1. packet length(3字节), 包体的长度 
        2. packet number(1字节), 从0开始的递增的
    ● sql “select 1” 的网络协议是？

**协议头**

    ● packet length三个字节意味着MySQL packet最大16M大于16M则被分包(net_write_command, my_net_write)
    ● packet number分包从0开始,依次递增.每一次执行sql, packet_number清零(sql/net_serv.c:net_clear)


**协议类型**

    ● handshake
    ● auth
    ● ok|error
    ● resultset 
        ○ header 
        ○ field 
        ○ eof 
        ○ row
    ● command packet

连接时的交互

![Alt text](/assets/images/2012/06/hande_shake2.png)

协议说明

    ● 协议内字段分三种形式 
        ○ 固定长度(include/my_global.h) 
            ■ uint*korr 解包 
            ■ int*store 封包 
        ○ length coded binary(sql-common/pack.c) 
            ■ net_field_length 解包 
            ■ net_store_length 封包 
        ○ null-terminated string
    ● length coded binary 
        ○ 避免binary unsafe string, 字符串的长度保存在字符串的前面 
            ■ length<251 1 byte 
            ■ length <256^2 3 byte(第一个byte是252) 
            ■ length<256^3 4byte(第一个byte是253) 
            ■ else 9byte(第一个byte是254)

handshake packet

    ● 该协议由服务端发送客户端
    ● 括号内为字节数,字节数为n为是null-terminated string;字节数为大写的N表示length code binary.
    ● salt就是scramble.分成两个部分是为了兼容4.1版本
    ● sql_connect.cc:check_connection
    ● sql_client.c:mysql_real_connect

auth packet

    ● 该协议是从客户端对密码使用scramble加密后发送到服务端
    ● 其中databasename是可选的.salt就是加密后的密码.
    ● sql_client.c:mysql_real_connect
    ● sql_connect.c:check_connection

ok packet

    ● ok包,命令和insert,update,delete的返回结果
    ● 包体首字节为0.
    ● insert_id, affect_rows也是一并发过来.
    ● src/protocol.cc:net_send_ok

error packet

    ● 错误的命令,非法的sql的返回包
    ● 包体首字节为255.
    ● error code就是CR_***,include/errmsg.h
    ● sqlstate marker是#
    ● sqlstate是错误状态,include/sql_state.h
    ● message是错误的信息
    ● sql/protocol.cc:net_send_error_packet

resultset packet

    ● 结果集的数据包,由多个packet组合而成
    ● 例如查询一个结构集,顺序如下: 
        ○ header 
        ○ field1....fieldN 
        ○ eof 
        ○ row1...rowN 
        ○ eof
    ● sql/client.c:cli_read_query_result
    ● 下面是一个sql "select * from d"查询结果集的例子,结果 集是6行，3个字段 
        ○ 公式：假设结果集有N行, M个字段.则包的个数为，header(1) + field (M) + eof(1) + row(N) + eof(1) 
        ○ 所以这个例子的MySQL packet的个数是12个

resultset packet - header

    ● field packet number决定了接下来的field packet的个数.
    ● 一个返回6行记录,3个字段的查询语句

resultset packet - field

    ● 结果集中一个字段一个field packet.
    ● tables_alias是sql语句里表的别名,org_table才是表的真 实名字.
    ● sql/protocol.cc:Protocol::send_fields
    ● sql/client.c:cli_read_query_result

resultset packet - eof

    ● eof包是用于分割field packet和row packet.
    ● 包体首字节为254
    ● sql/protocol.cc:net_send_eof

resultset packet - row

    ● row packet里才是真正的数据包.一行数据一个packet.
    ● row里的每个字段都是length coded binary
    ● 字段的个数在header packet里
    ● sql/client.c:cli_read_rows

command packet

    ● 命令包,包括我们的sql语句还有一些常见的命令.
    ● 包体首字母表示命令的类型(include/mysql_com.h),大 部分命令都是COM_QUERY.

**网络协议关键函数**

    ● net_write_command(sql/net_serv.cc)所有的sql最终调用这个命令发送出去.
    ● my_net_write(sql/net_serv.cc)连接阶段的socket write操作调用这个函数.
    ● my_net_read读取包,会判断包大小,是否是分包
    ● my_real_read解析MySQL packet,第一次读取4字节,根据packet length再读取余下来的长度
    ● cli_safe_read客户端解包函数,包含了my_net_read

**NET缓冲**

    ● 每次socket操作都会先把数据写,读到net->buff,这是一 个缓冲区, 减少系统调用调用的次数.
    ● 当写入的数据和buff内的数据超过buff大小才会发出一次 write操作,然后再把要写入的buff里插入数, 写入不会 导致buff区区域扩展.(sql/net_serv.cc: net_write_buff).
    ● net->buff大小初始net->max_packet, 读取会导致会导致 buff的realloc最大net->max_packet_size
    ● 一次sql命令的结束都会调用net_flush,把buff里的数据 都写到socket里.

**VIO缓冲**

    ● 从my_read_read可以看出每次packet读取都是按需读取， 为了减少系统调用,vio层面加了一个read_buffer.
    ● 每次读取前先判断vio->read_buffer所需数据的长度是 否足够.如果存在则直接copy. 如果不够,则触发一次 socket read 读取2048个字(vio/viosocket.c: vio_read_buff)

**MySQL API**

    ● 数据从mysql_send_query处发送给服务端,实际调用的是 net_write_command.
    ● cli_read_query_result解析header packet, field packet,获 得field_count的个数
    ● mysql_store_result解析了row packet,并存储在result- >data里
    ● myql_fetch_row其实遍历result->data


**________________________________**

**PACKET NUMBER**

在做proxy的时候在这里迷糊过,翻了几遍代码才搞明白，细节如下：
客户端服务端的net->pkt_nr都从0开始.接受包时比较packet number 和net->pkt_nr是否相等,否则报packet number乱序,连接报错;相等则pkt_nr自增.发送包时把net->pkt_nr作为packet number发送,然后对net->pkt_nr进行自增保持和对端的同步.

**接收包**

sql/net_serv.c:my_real_read

    898     if (net->buff[net->where_b + 3] != (uchar) net->pkt_nr)

**发送包**

sql/net_serv.c:my_net_write

    392   int3store(buff,len);
    393   buff[3]= (uchar) net->pkt_nr++;

我们来几个具体场景的packet number, net->pkt_nr的变化

**连接**

    0 c ———–> s 0  connect

    0 c <—-0——s 1  handshake

    2 c —–1—–>s 1  auth

    2 c <—–2——s 0  ok

开始两方都为0,服务端发送handshake packet(pkt=0)之后自增为1,然后等待对端发送过来pkt=1的包

 

**查询**

每次查询,服务客户端都会对net->pkt_nr进行清零

    include/mysql_com.h
    388 #define net_new_transaction(net) ((net)->pkt_nr=0)
    sql/sql_parse.cc:do_command
    805   net_new_transaction(net);

sql/client.c:cli_advanced_command

    800   net_clear(&mysql->net, (command != COM_QUIT));

开始两方net->pkt_nr皆为0, 命令发送后客户端端为1,服务端开始发送分包,分包的pkt_nr的依次递增,客户端的net->pkt_nr也随之增加.

    1 c ——0—–> s 0  query

    1 c <—-1——s 2  resultset

    2 c <—-2——s 3  resultset

**解包的细节**

my_net_read负责解包，首先读取4个字节，判断packet number是否等于net->pkt_nr然后再次读取packet_number长度的包体。

伪代码如下：

    remain=4
    for(i = 0; i < 2; i++) {
        //数据是否读完
        while (remain>0)  {
            length = read(fd, net->buff, remain)
            remain = remain - length
        }
        //第一次
        if (i=0) {
            remain = uint3korr(net->buff+net->where_b);
        }
    }

**网络层优化**

从ppt里可以看到,一个resultset packet由多个包组成,如果每次读写包都导致系统调用那肯定是不合理,常规优化方法:写大包加预读

**NET->BUFF**

每个包发送到网络或者从网络读包都会先把数据包保存在net->buff里,待到net->buff满了或者一次命令结束才会通过socket发出给对端.net->buff有个初始大小(net->max_packet),会随读取数据的增多而扩展.

**VIO->READ_BUFFER**

每次从网络读包,并不是按包的大小读取,而是会尽量读取2048个字节,这样一个resultset包的读取不会再引起多次的系统调用了.header packet读取完毕后, 接下来的field,eof, row apcket读取仅仅需要从vio-read_buffer拷贝指定字节的数据即可.

**MYSQL API说明**

api和MySQL客户端都会使用sql/client.c这个文件,解包的过程都是使用sql/client.c:cli_read_query_result.

mysql_store_result来解析row packet,并把数据存储到res->data里,此时所有数据都存内存里了.

mysql_fetch_row仅仅是使用内部的游标,遍历result->data里的数据

    3052     if (!res->data_cursor)
    3053     {
    3054       DBUG_PRINT("info",("end of data"));
    3055       DBUG_RETURN(res->current_row=(MYSQL_ROW) NULL);
    3056     }
    3057     tmp = res->data_cursor->data;
    3058     res->data_cursor = res->data_cursor->next;
    3059     DBUG_RETURN(res->current_row=tmp);

mysql_free_result是把result->data指定的行数据释放掉.