---
layout: post
category : Linux
tags : [Linux]
title: 使用yum命令保存rpm包
---
{% include JB/setup %}
**来自[http://www.cyberciti.biz/faq/yum-downloadonly-plugin/](http://www.cyberciti.biz/faq/yum-downloadonly-plugin/)**

**问：**

would like to only download the packages via yum and not install/update them. How do I download a RPM package using yum command under CentOS Enterprise Linux server 5.x or RHEL 5.x systems?

**答：**

**Method # 1: yum-downloadonly**

You need to install plugin called yum-downloadonly. This plugin adds a --downloadonly flag to yum so that yum will only download the packages and not install/update them. Following options supported by this plugin:

	[a] --downloadonly : don't update, just download a rpm file
	[b] --downloaddir=/path/to/dir : specifies an alternate directory to store packages such as /tmp

Please note following instructions are only tested on CentOS server but should work with RHN and RHEL without any problem.

How do I install yum-downloadonly plugin?

Type the following command to install plugin, enter:

	yum install yum-downloadonly

Sample output:

	Loading "fastestmirror" plugin
	Loading "security" plugin
	Loading mirror speeds from cached hostfile
	 * base: centos.mirrors.tds.net
	 * updates: mirror.myriadnetwork.com
	 * addons: mirrors.gigenet.com
	 * extras: holmes.umflint.edu
	Setting up Install Process
	Parsing package install arguments
	Resolving Dependencies
	--> Running transaction check
	---> Package yum-downloadonly.noarch 0:1.1.10-9.el5.centos set to be updated
	--> Finished Dependency Resolution
	Dependencies Resolved
	=============================================================================
	 Package                 Arch       Version          Repository        Size
	=============================================================================
	Installing:
	 yum-downloadonly        noarch     1.1.10-9.el5.centos  base              9.0 k
	Transaction Summary
	=============================================================================
	Install      1 Package(s)
	Update       0 Package(s)
	Remove       0 Package(s)
	Total download size: 9.0 k
	Is this ok [y/N]: y
	Downloading Packages:
	(1/1): yum-downloadonly-1 100% |=========================| 9.0 kB    00:00
	Running rpm_check_debug
	Running Transaction Test
	Finished Transaction Test
	Transaction Test Succeeded
	Running Transaction
	  Installing: yum-downloadonly             ######################### [1/1]
	Installed: yum-downloadonly.noarch 0:1.1.10-9.el5.centos
	Complete!

How do I download a RPM package only from RHN or CentOS mirror, without installing it?

Download httpd package but don't install/update, enter:

	# yum update httpd -y --downloadonly

By default package will by downloaded and stored in /var/cache/yum/ directory. But, you can specifies an alternate directory to store packages such as /opt, enter:

	# yum update httpd -y --downloadonly --downloaddir=/opt

Sample output:

	yum install httpd -y --downloadonly
	Loading "downloadonly" plugin
	Loading "fastestmirror" plugin
	Loading "security" plugin
	Loading mirror speeds from cached hostfile
	 * base: centos.mirrors.mypsh.com
	 * updates: mirror.steadfast.net
	 * addons: mirrors.gigenet.com
	 * extras: holmes.umflint.edu
	Setting up Install Process
	Parsing package install arguments
	Resolving Dependencies
	--> Running transaction check
	---> Package httpd.i386 0:2.2.3-11.el5_1.centos.3 set to be updated
	filelists.xml.gz          100% |=========================| 2.8 MB    00:03
	filelists.xml.gz          100% |=========================| 681 kB    00:11
	filelists.xml.gz          100% |=========================| 122 kB    00:00
	filelists.xml.gz          100% |=========================|  150 B    00:00
	--> Finished Dependency Resolution
	Dependencies Resolved
	=============================================================================
	 Package                 Arch       Version          Repository        Size
	=============================================================================
	Installing:
	 httpd                   i386       2.2.3-11.el5_1.centos.3  base              1.1 M
	Transaction Summary
	=============================================================================
	Install      1 Package(s)
	Update       0 Package(s)
	Remove       0 Package(s)
	Total download size: 1.1 M
	Downloading Packages:
	(1/1): httpd-2.2.3-11.el5 100% |=========================| 1.1 MB    00:01
	exiting because --downloadonly specified

To see downloaded file, enter:

	# ls -l /opt/*.rpm

Sample output:

	-rw-r--r-- 1 root root 1116426 Jan 17 03:36 /opt/httpd-2.2.3-11.el5_1.centos.3.i386.rpm
	-rw-r--r-- 1 root root   83452 Oct  2  2007 /opt/lighttpd-fastcgi-1.4.18-1.el5.rf.i386.rpm
	-rw-r--r-- 1 root root  635045 Oct 20  2007 /opt/psad-2.1-1.i386.rpm

**Method # 2: yum-utils.noarch Package**

yum-utils is a collection of utilities and examples for the yum package manager. It includes utilities by different authors that make yum easier and more powerful to use. These tools include: debuginfo-install, package-cleanup, repoclosure, repodiff, repo-graph, repomanage, repoquery, repo-rss, reposync, repotrack, verifytree, yum-builddep, yum-complete-transaction, yumdownloader, yum-debug-dump and yum-groups-manager.

	yum -y install yum-utils.noarch

Now use the yumdownloader command which is a program for downloading RPMs from Yum repositories. Type the following command to download httpd rpm file:

	yumdownloader httpd

Sample outputs:

	Loaded plugins: rhnplugin
	httpd-2.2.3-31.el5_4.2.x86_64.rpm                        | 1.2 MB     00:00
	How Do I Extract Downloaded RPM File?

Type the command as follows:

	rpm2cpio httpd-2.2.3-31.el5_4.2.x86_64.rpm | cpio -idmv
	
