---
layout: post
category : Linux
tags : [Linux, Error]
title: Redhat中出现”This system is not registered with RHN”的解决方案
---
{% include JB/setup %}
Redhat中出现”This system is not registered with RHN”的原因是你的Redhat没注册，所以无法下载软件包，替代方案可以使用CentOS源。

**1.卸载rhel的默认安装的yum包**

查看yum包

    rpm -qa|grep yum

卸载

    rpm -qa|grep yum|xargs rpm -e --nodeps

**2.下载新的yum包**

32位

    wget http://centos.ustc.edu.cn/centos/5/os/i386/CentOS/yum-3.2.22-26.el5.centos.noarch.rpm
    wget http://centos.ustc.edu.cn/centos/5/os/i386/CentOS/yum-fastestmirror-1.1.16-14.el5.centos.1.noarch.rpm
    wget http://centos.ustc.edu.cn/centos/5/os/i386/CentOS/yum-metadata-parser-1.1.2-3.el5.centos.i386.rpm

64位

    wget http://centos.ustc.edu.cn/centos/5/os/x86_64/CentOS/yum-3.2.22-39.el5.centos.noarch.rpm
    wget http://centos.ustc.edu.cn/centos/5/os/x86_64/CentOS/yum-fastestmirror-1.1.16-21.el5.centos.noarch.rpm
    wget http://centos.ustc.edu.cn/centos/5/os/x86_64/CentOS/yum-metadata-parser-1.1.2-3.el5.centos.x86_64.rpm

并且安装

    rpm -ivh yum-*

注意：yum和yum-fastestmirror相互依赖，所以同时安装即可。

**3.下载yum的配置源**

    wget http://docs.linuxtone.org/soft/lemp/CentOS-Base.repo

移动到 /etc/yum.repos.d/ 目录下面

    [base]
    name=CentOS-5 - Base
    baseurl=http://centos.ustc.edu.cn/centos/5/os/$basearch/
    gpgcheck=1
    gpgkey=http://mirror.centos.org/centos/RPM-GPG-KEY-CentOS-5

    #released updates
    [update]
    name=CentOS-5 - Updates
    baseurl=http://centos.ustc.edu.cn/centos/5/updates/$basearch/
    gpgcheck=1
    gpgkey=http://mirror.centos.org/centos/RPM-GPG-KEY-CentOS-5

    #packages used/produced in the build but not released
    [addons]
    name=CentOS-5 - Addons
    baseurl=http://centos.ustc.edu.cn/centos/5/addons/$basearch/
    gpgcheck=1
    gpgkey=http://mirror.centos.org/centos/RPM-GPG-KEY-CentOS-5
    #additional packages that may be useful
    [extras]
    name=CentOS-5 - Extras
    baseurl=http://centos.ustc.edu.cn/centos/5/extras/$basearch/
    gpgcheck=1
    gpgkey=http://mirror.centos.org/centos/RPM-GPG-KEY-CentOS-5

    #additional packages that extend functionality of existing packages
    [centosplus]
    name=CentOS-5 - Plus
    baseurl=http://centos.ustc.edu.cn/centos/5/centosplus/$basearch/
    gpgcheck=1
    enabled=0
    gpgkey=http://mirror.centos.org/centos/RPM-GPG-KEY-CentOS-5

    #contrib - packages by Centos Users
    [contrib]
    name=CentOS-5 - Contrib
    baseurl=http://centos.ustc.edu.cn/centos/5/contrib/$basearch/
    gpgcheck=1
    enabled=0
    gpgkey=http://mirror.centos.org/centos/RPM-GPG-KEY-CentOS-5

    #packages in testing
    [testing]
    name=CentOS-5 - Testing
    baseurl=http://centos.ustc.edu.cn/centos/5/testing/$basearch/
    gpgcheck=1
    enabled=0
    gpgkey=http://mirror.centos.org/centos/RPM-GPG-KEY-CentOS-5

**4.生成缓存**

    yum makecache

