---
layout: post
category : Ubuntu
tags : [Ubuntu, Linux]
title: 安装fcitx
---
{% include JB/setup %}

安装ibus的先卸载

    sudo apt-get remove ibus

安装fcitx

    sudo apt-get install fcitx
    im-switch -s fcitx -z default  #设为默认输入法，一般不需要，除非系统有多个输入法

启动fcitx

    fcitx -d

如果提示

    Please set XMODIFIERS...

编辑/etc/environment加入以下三行，如果没有可以新建

    LC_ALL="zh_CN.UTF-8"    #加入这两行貌似会引起UBUNTU更新出错，所以装完可以删掉
    LANGUAGE="zh_CN.UTF-8"  #加入这两行貌似会引起UBUNTU更新出错，所以装完可以删掉
    XMODIFIERS="@im=fcitx"
    #
    #添加这两行之后系统更新会出现下面的报错
    #E: install-info: subprocess installed post-installation script returned error exit status 127
    #报错的内容是不能识别LC_ALL和LANGUAGE，所以删掉了，更新成功
    #
    # LC_CTYPE=zh_CN.UTF-8 或者是这样行造成的，用于在英文界面下使用中文输入法

如果出现如下错误，比如在使用虚拟键盘的时候

    FCITX -- Get Signal No.: 11

是因为：在安装新版本之前没有删除home目录下的.fcitx目录所导致。只有删除后重新安装才能继续使用。 解决办法：

    chaos@napoleonu:~$ cd ~/
    chaos@napoleonu:~$ rm -r .fcitx

之后再重新安装fcitx就OK了。

而如果一切OK但是输入的时候词组列表里面并不能正常显示中文（显示方块）我们要修改fcitx配置文件~/.fcitx/config

但是直接打开~/.fcitx/config有可能会出现乱码，原因是Ubuntu默认的编码方式是UTF-8格式，因此需要通过gbk方式来打开该文件

使用一下命令打开可以正常显示编辑（不要改变该文件的编码）

    sudo gedit --encoding gbk ~/.fcitx/config #最新版本是~/.config/fcitx并且配置文件是英文

修改“显示字体（中）”的参数

    [程序]
    显示字体(中)=*
    显示字体(英)=Courier New
    显示字体大小=12
    主窗口字体大小=9
    字体区域=zh_CN.UTF-8
    使用AA字体=1
    使用粗体=1
    使用托盘图标=1
    比如下面这样


    [程序]
    显示字体(中)=AR PL ShanHeiSun Uni
    显示字体(英)=Courier New
    显示字体大小=12
    主窗口字体大小=9
    字体区域=zh_CN.UTF-8
    使用AA字体=1
    使用粗体=1
    使用托盘图标=1
    在fcitx输入模式下，按Ctrl+5重新载入配置。或者注销再登录就OK了。
