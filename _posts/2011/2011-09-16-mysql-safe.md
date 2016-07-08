---
layout: post
category : MySQL
tags : [MySQL, Safe]
title: MySQL安全设置
---
{% include JB/setup %}

**常用MYSQL安全设置加固[http://blog.haohtml.com/archives/11263](http://blog.haohtml.com/archives/11263)**

    1.修改root用户口令，删除空口令
    2.删除默认数据库和数据库用户
    3.改变默认mysql管理员帐号
    4.关于密码的管理
    5.使用独立用户运行msyql
    6.禁止远程连接数据库
    7.限制连接用户的数量
    8.用户目录权限限制
    9.命令历史记录保护
    10.禁止MySQL对本地文件存取
    11.MySQL服务器权限控制
    12.使用chroot方式来控制MySQL的运行目录
    13.关闭对无关的Web程序访问的支持
    14.数据库备份策略
    15. Mysqld安全相关启动选项
    16.information_schema 安全

**1.修改root用户口令，删除空口令**

缺省安装的MySQL的root用户是空密码的，为了安全起见，必须修改为强密码，所谓的强密码，至少8位，由字母、数字和符号组成的不规律密码。使用MySQL自带的命令mysaladmin修改root密码，同时也可以登陆数据库，修改数据库mysql下的user表的字段内容，修改方法如下所示：

    /usr/local/mysql/bin/mysqladmin -u root password “upassword” //使用mysqladmin
    mysql> use mysql;
    mysql> update user set password=password(‘upassword’) where user=’root’;
    mysql> flush privileges; //强制刷新内存授权表，否则用的还是在内存缓冲的口令

**2.删除默认数据库和数据库用户**

一般情况下，MySQL数据库安装在本地，并且也只需要本地的php脚本对mysql进行读取，所以很多用户不需要，尤其是默认安装的用户。MySQL初始化后会自动生成空用户和test库，进行安装的测试，这会对数据库的安全构成威胁，有必要全部删除，最后的状态只保留单个root即可，当然以后根据需要增加用户和数据库。

    mysql> show databases;
    mysql> drop database test; //删除数据库test
    mysql> use mysql;
    mysql> delete from db; //删除存放数据库的表信息，因为还没有数据库信息。
    mysql> delete from user where not (user=’root’) ; // 删除初始非root的用户
    mysql> delete from user where user=’root’ and password=""; //删除空密码的root，尽量重复操作
    Query OK, 2 rows affected (0.00 sec)
    mysql> flush privileges; //强制刷新内存授权表。

**3.改变默认mysql管理员帐号**

**4.关于密码的管理**

密码是数据库安全管理的一个很重要因素，不要将纯文本密码保存到数据库中。如果你的计算机有安全危险，入侵者可以获得所有的密码并使用它们。相反，应使用MD5()、SHA1()或单向哈希函数。也不要从词典中选择密码，有专门的程序可以破解它们，请选用至少八位，由字母、数字和符号组成的强密码。在存取密码时，使用mysql的内置函数password（）的sql语句，对密码进行加密后存储。例如以下方式在users表中加入新用户。

    mysql> insert into users values (1,password(1234),’test’);

**5.使用独立用户运行msyql**

绝对不要作为使用root用户运行MySQL服务器。这样做非常危险，因为任何具有FILE权限的用户能够用root创建文件(例如，~root/.bashrc)。mysqld拒绝使用root运行，除非使用–user=root选项明显指定。应该用普通非特权用户运行mysqld。正如前面的安装过程一样，为数据库建立独立的linux中的mysql账户，该账户用来只用于管理和运行MySQL。

要想用其它Unix用户启动mysqld，，增加user选项指定/etc/my.cnf选项文件或服务器数据目录的my.cnf选项文件中的[mysqld]组的用户名。

    vi /etc/my.cnf
    [mysqld]
    user=mysql

该命令使服务器用指定的用户来启动，无论你手动启动或通过mysqld_safe或mysql.server启动，都能确保使用mysql的身份。也可以在启动数据库是，加上user参数。

    /usr/local/mysql/bin/mysqld_safe –user=mysql &

作为其它linux用户而不用root运行mysqld，你不需要更改user表中的root用户名，因为MySQL账户的用户名与linux账户的用户名无关。确保mysqld运行时，只使用对数据库目录具有读或写权限的linux用户来运行。

**6.禁止远程连接数据库**

在命令行netstat -ant下看到，默认的3306端口是打开的，此时打开了mysqld的网络监听，允许用户远程通过帐号密码连接数本地据库，默认情况是允许远程连接数据的。为了禁止该功能，启动skip-networking，不监听sql的任何TCP/IP的连接，切断远程访问的权利，保证安全性。假如需要远程管理数据库，可通过安装PhpMyadmin来实现。假如确实需要远程连接数据库，至少修改默认的监听端口，同时添加防火墙规则，只允许可信任的网络的mysql监听端口的数据通过。

    vi /etc/my.cf
    skip-networking 将此行注释去掉。
    /usr/local/mysql/bin/mysqladmin -u root -p shutdown //停止数据库
    /usr/local/mysql/bin/mysqld_safe –user=mysql & //后台用mysql用户启动mysql

**7.限制连接用户的数量**

数据库的某用户多次远程连接，会导致性能的下降和影响其他用户的操作，有必要对其进行限制。可以通过限制单个账户允许的连接数量来实现，设置my.cnf文件的mysqld中的max_user_connections变量来完成。GRANT语句也可以支持 资源控制选项来限制服务器对一个账户允许的使用范围。

    vi /etc/my.cnf
    [mysqld]
    max_user_connections 2

**8.用户目录权限限制**

默认的mysql是安装在/usr/local/mysql，而对应的数据库文件在/usr/local/mysql/var目录下，因此，必须保证该目录不能让未经授权的用户访问后把数据库打包拷贝走了，所以要限制对该目录的访问。确保mysqld运行时，只使用对数据库目录具有读或写权限的linux用户来运行。

    chown -R root /usr/local/mysql/ //mysql主目录给root
    chown -R mysql.mysql /usr/local/mysql/var //确保数据库目录权限所属mysql用户

**9.命令历史记录保护**

数据库相关的shell操作命令都会分别记录在.bash_history，如果这些文件不慎被读取，会导致数据库密码和数据库结构等信息泄露，而登陆数据库后的操作将记录在.mysql_history文件中，如果使用update表信息来修改数据库用户密码的话，也会被读取密码，因此需要删除这两个文件，同时在进行登陆或备份数据库等与密码相关操作时，应该使用-p参数加入提示输入密码后，隐式输入密码，建议将以上文件置空。

    rm .bash_history .mysql_history //删除历史记录
    ln -s /dev/null .bash_history //将shell记录文件置空
    ln -s /dev/null .mysql_history //将mysql记录文件置空

**10.禁止MySQL对本地文件存取**

在mysql中，提供对本地文件的读取，使用的是load data local infile命令，默认在5.0版本中，该选项是默认打开的，该操作令会利用MySQL把本地文件读到数据库中，然后用户就可以非法获取敏感信息了，假如你不需要读取本地文件，请务必关闭。应该禁止MySQL中用“LOAD DATA LOCAL INFILE”命令。网络上流传的一些攻击方法中就有用它LOAD DATA LOCAL INFILE的，同时它也是很多新发现的SQL Injection攻击利用的手段！黑客还能通过使用LOAD DATALOCAL INFILE装载“/etc/passwd”进一个数据库表，然后能用SELECT显示它，这个操作对服务器的安全来说，是致命的。可以在my.cnf中添加local-infile=0，或者加参数local-infile=0启动mysql。

    /usr/local/mysql/bin/mysqld_safe –user=mysql –local-infile=0 &
    mysql> load data local infile ’sqlfile.txt’ into table users fields terminated by ‘,’;
    ERROR 1148 (42000): The used command is not allowed with this MySQL version

–local-infile=0选项启动mysqld从服务器端禁用所有LOAD DATA LOCAL命令，假如需要获取本地文件，需要打开，但是建议关闭。

**11.MySQL服务器权限控制**

MySQL权限系统的主要功能是证实连接到一台给定主机的用户，并且赋予该用户在数据库上的SELECT、INSERT、UPDATE和DELETE等权限（详见user超级用户表）。它的附加的功能包括有匿名的用户并对于MySQL特定的功能例如LOAD DATA INFILE进行授权及管理操作的能力。
管理员可以对user，db，host等表进行配置，来控制用户的访问权限，而user表权限是超级用户权限。只把user表的权限授予超级用户如服务器或数据库主管是明智的。对其他用户，你应该把在user表中的权限设成’N'并且仅在特定数据库的基础上授权。你可以为特定的数据库、表或列授权，FILE权限给予你用LOAD DATA INFILE和SELECT … INTO OUTFILE语句读和写服务器上的文件，任何被授予FILE权限的用户都能读或写MySQL服务器能读或写的任何文件。(说明用户可以读任何数据库目录下的文件，因为服务器可以访问这些文件）。 FILE权限允许用户在MySQL服务器具有写权限的目录下创建新文件，但不能覆盖已有文件在user表的File_priv设置Y或N。，所以当你不需要对服务器文件读取时，请关闭该权限。

    mysql> load data infile ’sqlfile.txt’ into table loadfile.users fields terminated by ‘,’;
    Query OK, 4 rows affected (0.00 sec) //读取本地信息sqlfile.txt’
    Records: 4 Deleted: 0 Skipped: 0 Warnings: 0
    mysql> update user set File_priv=’N’ where user=’root’; //禁止读取权限
    Query OK, 1 row affected (0.00 sec)
    Rows matched: 1 Changed: 1 Warnings: 0
    mysql> flush privileges; //刷新授权表
    Query OK, 0 rows affected (0.00 sec)
    mysql> load data infile ’sqlfile.txt’ into table users fields terminated by ‘,’; //重登陆读取文件
    ERROR 1045 (28000): Access denied for user ‘root’@'localhost’ (using password: YES) //失败
    mysql> select * from loadfile.users into outfile ‘test.txt’ fields terminated by ‘,’;
    ERROR 1045 (28000): Access denied for user ‘root’@'localhost’ (using password: YES)

为了安全起见，随时使用SHOW GRANTS语句检查查看谁已经访问了什么。然后使用REVOKE语句删除不再需要的权限。

**12.使用chroot方式来控制MySQL的运行目录**

Chroot是linux中的一种系统高级保护手段，它的建立会将其与主系统几乎完全隔离，也就是说，一旦遭到什么问题，也不会危及到正在运行的主系统。这是一个非常有效的办法，特别是在配置网络服务程序的时候。

**13.关闭对无关的Web程序访问的支持**

如果不打算让Web访问使用MySQL数据库，没有提供诸如PHP这样的Web语言的时候，重新设置或编译你的PHP，取消它们对MySQL的默认支持。假如服务器中使用php等web程序，试试用Web形式非法的请求，如果得到任何形式的MySQL错误，立即分析原因，及时修改Web程序，堵住漏洞，防止MySQL暴露在web面前。
对于Web的安全检查，在MySQL官方文档中这么建议，对于web应用，至少检查以下清单：

试试用Web形式输入单引号和双引号(‘’’和‘”’)。如果得到任何形式的MySQL错误，立即分析原因。
试试修改动态URL，可以在其中添加%22(‘”’)、%23(‘#’)和%27(‘’’)。
试试在动态URL中修改数据类型，使用前面示例中的字符，包括数字和字符类型。你的应用程序应足够安全，可以防范此类修改和类似攻击。
试试输入字符、空格和特殊符号，不要输入数值字段的数字。你的应用程序应在将它们传递到MySQL之前将它们删除或生成错误。将未经过检查的值传递给MySQL是很危险的！
将数据传给MySQL之前先检查其大小。
用管理账户之外的用户名将应用程序连接到数据库。不要给应用程序任何不需要的访问权限。

**14.数据库备份策略**

使用 mysqldump进行备份非常简单，如果要备份数据库” nagios_db_backup ”，使用命令，同时使用管道gzip命令对备份文件进行压缩，建议使用异地备份的形式，可以采用Rsync等方式，将备份服务器的目录挂载到数据库服务器，将数据库文件备份打包在，通过crontab定时备份数据：

    !/bin/sh
    time=`date +”(“%F”)”%R`
    $/usr/local/mysql/bin/mysqldump -u nagios -pnagios nagios | gzip >/home/sszheng/nfs58/nagiosbackup/nagios_backup.$time.gz
    crontab -l
    m h dom mon dow command
    00 00 * * * /home/sszheng/shnagios/backup.sh

恢复数据使用命令：

    gzip -d nagios_backup.\(2008-01-24\)00\:00.gz
    nagios_backup.(2008-01-24)00:00
    mysql –u root -p nagios < /home/sszheng/nfs58/nagiosbackup/nagios_backup.\(2008-01-24\)12\:00

**15. Mysqld安全相关启动选项**

    –local-infile[={0|1}]

如果用–local-infile=0启动服务器，则客户端不能使用LOCAL in LOAD DATA语句。

    –old-passwords

强制服务器为新密码生成短(pre-4.1)密码哈希。当服务器必须支持旧版本客户端程序时，为了保证兼容性这很有用。

    (OBSOLETE) –safe-show-database

在以前版本的MySQL中，该选项使SHOW DATABASES语句只显示用户具有部分权限的数据库名。在MySQL 5.1中，该选项不再作为现在的 默认行为使用，有一个SHOW DATABASES权限可以用来控制每个账户对数据库名的访问。

    –safe-user-create

如果启用，用户不能用GRANT语句创建新用户，除非用户有mysql.user表的INSERT权限。如果你想让用户具有授权权限来创建新用户，你应给用户授予下面的权限：

    mysql> GRANT INSERT(user) ON mysql.user TO ‘user_name’@'host_name’;

这样确保用户不能直接更改权限列，必须使用GRANT语句给其它用户授予该权限。

    –secure-auth

不允许鉴定有旧(pre-4.1)密码的账户。

**16.information_schema 安全**

这个问题一直没有解决吗，但是很重要，黑客可以通过它列出库内的表名和字段账号密码，可以参考官方有如下俩个提出

[http://bugs.mysql.com/bug.php?id=38837](http://bugs.mysql.com/bug.php?id=38837)
[http://bugs.mysql.com/bug.php?id=27629](http://bugs.mysql.com/bug.php?id=27629)

Phpmyadmin里隐藏方法

    $cfg['servers'][$i]['hide_db'] = ‘information_schema’;

PHP IDS
memechae 代理
knock

    1.php?id=1
    1.php/?id=1