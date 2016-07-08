---
layout: post
category : MySQL
tags : [MySQL, InnoDB]
title: InnoDB行锁
---
{% include JB/setup %}

**InnoDB行锁的实现分析**
**网址: [http://www.penglixun.com/tech/database/innodb_next_key_locking.html](http://www.penglixun.com/tech/database/innodb_next_key_locking.html)**

InnoDB与MyISAM不同，它实现的是一个行级锁，而非MyISAM的表锁。锁的粒度越大，则发生死锁的概率越大、锁机制开销越小，但并发能力会越低。如果锁的粒度变细，则发生死锁的概率也会增小，锁机制的开销会更大，但是并发能力能提高。表锁是如何实现的呢，以MyISAM为例，是在每个表的结构中加入一个互斥变量记录锁状态，像：

    struct Table {
    Row rows[MAXROWS];
    pthread_mutex_t lock;//表锁
    };

这样做的好处就是锁非常简单，当操作表的时候，直接锁住整个表就行，锁机制的开销非常小。但是问题也很明显，并发量上不去，因为无论多小的操作，都必须锁整个表，这可能带来其他操作的阻塞。
行锁又是如何实现的呢，Oracle是直接在每个行的block上做标记，而InnoDB则是靠索引来做。InnoDB的主键索引跟一般的索引不太一样，Key后面还跟上了整行的数据，互斥变量也是加载主键索引上的，像

    struct PK_Idx {
    Row row;
    pthread_mutex_t lock;//行锁
    };
    multimap pk_idx;

这样的形式。
这样做的好处是锁的粒度小，只锁住需要的数据不被更改，但是问题也很明显，锁的开销很大，每个主键索引上都要加上一个标记，可能两个不同的操作各锁住一部分行等待对方释放形成死锁，不过这个是有办法解决的，把上锁的操作封装成原子操作就行，不过并发量会受些影响。

下面是类似InnoDB的Next-Key locking算法的演示:
编译需要加-lpthread参数，例如g++ inno.cpp -lpthread -o inno

    #include <iostream>
    #include <cstdio>
    #include <cstdlib>
    #include <string>
    #include <map>
    #include <unistd.h>
    #include <time.h>
    #include <pthread.h>
    #include <windows.h>
     
    #define LOCK pthread_mutex_lock(&lock)
    #define UNLOCK pthread_mutex_unlock(&lock)
    #define PRINT(STR, ...) LOCK;fprintf(stderr, STR,  __VA_ARGS__);UNLOCK
     
    #define MAXROWS 100
     
    using namespace std;
     
    /* 行结构 */
    struct Row {
        int     num;
        string  info;
    };
     
    /* 主键索引结构 */
    struct PK_Idx {
        Row     row;
        pthread_mutex_t lock;//行锁
    };
     
    /* 表结构 */
    struct Table {
        multimap<int, PK_Idx> pk_idx;
        multimap<int, int>      num_idx;
        multimap<string, int>   info_idx;
        Row     rows[MAXROWS];
        pthread_mutex_t lock;//表锁
    };
     
    Table table;
    int pid;
    //全局锁
    pthread_mutex_t lock = PTHREAD_MUTEX_INITIALIZER;
     
    /* 随机字符 */
    char randChar() {
        return rand()%26+'A';
    }
     
    /* 随机字符串 */
    void randString(string &col, int len) {
        col = "";
        for(int i=0; i<len; ++i) {
            col += randChar();
        }
    }
     
    /* 初始化数据 */
    void init() {
        pid = 0;
        PK_Idx pk;
     
        srand((unsigned)time(0));
     
        //初始化表数据
        for(int i=0; i<MAXROWS; ++i) {
            pk.row.num = rand()%MAXROWS;
            randString(pk.row.info, rand()%10+1);
            //初始化行锁
            pk.lock = PTHREAD_MUTEX_INITIALIZER;
            //写入表数据
            table.rows[i].num = pk.row.num;
            table.rows[i].info = pk.row.info;
            //写入索引
            table.pk_idx.insert(pair<int, PK_Idx>(i, pk));
            table.num_idx.insert(pair<int, int>(pk.row.num, i));
            table.info_idx.insert(pair<string, int>(pk.row.info, i));
        }
        //初始化表锁
        table.lock = PTHREAD_MUTEX_INITIALIZER;
    }
     
    /*获取范围数据*/
    void select_num(int begin, int end) {
        int id;
        int cur_pid;
        multimap<int,int>::iterator it, itlow, itup;
        PK_Idx *pk;
        /* 按字段范围查找ID */
        itlow = table.num_idx.lower_bound (begin);
        itup = table.num_idx.upper_bound (end);
     
        LOCK;
        cur_pid = pid++;
        UNLOCK;
        PRINT("%d : * Start Select:%d,%d *\n", cur_pid, begin, end);
        for (it=itlow; it!=itup; ++it) {
            id = it->second;
            pk = &(table.pk_idx.find(id)->second);//根据ID去查主键索引
            pthread_mutex_lock(&(pk->lock));//在主键索引上加锁
            PRINT("%d : LOCK Row %d: %d\t%s\n", cur_pid, id, pk->row.num, pk->row.info.c_str());
            Sleep(500);
        }
        for (it=itlow; it!=itup; ++it) {
            id = it->second;
            pk = &(table.pk_idx.find(id)->second);
            PRINT("%d : UNLOCK Row %d\n", cur_pid, id);
            pthread_mutex_unlock(&(pk->lock));//使用完毕依次释放锁
        }
        PRINT("%d : * Select Finished! *\n", cur_pid);
    }
     
    /*修改范围数据*/
    void update_num(int begin, int end) {
        int id;
        int cur_pid;
        multimap<int,int>::iterator it, itlow, itup;
        PK_Idx *pk;
     
        itlow = table.num_idx.lower_bound (begin);
        itup = table.num_idx.upper_bound (end);
     
        LOCK;
        cur_pid = pid++;
        UNLOCK;
        PRINT("%d : * Start Update:%d,%d *\n", cur_pid, begin, end);
        for (it=itlow; it!=itup; ++it) {
            id = it->second;
            pk = &(table.pk_idx.find(id)->second);
            pthread_mutex_lock(&(pk->lock));
            PRINT("%d : LOCK Row %d: %d\t%s\n", cur_pid, id, pk->row.num, pk->row.info.c_str());
            Sleep(500);
        }
        for (it=itlow; it!=itup; ++it) {
            id = it->second;
            pk = &(table.pk_idx.find(id)->second);
            PRINT("%d : UNLOCK Row %d\n", cur_pid, id);
            pthread_mutex_unlock(&(pk->lock));
        }
        PRINT("%d : * Update Finished! *\n", cur_pid);
    }
     
     
    void* test_select(void *) {
        int begin, end;
        srand((unsigned)time(0));
        while(1) {
            begin = rand()%(MAXROWS/2);
            end = begin+rand()%(MAXROWS/2);
            select_num(begin, end);
            Sleep(500);
        }
    }
     
    void* test_update(void *) {
        int begin, end;
        srand((unsigned)time(0));
        while(1) {
            begin = rand()%(MAXROWS/5);
            end = begin+rand()%(MAXROWS/5);
            update_num(begin, end);
            Sleep(500);
        }
    }
     
    void test() {
        pthread_t id[2];
        if(pthread_create(&id[0], NULL, test_select, NULL) != 0)
        {
            PRINT("%s", "Create Thread Error!\n");
        }
     
        if(pthread_create(&id[1], NULL, test_update, NULL) != 0)
        {
            PRINT("%s", "Create Thread Error!\n");
        }
     
        while(1){
            Sleep(500);
        }
    }
     
    int main() {
        init();
        test();
        return 0;
    }

**锁的粒度与死锁概率**
**网址: [http://www.penglixun.com/tech/database/lock_granularity_deadlock_probability.html](http://www.penglixun.com/tech/database/lock_granularity_deadlock_probability.html)**
首先，我们要定义下什么是“锁的粒度”：所谓粒度就是作用范围，锁的粒度就是锁的作用范围。数据库中锁的粒度从高到低依次划分为：数据库、表、页、行。
什么是死锁，顺带说一下吧，当多个操作竞争资源，每个操作都无法获得全部所需资源时，系统进入死锁，如无外力作用，系统将无限等待下去，死锁的四个必要条件：

    （1）互斥条件：一个资源每次只能被一个进程使用。
    （2）请求与保持条件：一个进程因请求资源而阻塞时，对已获得的资源保持不放。
    （3）不剥夺条件：进程已获得的资源，在末使用完之前，不能强行剥夺。
    （4）循环等待条件：若干进程之间形成一种头尾相接的循环等待资源关系。

打破任何一个条件就不会发生死锁。
我们先来看一个生活场景：
有两个文具盒，一个放的是笔（圆珠笔、铅笔等等），一个放的是修正工具（橡皮擦、改正带等等）
现在有两个人，他们要画图，可能需要的物品当然有笔和修正工具。
假设我们用全局的独享，就是两个文具盒都只能同时被一个人拥有，一个人来拿笔，连带修正工具一起归他，这样绝对不会发生图画不下去的问题，因为所要的工具都会一次性给同一个人。但是问题也很严重，资源严重浪费，因为笔和橡皮擦肯定不会同时使用，也不会同时用2支笔。
假设我们用的是文具盒的独享，就是同时一个文具盒只能被一个人拥有，一个人要笔，整个放笔的文具盒都给他，一个人要修正图画，则整个放修正工具的文具盒都给他。这可能出现的问题就是，一个人想，我要画图，橡皮擦肯定要，橡皮擦的文具盒正好在，就先把这个文具盒拿下，等笔盒回来了再继续画。另一个人拿了笔盒，画了一会要修正，一看，放橡皮擦的文具盒没了，就等文具盒放回来。这样两个人就无限等待了，只要其中一个人看到东西不全就不拿，就不会无限等。
假设我们用的是物品独享，就是一支笔、一个橡皮擦只能被一个人拥有，一个人要画图，就拿一支笔，要改就拿一个橡皮擦或者改正带。除非只有一支笔，否则不会出现无限等待。当然，只有一支笔跟独享一个文具盒没区别。
例子中的独享就是锁的概念。
再来看数据库中的实例：
假设有A,B两个数据库，A库有A1,A2两个表，B库也有B1和B2两个表，每个表都有都有N条记录（N>1）
现在有两个操作P1和P2并发，我们来看一个场景：
P1要操作A1表的一行和B2表的一行，P2要操作A2表的一行和B1表的一行。
现在假设我们用库锁，P1先行，A库被锁住，P2后行，先锁住了B库，P1再去锁B库，已经被P2锁住了，P2去锁A库，被P1锁住了，这样P1，P2就陷入死锁，都占用部分资源。
假设我们用的是表锁呢，P1先行，A1被锁住，P2后行，A2被锁住，P1再锁B1，P2再锁B2，怎么也不会发生死锁。
采用行锁的话就更不会死锁了，操作的表都不同。
看到这里，大家就说，锁的粒度越大，越容易死锁，真的吗？那我再来个最大的锁，实例锁，一次性锁住整个实例，P1先行，整个实例被锁住，P2被阻塞，等P1操作完P2再来，肯定不会死锁，为什么？因为这已经退化成串行操作了。
也就是说，虽然一般情况下锁的粒度越大，死锁概率越大，但是，当锁的粒度成为全局锁，把操作变成串行后，就不一样了，根本不会死锁。
我们把P1和P2操作改一下，P1操作A1表的i行和A2表的j行，P2操作A1表的j行和A2表的i行（i<>j），再来看：
假设我们使用库锁，P1先行，A库就锁住，P2阻塞，P1完成P2锁A库，不会死锁。
假设我们使用表锁，P1先行，A1表锁住，P2后行，A2表锁住，P1再去锁A2表，已经被P2锁了，死锁发生。
假设我们使用行锁，P1先行，锁住A1表第i行，P2后行，锁住A1表第j行，P1再锁A2表j行，P2再锁A1表j行，完成操作。
也就是说，不能就认为所有情况都是锁的粒度越大死锁概率越大，而是要看操作的粒度，如果锁的粒度比操作的粒度大或相同，操作就会变成串行，根本不可能发生死锁。
顺便说以下，数据库中并行操作的情况很多，为什么很少发生死锁呢，因为只要打破死锁四个条件任意一个，就可以避免死锁，只会发生阻塞，一个操作释放资源后就可以继续进行。
方法很多，例如把锁的粒度提高到跟操作的粒度大，并发一个表，我就一次锁一个表，并发一个库，我就一次锁一个库，这实际上是什么呢，就是把并行弄成串行了，一般没人这么做，并发只有1，效率太低。
一般是多管齐下避免死锁，一是使用不同等级的锁，例如意向锁，互斥锁等，其实就是打破死锁第一条件——互斥条件，资源某些时候可以共享，例如读锁可以共享读，不过因为还是存在互斥锁，依然可能死锁。
第二就是可以按顺序锁资源，例如锁表只能按A->B->C的顺序锁，如果我要A,B表，锁了A表后发现B表已经被锁了，就释放A表的锁（或者使用意向锁），延时再尝试，直到所有资源都可以锁住（互斥锁/共享锁），这就是打破了死锁第二条件——请求与保持条件，不能获得全部资源就先释放锁，等能获得了再说，这样操作可以完全避免死锁。