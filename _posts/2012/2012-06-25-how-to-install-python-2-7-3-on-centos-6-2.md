---
layout: post
category : Python
tags : [Python]
title: 在CentOS 6.2上安装Python 2.7.3
---
{% include JB/setup %}
**来自：[http://toomuchdata.com/2012/06/25/how-to-install-python-2-7-3-on-centos-6-2/](http://toomuchdata.com/2012/06/25/how-to-install-python-2-7-3-on-centos-6-2/)**

CentOS 6.2 ships with Python 2.6.6 and depends on that specific version. Be careful not to replace it or bad things will happen. If you need access to a newer version of Python you must compile it yourself and install it side-by-side with the system version.

Here are the steps necessary to install Python 2.7.3. The procedure is exactly the same for installing Python 3.2.3, just make sure you use the command "python3.2 setup.py install" when you install distribute.

Execute all the commands below as root. Either log in as root temporarily or use sudo.

**Install development tools**

In order to compile Python you must first install the development tools:

    yum groupinstall "Development tools"

You also need a few extra libs installed before compiling Python or else you will run into problems later when trying to install various packages:

    yum install zlib-devel
    yum install bzip2-devel
    yum install openssl-devel
    yum install ncurses-devel

**Download, compile and install Python**

    wget http://www.python.org/ftp/python/2.7.3/Python-2.7.3.tar.bz2
    tar xf Python-2.7.3.tar.bz2
    cd Python-2.7.3
    ./configure --prefix=/usr/local
    make && make altinstall

It is important to use altinstall instead of install, otherwise you will end up with two different versions of Python in the filesystem both named python.

After running the commands above your newly installed Python 2.7.3 interpreter will be available as /usr/local/bin/python2.7 and the system version of Python 2.6.6 will be available as /usr/bin/python and /usr/bin/python2.6.

**Installing and configuring distribute (setuptools)**

After installing Python 2.7.3 you also need to install distribute (setuptools) so you can easily install new packages in the right location.

    wget http://pypi.python.org/packages/source/d/distribute/distribute-0.6.27.tar.gz
    tar xf distribute-0.6.27.tar.gz
    cd distribute-0.6.27
    python2.7 setup.py install

The commands above will generate the script /usr/local/bin/easy_install-2.7. Use this script to install packages for your new Python version:

    easy_install-2.7 virtualenv
    easy_install-2.7 MySQL-python
