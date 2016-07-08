---
layout: post
category : Linux
tags : [Linux, IO]
title: IO调度器
---
{% include JB/setup %}
**IO调度器**

IO调度器的总体目标是希望让磁头能够总是往一个方向移动,移动到底了再往反方向走,这恰恰就是现实生活中的电梯模型,所以IO调度器也被叫做电梯.(elevator)而相应的算法也就被叫做电梯算法.而Linux中IO调度的电梯算法有好几种,一个叫做as(Anticipatory),一个叫做cfq(Complete Fairness Queueing),一个叫做deadline,还有一个叫做noop(No Operation).具体使用哪种算法我们可以在启动的时候通过内核参数elevator来指定.

另一方面我们也可以单独的为某个设备指定它所采用的IO调度算法,这就通过修改在/sys/block/sda/queue/目录下面的scheduler文件.比如我们可以先看一下我的这块硬盘:

    [root@localhost ~]# cat /sys/block/sda/queue/scheduler
    noop anticipatory deadline [cfq]

可以看到我们这里采用的是cfq.


**Linux IO调度器相关算法介绍**

IO调度器（IO Scheduler）是操作系统用来决定块设备上IO操作提交顺序的方法。存在的目的有两个，一是提高IO吞吐量，二是降低IO响应时间。然而IO吞吐量和IO响应时间往往是矛盾的，为了尽量平衡这两者，IO调度器提供了多种调度算法来适应不同的IO请求场景。其中，对数据库这种随机读写的场景最有利的算法是DEANLINE。接着我们按照从简单到复杂的顺序，迅速扫一下Linux 2.6内核提供的几种IO调度算法。

**1、NOOP**

NOOP算法的全写为No Operation。该算法实现了最最简单的FIFO队列，所有IO请求大致按照先来后到的顺序进行操作。之所以说“大致”，原因是NOOP在FIFO的基础上还做了相邻IO请求的合并，并不是完完全全按照先进先出的规则满足IO请求。

假设有如下的io请求序列：

100，500，101，10，56，1000

NOOP将会按照如下顺序满足：

100(101)，500，10，56，1000

**2、CFQ**

CFQ算法的全写为Completely Fair Queuing。该算法的特点是按照IO请求的地址进行排序，而不是按照先来后到的顺序来进行响应。

假设有如下的io请求序列：

100，500，101，10，56，1000

CFQ将会按照如下顺序满足：

100，101，500，1000，10，56

在传统的SAS盘上，磁盘寻道花去了绝大多数的IO响应时间。CFQ的出发点是对IO地址进行排序，以尽量少的磁盘旋转次数来满足尽可能多的IO请求。在CFQ算法下，SAS盘的吞吐量大大提高了。但是相比于NOOP的缺点是，先来的IO请求并不一定能被满足，可能会出现饿死的情况。

**3、DEADLINE**

DEADLINE在CFQ的基础上，解决了IO请求饿死的极端情况。除了CFQ本身具有的IO排序队列之外，DEADLINE额外分别为读IO和写IO提供了FIFO队列。读FIFO队列的最大等待时间为500ms，写FIFO队列的最大等待时间为5s。FIFO队列内的IO请求优先级要比CFQ队列中的高，，而读FIFO队列的优先级又比写FIFO队列的优先级高。优先级可以表示如下：

FIFO(Read) > FIFO(Write) > CFQ

**4、ANTICIPATORY**

CFQ和DEADLINE考虑的焦点在于满足零散IO请求上。对于连续的IO请求，比如顺序读，并没有做优化。为了满足随机IO和顺序IO混合的场景，Linux还支持ANTICIPATORY调度算法。ANTICIPATORY的在DEADLINE的基础上，为每个读IO都设置了6ms的等待时间窗口。如果在这6ms内OS收到了相邻位置的读IO请求，就可以立即满足。

IO调度器算法的选择，既取决于硬件特征，也取决于应用场景。

在传统的SAS盘上，CFQ、DEADLINE、ANTICIPATORY都是不错的选择；对于专属的数据库服务器，DEADLINE的吞吐量和响应时间都表现良好。然而在新兴的固态硬盘比如SSD、Fusion IO上，最简单的NOOP反而可能是最好的算法，因为其他三个算法的优化是基于缩短寻道时间的，而固态硬盘没有所谓的寻道时间且IO响应时间非常短。

查看和修改IO调度器的算法非常简单。假设我们要对sda进行操作，如下所示：

    cat /sys/block/sda/queue/scheduler
    echo “cfq” > /sys/block/sda/queue/scheduler

来自：[http://www.realzyy.com/?p=984](http://www.realzyy.com/?p=984)