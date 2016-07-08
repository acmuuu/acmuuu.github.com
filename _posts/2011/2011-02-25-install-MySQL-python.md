---
layout: post
category : Python
tags : [MySQLdb]
title: MySQLdb安装
---
{% include JB/setup %}
Python访问MySQL的模块，以前叫MySQLdb，后来更名为mysql-python

**源码安装**

安装有时会遇到这样的问题：

    $ sudo python setup.py
    installsh: line 1: mysql_config: command not found
    Traceback (most recent call last):
      File "setup.py", line 16, in ?
        metadata, options = get_config()
      File "/Users/farocco/MySQL-python-1.2.3/setup_posix.py", line 43, in
    get_config
        libs = mysql_config("libs_r")
      File "/Users/farocco/MySQL-python-1.2.3/setup_posix.py", line 24, in
    mysql_config
        raise EnvironmentError, "%s not found" % mysql_config.path
    EnvironmentError: mysql_config not found
    
其实原因出在mysql_config上。

首先需要定位到本机的mysql_config，mysql_config和mysql,mysqldump在同一目录，如：/mysql/bin/mysql_config

查看mysql_config

    root@Durden:/opt# /usr/bin/mysql_config
    Usage: /usr/bin/mysql_config [OPTIONS]
    Options:
            --cflags         [-I/usr/include/mysql  -DBIG_JOINS=1  -fno-strict-aliasing   -DUNIV_LINUX -DUNIV_LINUX]
            --include        [-I/usr/include/mysql]
            --libs           [-Wl,-Bsymbolic-functions -rdynamic -L/usr/lib/mysql -lmysqlclient]
            --libs_r         [-Wl,-Bsymbolic-functions -rdynamic -L/usr/lib/mysql -lmysqlclient_r]
            --plugindir      [/usr/lib/mysql/plugin]
            --socket         [/var/run/mysqld/mysqld.sock]
            --port           [0]
            --version        [5.1.49]
            --libmysqld-libs [-Wl,-Bsymbolic-functions -rdynamic -L/usr/lib/mysql -lmysqld -ldl -lwrap -lrt]

如果没有mysql_config，安装mysql的client的lib

    root@Durden:/opt# apt-get install libmysqlclient-dev
    
要修复此错误，修改setup_posix.py文件，在26行显示地设定mysql_config：

    mysql_config.path = "/data/mysql/bin/mysql_config"
    
再次运行

    python setup.py build
    python setup.py install
    
安装完成

**easy_install 或者 pip安装**

easy_install

    root@Durden:/opt#sudo apt-get install python-setuptools
    root@Durden:/opt#easy_install mysql-python

pip

    root@Durden:/opt#apt-get install python-pip
    root@Durden:/opt# pip install MySQL-python
    Downloading/unpacking MySQL-python
      Downloading MySQL-python-1.2.3.tar.gz (70Kb): 70Kb downloaded
      Running setup.py egg_info for package MySQL-python
        warning: no files found matching 'MANIFEST'
        warning: no files found matching 'ChangeLog'
        warning: no files found matching 'GPL'
    Installing collected packages: MySQL-python
      Running setup.py install for MySQL-python
        building '_mysql' extension
        gcc -pthread -fno-strict-aliasing -DNDEBUG -g -fwrapv -O2 -Wall -Wstrict-prototypes -fPIC -Dversion_info=(1,2,3,'final',0) -D__version__=1.2.3 -I/usr/include/mysql -I/usr/include/python2.6 -c _mysql.c -o build/temp.linux-i686-2.6/_mysql.o -DBIG_JOINS=1 -fno-strict-aliasing -DUNIV_LINUX -DUNIV_LINUX
        In file included from _mysql.c:36:
        /usr/include/mysql/my_config.h:1065: warning: "HAVE_WCSCOLL" redefined
        /usr/include/python2.6/pyconfig.h:808: note: this is the location of the previous definition
        gcc -pthread -shared -Wl,-O1 -Wl,-Bsymbolic-functions build/temp.linux-i686-2.6/_mysql.o -L/usr/lib/mysql -lmysqlclient_r -o build/lib.linux-i686-2.6/_mysql.so
        warning: no files found matching 'MANIFEST'
        warning: no files found matching 'ChangeLog'
        warning: no files found matching 'GPL'
    Successfully installed MySQL-python
    Cleaning up...
