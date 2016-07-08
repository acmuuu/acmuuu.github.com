---
layout: post
category : Oracle
tags : [Oracle, CentOS]
title: CentOS5静默安装Oracle10g
---
{% include JB/setup %}

**1.到oracle官网中下载oracle10g的安装cpio.gz文件**

**2.对cpio.gz文件进行解压操作**

    gunzip 文件名.cpio.gz

**3.对解压后生成的文件名.cpio文件进行cpio的操作**

    cpio -idmv <文件名.cpio

**4.调整内核及参数**

    vi /etc/security/limits.conf

增加如下内容：

    oracle               soft    nproc   2047  最小启动进程，根据要求改变值
    oracle               hard    nproc   16384 最大启动进程，根据要求改变值
    oracle               soft    nofile  1024  最小打开文件数，根据要求改变值
    oracle               hard    nofile  65536 最大打开文件数，根据要求改变值
 
使用ulimit -all |grep proc查看系统默认的参数，如果系统参数较大，则不用修改。

    vi /etc/sysctl.conf

修改如下内容，如果系统中的值大于下面的设置值（使用sysctl -a|grep 下面等号前面的名字，来查看系统值），则不用更改此项：

    kernel.shmall = 2097152
    kernel.shmmax = 2147483648 #如为 64位操作系统 则为 8589934592
    kernel.shmmni = 4096
    kernel.sem = 250 32000 100 128
    fs.file-max=65536
    net.ipv4.ip_local_port_range = 1024 65000
    net.core.rmem_default = 1048576
    net.core.rmem_max = 1048576
    net.core.wmem_default = 262144
    net.core.wmem_max = 262144
    kernel.panic = 60

更改完这个文件，使用sysctl -p使参数生效。
使用sysctl –a|grep 参数名，来验证设置参数值的正确性。

    vi /etc/pam.d/login

在文件末尾增加如下内容：

    session    required     /lib64/security/pam_limits.so (64位系统 /lib64/security/pam_limits.so)
    session    required     pam_limits.so

**5.创建oracle需要的组和用户及安装目录**

    mkdir -p /opt/ora10201

以上目录路径，根据要求变化。
需要创建的用户和组

    oinstall Oracle安装组
    dba OSDBA组
    oracle Oracle软件使用者
    nobody 普通用户

判断是否存在上述的用户和组

    grep dba /etc/group
    grep oinstall /etc/group
    grep oracle /etc/passwd
    grep nobody /etc/passwd

如果命令没有显示，则表示不存在这些用户，一般新装的系统，只有nobody用户
创建用户和组

    groupadd oinstall
    groupadd dba
    useradd -g oinstall -G dba -m oracle -d /opt/ora10201/oracle

设置oracle用户的密码

    passwd oracle

设置目录所有者和权限

    chown -R oracle.oinstall /opt/ora10201

**6.编辑oracle用户环境变量**
在/home/oracle/目录下

    vi .bash_profile

添加以下参数：

    export ORACLE_BASE=/opt/ora10201
    export ORACLE_HOME=$ORACLE_BASE/oracle/product/10.2.0/db_1
    export ORACLE_SID=ora
    export PATH=$PATH:$ORACLE_HOME/bin:$HOME/bin
    export LD_LIBRARY_PATH=$LD_LIBRARY_PATH:$ORACLE_HOME/lib:/usr/lib:/usr/local/lib
    export NLS_LANG=AMERICAN_AMERICA.UTF8
    export ORA_NLS10=$ORACLE_HOME/nls/data 如不加则可能会出现ORA-12705错误

以上的环境变量的值，根据你实际要求的进行改变。执行以下命令让配置马上生效或以oracle用户登录使设置生效

    source .bash_profile

**7.使用oracle用户登录系统。注意：一定是要用oracle登录shell，不能使用su。**

**8.建立或修改静默安装的配置文件**

    vi $ORACLE_BASE/database/response/enterprise.rsp

根据实际情况进行修改如：

    UNIX_GROUP_NAME="oinstall"#oracle安装组名
    RESPONSEFILE_VERSION=2.2.1.0.0
    FROM_LOCATION="../stage/products.xml"
    ORACLE_HOME="/opt/ora10201/oracle/product/10.2.0/db_1/"
    ORACLE_HOME_NAME="OraDb10g_home1"
    TOPLEVEL_COMPONENT={"oracle.server","10.2.0.1.0"}
    DEINSTALL_LIST={"oracle.server","10.2.0.1.0"}
    SHOW_SPLASH_SCREEN=false
    SHOW_WELCOME_PAGE=false
    SHOW_COMPONENT_LOCATIONS_PAGE=false
    SHOW_CUSTOM_TREE_PAGE=false
    SHOW_SUMMARY_PAGE=false
    SHOW_INSTALL_PROGRESS_PAGE=false
    SHOW_REQUIRED_CONFIG_TOOL_PAGE=false
    SHOW_CONFIG_TOOL_PAGE=false
    SHOW_RELEASE_NOTES=false
    SHOW_ROOTSH_CONFIRMATION=false
    SHOW_END_SESSION_PAGE=false
    SHOW_EXIT_CONFIRMATION=false
    NEXT_SESSION=false
    NEXT_SESSION_ON_FAIL=false
    SHOW_DEINSTALL_CONFIRMATION=false
    SHOW_DEINSTALL_PROGRESS=false
    ACCEPT_LICENSE_AGREEMENT=true
    COMPONENT_LANGUAGES={"en"}
    CLUSTER_NODES=
    INSTALL_TYPE="EE"
    s_nameForDBAGrp=dba
    s_nameForOPERGrp=dba
    b_oneClick=false
    SHOW_DATABASE_CONFIGURATION_PAGE=false
    b_createStarterDB=false

**9.开始安装oracle**

依赖包

    rpm -q --qf '%{NAME}-%{VERSION}-%{RELEASE} (%{ARCH}) \n' \binutils compat-db compat-libstdc++-296 control-center gcc gcc-c++ glibc-common libstdc++ libstdc++-devel libXp make ksh sysstat setarch
    binutils-2.17.50.0.6-14.el5 (x86_64) 
    compat-db-4.2.52-5.1 (x86_64) 
    compat-libstdc++-296-2.96-138 (i386) 
    control-center-2.16.0-16.el5 (x86_64) 
    control-center-2.16.0-16.el5 (i386) 
    gcc-4.1.2-50.el5 (x86_64) 
    gcc-c++-4.1.2-50.el5 (x86_64) 
    glibc-common-2.5-58 (x86_64) 
    libstdc++-4.1.2-50.el5 (x86_64) 
    libstdc++-4.1.2-50.el5 (i386) 
    libstdc++-devel-4.1.2-50.el5 (x86_64) 
    libXp-1.0.0-8.1.el5 (x86_64) 
    libXp-1.0.0-8.1.el5 (i386) 
    make-3.81-3.el5 (x86_64) 
    ksh-20100202-1.el5_5.1 (x86_64) 
    sysstat-7.0.2-3.el5_5.1 (x86_64) 
    setarch-2.0-1.1 (x86_64) 

添加10g支持的Linux版本

    vi /opt/ora10201/database/install/oraparam.ini 

    [Certified Versions]
    Linux=redhat-3,SuSE-9,redhat-4,redhat-5,UnitedLinux-1.0,asianux-1,asianux-2

    [Linux-redhat-5.6-optional]
    TEMP_SPACE=80
    SWAP_SPACE=150
    MIN_DISPLAY_COLORS=256

开始执行安装

    cd $ORACLE_BASE/database/

执行如下命令:

    ./runInstaller -silent -responseFile /$ORACLE_BASE/database/response/enterprise.rsp

注意-responseFile参数后的文件路径一定是绝对路径 ，并且enterprise.rsp oracle用户可读
运行到最后会提示我们查看log日志
查看日志，提示我们用root用户运行如下两个脚本：

    /opt/ora10201/oraInventory/orainstRoot.sh
    /opt/ora10201/oracle/product/10.2.0/db_1/root.sh

**10.用root用户登录并运行安装所需脚本**

    sh /opt/ora10201/oraInventory/orainstRoot.sh
    sh /opt/ora10201/oracle/product/10.2.0/db_1/root.sh

至此Oracle的产品已经安装完成
如要卸载oracle数据库软件则执行：

    ./runInstaller -silent -deinstall -removeallfiles -removeAllPatches "REMOVE_HOMES={$ORACLE_HOME}" -responseFile /opt/ora10201/database/response/enterprise.rsp

**11.静默创建oracle数据库**

    cd $ORACLE_HOME/assistants/dbca/templates
    touch orcl.dbc
    cat General_Purpose.dbc>>orcl.dbc
    cd $ORACLE_BASE/database/response
    vi dbca.rsp 修改相关参数如下：
    GDBNAME= "ora"
    SID= "ora"
    TEMPLATENAME= "/opt/ora10201/oracle/product/10.2.0/db_1/assistants/dbca/templates/General_Purpose.dbc"  模板的完全路径
    DB_UNIQUE_NAME= "ora"
    INSTANCENAME= "ora" 实例名，如果需要使用Oracle Enterprise Manager，则还需要修改以下参数如下：
    EMCONFIGURATION="LOCAL"   
    SYSMANPASSWORD="123456"  
    DBSNMPPASSWORD="123456" 

执行命令创建数据库

    cd /$ORACLE_HOME/bin
    ./dbca -silent -createdatabase -responseFile  /opt/ora10201/database/response/dbca.rsp

数据库就建好了
如果要卸载数据库则：

    ./dbca -silent -deleteDatabase -sourceDB ora -sid ora -sysDBAUserName oracle -sysDBAPassword oracle

**12.使用lsnrctl来建立监听**

    cd /opt/ora10201/oracle/product/10.2.0/db_1/network/admin
    touch listener.ora
    vi listener.ora

添加如下内容：

    LISTENER =
      (DESCRIPTION_LIST =
        (DESCRIPTION =
          (ADDRESS = (PROTOCOL = TCP)(HOST = 192.168.0.188)(PORT = 1521))#HOST值为服务器的ip或者域名
          (ADDRESS = (PROTOCOL = IPC)(KEY = EXTPROC1521))
        )
      )
    SID_LIST_LISTENER =
      (SID_LIST =
        (SID_DESC =
          (SID_NAME = PLSExtProc)
          (ORACLE_HOME = /opt/ora10201/oracle/product/10.2.0/db_1)
              #(PROGRAM = extproc)
        )
        (SID_DESC =
          (SID_NAME = ora)
          (ORACLE_HOME = /opt/ora10201/oracle/product/10.2.0/db_1)
          #(PROGRAM = extproc)
        )
      )
    cd /opt/ora10201/oracle/product/10.2.0/db_1/bin
    ./lsnrctl stop
    ./lsnrctl start

**13.要想客户端连接上服务器端则在客户端编写tnsnames.ora**

    vi $ORACLE_HOME/network/admin/tnsnames.ora

添加如下内容：

    ORA =
      (DESCRIPTION =
        (ADDRESS = (PROTOCOL = TCP)(HOST =192.168.0.188)(PORT = 1521))
        (CONNECT_DATA =
          (SERVER = DEDICATED)
          (SERVICE_NAME = ora)
        )
      )
    EXTPROC_CONNECTION_DATA =
      (DESCRIPTION =
        (ADDRESS_LIST =
          (ADDRESS = (PROTOCOL = IPC)(KEY = EXTPROC1))
        )
        (CONNECT_DATA =
          (SID = PLSExtProc)
          (PRESENTATION = RO)
        )
      )

**附录：**

a.oracle的用户的密码是不能以数据开头的如果要想以数字开头则密码必须要以“123456”的格式否则会出错
b.连接数据库时报TNS-12560错误

    vi /etc/sysconfig/iptables

将

    -A RH-Firewall-1-INPUT -j REJECT --reject-with icmp-host-prohibited

改为

    -A RH-Firewall-1-INPUT -m state --state NEW -m tcp -p tcp --dport 1520:1523 -j ACCEPT
    (允许1520到1523的端口访问)
重启iptables

    service iptables restart
