---
layout: post
category : Linux
tags : [Memory, Linux]
title: Linux下程序的内存占用
---
{% include JB/setup %}

**On measuring memory usage [http://blogs.kde.org/node/1445](http://blogs.kde.org/node/1445)**

Oh boy. Gwenview uses 83% more memory than Kuickshow (http://kde-apps.org/content/show.php?content=9847 - the last comment as of now). BTW I especially like the "83%" part - it's just one case and the measurement is imprecise, but it can't be "about 80%" or "almost double". Reminds me of all those "hair 74% stronger" ads. Anyway.

It really annoys me that there's no good tool for measuring memory usage on Linux. There are tools, like 'top', but they often cause more harm than good - most people don't even know what the fields really mean and only few people can interpret them correctly. Mind you, even I'm not sure I can, and in fact I sometimes doubt such person even exists. The problem is, even intepreting the numbers may not give the answer. Measuring memory usage on Linux is voodoo magic.

Let's have a look at this Gwenview vs Kuickshow case, first let's measure their memory usage after startup and then the memory usage (increase) when showing a 3000x2000 image. Startup memory usage will be measured when showing an empty directory, memory usage when showing the image will be measured in a directory containing only that image (that's in order to prevent both Gwenview and Kuickshow from preloading the next image in the directory and skewing the results - there are so many ways of getting benchmarks wrong that people should be allowed to do that only with a special permission).

So, startup memory usage: 'top' gives these numbers (VIRT/RES/SHR) : 31.7M/18M/15M for Gwenview and 30.6M/17M/14M for Kuickshow. Big difference, huh? But these numbers alone mean nothing if you can't explain them. So let's try that.

VIRT is virtual memory usage, it can probably be best described as the app's used address space - every library the app uses, every data it creates, everything is included here. If the app requests 100M memory from the kernel but actually uses only 1M, VIRT will still increase by 100M.

RES is resident memory usage, i.e. what's actually in the memory. In a way it could be probably used for measuring real memory usage of the app - if the app requests 100M memory from the kernel but actually uses only 1M, this should increase only by 1M. There are only two small problems, a) RES doesn't include memory that's swapped out (and no, the SWAP field in 'top' is not usable, it's completely bogus), b) some of that memory may be shared.

SHR is shared memory. Potentionally shared memory. I.e. memory that may be used not only by this particular app but also by some else. And actually it seems to be the shared part of RES - SHR goes down if the app will be swapped out, at least with recent kernels. I actually don't think it used to do that before, I used to measure unshared memory usage simply as VIRT-SHR and it seemed to give usable numbers. If it used to be always like this then I guess I must have produced a couple of bogus benchmarks in the past. Oh well.

It seems using the DATA field does the job of saying how much total unshared memory the app is using (if it's not visible it can be added using the 'f' key).

That gives 2.6M for Gwenview vs 1.75M Kuickshow. I'm not sure why it's so much, some of that is fontconfig and XIM, some of it may be perhaps relocations. The difference is 0.85M, out of which about 0.28M is some lameness in the XCF (Gimp image) loader, who knows what the rest is and where it comes from, I don't feel like analysing that now. Moreover from Valgrind's Massif output for Gwenview it looks like it should be only 2.2M and not 2.6M, which, also without the XCF thing reduces the difference to about 0.2M and I really don't feel like checking if it's only Gwenview using XMLGUI and Kuickshow not or also something else. Exercise for the reader.

After viewing the image the numbers go up to (VIRT/RES/DATA) : 60M/44M/30M for Gwenview and 48.4M/35M/19M for Kuickshow. That's about 18M increase for Kuickshow, which is simply 3000x2000x3, i.e. image dimensions and 24bpp (RGB tripplet), so it's just the image data. For Gwenview the increase is about 27M for VIRT and DATA, 26M for RES. Gwenview uses QImage for storing image data, which stores truecolor images always as 32bpp, that's 3000x2000x4=24M.

The 1M difference between VIRT/DATA and RES is actually caused by threads. Gwenview uses a thread to load the thumbnail, this 1M is the stack space for the additional thread (although it's presented as data). Since almost none of this reserved space is actually used, RES doesn't grow by this 1M but VIRT does. It also shows that DATA grows too. That means the DATA field has its problems too and maybe the 2.6M vs 1.75M data comparison is a bit bogus too. BTW, I have no idea why this 1M is not freed when the thread finishes, maybe bug, and what's even more interesting is that on another machine it's not 1M but 100M. Now that's something that makes Gwenview look memory hungry.

So, DATA is probably not really useful. Now onto VIRT. I don't use KIPI plugins (plugins for image applications). After installing the kipi-plugins package, the numbers for VIRT/RES/DATA change for Gwenview to 50M/30M/5M (that's right after startup, so compare this to 31.7M/18M/2.6M). Just to quickly explain the DATA change, about 1M of it is caused by libgphoto2 and nvidia libraries, no idea why, probably something similarly lame to the XCF loader, the rest of the difference is probably mainly initialization of the plugins (which is lame too, no idea why it's so much, not feeling like bothering to find out, but I guess Aurelien should reconsider my Gwenview patch for caching, wrapping and loading KIPI plugins on demand). Back to VIRT. The difference there is almost 20M. The gallery plugin needs libkhtml, which is about 4M. The slideshow plugin links to openGL libraries, which here means about 8M. The rest is just the code of the plugins.

Now, which numbers to use and how? DATA is unshared memory, so it's only memory that exclusively belongs to this instance of the application. All that memory is really only used by it. However, as the stack case shows, DATA is the virtual unshared data size, so it's not only really used memory., Moreover memory is just not the unshared data. All shared data is actually just potentionally shared. If there's only one Gwenview instance and it's the only application using KIPI plugins, then all the memory used by KIPI plugins, even the memory used for the code for it, not matter how theoretically shared, is its and only its. So should VIRT be the number used? That number includes also memory used by all KDE libraries, which are definitely shared and already loaded anyway. The same very likely applies to libkhtml. And also, again the stack case, VIRT includes even memory that's not really used. So maybe RES? If you avoid swap, this number should give about the amount memory that's really needed and used at the moment. Except that part of it is again shared, and "memory used at the moment" feels a bit fishy - the kernel may e.g. discard memory used by a shared library because it can load it anytime again from the disk.

Totally confused by now? Good ... maybe after reading this you'll think twice before you decide to look at 'top' output and provide some "benchmarks" on how some application or even KDE in general is bloated and needs a lot of memory. Numbers mean nothing if you can't explain them. If somebody shows you a memory benchmark based on 'top' or 'ps' and can't explain the numbers, you can just as well ignore it.

PS: This doesn't mean it's impossible to get some at least somewhat useful numbers and work on improving memory usage. Just know what you're measuring and think twice (or even better, more than just twice). In fact using Valgrind's Massif or kdesdk/kmtrace is not that difficult and it can give good pointers. After all, they both just measure malloc() memory usage. That's just boring compared to all this.

PPS: Just in case you wonder how I know things like 8M shared memory is taken by openGL libraries, 1M unshared memory is allocated by libgphoto2 and nvidia libraries or 1M is taken by thread stack space, it's the 'pmap' tool. Quite handy. It wasn't just it though, my brain and crystall ball were involved too.

PPPS: If somebody actually knows some good way how to measure memory usage properly and get some useful numbers, I'd like to know. This is the best I know.

 

**搞明白Linux下程序的内存占用 [http://blog.cathayan.org/item/1261](http://blog.cathayan.org/item/1261)**

其实在认真阅读了这篇名为“计算内存使用”的文章之后，还是处于半迷糊状态。这位作者就说Linux下面没有特别好的显示内存占用的工具，虽然有top和free，但都说得不清楚，就跟巫毒教的魔术似的。

比如top这个工具，它会显示3种数据，作者分别解释如下：

**VIRT：virtual memory usage。**Virtual这个词很神，一般解释是：virtual adj.虚的, 实质的, [物]有效的, 事实上的。到底是虚的还是实的？让Google给Define之后，将就明白一点，就是这东西还是非物质的，但是有效果的，不发生在真实世界的，发生在软件世界的等等。这个内存使用就是一个应用占有的地址空间，只是要应用程序要求的，就全算在这里，而不管它真的用了没有。写程序怕出错，又不在乎占用的时候，多开点内存也是很正常的。

**RES：resident memory usage。**常驻内存。这个值就是该应用程序真的使用的内存，但还有两个小问题，一是有些东西可能放在交换盘上了（SWAP），二是有些内存可能是共享的。

**SHR：shared memory。**共享内存。就是说这一块内存空间有可能也被其他应用程序使用着；而Virt － Shr似乎就是这个程序所要求的并且没有共享的内存空间。

**DATA：数据占用的内存。**如果top没有显示，按f键可以显示出来。这一块是真正的该程序要求的数据空间，是真正在运行中要使用的。

所以DATA的含义比较确定，甚至可以用程序读取的数据量计算出来；SHR是一个潜在的可能会被共享的数字，如果只开一个程序，也没有别人共同使用它；VIRT里面的可能性更多，比如它可能计算了被许多X的库所共享的内存；RES应该是比较准确的，但不含有交换出去的空间；但基本可以说RES是程序当前使用的内存量。

将就明白这几点意思也算是收获吧，对这么高深的东西没力气深究啦。最近感觉到Firefox在Linux下面比在Win上还好用，表现就是僵死的机会少且僵住的时间短，一个页面上有大量图片时表现也要比Win上面好，也许表明Linux在内存管理或是进程调度上有什么高明之处？

    top - 11:42:54 up 725 days, 21:11,  1 user,  load average: 0.00, 0.00, 0.00
    Tasks: 155 total,   1 running, 154 sleeping,   0 stopped,   0 zombie
    Cpu(s):  0.0%us,  0.0%sy,  0.0%ni,100.0%id,  0.0%wa,  0.0%hi,  0.0%si,  0.0%st
    Mem:  32967144k total, 32401968k used,   565176k free,   455108k buffers
    Swap:  8385920k total,  1582524k used,  6803396k free, 17857080k cached

      PID USER      PR  NI  VIRT  RES  SHR S %CPU %MEM    TIME+  DATA COMMAND
    16157 mysql     15   0 4462m 646m 3516 S  0.0  2.0  99:24.54 4.3g mysqld
    17471 mysql     15   0 4317m 880m 4720 S  0.0  2.7   3296:22 4.2g mysqld
    18725 mysql     15   0 4294m 1.5g 4612 S  0.0  4.7 932:33.69 4.2g mysqld
    15966 mysql     15   0 4289m 661m 4108 S  0.0  2.1  42:03.90 4.2g mysqld
    17060 mysql     15   0 4236m 684m 4040 S  0.0  2.1   1339:51 4.1g mysqld
    14964 mysql     15   0 4230m 669m 4812 S  0.0  2.1 121:13.97 4.1g mysqld
    18098 mysql     15   0 4229m 728m 4548 S  0.0  2.3 153:07.72 4.1g mysqld
    18516 mysql     15   0 4223m 690m 4288 S  0.0  2.1 210:04.75 4.1g mysqld
    30564 mysql     18   0 4208m 642m 4196 S  0.0  2.0  28:46.86 4.1g mysqld
    18307 mysql     15   0 4206m 642m 4092 S  0.0  2.0  32:31.99 4.1g mysqld
    16377 mysql     15   0 4206m 1.0g 4400 S  0.0  3.2 655:45.23 4.1g mysqld
    17889 mysql     15   0 4206m 639m 3864 S  0.0  2.0  33:49.70 4.1g mysqld
    15757 mysql     15   0 4206m 639m 3824 S  0.0  2.0  31:13.74 4.1g mysqld
    17256 mysql     18   0 4206m 638m 3656 S  0.0  2.0  41:32.67 4.1g mysqld
    16765 mysql     18   0 4206m 638m 3420 S  0.0  2.0  32:25.39 4.1g mysqld
     3043 root      11  -4 92864  892  588 S  0.0  0.0   3:54.66  74m auditd
     3045 root       7  -8 81804  984  616 S  0.0  0.0   1:58.81  74m audispd
     3176 root      24   0  103m 1492 1128 S  0.0  0.0   0:04.99  73m automount
     3353 root      34  19  265m  29m 2064 S  0.0  0.1  28:42.54  27m yum-updatesd
     1258 oracle    16   0 72980 9096 6260 S  0.0  0.0   0:51.47  22m tnslsnr
     3067 root      15   0 28244  16m  500 S  0.0  0.1   0:01.14  15m restorecond
     3129 dbus      16   0 31628 1212  868 S  0.0  0.0  10:53.82  10m dbus-daemon
      960 oracle    15   0 9822m 823m 779m S  0.0  2.6   0:12.54 4688 oracle
      954 oracle    15   0 9775m  32m  28m S  0.0  0.1   0:01.91 3412 oracle
      978 oracle    18   0 9775m  15m  11m S  0.0  0.0   0:00.04 3412 oracle
      972 oracle    15   0 9776m 118m 111m S  0.0  0.4   0:11.68 2484 oracle
    17954 oracle    15   0 9776m  76m  71m S  0.0  0.2   0:00.53 2472 oracle
     3323 haldaemo  15   0 30880 3952 1572 S  0.0  0.0   0:06.68 2356 hald
      976 oracle    18   0 9774m  16m  11m S  0.0  0.0   0:00.04 2352 oracle
      966 oracle    15   0 9778m 239m 232m S  0.0  0.7   0:11.27 2316 oracle
      970 oracle    15   0 9775m  33m  28m S  0.0  0.1   0:01.14 2312 oracle
     1027 oracle    15   0 9775m  33m  28m S  0.0  0.1   0:00.14 2240 oracle
      964 oracle    16   0 9775m  85m  80m S  0.0  0.3   1:14.97 2232 oracle
      968 oracle    15   0 9774m  25m  21m S  0.0  0.1   0:00.06 2228 oracle
      984 oracle    15   0 9774m  20m  16m S  0.0  0.1   0:00.06 2224 oracle
      956 oracle    15   0 9774m  15m  12m S  0.0  0.0   0:00.38 2216 oracle
      958 oracle    15   0 9774m 393m 389m S  0.0  1.2   0:02.14 2216 oracle
      962 oracle    15   0 9789m  47m  43m S  0.0  0.1   0:44.70 2216 oracle
      974 oracle    15   0 9774m  23m  19m S  0.0  0.1   0:04.88 2216 oracle
     1996 oracle    15   0 9774m  16m  13m S  0.0  0.1   0:00.04 2216 oracle
    26306 root      15   0 66940 2324  784 S  0.0  0.0   4:32.24 1652 sendmail
    26315 smmsp     18   0 57692 1768  620 S  0.0  0.0   0:00.67 1516 sendmail
      902 root      21  -4 13636 1892  484 S  0.0  0.0   0:00.51 1472 udevd
     3277 root      18   0 19624  472  316 S  0.0  0.0   0:00.01 1200 atd
     3356 root      34  19 13700 1880  968 S  0.0  0.0   3:31.85 1056 gam_server
    15479 root      15   0 74804 1204  628 S  0.0  0.0   0:03.38  992 crond
     5805 ntp       15   0 19184 4880 3780 S  0.0  0.0   0:00.51  864 ntpd
     1470 root      15   0 88080 3340 2616 S  0.0  0.0   0:00.97  688 sshd
     7680 root      15   0 88080 3324 2596 S  0.0  0.0   0:00.12  688 sshd
    11292 root      15   0 60680 1192  640 S  0.0  0.0   1:51.24  608 sshd