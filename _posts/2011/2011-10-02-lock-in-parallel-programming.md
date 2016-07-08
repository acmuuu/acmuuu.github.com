---
layout: post
category : Parallel
tags : [Lock, Parallel]
title: 并行编程中的“锁”难题
---
{% include JB/setup %}
**来自：[http://www.parallellabs.com/2011/10/02/lock-in-parallel-programming/](http://www.parallellabs.com/2011/10/02/lock-in-parallel-programming/)**

在并行程序中，锁的使用会主要会引发两类难题：一类是诸如死锁、活锁等引起的多线程Bug；另一类是由锁竞争引起的性能瓶颈。本文将介绍并行编程中因为锁引发的这两类难题及其解决方案。

**1. 用锁来防止数据竞跑**

在进行并行编程时，我们常常需要使用锁来保护共享变量，以防止多个线程同时对该变量进行更新时产生数据竞跑（Data Race）。所谓数据竞跑，是指当两个（或多个）线程同时对某个共享变量进行操作，且这些操作中至少有一个是写操作时所造成的程序错误。例1中的两个线程可能同时执行“counter++”从而产生数据竞跑，造成counter最终值为1（而不是正确值2）。

**例1：**

    #include <pthread.h>
    int counter = 0;
    void *func(void *params)
    {
        counter++; //数据竞跑
    }
    void main()
    {
        pthread_t thread1, thread2;
        pthread_create(&thread1, 0, func, 0);
        pthread_create(&thread2, 0, func, 0);
        pthread_join(thread1, 0 );
        pthread_join(thread2, 0 );
    }

这是因为counter++本身是由三条汇编指令构成的（从主存中将counter的值读到寄存器中；对寄存器进行加1操作；将寄存器中的新值写回主存），所以例1中的两个线程可能按如下交错顺序执行，导致counter的最终值为1。

**例2：**

    load [%counter], rax; // 线程1从counter读取0到寄存器rax
    add rax, 1; // 线程1对寄存器rax进行加1
    load [%counter], rbx; // 线程2从counter读取0到寄存器rbx
    store rax [%counter]; // 线程1把1写入counter的主存地址
    add rbx, 1; // 线程2对寄存器rbx进行加1
    store rbx, [%counter]; // 线程2把1写入counter的主存地址

为了防止例1中的数据竞跑现象，我们可以使用锁来保证每个线程对counter++操作的独占访问（即保证该操作是原子的）。在例3的程序中，我们使用mutex锁将counter++操作放入临界区中，这样同一时刻只有获取锁的线程能访问该临界区，保证了counter++的原子性：即只有在线程1执行完counter++的三条指令之后线程2才能执行counter++操作，保证了counter的最终值必定为2。

**例3：**

    #include <pthread.h>
    int counter = 0;
    pthread_mutex_t mutex;
    void *func(void *params)
    {
        pthread_mutex_lock(&mutex);
        counter++; //处于临界区，不会产生数据竞跑
        pthread_mutex_unlock(&mutex);
    }
    void main()
    {
        pthread_t thread1, thread2;
        pthread_mutex_init(&mutex);
        pthread_create(&thread1, 0, func, 0);
        pthread_create(&thread2, 0, func, 0);
        pthread_join(thread1, 0 );
        pthread_join(thread2, 0 );
        pthread_mutex_destroy(&mutex);
    }

**2. 死锁和活锁**

然而，锁的使用非常容易导致多线程Bug，最常见的莫过于死锁和活锁。从原理上讲，死锁的产生是由于两个（或多个）线程在试图获取正被其他线程占有的资源时造成的线程停滞。在下例中，假设线程1在获取mutex_a锁之后正在尝试获取mutex_b锁，而线程2此时已经获取了mutex_b锁并正在尝试获取mutex_a锁，两个线程就会因为获取不到自己想要的资源、且自己正占有着对方想要的资源而停滞，从而产生死锁。

**例4：**

    // 线程 1                     
    void func1()                    
    {                       
        LOCK(&mutex_a);                      
        LOCK(&mutex_b);//线程1停滞在此         
        counter++;                       
        UNLOCK(&mutex_b);                     
        UNLOCK(&mutex_a);                    
    }                       
     
    // 线程 2
    void func2()
    {
        LOCK(&mutex_b);
        LOCK(&mutex_a);//线程2停滞在此
        counter++;
        UNLOCK(&mutex_a);
        UNLOCK(&mutex_b);
    }

例4中的死锁其实是最简单的情形，在实际的程序中，死锁往往发生在复杂的函数调用过程中。在下面这个例子中，线程1在func1()中获取了mutex_a锁，之后调用func_call1()并在其函数体中尝试获取mutex_b锁；与此同时线程2在func2()中获取了mutex_b锁之后再在func_call2()中尝试获取mutex_a锁从而造成死锁。可以想象，随着程序复杂度的增加，想要正确的检测出死锁会变得越来越困难。

**例5：**

    // 线程 1                     
    void func1()                    
    {                       
    LOCK(&mutex_a);                      
    ...                     
    func_call1();                
    UNLOCK(&mutex_a);                
    }                       
     
    func_call1()                    
    {                       
       LOCK(&mutex_b);               
       ...                       
       UNLOCK(&mutex_b);                 
       ...                       
    }                       
     
    // 线程 2
    void func2()
    {
        LOCK(&mutex_b);
        ...
        func_call2()
        UNLOCK(&mutex_b);
    }
     
    func_call2()
    {
        LOCK(&mutex_a);
        ...
        UNLOCK(&mutex_b);
        ...
    }

其实避免死锁的方法非常简单，其基本原则就是保证各个线程加锁操作的执行顺序是全局一致的。例如，如果上例中的线程1和线程2都是先对mutex_a加锁再对mutex_b进行加锁就不会产生死锁了。在实际的软件开发中，除了严格遵守相同加锁顺序的原则防止死锁之外，我们还可以使用RAII（Resource Acquisition Is Initialization，即“资源获取即初始化”）的手段来封装加锁解锁操作，从而帮助减少死锁的发生[1]。

除死锁外，多个线程的加锁、解锁操作还可能造成活锁。在下例中，程序员为了防止死锁的产生而做了如下处理：当线程1在获取了mutex_a锁之后再尝试获取mutex_b时，线程1通过调用一个非阻塞的加锁操作（类似pthread_mutex_trylock）来尝试进行获得mutex_b：如果线程1成功获得mutex_b，则trylock()加锁成功并返回true，如果失败则返回false。线程2也使用了类似的方法来保证不会出现死锁。不幸的是，这种方法虽然防止了死锁的产生，却可能造成活锁。例如，在线程1获得mutex_a锁之后尝试获取mutex_b失败，则线程1会释放mutex_a并进入下一次while循环；如果此时线程2在线程1进行TRYLOCK(&mutex_b)的同时执行TRYLOCK(&mutex_a)，那么线程2也会获取mutex_a失败，并接着释放mutex_b及进入下一次while循环；如此反复，两个线程都可能在较长时间内不停的进行“获得一把锁、尝试获取另一把锁失败、再解锁之前已获得的锁“的循环，从而产生活锁现象。当然，在实际情况中，因为多个线程之间调度的不确定性，最终必定会有一个线程能同时获得两个锁，从而结束活锁。尽管如此，活锁现象确实会产生不必要的性能延迟，所以需要大家格外注意。

**例6：**

    // 线程 1                     
    void func1()                    
    {                       
        int done = 0;                   
        while(!done) {               
            LOCK(&mutex_a);                      
            if (TRYLOCK(&mutex_b)) {               
                counter++;                   
                UNLOCK(&mutex_b);                        
                UNLOCK(&mutex_a);                        
                done = 1;                        
            }                          
            else {                     
                UNLOCK(&mutex_a);                   
            }                          
        }                        
    }                       
     
    // 线程 2
    void func2()
    {
        int done = 0;
        while(!done) {
            LOCK(&mutex_b);
            if (TRYLOCK(&mutex_a)) {
                counter++;
                UNLOCK(&mutex_a);
                UNLOCK(&mutex_b);
                done = 1; 
            }
            else {
                UNLOCK(&mutex_b);
            }
        }
    }

**3. 锁竞争性能瓶颈**

在多线程程序中锁竞争是最主要的性能瓶颈之一。在前面我们也提到过，通过使用锁来保护共享变量能防止数据竞跑，保证同一时刻只能有一个线程访问该临界区。但是我们也注意到，正是因为锁造成的对临界区的串行执行导致了并行程序的性能瓶颈。

(3.1)阿姆达尔法则（Amdahl’s Law）

在介绍锁竞争引起的性能瓶颈之前，让我们先来了解一下阿姆达尔法则。我们知道，一个并行程序是由两部分组成的：串行执行的部分和可以并行执行的部分。假设串行部分的执行时间为S，可并行执行部分的执行时间为P，则整个并行程序使用单线程（单核）串行执行的时间为S+P。阿姆达尔法则规定，可并行执行部分的执行时间与线程数目成反比：即如果有N个线程（N核CPU）并行执行这个可并行的部分，则该部分的执行时间为P/N。由此我们可以得到并行程序总体执行时间的公式：

    总体执行时间T = S + P/N

根据这个公式，我们可以得到一些非常有意思的结论。例如，如果一个程序全部代码都可以被并行执行，那么它的加速比会非常好，即随着线程数（CPU核数）的增多该程序的加速比会线性递增。换句话说，如果单线程执行该程序需要16秒钟，用16个线程执行该程序就只需要1秒钟。

然而，如果这个程序只有80%的代码可以被并行执行，它的加速比却会急剧下降。根据阿姆达尔法则，如果用16个线程并行执行次程序可并行的部分，该程序的总体执行时间T = S + P/N = (16*0.2) + (16*0.8)/16 = 4秒，这比完全并行化的情况（只需1秒）足足慢了4倍！实际上，如果该程序只有50%的代码可以被并行执行，在使用16个线程时该程序的执行时间仍然需要8.5秒！
从阿姆达尔法则我们可以看到，并行程序的性能很大程度上被只能串行执行的部分给限制住了，而由锁竞争引起的串行执行正是造成串行性能瓶颈的主要原因之一。

(3.2)锁竞争的常用解决办法

(3.2.1) 避免使用锁

为了提高程序的并行性，最好的办法自然是不使用锁。从设计角度上来讲，锁的使用无非是为了保护共享资源。如果我们可以避免使用共享资源的话那自然就避免了锁竞争造成的性能损失。幸运的是，在很多情况下我们都可以通过资源复制的方法让每个线程都拥有一份该资源的副本，从而避免资源的共享。如果有需要的话，我们也可以让每个线程先访问自己的资源副本，只在程序的后讲各个线程的资源副本合并成一个共享资源。例如，如果我们需要在多线程程序中使用计数器，那么我们可以让每个线程先维护一个自己的计数器，只在程序的最后将各个计数器两两归并（类比二叉树），从而最大程度提高并行度，减少锁竞争。

(3.2.2) 使用读写锁

如果对共享资源的访问多数为读操作，少数为写操作，而且写操作的时间非常短，我们就可以考虑使用读写锁来减少锁竞争。读写锁的基本原则是同一时刻多个读线程可以同时拥有读者锁并进行读操作；另一方面，同一时刻只有一个写进程可以拥有写者锁并进行写操作。读者锁和写者锁各自维护一份等待队列。当拥有写者锁的写进程释放写者锁时，所有正处于读者锁等待队列里的读线程全部被唤醒并被授予读者锁以进行读操作；当这些读线程完成读操作并释放读者锁时，写者锁中的第一个写进程被唤醒并被授予写者锁以进行写操作，如此反复。换句话说，多个读线程和一个写线程将交替拥有读写锁以完成相应操作。这里需要额外补充的一点是锁的公平调度问题。例如，如果在写者锁等待队列中有一个或多个写线程正在等待获得写者锁时，新加入的读线程会被放入读者锁的等待队列。这是因为，尽管这个新加入的读线程能与正在进行读操作的那些读线程并发读取共享资源，但是也不能赋予他们读权限，这样就防止了写线程被新到来的读线程无休止的阻塞。
需要注意的是，并不是所有的场合读写锁都具备更好的性能，大家应该根据Profling的测试结果来判断使用读写锁是否能真的提高性能，特别是要注意写操作虽然很少但很耗时的情况。

(3.2.3) 保护数据而不是操作

在实际程序中，有不少程序员在使用锁时图方便而把一些不必要的操作放在临界区中。例如，如果需要对一个共享数据结构进行删除和销毁操作，我们只需要把删除操作放在临界区中即可，资源销毁操作完全可以在临界区之外单独进行，以此增加并行度。
正是因为临界区的执行时间大大影响了并行程序的整体性能，我们必须尽量少在临界区中做耗时的操作，例如函数调用，数据查询，I/O操作等。简而言之，我们需要保护的只是那些共享资源，而不是对这些共享资源的操作，尽可能的把对共享资源的操作放到临界区之外执行有助于减少锁竞争带来的性能损失。

(3.2.4) 尽量使用轻量级的原子操作

在例3中，我们使用了mutex锁来保护counter++操作。实际上，counter++操作完全可以使用更轻量级的原子操作来实现，根本不需要使用mutex锁这样相对较昂贵的机制来实现。在今年程序员第四期的《volatile与多线程的那些事儿》中我们就有对Java和C/C++中的原子操作做过相应的介绍。

(3.2.5) 粗粒度锁与细粒度锁

为了减少串行部分的执行时间，我们可以通过把单个锁拆成多个锁的办法来较小临界区的执行时间，从而降低锁竞争的性能损耗，即把“粗粒度锁”转换成“细粒度锁”。但是，细粒度锁并不一定更好。这是因为粗粒度锁编程简单，不易出现死锁等Bug，而细粒度锁编程复杂，容易出错；而且锁的使用是有开销的（例如一个加锁操作一般需要100个CPU时钟周期），使用多个细粒度的锁无疑会增加加锁解锁操作的开销。在实际编程中，我们往往需要从编程复杂度、性能等多个方面来权衡自己的设计方案。事实上，在计算机系统设计领域，没有哪种设计是没有缺点的，只有仔细权衡不同方案的利弊才能得到最适合自己当前需求的解决办法。例如，Linux内核在初期使用了Big Kernel Lock（粗粒度锁）来实现并行化。从性能上来讲，使用一个大锁把所有操作都保护起来无疑带来了很大的性能损失，但是它却极大的简化了并行整个内核的难度。当然，随着Linux内核的发展，Big Kernel Lock已经逐渐消失并被细粒度锁而取代，以取得更好的性能。

(3.2.6) 使用无锁算法、数据结构

首先要强调的是，笔者并不推荐大家自己去实现无锁算法。为什么别去造无锁算法的轮子呢？因为高性能无锁算法的正确实现实在是太难了。有多难呢？Doug Lea提到java.util.concurrent库中一个Non Blocking的算法的实现大概需要1个人年，总共约500行代码。事实上，我推荐大家直接去使用一些并行库中已经实现好了的无锁算法、无锁数据结构，以提高并行程序的性能。典型的无锁算法的库有java.util.concurrent，Intel TBB等，它们都提供了诸如Non-blocking concurrent queue之类的数据结构以供使用。

**参考**

A: 陈硕 [多线程服务器的常用编程模型](http://blog.csdn.net/solstice/article/details/5307710)

B: Darryl Gove [Multicore Application Programming](http://book.douban.com/subject/5366276/)

c: 并行实验室 [多线程队列的算法优化](http://www.parallellabs.com/2010/10/25/practical-concurrent-queue-algorithm/)