---
layout: post
category : Linux
tags : [CentOS, Keepalived]
title: 编译安装keepalived
---
{% include JB/setup %}
**1）Configure**

如果出现openssl相关错误

	[root@localhost keepalived-1.1.20]# ./configure --prefix=/usr/local/keepalived --with-kernel-dir=/usr/src/kernels/2.6.18-164.el5-x86_64
	....
	checking openssl/ssl.h usability... no
	checking openssl/ssl.h presence... no
	checking for openssl/ssl.h... no
	configure: error:
	  !!! OpenSSL is not properly installed on your system. !!!
	  !!! Can not include OpenSSL headers files.
	  
需要安装openssl-devel相关包

	[root@localhost keepalived-1.1.20]# yum install openssl-devel


**要支持LVS调度需要在编译keeepalived时支持LVS**

方法：编译的时候指定Linux内核路径--with-kernel-dir，如果找不到该路径安装kernel-devel包

不加--with-kernel-dir：

	[root@localhost keepalived-1.1.20]# yum install kernel-devel
	[root@localhost keepalived-1.1.20]# ./configure --prefix=/usr/local/keepalived
	....
	configure: creating ./config.status
	config.status: creating Makefile
	config.status: creating genhash/Makefile
	config.status: WARNING:  'genhash/Makefile.in' seems to ignore the --datarootdir setting
	config.status: creating keepalived/core/Makefile
	config.status: creating keepalived/include/config.h
	config.status: creating keepalived.spec
	config.status: creating keepalived/Makefile
	config.status: WARNING:  'keepalived/Makefile.in' seems to ignore the --datarootdir setting
	config.status: creating lib/Makefile
	config.status: creating keepalived/vrrp/Makefile

	Keepalived configuration
	------------------------
	Keepalived version       : 1.1.20
	Compiler                 : gcc
	Compiler flags           : -g -O2
	Extra Lib                : -lpopt -lssl -lcrypto
	Use IPVS Framework       : No
	IPVS sync daemon support : No
	Use VRRP Framework       : Yes
	Use Debug flags          : No

注意这两个参数：

	Use IPVS Framework : No
	IPVS sync daemon support : No
	
加--with-kernel-dir：

	[root@localhost keepalived-1.1.20]# ./configure --prefix=/usr/local/keepalived --with-kernel-dir=/usr/src/kernels/2.6.18-164.el5-x86_64
	....
	configure: creating ./config.status
	config.status: creating Makefile
	config.status: creating genhash/Makefile
	config.status: WARNING:  'genhash/Makefile.in' seems to ignore the --datarootdir setting
	config.status: creating keepalived/core/Makefile
	config.status: creating keepalived/include/config.h
	config.status: creating keepalived.spec
	config.status: creating keepalived/Makefile
	config.status: WARNING:  'keepalived/Makefile.in' seems to ignore the --datarootdir setting
	config.status: creating lib/Makefile
	config.status: creating keepalived/vrrp/Makefile
	config.status: creating keepalived/check/Makefile
	config.status: creating keepalived/libipvs-2.6/Makefile

	Keepalived configuration
	------------------------
	Keepalived version       : 1.1.20
	Compiler                 : gcc
	Compiler flags           : -g -O2
	Extra Lib                : -lpopt -lssl -lcrypto
	Use IPVS Framework       : Yes
	IPVS sync daemon support : Yes
	Use VRRP Framework       : Yes
	Use Debug flags          : No

注意这两个参数变化：

	Use IPVS Framework : Yes
	IPVS sync daemon support : Yes

**2）编译安装**

	[root@localhost keepalived-1.1.20]# make && make install
