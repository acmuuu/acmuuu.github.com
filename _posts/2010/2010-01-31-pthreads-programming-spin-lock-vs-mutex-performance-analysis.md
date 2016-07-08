---
layout: post
category : Linux
tags : [Pthreads, Linux, Lock, C++]
title: Pthreads并行编程之spin lock与mutex性能对比分析
---
{% include JB/setup %}
**来自：[http://www.parallellabs.com/2010/01/31/pthreads-programming-spin-lock-vs-mutex-performance-analysis/](http://www.parallellabs.com/2010/01/31/pthreads-programming-spin-lock-vs-mutex-performance-analysis/)**

POSIX threads(简称Pthreads)是在多核平台上进行并行编程的一套常用的API。线程同步(Thread Synchronization)是并行编程中非常重要的通讯手段，其中最典型的应用就是用Pthreads提供的锁机制(lock)来对多个线程之间共 享的临界区(Critical Section)进行保护(另一种常用的同步机制是barrier)。

Pthreads提供了多种锁机制：

    (1) Mutex（互斥量）：pthread_mutex_***
    (2) Spin lock（自旋锁）：pthread_spin_***
    (3) Condition Variable（条件变量）：pthread_con_***
    (4) Read/Write lock（读写锁）：pthread_rwlock_***

Pthreads提供的Mutex锁操作相关的API主要有：

pthread_mutex_lock (pthread_mutex_t *mutex);[link](https://computing.llnl.gov/tutorials/pthreads/man/pthread_mutex_lock.txt)

pthread_mutex_trylock (pthread_mutex_t *mutex);[link](https://computing.llnl.gov/tutorials/pthreads/man/pthread_mutex_trylock.txt)

pthread_mutex_unlock (pthread_mutex_t *mutex);[link](https://computing.llnl.gov/tutorials/pthreads/man/pthread_mutex_unlock.txt)

Pthreads提供的与Spin Lock锁操作相关的API主要有：

pthread_spin_lock (pthread_spinlock_t *lock);[link](https://computing.llnl.gov/tutorials/pthreads/man/pthread_spin_lock.txt)

pthread_spin_trylock (pthread_spinlock_t *lock);[link](https://computing.llnl.gov/tutorials/pthreads/man/pthread_spin_trylock.txt)

pthread_spin_unlock (pthread_spinlock_t *lock);[link](https://computing.llnl.gov/tutorials/pthreads/man/pthread_spin_unlock.txt)

从实现原理上来讲，Mutex属于sleep-waiting类型的锁。例如在一个双核的机器上有两个线程(线程A和线程B)，它们分别运行在Core0和Core1上。假设线程A想要通过pthread_mutex_lock操作去得到一个临界区的锁，而此时这个锁正被线程B所持有，那么线程A就会被阻塞(blocking)，Core0 会在此时进行上下文切换(Context Switch)将线程A置于等待队列中，此时Core0就可以运行其他的任务(例如另一个线程C)而不必进行忙等待。而Spin lock则不然，它属于busy-waiting类型的锁，如果线程A是使用pthread_spin_lock操作去请求锁，那么线程A就会一直在 Core0上进行忙等待并不停的进行锁请求，直到得到这个锁为止。

如果大家去查阅Linux glibc中对pthreads API的实现NPTL([Native POSIX Thread Library](http://en.wikipedia.org/wiki/Native_POSIX_Thread_Library)) 的源码的话(使用”getconf GNU_LIBPTHREAD_VERSION”命令可以得到我们系统中NPTL的版本号)，就会发现pthread_mutex_lock()操作如果没有锁成功的话就会调用system_wait()的系统调用（现在NPTL的实现采用了用户空间的[futex](http://en.wikipedia.org/wiki/Futex)，不需要频繁进行系统调用，性能已经大有改善），并将当前线程加入该mutex的等待队列里。而spin lock则可以理解为在一个while(1)循环中用内嵌的汇编代码实现的锁操作(印象中看过一篇论文介绍说在linux内核中spin lock操作只需要两条CPU指令，解锁操作只用一条指令就可以完成)。有兴趣的朋友可以参考另一个名为[sanos](http://www.jbox.dk/)的微内核中pthreds API的实现：[mutex.c](http://www.jbox.dk/sanos/source/lib/pthread/mutex.c.html) [spinlock.c](http://www.jbox.dk/sanos/source/lib/pthread/spinlock.c.html)，尽管与NPTL中的代码实现不尽相同，但是因为它的实现非常简单易懂，对我们理解spin lock和mutex的特性还是很有帮助的。

那么在实际编程中mutex和spin lcok哪个的性能更好呢？我们知道spin lock在Linux内核中有非常广泛的利用，那么这是不是说明spin lock的性能更好呢？下面让我们来用实际的代码测试一下（请确保你的系统中已经安装了最近的g++）。

    // Name: spinlockvsmutex1.cc
    // Source: http://www.alexonlinux.com/pthread-mutex-vs-pthread-spinlock
    // Compiler(spin lock version): g++ -o spin_version -DUSE_SPINLOCK spinlockvsmutex1.cc -lpthread
    // Compiler(mutex version): g++ -o mutex_version spinlockvsmutex1.cc -lpthread
    #include <stdio.h>
    #include <unistd.h>
    #include <sys/syscall.h>
    #include <errno.h>
    #include <sys/time.h>
    #include <list>
    #include <pthread.h>
     
    #define LOOPS 50000000
     
    using namespace std;
     
    list<int> the_list;
     
    #ifdef USE_SPINLOCK
    pthread_spinlock_t spinlock;
    #else
    pthread_mutex_t mutex;
    #endif
     
    //Get the thread id
    pid_t gettid() { return syscall( __NR_gettid ); }
     
    void *consumer(void *ptr)
    {
        int i;
     
        printf("Consumer TID %lun", (unsigned long)gettid());
     
        while (1)
        {
            #ifdef USE_SPINLOCK
                pthread_spin_lock(&spinlock);
            #else
                pthread_mutex_lock(&mutex);
            #endif
            if (the_list.empty())
            {
            #ifdef USE_SPINLOCK
                pthread_spin_unlock(&spinlock);
            #else
                pthread_mutex_unlock(&mutex);
            #endif
                break;
            }
     
            i = the_list.front();
            the_list.pop_front();
     
            #ifdef USE_SPINLOCK
                pthread_spin_unlock(&spinlock);
            #else
                pthread_mutex_unlock(&mutex);
            #endif
        }
     
        return NULL;
    }
     
    int main()
    {
        int i;
        pthread_t thr1, thr2;
        struct timeval tv1, tv2;
     
        #ifdef USE_SPINLOCK
            pthread_spin_init(&spinlock, 0);
        #else
            pthread_mutex_init(&mutex, NULL);
        #endif
     
        // Creating the list content...
        for (i = 0; i < LOOPS; i++)
            the_list.push_back(i);
     
        // Measuring time before starting the threads...
        gettimeofday(&tv1, NULL);
     
        pthread_create(&thr1, NULL, consumer, NULL);
        pthread_create(&thr2, NULL, consumer, NULL);
     
        pthread_join(thr1, NULL);
        pthread_join(thr2, NULL);
     
        // Measuring time after threads finished...
        gettimeofday(&tv2, NULL);
     
        if (tv1.tv_usec > tv2.tv_usec)
        {
            tv2.tv_sec--;
            tv2.tv_usec += 1000000;
        }
     
        printf("Result - %ld.%ldn", tv2.tv_sec - tv1.tv_sec,
            tv2.tv_usec - tv1.tv_usec);
     
        #ifdef USE_SPINLOCK
            pthread_spin_destroy(&spinlock);
        #else
            pthread_mutex_destroy(&mutex);
        #endif
     
        return 0;
    }

该程序运行过程如下：主线程先初始化一个list结构，并根据LOOPS的值将对应数量的entry插入该list，之后创建两个新线程，它们都执行consumer()这个任务。两个被创建的新线程同时对这个list进行pop操作。主线程会计算从创建两个新线程到两个新线程结束之间所用的时间，输出为下文中的”Result “。

测试机器参数：

    Ubuntu 9.04 X86_64
    Intel(R) Core(TM)2 Duo CPU E8400 @ 3.00GHz
    4.0 GB Memory

从下面是测试结果：

    gchen@gchen-desktop:~/Workspace/mutex$ g++ -o spin_version -DUSE_SPINLOCK spinvsmutex1.cc -lpthread
    gchen@gchen-desktop:~/Workspace/mutex$ g++ -o mutex_version spinvsmutex1.cc -lpthread
    gchen@gchen-desktop:~/Workspace/mutex$ time ./spin_version
    Consumer TID 5520
    Consumer TID 5521
    Result - 5.888750
     
    real    0m10.918s
    user    0m15.601s
    sys    0m0.804s
     
    gchen@gchen-desktop:~/Workspace/mutex$ time ./mutex_version
    Consumer TID 5691
    Consumer TID 5692
    Result - 9.116376
     
    real    0m14.031s
    user    0m12.245s
    sys    0m4.368s

可以看见spin lock的版本在该程序中表现出来的性能更好。另外值得注意的是sys时间，mutex版本花费了更多的系统调用时间，这就是因为mutex会在锁冲突时调用system wait造成的。

但是，是不是说spin lock就一定更好了呢？让我们再来看一个锁冲突程度非常剧烈的实例程序：

    //Name: svm2.c
    //Source: http://www.solarisinternals.com/wiki/index.php/DTrace_Topics_Locks
    //Compile(spin lock version): gcc -o spin -DUSE_SPINLOCK svm2.c -lpthread
    //Compile(mutex version): gcc -o mutex svm2.c -lpthread
    #include <stdio.h>
    #include <stdlib.h>
    #include <pthread.h>
    #include <sys/syscall.h>
     
    #define        THREAD_NUM     2
     
    pthread_t g_thread[THREAD_NUM];
    #ifdef USE_SPINLOCK
    pthread_spinlock_t g_spin;
    #else
    pthread_mutex_t g_mutex;
    #endif
    __uint64_t g_count;
     
    pid_t gettid()
    {
        return syscall(SYS_gettid);
    }
     
    void *run_amuck(void *arg)
    {
        int i, j;
        
        printf("Thread %lu started.n", (unsigned long)gettid());
        
        for (i = 0; i < 10000; i++) {
            #ifdef USE_SPINLOCK
                pthread_spin_lock(&g_spin);
            #else
                pthread_mutex_lock(&g_mutex);
            #endif
            for (j = 0; j < 100000; j++) {
                if (g_count++ == 123456789)
                    printf("Thread %lu wins!n", (unsigned long)gettid());
            }
            #ifdef USE_SPINLOCK
                pthread_spin_unlock(&g_spin);
            #else
                pthread_mutex_unlock(&g_mutex);
            #endif
        }
        
        printf("Thread %lu finished!n", (unsigned long)gettid());
 
        return (NULL);
    }
     
    int main(int argc, char *argv[])
    {
        int i, threads = THREAD_NUM;
 
        printf("Creating %d threads...n", threads);
        #ifdef USE_SPINLOCK
            pthread_spin_init(&g_spin, 0);
        #else
            pthread_mutex_init(&g_mutex, NULL);
        #endif
        for (i = 0; i < threads; i++)
            pthread_create(&g_thread[i], NULL, run_amuck, (void *) i);
 
        for (i = 0; i < threads; i++)
            pthread_join(g_thread[i], NULL);

        printf("Done.n");
 
        return (0);
    }

这个程序的特征就是临界区非常大，这样两个线程的锁竞争会非常的剧烈。当然这个是一个极端情况，实际应用程序中临界区不会如此大，锁竞争也不会如此激烈。测试结果显示mutex版本性能更好：

    gchen@gchen-desktop:~/Workspace/mutex$ time ./spin
    Creating 2 threads...
    Thread 31796 started.
    Thread 31797 started.
    Thread 31797 wins!
    Thread 31797 finished!
    Thread 31796 finished!
    Done.
     
    real    0m5.748s
    user    0m10.257s
    sys    0m0.004s
     
    gchen@gchen-desktop:~/Workspace/mutex$ time ./mutex
    Creating 2 threads...
    Thread 31801 started.
    Thread 31802 started.
    Thread 31802 wins!
    Thread 31802 finished!
    Thread 31801 finished!
    Done.
     
    real    0m4.823s
    user    0m4.772s
    sys    0m0.032s

另外一个值得注意的细节是spin lock耗费了更多的user time。这就是因为两个线程分别运行在两个核上，大部分时间只有一个线程能拿到锁，所以另一个线程就一直在它运行的core上进行忙等待，CPU占用率一直是100%；而mutex则不同，当对锁的请求失败后上下文切换就会发生，这样就能空出一个核来进行别的运算任务了。（其实这种上下文切换对已经拿着锁的那个线程性能也是有影响的，因为当该线程释放该锁时它需要通知操作系统去唤醒那些被阻塞的线程，这也是额外的开销）

**总结**

（1）Mutex适合对锁操作非常频繁的场景，并且具有更好的适应性。尽管相比spin lock它会花费更多的开销（主要是上下文切换），但是它能适合实际开发中复杂的应用场景，在保证一定性能的前提下提供更大的灵活度。

（2）spin lock的lock/unlock性能更好(花费更少的cpu指令)，但是它只适应用于临界区运行时间很短的场景。而在实际软件开发中，除非程序员对自己的程序的锁操作行为非常的了解，否则使用spin lock不是一个好主意(通常一个多线程程序中对锁的操作有数以万次，如果失败的锁操作(contended lock requests)过多的话就会浪费很多的时间进行空等待)。

（3）更保险的方法或许是先（保守的）使用 Mutex，然后如果对性能还有进一步的需求，可以尝试使用spin lock进行调优。毕竟我们的程序不像Linux kernel那样对性能需求那么高(Linux Kernel最常用的锁操作是spin lock和rw lock)。

这个观点在Oracle的文档中得到了支持：

    During configuration, Berkeley DB selects a mutex implementation for the architecture. 
    Berkeley DB normally prefers blocking-mutex implementations over non-blocking ones. 
    For example, Berkeley DB will select POSIX pthread mutex interfaces rather than assembly-code 
    test-and-set spin mutexes because pthread mutexes are usually more efficient and less 
    likely to waste CPU cycles spinning without getting any work accomplished.

p.s.调用syscall(SYS_gettid)和syscall( __NR_gettid )都可以得到当前线程的id:)