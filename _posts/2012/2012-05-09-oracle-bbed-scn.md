---
layout: post
category : Oracle
tags : [Oracle, Error]
title: 使用BBED修改SCN
---
{% include JB/setup %}
**来自：[http://www.alidba.net/index.php/archives/594](http://www.alidba.net/index.php/archives/594)**

下面这个错误，我想是很多DBA的痛。

    @>startup ;
    ORACLE instance started.
    Total System Global Area  838860800 bytes
    Fixed Size                  2087608 bytes
    Variable Size             494929224 bytes
    Database Buffers          335544320 bytes
    Redo Buffers                6299648 bytes
    Database mounted.
    ORA-01113: file 5 needs media recovery
    ORA-01110: data file 5: '/data/oracle/oradata/orcl/wt_tbs01.dbf'

有备份还好，没备份基本上只有把数据文件offline了。DBA准备打包回家吧。

经过无数次的测试，确认修改SCN号可以搞定。目前网上的文章，多少还是有些错误。经过反复的测试，确认没有问题。

我们直接使用BBED查看下当前SYSTEM TBS表空间的SCN号：

    BBED> set file 1
    FILE#           1

数据文件头就是第一个block块，因此我们不需要设置其他block块，此外map可以显示block里的详细信息。我们发现就一个“kcvfh”，OK直接查看这个吧。

    BBED> map
    File: /data/oracle/oradata/bops10g/system01.dbf (1)
    Block: 1                                 Dba:0×00400001
    ————————————————————
    Data File Header
    struct kcvfh, 676 bytes                  @0
    ub4 tailchk                              @8188

print出来的内容太多，我做了删剪，留下我们有用的内容。

    BBED> print kcvfh
    struct kcvfh, 676 bytes                  @0
    ………………………………
    struct kcvfhckp, 36 bytes                @484
    struct kcvcpscn, 8 bytes                 @484
    ub4 kscnbas                              @484      0×000748bf–SCN的低位
    ub2 kscnwrp                              @488      0×0000–SCN的高位
    ub4 kcvcptim                             @492      0×2ea86f92 –最后一次checkpoint time
    ub2 kcvcpthr                             @496      0×0001
    ………………………………
    ub4 kcvfhcpc                             @140      0×0000007f—checkpoint count
    ub4 kcvfhrts                             @144      0×2ea86844
    ub4 kcvfhccc                             @148      0×0000007e–oracle 一个TBS最多30个字符，通过BBED ，我们发现这里是定长的
    text kcvfhtnm[0]                         @338      S
    text kcvfhtnm[1]                         @339      Y
    text kcvfhtnm[2]                         @340      S
    text kcvfhtnm[3]                         @341      T
    text kcvfhtnm[4]                         @342      E
    text kcvfhtnm[5]                         @343      M
    text kcvfhtnm[6]                         @344
    text kcvfhtnm[7]                         @345
    text kcvfhtnm[8]                         @346
    text kcvfhtnm[9]                         @347
    text kcvfhtnm[10]                        @348
    text kcvfhtnm[11]                        @349
    text kcvfhtnm[12]                        @350
    text kcvfhtnm[13]                        @351
    text kcvfhtnm[14]                        @352
    text kcvfhtnm[15]                        @353
    text kcvfhtnm[16]                        @354
    text kcvfhtnm[17]                        @355
    text kcvfhtnm[18]                        @356
    text kcvfhtnm[19]                        @357
    text kcvfhtnm[20]                        @358
    text kcvfhtnm[21]                        @359
    text kcvfhtnm[22]                        @360
    text kcvfhtnm[23]                        @361
    text kcvfhtnm[24]                        @362
    text kcvfhtnm[25]                        @363
    text kcvfhtnm[26]                        @364
    text kcvfhtnm[27]                        @365
    text kcvfhtnm[28]                        @366
    text kcvfhtnm[29]                        @367
    ………………………………

这4个offset的位置内容，文档上是这样说的：

Oracleconsiders four attributes of this data structure when determining if a datafile is sync with the other data files of the database:

    （1）kscnbas (at offset 484) - SCN of last change to the datafile.
    （2）kcvcptim (at offset 492) -Time of the last change to the datafile.
    （3）kcvfhcpc (at offset 140) - Checkpoint count.
    （4）kcvfhccc (at offset 148) - Unknown, but is always 1 less than thecheckpoint point count.

oracle主要通过这4个来判断一致性，至于中文说明，我也写在上面了。

接下去，我们看看坏掉的wt-tbs01.dbf的信息：

    wt_tbs.dbf
    struct kcvfhckp, 36 bytes                @484
    struct kcvcpscn, 8 bytes                 @484
    ub4 kscnbas                              @484      0×000747a5
    ub2 kscnwrp                              @488      0×0000
    ub4 kcvcptim                             @492      0×2ea86f03
    ub2 kcvcpthr                             @496      0×0001
    union u, 12 bytes                        @500
    struct kcvcprba, 12 bytes                @500
    ub4 kcrbaseq                             @500      0×00000004
    ub4 kcrbabno                             @504      0×00000019
    ub2 kcrbabof                             @508      0×0010
    **********************
    ub4 kcvfhcpc                             @140      0×00000007
    ub4 kcvfhrts                             @144      0×2ea86844
    ub4 kcvfhccc                             @148      0×00000006

好，484，492，140，148直接修改就好了。

    /**************
    484
    ****************/
    ub4 kscnbas                            @484      0×000747a5-> 0×000748bf–> bf487400
    set offset 484
    modify /x bf48
    set offset 486
    modify /x 0700
    /**************
    492
    ******************/
    ub4 kcvcptim                           @492      0×2ea86f03->0×2ea86f92 –>926fa8ea
    set offset 492
    modify /x 926f
    set offset 494
    modify /x a82e
    /**************
    140
    ******************/
    ub4 kcvfhcpc                           @140      0×00000007->0×0000007f–>7f000000
    set offset 140
    modify /x 7f00
    set offset 142
    modify /x 0000
    /**************
    148
    **************/
    ub4 kcvfhccc                           @148      0×00000006->0×0000007e->7e000000
    set offset 148
    modify /x 7e00
    set offset 150
    modify /x 0000

最后做下checksum，就OK了

    BBED> sum dba 5,1 apply
    Check value for File 5, Block 1:
    current = 0×554c, required = 0×554c

接下去就简单了，重建控制文件，数据库OPEN RESETLOG搞定

    @>startup nomount;
    ORACLE instance started.
    Total System Global Area  838860800 bytes
    Fixed Size                  2087608 bytes
    Variable Size             494929224 bytes
    Database Buffers          335544320 bytes
    Redo Buffers                6299648 bytes
    @>CREATE CONTROLFILE REUSE DATABASE “orcl” RESETLOGS  NOARCHIVELOG
    2      MAXLOGFILES 5
    3      MAXLOGMEMBERS 5
    4      MAXDATAFILES 100
    5      MAXINSTANCES 1
    MAXLOGHISTORY 292
    6    7  LOGFILE
    8    GROUP 1 '/data/oracle/oradata/orcl/redo101.log'  SIZE 10M,
    9    GROUP 2 '/data/oracle/oradata/orcl/redo201.log'  SIZE 10M,
    10    GROUP 3 '/data/oracle/oradata/orcl/redo301.log'  SIZE 10M
    11  — STANDBY LOGFILE
    12  DATAFILE
    13    '/data/oracle/oradata/orcl/system01.dbf',
    14    '/data/oracle/oradata/orcl/undotbs01.dbf',
    15    '/data/oracle/oradata/orcl/sysaux01.dbf',
    16    '/data/oracle/oradata/orcl/users01.dbf',
    17    '/data/oracle/oradata/orcl/wt_tbs01.dbf'
    18  CHARACTER SET US7ASCII
    19  ;
    Control file created.
    @>RECOVER DATABASE USING BACKUP CONTROLFILE
    ORA-00279: change 477375 generated at 05/09/2012 01:49:06 needed for thread 1
    ORA-00289: suggestion : /data/oracle/arch/orcl/1_4_782784012.arc
    ORA-00280: change 477375 for thread 1 is in sequence #4
    Specify log: {<RET>=suggested | filename | AUTO | CANCEL}
    cancel
    Media recovery cancelled.
    @>ALTER DATABASE OPEN RESETLOGS;
    Database altered.