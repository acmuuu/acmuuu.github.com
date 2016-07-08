---
layout: post
category : Linux
tags : [iptables]
title: 怎么杀掉僵尸进程
---
{% include JB/setup %}

**来自[http://kenno.wordpress.com/2007/04/04/how-to-kill-defunct-process/](http://kenno.wordpress.com/2007/04/04/how-to-kill-defunct-process/)**

Defunct processes are corrupted processes that can no longer communicate between the parent and child one. Sometimes, they become “zombies” and remain in your system until you reboot your machine. You can try to apply “kill -9″ command, but most of the time you’ll be out of luck.

In order to kill theses defunct processes, you have two choices:

    1. Reboot your computer
    2. Continue reading…

First, let’s find out if the system contains defunct process:

    $ ps -A | grep defunct

Assume your output is as the following:
    
    8328  ? 00:00:00 mono <defunct>
    8522  ? 00:00:01 mono <defunct>
    13132 ? 00:00:00 mono <defunct>
    25822 ? 00:00:00 ruby <defunct>
    28383 ? 00:00:00 ruby <defunct>
    18803 ? 00:00:00 ruby <defunct>
    
This means you have 6 defunct processes: 3 of mono, and 3 of ruby. These processes exists because of poorly written application or unusual action taken by the user, in my case there must be some serious problem with the program I wrote in mono C# 

Now, let’s find the ID of the process and its parent’s:

    $ ps -ef | grep defunct | more

The output from the above command:
    
    UID   PID   PPID ...
    ---------------------------------------------------------------
    kenno 8328  6757 0 Mar22 ? 00:00:00 [mono] <defunct>
    kenno 8522  6757 0 Mar22 ? 00:00:01 [mono] <defunct>
    kenno 13132 6757 0 Mar23 ? 00:00:00 [mono] <defunct>
    kenno 25822 25808 0 Mar27 ? 00:00:00 [ruby] <defunct>
    kenno 28383 28366 0 Mar27 ? 00:00:00 [ruby] <defunct>
    kenno 18803 18320 0 Apr02 ? 00:00:00 [ruby] <defunct>
    
UID: User ID

PID: Process ID

PPID: Parent Process ID

If you try to kill the process with ID 8328 with the command “kill -9 8328″, it may not work. To properly kill it, you need to execute the kill command on its parent whose ID is 6757 ($kill -9 6757). Continue applying the kill command on all the PPID, and verify your result ($ps -A | grep defunct).

If the previous command display no result, well done, otherwise you may need to reboot your system.

**Source:**

[http://wagoneers.com/UNIX/KILL/Kill.html](http://wagoneers.com/UNIX/KILL/Kill.html)

[http://www.cts.wustl.edu/~allen/kill-defunct-process.html](http://www.cts.wustl.edu/~allen/kill-defunct-process.html)
