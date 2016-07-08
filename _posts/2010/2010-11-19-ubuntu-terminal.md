---
layout: post
category : Ubuntu
tags : [Ubuntu]
title: ubuntu启动默认命令行界面
---
{% include JB/setup %}

Ubuntu里面虚拟N台Ubuntu出来做MySQL Cluster试验，为了节约内存让Ubuntu默认进入命令行界面

**方法1：**

    chaos@chaos-Virtual1:~$ sudo vim /etc/X11/default-display-manager
    [sudo] password for chaos:

改成如下：

    #/usr/sbin/gdm
    false

这一方法有人会一直停留在加载系统的滚动条界面，我设置后OK。

**方法2：**

    chaos@chaos-Virtual1:~$ sudo vim /boot/grub/grub.cfg
    [sudo] password for chaos:

查找menuentry 来到启动顺序设置的位置，以下为默认第一个启动配置

    ### BEGIN /etc/grub.d/10_linux ###
    menuentry 'Ubuntu, with Linux 2.6.32-25-generic' --class ubuntu --class gnu-linux --class gnu --class os {
        recordfail
        insmod ext2
        set root='(hd0,1)'
        search --no-floppy --fs-uuid --set 9486da55-7376-4909-b125-3e0bef81209c
        linux   /boot/vmlinuz-2.6.32-25-generic root=UUID=9486da55-7376-4909-b125-3e0bef81209c ro   quiet splash
        initrd  /boot/initrd.img-2.6.32-25-generic
    }

可以直接把上面的参数中的quiet splash改为text即可进入默认进入命令行界面 也可以新建一个命令行模式（command mode），并把它放在第一的位置（这样默认就使用命令行模式了），这样以后想要进入X模式只要开机按Shift键/Esc键？进入Grub选择第二个就可以进入X了 如下：

    menuentry 'Ubuntu, with Linux 2.6.32-25-generic(command mode)' --class ubuntu --class gnu-linux --class gnu --class os {
        recordfail
        insmod ext2
        set root='(hd0,1)'
        search --no-floppy --fs-uuid --set 9486da55-7376-4909-b125-3e0bef81209c
        linux   /boot/vmlinuz-2.6.32-25-generic root=UUID=9486da55-7376-4909-b125-3e0bef81209c ro   text
        initrd  /boot/initrd.img-2.6.32-25-generic
    }

**VirtualBox复制虚拟机注意事项：** VirtualBox复制虚拟机不能仅仅是复制.vdi文件，因为每个.vdi文件都有自己的UDDI，如果只是复制.vdi文件添加的时候会提示UDDI重复，方法是使用VirtualBox的虚拟机管理工具克隆

    chaos@Durden:~$ cd .VirtualBox/
    chaos@Durden:~/.VirtualBox$ ls
    compreg.dat  HardDisks  Machines  VirtualBox.xml  VirtualBox.xml-prev  xpti.dat
    chaos@Durden:~/.VirtualBox$ cd HardDisks/
    chaos@Durden:~/.VirtualBox/HardDisks$ VBoxManage clonevdi Ubuntu1.vdi Ubuntu2.vdi
    Oracle VM VirtualBox Command Line Management Interface Version 3.2.10
    (C) 2005-2010 Oracle Corporation
    All rights reserved.

    0%...10%...20%...30%...40%...50%...60%...70%...80%...90%...100%
    Clone hard disk created in format 'VDI'. UUID: f076f3f5-08ec-4b85-bfb6-d91c50ebfe18
    chaos@Durden:~/.VirtualBox/HardDisks$

克隆完之后添加虚拟机选择使用这个.vid文件就好了。