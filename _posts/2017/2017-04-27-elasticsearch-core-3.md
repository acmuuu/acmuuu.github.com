---
layout: post
category : ElasticSearch
tags : [ElasticSearch]
title: ElasticSearch 内部机制浅析（三）
---
{% include JB/setup %}
**来自[https://leonlibraries.github.io/2017/04/20/ElasticSearch内部机制浅析三/](https://leonlibraries.github.io/2017/04/27/ElasticSearch%E5%86%85%E9%83%A8%E6%9C%BA%E5%88%B6%E6%B5%85%E6%9E%90%E4%B8%89/)**

**前言**

上篇从分布式的角度阐述了 ES 的分布式设计和思想，这一篇打算与 Lucene 结合起来，摸透一些 ES 的常遇到的概念，我们可以将了解到的这些东西应用到优化实践中去。

废话不多说，进入正题。


**Shard**

Shard 实际上是一个 Lucene 的一个实例（Lucene Index），但往往一个 Elastic Index 都是由多个 Shards （primary & replica）构成的。
特别注意，在单个 Lucene 实例里最多包含2,147,483,519 (= Integer.MAX_VALUE - 128) 个 Documents。

可以利用 _cat/shards API 来监控 shards 大小。


**Lucene Index 结构**

一个 Lucene Index 在文件系统的表现上来看就是存储了一系列文件的一个目录。一个 Lucene Index 由许多独立的 segments 组成，而 segments 包含了文档中的词汇字典、词汇字典的倒排索引以及 Document 的字段数据（设置为Stored.YES的字段），所有的 segments 数据存储于 _<segment_name>.cfs的文件中。


**Segments**

![Alt text](/assets/images/2017/04/segments.jpg)

Segment 直接提供了搜索功能的，ES 的一个 Shard （Lucene Index）中是由大量的 Segment 文件组成的，且每一次 fresh 都会产生一个新的 Segment 文件，这样一来 Segment 文件有大有小，相当碎片化。ES 内部则会开启一个线程将小的 Segment 合并（Merge）成大的 Segment，减少碎片化，降低文件打开数，提升 I/O 性能。

Segment 文件是不可变更的。当一个 Document 更新的时候，实际上是将旧的文档标记为删除，然后索引一个新的文档。在 Merge 的过程中会将旧的 Document 删除掉。具体到文件系统来说，文档 A 是写入到 _<segment_name>.cfs 文件里的，删除文档 A 实际上是在_<segment_name>.del文件里标记某个 document 已被删除，那么下次查询的时候则会跳过这个文档，是为逻辑删除。当归并（Merge）的时候，老的 segment 文件将会被删除，合并成新的 segment 文件，这个时候也就是物理删除了。


**Type or Index？**

先来看看一个比较完备的 Schema

    {
        "zipkin-2017-03-01": {
            "aliases": {},
            "mappings": {
                "_default_": {
                    "_all": {
                        "enabled": false
                    },
                    "dynamic_templates": [
                        {
                            "strings": {
                                "match": "*",
                                "match_mapping_type": "string",
                                "mapping": {
                                    "ignore_above": 256,
                                    "type": "keyword"
                                }
                            }
                        },
                        {
                            "value": {
                                "match": "value",
                                "mapping": {
                                    "ignore_above": 256,
                                    "ignore_malformed": true,
                                    "match_mapping_type": "string",
                                    "type": "keyword"
                                }
                            }
                        },
                        {
                            "annotations": {
                                "match": "annotations",
                                "mapping": {
                                    "type": "nested"
                                }
                            }
                        },
                        {
                            "binaryAnnotations": {
                                "match": "binaryAnnotations",
                                "mapping": {
                                    "type": "nested"
                                }
                            }
                        }
                    ]
                },
                "span": {
                    "_all": {
                        "enabled": false
                    },
                    "dynamic_templates": [
                        {
                            "strings": {
                                "match": "*",
                                "match_mapping_type": "string",
                                "mapping": {
                                    "ignore_above": 256,
                                    "type": "keyword"
                                }
                            }
                        },
                        {
                            "value": {
                                "match": "value",
                                "mapping": {
                                    "ignore_above": 256,
                                    "ignore_malformed": true,
                                    "match_mapping_type": "string",
                                    "type": "keyword"
                                }
                            }
                        },
                        {
                            "annotations": {
                                "match": "annotations",
                                "mapping": {
                                    "type": "nested"
                                }
                            }
                        },
                        {
                            "binaryAnnotations": {
                                "match": "binaryAnnotations",
                                "mapping": {
                                    "type": "nested"
                                }
                            }
                        }
                    ],
                    "properties": {
                        "annotations": {
                            "type": "nested",
                            "properties": {
                                "endpoint": {
                                    "properties": {
                                        "ipv4": {
                                            "type": "keyword",
                                            "ignore_above": 256
                                        },
                                        "serviceName": {
                                            "type": "keyword",
                                            "ignore_above": 256
                                        }
                                    }
                                },
                                "timestamp": {
                                    "type": "long"
                                },
                                "value": {
                                    "type": "keyword",
                                    "ignore_above": 256
                                }
                            }
                        },
                        "binaryAnnotations": {
                            "type": "nested",
                            "properties": {
                                "endpoint": {
                                    "properties": {
                                        "ipv4": {
                                            "type": "keyword",
                                            "ignore_above": 256
                                        },
                                        "port": {
                                            "type": "long"
                                        },
                                        "serviceName": {
                                            "type": "keyword",
                                            "ignore_above": 256
                                        }
                                    }
                                },
                                "key": {
                                    "type": "keyword",
                                    "ignore_above": 256
                                },
                                "value": {
                                    "type": "keyword",
                                    "ignore_above": 256
                                }
                            }
                        },
                        "duration": {
                            "type": "long"
                        },
                        "id": {
                            "type": "keyword",
                            "ignore_above": 256
                        },
                        "name": {
                            "type": "keyword",
                            "ignore_above": 256
                        },
                        "parentId": {
                            "type": "keyword",
                            "ignore_above": 256
                        },
                        "timestamp": {
                            "type": "long"
                        },
                        "timestamp_millis": {
                            "type": "date",
                            "format": "epoch_millis"
                        },
                        "traceId": {
                            "type": "keyword"
                        }
                    }
                },
                "dependencylink": {
                    "_all": {
                        "enabled": false
                    },
                    "dynamic_templates": [
                        {
                            "strings": {
                                "match": "*",
                                "match_mapping_type": "string",
                                "mapping": {
                                    "ignore_above": 256,
                                    "type": "keyword"
                                }
                            }
                        },
                        {
                            "value": {
                                "match": "value",
                                "mapping": {
                                    "ignore_above": 256,
                                    "ignore_malformed": true,
                                    "match_mapping_type": "string",
                                    "type": "keyword"
                                }
                            }
                        },
                        {
                            "annotations": {
                                "match": "annotations",
                                "mapping": {
                                    "type": "nested"
                                }
                            }
                        },
                        {
                            "binaryAnnotations": {
                                "match": "binaryAnnotations",
                                "mapping": {
                                    "type": "nested"
                                }
                            }
                        }
                    ],
                    "properties": {
                        "callCount": {
                            "type": "long"
                        },
                        "child": {
                            "type": "keyword",
                            "ignore_above": 256
                        },
                        "id": {
                            "type": "keyword",
                            "ignore_above": 256
                        },
                        "parent": {
                            "type": "keyword",
                            "ignore_above": 256
                        }
                    }
                }
            },
            "settings": {
                "index": {
                    "number_of_shards": "6",
                    "provided_name": "zipkin-2017-03-01",
                    "creation_date": "1488328116434",
                    "requests": {
                        "cache": {
                            "enable": "true"
                        }
                    },
                    "analysis": {
                        "filter": {
                            "traceId_filter": {
                                "type": "pattern_capture",
                                "preserve_original": "true",
                                "patterns": [
                                    "([0-9a-f]{1,16})$"
                                ]
                            }
                        },
                        "analyzer": {
                            "traceId_analyzer": {
                                "filter": "traceId_filter",
                                "type": "custom",
                                "tokenizer": "keyword"
                            }
                        }
                    },
                    "number_of_replicas": "2",
                    "uuid": "_9j3jYVDRbOp8rOec8fEqw",
                    "version": {
                        "created": "5020199"
                    }
                }
            }
        }
    }

这里的 zipkin-2017-03-01 是 Index name，span 和 dependencylink 是 Type name。很多人在前期规范 Schema 的时候犯难，不知道应该直接用 Type 表示数据 Schema 好还是新建一个 Index ？这里接下来会进一步探讨。

Index 有何局限？

当需要对大量的 index 做聚合查询的时候，是将 index中的每一个分片单独查询，再将结果聚合出来，如果量级特别大，那么占用的 CPU 和内存资源将会十分庞大；

Type 呢？

在同一个 Index 下，可以通过 _Type 字段指定不同的 Type，其中无论多少个 Type 的聚合查询，shard 数目维持不变，因此聚合所消耗的资源大量减少，然而也会有一定的限制：

    ① 同一 Index 下，同名 Field 类型必须相同，即使不同的 Type；
    ② 同一 Index 下，TypeA 的 Field 会占用 TypeB 的资源（互相消耗资源），会形成一种稀疏存储的情况。尤其是 doc value ，为什么这么说呢？doc value为了性能考虑会保留一部分的磁盘空间，这意味着 TypeB 可能不需要这个字段的 doc_value 而 TypeA 需要，那么 TypeB 就被白白占用了一部分没有半点用处的资源；
    ③ 同理，Score 评分机制是 index-wide 的，这会导致评分受到影响。

ES 本身是 Schemaless 的，意味着你前期设计需要更多的花费心思，没有类似于 RDB 的范式。原则上来说，只要基本尊重范式要求，关系型数据库的设计问题都不大，而对于 Schemaless 的 ES 来说，前期设计数据结构的时候需要多花费点心思。

基本来说，数据关联度不大的不建议放到同一个 Index 且以 Type 来区分，如果考虑到 Index 分片过大导致后续检索压力增加的情况，应该对 Index进行拆分，ES 的通常做法是，以时间为维度做数据拆分，比如一天一个 Index 或者一个月一个 Index，依据数据量大小来衡量。

tips： 对于字段信息变更频繁的数据， 也不适合与其他 Index 存在一起且以 Type 来区分。因为在 ES 中，索引元数据本身是放在主节点中维护的，CP 设计。意味着涉及到大量字段变更及元数据变更的操作，都会导致该 Index 被堵塞或假死。我们应该对这样的 Index 做隔离，避免影响到其他 Index 正常的增删改查。甚至当涉及到字段变更十分频繁且无法预定义 schema 的场景时，是否要使用 ES 都应该慎思熟虑了！


**_source & _all & _field_names字段**

在定义某个 Index 的 schema 的时候，涉及到这几个参数，任何事情都不是一概而论的，因此需要结合具体场景考量一下这些参数设置的意图。

_source ：Lucene 对于源文档的存储提供了一个选项（Stored.YES/NO），如果选了YES，其数据就会检索的过程中返回；否则 Lucene 即使成功做了检索，也只能返回数据的 ID，然后借助第三方存储通过 ID 将数据查询出来。该参数默认enabled，表示需要将文档原始数据一并存入索引之中，disabled则表示我的 Lucene 实例中只包含倒排索引以及词典，不对原始文档做持久化；

_all ：默认enabled，意思是需要用额外的存储空间存储该 Index 的各字段信息以及数据，目的是检索的过程中可以不需要指定任何字段，也即是全字段匹配；对于字段结构简单的，可以 disabled 取消掉这块功能；

_field_names 字段 ：这个字段默认开启，存储的是每个 document 中的字段名，如果没有检查 Document 的字段是否存在这样类似的需求的话，建议关闭，写入性能大约提升20%。


**doc_value**

之前介绍过，倒排索引的数据组织方式大概是这样的：

    Term      Doc_1   Doc_2   Doc_3
    ------------------------------------
    brown   |   X   |   X   |
    dog     |   X   |       |   X
    dogs    |       |   X   |   X
    fox     |   X   |       |   X
    foxes   |       |   X   |
    in      |       |   X   |
    jumped  |   X   |       |   X
    lazy    |   X   |   X   |
    leap    |       |   X   |
    over    |   X   |   X   |   X
    quick   |   X   |   X   |   X
    summer  |       |   X   |
    the     |   X   |       |   X
    ------------------------------------

如果我要查询包含 brown 的文档有哪些？这个就是全文检索了，也相当好办，先从词典里遍历到 brown 这个单词，然后根据倒排索引查得 Doc_1 和 Doc_2 包含这个单词。那如果我要查 Doc_1 和 Doc_2 包含的单词分别有什么？这个用倒排索引的话开销会非常大，至少是要将整张表关于 Doc_1 和 Doc_2 的列数据遍历一遍才行。这时候我们将数据换一种组织形式，将会起到非常好的效果。

    Doc      Terms
    -----------------------------------------------------------------
    Doc_1 | brown, dog, fox, jumped, lazy, over, quick, the
    Doc_2 | brown, dogs, foxes, in, lazy, leap, over, quick, summer
    Doc_3 | dog, dogs, fox, jumped, over, quick, the
    -----------------------------------------------------------------

Doc_1 和 Doc_2 存了什么单词，一目了然。
当然对于数字类型的字段也是一样的。

    Doc      Metric
    -----------------------------------------------------------------
    Doc_1 | 0.2f
    Doc_2 | 9.3f
    Doc_3 | 5.6f
    -----------------------------------------------------------------

我们把这种数据的组织方式叫做doc_value。

倒排索引的特点很明显，就是为了全文检索而生的，但是对于一些聚合查询（排序、求平均值等等）的场景来说，显然不适用。那么这样一来我们为了应对一些聚合场景就需要结构化数据来应付，这里说的结构化数据就是『列存储』，也就是上面说的doc_value。

When searching, we need to be able to map a term to a list of documents.When sorting, we need to map a document to its terms. In other words, we need to “uninvert” the inverted index.This “uninverted” structure is often called a “column-store” in other systems. Essentially, it stores all the values for a single field together in a single column of data, which makes it very efficient for operations like sorting

doc_value在 ES 中有几个应用场景：

    对某个字段排序；
    某个字段聚合查询（ max/min/count ）；
    部分过滤器 （ 地理位置过滤器 ）；
   某个字段的脚本执行。等等。

doc_value是顺序存储到磁盘的，因此访问是很快的。当我们所处理的集合小于所给的 JVM 堆内存，那么整个数据集合是会被加载到内存里的；如果数据集合大于所给的堆内存，那么就会分页加载到内存之中，而不会报出『OutOfMemory Error』。

值得一提的是，doc_value的字段使用极其频繁，因此在5.x 版本后强化成为两个字段，分别是 text 和 keyword。

    text：string 类型，支持倒排索引，不支持 doc_value；
    keyword：string 类型，不支持倒排索引，支持doc_value。


**父子关系树构建**

上面介绍了doc_value，有个很重要的应用便是利用doc_value构建父子关系的树。这里说的父和子实际上是两个独立的 document，所以和嵌套对象（nested objects）是不一样的，关于嵌套对象会在未来的文章里叙述。这样父子节点独立存储的好处是，父与子之间的更新或者增加节点都不会相互影响，也不需要重建索引。

那么 ES 是如何构建父子树呢？

ES 通过doc_value维护了一套父子关系，类似如下数据组织方式：

    Doc    _id      parentId
    -----------------------------------------------------------------
    Doc_1 | 1 |
    Doc_2 | 2 | 1
    Doc_3 | 3 | 1
    -----------------------------------------------------------------

这一套数据之前提及过，是在内存里维护的（当然数据超出内存大小后是可以做分页的），而这就意味着：父节点和其所有子节点必须在同一个 shard 之中！


**时间序列数据库（TSDB）**

从上面的参数我们引出这么一个问题，如何利用 ES 做 TSDB（时序数据库）？

首先我们需要知道 TSDB 需要什么不需要什么，原则来说，TSDB 是以时间作为索引的，其数据结构越简单越好，层次最好就一层，字段固定且单一，大致包含了<id,timestamp,metric>这几个参数，对硬盘的占用也需要做优化，系统高可用性比强一致性要重要一些，对 PB 级别的数据的处理有极低的延迟等等。

系统中每一条记录代表某个时间节点下某样事物的指标，可以是业务指标，也可以是机器/服务性能指标。指标本身数据简单，但是很可能每隔一秒或一分钟就要收集一次指标，从长远来看将会产生十分庞大的数据，并且还要对这样庞大的数据做聚合查询，统计分析等等。
根据这个思路，我们可以对 ES 的 schema 做出如下优化，使之成为一个合格的 TSDB：

    禁用 _source & _all，TSDB 并不需要存储指标原文，更不需要对指标本身做全文检索；
    启用doc_value字段，提供聚合查询的支持，后续会做详细介绍；
    字段类型能用 float 就不用 double；
    长期来看，为了合理的优化存储，我们可以周期性执行 /_forcemerge 方法合并碎片，优化存储空间。


**小结**

本文部分结合了 Lucene 来考究 ES 的特性，以及对具体的应用场景做了一定程度的探讨。

**Further Reading:**

https://www.elastic.co/guide/en/elasticsearch/reference/current/_basic_concepts.html

http://stackoverflow.com/questions/15426441/understanding-segments-in-elasticsearch

https://www.elastic.co/blog/lucenes-handling-of-deleted-documents

https://framework.zend.com/manual/1.10/en/learning.lucene.index-structure.html

https://www.elastic.co/blog/elasticsearch-as-a-time-series-data-store

https://www.elastic.co/guide/en/elasticsearch/guide/2.x/docvalues.html

https://taowen.gitbooks.io/tsdb/content/elasticsearch/elasticsearch.html

http://www.cnblogs.com/forfuture1978/p/3945755.html

https://www.elastic.co/guide/en/elasticsearch/guide/2.x/parent-child.html