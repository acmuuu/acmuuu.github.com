---
layout: post
category : Linux
tags : [Vim]
title: vim或vi中保存readonly文件
---
{% include JB/setup %}
当我们使用vim或vi编辑类似于httpd.conf或lighttpd.conf或named.conf这样的文件的时候总是会遇到权限问题不能保存，原因是所有的配置文件的权限只属于root。

那么除了新建一个临时文件如：/tmp/httpd.conf编辑好之后替换掉原来的文件如：mv /tmp/httpd.conf /etc/httpd.conf来达到修改配置文件的目的？怎样直接以root权限直接vim或vi这些文件？

方法是：结合sudo（请确保你的账户有使用sudo权限）和tee两个命令来实现。而不用新建一个临时文件之后再覆盖。

1.以普通用户打开文件并编辑

    vi /etc/apache2/conf.d/mediawiki.conf

2.以root权限保存文件

    \:w !sudo tee %

解释如下：

    :w - Write a file.
    !sudo - Call shell sudo command.
    tee - The output of write (vim :w) command redirected using tee. The % is nothing but current file name i.e. /etc/apache2/conf.d/mediawiki.conf. In other words tee command is run as root and it takes standard input and write it to a file represented by %. However, this will prompt to reload file again (hit L to load changes in vim itself):

添加用户的sudo权限方法入下：

    进入超级用户模式。也就是输入"su -",系统会让你输入超级用户密码，输入密码后就进入了超级用户模式。（当然，你也可以直接用root用）
    添加文件的写权限。也就是输入命 令"chmod u+w /etc/sudoers"。
    编辑/etc/sudoers文件。也就是输入命令"vim /etc/sudoers",输入"i"进入编辑模式，找到这一 行："root ALL=(ALL) ALL"在起下面添加"xxx ALL=(ALL) ALL"(这里的xxx是你的用户名)，然后保存（就是先按一 下Esc键，然后输入":wq"）退出。
    撤销文件的写 权限。也就是输入命令"chmod u-w /etc/sudoers"。

如果在.vimrc中加入以下几行就可以一劳永逸了

    if has(“unix”)
        command -nargs=? Swrite :w !sudo tee %
    endif

再就是直接以root来编辑这个文件吧

    sudo vi /etc/apache2/conf.d/mediawiki.conf
