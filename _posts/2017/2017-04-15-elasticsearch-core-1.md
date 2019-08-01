---
layout: post
category : MySQL
tags : [MySQL, Xcode]
title: Xcode 编译调试 MySQL
---
{% include JB/setup %}
1、从 MySQL 官方网站下载 MySQL 源码包

![Alt text](/assets/images/2015/02/xcode1.png)

2、生成 Xcode 工程文件，需要点时间

![Alt text](/assets/images/2015/02/xcode2.png)

3、工程文件生成好后在 Xcode 中打开该工程

![Alt text](/assets/images/2015/02/xcode3.png)

![Alt text](/assets/images/2015/02/xcode4.png)

4、刚打开工程的时候 Xcode 会索引整个工程，需要点时间

![Alt text](/assets/images/2015/02/xcode5.png)

5、Schema 切换到 install 开始编译安装，需要一点时间

![Alt text](/assets/images/2015/02/xcode6.png)

6、Xcode 编译安装完成后，可以在文件系统看到刚刚编译安装的 MySQL

![Alt text](/assets/images/2015/02/xcode7.png)

7、初始化 MySQL 系统库，安装过 MySQL 的同学都知道

![Alt text](/assets/images/2015/02/xcode8.png)

![Alt text](/assets/images/2015/02/xcode9.png)

8、Schema 切换到 mysqld 在 Xcode 中运行 MySQL 服务端，也可以运行其他的，如：mysqldump

![Alt text](/assets/images/2015/02/xcode10.png)

9、在 Terminal 里面可以看到运行好了的 MySQL 了，也可以登入尝试下，默认用户都是没有密码的

![Alt text](/assets/images/2015/02/xcode11.png)

10、编辑 mysqld 的 schema，调整运行参数方便针对性的调试特殊场景

![Alt text](/assets/images/2015/02/xcode12.png)

![Alt text](/assets/images/2015/02/xcode13.png)
