---
layout: post
category : ElasticSearch
tags : [ElasticSearch]
title: ElasticSearch 内部机制浅析（二）
---
{% include JB/setup %}
**来自[https://leonlibraries.github.io/2017/04/20/ElasticSearch内部机制浅析二/](https://leonlibraries.github.io/2017/04/20/ElasticSearch%E5%86%85%E9%83%A8%E6%9C%BA%E5%88%B6%E6%B5%85%E6%9E%90%E4%BA%8C/)**

**前言**

上篇大致介绍了 ElasticSearch CRUD 的数据走向和涉及到的 Gossip 算法和每一种节点扮演的角色。我们对 ES 有了初步的认知，这一篇着重从 CAP 的角度去解读 ES 的分布式思想。


**Split Brain**

之前介绍过，对于去中心化的 ES 分布式系统来说，采用默认配置是无法避免脑裂问题的（可以参考前一篇文章的discovery.zen.minimum_master_nodes参数）。当然，任何分布式系统都是不能够接受脑裂的情况出现的，因此这里我们不过多讨论 P。


**AP？CP？**

![Alt text](/assets/images/2017/04/cap.jpg)

既然不讨论 P，那么 ES 到底属于 CP 还是 AP 设计呢？

我的理解是，脱离了具体配置谈 CAP 都是扯淡。

为什么这么说呢？在我看来，AP 和 CP 并没有很明确的界限，一切根据配置而论，而配置本身会根据业务场景在 AP 与 CP 之间做一个折衷，即所谓的 Trade-Off。


**读主分片 or 读副本？**

读数据的时候我们可以根据 Preference指定读取的分片类型：

    参数         描述
    _primary    只会在主分片操作
    _primary_first    优先主分片操作，如果主分片不可用，就会找其他分片操作
    _replica    只会在副本分片操作
    _replica_first    优先副本分片操作，如果副本分片不可用，就会找其他分片操作
    _local    尽可能在本地分片操作
    _prefer_nodes:abc,xyz    尽可能指定在 abc,xyz 节点上执行
    _shards:2,3    在指定的分片上操作，2，3为分片 ID
    _only_nodes    在指定的 Node 上操作

Preference的配置选择，实际上是 AP 与 CP 的权衡过程。如果对可用性要求很高，那么_primary这个参数是万万不可用；如果对一致性要求相对较高但可用性也需要保证的场景来说，可以使用_primary_first；如果对一致性要求极高的场景，但也就放弃了一定程度的可用性，这样用_primary会更合适一些。以此类推，需要根据自己的场景选择参数。


**TransLog**

TransLog （即所谓的写前日志WAL，Write Ahead Log）的机制与 MySQL 的 binlog，HBase 的 Hlog 并无太大差别。TransLog 本身是写入到 FS cache 的，什么时候 fsync 到磁盘取决于数据能接受丢失的程度。

换句话说，如果需要 ES 具备十分强悍的写入能力，数据丢了一部分也没太大关系，这种情况你可以将 fsync 设置为异步执行的，并且把 fsync 的时间间隔设置的很长；如果你需要非常严谨的数据，不能够接受丢失数据，那么你可能在每次写入 TransLog 的时候都要 fsync 一次（这是默认机制）。

然而业务并非总是这么理想化，现实中同样需要在可用性与一致性两者之间做权衡。
下面介绍 TransLog 的相关配置。

***TransLog Settings（持久化策略配置）***：

index.translog.durability：如果设为 async ，默认情况下，ES 会每隔五秒对 TransLog 执行一次 fsync 和 commit 的操作；如果设为 request(default)，则在每次真正执行index、delete、update 或者 bulk index 操作前立刻将 TransLog fsync 到每一个主分片和副本分片中，并返回成功；

index.translog.sync_interval：只有将index.translog.durability设置为async时才有效，默认5s，表示 TransLog 持久化的时间间隔。

***Flush Settings（TransLog清洗配置）***：

为了避免 Translog 文件太大导致恢复过慢，适当的清洗是必要的。
index.translog.flush_threshold_size：当 translog 日志达到这个配置大小的时候将执行一次 Flush 操作，默认512mb；
值得一提，默认情况下每隔三十分钟会 Flush 一次。但一般情况下不会手动调整清洗策略。

    An Elasticsearch flush is the process of performing a Lucene commit and starting a new translog.

ES 的 Flush 操作包含了 Lucene索引的 fsync 以及 Translog 的清空，两个操作，因此日志清洗并不会导致数据丢失！

数据恢复的话这里没什么好说的，和其他分布式存储的 WAL 基本一致，从磁盘读取出 TransLog，然后 Replay 即可。


**并发策略之悲观锁**

ES 不支持 ACID 事务，ES 无法确保多个 Documents 处在同一个事务里。如果我们用 RDBS 存储业务数据，ES 只是作为一个搜索引擎对业务数据做了一份副本而已，这可能是基于 binlog 有序同步过来的。这种情况下，数据的 ACID 由 RDBS 来控制，RDBS 本身是有事务的，这种用法并不存在并发问题。

可当不使用 RDBS 的时候，ES 就直接拿来做可靠性存储了，这时候的 ACID 怎么保证呢？

一个不完美的方案就是悲观锁，ES 是通过创建 lock 文件来对资源进行锁定，与其他线程隔离开来，控制并发。锁大致根据用途分为如下几种：

***全局锁（Global Locking）***：

获取全局锁

    PUT /fs/lock/global/_create

执行操作语句完后释放全局锁，如果在已锁状态下加锁，会报错，中断程序无法继续运行。

    DELETE /fs/lock/global

其性能最差，不推荐使用。

**文档锁（Document Locking）**：

给单个 document 以一个文档锁，这个时候把锁的影响范围从全局缩小到了文档级别，更细颗粒，提高并发性能。

    PUT /fs/lock/_bulk
    { "create": { "_id": 1}}
    { "process_id": 123    }
    { "create": { "_id": 2}}
    { "process_id": 123    }

分别给 id 为1和2的 document 上了锁，这里需要指定唯一的进程 ID 123。不过这里要注意的是，一旦document 上锁，其他线程想给它加锁是会报错的，因此可以达到互斥的效果，报错后程序就中断，无法执行对应的操作了。
为了使 lock 可以被查到可以调用

    POST /fs/_refresh

而后可以浏览一下进程 ID 为123的 lock

    GET /fs/lock/_search?scroll=1m
    {
        "sort" : ["_doc"],
        "query": {
            "match" : {
                "process_id" : 123
            }
        }
    }

为了达到锁可以重入的效果，我们可以执行这么一句

    POST /fs/lock/1/_update
    {
      "upsert": { "process_id": 123 },
      "script": "if ( ctx._source.process_id != process_id )
      { assert false }; ctx.op = 'noop';"
      "params": {
        "process_id": 123
      }
    }

意思是，原本已经上锁的时候再去加锁会出现报错，哪怕是这个锁的持有者二次加锁也会报错。现在用这种方式获取锁好处就是使得锁本身是可以被持有者重入多次而不会报错的。

最后释放锁

    PUT /fs/lock/_bulk
    { "delete": { "_id": 1}}
    { "delete": { "_id": 2}}

***文件树锁（Tree Locking）***：

除了以上的锁以外，ES 还支持文件目录锁。目录锁的特点是既存在独占锁（Exclusive Lock），又存在共享锁（Shared Lock）。这里就涉及到的原理上和上边几乎一样，只不过独占锁属性应该这么设置：

    { "lock_type": "exclusive" }

共享锁则应该这么来

    {
      "lock_type":  "shared",
      "lock_count": 1
    }

这里的 lock_count 表示已经被多少个实例共享了。

尝试获取锁可以改成这样

POST /fs/lock/%2Fclinton/_update
{
  "upsert": {
    "lock_type":  "shared",
    "lock_count": 1
  },
  "script": "if (ctx._source.lock_type == 'exclusive')
  { assert false }; ctx._source.lock_count++"
}

判断如果是独占锁则抛错，如果是共享锁则将 lock_count+1。

当然，这里也可以改成可重入的，不多赘述。

Tips：以上几种锁并非只针对 ES 的资源来使用，资源可以是各种各样的，甚至可以拿 ES 做分布式锁来使用。

悲观锁的实现就是为了强数据一致性而产生的，但是在使用悲观锁的时候一定要慎重，务必要想清楚你的业务场景用这种很重的锁是否合适？如果十分有必要用，你就得思考如何缩小颗粒度来减小锁影响的范围，甚至我个人觉得在用到悲观锁的时候，ES 并非是一个很不错的选择，我们甚至可以借助 Zookeeper 或者 Redis 等第三方中间件来实现分布式锁，将 ES 的资源隔离开来。

另外，无论哪种锁都无法确保当某个线程获得锁以后挂了，都务必考虑锁的释放问题，避免死锁。这个就不在本文讨论范围。


**并发策略之乐观并发控制**

乐观并发控制（optimistic concurrency control）的事务包括以下阶段：

    读取：事务将数据读入缓存，这时系统会给事务分派一个时间戳。
    校验：事务执行完毕后，进行提交。这时同步校验所有事务，如果事务所读取的数据在读取之后又被其他事务修改，则产生冲突，事务被中断回滚。
    写入：通过校验阶段后，将更新的数据写入数据库。用以确保较新版本的数据不会被旧版本的数据覆盖

ES 是怎么保证的是老版本数据绝对不会覆盖新版本呢？

大致是先读取需要被修改的记录的最新版本号，然后利用 CAS 算法将对记录做出修改，一旦修改成功，就会将数据平行拷贝到各个节点做副本。因为考虑到某些 replica 同步的过程是平行且异步化的，当更新十分频繁的时候，数据的先来后到谁都说不准，因此对于每个 Document，ES 都会指定一个_version字段存储版本号，而这个版本号会随着 document 的每次变更而自增，每一个新的数据都有着固定的版本号，用以标识数据的先来后到，老版本无法覆盖新版本，这就确保分片之间的数据不会出现不一致的情况，甚至可以避免数据丢失。


**小结**

CP？AP？这或许并不是那么重要，但是我很看重这样的思考过程，哪怕是没有结果，在这个过程里可以增进对 ES 的认知和理解，而不会单纯将一个分布式系统简单归纳为 AP 还是 CP。

但不得不说，ES 还是非常适合 AP 场景的，并且他的 TransLog 机制对数据的最终一致性也有很强有力的保障。


**Further Reading:**

https://www.elastic.co/guide/en/elasticsearch/reference/current/indices-update-settings.html

https://www.elastic.co/guide/en/elasticsearch/reference/current/search-request-preference.html

http://www.infoq.com/cn/articles/anatomy-of-an-elasticsearch-cluster-part02

https://www.elastic.co/guide/en/elasticsearch/guide/2.x/concurrency-solutions.html

https://www.elastic.co/guide/en/elasticsearch/guide/current/optimistic-concurrency-control.html

https://en.wikipedia.org/wiki/Optimistic_concurrency_control

https://zh.wikipedia.org/wiki/CAP定理
