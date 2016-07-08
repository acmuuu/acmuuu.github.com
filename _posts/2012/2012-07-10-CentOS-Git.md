---
layout: post
category : CentOS
tags : [Linux, CentOS, Git]
title: CentOS 安装 Git
---
{% include JB/setup %}
CentOS 默认的 yum 源中没有 Git 以下是编译安装。

确保已安装了依赖的包

    sudo yum install curl curl-devel zlib-devel openssl-devel perl cpio expat-devel gettext-devel

安装最新的 Git

    $ wget http://www.codemonkey.org.uk/projects/git-snapshots/git/git-latest.tar.gz
    $ tar xzvf git-latest.tar.gz
    $ cd git-{date}
    $ autoconf
    $ ./configure
    $ make
    $ sudo make install

检查版本

    $ git --version
    git version 1.7.3.GIT
